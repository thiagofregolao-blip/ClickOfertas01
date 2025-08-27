# Click Ofertas Paraguai

## Overview

Click Ofertas Paraguai is a web application that enables store owners to create digital flyers by managing products and automatically generating shareable promotional content. The system features two distinct frontend interfaces: an admin panel for store management and a public-facing flyer display with Instagram-style feed and intelligent search capabilities. Built as a full-stack TypeScript application, it uses React for the frontend, Express.js for the backend, and PostgreSQL with Drizzle ORM for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system variables
- **State Management**: TanStack Query for server state and React hooks for local state
- **Routing**: Wouter for client-side routing with protected and public routes
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle with PostgreSQL dialect
- **Authentication**: Replit Auth integration with session management
- **API Design**: RESTful endpoints with CRUD operations for stores and products

### Data Storage
- **Primary Database**: PostgreSQL with connection pooling via Neon serverless
- **Schema Management**: Drizzle Kit for migrations and schema definition
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **File Storage**: External URLs for images (no local file storage)

### Authentication & Authorization
- **Provider**: Replit OpenID Connect (OIDC)
- **Session Management**: Express sessions with PostgreSQL storage
- **Access Control**: Route-level protection for admin features
- **Public Access**: Unauthenticated access to flyer display pages

### Application Structure
- **Admin Interface**: Protected dashboard for store configuration, product management, and flyer preview
- **Public Interface**: Open flyer display with sharing and download capabilities
- **Dual Frontend Strategy**: Single application serving both admin and public interfaces based on authentication state
- **Responsive Design**: Mobile-first approach with adaptive layouts

### Key Features
- **Store Management**: Store configuration with branding (logo, theme colors, contact info)
- **Product Management**: CRUD operations with status management (active/inactive, featured)
- **Flyer Generation**: Automatic layout generation based on active products
- **Export Capabilities**: PNG download functionality using html2canvas
- **Social Sharing**: Native sharing API with clipboard fallback
- **Real-time Updates**: Optimistic updates with server synchronization
- **Intelligent Search System**: Product and store search with magnifying glass icon in header
- **Category Filtering**: Individual flyer category filters with dropdown selector
- **Instagram-Style Feed**: Clean, mobile-first design with focused product display

## System Improvements & Feedback

### Critical Priority Issues

**1. Performance Optimization**
- Component refactoring: StoresGallery (826 lines) needs to be broken into smaller components
- Implement lazy loading for images
- Add virtualização for large product lists
- Add useMemo and useCallback for expensive operations
- Remove production console.logs

**2. UX/UI Enhancements**
- Add debounce to search functionality (500ms delay)
- Implement detailed skeleton loading states
- Create more informative empty states
- Improve visual feedback for loading/error states
- Add proper accessibility (ARIA labels, focus management)

**3. Missing Core Features**
- Advanced filtering (price, category, location)
- Persistent favorites (currently only localStorage)
- Push notifications for deals
- Better native sharing
- Basic offline mode capabilities
- Enhanced analytics beyond basic view tracking

### Medium Priority Improvements

**4. Code Quality & Architecture**
- Extract business logic from UI components
- Create custom hooks (useSearch, useProducts)
- Standardize error handling across the app
- Reduce component complexity (some components 200+ lines)

**5. SEO & Marketing**
- Dynamic meta tags per store
- Open Graph tags for social sharing
- Schema.org structured data for products
- Sitemap generation
- Google Analytics integration

**6. Store Management Features**
- Bulk product operations
- Advanced inventory management
- Sales analytics dashboard
- Customer engagement metrics
- Export capabilities for store data

### Low Priority Enhancements

**7. Technical Debt**
- API response caching optimization
- Database query optimization
- Bundle size optimization
- Error boundary implementation
- Automated testing setup

## Funcionalidades Futuras Propostas

### **8. Mídia Dinâmica para Produtos (Prioridade: Alta)**
**Descrição**: Permitir que lojistas adicionem vídeos além de imagens nos produtos do flyer
**Benefícios**:
- Maior engajamento visual (vídeos prendem mais atenção)
- Melhor demonstração de produtos em movimento
- Feed mais dinâmico tipo Instagram/TikTok
- Diferencial competitivo no mercado
- Potencial aumento nas conversões de venda

**Implementação Técnica Sugerida**:
- Campo `mediaType` no schema do produto ("image", "video", "carousel")
- URL flexível para diferentes tipos de mídia
- Controles opcionais de play/pause para vídeos
- Autoplay silencioso para não incomodar usuários
- Fallback inteligente (se vídeo não carregar, mostra imagem)
- Configuração por loja para permitir/desabilitar vídeos
- Limitação de tamanho de arquivo para performance
- Suporte a formatos MP4, WebM

**Considerações de Performance**:
- Impacto no consumo de dados móveis
- Otimização de carregamento para não travar a página
- Gestão do consumo de bateria com autoplay

## External Dependencies

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit Platform**: Hosting and authentication provider

### Frontend Libraries
- **UI Components**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS for utility-first styling
- **Data Fetching**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Hookform Resolvers
- **Validation**: Zod for schema validation
- **Canvas Rendering**: html2canvas for image generation
- **Date Utilities**: date-fns for date manipulation

### Backend Dependencies
- **Database**: Drizzle ORM with PostgreSQL adapter
- **Authentication**: OpenID Client for Replit Auth
- **Session Management**: Express Session with PostgreSQL store
- **Utilities**: Memoizee for caching, nanoid for ID generation

### Development Tools
- **Build Tool**: Vite with React plugin
- **TypeScript**: Full type safety across the stack
- **Development**: TSX for server development with hot reload
- **Linting**: ESBuild for production bundling

## PWA & App Store Distribution

### Progressive Web App (PWA)
- **Status**: ✅ Fully implemented and functional
- **Features**: Offline support, installable, native app experience
- **Compatibility**: iOS (Safari) and Android (Chrome) tested and working
- **Installation**: Automatic prompt on Android, manual process on iOS

### App Store Distribution Options

#### Google Play Store (Android) - RECOMENDADO
**Método**: Trusted Web Activities (TWA)
- **Ferramenta**: PWABuilder.com (gratuita e automática)
- **Processo**:
  1. Acesse pwabuilder.com
  2. Cole URL: https://click-ofertas-paraguai.replit.app
  3. Gera APK automaticamente usando o PWA existente
  4. Assina digitalmente o APK
  5. Publica na Google Play Store
- **Custo**: $25 USD (taxa única de registro)
- **Tempo**: ~30 minutos para gerar + tempo de aprovação Google
- **Vantagem**: Usa exatamente o PWA atual sem modificações

#### Apple App Store (iOS) - MAIS COMPLEXO
**Método**: Hybrid App (requer conversão)
- **Limitação**: Apple não aceita PWAs diretos na App Store
- **Ferramentas**: Ionic Capacitor ou Apache Cordova
- **Processo**:
  1. Instalar Capacitor: `npm install @capacitor/core @capacitor/ios`
  2. Inicializar: `npx cap init "Click Ofertas" "com.clickofertas.app"`
  3. Adicionar iOS: `npx cap add ios`
  4. Abrir no Xcode para compilação
  5. Submeter à App Store via Xcode
- **Custo**: $99 USD/ano (Apple Developer Program)
- **Tempo**: Algumas horas de setup + tempo de aprovação Apple
- **Desvantagem**: Requer conversão e manutenção adicional

#### Estratégia Recomendada
1. **Fase 1**: Google Play Store via TWA (mais fácil, barato, rápido)
2. **Fase 2**: Apple App Store via Capacitor (se houver demanda iOS significativa)

#### Status Atual
- ✅ PWA totalmente funcional e pronto para distribuição
- ✅ Manifest, ícones, service worker implementados
- ✅ Compatibilidade iOS/Android verificada
- 🎯 Pronto para empacotamento nas lojas quando solicitado