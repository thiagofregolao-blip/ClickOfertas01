import "express-session";

declare module "express-session" {
  interface SessionData {
    user?: {
      id: string;
      email?: string | null;
      isSuperAdmin?: boolean;
      storeName?: string;
    } | null;
  }
}