import { Settings, ShoppingCart, BarChart3, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface MobileFooterMenuProps {
  className?: string;
}

export function MobileFooterMenu({ className = "" }: MobileFooterMenuProps) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden ${className}`}>
      <div className="flex items-center justify-around py-2 px-4">
        {/* Home */}
        <Link href="/">
          <button
            className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
            data-testid="button-mobile-home"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9,22 9,12 15,12 15,22"/>
            </svg>
            <span className="text-xs">Home</span>
          </button>
        </Link>
        
        {/* Lista de Compras */}
        <button
          onClick={() => setLocation('/shopping-list')}
          className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
          data-testid="button-mobile-shopping"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-xs">Lista</span>
        </button>
        
        {/* Comparar Preços */}
        <Link href="/price-comparison">
          <button
            className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
            data-testid="button-mobile-comparison"
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs">Comparar</span>
          </button>
        </Link>
        
        {/* Meus Cupons */}
        <button
          onClick={() => setLocation('/my-coupons')}
          className="flex flex-col items-center gap-1 p-2 text-gray-600 hover:text-primary"
          data-testid="button-mobile-coupons"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="18" rx="2" ry="2"/>
            <line x1="8" y1="2" x2="8" y2="22"/>
            <line x1="16" y1="2" x2="16" y2="22"/>
          </svg>
          <span className="text-xs">Cupons</span>
        </button>
        
        {/* Sair - Só aparece para usuários autenticados */}
        {isAuthenticated && (
          <button
            onClick={() => {
              window.location.href = '/api/logout';
            }}
            className="flex flex-col items-center gap-1 p-2 text-red-600 hover:text-red-700"
            data-testid="button-mobile-logout"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-xs">Sair</span>
          </button>
        )}
      </div>
    </div>
  );
}