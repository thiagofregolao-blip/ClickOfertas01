import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupOAuthProviders } from "./authProviders";
import { insertStoreSchema, updateStoreSchema, insertProductSchema, updateProductSchema, insertSavedProductSchema, insertStoryViewSchema, insertFlyerViewSchema, insertProductLikeSchema, insertScratchedProductSchema, insertCouponSchema, registerUserSchema, loginUserSchema, registerUserNormalSchema, registerStoreOwnerSchema, insertScratchCampaignSchema } from "@shared/schema";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";

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
      const userId = req.user?.claims?.sub || req.user?.id;
      
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

  // COUPON ROUTES
  
  // Criar cupom após raspar produto
  app.post('/api/products/:productId/generate-coupon', isAuthenticated, async (req: any, res) => {
    try {
      console.log('🎫 INICIANDO GERAÇÃO DE CUPOM');
      const { productId } = req.params;
      const userId = req.user?.claims?.sub || req.user?.id;
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip;

      console.log('📋 Dados recebidos:', { productId, userId, userAgent, ipAddress });

      // Buscar o produto e a loja
      console.log('🔍 Buscando produto...');
      const product = await storage.getProductById(productId);
      console.log('📦 Produto encontrado:', product);
      
      if (!product || !product.isScratchCard) {
        console.log('❌ Produto não é raspadinha válida');
        return res.status(400).json({ message: "Produto não é uma raspadinha válida" });
      }

      // Verificar se o usuário já raspou este produto, se não, criar automaticamente
      let scratchedProduct = await storage.getScratchedProduct(productId, userId);
      if (!scratchedProduct) {
        // Criar scratch automaticamente se não existir
        try {
          const scratchData = {
            productId,
            userId,
            userAgent: userAgent || 'unknown',
            ipAddress: ipAddress || 'unknown',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
          };
          scratchedProduct = await storage.createScratchedProduct(scratchData);
        } catch (error) {
          console.error('Error creating scratch product:', error);
          // Se falhar, usar dados padrão
          scratchedProduct = {
            id: 'temp',
            productId,
            userId,
            userAgent: userAgent || 'unknown',
            ipAddress: ipAddress || 'unknown',
            scratchedAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          };
        }
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

      // Criar cupom
      const couponData = {
        productId: product.id,
        storeId: product.storeId,
        userId,
        userAgent: userAgent || 'unknown',
        ipAddress: ipAddress || 'unknown',
        couponCode,
        originalPrice: originalPrice.toString(),
        discountPrice: discountPrice.toString(),
        discountPercentage: discountPercentage.toString(),
        qrCode: qrCodeBase64,
        expiresAt,
        isRedeemed: false
      };

      console.log('💾 Criando cupom no banco...');
      const coupon = await storage.createCoupon(couponData);
      console.log('✅ Cupom criado com sucesso:', coupon);

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
      const userId = req.user?.claims?.sub || req.user?.id;
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
      const userId = req.user?.claims?.sub || req.user?.id;
      
      // Verificar se cupom existe e pertence ao usuário
      const coupon = await storage.getCoupon(couponId);
      if (!coupon) {
        return res.status(404).json({ message: "Cupom não encontrado" });
      }
      
      if (coupon.userId !== userId) {
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
  app.post('/api/virtual-clones/:cloneId/scratch', async (req: any, res) => {
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
      if (clone.userId !== userId) {
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

  const httpServer = createServer(app);
  return httpServer;
}
