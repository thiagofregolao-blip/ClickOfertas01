import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupOAuthProviders } from "./authProviders";
import { insertStoreSchema, updateStoreSchema, insertProductSchema, updateProductSchema, insertSavedProductSchema, insertStoryViewSchema, insertFlyerViewSchema, insertProductLikeSchema, insertScratchedProductSchema, registerUserSchema, loginUserSchema, registerUserNormalSchema, registerStoreOwnerSchema } from "@shared/schema";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import bcrypt from "bcryptjs";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  await setupOAuthProviders(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Handle both OAuth and traditional login sessions
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.getUser(userId);
      
      // Verifica se o usuário tem uma loja
      const userStore = await storage.getUserStore(userId);
      const userWithStoreInfo = {
        ...user,
        hasStore: !!userStore
      };
      
      res.json(userWithStoreInfo);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile route
  app.put('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
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
      const userId = req.user.claims?.sub || req.user.id;
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
      const userData = registerUserSchema.parse(req.body);
      
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

      // Create session
      req.login(user, (err) => {
        if (err) {
          console.error("Session error:", err);
          return res.status(500).json({ message: "Erro ao criar sessão" });
        }
        res.status(201).json({ 
          message: "Usuário criado com sucesso",
          user: {
            id: user.id,
            email: user.email,
            storeName: user.storeName
          }
        });
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

  // Login route  
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

      // Create session
      req.login(user, async (err) => {
        if (err) {
          console.error("Session error:", err);
          return res.status(500).json({ message: "Erro ao criar sessão" });
        }
        // Verifica se o usuário tem uma loja
        const userStore = await storage.getUserStore(user.id);
        res.json({ 
          message: "Login realizado com sucesso",
          user: {
            id: user.id,
            email: user.email,
            storeName: user.storeName
          },
          hasStore: !!userStore
        });
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

      // Create session
      req.login(user, (err) => {
        if (err) {
          console.error("Session error:", err);
          return res.status(500).json({ message: "Erro ao criar sessão" });
        }
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
        isEmailVerified: false
      });

      // Create session
      req.login(user, (err) => {
        if (err) {
          console.error("Session error:", err);
          return res.status(500).json({ message: "Erro ao criar sessão" });
        }
        res.status(201).json({ 
          message: "Loja criada com sucesso",
          user: {
            id: user.id,
            email: user.email,
            storeName: user.storeName
          },
          hasStore: true
        });
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
      const userId = req.user.claims?.sub || req.user.id;
      const store = await storage.getUserStore(userId);
      res.json(store);
    } catch (error) {
      console.error("Error fetching store:", error);
      res.status(500).json({ message: "Failed to fetch store" });
    }
  });

  app.post('/api/stores', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
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
      const userId = req.user.claims?.sub || req.user.id;
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

  // Product routes
  app.get('/api/stores/:storeId/products', isAuthenticated, async (req: any, res) => {
    try {
      const { storeId } = req.params;
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
      const productData = updateProductSchema.parse(req.body);
      const product = await storage.updateProduct(productId, storeId, productData);
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
      const userId = req.user.claims?.sub || req.user.id;
      
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
      const userId = req.user.claims?.sub || req.user.id;
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
      const userId = req.user.claims?.sub || req.user.id;
      
      await storage.removeSavedProduct(savedProductId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing saved product:", error);
      res.status(500).json({ message: "Failed to remove saved product" });
    }
  });

  // Scratch card routes
  app.post('/api/products/:productId/scratch', async (req: any, res) => {
    try {
      const { productId } = req.params;
      const userId = req.user?.claims?.sub || req.user?.id; // pode ser anônimo
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip;

      // Verificar se o produto é uma raspadinha válida
      const product = await storage.getProductById(productId);
      if (!product || !product.isScratchCard || !product.scratchExpiresAt) {
        return res.status(400).json({ message: "Produto não é uma raspadinha válida" });
      }

      // Verificar se a raspadinha ainda está ativa
      if (new Date(product.scratchExpiresAt) <= new Date()) {
        return res.status(400).json({ message: "Raspadinha expirada" });
      }

      // Verificar se ainda há resgates disponíveis
      const maxRedemptions = parseInt(product.maxScratchRedemptions || "10");
      const currentRedemptions = parseInt(product.currentScratchRedemptions || "0");
      
      if (currentRedemptions >= maxRedemptions) {
        return res.status(400).json({ message: "Limite de resgates atingido" });
      }

      // Verificar se usuário já raspou este produto (se logado)
      if (userId) {
        const existingScratch = await storage.getScratchedProduct(productId, userId);
        if (existingScratch) {
          return res.status(400).json({ message: "Você já raspou este produto" });
        }
      }

      // Calcular data de expiração do resgate individual (ex: 1 hora após raspar)
      const timeLimitMinutes = parseInt(product.scratchTimeLimitMinutes || "60");
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + timeLimitMinutes);

      // Criar registro de raspadinha
      const scratchData = insertScratchedProductSchema.parse({
        productId,
        userId,
        userAgent,
        ipAddress,
        expiresAt,
        hasRedeemed: false
      });

      const scratchedProduct = await storage.createScratchedProduct(scratchData);

      // Atualizar contador de resgates do produto
      await storage.updateScratchRedemptionCount(productId);

      res.status(201).json({
        success: true,
        expiresAt: scratchedProduct.expiresAt,
        timeLeftMinutes: timeLimitMinutes
      });
    } catch (error) {
      console.error("Error scratching product:", error);
      res.status(500).json({ message: "Erro ao processar raspadinha" });
    }
  });

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
      const userId = req.user.id;
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
      const userId = req.user.id;
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

  const httpServer = createServer(app);
  return httpServer;
}
