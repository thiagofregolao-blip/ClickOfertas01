import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertStoreSchema, updateStoreSchema, insertProductSchema, updateProductSchema, insertSavedProductSchema, insertStoryViewSchema, insertFlyerViewSchema, insertProductLikeSchema } from "@shared/schema";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Store routes
  app.get('/api/stores/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const store = await storage.getUserStore(userId);
      res.json(store);
    } catch (error) {
      console.error("Error fetching store:", error);
      res.status(500).json({ message: "Failed to fetch store" });
    }
  });

  app.post('/api/stores', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      
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
      const userId = req.user.claims.sub;
      const savedProducts = await storage.getSavedProducts(userId);
      res.json(savedProducts);
    } catch (error) {
      console.error("Error fetching saved products:", error);
      res.status(500).json({ message: "Failed to fetch saved products" });
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
      const analytics = await storage.getStoreAnalytics(storeId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
