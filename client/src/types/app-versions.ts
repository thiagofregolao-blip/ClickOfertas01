/**
 * Definições das versões da aplicação Panfleto Rápido
 * 
 * Esta aplicação possui duas versões otimizadas para diferentes dispositivos:
 */

export const APP_CONFIG = {
  // Configurações da versão Mobile
  MOBILE: {
    name: 'Panfleto Rápido Mobile',
    description: 'Versão otimizada para smartphones e tablets',
    breakpoint: 768, // px
    features: [
      'Layout Instagram Stories',
      'Cards compactos',
      'Navegação touch-friendly',
      'Engagement com double-tap',
      'Interface simplificada'
    ],
    routes: [
      '/cards - Galeria de lojas',
      '/stores/:slug - Stories da loja',
      '/flyer/:slug - Panfleto (versão mobile)'
    ]
  },

  // Configurações da versão Desktop
  DESKTOP: {
    name: 'Panfleto Rápido Desktop', 
    description: 'Versão otimizada para computadores e notebooks',
    breakpoint: 768, // px (acima deste valor)
    features: [
      'Layout tradicional de panfleto',
      'Grid expandido de produtos',
      'Mais informações simultâneas',
      'Navegação por mouse/teclado',
      'Interface detalhada'
    ],
    routes: [
      '/cards - Galeria de lojas',
      '/stores/:slug - Stories da loja (adaptado)',
      '/flyer/:slug - Panfleto completo'
    ]
  }
} as const

export type AppVersionType = 'mobile' | 'desktop'
export type AppVersionConfig = typeof APP_CONFIG.MOBILE | typeof APP_CONFIG.DESKTOP