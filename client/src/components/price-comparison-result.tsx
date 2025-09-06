import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingDown, TrendingUp, ExternalLink, BarChart3 } from "lucide-react";
import { formatPriceWithCurrency } from "@/lib/priceUtils";

interface BrazilianPrice {
  storeName: string;
  price: string;
  currency: string;
  productUrl: string;
  availability: string;
}

interface ComparisonResultProps {
  productName: string;
  paraguayPrice: number;
  paraguayCurrency: string;
  paraguayStore: string;
  brazilianPrices: BrazilianPrice[];
  exchangeRate: number;
  savings?: {
    amount: number;
    percentage: number;
    bestStore: string;
    cheaperInBrazil?: boolean;
  };
  showDetailedResults?: boolean;
}

export function PriceComparisonResult({
  productName,
  paraguayPrice,
  paraguayCurrency,
  paraguayStore,
  brazilianPrices,
  exchangeRate,
  savings,
  showDetailedResults = false
}: ComparisonResultProps) {
  
  const calculateBestBrazilianPrice = () => {
    if (brazilianPrices.length === 0) return null;
    const minPrice = Math.min(...brazilianPrices.map(p => parseFloat(p.price)));
    const bestOffer = brazilianPrices.find(p => parseFloat(p.price) === minPrice);
    return { price: minPrice, store: bestOffer?.storeName || '' };
  };

  const bestBrazilianPrice = calculateBestBrazilianPrice();
  const paraguayPriceBRL = paraguayPrice * exchangeRate;

  return (
    <div className="space-y-6">
      {/* Resultado da Comparação - Layout Padrão */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <TrendingDown className="w-5 h-5" />
            Resultado da Comparação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            {/* Produto */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Produto</h4>
              <p className="text-sm">{productName}</p>
            </div>

            {/* Preço no Paraguay */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Preço no Paraguay</h4>
              <div className="space-y-1">
                <p className="text-lg font-bold text-green-600">
                  {formatPriceWithCurrency(paraguayPriceBRL.toFixed(2), 'R$')}
                </p>
                <p className="text-sm font-semibold text-green-500">
                  ≈ {formatPriceWithCurrency(paraguayPrice, paraguayCurrency)}
                </p>
              </div>
              <p className="text-xs text-gray-600">{paraguayStore}</p>
            </div>

            {/* Menor Preço no Brasil */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Menor Preço no Brasil</h4>
              {bestBrazilianPrice ? (
                <div className="space-y-1">
                  <p className="text-lg font-bold text-blue-600">
                    {formatPriceWithCurrency(bestBrazilianPrice.price.toFixed(2), 'R$')}
                  </p>
                  <p className="text-sm text-blue-500">
                    ≈ {formatPriceWithCurrency((bestBrazilianPrice.price / exchangeRate).toFixed(2), 'US$')}
                  </p>
                  <p className="text-xs text-gray-600">{bestBrazilianPrice.store}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Não encontrado</p>
              )}
            </div>

            {/* Economia Máxima */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Economia Máxima</h4>
              {bestBrazilianPrice && savings ? (
                savings.cheaperInBrazil ? (
                  <div>
                    <p className="text-lg font-bold text-blue-600">
                      Mais barato no Brasil
                    </p>
                    <p className="text-xs text-gray-600">
                      Item custa menos em {savings.bestStore}
                    </p>
                  </div>
                ) : savings.amount > 0 ? (
                  <div>
                    <p className="text-lg font-bold text-green-600">
                      {formatPriceWithCurrency(savings.amount, 'R$')}
                    </p>
                    <p className="text-xs text-gray-600">
                      {savings.percentage.toFixed(1)}% mais barato que {savings.bestStore}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-bold text-gray-500">
                      Preços similares
                    </p>
                    <p className="text-xs text-gray-600">
                      Não há diferença significativa
                    </p>
                  </div>
                )
              ) : (
                <p className="text-sm text-gray-500">Calculando...</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista Detalhada de Preços - Só mostra se solicitado */}
      {showDetailedResults && brazilianPrices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Preços encontrados no Brasil ({brazilianPrices.length} lojas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {brazilianPrices.map((price, index) => (
                <Card key={index} className="border-gray-200">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-gray-900">{price.storeName}</h5>
                          <Badge variant={price.availability === 'in_stock' ? 'default' : 'secondary'}>
                            {price.availability === 'in_stock' ? 'Disponível' : 'Consultar'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-1">{productName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-blue-600">
                          R$ {parseFloat(price.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        {price.productUrl && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-1 text-blue-600 border-blue-600 hover:bg-blue-50"
                            onClick={() => window.open(price.productUrl, '_blank')}
                            data-testid={`link-product-${index}`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Ver Loja
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}