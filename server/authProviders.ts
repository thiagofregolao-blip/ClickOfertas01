import passport from "passport";
import { Strategy as GoogleStrategy, VerifyCallback } from "passport-google-oauth20";
import type { Express } from "express";
import { storage } from "./storage";

// Remove tipo Apple por enquanto - deixar só Google funcionando

export async function setupOAuthProviders(app: Express) {
  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || '';
        const firstName = profile.name?.givenName || '';
        const lastName = profile.name?.familyName || '';
        const profileImageUrl = profile.photos?.[0]?.value || '';
        
        // Primeiro tenta encontrar usuário existente pelo email
        let user = await storage.getUserByEmail(email);
        
        if (user) {
          // Se usuário existe, atualiza com dados do Google
          user = await storage.updateUser(user.id, {
            firstName: firstName || user.firstName,
            lastName: lastName || user.lastName,
            profileImageUrl: profileImageUrl || user.profileImageUrl,
            provider: 'google',
            providerId: profile.id,
          });
        } else {
          // Se não existe, cria novo usuário
          user = await storage.createUser({
            email,
            firstName,
            lastName,
            profileImageUrl,
            provider: 'google',
            providerId: profile.id,
          });
        }
        
        return done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, undefined);
      }
    }));
  }

  // Apple OAuth Strategy  
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
    const { Strategy: AppleStrategy } = require('passport-apple');
    passport.use(new AppleStrategy({
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKey: process.env.APPLE_PRIVATE_KEY,
      callbackURL: "/api/auth/apple/callback",
      scope: ['email', 'name']
    }, async (accessToken: any, refreshToken: any, decodedIdToken: any, profile: any, done: any) => {
      try {
        const email = decodedIdToken.email || '';
        const firstName = profile?.name?.firstName || decodedIdToken.name?.firstName || '';
        const lastName = profile?.name?.lastName || decodedIdToken.name?.lastName || '';
        
        // Primeiro tenta encontrar usuário existente pelo email
        let user = await storage.getUserByEmail(email);
        
        if (user) {
          // Se usuário existe, atualiza com dados do Apple
          user = await storage.updateUser(user.id, {
            firstName: firstName || user.firstName,
            lastName: lastName || user.lastName,
            provider: 'apple',
            providerId: decodedIdToken.sub,
          });
        } else {
          // Se não existe, cria novo usuário
          user = await storage.createUser({
            email,
            firstName,
            lastName,
            provider: 'apple',
            providerId: decodedIdToken.sub,
          });
        }
        
        return done(null, user);
      } catch (error) {
        console.error('Apple OAuth error:', error);
        return done(error, undefined);
      }
    }));
  }

  // OAuth routes
  
  // Google routes
  app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/?error=google_auth_failed' }),
    (req, res) => {
      res.redirect('/api/auth/redirect');
    }
  );

  // Apple routes
  app.get('/api/auth/apple',
    passport.authenticate('apple')
  );

  app.get('/api/auth/apple/callback',
    passport.authenticate('apple', { failureRedirect: '/?error=apple_auth_failed' }),
    (req, res) => {
      res.redirect('/api/auth/redirect');
    }
  );

  // Generic logout
  app.get('/api/auth/logout', (req, res) => {
    req.logout(() => {
      // Verifica se tem redirect_uri no query
      const redirectUri = req.query.redirect_uri as string;
      if (redirectUri && redirectUri.startsWith('/')) {
        res.redirect(redirectUri);
      } else {
        res.redirect('/');
      }
    });
  });
}