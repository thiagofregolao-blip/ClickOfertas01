import { useState } from "react";
import { TwoPartHeader } from "@/components/TwoPartHeader";
import { Button } from "@/components/ui/button";
import { User, Settings, ShoppingCart, LogOut, Smartphone, Droplets, Laptop, Monitor, Grid } from "lucide-react";

// Função para obter ícone da categoria (copiada do stores-gallery)
function getCategoryIcon(slug: string) {
  switch (slug.toLowerCase()) {
    case 'celulares':
      return <Smartphone className="w-4 h-4" />;
    case 'perfumes':
      return <Droplets className="w-4 h-4" />;
    case 'notebooks':
      return <Laptop className="w-4 h-4" />;
    case 'tvs':
      return <Monitor className="w-4 h-4" />;
    default:
      return <Grid className="w-4 h-4" />;
  }
}

/**
 * Exemplo de uso do componente TwoPartHeader
 * Mostra como usar o header com diferentes opções de customização
 */
export function TwoPartHeaderExample() {
  const [searchValue, setSearchValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [notificationCount] = useState(5);
  
  // Dados de exemplo para categorias
  const categories = [
    { id: '1', name: 'Celulares', slug: 'celulares' },
    { id: '2', name: 'Perfumes', slug: 'perfumes' },
    { id: '3', name: 'Notebooks', slug: 'notebooks' },
    { id: '4', name: 'TVs', slug: 'tvs' }
  ];

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    console.log('Busca alterada:', value);
  };

  const handleNotificationClick = () => {
    console.log('Notificações clicadas');
  };

  const handleCategoryFilter = (category: string | null) => {
    setSelectedCategory(category);
    console.log('Categoria selecionada:', category);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TwoPartHeader
        title="Click Ofertas.PY"
        showSearch={true}
        searchValue={searchValue}
        searchPlaceholder="Buscar produtos ou lojas..."
        onSearchChange={handleSearchChange}
        showNotifications={true}
        notificationCount={notificationCount}
        onNotificationClick={handleNotificationClick}
        gradient="linear-gradient(135deg, #F04940 0%, #FA7D22 100%)"
        scrollThreshold={100}
      >
        {/* Menu customizado com categorias */}
        <div className="flex items-center gap-4">
          {/* Saudação de exemplo */}
          <div className="text-white font-medium flex items-center gap-2">
            <User className="w-5 h-5" />
            <span className="text-sm">Olá, Usuário</span>
          </div>
          
          {/* Botões do menu */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-gray-200 font-medium flex items-center gap-1 text-sm"
              data-testid="button-settings-example"
            >
              <Settings className="w-4 h-4" />
              Configurações
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-gray-200 font-medium flex items-center gap-1 text-sm"
              data-testid="button-shopping-list-example"
            >
              <ShoppingCart className="w-4 h-4" />
              Lista de Compras
            </Button>

            {/* Separador visual */}
            <span className="text-gray-400 text-sm">|</span>
            
            {/* Botão "Todos" */}
            <button
              onClick={() => handleCategoryFilter(null)}
              className={`font-medium flex items-center gap-1 text-sm px-2 py-1 rounded transition-colors ${
                selectedCategory === null
                  ? 'bg-yellow-400 text-gray-900 shadow-sm'
                  : 'text-white hover:text-gray-200'
              }`}
              data-testid="button-category-todos-example"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
              Todos
            </button>
            
            {/* Categorias */}
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryFilter(category.slug)}
                className={`font-medium flex items-center gap-1 text-sm px-2 py-1 rounded transition-colors ${
                  selectedCategory === category.slug
                    ? 'bg-yellow-400 text-gray-900 shadow-sm'
                    : 'text-white hover:text-gray-200'
                }`}
                data-testid={`button-category-${category.slug}-example`}
              >
                {getCategoryIcon(category.slug)}
                {category.name}
              </button>
            ))}
            
            <Button
              variant="ghost"
              size="sm"
              className="text-red-300 hover:text-red-100 font-medium flex items-center gap-1 text-sm"
              data-testid="button-logout-example"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </TwoPartHeader>

      {/* Conteúdo da página com padding-top para compensar o header fixo */}
      <div className="pt-32 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Exemplo do TwoPartHeader
          </h1>
          
          <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
            <h2 className="text-xl font-semibold mb-4">Estado atual:</h2>
            <div className="space-y-2">
              <p><strong>Busca:</strong> {searchValue || 'Nenhuma busca'}</p>
              <p><strong>Categoria selecionada:</strong> {selectedCategory || 'Todas'}</p>
              <p><strong>Notificações:</strong> {notificationCount} não lidas</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
            <h2 className="text-xl font-semibold mb-4">Funcionalidades:</h2>
            <ul className="space-y-2 text-gray-700">
              <li>✅ Header fixo com gradiente customizável</li>
              <li>✅ Busca com placeholder dinâmico</li>
              <li>✅ Notificações com badge de contagem</li>
              <li>✅ Menu deslizante baseado no scroll</li>
              <li>✅ Categorias e filtros customizáveis</li>
              <li>✅ Responsivo e acessível</li>
            </ul>
          </div>

          {/* Conteúdo longo para testar scroll */}
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm mb-4">
              <h3 className="text-lg font-semibold mb-2">Seção {i + 1}</h3>
              <p className="text-gray-600">
                Esta é uma seção de conteúdo para testar o comportamento de scroll do header.
                Role a página para cima e para baixo para ver o menu deslizante em ação.
                O menu deve desaparecer quando você rola para baixo e aparecer quando rola para cima.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}