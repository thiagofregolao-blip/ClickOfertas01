import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import GeminiAssistantBar from '@/components/GeminiAssistantBar';
import { ShoppingBag, Shield, Package, Sparkles, Loader2 } from 'lucide-react';
import type { HeroBanner } from '@shared/schema';

export default function TestAlibaba() {
  const [, setLocation] = useLocation();
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Estados para grid híbrido
  const [products, setProducts] = useState<any[]>([]);
  const [isAIResults, setIsAIResults] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const { data: banners, isLoading } = useQuery<HeroBanner[]>({
    queryKey: ['/api/public/hero-banners'],
  });
  
  // Buscar produtos das lojas por padrão
  useEffect(() => {
    if (!isAIResults) {
      fetch('/api/public/products-with-stores')
        .then(res => res.json())
        .then(data => {
          const productsData = Array.isArray(data) ? data.slice(0, 12) : [];
          setProducts(productsData);
          setLoadingProducts(false);
        })
        .catch(err => {
          console.error('Erro ao carregar produtos:', err);
          setLoadingProducts(false);
        });
    }
  }, [isAIResults]);
  
  // Event listener para resultados da IA
  useEffect(() => {
    const handleAIResults = (e: CustomEvent) => {
      if (e.detail?.products) {
        setProducts(e.detail.products);
        setIsAIResults(true);
        setLoadingProducts(false);
      }
    };
    
    const handleAIReset = () => {
      setIsAIResults(false);
      setLoadingProducts(true);
    };
    
    window.addEventListener('ai-search-results' as any, handleAIResults);
    window.addEventListener('ai-search-reset' as any, handleAIReset);
    
    return () => {
      window.removeEventListener('ai-search-results' as any, handleAIResults);
      window.removeEventListener('ai-search-reset' as any, handleAIReset);
    };
  }, []);

  const activeBanners = banners?.filter(b => b.isActive) || [];
  const currentBanner = activeBanners[currentBannerIndex];

  const defaultBanner = {
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&q=80',
    title: 'A plataforma de compras líder no turismo de compras do Paraguai',
    description: 'Conheça o Click Ofertas'
  };

  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % activeBanners.length);
    }, 10000); // 10 segundos de exibição

    return () => clearInterval(interval);
  }, [activeBanners.length, isPaused]);

  const handleDotClick = (index: number) => {
    setCurrentBannerIndex(index);
  };

  const displayBanner = currentBanner || defaultBanner;
  const showCarousel = activeBanners.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barra Promocional */}
      <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white text-center py-2 px-4 text-sm font-medium">
        🎉 Abasteça seu estoque para a melhor temporada de vendas: até 20% de DESCONTO
        <button className="ml-4 underline font-semibold hover:opacity-80">
          Explore agora →
        </button>
      </div>

      {/* Header */}
      <header className="bg-gray-900 text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-8">
              <button 
                onClick={() => setLocation('/')}
                className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent hover:opacity-80 transition"
              >
                Click Ofertas
              </button>

              {/* Navigation */}
              <nav className="hidden md:flex items-center space-x-6 text-sm">
                <a href="#" className="hover:text-orange-400 transition">Todas as categorias</a>
                <a href="#" className="hover:text-orange-400 transition">Seleções em destaque</a>
                <a href="#" className="hover:text-orange-400 transition">Proteções para pedidos</a>
                <a href="#" className="hover:text-orange-400 transition">Central dos Compradores</a>
                <a href="#" className="hover:text-orange-400 transition">Atendimento</a>
              </nav>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              <div className="text-xs">
                <span className="opacity-75">Local de entrega:</span>
                <br />
                <span className="font-semibold">🇵🇾 PY</span>
              </div>
              <button className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 px-6 py-2 rounded-full font-semibold text-sm transition shadow-lg">
                Entrar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Automatic Carousel */}
      <section 
        className="relative bg-cover bg-center bg-no-repeat overflow-hidden"
        style={{
          minHeight: '75vh'
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        data-testid="hero-carousel-section"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBannerIndex}
            className="absolute inset-0"
          >
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url('${displayBanner.imageUrl}')`,
              }}
            />
            <motion.div
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="absolute inset-0 bg-black"
            />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-24">
          <div className="max-w-[900px]">
            {/* Label */}
            <motion.div 
              key={`label-${currentBannerIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex items-center space-x-2 text-white mb-4"
            >
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">
                {showCarousel && currentBanner?.description ? currentBanner.description : 'Conheça o Click Ofertas'}
              </span>
            </motion.div>

            {/* Título Dinâmico */}
            <motion.h1 
              key={`title-${currentBannerIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight drop-shadow-2xl"
            >
              {displayBanner.title}
            </motion.h1>

            {/* Barra Gemini - Integrada inline */}
            <div className="mb-6">
              <GeminiAssistantBar />
            </div>

            {/* Tags de buscas frequentes */}
            <div className="flex items-center flex-wrap gap-3">
              <span className="text-white text-sm font-medium">Buscas frequentes:</span>
              <button className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-2 rounded-full text-sm hover:bg-white/30 transition">
                Eletrônicos
              </button>
              <button className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-2 rounded-full text-sm hover:bg-white/30 transition">
                Perfumes
              </button>
              <button className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-2 rounded-full text-sm hover:bg-white/30 transition">
                Celulares
              </button>
              <button className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-2 rounded-full text-sm hover:bg-white/30 transition">
                Roupas
              </button>
            </div>
          </div>
        </div>

        {/* Indicadores de navegação (dots) */}
        {activeBanners.length > 1 && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex space-x-3">
            {activeBanners.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                  currentBannerIndex === index
                    ? 'scale-125 bg-white'
                    : 'bg-white/50 hover:bg-white/70'
                }`}
                aria-label={`Ir para banner ${index + 1}`}
                data-testid={`banner-dot-${index}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Grid Híbrido Glassmorphism */}
      <section className="relative -mt-48 z-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="backdrop-blur-lg bg-white/90 dark:bg-gray-900/90 border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl p-8">
            {/* Header do Grid */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isAIResults ? '🤖 Resultados Click AI' : '🛍️ Produtos em Destaque'}
              </h2>
              {isAIResults && (
                <button
                  onClick={() => {
                    setIsAIResults(false);
                    setLoadingProducts(true);
                  }}
                  className="text-sm text-primary hover:text-primary/80 font-medium"
                >
                  ← Voltar para produtos
                </button>
              )}
            </div>
            
            {/* Loading State */}
            {loadingProducts && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Carregando produtos...</span>
              </div>
            )}
            
            {/* Grid de Produtos */}
            {!loadingProducts && products.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((product, index) => (
                  <div
                    key={product.id || index}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group"
                  >
                    <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
                      <img
                        src={product.imageUrl || '/placeholder-product.jpg'}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-2 line-clamp-2">
                        {product.name}
                      </h3>
                      {product.price && (
                        <p className="text-primary font-bold text-lg">
                          ${typeof product.price === 'object' ? product.price.USD : product.price}
                        </p>
                      )}
                      {product.storeName && (
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                          {product.storeName}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Empty State */}
            {!loadingProducts && products.length === 0 && (
              <div className="text-center py-16">
                <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Nenhum produto encontrado
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Tente fazer uma nova pesquisa
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Seção de Benefícios */}
      <section className="bg-gradient-to-br from-gray-800 via-gray-900 to-black py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Card 1 */}
            <div className="text-center text-white">
              <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/10">
                <ShoppingBag className="w-10 h-10 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Milhares de ofertas de negócios</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Explore produtos e fornecedores para o seu negócio com milhares de opções disponíveis
              </p>
            </div>

            {/* Card 2 */}
            <div className="text-center text-white">
              <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/10">
                <Shield className="w-10 h-10 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Qualidade e transações garantidas</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Compre de fornecedores verificados com garantia de qualidade e segurança
              </p>
            </div>

            {/* Card 3 */}
            <div className="text-center text-white">
              <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/10">
                <Package className="w-10 h-10 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">A solução completa para o turismo</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Faça e gerencie seus pedidos facilmente, desde a busca até a compra na loja física
              </p>
            </div>

            {/* Card 4 */}
            <div className="text-center text-white">
              <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/10">
                <Sparkles className="w-10 h-10 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">Experiência com o comércio eletrônico personalizada</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Beneficie-se de descontos exclusivos e economia garantida em suas compras
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Voltar ao App */}
      <div className="bg-white py-8 text-center">
        <button 
          onClick={() => setLocation('/')}
          className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-8 py-3 rounded-full font-semibold shadow-lg transition"
        >
          ← Voltar ao Click Ofertas
        </button>
      </div>
    </div>
  );
}
