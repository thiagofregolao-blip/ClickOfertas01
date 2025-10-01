import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useState, useMemo } from "react";
import { Search, MapPin, Phone, Clock, Store as StoreIcon, Package, TrendingUp, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import type { Store, Product } from "@shared/schema";

type StoreWithProducts = Store & {
  products: Product[];
  totalProducts?: number;
};

export default function StoreProfile() {
  const [, params] = useRoute("/store/:slug");
  const slug = params?.slug;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "new" | "promo" | "bestseller">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const { data: store, isLoading } = useQuery<StoreWithProducts>({
    queryKey: ["/api/public/stores", slug],
    enabled: !!slug,
  });

  const filteredProducts = useMemo(() => {
    if (!store?.products) return [];

    let filtered = [...store.products];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term) ||
          p.category?.toLowerCase().includes(term)
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (selectedFilter === "new") {
      filtered = filtered.sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    } else if (selectedFilter === "promo") {
      filtered = filtered.filter((p) => p.isScratchCard || p.scratchPrice);
    } else if (selectedFilter === "bestseller") {
      filtered = filtered.filter((p) => p.isFeatured);
    }

    return filtered;
  }, [store?.products, searchTerm, selectedCategory, selectedFilter]);

  const categories = useMemo(() => {
    if (!store?.products) return [];
    const catMap = new Map<string, number>();
    store.products.forEach((p) => {
      const cat = p.category || "Outros";
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
    });
    return Array.from(catMap.entries()).map(([name, count]) => ({ name, count }));
  }, [store?.products]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const hasDiscount = (product: Product) => {
    return product.scratchPrice && parseFloat(product.scratchPrice.toString()) < parseFloat(product.price.toString());
  };

  const getDiscountPercentage = (product: Product) => {
    if (!hasDiscount(product)) return 0;
    const original = parseFloat(product.price.toString());
    const discounted = parseFloat(product.scratchPrice!.toString());
    return Math.round(((original - discounted) / original) * 100);
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f1114", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#b7bdc6" }}>Carregando...</div>
      </div>
    );
  }

  if (!store) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f1114", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#b7bdc6" }}>Loja não encontrada</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f1114",
        color: "#fff",
        "--bg-dark": "#0f1114",
        "--card": "#151922",
        "--border": "rgba(255,255,255,.08)",
        "--brand": "#ff7a00",
        "--brand-2": "#ff4d4f",
        "--muted": "#b7bdc6",
      } as React.CSSProperties}
    >
      {/* Hero Section */}
      <div
        style={{
          background: "var(--card)",
          borderBottom: "1px solid var(--border)",
          padding: "32px 24px",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
            {/* Logo */}
            {store.logoUrl && (
              <img
                src={store.logoUrl}
                alt={store.name}
                data-testid="img-store-logo"
                style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "12px",
                  objectFit: "cover",
                  border: "2px solid var(--border)",
                }}
              />
            )}

            {/* Store Info */}
            <div style={{ flex: 1 }}>
              <h1
                data-testid="text-store-name"
                style={{
                  fontSize: "32px",
                  fontWeight: "700",
                  marginBottom: "8px",
                  color: "#fff",
                }}
              >
                {store.name}
              </h1>
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: "14px",
                  marginBottom: "16px",
                }}
              >
                {store.address || "Loja oficial"}
              </p>

              {/* Metrics */}
              <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Package size={20} style={{ color: "var(--brand)" }} />
                  <span data-testid="text-product-count" style={{ color: "var(--muted)", fontSize: "14px" }}>
                    {store.products?.length || 0} produtos
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <TrendingUp size={20} style={{ color: "#10b981" }} />
                  <span style={{ color: "var(--muted)", fontSize: "14px" }}>Loja verificada</span>
                </div>
              </div>
            </div>

            {/* Badges */}
            {store.isPremium && (
              <div
                style={{
                  background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                <Sparkles size={16} />
                Premium
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar + Filters */}
      <div
        style={{
          background: "var(--bg-dark)",
          padding: "24px",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Search Input */}
          <div style={{ marginBottom: "16px", position: "relative" }}>
            <Search
              size={20}
              style={{
                position: "absolute",
                left: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
              }}
            />
            <input
              type="text"
              data-testid="input-search-products"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 16px 14px 48px",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "15px",
                outline: "none",
              }}
            />
          </div>

          {/* Filter Chips */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {(["all", "new", "promo", "bestseller"] as const).map((filter) => (
              <button
                key={filter}
                data-testid={`button-filter-${filter}`}
                onClick={() => setSelectedFilter(filter)}
                style={{
                  padding: "8px 20px",
                  background: selectedFilter === filter ? "var(--brand)" : "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "20px",
                  color: selectedFilter === filter ? "#fff" : "var(--muted)",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {filter === "all" && "Todos"}
                {filter === "new" && "Novidades"}
                {filter === "promo" && "Promoções"}
                {filter === "bestseller" && "Mais vendidos"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: Sidebar + Products Grid */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
        <div style={{ display: "flex", gap: "24px" }}>
          {/* Sidebar - Hidden on mobile/tablet */}
          <aside
            style={{
              width: "280px",
              flexShrink: 0,
            }}
            className="store-sidebar"
          >
            {/* Store Info Panel */}
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <StoreIcon size={18} style={{ color: "var(--brand)" }} />
                Informações da Loja
              </h3>
              {store.address && (
                <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                  <MapPin size={18} style={{ color: "var(--muted)", flexShrink: 0 }} />
                  <span style={{ color: "var(--muted)", fontSize: "14px" }}>{store.address}</span>
                </div>
              )}
              {store.whatsapp && (
                <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                  <Phone size={18} style={{ color: "var(--muted)", flexShrink: 0 }} />
                  <span style={{ color: "var(--muted)", fontSize: "14px" }}>{store.whatsapp}</span>
                </div>
              )}
              <div style={{ display: "flex", gap: "12px" }}>
                <Clock size={18} style={{ color: "var(--muted)", flexShrink: 0 }} />
                <span style={{ color: "var(--muted)", fontSize: "14px" }}>Seg-Sáb: 8h-18h</span>
              </div>
            </div>

            {/* Categories Panel */}
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "16px",
                }}
              >
                Categorias
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button
                  data-testid="button-category-all"
                  onClick={() => setSelectedCategory("all")}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: selectedCategory === "all" ? "rgba(255,122,0,0.1)" : "transparent",
                    border: "none",
                    borderRadius: "8px",
                    color: selectedCategory === "all" ? "var(--brand)" : "var(--muted)",
                    fontSize: "14px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "left",
                  }}
                >
                  <span>Todos</span>
                  <span style={{ fontWeight: "600" }}>{store.products?.length || 0}</span>
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    data-testid={`button-category-${cat.name}`}
                    onClick={() => setSelectedCategory(cat.name)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      background: selectedCategory === cat.name ? "rgba(255,122,0,0.1)" : "transparent",
                      border: "none",
                      borderRadius: "8px",
                      color: selectedCategory === cat.name ? "var(--brand)" : "var(--muted)",
                      fontSize: "14px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "left",
                    }}
                  >
                    <span>{cat.name}</span>
                    <span style={{ fontWeight: "600" }}>{cat.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Support Panel */}
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "12px",
                }}
              >
                Atendimento
              </h3>
              <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "16px" }}>
                Entre em contato conosco via WhatsApp
              </p>
              {store.whatsapp && (
                <a
                  href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="button-whatsapp"
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "12px",
                    background: "#25D366",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: "600",
                    textAlign: "center",
                    textDecoration: "none",
                    cursor: "pointer",
                  }}
                >
                  Falar no WhatsApp
                </a>
              )}
            </div>
          </aside>

          {/* Products Grid */}
          <main style={{ flex: 1 }}>
            {paginatedProducts.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "64px 24px",
                  color: "var(--muted)",
                }}
              >
                <Package size={48} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
                <p>Nenhum produto encontrado</p>
              </div>
            ) : (
              <>
                <div
                  className="products-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "20px",
                    marginBottom: "32px",
                  }}
                >
                  {paginatedProducts.map((product) => (
                    <Link
                      key={product.id}
                      href={`/product/${product.id}`}
                      data-testid={`card-product-${product.id}`}
                    >
                      <div
                        style={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
                          overflow: "hidden",
                          cursor: "pointer",
                          transition: "all 0.3s",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                        }}
                        className="product-card"
                      >
                        {/* Product Image */}
                        <div style={{ position: "relative", paddingTop: "100%", overflow: "hidden" }}>
                          <img
                            src={product.imageUrl || "/placeholder.png"}
                            alt={product.name}
                            data-testid={`img-product-${product.id}`}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                          {hasDiscount(product) && (
                            <div
                              style={{
                                position: "absolute",
                                top: "12px",
                                right: "12px",
                                background: "var(--brand-2)",
                                color: "#fff",
                                padding: "4px 12px",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: "700",
                              }}
                            >
                              -{getDiscountPercentage(product)}%
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column" }}>
                          <h3
                            data-testid={`text-product-name-${product.id}`}
                            style={{
                              fontSize: "15px",
                              fontWeight: "600",
                              marginBottom: "8px",
                              color: "#fff",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              minHeight: "40px",
                            }}
                          >
                            {product.name}
                          </h3>

                          <div style={{ marginTop: "auto" }}>
                            {hasDiscount(product) ? (
                              <>
                                <div
                                  style={{
                                    fontSize: "13px",
                                    color: "var(--muted)",
                                    textDecoration: "line-through",
                                    marginBottom: "4px",
                                  }}
                                >
                                  {store.currency} {parseFloat(product.price.toString()).toLocaleString('pt-BR')}
                                </div>
                                <div
                                  data-testid={`text-price-${product.id}`}
                                  style={{
                                    fontSize: "20px",
                                    fontWeight: "700",
                                    color: "var(--brand)",
                                  }}
                                >
                                  {store.currency} {parseFloat(product.scratchPrice!.toString()).toLocaleString('pt-BR')}
                                </div>
                              </>
                            ) : (
                              <div
                                data-testid={`text-price-${product.id}`}
                                style={{
                                  fontSize: "20px",
                                  fontWeight: "700",
                                  color: "var(--brand)",
                                }}
                              >
                                {store.currency} {parseFloat(product.price.toString()).toLocaleString('pt-BR')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "12px",
                      marginTop: "32px",
                    }}
                  >
                    <button
                      data-testid="button-prev-page"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: "10px 16px",
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        color: currentPage === 1 ? "var(--muted)" : "#fff",
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        opacity: currentPage === 1 ? 0.5 : 1,
                      }}
                    >
                      <ChevronLeft size={18} />
                      Anterior
                    </button>

                    <div style={{ display: "flex", gap: "8px" }}>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          data-testid={`button-page-${page}`}
                          onClick={() => setCurrentPage(page)}
                          style={{
                            padding: "10px 16px",
                            background: currentPage === page ? "var(--brand)" : "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            color: currentPage === page ? "#fff" : "var(--muted)",
                            cursor: "pointer",
                            fontWeight: currentPage === page ? "600" : "400",
                          }}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      data-testid="button-next-page"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: "10px 16px",
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        color: currentPage === totalPages ? "var(--muted)" : "#fff",
                        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        opacity: currentPage === totalPages ? 0.5 : 1,
                      }}
                    >
                      Próxima
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 1100px) {
          .store-sidebar {
            display: none;
          }
          .products-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .products-grid {
            grid-template-columns: 1fr !important;
          }
        }
        .product-card:hover {
          transform: translateY(-4px);
          border-color: var(--brand);
          box-shadow: 0 8px 24px rgba(255, 122, 0, 0.15);
        }
      `}</style>
    </div>
  );
}
