// Utility para padronizar a obtenção do userId em todas as rotas
export function getUserId(req: any): string | undefined {
  return req.session?.user?.id || req.user?.claims?.sub || req.user?.id;
}