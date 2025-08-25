import passport from "passport";
import { Strategy as GoogleStrategy, VerifyCallback } from "passport-google-oauth20";
import type { Express } from "express";
import { storage } from "./storage";

// Declare passport-apple module for TypeScript
declare module 'passport-apple' {
  export class Strategy {
    constructor(options: any, verify: (accessToken: any, refreshToken: any, idToken: any, profile: any, done: any) => void);
  }
}

export async function setupOAuthProviders(app: Express) {
  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const userInfo = {
          id: `google_${profile.id}`,
          email: profile.emails?.[0]?.value || '',
          firstName: profile.name?.givenName || '',
          lastName: profile.name?.familyName || '',
          profileImageUrl: profile.photos?.[0]?.value || ''
        };
        
        const user = await storage.upsertUser(userInfo);
        
        return done(null, {
          provider: 'google',
          profile: userInfo,
          user: user
        });
      } catch (error) {
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
        const userInfo = {
          id: `apple_${decodedIdToken.sub}`,
          email: decodedIdToken.email || '',
          firstName: profile?.name?.firstName || decodedIdToken.name?.firstName || '',
          lastName: profile?.name?.lastName || decodedIdToken.name?.lastName || '',
          profileImageUrl: ''
        };
        
        const user = await storage.upsertUser(userInfo);
        
        return done(null, {
          provider: 'apple',
          profile: userInfo,
          user: user
        });
      } catch (error) {
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
      res.redirect('/admin');
    }
  );

  // Apple routes
  app.get('/api/auth/apple',
    passport.authenticate('apple')
  );

  app.get('/api/auth/apple/callback',
    passport.authenticate('apple', { failureRedirect: '/?error=apple_auth_failed' }),
    (req, res) => {
      res.redirect('/admin');
    }
  );

  // Generic logout
  app.get('/api/auth/logout', (req, res) => {
    req.logout(() => {
      res.redirect('/');
    });
  });
}