import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Database, 
  Upload, 
  Trash2, 
  Eye, 
  Package, 
  FileText,
  Download,
  CheckCircle,
  AlertCircle,
  Clock
} from "lucide-react";

interface ProductBank {
  id: string;
  name: string;
  filename: string;
  size: number;
  productCount: number;
  uploadedAt: string;
  processedAt?: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
}

interface BankProduct {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  brand?: string;
  sku?: string;
  imageUrl?: string;
}

const isUnauthorizedError = (error: any) => {
  return error?.message?.includes('Unauthorized') || error?.status === 401;
};

export default function ProductBankManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBank, setSelectedBank] = useState<ProductBank | null>(null);
  const [viewingProducts, setViewingProducts] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Query para buscar bancos de produtos
  const { data: productBanks = [], isLoading: banksLoading } = useQuery<ProductBank[]>({
    queryKey: ['/api/admin/product-banks'],
    enabled: !!user?.isSuperAdmin,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => !isUnauthorizedError(error),
  });

  // Query para buscar produtos de um banco específico
  const { data: bankProducts = [], isLoading: productsLoading } = useQuery<BankProduct[]>({
    queryKey: ['/api/admin/product-banks', selectedBank?.id, 'products'],
    enabled: !!selectedBank && viewingProducts,
    staleTime: 5 * 60 * 1000,
  });

  // Mutation para upload de banco
  const uploadBankMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/admin/product-banks/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Failed to upload bank');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/product-banks'] });
      setSelectedFile(null);
      toast({
        title: "Upload iniciado",
        description: "O banco de produtos está sendo processado.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro no upload",
        description: "Erro ao fazer upload do banco de produtos.",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar banco
  const deleteBankMutation = useMutation({
    mutationFn: async (bankId: string) => {
      return await apiRequest('DELETE', `/api/admin/product-banks/${bankId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/product-banks'] });
      setSelectedBank(null);
      setViewingProducts(false);
      toast({
        title: "Banco removido",
        description: "Banco de produtos removido com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para deletar bancos de produtos.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao deletar",
          description: "Não foi possível deletar o banco de produtos.",
          variant: "destructive",
        });
      }
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
        toast({
          title: "Formato inválido",
          description: "Apenas arquivos ZIP são aceitos.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadBankMutation.mutate(selectedFile);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading': return <Upload className="w-4 h-4 text-blue-600" />;
      case 'processing': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'uploading': return 'Enviando';
      case 'processing': return 'Processando';
      case 'completed': return 'Concluído';
      case 'error': return 'Erro';
      default: return status;
    }
  };

  const totalProducts = productBanks.reduce((sum, bank) => sum + bank.productCount, 0);
  const completedBanks = productBanks.filter(bank => bank.status === 'completed');
  const processingBanks = productBanks.filter(bank => ['uploading', 'processing'].includes(bank.status));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Database className="w-7 h-7 text-indigo-600" />
          Banco de Produtos
        </h2>
        <p className="text-gray-500 mt-1">
          Gerencie bancos de produtos via upload de arquivos ZIP
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload de Novo Banco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Input
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                data-testid="input-upload-bank"
              />
              <p className="text-sm text-gray-500 mt-1">
                Selecione um arquivo ZIP contendo produtos em formato JSON ou CSV
              </p>
            </div>
            
            {selectedFile && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={uploadBankMutation.isPending}
                    data-testid="button-upload-bank"
                  >
                    {uploadBankMutation.isPending ? 'Enviando...' : 'Fazer Upload'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Bancos</p>
                <p className="text-2xl font-bold text-gray-900">{productBanks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Bancos Processados</p>
                <p className="text-2xl font-bold text-gray-900">{completedBanks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Em Processamento</p>
                <p className="text-2xl font-bold text-gray-900">{processingBanks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Produtos</p>
                <p className="text-2xl font-bold text-gray-900">{totalProducts.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Banks List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Bancos de Produtos ({productBanks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {banksLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-500 mt-2 text-sm">Carregando bancos...</p>
            </div>
          ) : productBanks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Nenhum banco de produtos</h3>
              <p className="text-sm">Faça upload do primeiro banco ZIP para começar.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {productBanks.map((bank) => (
                <div
                  key={bank.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  data-testid={`bank-item-${bank.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                      {getStatusIcon(bank.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {bank.name}
                        </h3>
                        <Badge className={getStatusColor(bank.status)}>
                          {getStatusLabel(bank.status)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{bank.filename}</span>
                        <span>•</span>
                        <span>{formatFileSize(bank.size)}</span>
                        <span>•</span>
                        <span>{bank.productCount.toLocaleString()} produtos</span>
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-1">
                        Enviado em {formatDate(bank.uploadedAt)}
                        {bank.processedAt && (
                          <span> • Processado em {formatDate(bank.processedAt)}</span>
                        )}
                      </div>
                      
                      {bank.errorMessage && (
                        <p className="text-xs text-red-600 mt-1 bg-red-50 p-1 rounded">
                          Erro: {bank.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {bank.status === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBank(bank);
                          setViewingProducts(true);
                        }}
                        data-testid={`button-view-products-${bank.id}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Produtos
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBankMutation.mutate(bank.id)}
                      disabled={deleteBankMutation.isPending}
                      data-testid={`button-delete-bank-${bank.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products Modal */}
      <Dialog open={viewingProducts} onOpenChange={(open) => {
        if (!open) {
          setViewingProducts(false);
          setSelectedBank(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedBank && (
            <>
              <DialogHeader>
                <DialogTitle>Produtos do Banco: {selectedBank.name}</DialogTitle>
                <DialogDescription>
                  {selectedBank.productCount.toLocaleString()} produtos encontrados no banco
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {productsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2 text-sm">Carregando produtos...</p>
                  </div>
                ) : bankProducts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">Nenhum produto encontrado</h3>
                    <p className="text-sm">Os produtos podem ainda estar sendo processados.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bankProducts.slice(0, 50).map((product) => (
                      <Card key={product.id} className="border-l-4 border-l-indigo-500">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-16 h-16 object-cover rounded-lg"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                <Package className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 truncate">
                                {product.name}
                              </h4>
                              
                              {product.description && (
                                <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                                  {product.description}
                                </p>
                              )}
                              
                              <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                                {product.price && (
                                  <span>R$ {product.price.toFixed(2)}</span>
                                )}
                                {product.category && (
                                  <>
                                    <span>•</span>
                                    <span>{product.category}</span>
                                  </>
                                )}
                                {product.brand && (
                                  <>
                                    <span>•</span>
                                    <span>{product.brand}</span>
                                  </>
                                )}
                              </div>
                              
                              {product.sku && (
                                <p className="text-xs text-gray-500 mt-1">
                                  SKU: {product.sku}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                
                {bankProducts.length > 50 && (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">
                      Mostrando os primeiros 50 produtos de {selectedBank.productCount.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Help Section */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 text-lg">Como usar o Banco de Produtos</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 text-sm space-y-2">
          <p>• <strong>Formato aceito:</strong> Arquivos ZIP contendo produtos em JSON ou CSV</p>
          <p>• <strong>Estrutura esperada:</strong> Cada produto deve ter nome, descrição, preço e categoria</p>
          <p>• <strong>Processamento:</strong> O sistema extrai e indexa automaticamente os produtos</p>
          <p>• <strong>Visualização:</strong> Clique em "Ver Produtos" para inspecionar o conteúdo do banco</p>
          <p>• <strong>Integração:</strong> Os produtos ficam disponíveis para uso em todo o sistema</p>
        </CardContent>
      </Card>
    </div>
  );
}