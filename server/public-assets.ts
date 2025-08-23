import express from 'express';
import path from 'path';

export function setupPublicAssets(app: express.Application) {
  // Serve attached assets statically
  app.use('/attached_assets', express.static(path.resolve(process.cwd(), 'attached_assets')));
}