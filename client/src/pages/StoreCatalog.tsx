import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Heart, Save, TrendingUp, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Product } from "@shared/schema";

// Taxa de câmbio USD para BRL (fictícia para demo - pode vir de API)
const USD_BRL_RATE = 5.40;

// Tipo para produto com informações da loja (apenas os campos retornados pela API)
type ProductWithStore = Omit<Product, 'imageUrl2' | 'imageUrl3' | 'gtin' | 'productCode' | 'sourceType' | 'isFeatured' | 'showInStories' | 'showInTotem' | 'sortOrder' | 'isScratchCard' | 'scratchPrice' | 'scratchExpiresAt' | 'scratchTimeLimitMinutes' | 'maxScratchRedemptions' | 'currentScratchRedemptions' | 'scratchMessage'> & {
  store: {
    id: string;
    name: string;
    logoUrl: string | null;
    themeColor: string | null;
    currency: string | null;
    slug: string | null;
    isPremium: boolean | null;
  };
};

export default function StoreCatalog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [likedProducts, setLikedProducts] = useState<Set<string>>(
    new Set(JSON.parse(localStorage.getItem('likedProducts') || '[]'))
  );
  const [savedProducts, setSavedProducts] = useState<Set<string>>(
    new Set(JSON.parse(localStorage.getItem('savedProducts') || '[]'))
  );
  const [compareProduct, setCompareProduct] = useState<ProductWithStore | null>(null);
  const [brPrice, setBrPrice] = useState("");
  const [comparison, setComparison] = useState<{diff: number; pct: number} | null>(null);
  
  const perPage = 9;

  // Buscar produtos do backend
  const { data: allProducts = [], isLoading } = useQuery<ProductWithStore[]>({
    queryKey: ['/api/public/products-with-stores'],
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  // Filtrar produtos por busca
  const filteredProducts = allProducts.filter(product => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      product.category?.toLowerCase().includes(query) ||
      product.store.name.toLowerCase().includes(query)
    );
  });

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / perPage));
  const startIndex = (currentPage - 1) * perPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + perPage);

  // Formatar moedas
  const fmtUSD = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const fmtBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const toBRL = (usd: string | number) => {
    const num = typeof usd === 'string' ? parseFloat(usd) : usd;
    return num * USD_BRL_RATE;
  };

  // Toggle like/save
  const toggleLike = (id: string) => {
    const newLiked = new Set(likedProducts);
    if (newLiked.has(id)) {
      newLiked.delete(id);
    } else {
      newLiked.add(id);
    }
    setLikedProducts(newLiked);
    localStorage.setItem('likedProducts', JSON.stringify([...newLiked]));
  };

  const toggleSave = (id: string) => {
    const newSaved = new Set(savedProducts);
    if (newSaved.has(id)) {
      newSaved.delete(id);
    } else {
      newSaved.add(id);
    }
    setSavedProducts(newSaved);
    localStorage.setItem('savedProducts', JSON.stringify([...newSaved]));
  };

  // Comparar preço
  const openCompare = (product: ProductWithStore) => {
    setCompareProduct(product);
    setBrPrice("");
    setComparison(null);
  };

  const doCompare = () => {
    if (!compareProduct || !brPrice) return;
    
    const priceInBRL = toBRL(compareProduct.price);
    const brPriceNum = parseFloat(brPrice);
    const diff = brPriceNum - priceInBRL;
    const pct = (diff / priceInBRL) * 100;
    
    setComparison({ diff, pct });
  };

  return (
    <div className="min-h-screen bg-[#0e1116] text-[#eef2f7]">
      {/* Promo Banner */}
      <div className="bg-red-500 text-white text-center py-2 px-4 font-bold">
        Este site <strong>não vende</strong>; exibimos preços em US$ e R$ para pesquisa e comparação.
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 px-6 py-3.5 border-b border-white/8 bg-gradient-to-b from-[#0e1116]/95 to-[#0e1116]/75 backdrop-blur-sm">
        <div className="flex items-center gap-2.5 font-extrabold">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff7a00]"></span>
          <span>Marketplace Explorer</span>
        </div>
        <div className="opacity-85">Somente apresentação de preços</div>
      </header>

      {/* Tools */}
      <div className="max-w-[1200px] mx-auto px-5 py-3.5 grid grid-cols-[1fr_auto] gap-2.5 border-b border-white/8 bg-[#141a23]/60">
        <div className="flex border border-white/8 bg-[#0c1118] rounded-xl overflow-hidden">
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar itens..."
            className="flex-1 bg-transparent border-none text-white px-4 py-2.5"
            data-testid="input-search-catalog"
          />
          <Button
            onClick={() => {}}
            className="bg-[#ff7a00] hover:bg-[#ff7a00]/90 font-extrabold px-4"
            data-testid="button-search-catalog"
          >
            Buscar
          </Button>
        </div>
        <div className="border border-white/8 rounded-xl bg-[#0c1118] text-white px-3 py-2.5 flex items-center gap-2">
          1 US$ = <span className="font-semibold">{fmtBRL(USD_BRL_RATE)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-5 py-5">
        {isLoading ? (
          <div className="text-center py-12">Carregando produtos...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-[#b8c0cc]">
            {searchQuery ? 'Nenhum produto encontrado para sua busca.' : 'Nenhum produto disponível.'}
          </div>
        ) : (
          <>
            {/* Grid de Produtos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5" data-testid="grid-products">
              {paginatedProducts.map((product) => {
                const isLiked = likedProducts.has(product.id);
                const isSaved = savedProducts.has(product.id);
                const priceUSD = parseFloat(product.price);
                const priceBRL = toBRL(product.price);

                return (
                  <article
                    key={product.id}
                    className="bg-[#141a23] border border-white/8 rounded-2xl overflow-hidden flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-2xl"
                    data-testid={`card-product-${product.id}`}
                  >
                    {/* Imagem */}
                    <div className="bg-[#0a0f15]">
                      <img
                        src={product.imageUrl || 'https://placehold.co/640x480/1a1a1a/666?text=Sem+Imagem'}
                        alt={product.name}
                        className="block w-full aspect-[4/3] object-cover"
                        data-testid={`img-product-${product.id}`}
                      />
                    </div>

                    {/* Conteúdo */}
                    <div className="p-3.5 grid gap-2 flex-1">
                      <div className="font-extrabold" data-testid={`text-name-${product.id}`}>
                        {product.name}
                      </div>
                      <div className="text-[#b8c0cc] text-sm" data-testid={`text-store-${product.id}`}>
                        {product.store.name}
                      </div>
                      <div className="flex justify-between items-baseline gap-2.5">
                        <div className="font-black text-lg" data-testid={`text-price-usd-${product.id}`}>
                          {fmtUSD(priceUSD)}
                        </div>
                        <div className="text-[#b8c0cc]" data-testid={`text-price-brl-${product.id}`}>
                          {fmtBRL(priceBRL)}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 p-3.5 border-t border-white/8">
                      <Button
                        onClick={() => toggleSave(product.id)}
                        variant="ghost"
                        className={`flex-1 border border-white/8 ${isSaved ? 'bg-[#ff7a00]/18 border-[#ff7a00]/35' : 'bg-white/2'} rounded-lg px-3 py-2 flex items-center justify-center gap-1.5 text-sm`}
                        data-testid={`button-save-${product.id}`}
                      >
                        <Save className="w-4 h-4" /> {isSaved ? 'Salvo' : 'Salvar'}
                      </Button>
                      <Button
                        onClick={() => toggleLike(product.id)}
                        variant="ghost"
                        className={`flex-1 border border-white/8 ${isLiked ? 'bg-[#ff7a00]/18 border-[#ff7a00]/35' : 'bg-white/2'} rounded-lg px-3 py-2 flex items-center justify-center gap-1.5 text-sm`}
                        data-testid={`button-like-${product.id}`}
                      >
                        <Heart className="w-4 h-4" /> {isLiked ? 'Curtido' : 'Curtir'}
                      </Button>
                      <Button
                        onClick={() => openCompare(product)}
                        variant="ghost"
                        className="flex-1 border border-white/8 bg-white/2 rounded-lg px-3 py-2 flex items-center justify-center gap-1.5 text-sm"
                        data-testid={`button-compare-${product.id}`}
                      >
                        🇧🇷 Comparar
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex gap-2 justify-center mt-5.5" data-testid="pagination">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    variant="ghost"
                    className={`${page === currentPage ? 'bg-[#ff7a00] text-[#0c0a09] border-transparent font-extrabold' : 'bg-transparent border border-white/8 text-[#e6eaf0]'} px-3.5 py-2 rounded-lg`}
                    data-testid={`button-page-${page}`}
                  >
                    {page}
                  </Button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Comparar */}
      <Dialog open={!!compareProduct} onOpenChange={(open) => !open && setCompareProduct(null)}>
        <DialogContent className="bg-[#141a23] border border-white/8 text-white">
          <DialogHeader>
            <DialogTitle className="font-extrabold">Comparar com preço no Brasil</DialogTitle>
          </DialogHeader>
          
          {compareProduct && (
            <div className="grid gap-2.5 pt-2">
              <div className="flex justify-between items-center gap-2">
                <div className="border border-white/8 rounded-lg px-2.5 py-1.5 text-sm">
                  {compareProduct.name}
                </div>
                <div className="border border-white/8 rounded-lg px-2.5 py-1.5 text-sm">
                  USD: <strong>{fmtUSD(parseFloat(compareProduct.price))}</strong> · BRL: <strong>{fmtBRL(toBRL(compareProduct.price))}</strong>
                </div>
              </div>
              
              <div className="grid gap-1.5">
                <Label htmlFor="brPrice" className="text-sm">
                  Informe o preço no Brasil (R$)
                </Label>
                <Input
                  id="brPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex.: 1299.90"
                  value={brPrice}
                  onChange={(e) => setBrPrice(e.target.value)}
                  className="border border-white/8 bg-[#0c1118] text-white rounded-lg px-3 py-2"
                  data-testid="input-br-price"
                />
              </div>
              
              {comparison && (
                <div className="flex gap-2.5">
                  <div className={`border ${comparison.diff < 0 ? 'border-green-500/35 bg-green-500/10' : 'border-yellow-500/35 bg-yellow-500/10'} rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-sm`}>
                    {comparison.diff < 0 ? <TrendingDown className="w-4 h-4 text-green-500" /> : <TrendingUp className="w-4 h-4 text-yellow-500" />}
                    {comparison.diff < 0 ? 'Mais barato aqui: ' : 'Mais caro aqui: '} 
                    <strong>{fmtBRL(Math.abs(comparison.diff))}</strong>
                  </div>
                  <div className={`border ${comparison.diff < 0 ? 'border-green-500/35 bg-green-500/10' : 'border-yellow-500/35 bg-yellow-500/10'} rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-sm`}>
                    {comparison.diff < 0 ? '↓' : '↑'} <strong>{Math.abs(comparison.pct).toFixed(1)}%</strong>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  onClick={doCompare}
                  className="bg-[#ff7a00] hover:bg-[#ff7a00]/90 font-extrabold"
                  data-testid="button-calculate-compare"
                >
                  Calcular
                </Button>
                <Button
                  onClick={() => setCompareProduct(null)}
                  variant="ghost"
                  className="border border-white/8"
                  data-testid="button-close-compare"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
