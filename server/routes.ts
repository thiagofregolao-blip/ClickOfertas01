import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { getUserId } from "./utils/auth";
import { generatePromotionalArt } from "../gemini.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";

// Middleware para verificar autenticação (sessão manual ou Replit Auth)
const isAuthenticatedCustom = async (req: any, res: any, next: any) => {
  try {
    // 1. Verificar sessão manual primeiro (usuários registrados via formulário)
    if (req.session?.user) {
      return next();
    }
    
    // 2. Verificar Replit OIDC Auth (sistema principal do projeto)
    if (req.user?.claims?.sub || req.user?.id) {
      return next();
    }
    
    // Se nenhuma autenticação foi encontrada, negar acesso
    return res.status(401).json({ message: "Unauthorized" });
    
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Middleware para verificar super admin
const isSuperAdmin = async (req: any, res: any, next: any) => {
  try {
    let user = null;
    console.log('🔍 isSuperAdmin middleware - verificando autenticação...');
    
    // Verificar sessão manual primeiro (usuários registrados via formulário)
    if (req.session?.user) {
      user = req.session.user;
      console.log('✅ Usuário encontrado via sessão manual:', { id: user.id, email: user.email, isSuperAdmin: user.isSuperAdmin });
    }
    // Verificar autenticação Replit como fallback
    else if (req.user?.claims?.sub || req.user?.id) {
      const userId = req.user?.claims?.sub || req.user?.id;
      console.log('🔍 Verificando via Replit Auth, userId:', userId);
      user = await storage.getUser(userId);
      console.log('✅ Usuário encontrado via Replit Auth:', user ? { id: user.id, email: user.email, isSuperAdmin: user.isSuperAdmin } : 'não encontrado');
    }
    
    if (!user) {
      console.log('❌ Nenhum usuário encontrado');
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (!user?.isSuperAdmin) {
      console.log('❌ Usuário não é super admin:', { id: user.id, isSuperAdmin: user.isSuperAdmin });
      return res.status(403).json({ message: "Access denied - Super Admin required" });
    }

    console.log('✅ Super admin verificado com sucesso:', user.id);
    next();
  } catch (error) {
    console.error("Error checking super admin:", error);
    res.status(500).json({ message: "Server error" });
  }
};
import { getCurrentExchangeRate, convertUsdToBrl, formatBRL, formatUSD, clearExchangeRateCache } from "./exchange-rate";
import { setupOAuthProviders } from "./authProviders";
import { insertStoreSchema, updateStoreSchema, insertProductSchema, updateProductSchema, insertSavedProductSchema, insertStoryViewSchema, insertFlyerViewSchema, insertProductLikeSchema, insertScratchedProductSchema, insertCouponSchema, registerUserSchema, loginUserSchema, registerUserNormalSchema, registerStoreOwnerSchema, registerSuperAdminSchema, insertScratchCampaignSchema, insertPromotionSchema, updatePromotionSchema, insertPromotionScratchSchema, insertInstagramStorySchema, insertInstagramStoryViewSchema, insertInstagramStoryLikeSchema, updateInstagramStorySchema, insertBudgetConfigSchema, insertTotemContentSchema, updateTotemContentSchema, insertTotemSettingsSchema, updateTotemSettingsSchema, insertCategorySchema, updateCategorySchema, insertProductBankSchema, updateProductBankSchema, insertProductBankItemSchema, updateProductBankItemSchema } from "@shared/schema";
import { z } from "zod";
import sharp from "sharp";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { apifyService, type PriceSearchResult } from "./apifyService";
import { db } from "./db";
import { products, stores } from "@shared/schema";
import { eq, and, or, sql, asc, desc } from "drizzle-orm";

// Simple in-memory cache with TTL
class MemoryCache {
  private cache = new Map<string, { data: any; expires: number }>();
  
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }
  
  set(key: string, data: any, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs
    });
  }
  
  clear(): void {
    this.cache.clear();
  }
}

const cache = new MemoryCache();

// Helper function to extract product information from folder name
function extractProductInfo(folderName: string): {
  name: string;
  category: string;
  brand: string;
  model: string;
  color: string;
  storage: string;
  ram: string;
  metadata: any;
} {
  // Exemplo: celular-honor-x7c-alt-lx2-8gb-256gb-verde-foresta
  const parts = folderName.toLowerCase().split('-');
  
  let category = 'Celulares';
  let brand = '';
  let model = '';
  let color = '';
  let storage = '';
  let ram = '';
  
  // Extrair categoria
  if (parts[0] === 'celular') {
    category = 'Celulares';
  }
  
  // Extrair marca (segundo elemento após categoria)
  if (parts.length > 1) {
    brand = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
  }
  
  // Extrair model (elementos seguintes até encontrar specs)
  const modelParts: string[] = [];
  let i = 2;
  
  while (i < parts.length) {
    const part = parts[i];
    
    // Parar se encontrar RAM (ex: 8gb, 12gb)
    if (/^\d+gb$/.test(part) && parseInt(part) <= 32) {
      ram = part.toUpperCase();
      i++;
      break;
    }
    
    modelParts.push(part);
    i++;
  }
  
  model = modelParts.join(' ').toUpperCase();
  
  // Extrair storage (próximo elemento após RAM)
  if (i < parts.length && /^\d+gb$/.test(parts[i])) {
    storage = parts[i].toUpperCase();
    i++;
  }
  
  // Extrair cor (elementos restantes)
  const colorParts = parts.slice(i);
  if (colorParts.length > 0) {
    color = colorParts.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(' ');
  }
  
  // Gerar nome do produto
  const name = `${brand} ${model} ${ram} ${storage} ${color}`.trim();
  
  return {
    name,
    category,
    brand,
    model,
    color,
    storage,
    ram,
    metadata: {
      originalFolderName: folderName,
      extractedParts: parts
    }
  };
}

// Helper function to verify store ownership
async function verifyStoreOwnership(storeId: string, userId: string): Promise<boolean> {
  try {
    const store = await storage.getStore(storeId);
    return store?.userId === userId;
  } catch (error) {
    return false;
  }
}

// Helper function to verify store ownership by product
async function verifyStoreOwnershipByProduct(productId: string, userId: string): Promise<boolean> {
  try {
    const product = await storage.getProductById(productId);
    if (!product) return false;
    return await verifyStoreOwnership(product.storeId, userId);
  } catch (error) {
    return false;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware BEFORE routes
  const session = (await import('express-session')).default;
  const isDevelopment = process.env.NODE_ENV === 'development';
  const fastDev = process.env.FAST_DEV !== 'false';
  
  let sessionStore;
  if (isDevelopment && fastDev) {
    // Usar MemoryStore em desenvolvimento para performance
    sessionStore = new session.MemoryStore();
    console.log('🚀 Usando MemoryStore para sessões (desenvolvimento rápido)');
  } else {
    // Usar PostgreSQL store em produção
    const connectPg = (await import('connect-pg-simple')).default(session);
    sessionStore = new connectPg({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      ttl: 7 * 24 * 60 * 60, // 1 week in seconds
      tableName: "sessions",
    });
  }
  
  app.set("trust proxy", 1);
  // Verificar se SESSION_SECRET está definido em produção
  const sessionSecret = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production' && (!sessionSecret || sessionSecret === 'fallback-secret-key')) {
    throw new Error('⚠️ ERRO DE SEGURANÇA: SESSION_SECRET deve ser definido em produção!');
  }
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  app.use(session({
    secret: sessionSecret || 'dev-only-fallback-' + Math.random().toString(36),
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction, // Cookies seguros em produção
      sameSite: isProduction ? 'lax' : undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  }));

  // Servir arquivos estáticos da pasta uploads (para imagens do totem)
  const express = (await import('express')).default;
  const path = (await import('path')).default;
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Routes que NÃO devem usar Replit Auth (devem vir ANTES do setupAuth)
  

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = loginUserSchema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      // Verify password
      if (!user.password) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      // Remover verificação de super admin - permitir todos os usuários

      // Create session manually
      console.log("Session object:", !!req.session);
      console.log("Session keys:", req.session ? Object.keys(req.session) : "session is undefined");
      
      if (!req.session) {
        console.error("Session middleware not working");
        return res.status(500).json({ message: "Erro de configuração do servidor" });
      }
      
      // Initialize session object if needed
      if (!req.session.user) {
        req.session.user = {};
      }
      
      req.session.user = user;
      
      // Verifica se o usuário tem uma loja
      const userStore = await storage.getUserStore(user.id);
      
      res.json({ 
        message: "Login realizado com sucesso",
        user: {
          id: user.id,
          email: user.email,
          storeName: user.storeName,
          isSuperAdmin: user.isSuperAdmin,
          hasStore: !!userStore
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    }
  });

  // Auth middleware (só depois das rotas especiais) - DESABILITADO para evitar conflitos
  // await setupAuth(app);
  // await setupOAuthProviders(app);

  // Logout completo - limpa todas as sessões
  app.post('/api/auth/logout', (req: any, res) => {
    req.session?.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logout realizado' });
    });
  });

  app.get('/api/auth/logout', (req: any, res) => {
    req.session?.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
  });

  // Auth routes with cache
  app.get('/api/auth/user', async (req: any, res) => {
    // Cache key baseado na sessão/user ID
    const cacheKey = `auth-user-${req.session?.user?.id || req.user?.claims?.sub || 'anon'}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    try {
      // Verificar sessão manual primeiro (sistema de email/senha)
      if (req.session?.user?.id) {
        const user = req.session.user;
        
        // Buscar informações completas do usuário
        const fullUser = await storage.getUser(user.id);
        if (!fullUser) {
          return res.status(401).json({ message: "User not found" });
        }
        
        // Verificar se tem loja
        const userStore = await storage.getUserStore(fullUser.id);
        
        const userWithStoreInfo = {
          ...fullUser,
          hasStore: !!userStore
        };
        // Cache por 60s
        cache.set(cacheKey, userWithStoreInfo, 60000);
        return res.json(userWithStoreInfo);
      }

      // Verificar autenticação via Replit OAuth se não há sessão manual
      if (req.isAuthenticated && req.isAuthenticated()) {
        const userId = req.user.claims?.sub;
        const user = await storage.getUser(userId);
        
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }
        
        // Verificar se tem loja
        const userStore = await storage.getUserStore(user.id);
        
        const userWithStoreInfo = {
          ...user,
          hasStore: !!userStore
        };
        
        // Cache por 60s
        cache.set(cacheKey, userWithStoreInfo, 60000);
        return res.json(userWithStoreInfo);
      }

      return res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Smart redirect after login based on user type  
  app.get('/api/auth/redirect', async (req: any, res) => {
    if (!req.session?.user?.id) {
      return res.redirect('/');
    }
    try {
      const userId = req.user?.id || req.session?.user?.id;
      const user = await storage.getUser(userId);
      
      if (user?.storeOwnerToken) {
        res.redirect('/admin');
      } else {
        res.redirect('/cards');
      }
    } catch (error) {
      console.error("Error in smart redirect:", error);
      res.redirect('/cards');
    }
  });

  // Update user profile route
  app.put('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user?.claims?.sub || req.user?.id;
      const updateSchema = z.object({
        firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
        lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"), 
        email: z.string().email("Email inválido"),
        phone: z.string().optional(),
        profileImageUrl: z.string().optional(),
      });
      
      const updateData = updateSchema.parse(req.body);
      
      // Check if email is already in use by another user
      if (updateData.email) {
        const existingUser = await storage.getUserByEmail(updateData.email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Email já está em uso por outro usuário" });
        }
      }
      
      // Update user information
      const updatedUser = await storage.updateUser(userId, updateData);
      
      res.json({ 
        message: "Perfil atualizado com sucesso",
        user: updatedUser
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: error.errors 
        });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Erro ao atualizar perfil" });
    }
  });

  // Object storage endpoints for profile photos
  app.post("/api/objects/upload", isAuthenticated, async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.put("/api/profile-images", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.session?.user?.id;
      if (!req.body.imageURL) {
        return res.status(400).json({ error: "imageURL é obrigatório" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.imageURL,
        {
          owner: userId,
          visibility: "public", // Fotos de perfil são públicas
        }
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting profile image:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Serve private objects (profile photos)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Registration route
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = registerUserNormalSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email já está em uso" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create new user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        provider: 'email',
        isEmailVerified: false
      });

      // Create session manually
      (req as any).session.user = user;
      
      res.status(201).json({ 
        message: "Usuário criado com sucesso",
        user: {
          id: user.id,
          email: user.email,
          storeName: user.storeName
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    }
  });

  // Register super admin
  app.post('/api/auth/register-admin', async (req, res) => {
    try {
      const userData = registerSuperAdminSchema.parse(req.body);
      
      // Verificar código de administrador (você pode definir um código específico)
      const validAdminCode = "CLICKOFERTAS2025"; // Defina seu código aqui
      if (userData.adminCode !== validAdminCode) {
        return res.status(400).json({ message: "Código de administrador inválido" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email já está em uso" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Create user as super admin
      const user = await storage.createUser({
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        isSuperAdmin: true, // Define como super admin
      });

      // Create session
      req.session.user = user;

      res.status(201).json({
        message: "Super Admin criado com sucesso",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isSuperAdmin: user.isSuperAdmin,
        }
      });
    } catch (error) {
      console.error("Super admin registration error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    }
  });


  // New registration routes for user/store separation

  // Register normal user (no store)
  app.post('/api/auth/register-user', async (req, res) => {
    try {
      const userData = registerUserNormalSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email já está em uso" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create new user (normal user, no store)
      const user = await storage.createUser({
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName || null,
        phone: userData.phone || null,
        provider: 'email',
        isEmailVerified: false
      });

      // Create session manually
      (req as any).session.user = user;
      
      res.status(201).json({ 
        message: "Usuário criado com sucesso",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        },
        hasStore: false
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    }
  });

  // Register store owner (with store)
  app.post('/api/auth/register-store', async (req, res) => {
    try {
      const userData = registerStoreOwnerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email já está em uso" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create new user (store owner)
      const user = await storage.createUser({
        email: userData.email,
        password: hashedPassword,
        storeName: userData.storeName,
        phone: userData.phone || null,
        address: userData.address || null,
        city: userData.city || null,
        provider: 'email',
        isEmailVerified: false,
        storeOwnerToken: 'STORE_OWNER_' + Date.now()
      });

      // Create store for the user
      const store = await storage.createStore(user.id, {
        name: userData.storeName,
        themeColor: '#E11D48',
        currency: 'Gs.',
        isActive: true
      });

      console.log(`Store created for user ${user.email}: ${store.name} (ID: ${store.id})`);

      // Create session manually
      (req as any).session.user = user;
      
      res.status(201).json({ 
        message: "Loja criada com sucesso",
        user: {
          id: user.id,
          email: user.email,
          storeName: user.storeName
        },
        hasStore: true
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    }
  });

  // Store routes
  app.get('/api/stores/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.session?.user?.id;
      const store = await storage.getUserStore(userId);
      res.json(store);
    } catch (error) {
      console.error("Error fetching store:", error);
      res.status(500).json({ message: "Failed to fetch store" });
    }
  });

  app.post('/api/stores', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.session?.user?.id;
      const storeData = insertStoreSchema.parse(req.body);
      const store = await storage.createStore(userId, storeData);
      res.status(201).json(store);
    } catch (error) {
      console.error("Error creating store:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create store" });
      }
    }
  });

  app.patch('/api/stores/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.session?.user?.id;
      
      // Verify store ownership
      const isOwner = await verifyStoreOwnership(id, userId);
      if (!isOwner) {
        return res.status(403).json({ message: "Unauthorized: You can only modify your own store" });
      }
      
      const storeData = updateStoreSchema.parse(req.body);
      const store = await storage.updateStore(id, storeData);
      res.json(store);
    } catch (error) {
      console.error("Error updating store:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update store" });
      }
    }
  });

  app.delete('/api/stores/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.session?.user?.id;
      await storage.deleteStore(id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting store:", error);
      res.status(500).json({ message: "Failed to delete store" });
    }
  });

  // Search endpoint with server-side filtering and cache
  app.get('/api/search', async (req, res) => {
    try {
      const { q, limit = '20' } = req.query;
      
      if (!q || typeof q !== 'string' || q.trim().length < 2) {
        return res.json({ results: [], total: 0 });
      }

      const searchTerm = q.trim().toLowerCase();
      const resultLimit = Math.min(parseInt(limit as string) || 20, 50);
      const cacheKey = `search-${searchTerm}-${resultLimit}`;
      
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log(`🔍 Cache hit for search: "${searchTerm}"`);
        return res.json(cached);
      }
      
      console.log(`🔍 Cache miss for search: "${searchTerm}" - searching DB`);
      
      // Buscar produtos que correspondem ao termo de busca
      const searchResults = await db
        .select({
          id: products.id,
          name: products.name,
          price: products.price,
          imageUrl: products.imageUrl,
          category: products.category,
          brand: products.brand,
          storeId: products.storeId,
          storeName: stores.name,
          storeLogoUrl: stores.logoUrl,
          storeSlug: stores.slug,
          storeThemeColor: stores.themeColor,
          storePremium: stores.isPremium
        })
        .from(products)
        .innerJoin(stores, eq(products.storeId, stores.id))
        .where(and(
          eq(products.isActive, true),
          eq(stores.isActive, true),
          or(
            sql`LOWER(${products.name}) LIKE ${'%' + searchTerm + '%'}`,
            sql`LOWER(${products.brand}) LIKE ${'%' + searchTerm + '%'}`,
            sql`LOWER(${products.category}) LIKE ${'%' + searchTerm + '%'}`,
            sql`LOWER(${stores.name}) LIKE ${'%' + searchTerm + '%'}`
          )
        ))
        .orderBy(
          desc(stores.isPremium), // Premium stores first
          desc(products.isFeatured), // Featured products first
          asc(products.name) // Then alphabetical
        )
        .limit(resultLimit);

      const response = {
        results: searchResults,
        total: searchResults.length,
        searchTerm: searchTerm
      };
      
      // Cache for 2 minutes (search results change more frequently)
      cache.set(cacheKey, response, 2 * 60 * 1000);
      
      res.json(response);
    } catch (error) {
      console.error("Error in search:", error);
      res.status(500).json({ message: "Erro ao realizar busca" });
    }
  });

  // Public store routes
  app.get('/api/public/stores', async (req, res) => {
    try {
      const cacheKey = 'public-stores';
      const cached = cache.get(cacheKey);
      
      if (cached) {
        console.log('📦 Cache hit for /api/public/stores');
        return res.json(cached);
      }
      
      console.log('📦 Cache miss for /api/public/stores - fetching from DB (optimized)');
      const stores = await storage.getAllActiveStoresOptimized(50, 15);
      
      // Cache for 5 minutes (300,000ms)
      cache.set(cacheKey, stores, 5 * 60 * 1000);
      
      res.json(stores);
    } catch (error) {
      console.error("Error fetching active stores:", error);
      res.status(500).json({ message: "Failed to fetch stores" });
    }
  });

  // Temporary cache clear endpoint
  app.post('/api/cache/clear', (req, res) => {
    cache.clear();
    console.log('🧹 Cache limpo manualmente');
    res.json({ message: 'Cache cleared successfully' });
  });

  // Quick search endpoint (for autocomplete/suggestions)
  app.get('/api/search/suggestions', async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string' || q.trim().length < 2) {
        return res.json({ suggestions: [] });
      }

      const searchTerm = q.trim().toLowerCase();
      const cacheKey = `suggestions-${searchTerm}`;
      
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      // Get unique suggestions (product names, brands, categories)
      const suggestions = await db
        .select({
          name: products.name,
          brand: products.brand,
          category: products.category
        })
        .from(products)
        .innerJoin(stores, eq(products.storeId, stores.id))
        .where(and(
          eq(products.isActive, true),
          eq(stores.isActive, true),
          or(
            sql`LOWER(${products.name}) LIKE ${'%' + searchTerm + '%'}`,
            sql`LOWER(${products.brand}) LIKE ${'%' + searchTerm + '%'}`,
            sql`LOWER(${products.category}) LIKE ${'%' + searchTerm + '%'}`
          )
        ))
        .groupBy(products.name, products.brand, products.category)
        .limit(10);

      const uniqueSuggestions = new Set<string>();
      suggestions.forEach(item => {
        if (item.name && item.name.toLowerCase().includes(searchTerm)) {
          uniqueSuggestions.add(item.name);
        }
        if (item.brand && item.brand.toLowerCase().includes(searchTerm)) {
          uniqueSuggestions.add(item.brand);
        }
        if (item.category && item.category.toLowerCase().includes(searchTerm)) {
          uniqueSuggestions.add(item.category);
        }
      });

      const response = {
        suggestions: Array.from(uniqueSuggestions).slice(0, 8)
      };
      
      // Cache suggestions for 5 minutes
      cache.set(cacheKey, response, 5 * 60 * 1000);
      
      res.json(response);
    } catch (error) {
      console.error("Error in search suggestions:", error);
      res.status(500).json({ suggestions: [] });
    }
  });

  app.get('/api/public/stores/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const store = await storage.getStoreBySlug(slug);
      if (!store) {
        res.status(404).json({ message: "Store not found" });
        return;
      }
      res.json(store);
    } catch (error) {
      console.error("Error fetching public store:", error);
      res.status(500).json({ message: "Failed to fetch store" });
    }
  });

  // PUBLIC: Listar categorias ativas (ordenadas por sortOrder)
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await storage.getActiveCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching active categories:", error);
      res.status(500).json({ message: "Erro ao buscar categorias" });
    }
  });

  // PUBLIC: Buscar promoções ativas (usado no flyer público)
  app.get('/api/public/promotions/active', async (req, res) => {
    try {
      const activePromotions = await storage.getActivePromotions();
      res.json(activePromotions);
    } catch (error) {
      console.error("Error fetching active promotions:", error);
      res.status(500).json({ message: "Failed to fetch active promotions" });
    }
  });

  // NEW: Buscar promoções disponíveis para o usuário específico (sistema personalizado)
  app.get('/api/stores/:slug/my-available-promotions', async (req: any, res) => {
    try {
      const { slug } = req.params;
      const userId = getUserId(req);

      // Buscar loja pelo slug
      const store = await storage.getStoreBySlug(slug);
      if (!store) {
        return res.status(404).json({ message: 'Loja não encontrada' });
      }

      // Se não há usuário logado, retornar lista vazia (sistema requer login)
      if (!userId) {
        console.log('🚫 Usuário não logado - retornando lista vazia');
        return res.json({ promotions: [] });
      }

      // Buscar promoções personalizadas para este usuário
      const userPromotions = await storage.getMyAvailablePromotions(userId, store.id);
      
      console.log(`🎯 Promoções para usuário ${userId}:`, userPromotions.length);
      
      res.json({ 
        promotions: userPromotions,
        storeId: store.id,
        userId: userId 
      });
    } catch (error) {
      console.error("Error fetching user-specific promotions:", error);
      res.status(500).json({ message: "Failed to fetch promotions" });
    }
  });

  // Verificar status de uma promoção específica para o usuário
  app.get('/api/promotions/:promotionId/status', async (req: any, res) => {
    try {
      const { promotionId } = req.params;
      const userId = getUserId(req);
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.connection?.remoteAddress;

      const status = await storage.getPromotionScratchStatus(promotionId, userId, userAgent, ipAddress);
      res.json(status);
    } catch (error) {
      console.error("Error checking promotion status:", error);
      res.status(500).json({ message: "Failed to check promotion status" });
    }
  });

  // Raspar uma promoção
  app.post('/api/promotions/:promotionId/scratch', async (req: any, res) => {
    try {
      const { promotionId } = req.params;
      const userId = getUserId(req);
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.connection?.remoteAddress;

      const result = await storage.scratchPromotion(promotionId, userId, userAgent, ipAddress);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error scratching promotion:", error);
      res.status(500).json({ message: "Failed to scratch promotion" });
    }
  });

  // Product routes
  app.get('/api/stores/:storeId/products', isAuthenticated, async (req: any, res) => {
    try {
      const { storeId } = req.params;
      const userId = req.user?.id || req.session?.user?.id;
      
      // Verify store ownership
      const isOwner = await verifyStoreOwnership(storeId, userId);
      if (!isOwner) {
        return res.status(403).json({ message: "Unauthorized: You can only access your own store's products" });
      }
      
      const products = await storage.getStoreProducts(storeId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post('/api/stores/:storeId/products', isAuthenticated, async (req: any, res) => {
    try {
      const { storeId } = req.params;
      const userId = req.user?.id || req.session?.user?.id;
      
      // Verify store ownership
      const isOwner = await verifyStoreOwnership(storeId, userId);
      if (!isOwner) {
        return res.status(403).json({ message: "Unauthorized: You can only add products to your own store" });
      }
      
      // Converter scratchExpiresAt de string para Date se fornecido
      if (req.body.scratchExpiresAt && req.body.scratchExpiresAt !== "") {
        req.body.scratchExpiresAt = new Date(req.body.scratchExpiresAt);
      } else if (req.body.scratchExpiresAt === "") {
        req.body.scratchExpiresAt = null;
      }
      
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(storeId, productData);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create product" });
      }
    }
  });



  app.patch('/api/stores/:storeId/products/:productId', isAuthenticated, async (req: any, res) => {
    try {
      const { storeId, productId } = req.params;
      const userId = getUserId(req);
      
      // Verify store ownership
      const isOwner = await verifyStoreOwnership(storeId, userId);
      if (!isOwner) {
        return res.status(403).json({ message: "Unauthorized: You can only modify products in your own store" });
      }
      
      // Converter scratchExpiresAt de string para Date se fornecido
      if (req.body.scratchExpiresAt && req.body.scratchExpiresAt !== "") {
        req.body.scratchExpiresAt = new Date(req.body.scratchExpiresAt);
      } else if (req.body.scratchExpiresAt === "") {
        req.body.scratchExpiresAt = null;
      }
      
      // Verificar se está ativando raspadinha
      const isActivatingScatch = req.body.isScratchCard === true;
      const productBefore = await storage.getProductById(productId);
      const wasAlreadyScratch = productBefore?.isScratchCard === true;
      
      const productData = updateProductSchema.parse(req.body);
      const product = await storage.updateProduct(productId, storeId, productData);
      
      // NOVO: Se está ativando raspadinha pela primeira vez, criar campanha automaticamente
      if (isActivatingScatch && !wasAlreadyScratch) {
        try {
          // Verificar se já existe campanha para este produto
          const existingCampaign = await storage.getScratchCampaignByProduct(productId);
          
          if (!existingCampaign) {
            console.log(`🎯 Criando campanha automática de clones virtuais para produto: ${product.name}`);
            
            // Criar campanha automática
            const discountPrice = product.scratchPrice || (Number(product.price) * 0.9).toString(); // 10% desconto padrão
            const campaign = await storage.createScratchCampaign({
              productId: product.id,
              storeId: product.storeId,
              title: `Raspadinha: ${product.name}`,
              description: `Clone virtual automático para ${product.name}`,
              discountPrice: discountPrice, // CAMPO OBRIGATÓRIO
              discountPercentage: product.scratchPrice ? 
                Math.round(((Number(product.price) - Number(product.scratchPrice)) / Number(product.price)) * 100) : 
                10, // 10% padrão se não tiver desconto específico
              maxRedemptions: Number(product.maxScratchRedemptions) || 100,
              expiresAt: product.scratchExpiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias padrão
              isActive: true,
            });
            
            // Buscar todos os usuários registrados para distribuir clones
            const allUsers = await storage.getAllUsers();
            const userIds = allUsers.map(user => user.id);
            
            if (userIds.length > 0) {
              // Criar snapshot do produto para os clones
              const productSnapshot = {
                id: product.id,
                storeId: product.storeId,
                name: product.name,
                description: product.description,
                price: product.price,
                discountPrice: product.scratchPrice || product.price,
                imageUrl: product.imageUrl,
                category: product.category,
              };
              
              // Criar clones virtuais para todos os usuários
              const clones = await storage.createVirtualClones(campaign.id, userIds, productSnapshot);
              
              console.log(`✅ Campanha criada! ${clones.length} clones virtuais distribuídos para usuários`);
            }
          }
        } catch (campaignError) {
          console.error("Erro ao criar campanha automática:", campaignError);
          // Não falhar a atualização do produto por causa disso
        }
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update product" });
      }
    }
  });

  app.delete('/api/stores/:storeId/products/:productId', isAuthenticated, async (req: any, res) => {
    try {
      const { storeId, productId } = req.params;
      const userId = req.user?.id || req.session?.user?.id;
      
      // Verify store ownership
      const isOwner = await verifyStoreOwnership(storeId, userId);
      if (!isOwner) {
        return res.status(403).json({ message: "Unauthorized: You can only delete products from your own store" });
      }
      
      await storage.deleteProduct(productId, storeId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Photo upload routes
  app.post('/api/photos/upload-url', isAuthenticated, async (req: any, res) => {
    try {
      const { fileName } = req.body;
      if (!fileName) {
        return res.status(400).json({ message: "fileName is required" });
      }
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getUploadURL(fileName);
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.get('/products/:objectPath(*)', async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error getting photo:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Engagement routes
  // Curtir produto
  app.post('/api/products/:productId/like', async (req: any, res) => {
    try {
      const { productId } = req.params;
      const userId = req.user?.claims?.sub; // pode ser anônimo
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip;
      
      const likeData = insertProductLikeSchema.parse({
        productId,
        userId,
        userAgent,
        ipAddress
      });
      
      await storage.createProductLike(likeData);
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Error liking product:", error);
      res.status(500).json({ message: "Failed to like product" });
    }
  });

  // Salvar produto (requer autenticação)
  app.post('/api/products/:productId/save', isAuthenticated, async (req: any, res) => {
    try {
      const { productId } = req.params;
      const userId = req.user?.id || req.session?.user?.id;
      
      const saveData = insertSavedProductSchema.parse({
        productId,
        userId
      });
      
      await storage.saveProduct(saveData);
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Error saving product:", error);
      res.status(500).json({ message: "Failed to save product" });
    }
  });

  // Buscar produtos salvos
  app.get('/api/saved-products', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.session?.user?.id;
      const savedProducts = await storage.getSavedProducts(userId);
      res.json(savedProducts);
    } catch (error) {
      console.error("Error fetching saved products:", error);
      res.status(500).json({ message: "Failed to fetch saved products" });
    }
  });

  // Remover produto salvo
  app.delete('/api/saved-products/:savedProductId', isAuthenticated, async (req: any, res) => {
    try {
      const { savedProductId } = req.params;
      const userId = req.user?.id || req.session?.user?.id;
      
      await storage.removeSavedProduct(savedProductId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing saved product:", error);
      res.status(500).json({ message: "Failed to remove saved product" });
    }
  });

  // REMOVIDO: Sistema de scratch tradicional completamente

  // REMOVIDO: Sistema de raspadinha tradicional
  // Agora usamos APENAS clones virtuais

  // Registrar visualização de story
  app.post('/api/stories/view', async (req: any, res) => {
    try {
      const { storeId, productId } = req.body;
      const userId = req.user?.claims?.sub; // pode ser anônimo
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip;
      
      const viewData = insertStoryViewSchema.parse({
        storeId,
        productId,
        userId,
        userAgent,
        ipAddress
      });
      
      await storage.createStoryView(viewData);
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Error registering story view:", error);
      res.status(500).json({ message: "Failed to register view" });
    }
  });

  // Registrar visualização de panfleto
  app.post('/api/flyers/view', async (req: any, res) => {
    try {
      const { storeId } = req.body;
      const userId = req.user?.claims?.sub; // pode ser anônimo
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip;
      
      const viewData = insertFlyerViewSchema.parse({
        storeId,
        userId,
        userAgent,
        ipAddress
      });
      
      await storage.createFlyerView(viewData);
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Error registering flyer view:", error);
      res.status(500).json({ message: "Failed to register view" });
    }
  });

  // Estatísticas para o admin
  app.get('/api/stores/:storeId/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const { storeId } = req.params;
      const { days = '7' } = req.query;
      const analytics = await storage.getStoreAnalytics(storeId, parseInt(days as string));
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Analytics para o usuário logado (suas próprias lojas)
  app.get('/api/analytics/overview', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.session?.user?.id;
      const { days = '7' } = req.query;
      
      // Buscar lojas do usuário
      const userStores = await storage.getStoresByUserId(userId);
      if (!userStores || userStores.length === 0) {
        return res.json({
          storyViews: 0,
          flyerViews: 0,
          productLikes: 0,
          productsSaved: 0,
        });
      }

      // Agregar analytics de todas as lojas do usuário
      let totalAnalytics = {
        storyViews: 0,
        flyerViews: 0,
        productLikes: 0,
        productsSaved: 0,
      };

      for (const store of userStores) {
        const storeAnalytics = await storage.getStoreAnalytics(store.id, parseInt(days as string));
        totalAnalytics.storyViews += storeAnalytics.storyViews;
        totalAnalytics.flyerViews += storeAnalytics.flyerViews;
        totalAnalytics.productLikes += storeAnalytics.productLikes;
        totalAnalytics.productsSaved += storeAnalytics.productsSaved;
      }

      res.json(totalAnalytics);
    } catch (error) {
      console.error("Error fetching overview analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Produtos mais engajados do usuário
  app.get('/api/analytics/products', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.session?.user?.id;
      const { days = '7' } = req.query;
      
      // Buscar lojas do usuário
      const userStores = await storage.getStoresByUserId(userId);
      if (!userStores || userStores.length === 0) {
        return res.json([]);
      }

      // Buscar produtos mais engajados de todas as lojas
      let allTopProducts: any[] = [];
      
      for (const store of userStores) {
        const storeTopProducts = await storage.getTopProductsByEngagement(store.id, parseInt(days as string));
        allTopProducts.push(...storeTopProducts);
      }

      // Ordenar por engajamento total e pegar os top 10
      allTopProducts.sort((a, b) => {
        const engagementA = a.likes + a.saves + a.views;
        const engagementB = b.likes + b.saves + b.views;
        return engagementB - engagementA;
      });

      res.json(allTopProducts.slice(0, 10));
    } catch (error) {
      console.error("Error fetching product analytics:", error);
      res.status(500).json({ message: "Failed to fetch product analytics" });
    }
  });

  // Buscar cotação do dólar em tempo real
  app.get('/api/currency/usd-brl', async (req, res) => {
    try {
      const response = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=BRL');
      const data = await response.json();
      
      if (data.rates && data.rates.BRL) {
        res.json({ 
          rate: data.rates.BRL,
          lastUpdate: data.date,
          source: 'Frankfurter API'
        });
      } else {
        res.status(500).json({ message: "Failed to fetch exchange rate" });
      }
    } catch (error) {
      console.error("Error fetching USD/BRL rate:", error);
      res.status(500).json({ message: "Failed to fetch exchange rate" });
    }
  });

  // INSTAGRAM STORIES ROUTES
  
  // Criar um novo Instagram Story
  app.post('/api/instagram-stories', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.session?.user?.id;
      const storyData = insertInstagramStorySchema.parse({
        ...req.body,
        userId
      });
      
      const story = await storage.createInstagramStory(storyData);
      res.status(201).json(story);
    } catch (error) {
      console.error("Error creating Instagram story:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create story" });
      }
    }
  });

  // Buscar todos os Stories ativos (feed público)
  app.get('/api/instagram-stories', async (req: any, res) => {
    try {
      const stories = await storage.getAllActiveInstagramStories();
      res.json(stories);
    } catch (error) {
      console.error("Error fetching Instagram stories:", error);
      res.status(500).json({ message: "Failed to fetch stories" });
    }
  });

  // Buscar Stories de uma loja específica
  app.get('/api/instagram-stories/store/:storeId', async (req: any, res) => {
    try {
      const { storeId } = req.params;
      const stories = await storage.getStoreInstagramStories(storeId);
      res.json(stories);
    } catch (error) {
      console.error("Error fetching store stories:", error);
      res.status(500).json({ message: "Failed to fetch store stories" });
    }
  });

  // Buscar um Story específico
  app.get('/api/instagram-stories/:storyId', async (req: any, res) => {
    try {
      const { storyId } = req.params;
      const story = await storage.getInstagramStory(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }
      res.json(story);
    } catch (error) {
      console.error("Error fetching Instagram story:", error);
      res.status(500).json({ message: "Failed to fetch story" });
    }
  });

  // Atualizar um Story (apenas pelo dono)
  app.put('/api/instagram-stories/:storyId', isAuthenticated, async (req: any, res) => {
    try {
      const { storyId } = req.params;
      const userId = req.user?.id || req.session?.user?.id;
      
      // Verificar se o usuário é dono do story
      const existingStory = await storage.getInstagramStory(storyId);
      if (!existingStory) {
        return res.status(404).json({ message: "Story not found" });
      }
      if (existingStory.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const updateData = updateInstagramStorySchema.parse(req.body);
      const story = await storage.updateInstagramStory(storyId, updateData);
      res.json(story);
    } catch (error) {
      console.error("Error updating Instagram story:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update story" });
      }
    }
  });

  // Deletar um Story (apenas pelo dono)
  app.delete('/api/instagram-stories/:storyId', isAuthenticated, async (req: any, res) => {
    try {
      const { storyId } = req.params;
      const userId = req.user?.id || req.session?.user?.id;
      
      // Verificar se o usuário é dono do story
      const existingStory = await storage.getInstagramStory(storyId);
      if (!existingStory) {
        return res.status(404).json({ message: "Story not found" });
      }
      if (existingStory.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      await storage.deleteInstagramStory(storyId);
      res.json({ message: "Story deleted successfully" });
    } catch (error) {
      console.error("Error deleting Instagram story:", error);
      res.status(500).json({ message: "Failed to delete story" });
    }
  });

  // Registrar visualização de Story
  app.post('/api/instagram-stories/:storyId/view', async (req: any, res) => {
    try {
      const { storyId } = req.params;
      const userId = req.user?.claims?.sub; // pode ser anônimo
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip;
      
      const viewData = insertInstagramStoryViewSchema.parse({
        storyId,
        viewerId: userId,
        userAgent,
        ipAddress
      });
      
      await storage.createInstagramStoryView(viewData);
      await storage.incrementStoryViewsCount(storyId);
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Error registering story view:", error);
      res.status(500).json({ message: "Failed to register view" });
    }
  });

  // Curtir/Descurtir Story
  app.post('/api/instagram-stories/:storyId/like', async (req: any, res) => {
    try {
      const { storyId } = req.params;
      const userId = req.user?.claims?.sub;
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required to like stories" });
      }
      
      const likeData = insertInstagramStoryLikeSchema.parse({
        storyId,
        userId,
        userAgent,
        ipAddress
      });
      
      await storage.createInstagramStoryLike(likeData);
      await storage.incrementStoryLikesCount(storyId);
      res.status(201).json({ success: true, liked: true });
    } catch (error) {
      console.error("Error liking story:", error);
      res.status(500).json({ message: "Failed to like story" });
    }
  });

  // Remover like de Story
  app.delete('/api/instagram-stories/:storyId/like', isAuthenticated, async (req: any, res) => {
    try {
      const { storyId } = req.params;
      const userId = req.user?.id || req.session?.user?.id;
      
      await storage.removeInstagramStoryLike(storyId, userId);
      await storage.decrementStoryLikesCount(storyId);
      res.json({ success: true, liked: false });
    } catch (error) {
      console.error("Error unliking story:", error);
      res.status(500).json({ message: "Failed to unlike story" });
    }
  });

  // Buscar Stories do usuário logado
  app.get('/api/my-instagram-stories', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.session?.user?.id;
      const stories = await storage.getUserInstagramStories(userId);
      res.json(stories);
    } catch (error) {
      console.error("Error fetching user stories:", error);
      res.status(500).json({ message: "Failed to fetch user stories" });
    }
  });

  // COUPON ROUTES
  
  // Criar cupom após raspar produto
  app.post('/api/products/:productId/generate-coupon', isAuthenticated, async (req: any, res) => {
    try {
      console.log('🎫 INICIANDO GERAÇÃO DE CUPOM');
      const { productId } = req.params;
      const userId = getUserId(req);
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip;

      console.log('📋 Dados recebidos:', { productId, userId, userAgent, ipAddress });

      // Buscar o produto e a loja
      console.log('🔍 Buscando produto...');
      console.log('📋 ProductId recebido:', { productId, tipo: typeof productId, length: productId.length });
      
      // Primeiro tenta buscar na tabela products
      let product = await storage.getProductById(productId);
      console.log('📦 Produto encontrado em products:', product);
      
      // Se não encontrou, busca na tabela promotions
      let isPromotion = false;
      if (!product) {
        console.log('🔍 Não encontrado em products, buscando em promotions...');
        const promotion = await storage.getPromotion(productId);
        console.log('📦 Promoção encontrada:', promotion);
        
        if (promotion) {
          // Converter promoção para formato de produto
          product = {
            id: promotion.id,
            name: promotion.name,
            description: promotion.description,
            price: promotion.promotionalPrice || promotion.originalPrice,
            isScratchCard: true, // Promoções podem ser scratch cards
            scratchMessage: promotion.scratchMessage || 'Parabéns! Você ganhou!',
            imageUrl: promotion.imageUrl,
            category: promotion.category,
            storeId: promotion.storeId,
            // Campos opcionais
            sortOrder: 0,
            isActive: true,
            isFeatured: false,
            createdAt: promotion.createdAt,
            updatedAt: promotion.updatedAt
          };
          isPromotion = true;
        }
      }
      
      console.log('📦 Produto final (pode ser promoção):', product);
      console.log('📦 É promoção?', isPromotion);
      
      if (!product || (!product.isScratchCard && !isPromotion)) {
        console.log('❌ Item não é raspadinha válida');
        return res.status(400).json({ message: "Item não é uma raspadinha válida" });
      }

      // Verificar se o usuário já raspou este produto, se não, criar automaticamente
      let scratchedProduct = await storage.getScratchedProduct(productId, userId);
      if (!scratchedProduct) {
        // Para promoções, não tentar criar na base (foreign key quebrada)
        // Usar dados temporários
        console.log('🎯 Criando scratch temporário para promoção...');
        scratchedProduct = {
          id: `temp-${Date.now()}`,
          productId,
          userId,
          userAgent: userAgent || 'unknown',
          ipAddress: ipAddress || 'unknown',
          scratchedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
          hasRedeemed: false,
          cloneId: null
        };
      }

      // Calcular desconto
      const originalPrice = parseFloat(product.price || '0');
      const discountPrice = parseFloat(product.scratchPrice || '0');
      const discountPercentage = originalPrice > 0 ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100) : 0;

      // Gerar código único do cupom
      const couponCode = `OFERTA${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      // Gerar QR Code
      const qrCodeData = JSON.stringify({
        code: couponCode,
        productId: product.id,
        storeId: product.storeId,
        originalPrice,
        discountPrice,
        discountPercentage
      });
      
      const qrCodeBase64 = await QRCode.toDataURL(qrCodeData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Data de expiração do cupom (mesmo tempo da raspadinha)
      const expiresAt = scratchedProduct.expiresAt;

      // Criar cupom (salvando dados da promoção quando productId = null)
      const couponData = {
        id: `coupon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        productId: isPromotion ? null : product.id, // null para promoções
        storeId: product.storeId,
        userId,
        userAgent: userAgent || 'unknown',
        ipAddress: ipAddress || 'unknown',
        couponCode,
        
        // 🎯 SALVAR DADOS DA PROMOÇÃO (quando productId = null)
        promotionName: isPromotion ? product.name : null,
        promotionImageUrl: isPromotion ? product.imageUrl : null, 
        promotionDescription: isPromotion ? product.description : null,
        
        originalPrice: originalPrice.toString(),
        discountPrice: discountPrice.toString(),
        discountPercentage: discountPercentage.toString(),
        qrCode: qrCodeBase64,
        expiresAt,
        isRedeemed: false,
        cloneId: null,
        createdAt: new Date()
      };

      console.log('💾 Criando cupom (também para promoções)...');
      // Salvar sempre na base, mas com productId = null para promoções
      const coupon = await storage.createCoupon(couponData);
      console.log('✅ Cupom criado com sucesso:', coupon);

      // NEW: Se é promoção, atualizar status da assignment para 'generated' E incrementar contador
      if (isPromotion) {
        try {
          console.log('🎯 Atualizando status da promotion_assignment para "generated"...');
          await storage.updatePromotionAssignmentStatus(productId, userId, 'generated');
          console.log('✅ Status da assignment atualizado para "generated"');
          
          // 📊 IMPORTANTE: Incrementar contador de uso da promoção para analytics
          console.log('📈 Incrementando contador usedCount da promoção...');
          const incrementSuccess = await storage.incrementPromotionUsage(productId);
          if (incrementSuccess) {
            console.log('✅ Contador usedCount incrementado com sucesso');
          } else {
            console.log('⚠️ Aviso: Não foi possível incrementar contador (limite pode ter sido atingido)');
          }
        } catch (assignmentError) {
          console.error('⚠️ Erro ao atualizar status da assignment (não bloqueante):', assignmentError);
          // Não falha o processo de geração do cupom por causa disto
        }
      }

      res.status(201).json({
        success: true,
        coupon: {
          id: coupon.id,
          couponCode: coupon.couponCode,
          discountPercentage,
          originalPrice,
          discountPrice,
          qrCode: qrCodeBase64,
          expiresAt: coupon.expiresAt
        }
      });
    } catch (error) {
      console.error("🚨 ERRO COMPLETO AO GERAR CUPOM:");
      console.error("🔥 Message:", error.message);
      console.error("🔥 Stack:", error.stack);
      console.error("🔥 Full error:", JSON.stringify(error, null, 2));
      res.status(500).json({ 
        message: "Erro ao gerar cupom",
        error: error.message,
        details: error.stack
      });
    }
  });

  // Buscar cupons do usuário
  app.get('/api/coupons/user', async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const coupons = await storage.getUserCoupons(userId);
      res.json(coupons);
    } catch (error) {
      console.error("Error fetching user coupons:", error);
      res.status(500).json({ message: "Erro ao buscar cupons" });
    }
  });

  // Buscar cupom por código (para validação do lojista)
  app.get('/api/coupons/:couponCode', async (req, res) => {
    try {
      const { couponCode } = req.params;
      const coupon = await storage.getCouponByCode(couponCode);
      
      if (!coupon) {
        return res.status(404).json({ message: "Cupom não encontrado" });
      }

      // Verificar se ainda é válido
      if (new Date(coupon.expiresAt) <= new Date()) {
        return res.status(400).json({ message: "Cupom expirado" });
      }

      if (coupon.isRedeemed) {
        return res.status(400).json({ message: "Cupom já foi utilizado" });
      }

      res.json(coupon);
    } catch (error) {
      console.error("Error fetching coupon:", error);
      res.status(500).json({ message: "Erro ao buscar cupom" });
    }
  });

  // Resgatar cupom (marcar como utilizado)
  app.post('/api/coupons/:couponCode/redeem', isAuthenticated, async (req, res) => {
    try {
      const { couponCode } = req.params;
      
      // Verificar se cupom existe e é válido
      const coupon = await storage.getCouponByCode(couponCode);
      if (!coupon) {
        return res.status(404).json({ message: "Cupom não encontrado" });
      }

      if (new Date(coupon.expiresAt) <= new Date()) {
        return res.status(400).json({ message: "Cupom expirado" });
      }

      if (coupon.isRedeemed) {
        return res.status(400).json({ message: "Cupom já foi utilizado" });
      }

      // Marcar como resgatado
      const redeemedCoupon = await storage.redeemCoupon(couponCode);

      res.json({
        success: true,
        message: "Cupom resgatado com sucesso",
        coupon: redeemedCoupon
      });
    } catch (error) {
      console.error("Error redeeming coupon:", error);
      res.status(500).json({ message: "Erro ao resgatar cupom" });
    }
  });

  // Buscar detalhes de um cupom específico
  app.get('/api/coupons/details/:couponId', async (req, res) => {
    try {
      const { couponId } = req.params;
      const coupon = await storage.getCoupon(couponId);
      
      if (!coupon) {
        return res.status(404).json({ message: "Cupom não encontrado" });
      }

      res.json(coupon);
    } catch (error) {
      console.error("Error fetching coupon details:", error);
      res.status(500).json({ message: "Erro ao buscar detalhes do cupom" });
    }
  });

  // Excluir cupom 
  app.delete('/api/coupons/:couponId', isAuthenticated, async (req: any, res) => {
    try {
      const { couponId } = req.params;
      const userId = getUserId(req);
      
      console.log('🗑️ DELETE CUPOM - Debug:', { couponId, userId });
      
      // Verificar se cupom existe e pertence ao usuário
      const coupon = await storage.getCoupon(couponId);
      if (!coupon) {
        console.log('❌ Cupom não encontrado:', couponId);
        return res.status(404).json({ message: "Cupom não encontrado" });
      }
      
      console.log('🔍 COMPARAÇÃO IDs:', { 
        couponUserId: coupon.userId, 
        requestUserId: userId,
        couponUserIdType: typeof coupon.userId,
        requestUserIdType: typeof userId,
        isEqual: coupon.userId === userId 
      });
      
      if (coupon.userId !== userId) {
        console.log('❌ ACESSO NEGADO - IDs não coincidem');
        return res.status(403).json({ message: "Não autorizado a excluir este cupom" });
      }
      
      // Excluir cupom
      await storage.deleteCoupon(couponId);
      
      res.json({ success: true, message: "Cupom excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting coupon:", error);
      res.status(500).json({ message: "Erro ao excluir cupom" });
    }
  });

  // 🧹 BOTÃO TEMPORÁRIO: Excluir todos os cupons do usuário (para testes)
  app.delete('/api/coupons/user/all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      await storage.deleteAllUserCoupons(userId);
      res.json({ success: true, message: "Todos os cupons excluídos" });
    } catch (error) {
      console.error("Error deleting all user coupons:", error);
      res.status(500).json({ message: "Erro ao excluir todos os cupons" });
    }
  });

  // ====================================================
  // VIRTUAL SCRATCH CARD CAMPAIGN ROUTES (NEW SYSTEM)
  // ====================================================

  // 1. Criar nova campanha de raspagem virtual
  app.post('/api/scratch-campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const campaignData = insertScratchCampaignSchema.parse(req.body);

      // Verificar se o usuário é dono da loja do produto
      const product = await storage.getProductById(campaignData.productId);
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }

      const store = await storage.getUserStore(userId);
      if (!store || store.id !== product.storeId) {
        return res.status(403).json({ message: "Você não tem permissão para criar campanhas neste produto" });
      }

      // Verificar se já existe campanha ativa para este produto
      const existingCampaign = await storage.getScratchCampaignByProduct(campaignData.productId);
      if (existingCampaign) {
        return res.status(400).json({ message: "Já existe uma campanha ativa para este produto" });
      }

      const campaign = await storage.createScratchCampaign({
        ...campaignData,
        storeId: store.id,
      });

      res.status(201).json({
        success: true,
        campaign
      });
    } catch (error) {
      console.error("Error creating scratch campaign:", error);
      res.status(500).json({ message: "Erro ao criar campanha de raspagem" });
    }
  });

  // 2. Buscar campanha por produto
  app.get('/api/scratch-campaigns/product/:productId', async (req, res) => {
    try {
      const { productId } = req.params;
      const campaign = await storage.getScratchCampaignByProduct(productId);
      
      if (!campaign) {
        return res.status(404).json({ message: "Nenhuma campanha ativa encontrada para este produto" });
      }

      // Buscar estatísticas da campanha
      const stats = await storage.getCampaignStats(campaign.id);

      res.json({
        campaign,
        stats
      });
    } catch (error) {
      console.error("Error fetching campaign:", error);
      res.status(500).json({ message: "Erro ao buscar campanha" });
    }
  });

  // 3. Distribuir clones virtuais por sorteio
  app.post('/api/scratch-campaigns/:campaignId/distribute', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const { campaignId } = req.params;
      const { distributeToAll, maxUsers } = req.body;

      // Buscar todos os usuários registrados
      const allUsers = await storage.getAllRegisteredUsers();
      if (allUsers.length === 0) {
        return res.status(400).json({ message: "Nenhum usuário registrado encontrado" });
      }

      // Determinar usuários para sorteio
      let selectedUsers = allUsers;
      if (!distributeToAll && maxUsers) {
        const maxSelections = Math.min(parseInt(maxUsers), allUsers.length);
        selectedUsers = await storage.selectRandomUsers(allUsers, maxSelections);
      }

      // Buscar campanha para obter dados do produto
      const campaign = await storage.getScratchCampaignByProduct(""); // TODO: melhorar busca
      if (!campaign) {
        return res.status(404).json({ message: "Campanha não encontrada" });
      }

      // Criar snapshot do produto para os clones
      const product = await storage.getProductById(campaign.productId);
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      
      const productSnapshot = {
        id: product.id,
        storeId: product.storeId,
        name: product.name,
        description: product.description,
        price: product.price,
        discountPrice: campaign.discountPrice,
        imageUrl: product.imageUrl,
        category: product.category,
      };

      // Criar clones virtuais para os usuários selecionados
      const userIds = selectedUsers.map(user => user.id);
      const clones = await storage.createVirtualClones(campaignId, userIds, productSnapshot);

      // Atualizar estatísticas da campanha
      await storage.updateScratchCampaign(campaignId, {
        clonesCreated: clones.length.toString(),
      });

      res.json({
        success: true,
        message: `${clones.length} clones virtuais distribuídos com sucesso`,
        totalUsers: selectedUsers.length,
        clonesCreated: clones.length
      });
    } catch (error) {
      console.error("Error distributing virtual clones:", error);
      res.status(500).json({ message: "Erro ao distribuir clones virtuais" });
    }
  });

  // 4. Buscar todos os clones virtuais disponíveis do usuário
  app.get('/api/virtual-clones/user', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const clones = await storage.getUserAvailableClones(userId);

      res.json({
        clones
      });
    } catch (error) {
      console.error("Error fetching user clones:", error);
      res.status(500).json({ message: "Erro ao buscar clones do usuário" });
    }
  });

  // 5. Buscar clone virtual disponível do usuário para um produto específico
  app.get('/api/virtual-clones/:productId/user', async (req: any, res) => {
    try {
      const { productId } = req.params;
      const userId = req.user?.claims?.sub || req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const clone = await storage.getUserAvailableClone(userId, productId);

      if (!clone) {
        return res.json({ hasClone: false, clone: null });
      }

      res.json({
        hasClone: true,
        clone
      });
    } catch (error) {
      console.error("Error fetching user clone:", error);
      res.status(500).json({ message: "Erro ao buscar clone do usuário" });
    }
  });

  // 5. Raspar clone virtual (substitui a raspagem tradicional)
  app.post('/api/virtual-clones/:cloneId/scratch', isAuthenticated, async (req: any, res) => {
    try {
      const { cloneId } = req.params;
      const userId = req.user?.claims?.sub || req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Buscar clone pelo ID diretamente
      const clone = await storage.getVirtualCloneById(cloneId);
      if (!clone) {
        return res.status(404).json({ message: "Clone não encontrado" });
      }

      // Verificar se o clone pertence ao usuário
      if (clone.assignedUserId !== userId) {
        return res.status(403).json({ message: "Clone não pertence ao usuário" });
      }

      if (clone.isUsed || clone.isExpired) {
        return res.status(400).json({ message: "Clone já foi usado ou expirou" });
      }

      // Marcar clone como usado
      await storage.markCloneAsUsed(cloneId);

      // Criar cupom baseado no clone
      const couponCode = `CLONE${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Cupom expira em 7 dias

      // Gerar QR Code
      const qrCodeData = JSON.stringify({
        code: couponCode,
        productId: clone.productId,
        storeId: clone.storeId,
        originalPrice: clone.originalPrice,
        discountPrice: clone.discountPrice,
        type: 'virtual_clone'
      });
      const qrCodeBase64 = await QRCode.toDataURL(qrCodeData);

      const couponData = {
        cloneId: cloneId,
        productId: clone.productId,
        storeId: clone.storeId,
        userId: userId,
        userAgent: req.get('User-Agent') || 'unknown',
        ipAddress: req.ip || 'unknown',
        couponCode,
        originalPrice: clone.originalPrice.toString(),
        discountPrice: clone.discountPrice.toString(),
        discountPercentage: clone.campaign?.discountPercentage || "0",
        qrCode: qrCodeBase64,
        expiresAt,
        isRedeemed: false
      };

      const coupon = await storage.createCoupon(couponData);

      res.json({
        success: true,
        coupon: {
          id: coupon.id,
          couponCode: coupon.couponCode,
          discountPercentage: clone.campaign?.discountPercentage || "0",
          originalPrice: clone.originalPrice,
          discountPrice: clone.discountPrice,
          qrCode: qrCodeBase64,
          expiresAt: coupon.expiresAt
        }
      });
    } catch (error) {
      console.error("Error scratching virtual clone:", error);
      res.status(500).json({ message: "Erro ao raspar clone virtual" });
    }
  });

  // 6. Task de limpeza: marcar clones expirados
  app.post('/api/maintenance/mark-expired-clones', async (req, res) => {
    try {
      await storage.markExpiredClones();
      res.json({ success: true, message: "Clones expirados marcados com sucesso" });
    } catch (error) {
      console.error("Error marking expired clones:", error);
      res.status(500).json({ message: "Erro ao marcar clones expirados" });
    }
  });

  // 7. Task de limpeza: marcar promoções expiradas (endpoint manual para testes)
  app.post('/api/maintenance/mark-expired-promotions', async (req, res) => {
    try {
      const expiredCount = await storage.markExpiredPromotions();
      res.json({ 
        success: true, 
        message: `${expiredCount} promoções expiradas marcadas como inativas`,
        expiredCount 
      });
    } catch (error) {
      console.error("Error marking expired promotions:", error);
      res.status(500).json({ message: "Erro ao marcar promoções expiradas" });
    }
  });

  // ===== NOVO SISTEMA: PROMOÇÕES DIRETAS E SIMPLIFICADAS =====

  // 0. Listar promoções do usuário logado (para admin)
  app.get('/api/promotions', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user?.id;
      
      // Buscar loja do usuário
      const userStore = await storage.getUserStore(userId);
      if (!userStore) {
        return res.status(404).json({ message: "Loja não encontrada para o usuário" });
      }

      // Buscar promoções da loja
      const promotions = await storage.getStorePromotions(userStore.id);
      res.json(promotions);
    } catch (error) {
      console.error("Error fetching user promotions:", error);
      res.status(500).json({ message: "Erro ao buscar promoções do usuário" });
    }
  });

  // 1. Listar todas as promoções da loja
  app.get('/api/stores/:storeId/promotions', async (req, res) => {
    try {
      const { storeId } = req.params;
      const promotions = await storage.getStorePromotions(storeId);
      res.json(promotions);
    } catch (error) {
      console.error("Error fetching store promotions:", error);
      res.status(500).json({ message: "Erro ao buscar promoções da loja" });
    }
  });

  // 2. Buscar promoção específica
  app.get('/api/promotions/:promotionId', async (req, res) => {
    try {
      const { promotionId } = req.params;
      const promotion = await storage.getPromotion(promotionId);
      
      if (!promotion) {
        return res.status(404).json({ message: "Promoção não encontrada" });
      }
      
      res.json(promotion);
    } catch (error) {
      console.error("Error fetching promotion:", error);
      res.status(500).json({ message: "Erro ao buscar promoção" });
    }
  });

  // 3. Criar nova promoção (Admin)
  app.post('/api/stores/:storeId/promotions', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { storeId } = req.params;
      const userId = req.session?.user?.id || req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Verificar se a loja pertence ao usuário
      const userStore = await storage.getUserStore(userId);
      if (!userStore || userStore.id !== storeId) {
        return res.status(403).json({ message: "Acesso negado a esta loja" });
      }

      const promotionData = insertPromotionSchema.parse(req.body);
      const promotion = await storage.createPromotion(storeId, promotionData);
      
      res.status(201).json({
        success: true,
        message: "Promoção criada com sucesso!",
        promotion
      });
    } catch (error) {
      console.error("Error creating promotion:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao criar promoção" });
      }
    }
  });

  // 4. Atualizar promoção existente (Admin)
  app.patch('/api/promotions/:promotionId', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { promotionId } = req.params;
      const userId = req.session?.user?.id || req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Verificar se a promoção existe e pertence à loja do usuário
      const promotion = await storage.getPromotion(promotionId);
      if (!promotion) {
        return res.status(404).json({ message: "Promoção não encontrada" });
      }

      const userStore = await storage.getUserStore(userId);
      if (!userStore || userStore.id !== promotion.storeId) {
        return res.status(403).json({ message: "Acesso negado a esta promoção" });
      }

      const updateData = updatePromotionSchema.parse(req.body);
      const updatedPromotion = await storage.updatePromotion(promotionId, updateData);
      
      res.json({
        success: true,
        message: "Promoção atualizada com sucesso!",
        promotion: updatedPromotion
      });
    } catch (error) {
      console.error("Error updating promotion:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao atualizar promoção" });
      }
    }
  });

  // 5. Deletar promoção (Admin)
  app.delete('/api/promotions/:promotionId', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { promotionId } = req.params;
      const userId = req.session?.user?.id || req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Verificar se a promoção existe e pertence à loja do usuário
      const promotion = await storage.getPromotion(promotionId);
      if (!promotion) {
        return res.status(404).json({ message: "Promoção não encontrada" });
      }

      const userStore = await storage.getUserStore(userId);
      if (!userStore || userStore.id !== promotion.storeId) {
        return res.status(403).json({ message: "Acesso negado a esta promoção" });
      }

      await storage.deletePromotion(promotionId);
      
      res.json({
        success: true,
        message: "Promoção deletada com sucesso!"
      });
    } catch (error) {
      console.error("Error deleting promotion:", error);
      res.status(500).json({ message: "Erro ao deletar promoção" });
    }
  });

  // 6. Verificar se usuário pode raspar uma promoção
  app.get('/api/promotions/:promotionId/can-scratch', async (req: any, res) => {
    try {
      const { promotionId } = req.params;
      const userId = req.user?.claims?.sub || req.user?.id;
      const userAgent = req.get('User-Agent') || 'unknown';
      const ipAddress = req.ip || 'unknown';
      
      const canScratch = await storage.canUserScratchPromotion(promotionId, userId, userAgent, ipAddress);
      
      res.json({
        canScratch: canScratch.allowed,
        reason: canScratch.reason,
        promotion: canScratch.promotion
      });
    } catch (error) {
      console.error("Error checking scratch eligibility:", error);
      res.status(500).json({ message: "Erro ao verificar elegibilidade" });
    }
  });

  // 7. Raspar promoção e gerar cupom
  app.post('/api/promotions/:promotionId/scratch', async (req: any, res) => {
    try {
      const { promotionId } = req.params;
      const userId = req.user?.claims?.sub || req.user?.id;
      const userAgent = req.get('User-Agent') || 'unknown';
      const ipAddress = req.ip || 'unknown';
      
      // Verificar se pode raspar
      const canScratch = await storage.canUserScratchPromotion(promotionId, userId, userAgent, ipAddress);
      
      if (!canScratch.allowed) {
        return res.status(400).json({ 
          message: canScratch.reason 
        });
      }

      // Gerar código único do cupom
      const couponCode = `PROMO${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Cupom expira em 24 horas

      // Gerar QR Code
      const qrCodeData = JSON.stringify({
        code: couponCode,
        promotionId: promotionId,
        originalPrice: canScratch.promotion!.originalPrice,
        promotionalPrice: canScratch.promotion!.promotionalPrice,
        type: 'promotion'
      });
      const qrCodeBase64 = await QRCode.toDataURL(qrCodeData);

      // Registrar que o usuário raspou
      const scratchData = {
        promotionId: promotionId,
        userId: userId,
        userAgent: userAgent,
        ipAddress: ipAddress,
        couponCode: couponCode,
        expiresAt: expiresAt
      };

      const scratch = await storage.createPromotionScratch(scratchData);
      
      // Atualizar contador de usos da promoção
      const incrementSuccess = await storage.incrementPromotionUsage(promotionId);
      
      if (!incrementSuccess) {
        return res.status(400).json({ 
          success: false, 
          message: "Limite de participantes já foi atingido" 
        });
      }

      // CRUCIAL: Atualizar status do assignment para 'generated' para que a promoção suma da lista do usuário
      if (userId) {
        await storage.updatePromotionAssignmentStatus(promotionId, userId, 'generated');
        console.log(`🎯 Atualizando status da promotion_assignment para "generated"...`);
      }

      res.json({
        success: true,
        message: "Parabéns! Você ganhou um cupom de desconto!",
        coupon: {
          code: couponCode,
          discountPercentage: canScratch.promotion!.discountPercentage,
          originalPrice: canScratch.promotion!.originalPrice,
          promotionalPrice: canScratch.promotion!.promotionalPrice,
          qrCode: qrCodeBase64,
          expiresAt: expiresAt,
          promotion: {
            name: canScratch.promotion!.name,
            imageUrl: canScratch.promotion!.imageUrl
          }
        }
      });
    } catch (error) {
      console.error("Error scratching promotion:", error);
      res.status(500).json({ message: "Erro ao raspar promoção" });
    }
  });

  // 8. Listar promoções ativas para o público (sem necessidade de login)
  app.get('/api/public/promotions/active', async (req, res) => {
    try {
      const activePromotions = await storage.getActivePromotions();
      res.json(activePromotions);
    } catch (error) {
      console.error("Error fetching active promotions:", error);
      res.status(500).json({ message: "Erro ao buscar promoções ativas" });
    }
  });

  // 9. Analytics: buscar estatísticas da promoção (Admin)
  app.get('/api/promotions/:promotionId/stats', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { promotionId } = req.params;
      const userId = req.session?.user?.id || req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Verificar se a promoção pertence à loja do usuário
      const promotion = await storage.getPromotion(promotionId);
      if (!promotion) {
        return res.status(404).json({ message: "Promoção não encontrada" });
      }

      const userStore = await storage.getUserStore(userId);
      if (!userStore || userStore.id !== promotion.storeId) {
        return res.status(403).json({ message: "Acesso negado a esta promoção" });
      }

      const stats = await storage.getPromotionStats(promotionId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching promotion stats:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas da promoção" });
    }
  });

  // === COMPARAÇÃO DE PREÇOS INTERNACIONAL ===

  // Endpoint para buscar produtos disponíveis para comparação
  app.get('/api/public/products-for-comparison', async (req, res) => {
    try {
      const products = await storage.getProductsForComparison();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products for comparison:", error);
      res.status(500).json({ message: "Erro ao buscar produtos para comparação" });
    }
  });

  // Endpoint principal para comparar preços
  app.post('/api/price-comparison/compare', async (req: any, res) => {
    try {
      const { productId } = req.body;
      
      if (!productId) {
        return res.status(400).json({ message: "Product ID é obrigatório" });
      }

      // Buscar produto no Paraguay
      const paraguayProduct = await storage.getProductWithStore(productId);
      if (!paraguayProduct) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }

      // Importar o serviço de scraping
      const { scrapeBrazilianPricesNew } = await import('./new-price-scraper');
      const { generateProductSuggestions } = await import('./price-scraper');
      
      // Fazer scraping dos preços brasileiros
      console.log(`🔍 Iniciando comparação para: ${paraguayProduct.name}`);
      const brazilianPrices = await scrapeBrazilianPricesNew(paraguayProduct.name);
      
      // Salvar preços encontrados no banco
      for (const priceData of brazilianPrices) {
        try {
          await storage.saveBrazilianPrice(priceData);
        } catch (error) {
          console.error("Erro ao salvar preço brasileiro:", error);
        }
      }

      // Calcular economia com cotação real
      const paraguayPriceUSD = parseFloat(paraguayProduct.price || "0");
      const paraguayPriceBRL = await convertUsdToBrl(paraguayPriceUSD);
      
      let bestPrice = Infinity;
      let bestStore = "";
      
      brazilianPrices.forEach(price => {
        const priceBRL = parseFloat(price.price);
        if (priceBRL < bestPrice) {
          bestPrice = priceBRL;
          bestStore = price.storeName;
        }
      });

      // Lógica simples e clara conforme especificação
      if (paraguayPriceBRL < bestPrice) {
        // Paraguay é mais barato - calcular economia
        const savings = bestPrice - paraguayPriceBRL;
        const savingsPercentage = (savings / bestPrice) * 100;
        var finalSavings = savings;
        var finalPercentage = savingsPercentage;
        var cheaperInBrazil = false;
      } else {
        // Brasil é mais barato ou igual
        var finalSavings = 0;
        var finalPercentage = 0;
        var cheaperInBrazil = true;
      }

      // Gerar sugestões de produtos similares
      const allProducts = await storage.getAllProducts();
      const suggestions = generateProductSuggestions(paraguayProduct, allProducts);

      // Salvar comparação no histórico
      const userId = req.user?.claims?.sub || req.user?.id;
      try {
        await storage.savePriceComparison({
          userId: userId || null,
          productId,
          paraguayPrice: paraguayPriceUSD.toString(),
          paraguayCurrency: "USD",
          bestBrazilianPrice: bestPrice !== Infinity ? bestPrice.toString() : null,
          savings: finalSavings.toString(),
          savingsPercentage: finalPercentage.toString(),
          brazilianStoresFound: brazilianPrices.length.toString(),
        });
      } catch (error) {
        console.error("Erro ao salvar comparação:", error);
      }

      // Resposta da comparação
      const response = {
        productName: paraguayProduct.name,
        paraguayPrice: paraguayPriceUSD,
        paraguayCurrency: "US$",
        paraguayStore: paraguayProduct.store?.name || "Loja no Paraguay",
        brazilianPrices: brazilianPrices.map(price => ({
          store: price.storeName,
          price: parseFloat(price.price),
          currency: "R$",
          url: price.productUrl,
          availability: price.availability || 'in_stock',
          lastUpdated: new Date().toISOString(),
        })),
        suggestions: suggestions.slice(0, 5), // Limitar a 5 sugestões
        savings: {
          amount: finalSavings,
          percentage: Math.round(finalPercentage),
          bestStore: bestStore || "N/A",
          cheaperInBrazil: cheaperInBrazil,
        },
        message: brazilianPrices.length === 0 
          ? "No momento não conseguimos acessar as lojas brasileiras devido às proteções anti-bot. Esta funcionalidade está em desenvolvimento e será melhorada em breve."
          : `Encontrados preços em ${brazilianPrices.length} lojas brasileiras`
      };

      console.log(`✅ Comparação concluída: ${brazilianPrices.length} preços encontrados`);
      res.json(response);
      
    } catch (error) {
      console.error("Error in price comparison:", error);
      res.status(500).json({ message: "Erro ao comparar preços" });
    }
  });

  // Endpoint para obter cotação atual USD → BRL
  app.get('/api/exchange-rate/usd-brl', async (req, res) => {
    try {
      // Se parâmetro 'fresh' for true, limpa o cache
      if (req.query.fresh === 'true') {
        clearExchangeRateCache();
      }
      
      const rate = await getCurrentExchangeRate();
      res.json({ 
        rate, 
        lastUpdated: new Date().toISOString(),
        source: 'open.er-api.com',
        formatted: {
          usd: formatUSD(1),
          brl: formatBRL(rate)
        }
      });
    } catch (error) {
      console.error('Erro ao obter cotação:', error);
      res.status(500).json({ 
        error: 'Falha ao obter cotação', 
        fallbackRate: 5.50
      });
    }
  });

  // Endpoint para converter valores USD → BRL
  app.post('/api/exchange-rate/convert', async (req, res) => {
    try {
      const { amount, from, to } = req.body;
      
      if (!amount || typeof amount !== 'number') {
        return res.status(400).json({ error: 'Amount é obrigatório e deve ser um número' });
      }
      
      if (from === 'USD' && to === 'BRL') {
        const convertedAmount = await convertUsdToBrl(amount);
        const rate = await getCurrentExchangeRate();
        
        res.json({
          originalAmount: amount,
          convertedAmount,
          rate,
          from,
          to,
          formatted: {
            original: formatUSD(amount),
            converted: formatBRL(convertedAmount)
          }
        });
      } else {
        res.status(400).json({ error: 'Conversão suportada apenas de USD para BRL' });
      }
    } catch (error) {
      console.error('Erro na conversão:', error);
      res.status(500).json({ error: 'Falha na conversão de moeda' });
    }
  });

  // Endpoint para buscar histórico de comparações do usuário
  app.get('/api/price-comparison/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const history = await storage.getUserPriceComparisons(userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching comparison history:", error);
      res.status(500).json({ message: "Erro ao buscar histórico de comparações" });
    }
  });

  // Endpoint para buscar preços brasileiros salvos de um produto
  app.get('/api/price-comparison/brazilian-prices/:productName', async (req, res) => {
    try {
      const { productName } = req.params;
      const prices = await storage.getBrazilianPricesByProduct(productName);
      res.json(prices);
    } catch (error) {
      console.error("Error fetching Brazilian prices:", error);
      res.status(500).json({ message: "Erro ao buscar preços brasileiros" });
    }
  });

  // Endpoint para buscar histórico de preços de um produto
  app.get('/api/price-history/:productName', async (req, res) => {
    try {
      const { productName } = req.params;
      const days = parseInt(req.query.days as string) || 30;
      
      const { getPriceHistory } = await import('./price-scraper');
      const history = await getPriceHistory(productName, days);
      
      res.json(history);
    } catch (error) {
      console.error("Error fetching price history:", error);
      res.status(500).json({ message: "Erro ao buscar histórico de preços" });
    }
  });

  // Endpoint para criar alerta de preço
  app.post('/api/price-alerts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const alertSchema = z.object({
        productName: z.string().min(1, "Nome do produto é obrigatório"),
        targetPrice: z.number().positive("Preço deve ser positivo"),
        currency: z.string().default('BRL'),
        emailNotification: z.boolean().default(true)
      });
      
      const alertData = alertSchema.parse(req.body);
      const alert = await storage.createPriceAlert({
        ...alertData,
        userId
      });
      
      res.json(alert);
    } catch (error) {
      console.error("Error creating price alert:", error);
      res.status(500).json({ message: "Erro ao criar alerta de preço" });
    }
  });

  // Endpoint para listar alertas do usuário
  app.get('/api/price-alerts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const alerts = await storage.getUserPriceAlerts(userId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching price alerts:", error);
      res.status(500).json({ message: "Erro ao buscar alertas de preço" });
    }
  });

  // Endpoint para deletar alerta
  app.delete('/api/price-alerts/:alertId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const { alertId } = req.params;
      
      // Verificar se o alerta pertence ao usuário
      const alert = await storage.getPriceAlert(alertId);
      if (!alert || alert.userId !== userId) {
        return res.status(404).json({ message: "Alerta não encontrado" });
      }
      
      await storage.deletePriceAlert(alertId);
      res.json({ message: "Alerta deletado com sucesso" });
    } catch (error) {
      console.error("Error deleting price alert:", error);
      res.status(500).json({ message: "Erro ao deletar alerta" });
    }
  });

  // ========================
  // GERENCIAMENTO DE LOJAS PREMIUM (SUPER ADMIN)
  // ========================

  // Endpoint para listar todas as lojas (Super Admin)
  app.get('/api/admin/all-stores', isSuperAdmin, async (req, res) => {
    try {
      const stores = await storage.getAllActiveStores();
      
      // Adicionar contagem de produtos para cada loja
      const storesWithStats = await Promise.all(
        stores.map(async (store) => {
          try {
            const products = await storage.getStoreProducts(store.id);
            return {
              ...store,
              productCount: products.length,
              isPremium: store.isPremium || false
            };
          } catch (error) {
            console.error(`Erro ao buscar produtos da loja ${store.id}:`, error);
            return {
              ...store,
              productCount: 0,
              isPremium: store.isPremium || false
            };
          }
        })
      );

      res.json(storesWithStats);
    } catch (error) {
      console.error("Error fetching all stores:", error);
      res.status(500).json({ message: "Erro ao buscar lojas" });
    }
  });

  // Endpoint para alterar status premium de uma loja (Super Admin)
  app.patch('/api/admin/stores/:storeId/premium', isSuperAdmin, async (req, res) => {
    try {
      const { storeId } = req.params;
      const { isPremium } = req.body;

      if (typeof isPremium !== 'boolean') {
        return res.status(400).json({ message: "isPremium deve ser um valor booleano" });
      }

      // Verificar se a loja existe
      const store = await storage.getStore(storeId);
      if (!store) {
        return res.status(404).json({ message: "Loja não encontrada" });
      }

      // Atualizar status premium
      const updatedStore = await storage.updateStore(storeId, { isPremium });
      
      res.json({
        success: true,
        store: updatedStore,
        message: isPremium ? "Loja promovida para premium" : "Status premium removido"
      });
    } catch (error) {
      console.error("Error updating store premium status:", error);
      res.status(500).json({ message: "Erro ao atualizar status premium da loja" });
    }
  });

  // ========================
  // COMPARAÇÃO DE PRODUTO INDIVIDUAL
  // ========================
  
  // Endpoint para comparar um produto específico entre lojas
  app.get('/api/product-comparison/:id', async (req, res) => {
    const timeout = 15000; // Aumentar para 15 segundos
    const startTime = Date.now();
    
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ message: "Product ID é obrigatório" });
      }

      const cacheKey = `product-comparison-${id}`;
      const cached = cache.get(cacheKey);
      
      if (cached) {
        console.log(`📦 Cache hit for /api/product-comparison/${id}`);
        return res.json(cached);
      }
      
      console.log(`📦 Cache miss for /api/product-comparison/${id} - fetching from DB`);
      
      // Buscar o produto original
      const originalProduct = await storage.getProductWithStore(id);
      if (!originalProduct) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }

      // Busca otimizada usando SQL direto no banco
      const searchName = originalProduct.name.toLowerCase().trim();
      const searchWords = searchName.split(' ').filter(word => word.length > 3);
      
      // Busca otimizada - usando método simplificado do storage
      const allProducts = await storage.getAllProducts();
      const allStores = await storage.getAllActiveStores();
      
      // Filtrar produtos similares
      const storesById = allStores.reduce((acc, store) => {
        acc[store.id] = store;
        return acc;
      }, {} as Record<string, any>);

      const similarProducts = allProducts.filter(product => {
        if (!product.isActive) return false;
        const store = storesById[product.storeId];
        if (!store || !store.isActive) return false;
        
        // Comparação por GTIN (se ambos tiverem)
        if (originalProduct.gtin && product.gtin) {
          return originalProduct.gtin === product.gtin;
        }
        
        // Comparação por nome similar
        const productName = product.name.toLowerCase().trim();
        
        // Verificar se os nomes são similares
        return searchName === productName || 
               searchName.includes(productName) || 
               productName.includes(searchName) ||
               // Comparar palavras-chave importantes
               searchWords.some(word => productName.includes(word));
      }).slice(0, 50); // Limitar resultados

      const storesWithProduct = similarProducts.map(product => {
        const store = storesById[product.storeId];
        return {
          id: product.id,
          name: product.name,
          description: product.description || '',
          price: product.price,
          imageUrl: product.imageUrl,
          imageUrl2: product.imageUrl2,
          imageUrl3: product.imageUrl3,
          category: product.category,
          brand: product.brand,
          store: {
            id: store.id,
            name: store.name,
            logoUrl: store.logoUrl,
            address: store.address,
            whatsapp: store.whatsapp,
            instagram: store.instagram,
            isPremium: store.isPremium || false,
            themeColor: store.themeColor || '#E11D48'
          }
        };
      });

      if (storesWithProduct.length === 0) {
        return res.status(404).json({ 
          message: "Nenhuma loja encontrada vendendo este produto" 
        });
      }

      // Montar lista de imagens do produto (usar do produto original primeiro)
      const productImages = [
        originalProduct.imageUrl,
        originalProduct.imageUrl2,
        originalProduct.imageUrl3
      ].filter(Boolean);

      // Se não tiver imagens do original, pegar das outras lojas
      if (productImages.length === 0) {
        storesWithProduct.forEach(item => {
          if (item.imageUrl) productImages.push(item.imageUrl);
          if (item.imageUrl2) productImages.push(item.imageUrl2);
          if (item.imageUrl3) productImages.push(item.imageUrl3);
        });
      }

      // Resposta formatada para a página de comparação
      const response = {
        productName: originalProduct.name,
        productImages: Array.from(new Set(productImages)), // Remover duplicatas
        category: originalProduct.category,
        brand: originalProduct.brand,
        description: originalProduct.description,
        storesWithProduct: storesWithProduct
      };

      // Cache for 10 minutes (600,000ms)
      cache.set(cacheKey, response, 10 * 60 * 1000);

      const elapsedTime = Date.now() - startTime;
      console.log(`⚡ Product comparison completed in ${elapsedTime}ms with ${storesWithProduct.length} results`);
      
      res.json(response);
      
    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      
      console.error("Error in product comparison:", error);
      res.status(500).json({ message: "Erro ao buscar comparação do produto" });
    }
  });

  // ========================
  // ROTAS DO SISTEMA DE TOTEM
  // ========================

  // Listar conteúdo do totem (público)
  app.get('/api/totem/:storeId/content', async (req, res) => {
    try {
      const { storeId } = req.params;
      
      // Buscar conteúdo regular da loja
      const storeContent = await storage.getTotemContent(storeId);
      
      // Filtrar apenas conteúdo ativo e dentro do horário agendado
      const now = new Date();
      const activeStoreContent = storeContent.filter(item => 
        item.isActive && 
        (!item.scheduleStart || item.scheduleStart <= now) &&
        (!item.scheduleEnd || item.scheduleEnd >= now)
      );
      
      // Buscar artes geradas automaticamente (ativas dos últimos 7 dias)
      let activeGeneratedArts = [];
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const generatedArts = await storage.getGeneratedTotemArts('global-trends');
        activeGeneratedArts = generatedArts.filter(art => {
          if (!art.isActive) return false;
          
          // Verificar se a data é válida antes de comparar
          const genDate = new Date(art.generationDate);
          return !isNaN(genDate.getTime()) && genDate >= sevenDaysAgo;
        });
      } catch (error) {
        console.warn('⚠️ Erro ao buscar artes geradas para totem, usando apenas conteúdo da loja:', error);
        activeGeneratedArts = []; // Continuar sem artes geradas
      }
      
      // Converter artes geradas para formato de conteúdo do totem
      const generatedContentItems = activeGeneratedArts.map(art => {
        // Normalizar URL da imagem
        let mediaUrl = art.imageUrl;
        if (!mediaUrl.startsWith('http') && !mediaUrl.startsWith('/')) {
          mediaUrl = `/${art.imageUrl}`;
        }
        
        return {
          id: `generated-${art.id}`,
          storeId: storeId, // Usar storeId atual para compatibilidade
          title: 'Produtos em Tendência',
          description: `Arte promocional gerada automaticamente com base nos produtos mais buscados`,
          mediaUrl: mediaUrl,
          mediaType: 'image' as const,
          displayDuration: '15', // 15 segundos para artes promocionais
          isActive: true,
          sortOrder: '999', // Exibir por último na rotação
          scheduleStart: null,
          scheduleEnd: null,
          createdAt: art.generationDate, // Usar generationDate consistentemente
          updatedAt: art.generationDate
        };
      });
      
      // Combinar conteúdo da loja com artes geradas
      const allContent = [...activeStoreContent, ...generatedContentItems];
      
      // Ordenar por sortOrder e depois por data de criação
      allContent.sort((a, b) => {
        // Parsing seguro de sortOrder
        const orderA = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : 0;
        const orderB = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 0;
        if (orderA !== orderB) return orderA - orderB;
        
        // Parsing seguro de datas
        const timeA = a.createdAt ? Date.parse(a.createdAt) : 0;
        const timeB = b.createdAt ? Date.parse(b.createdAt) : 0;
        const dateA = Number.isFinite(timeA) ? timeA : 0;
        const dateB = Number.isFinite(timeB) ? timeB : 0;
        return dateB - dateA;
      });
      
      console.log(`📺 Totem ${storeId}: ${activeStoreContent.length} conteúdo da loja + ${generatedContentItems.length} artes geradas = ${allContent.length} total`);
      
      res.json({ success: true, content: allContent });
    } catch (error) {
      console.error('Error fetching totem content:', error);
      res.status(500).json({ message: 'Failed to fetch totem content' });
    }
  });

  // Criar novo conteúdo do totem (admin)
  app.post('/api/totem/content', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub || req.session?.user?.id;
      
      // Buscar a loja do usuário logado
      const store = await storage.getUserStore(userId);
      if (!store) {
        return res.status(403).json({ message: 'No store found for user' });
      }
      
      // Validar os dados recebidos
      const contentData = insertTotemContentSchema.parse(req.body);
      
      // Preparar dados para inserção no banco
      const contentForDB = {
        storeId: store.id,
        title: contentData.title,
        description: contentData.description || null,
        mediaUrl: contentData.mediaUrl,
        mediaType: contentData.mediaType,
        displayDuration: contentData.displayDuration,
        sortOrder: contentData.sortOrder,
        isActive: true,
        scheduleStart: contentData.scheduleStart && contentData.scheduleStart !== '' 
          ? new Date(contentData.scheduleStart) : null,
        scheduleEnd: contentData.scheduleEnd && contentData.scheduleEnd !== '' 
          ? new Date(contentData.scheduleEnd) : null,
      };
      
      const content = await storage.createTotemContent(contentForDB);
      res.status(201).json({ success: true, content });
    } catch (error) {
      console.error('Error creating totem content:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create totem content' });
    }
  });

  // Atualizar conteúdo do totem (admin)
  app.put('/api/totem/content/:id', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub || req.session?.user?.id;
      const { id } = req.params;
      const contentData = updateTotemContentSchema.parse(req.body);
      
      const store = await storage.getUserStore(userId);
      if (!store) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const content = await storage.updateTotemContent(id, store.id, contentData);
      res.json({ success: true, content });
    } catch (error) {
      console.error('Error updating totem content:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update totem content' });
    }
  });

  // Deletar conteúdo do totem (admin)
  app.delete('/api/totem/content/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub || req.session?.user?.id;
      const { id } = req.params;
      
      const store = await storage.getUserStore(userId);
      if (!store) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Verificar se é uma arte gerada (ID começa com "generated-")
      if (id.startsWith('generated-')) {
        const artId = id.replace('generated-', '');
        console.log(`🗑️ Deletando arte gerada: ${artId}`);
        await storage.deleteGeneratedTotemArt(artId);
      } else {
        // Conteúdo regular da loja
        await storage.deleteTotemContent(id, store.id);
      }
      
      res.json({ success: true, message: 'Content deleted successfully' });
    } catch (error) {
      console.error('Error deleting totem content:', error);
      res.status(500).json({ message: 'Failed to delete totem content' });
    }
  });

  // Obter configurações do totem (admin)
  app.get('/api/totem/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub || req.session?.user?.id;
      const store = await storage.getUserStore(userId);
      if (!store) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const settings = await storage.getTotemSettings(store.id);
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Error fetching totem settings:', error);
      res.status(500).json({ message: 'Failed to fetch totem settings' });
    }
  });

  // Atualizar configurações do totem (admin)
  app.post('/api/totem/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub || req.session?.user?.id;
      const settingsData = req.body;
      
      const store = await storage.getUserStore(userId);
      if (!store) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const settings = await storage.upsertTotemSettings(store.id, settingsData);
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Error updating totem settings:', error);
      res.status(500).json({ message: 'Failed to update totem settings' });
    }
  });

  // Atualizar última sincronização do totem (público para o totem)
  app.post('/api/totem/:storeId/sync', async (req, res) => {
    try {
      const { storeId } = req.params;
      await storage.updateTotemLastSync(storeId);
      res.json({ success: true, message: 'Sync updated', timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Error updating totem sync:', error);
      res.status(500).json({ message: 'Failed to update sync' });
    }
  });

  // Upload de imagem para totem
  app.post('/api/totem/upload', isAuthenticated, async (req: any, res) => {
    // Configurar multer para salvar na pasta uploads/totem
    const multerStorage = multer.diskStorage({
      destination: (req: any, file: any, cb: any) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'totem');
        // Criar diretório se não existir
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req: any, file: any, cb: any) => {
        // Gerar nome único com timestamp
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      }
    });

    const upload = multer({
      storage: multerStorage,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB máximo
      fileFilter: (req: any, file: any, cb: any) => {
        // Aceitar apenas imagens e vídeos
        const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm|mov/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
          return cb(null, true);
        } else {
          cb(new Error('Apenas imagens (JPG, PNG, GIF, WEBP) e vídeos (MP4, WEBM, MOV) são permitidos'));
        }
      }
    }).single('file');

    upload(req, res, (err: any) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({ 
          success: false, 
          message: err.message || 'Erro no upload do arquivo' 
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nenhum arquivo foi enviado' 
        });
      }

      // Retornar URL da imagem uploaded
      const fileUrl = `/uploads/totem/${req.file.filename}`;
      res.json({ 
        success: true, 
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    });
  });

  // Gerar banner com IA para totem
  app.post('/api/totem/generate-banner', isAuthenticated, async (req: any, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ 
          message: 'API key do Gemini não configurada',
          error: 'GEMINI_API_KEY não encontrada' 
        });
      }

      const { title, description, style, colors, price, isEdit, editCommand, baseImage } = req.body;

      if (!title) {
        return res.status(400).json({ message: 'Título é obrigatório' });
      }

      if (isEdit && editCommand) {
        console.log('✏️ Editando imagem existente com comando:', editCommand);
      } else {
        console.log('🎨 Gerando nova imagem com IA:', { title, description, style, colors, price });
      }

      // Importar Gemini de forma dinâmica
      const { generateImage } = await import('../gemini');
      
      let prompt = '';

      if (isEdit && editCommand && baseImage) {
        // MODO EDIÇÃO ITERATIVA - Baseado na documentação oficial
        prompt = `${editCommand}

Keep the overall composition and maintain the same visual quality. This is for a digital totem display (16:9 aspect ratio). No text should appear in the image.`;

        console.log('✏️ Sending iterative edit to Gemini 2.5 Flash:', editCommand);
      } else {
        // MODO GERAÇÃO INICIAL - Otimizado baseado na documentação
        const stylePrompts: { [key: string]: string } = {
          'moderno': 'A high-resolution, studio-lit commercial photograph with minimalist composition. Clean geometric elements, soft gradients, and professional lighting. Three-point lighting setup with diffused highlights.',
          'colorido': 'A vibrant, dynamic commercial photograph with bold saturated colors. Energetic composition with striking color contrasts and professional studio lighting.',
          'elegante': 'A luxury commercial photograph with sophisticated lighting and premium aesthetic. Refined composition with elegant elements, soft shadows, and high-end styling.',
          'promocional': 'A bold, eye-catching commercial photograph designed to grab attention. Dynamic angles, dramatic lighting, and striking visual elements.',
          'profissional': 'A clean, corporate-style commercial photograph with professional lighting. Business aesthetic with sharp focus and polished presentation.'
        };

        prompt = stylePrompts[style] || stylePrompts['profissional'];
        
        // Adicionar contexto do produto/serviço
        if (description) {
          prompt += ` The scene should relate to: ${description}.`;
        } else {
          prompt += ` Theme: ${title}.`;
        }

        // Adicionar especificações técnicas
        prompt += ` Shot with professional camera equipment, 16:9 aspect ratio (1920x1080 pixels). Ultra-realistic with sharp focus and high contrast suitable for digital display.`;

        // Adicionar paleta de cores se especificada
        if (colors && colors.trim()) {
          prompt += ` Color palette: ${colors}.`;
        }

        // Restrições críticas
        prompt += ` CRITICAL: No text, no logos, no typography, no written content of any kind. Pure visual imagery only. Commercial photography quality.`;

        console.log('🎯 Sending optimized prompt to Gemini 2.5 Flash');
      }

      // Gerar imagem com Gemini
      const tempImagePath = `/tmp/banner_${Date.now()}.png`;
      
      // Passar imagem base se for edição iterativa
      await generateImage(prompt, tempImagePath, baseImage);
      
      // Converter para base64 para enviar pela API
      const fs = await import('fs');
      const imageBuffer = fs.default.readFileSync(tempImagePath);
      const imageUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      
      // Limpar arquivo temporário
      fs.default.unlinkSync(tempImagePath);
      
      console.log('✅ Banner gerado com sucesso usando Gemini AI!');

      res.json({
        success: true,
        imageUrl,
        hasRealImage: true,
        bannerInfo: {
          title,
          description,
          price,
          style,
          colors
        },
        generatedWith: 'Gemini AI'
      });

    } catch (error) {
      console.error('❌ Erro ao gerar banner com IA:', error);
      
      // Fallback para placeholder em caso de erro
      const colorMap: { [key: string]: string } = {
        'moderno': 'f8f9fa,343a40',
        'colorido': 'ff6b6b,ffffff',
        'elegante': '2c3e50,ecf0f1',
        'promocional': 'e74c3c,ffffff',
        'profissional': '3498db,ffffff'
      };
      
      const { title, style } = req.body;
      const selectedColors = colorMap[style] || 'ffffff,000000';
      const [bgColor, textColor] = selectedColors.split(',');
      
      let bannerContent = title;
      if (req.body.price) bannerContent += `%0A${req.body.price}`;
      if (req.body.description) bannerContent += `%0A${req.body.description}`;
      
      const fallbackUrl = `https://placehold.co/1920x1080/${bgColor}/${textColor}/png?text=${encodeURIComponent(bannerContent)}&font=roboto`;
      
      console.log('⚠️ Usando fallback placeholder devido ao erro:', error instanceof Error ? error.message : 'Erro desconhecido');
      
      res.json({
        success: true,
        imageUrl: fallbackUrl,
        hasRealImage: false,
        bannerInfo: {
          title,
          description: req.body.description,
          price: req.body.price,
          style,
          colors: selectedColors
        },
        fallback: true,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // ROTA DE TESTE - PNG 1x1 cinza para testar frontend
  app.get('/api/test-image', (_req, res) => {
    // PNG 1x1 cinza
    const DATA_URL = 
      "data:image/png;base64," +
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAugB2zj0qzEAAAAASUVORK5CYII=";
    
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.json({ ok: true, imageDataUrl: DATA_URL });
  });

  // LIMPAR rota POST do test-image 
  // (redirecionar para a rota GET)
  app.post('/api/test-image', (_req, res) => {
    res.redirect(307, '/api/test-image'); // 307 = keep method
  });

  // ========================
  // ROTAS DOS BANNERS
  // ========================

  // Buscar banners ativos (público)
  app.get('/api/banners/active', async (req, res) => {
    try {
      const banners = await storage.getAllActiveBanners();
      res.json(banners);
    } catch (error) {
      console.error("Error fetching active banners:", error);
      res.status(500).json({ message: "Erro ao buscar banners" });
    }
  });

  // Registrar visualização de banner
  app.post('/api/banners/view', async (req, res) => {
    try {
      const { bannerId } = req.body;
      const userId = req.session?.user?.id || null;
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.connection.remoteAddress;

      await storage.recordBannerView(bannerId, userId, userAgent, ipAddress);
      res.json({ success: true });
    } catch (error) {
      console.error("Error recording banner view:", error);
      res.status(500).json({ message: "Erro ao registrar visualização" });
    }
  });

  // Registrar clique em banner
  app.post('/api/banners/click', async (req, res) => {
    try {
      const { bannerId } = req.body;
      const userId = req.session?.user?.id || null;
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.connection.remoteAddress;

      await storage.recordBannerClick(bannerId, userId, userAgent, ipAddress);
      res.json({ success: true });
    } catch (error) {
      console.error("Error recording banner click:", error);
      res.status(500).json({ message: "Erro ao registrar clique" });
    }
  });

  // ROTAS ADMINISTRATIVAS DE BANNERS (Super Admin apenas)

  // Listar todos os banners (Super Admin)
  app.get('/api/admin/banners', isAuthenticatedCustom, isSuperAdmin, async (req, res) => {
    try {
      const banners = await storage.getAllBanners();
      res.json(banners);
    } catch (error) {
      console.error("Error fetching all banners:", error);
      res.status(500).json({ message: "Erro ao buscar banners" });
    }
  });

  // Buscar banner específico (Super Admin)
  app.get('/api/admin/banners/:bannerId', isAuthenticatedCustom, isSuperAdmin, async (req, res) => {
    try {
      const { bannerId } = req.params;
      const banner = await storage.getBanner(bannerId);
      
      if (!banner) {
        return res.status(404).json({ message: "Banner não encontrado" });
      }
      
      res.json(banner);
    } catch (error) {
      console.error("Error fetching banner:", error);
      res.status(500).json({ message: "Erro ao buscar banner" });
    }
  });

  // Criar banner (Super Admin)
  app.post('/api/admin/banners', isAuthenticatedCustom, isSuperAdmin, async (req, res) => {
    try {
      const bannerSchema = z.object({
        title: z.string().min(1, "Título é obrigatório"),
        description: z.string().optional(),
        imageUrl: z.string().url("URL da imagem inválida"),
        linkUrl: z.string().url("URL do link inválida").optional().or(z.literal("")),
        bannerType: z.enum(['rotating', 'static_left', 'static_right'], {
          errorMap: () => ({ message: "Tipo de banner deve ser: rotating, static_left ou static_right" })
        }),
        priority: z.string().default("0"),
        backgroundColor: z.string().default("#ffffff"),
        textColor: z.string().default("#000000"),
        startsAt: z.string().datetime().optional(),
        endsAt: z.string().datetime().optional().nullable(),
      });

      const rawData = bannerSchema.parse(req.body);
      
      // Converter strings para Date se fornecidas
      const bannerData = {
        ...rawData,
        startsAt: rawData.startsAt ? new Date(rawData.startsAt) : undefined,
        endsAt: rawData.endsAt ? new Date(rawData.endsAt) : undefined,
      };
      
      const banner = await storage.createBanner(bannerData);
      
      res.status(201).json(banner);
    } catch (error) {
      console.error("Error creating banner:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Erro ao criar banner" });
    }
  });

  // Atualizar banner (Super Admin)
  app.put('/api/admin/banners/:bannerId', isAuthenticatedCustom, isSuperAdmin, async (req, res) => {
    try {
      const { bannerId } = req.params;
      
      const bannerSchema = z.object({
        title: z.string().min(1, "Título é obrigatório").optional(),
        description: z.string().optional(),
        imageUrl: z.string().url("URL da imagem inválida").optional(),
        linkUrl: z.string().url("URL do link inválida").optional().or(z.literal("")).nullable(),
        bannerType: z.enum(['rotating', 'static_left', 'static_right']).optional(),
        isActive: z.boolean().optional(),
        priority: z.string().optional(),
        backgroundColor: z.string().optional(),
        textColor: z.string().optional(),
        startsAt: z.string().datetime().optional(),
        endsAt: z.string().datetime().optional().nullable(),
      });

      const rawUpdates = bannerSchema.parse(req.body);
      
      // Converter strings para Date se fornecidas
      const updates = {
        ...rawUpdates,
        startsAt: rawUpdates.startsAt ? new Date(rawUpdates.startsAt) : undefined,
        endsAt: rawUpdates.endsAt ? new Date(rawUpdates.endsAt) : undefined,
      };
      
      const banner = await storage.updateBanner(bannerId, updates);
      
      if (!banner) {
        return res.status(404).json({ message: "Banner não encontrado" });
      }
      
      res.json(banner);
    } catch (error) {
      console.error("Error updating banner:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Erro ao atualizar banner" });
    }
  });

  // Deletar banner (Super Admin)
  app.delete('/api/admin/banners/:bannerId', isAuthenticatedCustom, isSuperAdmin, async (req, res) => {
    try {
      const { bannerId } = req.params;
      
      // Verificar se banner existe
      const banner = await storage.getBanner(bannerId);
      if (!banner) {
        return res.status(404).json({ message: "Banner não encontrado" });
      }
      
      await storage.deleteBanner(bannerId);
      res.json({ message: "Banner deletado com sucesso" });
    } catch (error) {
      console.error("Error deleting banner:", error);
      res.status(500).json({ message: "Erro ao deletar banner" });
    }
  });

  // Admin - Get all stores (Super Admin only)
  app.get('/api/admin/stores', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ message: "Acesso negado. Apenas super administradores." });
      }

      const stores = await storage.getAllStores();
      res.json(stores);
    } catch (error) {
      console.error("Error fetching stores:", error);
      res.status(500).json({ message: "Failed to fetch stores" });
    }
  });

  // Admin - Update store (Super Admin only)
  app.put('/api/admin/stores/:id', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ message: "Acesso negado. Apenas super administradores." });
      }

      const { id } = req.params;
      const updateData = req.body;
      const store = await storage.updateStore(id, updateData);
      res.json(store);
    } catch (error) {
      console.error("Error updating store:", error);
      res.status(500).json({ message: "Failed to update store" });
    }
  });

  // Admin - Delete store (Super Admin only)
  app.delete('/api/admin/stores/:id', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ message: "Acesso negado. Apenas super administradores." });
      }

      const { id } = req.params;
      
      // Verificar se a loja existe antes de deletar
      const storeToDelete = await storage.getStore(id);
      if (!storeToDelete) {
        return res.status(404).json({ message: "Loja não encontrada" });
      }
      
      await storage.deleteStore(id, userId, true); // true = isSuperAdmin
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting store:", error);
      res.status(500).json({ message: "Failed to delete store" });
    }
  });

  // Admin - Get all users (Super Admin only)
  app.get('/api/admin/users', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ message: "Acesso negado. Apenas super administradores." });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin - Update user (Super Admin only)
  app.put('/api/admin/users/:id', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ message: "Acesso negado. Apenas super administradores." });
      }

      const { id } = req.params;
      const updateData = req.body;
      const updatedUser = await storage.updateUser(id, updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Admin - Delete user (Super Admin only)
  app.delete('/api/admin/users/:id', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ message: "Acesso negado. Apenas super administradores." });
      }

      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // ==========================================
  // SISTEMA DE RASPADINHA DIÁRIA INTELIGENTE
  // ==========================================

  // Importar serviços necessários
  const { intelligentScratchAlgorithm } = await import('./services/intelligentScratchAlgorithm');

  // Verificar tentativa diária do usuário
  app.get('/api/daily-scratch/attempt', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user?.claims?.sub || req.user?.id;
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Verificar se já tentou hoje
      const [attempt] = await storage.getUserDailyAttempt(userId, today);
      
      res.json({
        canAttempt: !attempt?.hasAttempted,
        hasWon: attempt?.won || false,
        prizeWon: attempt?.prizeWonId ? await storage.getDailyPrize(attempt.prizeWonId) : null,
        lastAttemptDate: attempt?.attemptDate || null,
      });
      
    } catch (error) {
      console.error("Error checking daily attempt:", error);
      res.status(500).json({ message: "Failed to check attempt" });
    }
  });

  // Fazer tentativa diária de raspadinha
  app.post('/api/daily-scratch/attempt', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user?.claims?.sub || req.user?.id;
      const today = new Date().toISOString().split('T')[0];

      // Verificar se já tentou hoje
      const [existingAttempt] = await storage.getUserDailyAttempt(userId, today);
      if (existingAttempt?.hasAttempted) {
        return res.status(400).json({ message: "Já tentou hoje! Volte amanhã." });
      }

      // Buscar configuração do sistema
      const config = await storage.getScratchSystemConfig();
      if (!config) {
        return res.status(500).json({ message: "Sistema não configurado" });
      }

      // Incrementar contador de tentativas
      const currentCount = parseInt(config.currentAttemptCount || "0") + 1;
      const guaranteedWinEvery = parseInt(config.guaranteedWinEvery || "1000");

      // Determinar se ganhou (algoritmo simples por agora)
      const won = currentCount >= guaranteedWinEvery;
      
      let prizeWon = null;
      if (won) {
        // Selecionar prêmio aleatório ativo
        const availablePrizes = await storage.getActiveDailyPrizes();
        if (availablePrizes.length > 0) {
          const randomIndex = Math.floor(Math.random() * availablePrizes.length);
          prizeWon = availablePrizes[randomIndex];
          
          // Atualizar contadores do prêmio
          await storage.incrementPrizeWins(prizeWon.id);
          
          // Resetar contador global
          await storage.updateScratchSystemConfig({ currentAttemptCount: "0" });
        }
      } else {
        // Atualizar contador
        await storage.updateScratchSystemConfig({ currentAttemptCount: currentCount.toString() });
      }

      // Registrar tentativa
      await storage.createUserDailyAttempt({
        userId,
        attemptDate: today,
        hasAttempted: true,
        attemptedAt: new Date(),
        won,
        prizeWonId: prizeWon?.id || null,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
      });

      // Registrar resultado detalhado
      await storage.createDailyScratchResult({
        userId,
        scratchDate: today,
        won,
        prizeId: prizeWon?.id || null,
        prizeType: prizeWon?.prizeType || null,
        prizeDescription: prizeWon?.description || null,
        prizeValue: prizeWon?.discountValue || prizeWon?.maxDiscountAmount || "0",
        couponCode: won ? `DAILY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : null,
        couponExpiresAt: won ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null, // 30 dias
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        won,
        prize: prizeWon,
        message: won 
          ? `🎉 Parabéns! Você ganhou: ${prizeWon?.name}!` 
          : "😔 Não foi dessa vez! Volte amanhã para tentar novamente.",
        nextAttemptIn: "24h",
      });

    } catch (error) {
      console.error("Error processing daily scratch:", error);
      res.status(500).json({ message: "Failed to process attempt" });
    }
  });

  // Teste interno da raspadinha (Super Admin)
  app.post('/api/admin/daily-scratch/test', isAuthenticatedCustom, isSuperAdmin, async (req: any, res) => {
    try {
      // Criar usuário teste simulado para o super admin
      const testUserId = req.session?.user?.id || req.user?.claims?.sub || req.user?.id;
      const today = new Date().toISOString().split('T')[0];

      // Buscar configuração do sistema
      const config = await storage.getScratchSystemConfig();
      if (!config) {
        return res.status(500).json({ message: "Sistema não configurado" });
      }

      // Simular tentativa (sempre ganhar para teste)
      const won = true;
      
      // Selecionar prêmio aleatório ativo
      const availablePrizes = await storage.getActiveDailyPrizes();
      let prizeWon = null;
      
      if (availablePrizes.length > 0) {
        const randomIndex = Math.floor(Math.random() * availablePrizes.length);
        prizeWon = availablePrizes[randomIndex];
        
        res.json({
          success: true,
          won,
          prize: prizeWon,
          message: `🎉 TESTE: Parabéns! Você ganhou: ${prizeWon.name}!`,
          systemStatus: "Sistema operacional",
          availablePrizes: availablePrizes.length,
          configLoaded: true
        });
      } else {
        // Retornar erro específico quando não há prêmios
        res.status(400).json({
          success: false,
          won: false,
          prize: null,
          message: "❌ TESTE FALHOU: Não há prêmios ativos cadastrados",
          systemStatus: "Erro: Sem prêmios disponíveis",
          availablePrizes: 0,
          configLoaded: true,
          error: "NO_PRIZES_AVAILABLE",
          suggestion: "Configure pelo menos um prêmio ativo na seção 'Produtos Selecionados para Raspadinha'"
        });
      }

    } catch (error) {
      console.error("Error testing daily scratch:", error);
      res.status(500).json({ message: "Failed to test system", error: error.message });
    }
  });

  // ==========================================
  // SISTEMA DE 3 CARTAS DIÁRIAS
  // ==========================================

  // Buscar as 3 cartas diárias do usuário
  app.get('/api/daily-scratch/cards', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user?.claims?.sub || req.user?.id;
      
      // Garantir que o usuário tem as 3 cartas para hoje
      const cards = await storage.ensureUserDailyScratchCards(userId);
      
      res.json({
        success: true,
        cards,
        count: cards.length,
      });
      
    } catch (error) {
      console.error("Error fetching daily scratch cards:", error);
      res.status(500).json({ message: "Failed to fetch cards" });
    }
  });

  // Raspar uma carta específica
  app.post('/api/daily-scratch/cards/:cardId/scratch', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user?.claims?.sub || req.user?.id;
      const { cardId } = req.params;
      
      // Verificar se a carta pertence ao usuário e se não foi raspada
      const card = await storage.getDailyScratchCard(cardId);
      if (!card) {
        return res.status(404).json({ message: "Carta não encontrada" });
      }
      
      if (card.userId !== userId) {
        return res.status(403).json({ message: "Carta não pertence ao usuário" });
      }
      
      if (card.isScratched) {
        return res.status(400).json({ message: "Carta já foi raspada" });
      }
      
      // Raspar a carta
      const scratchedCard = await storage.scratchCard(
        cardId, 
        req.get('User-Agent'), 
        req.ip
      );
      
      // Se ganhou, incrementar o contador do prêmio
      if (scratchedCard.won && scratchedCard.prizeId) {
        await storage.incrementPrizeWins(scratchedCard.prizeId);
      }
      
      res.json({
        success: true,
        card: scratchedCard,
        won: scratchedCard.won,
        message: scratchedCard.won 
          ? `🎉 Parabéns! Você ganhou: ${scratchedCard.prizeDescription}!` 
          : "😔 Não foi dessa vez! Tente as outras cartas.",
      });
      
    } catch (error) {
      console.error("Error scratching card:", error);
      res.status(500).json({ message: "Failed to scratch card" });
    }
  });

  // Buscar mensagem engraçada aleatória para cartas perdedoras
  app.get('/api/funny-messages/random', async (req: any, res) => {
    try {
      const message = await storage.getRandomFunnyMessage();
      res.json(message);
    } catch (error) {
      console.error("Error fetching random funny message:", error);
      res.status(500).json({ message: "Failed to fetch funny message" });
    }
  });

  // Estatísticas das cartas do usuário
  app.get('/api/daily-scratch/stats', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id || req.user?.claims?.sub || req.user?.id;
      
      const stats = await storage.getUserScratchCardsStats(userId);
      
      res.json({
        success: true,
        stats,
      });
      
    } catch (error) {
      console.error("Error fetching scratch stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Estatísticas gerais para Super Admin
  app.get('/api/admin/scratch-stats', isSuperAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getScratchStatsForAdmin();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin scratch stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  // Gerar sugestões do algoritmo (Super Admin)
  app.post('/api/admin/algorithm-suggestions/generate', isAuthenticatedCustom, isSuperAdmin, async (req: any, res) => {
    try {
      const suggestions = await intelligentScratchAlgorithm.generateProductSuggestions();
      res.json({ 
        success: true, 
        count: suggestions.length,
        suggestions 
      });
    } catch (error) {
      console.error("Error generating suggestions:", error);
      res.status(500).json({ message: "Failed to generate suggestions" });
    }
  });

  // Listar sugestões pendentes (Super Admin)
  app.get('/api/admin/algorithm-suggestions', isSuperAdmin, async (req: any, res) => {
    try {
      const suggestions = await storage.getAlgorithmSuggestions();
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      res.status(500).json({ message: "Failed to fetch suggestions" });
    }
  });

  // Revisar sugestão (Super Admin)
  app.put('/api/admin/algorithm-suggestions/:id', isSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, reviewNotes } = req.body;
      const userId = req.session?.user?.id || req.user?.claims?.sub || req.user?.id;

      const updatedSuggestion = await storage.updateAlgorithmSuggestion(id, {
        status,
        reviewNotes,
        reviewedByUserId: userId,
        reviewedAt: new Date(),
      });

      res.json(updatedSuggestion);
    } catch (error) {
      console.error("Error updating suggestion:", error);
      res.status(500).json({ message: "Failed to update suggestion" });
    }
  });

  // Listar prêmios diários (Super Admin)
  app.get('/api/admin/daily-prizes', isSuperAdmin, async (req: any, res) => {
    try {
      const prizes = await storage.getDailyPrizes();
      res.json(prizes);
    } catch (error) {
      console.error("Error fetching daily prizes:", error);
      res.status(500).json({ message: "Failed to fetch prizes" });
    }
  });

  // Criar prêmio diário (Super Admin)
  app.post('/api/admin/daily-prizes', isSuperAdmin, async (req: any, res) => {
    try {
      const prizeData = req.body;
      const newPrize = await storage.createDailyPrize(prizeData);
      res.status(201).json(newPrize);
    } catch (error) {
      console.error("Error creating daily prize:", error);
      res.status(500).json({ message: "Failed to create prize" });
    }
  });

  // Atualizar prêmio diário (Super Admin)
  app.put('/api/admin/daily-prizes/:id', isSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const prizeData = req.body;
      const updatedPrize = await storage.updateDailyPrize(id, prizeData);
      res.json(updatedPrize);
    } catch (error) {
      console.error("Error updating daily prize:", error);
      res.status(500).json({ message: "Failed to update prize" });
    }
  });

  // Buscar produtos disponíveis para prêmios (Super Admin)
  app.get('/api/admin/products-for-prizes', isSuperAdmin, async (req: any, res) => {
    try {
      const products = await storage.getAvailableProductsForPrizes();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products for prizes:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Buscar estatísticas de orçamento (Super Admin)
  app.get('/api/admin/budget-stats', isSuperAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getBudgetStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching budget stats:", error);
      res.status(500).json({ message: "Failed to fetch budget stats" });
    }
  });

  // Buscar configuração do sistema (Super Admin)
  app.get('/api/admin/scratch-config', isSuperAdmin, async (req: any, res) => {
    try {
      const config = await storage.getScratchSystemConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching scratch config:", error);
      res.status(500).json({ message: "Failed to fetch config" });
    }
  });

  // Atualizar configuração do sistema (Super Admin)
  app.put('/api/admin/scratch-config', isSuperAdmin, async (req: any, res) => {
    try {
      console.log('🔧 PUT /api/admin/scratch-config - Dados recebidos:', JSON.stringify(req.body, null, 2));
      
      const configData = req.body;
      
      // Validação básica dos dados
      if (!configData || typeof configData !== 'object') {
        console.log('❌ Dados inválidos recebidos');
        return res.status(400).json({ message: "Dados de configuração inválidos" });
      }

      console.log('✅ Chamando storage.updateScratchSystemConfig...');
      const updatedConfig = await storage.updateScratchSystemConfig(configData);
      console.log('✅ Configuração atualizada com sucesso:', updatedConfig.id);
      
      res.json(updatedConfig);
    } catch (error) {
      console.error("❌ Error updating scratch config:", error);
      console.error("❌ Stack trace:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        message: "Failed to update config", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // ==========================================
  // SISTEMA DE ORÇAMENTO E CONTROLE DE CUSTOS
  // ==========================================

  // Buscar configuração de orçamento (Super Admin)
  app.get('/api/admin/budget-config', isSuperAdmin, async (req: any, res) => {
    try {
      const budgetConfig = await storage.getBudgetConfig();
      res.json(budgetConfig);
    } catch (error) {
      console.error("Error fetching budget config:", error);
      res.status(500).json({ message: "Failed to fetch budget config" });
    }
  });

  // Atualizar configuração de orçamento (Super Admin)
  app.put('/api/admin/budget-config', isSuperAdmin, async (req: any, res) => {
    try {
      const budgetData = insertBudgetConfigSchema.parse(req.body);
      const updatedBudget = await storage.updateBudgetConfig(budgetData);
      res.json(updatedBudget);
    } catch (error) {
      console.error("Error updating budget config:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid budget data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update budget config" });
    }
  });

  // Buscar estatísticas de orçamento e cálculos de custos (Super Admin)
  app.get('/api/admin/budget-stats', isSuperAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getBudgetStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching budget stats:", error);
      res.status(500).json({ message: "Failed to fetch budget stats" });
    }
  });

  // Buscar produtos disponíveis para prêmios (Super Admin)
  app.get('/api/admin/available-products', isSuperAdmin, async (req: any, res) => {
    try {
      const products = await storage.getAvailableProductsForPrizes();
      res.json(products);
    } catch (error) {
      console.error("Error fetching available products:", error);
      res.status(500).json({ message: "Failed to fetch available products" });
    }
  });

  // ==========================================
  // SISTEMA DE BUSCA DE PREÇOS COM APIFY
  // ==========================================

  // Teste de conectividade com Apify
  app.get('/api/apify/test', async (req: any, res) => {
    try {
      const result = await apifyService.testConnection();
      res.json(result);
    } catch (error) {
      console.error("Error testing Apify connection:", error);
      res.status(500).json({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    }
  });

  // Endpoint de teste para o novo sistema de filtros
  app.get('/api/test-filters', async (req: any, res) => {
    try {
      const { product } = req.query;
      if (!product) {
        return res.status(400).json({ message: "Parâmetro 'product' é obrigatório" });
      }

      console.log(`🧪 TESTE DE FILTROS: Buscando ${product}`);
      
      // Importar a nova função de scraping
      const { scrapeBrazilianPricesNew } = await import('./new-price-scraper');
      
      // Testar o sistema de filtros
      const results = await scrapeBrazilianPricesNew(product as string);
      
      res.json({
        success: true,
        productSearched: product,
        resultsFound: results.length,
        results: results.map(result => ({
          productName: result.productName,
          storeName: result.storeName,
          price: result.price,
          currency: result.currency
        }))
      });
    } catch (error) {
      console.error('Erro no teste de filtros:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao testar filtros',
        error: (error as Error).message
      });
    }
  });

  // Buscar preços na Amazon
  app.get('/api/apify/search/amazon', async (req: any, res) => {
    try {
      const { q: searchQuery, maxItems = 5 } = req.query;
      
      if (!searchQuery) {
        return res.status(400).json({ message: "Parâmetro 'q' (busca) é obrigatório" });
      }

      const results = await apifyService.searchAmazonPrices({
        searchQuery: searchQuery as string,
        maxItems: parseInt(maxItems as string) || 5
      });

      res.json({
        success: true,
        source: 'Amazon',
        query: searchQuery,
        totalResults: results.length,
        results
      });

    } catch (error) {
      console.error("Error searching Amazon prices:", error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'Erro na busca Amazon' 
      });
    }
  });

  // Buscar preços no Google Shopping
  app.get('/api/apify/search/google', async (req: any, res) => {
    try {
      const { q: searchQuery, maxItems = 5, country = 'US' } = req.query;
      
      if (!searchQuery) {
        return res.status(400).json({ message: "Parâmetro 'q' (busca) é obrigatório" });
      }

      const results = await apifyService.searchGoogleShopping({
        searchQuery: searchQuery as string,
        maxItems: parseInt(maxItems as string) || 5,
        country: country as string
      });

      res.json({
        success: true,
        source: 'Google Shopping',
        query: searchQuery,
        totalResults: results.length,
        results
      });

    } catch (error) {
      console.error("Error searching Google Shopping prices:", error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'Erro na busca Google Shopping' 
      });
    }
  });

  // Buscar preços no eBay
  app.get('/api/apify/search/ebay', async (req: any, res) => {
    try {
      const { q: searchQuery, maxItems = 5 } = req.query;
      
      if (!searchQuery) {
        return res.status(400).json({ message: "Parâmetro 'q' (busca) é obrigatório" });
      }

      const results = await apifyService.searchEbayPrices({
        searchQuery: searchQuery as string,
        maxItems: parseInt(maxItems as string) || 5
      });

      res.json({
        success: true,
        source: 'eBay',
        query: searchQuery,
        totalResults: results.length,
        results
      });

    } catch (error) {
      console.error("Error searching eBay prices:", error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'Erro na busca eBay' 
      });
    }
  });

  // Busca combinada em todas as fontes
  app.get('/api/apify/search/all', async (req: any, res) => {
    try {
      const { q: searchQuery, maxItems = 5, country = 'US' } = req.query;
      
      if (!searchQuery) {
        return res.status(400).json({ message: "Parâmetro 'q' (busca) é obrigatório" });
      }

      console.log(`🔍 Iniciando busca combinada para: "${searchQuery}"`);
      
      const results = await apifyService.searchMultipleSources({
        searchQuery: searchQuery as string,
        maxItems: parseInt(maxItems as string) || 5,
        country: country as string
      });

      res.json({
        success: true,
        query: searchQuery,
        ...results
      });

    } catch (error) {
      console.error("Error in combined search:", error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'Erro na busca combinada' 
      });
    }
  });

  // Listar scrapers disponíveis na loja Apify
  app.get('/api/apify/scrapers', async (req: any, res) => {
    try {
      const scrapers = await apifyService.getAvailableScrapers();
      res.json({
        success: true,
        totalScrapers: scrapers.length,
        scrapers
      });
    } catch (error) {
      console.error("Error listing Apify scrapers:", error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao listar scrapers' 
      });
    }
  });

  // ==========================================
  // SISTEMA DE MODO MANUTENÇÃO
  // ==========================================

  // API routes para modo manutenção with cache
  app.get('/api/maintenance/status', async (req, res) => {
    try {
      const cacheKey = 'maintenance-status';
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      const maintenanceStatus = await storage.getMaintenanceStatus();
      // Cache por 60s
      cache.set(cacheKey, maintenanceStatus, 60000);
      res.json(maintenanceStatus);
    } catch (error) {
      console.error("Erro ao buscar status de manutenção:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post('/api/maintenance/verify-access', async (req, res) => {
    try {
      const { password } = req.body;
      const maintenanceStatus = await storage.getMaintenanceStatus();
      
      if (password === maintenanceStatus?.accessPassword) {
        res.json({ success: true });
      } else {
        res.status(401).json({ success: false });
      }
    } catch (error) {
      console.error("Erro ao verificar senha de acesso:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Middleware simples para manutenção
  function requireSuperAdmin(req: any, res: any, next: any) {
    console.log('🔧 requireSuperAdmin - verificando sessão...', {
      hasSession: !!req.session,
      hasUser: !!req.session?.user,
      user: req.session?.user ? { id: req.session.user.id, isSuperAdmin: req.session.user.isSuperAdmin } : null
    });
    
    const user = req.session?.user;
    if (!user) return res.status(401).json({ error: 'not_authenticated' });
    if (!user.isSuperAdmin) return res.status(403).json({ error: 'forbidden' });
    req.user = user; // Disponibilizar user na req
    return next();
  }

  app.post('/api/maintenance/toggle', requireSuperAdmin, async (req: any, res) => {
    try {
      const { isActive } = req.body;
      
      await storage.updateMaintenanceMode({
        isActive,
        updatedBy: req.user.id
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao atualizar modo manutenção:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post('/api/maintenance/config', requireSuperAdmin, async (req: any, res) => {
    try {
      const { title, message, accessPassword } = req.body;
      
      await storage.updateMaintenanceMode({
        title,
        message,
        accessPassword,
        updatedBy: req.user.id
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao atualizar configurações de manutenção:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ========================================== 
  // NOVAS ROTAS DE ANALYTICS EXPANDIDO
  // ==========================================

  // Buscar produtos em tendência globalmente (acessível para lojistas)
  app.get('/api/analytics/global-trending', isAuthenticated, async (req: any, res) => {
    try {
      const { days = '7' } = req.query;
      const trending = await storage.getTrendingProducts(parseInt(days as string));
      
      // Mapear para o formato esperado pelo frontend
      const formattedTrending = trending.map(item => ({
        productId: item.id, // Usar id em vez de productId que não existe
        productName: item.productName,
        searchCount: parseInt(item.searchCount || '0'),
        viewCount: parseInt(item.viewCount || '0'),
        category: item.category || 'Categoria não informada',
        imageUrl: '/placeholder-product.png', // Placeholder até termos imageUrl real
        storeId: 'global', // Placeholder até termos storeId real
        storeName: 'Loja não informada'
      }));
      
      res.json(formattedTrending.slice(0, 10)); // Top 10
    } catch (error) {
      console.error('Error getting global trending products:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar produtos em tendência' });
    }
  });

  // Buscar artes geradas automaticamente
  app.get('/api/analytics/generated-arts', isAuthenticated, async (req: any, res) => {
    try {
      const artes = await storage.getGeneratedTotemArts('global-trends');
      
      // Mapear para o formato esperado pelo frontend
      const formattedArts = artes.map(art => ({
        id: art.id,
        imageUrl: art.imageUrl,
        prompt: art.imagePrompt || 'Prompt não disponível',
        isActive: art.isActive,
        generationDate: art.generationDate,
        trendingProducts: art.trendingProductsData ? JSON.parse(art.trendingProductsData as string) : [],
        tag: 'global-trends'
      }));
      
      res.json(formattedArts);
    } catch (error) {
      console.error('Error getting generated arts:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar artes geradas' });
    }
  });

  // Ativar/desativar arte gerada
  app.patch('/api/totem/generated-arts/:artId/toggle', isAuthenticated, async (req: any, res) => {
    try {
      const { artId } = req.params;
      const { isActive } = req.body;
      
      await storage.updateGeneratedTotemArt(artId, { isActive });
      
      res.json({ 
        success: true, 
        message: isActive ? 'Arte ativada com sucesso' : 'Arte desativada com sucesso' 
      });
    } catch (error) {
      console.error('Error toggling generated art:', error);
      res.status(500).json({ success: false, message: 'Erro ao atualizar status da arte' });
    }
  });

  // ==========================================
  // SISTEMA DE ANALYTICS (METADADOS ANÔNIMOS)
  // ==========================================

  // Criar sessão anônima
  app.post('/api/analytics/session', async (req, res) => {
    try {
      const sessionData = req.body;
      const session = await storage.createUserSession(sessionData);
      res.json({ success: true, session });
    } catch (error) {
      console.debug('Analytics session error:', error);
      res.status(500).json({ success: false });
    }
  });

  // Atualizar sessão anônima
  app.post('/api/analytics/session/update', async (req, res) => {
    try {
      const { sessionToken, ...updates } = req.body;
      await storage.updateUserSession(sessionToken, updates);
      res.json({ success: true });
    } catch (error) {
      console.debug('Analytics session update error:', error);
      res.status(500).json({ success: false });
    }
  });

  // Registrar busca de produto
  app.post('/api/analytics/search', async (req, res) => {
    try {
      const searchData = {
        sessionToken: req.body.sessionToken || 'anonymous',
        searchTerm: req.body.searchTerm || req.body.query || '',
        category: req.body.category || null,
        storeId: req.body.storeId || null,
        resultsCount: req.body.resultsCount ? String(req.body.resultsCount) : null,
        position: req.body.position ? Number(req.body.position) : null,
        query: req.body.query || req.body.searchTerm || '',
        extra: req.body.extra || null,
      };
      const search = await storage.createProductSearch(searchData);
      res.json({ success: true, search });
    } catch (error) {
      console.debug('Analytics search error:', error);
      res.status(500).json({ success: false });
    }
  });

  // Registrar visualização de produto
  app.post('/api/analytics/view', async (req, res) => {
    try {
      const viewData = req.body;
      const view = await storage.createProductView(viewData);
      res.json({ success: true, view });
    } catch (error) {
      console.debug('Analytics view error:', error);
      res.status(500).json({ success: false });
    }
  });

  // Registrar clique em produto (desde busca)
  app.post('/api/analytics/search/click', async (req, res) => {
    try {
      const { sessionToken, productId, searchTerm } = req.body;
      await storage.updateProductSearchClick(sessionToken, productId, searchTerm);
      res.json({ success: true });
    } catch (error) {
      console.debug('Analytics click error:', error);
      res.status(500).json({ success: false });
    }
  });

  // Registrar ação de produto (save/compare)
  app.post('/api/analytics/save', async (req, res) => {
    try {
      const { sessionToken, productId } = req.body;
      await storage.updateProductViewAction(sessionToken, productId, 'save');
      res.json({ success: true });
    } catch (error) {
      console.debug('Analytics save error:', error);
      res.status(500).json({ success: false });
    }
  });

  app.post('/api/analytics/compare', async (req, res) => {
    try {
      const { sessionToken, productId } = req.body;
      await storage.updateProductViewAction(sessionToken, productId, 'compare');
      res.json({ success: true });
    } catch (error) {
      console.debug('Analytics compare error:', error);
      res.status(500).json({ success: false });
    }
  });

  // Obter produtos em tendência (para admin)
  app.get('/api/analytics/trending', isSuperAdmin, async (req, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const trending = await storage.getTrendingProducts(days);
      res.json({ success: true, trending });
    } catch (error) {
      console.error('Error getting trending products:', error);
      res.status(500).json({ success: false });
    }
  });

  // Gerar produtos em tendência (job diário)
  app.post('/api/analytics/trending/generate', isSuperAdmin, async (req, res) => {
    try {
      const { date } = req.body;
      const targetDate = date ? new Date(date) : new Date();
      const trending = await storage.generateTrendingProducts(targetDate);
      res.json({ success: true, trending });
    } catch (error) {
      console.error('Error generating trending products:', error);
      res.status(500).json({ success: false });
    }
  });

  // =============================================
  // ANALYTICS REPORTS - ENDPOINTS PARA DASHBOARD
  // =============================================

  // Relatório geral de analytics (para lojistas e super admins)
  app.get('/api/analytics/reports/overview', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { period = '7d', storeId } = req.query;
      const user = req.user || req.session?.user;
      
      // Para lojistas normais, filtrar apenas sua loja
      let targetStoreId = storeId;
      if (!user?.isSuperAdmin && user?.storeId) {
        targetStoreId = user.storeId;
      }

      const analyticsData = await storage.getAnalyticsOverview(period, targetStoreId);
      res.json(analyticsData);
    } catch (error) {
      console.error('Error getting analytics overview:', error);
      res.status(500).json({ message: 'Failed to get analytics overview' });
    }
  });

  // Top produtos por visualizações
  app.get('/api/analytics/reports/products', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { period = '7d', storeId, limit = '10' } = req.query;
      const user = req.user || req.session?.user;
      
      let targetStoreId = storeId;
      if (!user?.isSuperAdmin && user?.storeId) {
        targetStoreId = user.storeId;
      }

      const products = await storage.getTopProductsByViews(period, targetStoreId, parseInt(limit));
      res.json({ products });
    } catch (error) {
      console.error('Error getting top products:', error);
      res.status(500).json({ message: 'Failed to get top products' });
    }
  });

  // Top buscas por frequência
  app.get('/api/analytics/reports/searches', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { period = '7d', storeId, limit = '10' } = req.query;
      const user = req.user || req.session?.user;
      
      let targetStoreId = storeId;
      if (!user?.isSuperAdmin && user?.storeId) {
        targetStoreId = user.storeId;
      }

      const searches = await storage.getTopSearchTerms(period, targetStoreId, parseInt(limit));
      res.json({ searches });
    } catch (error) {
      console.error('Error getting top searches:', error);
      res.status(500).json({ message: 'Failed to get top searches' });
    }
  });

  // Performance de banners
  app.get('/api/analytics/reports/banners', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { period = '7d', storeId } = req.query;
      const user = req.user || req.session?.user;
      
      let targetStoreId = storeId;
      if (!user?.isSuperAdmin && user?.storeId) {
        targetStoreId = user.storeId;
      }

      const banners = await storage.getBannerMetrics(period, targetStoreId);
      res.json({ banners });
    } catch (error) {
      console.error('Error getting banner metrics:', error);
      res.status(500).json({ message: 'Failed to get banner metrics' });
    }
  });

  // Fontes de tráfego UTM
  app.get('/api/analytics/reports/traffic', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { period = '7d', storeId } = req.query;
      const user = req.user || req.session?.user;
      
      let targetStoreId = storeId;
      if (!user?.isSuperAdmin && user?.storeId) {
        targetStoreId = user.storeId;
      }

      const traffic = await storage.getTrafficSources(period, targetStoreId);
      res.json({ traffic });
    } catch (error) {
      console.error('Error getting traffic sources:', error);
      res.status(500).json({ message: 'Failed to get traffic sources' });
    }
  });

  // =============================================
  // SUPER ADMIN ANALYTICS - VISÃO GLOBAL
  // =============================================

  // Analytics globais agregados de todas as lojas (para Super Admin)
  app.get('/api/super-admin/analytics/global-overview', isSuperAdmin, async (req: any, res) => {
    try {
      // Verificar se é super admin
      const user = req.user || req.session?.user;
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ error: 'Acesso negado. Requer privilégios de Super Admin.' });
      }

      const { days = '7' } = req.query;
      const daysNum = parseInt(days as string);

      // Buscar TODAS as lojas da plataforma
      const allStores = await storage.getAllStores();
      
      // Agregar analytics de TODAS as lojas
      let globalAnalytics = {
        storyViews: 0,
        flyerViews: 0,
        productLikes: 0,
        productsSaved: 0,
        totalStores: allStores.length,
        totalProducts: 0,
        totalSessions: 0,
        totalSearches: 0
      };

      // Calcular produtos totais
      for (const store of allStores) {
        const products = await storage.getProductsByStoreId(store.id);
        globalAnalytics.totalProducts += products.length;

        // Somar analytics da loja
        const storeAnalytics = await storage.getStoreAnalytics(store.id, daysNum);
        globalAnalytics.storyViews += storeAnalytics.storyViews;
        globalAnalytics.flyerViews += storeAnalytics.flyerViews;
        globalAnalytics.productLikes += storeAnalytics.productLikes;
        globalAnalytics.productsSaved += storeAnalytics.productsSaved;
      }

      // Obter estatísticas de sessões anônimas
      const sessionStats = await storage.getGlobalSessionStats(daysNum);
      globalAnalytics.totalSessions = sessionStats.totalSessions || 0;
      globalAnalytics.totalSearches = sessionStats.totalSearches || 0;

      res.json(globalAnalytics);
    } catch (error) {
      console.error('Error fetching super admin global analytics:', error);
      res.status(500).json({ error: 'Erro ao buscar analytics globais' });
    }
  });

  // Analytics detalhados por loja (para Super Admin)  
  app.get('/api/super-admin/analytics/stores-detail', isSuperAdmin, async (req: any, res) => {
    try {
      // Verificar se é super admin
      const user = req.user || req.session?.user;
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ error: 'Acesso negado. Requer privilégios de Super Admin.' });
      }

      const { days = '7' } = req.query;
      const daysNum = parseInt(days as string);

      // Buscar TODAS as lojas
      const allStores = await storage.getAllStores();
      
      // Obter analytics detalhados de cada loja
      const storesAnalytics = [];
      
      for (const store of allStores) {
        const storeAnalytics = await storage.getStoreAnalytics(store.id, daysNum);
        const products = await storage.getProductsByStoreId(store.id);
        
        storesAnalytics.push({
          storeId: store.id,
          storeName: store.name,
          storeImage: store.imageUrl || '/placeholder-store.png',
          isActive: store.isActive,
          totalProducts: products.length,
          analytics: storeAnalytics
        });
      }

      // Ordenar por engajamento total (views + likes + saves)
      storesAnalytics.sort((a, b) => {
        const engagementA = a.analytics.storyViews + a.analytics.flyerViews + a.analytics.productLikes + a.analytics.productsSaved;
        const engagementB = b.analytics.storyViews + b.analytics.flyerViews + b.analytics.productLikes + b.analytics.productsSaved;
        return engagementB - engagementA;
      });

      res.json(storesAnalytics);
    } catch (error) {
      console.error('Error fetching stores detail analytics:', error);
      res.status(500).json({ error: 'Erro ao buscar detalhes das lojas' });
    }
  });

  // Gestão completa de artes IA (para Super Admin)
  app.get('/api/super-admin/generated-arts/manage', isSuperAdmin, async (req: any, res) => {
    try {
      // Verificar se é super admin
      const user = req.user || req.session?.user;
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ error: 'Acesso negado. Requer privilégios de Super Admin.' });
      }

      // Buscar TODAS as artes geradas
      const allArts = await storage.getAllGeneratedTotemArts();
      
      // Formatá-las com informações completas
      const formattedArts = allArts.map(art => {
        let trendingProducts = [];
        if (art.trendingProductsData) {
          try {
            // Verificar se é string antes de fazer replace
            let cleanData = art.trendingProductsData;
            if (typeof cleanData === 'string') {
              // Remove aspas triplas e escapes excessivos
              cleanData = cleanData.replace(/^"{1,3}|"{1,3}$/g, '');
              cleanData = cleanData.replace(/\\"/g, '"');
              trendingProducts = JSON.parse(cleanData);
            } else {
              // Se já é objeto, usar diretamente
              trendingProducts = cleanData;
            }
          } catch (e) {
            console.warn('Erro ao parsear trending products:', e);
            trendingProducts = [];
          }
        }
        
        return {
          id: art.id,
          imageUrl: art.imageUrl,
          prompt: art.imagePrompt || 'Prompt não disponível',
          isActive: art.isActive,
          generationDate: art.generationDate,
          trendingProducts,
          tag: 'global-trends',
          storeId: art.storeId || null,
          storeName: 'Global' // Não temos storeName diretamente
        };
      });

      // Ordenar por data de criação (mais recentes primeiro)
      formattedArts.sort((a, b) => new Date(b.generationDate).getTime() - new Date(a.generationDate).getTime());

      res.json(formattedArts);
    } catch (error) {
      console.error('Error fetching all generated arts:', error);
      res.status(500).json({ error: 'Erro ao buscar artes geradas' });
    }
  });

  // Excluir arte IA (para Super Admin)
  app.delete('/api/super-admin/generated-arts/:artId', isSuperAdmin, async (req: any, res) => {
    try {
      // Verificar se é super admin
      const user = req.user || req.session?.user;
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ error: 'Acesso negado. Requer privilégios de Super Admin.' });
      }

      const { artId } = req.params;
      
      await storage.deleteGeneratedTotemArt(artId);
      
      res.json({ 
        success: true, 
        message: 'Arte excluída com sucesso' 
      });
    } catch (error) {
      console.error('Error deleting generated art:', error);
      res.status(500).json({ error: 'Erro ao excluir arte gerada' });
    }
  });

  // Forçar geração de nova arte (para Super Admin)
  app.post('/api/super-admin/generated-arts/force-generate', isSuperAdmin, async (req: any, res) => {
    try {
      // Verificar se é super admin
      const user = req.user || req.session?.user;
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ error: 'Acesso negado. Requer privilégios de Super Admin.' });
      }

      // Forçar geração de nova arte
      await storage.generateTrendingProducts(new Date());
      
      res.json({ 
        success: true, 
        message: 'Nova arte será gerada em instantes baseada nos produtos em tendência' 
      });
    } catch (error) {
      console.error('Error force generating art:', error);
      res.status(500).json({ error: 'Erro ao forçar geração de arte' });
    }
  });

  // Buscar TODOS os produtos (para Super Admin - Teste IA)
  app.get('/api/super-admin/all-products', isSuperAdmin, async (req: any, res) => {
    try {
      // Verificar se é super admin
      const user = req.user || req.session?.user;
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ error: 'Acesso negado. Requer privilégios de Super Admin.' });
      }

      // Buscar todos os produtos com informações das lojas
      const products = await storage.getAllProducts();
      
      // Buscar informações das lojas para enrichment
      const allStores = await storage.getAllStores();
      const storeMap = new Map(allStores.map(store => [store.id, store]));
      
      // Enrichar produtos com dados da loja
      const enrichedProducts = products.map(product => {
        const store = storeMap.get(product.storeId);
        return {
          ...product,
          storeName: store?.name || 'Loja não encontrada',
          storeLogoUrl: store?.logoUrl || null,
          storeIsActive: store?.isActive || false
        };
      });
      
      res.json(enrichedProducts);
    } catch (error) {
      console.error('Error getting all products:', error);
      res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
  });

  // ========== NOVA FUNCIONALIDADE: TOTEMS DE PRODUTOS ==========

  // Gerar totem de produto específico (para Lojas)
  app.post('/api/stores/:storeId/products/:productId/generate-totem', isAuthenticated, async (req: any, res) => {
    try {
      const { storeId, productId } = req.params;
      const userId = getUserId(req);
      
      // Verificar propriedade da loja
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      const isOwner = await verifyStoreOwnership(storeId, userId);
      if (!isOwner) {
        return res.status(403).json({ error: 'Acesso negado. Você só pode gerar totems para sua própria loja.' });
      }

      // Buscar produto e loja
      const product = await storage.getProductById(productId);
      if (!product || product.storeId !== storeId) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      const store = await storage.getStore(storeId);
      if (!store) {
        return res.status(404).json({ error: 'Loja não encontrada' });
      }

      // Gerar nome único para o arquivo do totem
      const timestamp = Date.now();
      const outputPath = `./uploads/totem/totem_${productId}_${timestamp}.png`;
      
      // Usar a nova função de composição de totem
      const { composeProductTotem } = await import('../gemini.js');
      await composeProductTotem(
        {
          id: product.id,
          name: product.name,
          price: parseFloat(product.price?.toString().replace(',', '.') || '0') || 0,
          imageUrl: product.imageUrl || undefined,
          category: product.category || undefined,
          description: product.description || undefined,
        },
        {
          name: store.name,
          themeColor: store.themeColor || undefined,
          currency: store.currency || undefined,
        },
        outputPath
      );

      const totemUrl = `/uploads/totem/totem_${productId}_${timestamp}.png`;
      
      res.json({
        success: true,
        totemUrl,
        productName: product.name,
        storeName: store.name
      });
      
    } catch (error) {
      console.error('Erro ao gerar totem:', error);
      res.status(500).json({ error: 'Erro interno do servidor ao gerar totem' });
    }
  });

  // Listar produtos marcados para totem
  app.get('/api/stores/:storeId/totem-products', isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { storeId } = req.params;
      const userId = getUserId(req);
      
      // Verificar propriedade da loja
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      const isOwner = await verifyStoreOwnership(storeId, userId);
      if (!isOwner) {
        return res.status(403).json({ error: 'Acesso negado. Você só pode acessar produtos de sua própria loja.' });
      }

      // Buscar produtos marcados para totem
      const allProducts = await storage.getStoreProducts(storeId);
      const totemProducts = allProducts.filter(product => product.showInTotem && product.isActive);
      
      res.json(totemProducts);
      
    } catch (error) {
      console.error('Erro ao buscar produtos para totem:', error);
      res.status(500).json({ error: 'Erro ao buscar produtos para totem' });
    }
  });

  // =================================
  // SUPER ADMIN CATEGORIES ROUTES
  // =================================

  // Listar todas as categorias (Super Admin)
  app.get('/api/super-admin/categories', isSuperAdmin, async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Erro ao buscar categorias" });
    }
  });

  // Criar nova categoria (Super Admin)
  app.post('/api/super-admin/categories', isSuperAdmin, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error: any) {
      console.error("Error creating category:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else if (error?.message?.includes('UNIQUE constraint failed') || error?.code === 'SQLITE_CONSTRAINT_UNIQUE' || error?.message?.includes('duplicate key')) {
        res.status(409).json({ message: "Já existe uma categoria com este slug" });
      } else {
        res.status(500).json({ message: "Erro ao criar categoria" });
      }
    }
  });

  // Atualizar categoria (Super Admin)
  app.put('/api/super-admin/categories/:id', isSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const categoryData = updateCategorySchema.parse(req.body);
      
      // Verificar se categoria existe
      const existingCategory = await storage.getCategoryById(id);
      if (!existingCategory) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }
      
      const category = await storage.updateCategory(id, categoryData);
      res.json(category);
    } catch (error: any) {
      console.error("Error updating category:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else if (error?.message?.includes('UNIQUE constraint failed') || error?.code === 'SQLITE_CONSTRAINT_UNIQUE' || error?.message?.includes('duplicate key')) {
        res.status(409).json({ message: "Já existe uma categoria com este slug" });
      } else {
        res.status(500).json({ message: "Erro ao atualizar categoria" });
      }
    }
  });

  // Excluir categoria (Super Admin)
  app.delete('/api/super-admin/categories/:id', isSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar se categoria existe
      const existingCategory = await storage.getCategoryById(id);
      if (!existingCategory) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }
      
      await storage.deleteCategory(id);
      res.json({ success: true, message: "Categoria excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Erro ao excluir categoria" });
    }
  });

  // Alternar status ativo/inativo da categoria (Super Admin)
  app.patch('/api/super-admin/categories/:id/toggle', isSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const category = await storage.toggleCategoryStatus(id);
      res.json(category);
    } catch (error: any) {
      console.error("Error toggling category status:", error);
      if (error?.message === 'Category not found') {
        res.status(404).json({ message: "Categoria não encontrada" });
      } else {
        res.status(500).json({ message: "Erro ao alterar status da categoria" });
      }
    }
  });

  // =================================
  // SUPER ADMIN PRODUCT BANKS ROUTES
  // =================================

  // Configurar multer para upload de ZIP
  const zipUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = './uploads/product-banks/';
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        // Preservar nome original para extrair categoria
        (req as any).originalZipName = file.originalname;
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.zip`;
        cb(null, uniqueName);
      }
    }),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB máximo
    fileFilter: (req: any, file: any, cb: any) => {
      if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
        cb(null, true);
      } else {
        cb(new Error('Apenas arquivos ZIP são permitidos'));
      }
    }
  }).single('zipFile');

  // Listar todos os bancos de produtos (Super Admin)
  app.get('/api/super-admin/product-banks', isSuperAdmin, async (req, res) => {
    try {
      const banks = await storage.getAllProductBanks();
      res.json(banks);
    } catch (error) {
      console.error("Error fetching product banks:", error);
      res.status(500).json({ message: "Erro ao buscar bancos de produtos" });
    }
  });

  // Obter banco específico com itens (Super Admin)
  app.get('/api/super-admin/product-banks/:id', isSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const bank = await storage.getProductBankById(id);
      
      if (!bank) {
        return res.status(404).json({ message: "Banco de produtos não encontrado" });
      }

      res.json(bank);
    } catch (error) {
      console.error("Error fetching product bank:", error);
      res.status(500).json({ message: "Erro ao buscar banco de produtos" });
    }
  });

  // Upload de ZIP com produtos (Super Admin)
  app.post('/api/super-admin/product-banks/upload', isSuperAdmin, async (req: any, res) => {
    try {
      zipUpload(req, res, async (err: any) => {
        if (err) {
          console.error('ZIP upload error:', err);
          return res.status(400).json({ 
            success: false, 
            message: err.message || 'Erro no upload do arquivo ZIP' 
          });
        }

        if (!req.file) {
          return res.status(400).json({ 
            success: false, 
            message: 'Nenhum arquivo ZIP foi enviado' 
          });
        }

        const { name, description } = req.body;
        if (!name || name.trim() === '') {
          return res.status(400).json({
            success: false,
            message: 'Nome do banco é obrigatório'
          });
        }

        // Obter usuário atual
        const user = req.session?.user || req.user;
        if (!user || !user.id) {
          return res.status(401).json({ message: "Usuário não autenticado" });
        }

        const zipPath = req.file.path;
        const zipFileName = req.file.filename;
        const originalZipName = (req as any).originalZipName;

        // Função auxiliar para extrair e garantir categoria do nome do ZIP
        async function ensureCategoryFromZipName(zipFileName: string): Promise<string> {
          // Extrair nome da categoria: "Acessorios Gamers.zip" → "Acessórios Gamers"
          let categoryName = zipFileName.replace(/\.zip$/i, '').trim();
          
          if (!categoryName) {
            return 'Produtos'; // Fallback para categoria padrão
          }
          
          // Normalizar o nome da categoria
          categoryName = categoryName
            .replace(/[-_]/g, ' ') // Converte - e _ para espaços
            .replace(/\s+/g, ' ') // Remove espaços duplos
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' '); // Capitaliza cada palavra
          
          // Verificar se categoria já existe (busca case-insensitive)
          const allCategories = await storage.getAllCategories();
          const existingCategory = allCategories.find(cat => 
            cat.name.toLowerCase() === categoryName.toLowerCase()
          );
          
          if (existingCategory) {
            console.log(`📂 Categoria existente encontrada: ${existingCategory.name}`);
            return existingCategory.name; // Retorna o nome exato da categoria existente
          }
          
          // Criar nova categoria
          console.log(`📂 Criando nova categoria: ${categoryName}`);
          const slug = categoryName.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
            .replace(/\s+/g, '-') // Substitui espaços por hífens
            .replace(/^-+|-+$/g, ''); // Remove hífens do início/fim
          
          await storage.createCategory({
            name: categoryName,
            slug: slug || 'categoria',
            isActive: true,
            sortOrder: 0
          });
          
          return categoryName;
        }

        try {
          // Extrair categoria do nome do arquivo ZIP
          console.log(`🔍 Iniciando extração de categoria do ZIP. originalZipName: "${originalZipName}", zipFileName: "${zipFileName}"`);
          const categoryFromZip = await ensureCategoryFromZipName(originalZipName || zipFileName);
          console.log(`📂 Categoria final do ZIP: "${categoryFromZip}"`);
          
          // Processar o ZIP
          const zip = new AdmZip(zipPath);
          const entries = zip.getEntries();
          
          // Agrupar entradas por pasta
          const productFolders = new Map<string, any[]>();
          
          entries.forEach(entry => {
            if (!entry.isDirectory) {
              const pathParts = entry.entryName.split('/');
              if (pathParts.length >= 2) {
                const folderName = pathParts[0];
                if (!productFolders.has(folderName)) {
                  productFolders.set(folderName, []);
                }
                productFolders.get(folderName)!.push(entry);
              }
            }
          });

          // Criar banco de produtos
          const bank = await storage.createProductBank({
            name: name.trim(),
            description: description?.trim() || null,
            zipFileName,
            uploadedBy: user.id,
            totalProducts: productFolders.size,
          });

          // Processar cada produto
          let processedItems = 0;
          for (const [folderName, files] of productFolders) {
            try {
              // Extrair informações do nome da pasta
              const productInfo = extractProductInfo(folderName);
              
              // Buscar description.txt
              const descriptionFile = files.find(f => f.entryName.endsWith('description.txt'));
              let description = '';
              if (descriptionFile) {
                description = zip.readAsText(descriptionFile).trim();
              }

              // Extrair e salvar imagens com Sharp para medir dimensões reais
              const imageFiles = files.filter(f => 
                /\.(jpg|jpeg|png|webp)$/i.test(f.entryName) // Excluir GIF (baixa qualidade)
              );

              type ImgInfo = { url: string; width: number; height: number; bytes: number };
              const imgInfos: ImgInfo[] = [];

              for (const imageFile of imageFiles) {
                const buffer = zip.readFile(imageFile);
                if (!buffer) continue;

                const ext = path.extname(imageFile.entryName).toLowerCase();
                const imageName = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}${ext}`;
                const imagePath = `./uploads/product-banks/images/${imageName}`;
                
                // Criar diretório se não existir
                const imageDir = path.dirname(imagePath);
                if (!fs.existsSync(imageDir)) {
                  fs.mkdirSync(imageDir, { recursive: true });
                }
                
                fs.writeFileSync(imagePath, buffer);

                // Obter dimensões reais com Sharp
                let width = 0, height = 0;
                try {
                  const meta = await sharp(buffer).metadata();
                  width = meta.width ?? 0;
                  height = meta.height ?? 0;
                } catch (sharpError) {
                  console.warn(`Erro ao processar imagem ${imageName} com Sharp:`, sharpError.message);
                }

                imgInfos.push({
                  url: `/uploads/product-banks/images/${imageName}`,
                  width,
                  height,
                  bytes: buffer.length
                });
              }

              // Ordenar por área (px²), com fallback por bytes
              imgInfos.sort((a, b) => {
                const areaA = a.width * a.height;
                const areaB = b.width * b.height;
                if (areaA !== areaB) return areaB - areaA; // Maior área primeiro
                return b.bytes - a.bytes; // Fallback por tamanho em bytes
              });

              const imageUrls = imgInfos.map(i => i.url);
              const primaryImageUrl = imageUrls[0] ?? '';

              console.log(`🖼️ Processado ${imgInfos.length} imagens para ${productInfo.name}:`);
              imgInfos.slice(0, 3).forEach((img, idx) => {
                console.log(`  ${idx + 1}. ${img.url} - ${img.width}×${img.height}px (${(img.bytes / 1024).toFixed(1)}KB)`);
              });

              // Criar item do banco
              await storage.createProductBankItem({
                bankId: bank.id,
                name: productInfo.name,
                description,
                category: categoryFromZip, // Usar categoria do nome do ZIP
                brand: productInfo.brand,
                model: productInfo.model,
                color: productInfo.color,
                storage: productInfo.storage,
                ram: productInfo.ram,
                folderName,
                imageUrls,
                primaryImageUrl,
                metadata: productInfo.metadata,
              });

              processedItems++;
            } catch (itemError) {
              console.error(`Erro ao processar produto ${folderName}:`, itemError);
            }
          }

          // Limpar arquivo ZIP
          fs.unlinkSync(zipPath);

          res.json({
            success: true,
            bank,
            processedItems,
            totalFolders: productFolders.size,
            message: `Banco criado com sucesso! ${processedItems} produtos processados.`
          });

        } catch (zipError) {
          console.error('Erro ao processar ZIP:', zipError);
          // Limpar arquivo ZIP em caso de erro
          if (fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
          }
          res.status(500).json({
            success: false,
            message: 'Erro ao processar arquivo ZIP: ' + zipError.message
          });
        }
      });
    } catch (error) {
      console.error("Error in ZIP upload:", error);
      res.status(500).json({ success: false, message: "Erro interno do servidor" });
    }
  });

  // Buscar produtos do banco (para seleção do lojista)
  app.get('/api/product-banks/:bankId/items', isAuthenticatedCustom, async (req, res) => {
    try {
      const { bankId } = req.params;
      const { search, category, brand, limit = 20, offset = 0 } = req.query;
      
      let items;
      if (search || category || brand) {
        items = await storage.searchProductBankItems(
          (search as string) || '',
          category as string,
          brand as string
        );
      } else {
        items = await storage.getProductBankItems(bankId);
      }

      // Aplicar paginação
      const startIndex = parseInt(offset as string) || 0;
      const limitNum = parseInt(limit as string) || 20;
      const paginatedItems = items.slice(startIndex, startIndex + limitNum);

      res.json({
        items: paginatedItems,
        total: items.length,
        hasMore: startIndex + limitNum < items.length
      });
    } catch (error) {
      console.error("Error fetching product bank items:", error);
      res.status(500).json({ message: "Erro ao buscar produtos do banco" });
    }
  });

  // Listar bancos ativos (para lojistas)
  app.get('/api/product-banks/active', isAuthenticatedCustom, async (req, res) => {
    try {
      const banks = await storage.getActiveProductBanks();
      res.json(banks);
    } catch (error) {
      console.error("Error fetching active product banks:", error);
      res.status(500).json({ message: "Erro ao buscar bancos de produtos ativos" });
    }
  });

  // Criar produto a partir do banco (lojista)
  app.post('/api/products/from-bank', isAuthenticatedCustom, async (req, res) => {
    try {
      const { bankItemId, price, storeId } = req.body;
      
      if (!bankItemId || !price || !storeId) {
        return res.status(400).json({ 
          message: "ID do item do banco, preço e ID da loja são obrigatórios" 
        });
      }

      // Verificar se o usuário é dono da loja
      const user = req.session?.user || req.user;
      if (!user) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const store = await storage.getUserStore(user.id);
      if (!store || store.id !== storeId) {
        return res.status(403).json({ message: "Acesso negado à loja" });
      }

      // Buscar item do banco
      const bankItem = await storage.getProductBankItemById(bankItemId);
      if (!bankItem) {
        return res.status(404).json({ message: "Produto do banco não encontrado" });
      }

      // Criar produto a partir do item do banco
      const productData = {
        name: bankItem.name,
        description: bankItem.description || '',
        price: price.toString(),
        imageUrl: bankItem.primaryImageUrl || (bankItem.imageUrls?.[0] || ''),
        imageUrl2: bankItem.imageUrls?.[1] || null,
        imageUrl3: bankItem.imageUrls?.[2] || null,
        category: bankItem.category || 'Produtos',
        brand: bankItem.brand || '',
        productCode: bankItem.folderName,
        sourceType: 'bank' as const,
      };

      const product = await storage.createProduct(storeId, productData);
      
      // Incrementar uso do item do banco
      await storage.incrementProductBankItemUsage(bankItemId);

      res.status(201).json({
        success: true,
        product,
        message: 'Produto criado com sucesso a partir do banco!'
      });

    } catch (error) {
      console.error("Error creating product from bank:", error);
      res.status(500).json({ message: "Erro ao criar produto a partir do banco" });
    }
  });

  // Excluir banco de produtos (Super Admin)
  app.delete('/api/super-admin/product-banks/:id', isSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const bank = await storage.getProductBankById(id);
      if (!bank) {
        return res.status(404).json({ message: "Banco de produtos não encontrado" });
      }

      await storage.deleteProductBank(id);
      
      res.json({ success: true, message: "Banco de produtos excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting product bank:", error);
      res.status(500).json({ message: "Erro ao excluir banco de produtos" });
    }
  });

  // Gerar banner de teste com produtos específicos (para Super Admin)
  app.post('/api/super-admin/ai-test/generate-banner', isSuperAdmin, async (req: any, res) => {
    try {
      // Verificar se é super admin
      const user = req.user || req.session?.user;
      if (!user?.isSuperAdmin) {
        return res.status(403).json({ error: 'Acesso negado. Requer privilégios de Super Admin.' });
      }

      const { productIds, testMode } = req.body;
      
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: 'Lista de produtos é obrigatória' });
      }

      // Buscar produtos selecionados
      const allProducts = await storage.getAllProducts();
      const selectedProducts = allProducts.filter(product => productIds.includes(product.id));
      
      if (selectedProducts.length === 0) {
        return res.status(400).json({ error: 'Nenhum produto válido encontrado' });
      }

      // Buscar informações das lojas
      const allStores = await storage.getAllStores();
      const storeMap = new Map(allStores.map(store => [store.id, store]));
      
      // Enrichar produtos com dados da loja
      const enrichedProducts = selectedProducts.map(product => {
        const store = storeMap.get(product.storeId);
        return {
          ...product,
          storeName: store?.name || 'Loja não encontrada'
        };
      });

      // CORREÇÃO CRÍTICA: Testar sistema de 3 níveis sem forçar customPrompt
      // Se testMode for true, usar Sharp puro (nível 2)
      // Senão, usar prompt customizado (nível 3)
      
      const timestamp = Date.now();
      const outputPath = `./attached_assets/generated_arts/test_banner_${timestamp}.png`;
      
      if (testMode === 'sharp-only') {
        // TESTE DO NÍVEL 2: Sharp puro sem APIs externas
        console.log('🔬 TESTE: Forçando uso do Sharp puro (sem customPrompt)');
        await generatePromotionalArt(enrichedProducts, outputPath);
      } else {
        // NÍVEL 3: IA com prompt customizado
        const productNames = enrichedProducts.map(p => p.name).join(', ');
        const storeNames = [...new Set(enrichedProducts.map(p => p.storeName))].join(', ');
        
        const customPrompt = `Crie um banner promocional chamativo para destacar os seguintes produtos selecionados para teste: ${productNames}. Produtos das lojas: ${storeNames}. Use design vibrante com cores que chamem atenção, layout moderno e limpo. Inclua elementos visuais que remetam a ofertas especiais e promoções imperdíveis.`;
        
        console.log('🔬 TESTE: Usando prompt customizado para IA');
        await generatePromotionalArt(enrichedProducts, outputPath, customPrompt);
      }
      const imageUrl = `/attached_assets/generated_arts/test_banner_${timestamp}.png`;
      
      // Salvar a arte gerada como arte de teste
      const trendingProductsData = JSON.stringify(enrichedProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        storeName: p.storeName
      })));

      await storage.createGeneratedTotemArt({
        storeId: 'global-trends',
        imageUrl: imageUrl,
        generationDate: new Date(),
        trendingProductsData: trendingProductsData,
        imagePrompt: `TESTE IA: ${customPrompt.substring(0, 100)}...`,
        isActive: true
      });
      
      res.json({ 
        success: true, 
        message: `Banner de teste gerado com sucesso usando ${selectedProducts.length} produto(s)`,
        imageUrl,
        productsUsed: selectedProducts.length
      });
    } catch (error) {
      console.error('Error generating test banner:', error);
      res.status(500).json({ error: error.message || 'Erro ao gerar banner de teste' });
    }
  });

  // ========== NOVAS ROTAS PARA SISTEMA DE BANCO DE PRODUTOS ==========

  // Buscar categorias disponíveis no banco de produtos
  app.get('/api/product-banks/categories', isAuthenticatedCustom, async (req, res) => {
    try {
      const categories = await storage.getProductBankCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching product bank categories:", error);
      res.status(500).json({ message: "Erro ao buscar categorias" });
    }
  });

  // Buscar produtos do banco com paginação e filtros
  app.get('/api/product-banks/items', isAuthenticatedCustom, async (req, res) => {
    try {
      const { q, category, page = 1, pageSize = 20 } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
      const limit = parseInt(pageSize as string);

      const result = await storage.searchProductBankItems({
        q: q as string,
        category: category as string,
        offset,
        limit
      });

      res.json(result);
    } catch (error) {
      console.error("Error searching product bank items:", error);
      res.status(500).json({ message: "Erro ao buscar produtos do banco" });
    }
  });

  // Função auxiliar para traduzir texto usando Gemini
  async function translateToPortuguese(text: string): Promise<string> {
    if (!text || text.trim() === '') return text;

    try {
      // Temporariamente desabilitado - retorna texto original
      // TODO: Corrigir integração com Gemini
      console.log('⚠️  Tradução temporariamente desabilitada - retornando texto original');
      return text;
    } catch (error) {
      console.error('Erro na tradução Gemini:', error);
      return text; // Retorna o texto original em caso de erro
    }
  }

  // Função auxiliar para validar se uma URL é segura
  function isImageUrlSafe(imageUrl: string): boolean {
    try {
      const url = new URL(imageUrl);
      
      // Permitir apenas HTTP e HTTPS
      if (!['http:', 'https:'].includes(url.protocol)) {
        return false;
      }
      
      // Bloquear IPs privados/locais para evitar SSRF
      const hostname = url.hostname.toLowerCase();
      
      // Bloquear localhost e 127.x.x.x
      if (hostname === 'localhost' || hostname.startsWith('127.')) {
        return false;
      }
      
      // Bloquear redes privadas
      if (hostname.startsWith('10.') || 
          hostname.startsWith('192.168.') || 
          hostname.startsWith('172.16.') ||
          hostname.startsWith('172.17.') ||
          hostname.startsWith('172.18.') ||
          hostname.startsWith('172.19.') ||
          hostname.startsWith('172.2') ||
          hostname.startsWith('172.30.') ||
          hostname.startsWith('172.31.')) {
        return false;
      }
      
      // Bloquear outros hostnames perigosos
      if (hostname === '0.0.0.0' || hostname === '::1' || hostname === '[::]') {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // Função auxiliar para obter o tamanho de uma imagem
  async function getImageSize(imageUrl: string): Promise<number> {
    try {
      if (!imageUrl.startsWith('http') || !isImageUrlSafe(imageUrl)) {
        return 0; // Se não é uma URL válida ou segura, retorna 0
      }

      // Implementar timeout adequado usando AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos

      try {
        // Fazer um HEAD request para obter o Content-Length
        const response = await fetch(imageUrl, { 
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Click-Ofertas-Bot/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          return 0;
        }
        
        const contentLength = response.headers.get('content-length');
        return contentLength ? parseInt(contentLength, 10) : 0;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error(`Erro ao obter tamanho da imagem ${imageUrl}:`, error);
      return 0;
    }
  }

  // Função auxiliar para verificar se é URL local
  function isLocalUploadsUrl(url: string): boolean {
    return url.startsWith("/uploads/");
  }

  // Função auxiliar para converter URL local em path do arquivo
  function localPathFromUrl(url: string): string {
    return path.join(process.cwd(), "." + url);
  }

  // Função auxiliar para obter dimensões e tamanho da imagem usando Sharp
  async function getImagePixelsOrSize(url: string): Promise<{area: number; bytes: number}> {
    try {
      if (isLocalUploadsUrl(url)) {
        // Processar arquivo local
        const filePath = localPathFromUrl(url);
        
        if (!fs.existsSync(filePath)) {
          console.warn(`Arquivo local não encontrado: ${filePath}`);
          return { area: 0, bytes: 0 };
        }

        const buf = await fs.promises.readFile(filePath);
        let w = 0, h = 0;
        
        try {
          const meta = await sharp(buf).metadata();
          w = meta.width ?? 0;
          h = meta.height ?? 0;
        } catch (sharpError) {
          console.warn(`Erro ao processar imagem local ${filePath} com Sharp:`, sharpError.message);
        }
        
        return { area: w * h, bytes: buf.length };
      } else {
        // Processar URL remota com proteções de segurança
        if (!isImageUrlSafe(url)) {
          console.warn(`URL remota rejeitada por segurança: ${url}`);
          return { area: 0, bytes: 0 };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        try {
          const resp = await fetch(url, { 
            method: "GET", 
            signal: controller.signal,
            headers: {
              'User-Agent': 'Click-Ofertas-Bot/1.0'
            }
          });
          clearTimeout(timeoutId);
          
          if (!resp.ok) {
            console.warn(`Falha ao buscar imagem remota: ${resp.status} ${url}`);
            return { area: 0, bytes: 0 };
          }
          
          const arrayBuf = await resp.arrayBuffer();
          const buf = Buffer.from(arrayBuf);
          let w = 0, h = 0;
          
          try {
            const meta = await sharp(buf).metadata();
            w = meta.width ?? 0;
            h = meta.height ?? 0;
          } catch (sharpError) {
            console.warn(`Erro ao processar imagem remota ${url} com Sharp:`, sharpError.message);
          }
          
          return { area: w * h, bytes: buf.length };
        } finally {
          clearTimeout(timeoutId);
        }
      }
    } catch (error) {
      console.warn(`Erro ao obter dimensões da imagem ${url}:`, error.message);
      return { area: 0, bytes: 0 };
    }
  }

  // Função auxiliar para selecionar as melhores imagens (por área em px²)
  async function selectBestImages(imageUrls: string[], primaryImageUrl?: string): Promise<string[]> {
    try {
      // Criar lista única de URLs (combinando primaryImageUrl e imageUrls)
      const allUrls = new Set<string>();
      
      if (primaryImageUrl) {
        allUrls.add(primaryImageUrl);
      }
      
      if (imageUrls && Array.isArray(imageUrls)) {
        imageUrls.forEach(url => {
          if (url && url.trim()) {
            allUrls.add(url);
          }
        });
      }
      
      if (allUrls.size === 0) {
        return [];
      }
      
      // Obter dimensões e tamanho de cada imagem
      const scored = await Promise.all(
        Array.from(allUrls).map(async (url) => {
          const { area, bytes } = await getImagePixelsOrSize(url);
          return { url, area, bytes };
        })
      );
      
      // Filtrar imagens válidas (área > 0 ou bytes > 0)
      const valid = scored.filter(s => s.area > 0 || s.bytes > 0);
      
      if (valid.length === 0) {
        console.warn('Nenhuma imagem válida encontrada, usando ordem original');
        return Array.from(allUrls).slice(0, 3);
      }
      
      // Ordenar por área (px²) primeiro, fallback por bytes
      valid.sort((a, b) => {
        if (a.area !== b.area) return b.area - a.area; // Maior área primeiro
        return b.bytes - a.bytes; // Fallback por tamanho em bytes
      });
      
      const bestImages = valid.slice(0, 3).map(v => v.url);
      
      console.log(`🖼️ Selecionadas ${bestImages.length} melhores imagens por qualidade real:`);
      valid.slice(0, 3).forEach((img, idx) => {
        const dimensions = img.area > 0 ? `${Math.sqrt(img.area).toFixed(0)}px²` : 'N/A';
        console.log(`  ${idx + 1}. ${img.url} - ${dimensions} (${(img.bytes / 1024).toFixed(1)}KB)`);
      });
      
      return bestImages;
    } catch (error) {
      console.error('Erro ao selecionar melhores imagens:', error);
      // Fallback: retornar imagens na ordem original
      const fallbackImages = [];
      if (primaryImageUrl) fallbackImages.push(primaryImageUrl);
      if (imageUrls && Array.isArray(imageUrls)) {
        fallbackImages.push(...imageUrls.filter(url => url && url.trim()));
      }
      return fallbackImages.slice(0, 3);
    }
  }

  // Função auxiliar para fazer upload de imagem para object storage
  async function uploadImageToStorage(imageUrl: string, productId: string): Promise<string> {
    try {
      if (!imageUrl.startsWith('http')) {
        return imageUrl; // Se não é uma URL válida, retorna como está
      }

      // Baixar imagem da URL externa
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const ext = path.extname(new URL(imageUrl).pathname) || '.jpg';
      const fileName = `product-${productId}-${Date.now()}${ext}`;
      
      // Usar ObjectStorageService para upload
      const objectStorageService = new ObjectStorageService();
      const uploadPath = await objectStorageService.uploadFile(
        Buffer.from(buffer),
        fileName,
        '.private' // Usar diretório private para produtos
      );
      
      return uploadPath;
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      return imageUrl; // Retorna URL original em caso de erro
    }
  }

  // Importar produtos selecionados do banco para a loja
  app.post('/api/product-banks/import', isAuthenticatedCustom, async (req, res) => {
    try {
      const { storeId, items } = req.body;
      const userId = getUserId(req);

      // Validar entrada
      if (!storeId || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ 
          message: "storeId e items são obrigatórios. items deve ser um array não vazio." 
        });
      }

      // Verificar se o usuário é dono da loja
      const store = await storage.getStore(storeId);
      if (!store || store.userId !== userId) {
        return res.status(403).json({ message: "Acesso negado à loja" });
      }

      const importedProducts = [];
      const errors = [];

      for (const item of items) {
        try {
          const { id: bankItemId, price } = item;
          
          if (!bankItemId || !price) {
            errors.push({ bankItemId, error: "ID e preço são obrigatórios" });
            continue;
          }

          // Buscar item do banco
          const bankItem = await storage.getProductBankItemById(bankItemId);
          if (!bankItem) {
            errors.push({ bankItemId, error: "Item não encontrado no banco" });
            continue;
          }

          // Traduzir descrição para português
          const translatedDescription = await translateToPortuguese(bankItem.description || '');

          // Selecionar as melhores imagens (maiores em KB)
          const bestImageUrls = await selectBestImages(bankItem.imageUrls, bankItem.primaryImageUrl);
          
          // Fazer upload das imagens selecionadas
          const uploadedImageUrls = [];
          for (const imageUrl of bestImageUrls) {
            const uploadedUrl = await uploadImageToStorage(imageUrl, bankItemId);
            uploadedImageUrls.push(uploadedUrl);
          }

          // Criar produto na loja
          const productData = {
            name: bankItem.name,
            description: translatedDescription,
            price: parseFloat(price.toString()),
            category: bankItem.category || 'Produtos',
            imageUrl: uploadedImageUrls[0] || null,
            imageUrl2: uploadedImageUrls[1] || null,
            imageUrl3: uploadedImageUrls[2] || null,
            isActive: true,
            isFeatured: false,
            showInStories: true,
            brand: bankItem.brand || null,
            model: bankItem.model || null,
            sourceType: 'product_bank',
            productCode: bankItem.id,
            // Metadados adicionais
            color: bankItem.color || null,
            storage: bankItem.storage || null,
            ram: bankItem.ram || null,
          };

          const product = await storage.createProduct(storeId, productData);
          
          // Incrementar contador de uso do item no banco
          await storage.incrementProductBankItemUsage(bankItemId);

          importedProducts.push({
            bankItemId,
            productId: product.id,
            name: product.name,
            translatedDescription: translatedDescription !== bankItem.description
          });

        } catch (itemError) {
          console.error(`Erro ao importar item ${item.id}:`, itemError);
          errors.push({ 
            bankItemId: item.id, 
            error: itemError.message || "Erro interno" 
          });
        }
      }

      res.json({
        success: true,
        imported: importedProducts.length,
        errors: errors.length,
        products: importedProducts,
        errorDetails: errors.length > 0 ? errors : undefined,
        message: `${importedProducts.length} produto(s) importado(s) com sucesso${errors.length > 0 ? `, ${errors.length} erro(s)` : ''}`
      });

    } catch (error) {
      console.error("Error importing products from bank:", error);
      res.status(500).json({ message: "Erro ao importar produtos do banco" });
    }
  });

  // ==========================================
  // SISTEMA DE ANALYTICS AVANÇADO
  // ==========================================

  // Schema de validação para eventos de analytics
  const analyticsEventSchema = z.union([
    // Event: product_view
    z.object({
      type: z.literal('product_view'),
      productId: z.string(),
      storeId: z.string(),
      page: z.string().optional(),
      position: z.number().optional(),
      extra: z.any().optional(),
    }),
    // Event: product_click  
    z.object({
      type: z.literal('product_click'),
      productId: z.string(),
      storeId: z.string(),
      page: z.string().optional(),
      position: z.number().optional(),
      extra: z.any().optional(),
    }),
    // Event: search
    z.object({
      type: z.literal('search'),
      query: z.string(),
      category: z.string().optional(),
      storeId: z.string().optional(),
      resultsCount: z.number().optional(),
      position: z.number().optional(),
      extra: z.any().optional(),
    }),
    // Event: banner_view
    z.object({
      type: z.literal('banner_view'),
      bannerId: z.string(),
      position: z.number().optional(),
      page: z.string().optional(),
      extra: z.any().optional(),
    }),
    // Event: banner_click
    z.object({
      type: z.literal('banner_click'),
      bannerId: z.string(),
      position: z.number().optional(),
      page: z.string().optional(),
      extra: z.any().optional(),
    }),
  ]);

  // POST /api/analytics/event - Capturar eventos de analytics
  app.post("/api/analytics/event", async (req, res) => {
    try {
      // Validar payload
      const events = Array.isArray(req.body) ? req.body : [req.body];
      const validEvents = [];

      for (const event of events) {
        try {
          const validated = analyticsEventSchema.parse(event);
          validEvents.push(validated);
        } catch (validationError) {
          console.error("Invalid analytics event:", event, validationError);
        }
      }

      if (validEvents.length === 0) {
        return res.status(400).json({ error: "No valid events provided" });
      }

      // Processar cada evento
      for (const event of validEvents) {
        const { analytics } = req;
        
        // Prevenção de duplicação
        const { isDuplicateEvent } = await import("./middleware/analyticsContext");
        const entityId = event.productId || event.bannerId || event.query || 'unknown';
        
        if (isDuplicateEvent(analytics.sessionId, event.type, entityId)) {
          continue; // Skip duplicated event
        }

        // Dispatch para o tipo correto de evento
        switch (event.type) {
          case 'product_view':
            await handleProductView(event, analytics);
            break;
          case 'product_click':
            await handleProductClick(event, analytics);
            break;
          case 'search':
            await handleSearch(event, analytics);
            break;
          case 'banner_view':
            await handleBannerView(event, analytics);
            break;
          case 'banner_click':
            await handleBannerClick(event, analytics);
            break;
        }
      }

      res.json({ success: true, processed: validEvents.length });
    } catch (error) {
      console.error("Analytics event error:", error);
      res.status(500).json({ error: "Failed to process analytics events" });
    }
  });

  // Handlers para cada tipo de evento
  async function handleProductView(event: any, analytics: any) {
    try {
      // Buscar dados do produto
      const product = await storage.getProductById(event.productId);
      const store = product ? await storage.getStore(product.storeId) : null;

      if (!product || !store) return;

      // Registrar visualização  
      await storage.createProductView({
        sessionToken: analytics.sessionId,
        productId: product.id,
        productName: product.name,
        productCategory: product.category || null,
        productPrice: product.price,
        storeId: store.id,
        storeName: store.name,
        position: event.position || null,
        page: event.page || null,
        extra: event.extra || null,
        cameFromSearch: false, // TODO: detectar via referrer
      });

      // Atualizar sessão se necessário
      await updateOrCreateSession(analytics);
    } catch (error) {
      console.error("Error handling product view:", error);
    }
  }

  async function handleProductClick(event: any, analytics: any) {
    // Product clicks ainda podem usar a tabela productViews com flag especial
    // ou uma nova tabela productClicks se necessário
    try {
      await handleProductView(event, analytics); // Registrar como view também
      // TODO: Implementar tabela específica de clicks se necessário
    } catch (error) {
      console.error("Error handling product click:", error);
    }
  }

  async function handleSearch(event: any, analytics: any) {
    try {
      await storage.createProductSearch({
        sessionToken: analytics.sessionId,
        searchTerm: event.query,
        category: event.category || null,
        storeId: event.storeId || null,
        resultsCount: event.resultsCount || null,
        position: event.position || null,
        query: event.query,
        extra: event.extra || null,
      });

      await updateOrCreateSession(analytics);
    } catch (error) {
      console.error("Error handling search:", error);
    }
  }

  async function handleBannerView(event: any, analytics: any) {
    try {
      await storage.createBannerView({
        bannerId: event.bannerId,
        sessionId: analytics.sessionId,
        userAgent: analytics.userAgent || null,
        ipAddress: analytics.ipHash,
      });

      await updateOrCreateSession(analytics);
    } catch (error) {
      console.error("Error handling banner view:", error);
    }
  }

  async function handleBannerClick(event: any, analytics: any) {
    try {
      await storage.createBannerClick({
        bannerId: event.bannerId,
        sessionId: analytics.sessionId,
        userAgent: analytics.userAgent || null,
        ipAddress: analytics.ipHash,
      });

      await updateOrCreateSession(analytics);
    } catch (error) {
      console.error("Error handling banner click:", error);
    }
  }

  async function updateOrCreateSession(analytics: any) {
    try {
      // Atualizar ou criar sessão no banco
      const existingSession = await storage.getSessionByToken(analytics.sessionId);
      
      if (existingSession) {
        // Atualizar última atividade
        await storage.updateSession(analytics.sessionId, {
          lastActivity: new Date(),
          utmSource: analytics.utm.source || existingSession.utmSource,
          utmMedium: analytics.utm.medium || existingSession.utmMedium,
          utmCampaign: analytics.utm.campaign || existingSession.utmCampaign,
        });
      } else {
        // Criar nova sessão
        await storage.createUserSession({
          sessionToken: analytics.sessionId,
          deviceType: analytics.device,
          ipHash: analytics.ipHash,
          referrer: analytics.referrer || null,
          utmSource: analytics.utm.source || null,
          utmMedium: analytics.utm.medium || null,
          utmCampaign: analytics.utm.campaign || null,
          utmContent: analytics.utm.content || null,
          utmTerm: analytics.utm.term || null,
          browserInfo: analytics.userAgent || null,
        });
      }
    } catch (error) {
      console.error("Error updating session:", error);
    }
  }

  // ==========================================
  // ENDPOINTS DE RELATÓRIOS DE ANALYTICS
  // ==========================================

  // GET /api/analytics/reports/top-products - Top produtos por período
  app.get("/api/analytics/reports/top-products", isSuperAdmin, async (req, res) => {
    try {
      const period = String(req.query.period || "7d");
      const storeId = req.query.storeId as string | undefined;
      
      const days = period === "24h" ? 1 : period === "30d" ? 30 : 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const topProducts = await storage.getTopProductsByViews(startDate, storeId);
      
      res.json({ 
        success: true, 
        period,
        products: topProducts 
      });
    } catch (error) {
      console.error("Error getting top products:", error);
      res.status(500).json({ error: "Failed to get top products" });
    }
  });

  // GET /api/analytics/reports/top-searches - Top buscas por período
  app.get("/api/analytics/reports/top-searches", isSuperAdmin, async (req, res) => {
    try {
      const period = String(req.query.period || "7d");
      const storeId = req.query.storeId as string | undefined;
      
      const days = period === "24h" ? 1 : period === "30d" ? 30 : 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const topSearches = await storage.getTopSearches(startDate, storeId);
      
      res.json({ 
        success: true, 
        period,
        searches: topSearches 
      });
    } catch (error) {
      console.error("Error getting top searches:", error);
      res.status(500).json({ error: "Failed to get top searches" });
    }
  });

  // GET /api/analytics/reports/banner-ctr - CTR dos banners por período
  app.get("/api/analytics/reports/banner-ctr", isSuperAdmin, async (req, res) => {
    try {
      const period = String(req.query.period || "7d");
      
      const days = period === "24h" ? 1 : period === "30d" ? 30 : 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const bannerStats = await storage.getBannerCTR(startDate);
      
      res.json({ 
        success: true, 
        period,
        banners: bannerStats 
      });
    } catch (error) {
      console.error("Error getting banner CTR:", error);
      res.status(500).json({ error: "Failed to get banner CTR" });
    }
  });

  // GET /api/analytics/reports/overview - Visão geral das métricas
  app.get("/api/analytics/reports/overview", isSuperAdmin, async (req, res) => {
    try {
      const period = String(req.query.period || "7d");
      const storeId = req.query.storeId as string | undefined;
      
      const days = period === "24h" ? 1 : period === "30d" ? 30 : 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [sessions, productViews, searches, bannerViews] = await Promise.all([
        storage.getSessionCount(startDate, storeId),
        storage.getProductViewCount(startDate, storeId),
        storage.getSearchCount(startDate, storeId),
        storage.getBannerViewCount(startDate),
      ]);

      res.json({
        success: true,
        period,
        metrics: {
          sessions,
          productViews,
          searches,
          bannerViews,
        },
      });
    } catch (error) {
      console.error("Error getting analytics overview:", error);
      res.status(500).json({ error: "Failed to get analytics overview" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
