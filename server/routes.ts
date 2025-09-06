import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { getUserId } from "./utils/auth";

// Middleware para verificar autenticação (sessão manual ou Replit Auth)
const isAuthenticatedCustom = async (req: any, res: any, next: any) => {
  try {
    // Verificar sessão manual primeiro (usuários registrados via formulário)
    if (req.session?.user?.id) {
      return next();
    }
    
    // Verificar autenticação Replit como fallback
    if (req.user?.claims?.sub || req.user?.id) {
      return next();
    }
    
    return res.status(401).json({ message: "Unauthorized" });
  } catch (error) {
    console.error("Error checking authentication:", error);
    res.status(500).json({ message: "Server error" });
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
import { insertStoreSchema, updateStoreSchema, insertProductSchema, updateProductSchema, insertSavedProductSchema, insertStoryViewSchema, insertFlyerViewSchema, insertProductLikeSchema, insertScratchedProductSchema, insertCouponSchema, registerUserSchema, loginUserSchema, registerUserNormalSchema, registerStoreOwnerSchema, registerSuperAdminSchema, insertScratchCampaignSchema, insertPromotionSchema, updatePromotionSchema, insertPromotionScratchSchema, insertInstagramStorySchema, insertInstagramStoryViewSchema, insertInstagramStoryLikeSchema, updateInstagramStorySchema, insertBudgetConfigSchema } from "@shared/schema";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { apifyService, type PriceSearchResult } from "./apifyService";

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
  const connectPg = (await import('connect-pg-simple')).default(session);
  
  const pgStore = new connectPg({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: 7 * 24 * 60 * 60, // 1 week in seconds
    tableName: "sessions",
  });
  
  app.set("trust proxy", 1);
  app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    store: pgStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to false for localhost
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  }));

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

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
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

  // Public store routes
  app.get('/api/public/stores', async (req, res) => {
    try {
      const stores = await storage.getAllActiveStores();
      res.json(stores);
    } catch (error) {
      console.error("Error fetching active stores:", error);
      res.status(500).json({ message: "Failed to fetch stores" });
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
  // FIM DO SISTEMA DE RASPADINHA DIÁRIA
  // ==========================================

  const httpServer = createServer(app);
  return httpServer;
}
