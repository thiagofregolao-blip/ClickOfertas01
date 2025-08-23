import {
  users,
  stores,
  products,
  type User,
  type UpsertUser,
  type Store,
  type InsertStore,
  type UpdateStore,
  type Product,
  type InsertProduct,
  type UpdateProduct,
  type StoreWithProducts,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Store operations
  getUserStore(userId: string): Promise<Store | undefined>;
  createStore(userId: string, store: InsertStore): Promise<Store>;
  updateStore(storeId: string, store: UpdateStore): Promise<Store>;
  getStoreBySlug(slug: string): Promise<StoreWithProducts | undefined>;
  getAllActiveStores(): Promise<StoreWithProducts[]>;
  deleteStore(storeId: string, userId: string): Promise<void>;

  // Product operations
  getStoreProducts(storeId: string): Promise<Product[]>;
  createProduct(storeId: string, product: InsertProduct): Promise<Product>;
  updateProduct(productId: string, storeId: string, product: UpdateProduct): Promise<Product>;
  deleteProduct(productId: string, storeId: string): Promise<void>;
  getProduct(productId: string, storeId: string): Promise<Product | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Store operations
  async getUserStore(userId: string): Promise<Store | undefined> {
    const [store] = await db
      .select()
      .from(stores)
      .where(eq(stores.userId, userId));
    return store;
  }

  async createStore(userId: string, storeData: InsertStore): Promise<Store> {
    const slug = this.generateSlug(storeData.name);
    const [store] = await db
      .insert(stores)
      .values({
        ...storeData,
        userId,
        slug,
      })
      .returning();
    return store;
  }

  async updateStore(storeId: string, storeData: UpdateStore): Promise<Store> {
    const updateData = { ...storeData, updatedAt: new Date() };
    if (storeData.name) {
      updateData.slug = this.generateSlug(storeData.name);
    }
    
    const [store] = await db
      .update(stores)
      .set(updateData)
      .where(eq(stores.id, storeId))
      .returning();
    return store;
  }

  async getStoreBySlug(slug: string): Promise<StoreWithProducts | undefined> {
    const [store] = await db
      .select()
      .from(stores)
      .where(and(eq(stores.slug, slug), eq(stores.isActive, true)));
    
    if (!store) return undefined;

    const storeProducts = await db
      .select()
      .from(products)
      .where(eq(products.storeId, store.id))
      .orderBy(desc(products.isFeatured), products.sortOrder, products.createdAt);

    return {
      ...store,
      products: storeProducts,
    };
  }

  async getAllActiveStores(): Promise<StoreWithProducts[]> {
    const activeStores = await db
      .select()
      .from(stores)
      .where(eq(stores.isActive, true))
      .orderBy(desc(stores.createdAt));
    
    const storesWithProducts = await Promise.all(
      activeStores.map(async (store) => {
        const storeProducts = await db
          .select()
          .from(products)
          .where(and(eq(products.storeId, store.id), eq(products.isActive, true)))
          .orderBy(desc(products.isFeatured), products.sortOrder, products.createdAt);

        return {
          ...store,
          products: storeProducts,
        };
      })
    );

    return storesWithProducts;
  }

  async deleteStore(storeId: string, userId: string): Promise<void> {
    await db
      .delete(stores)
      .where(and(eq(stores.id, storeId), eq(stores.userId, userId)));
  }

  // Product operations
  async getStoreProducts(storeId: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.storeId, storeId))
      .orderBy(desc(products.isFeatured), products.sortOrder, products.createdAt);
  }

  async createProduct(storeId: string, productData: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values({
        ...productData,
        storeId,
      })
      .returning();
    return product;
  }

  async updateProduct(productId: string, storeId: string, productData: UpdateProduct): Promise<Product> {
    const [product] = await db
      .update(products)
      .set({ ...productData, updatedAt: new Date() })
      .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
      .returning();
    return product;
  }

  async deleteProduct(productId: string, storeId: string): Promise<void> {
    await db
      .delete(products)
      .where(and(eq(products.id, productId), eq(products.storeId, storeId)));
  }

  async getProduct(productId: string, storeId: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.storeId, storeId)));
    return product;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }
}

export const storage = new DatabaseStorage();
