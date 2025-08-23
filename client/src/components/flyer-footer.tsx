import type { Store } from "@shared/schema";

interface FlyerFooterProps {
  store: Store;
  onWhatsAppClick?: () => void;
  onInstagramClick?: () => void;
}

export default function FlyerFooter({ store, onWhatsAppClick, onInstagramClick }: FlyerFooterProps) {
  return (
    <div className="bg-gray-900 text-white p-8 rounded-b-2xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* WhatsApp */}
        {store.whatsapp && (
          <div className="text-center md:text-left">
            <h4 className="font-semibold mb-2 flex items-center justify-center md:justify-start">
              <svg className="w-5 h-5 mr-2 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.51 3.097"/>
              </svg>
              WhatsApp
            </h4>
            {onWhatsAppClick ? (
              <button 
                onClick={onWhatsAppClick}
                className="text-green-400 hover:text-green-300 transition-colors"
              >
                {store.whatsapp}
              </button>
            ) : (
              <span className="text-green-400">{store.whatsapp}</span>
            )}
          </div>
        )}
        
        {/* Instagram */}
        {store.instagram && (
          <div className="text-center">
            <h4 className="font-semibold mb-2 flex items-center justify-center">
              <svg className="w-5 h-5 mr-2 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.611-3.197-1.559-.748-.948-.748-2.212 0-3.16.748-.948 1.9-1.559 3.197-1.559s2.448.611 3.197 1.559c.748.948.748 2.212 0 3.16-.749.948-1.9 1.559-3.197 1.559zm7.138 0c-1.297 0-2.448-.611-3.197-1.559-.748-.948-.748-2.212 0-3.16.748-.948 1.9-1.559 3.197-1.559s2.448.611 3.197 1.559c.748.948.748 2.212 0 3.16-.748.948-1.9 1.559-3.197 1.559z"/>
              </svg>
              Instagram
            </h4>
            {onInstagramClick ? (
              <button 
                onClick={onInstagramClick}
                className="text-pink-400 hover:text-pink-300 transition-colors"
              >
                {store.instagram}
              </button>
            ) : (
              <span className="text-pink-400">{store.instagram}</span>
            )}
          </div>
        )}
        
        {/* Address */}
        {store.address && (
          <div className="text-center md:text-right">
            <h4 className="font-semibold mb-2 flex items-center justify-center md:justify-end">
              <svg className="w-5 h-5 mr-2 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              Endereço
            </h4>
            <p className="text-blue-400 whitespace-pre-line">
              {store.address}
            </p>
          </div>
        )}
      </div>
      
      <div className="border-t border-gray-700 mt-6 pt-6 text-center">
        <p className="text-gray-400">
          Promoções válidas até acabar o estoque • Gerado por{' '}
          <span className="text-primary font-semibold">Panfleto Rápido</span>
        </p>
      </div>
    </div>
  );
}
