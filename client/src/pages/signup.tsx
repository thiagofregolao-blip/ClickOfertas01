import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ArrowLeft, Mail, Lock, User, Store, Phone, MapPin, Shield } from 'lucide-react';

// Schemas
const userRegisterSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

const storeRegisterSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  storeName: z.string().min(2, "Nome da loja deve ter pelo menos 2 caracteres"),
  phone: z.string().optional(),
  address: z.string().optional(), 
  city: z.string().optional(),
});

const adminRegisterSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha de admin deve ter pelo menos 8 caracteres"),
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  adminCode: z.string().min(1, "Código de administrador é obrigatório"),
});

type UserRegisterForm = z.infer<typeof userRegisterSchema>;
type StoreRegisterForm = z.infer<typeof storeRegisterSchema>;
type AdminRegisterForm = z.infer<typeof adminRegisterSchema>;

export default function SignupPage() {
  const [userType, setUserType] = useState<'user' | 'store' | 'admin'>('user');
  const { toast } = useToast();

  // Detecta o tipo vindo da URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    if (typeParam === 'store' || typeParam === 'admin' || typeParam === 'user') {
      setUserType(typeParam);
    }
  }, []);

  // Forms
  const userForm = useForm<UserRegisterForm>({
    resolver: zodResolver(userRegisterSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
    }
  });

  const storeForm = useForm<StoreRegisterForm>({
    resolver: zodResolver(storeRegisterSchema),
    defaultValues: {
      email: '',
      password: '',
      storeName: '',
      phone: '',
      address: '',
      city: '',
    }
  });

  const adminForm = useForm<AdminRegisterForm>({
    resolver: zodResolver(adminRegisterSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      adminCode: '',
    }
  });

  // Mutations
  const userRegisterMutation = useMutation({
    mutationFn: async (data: UserRegisterForm) => {
      await apiRequest('POST', '/api/auth/register', data);
    },
    onSuccess: () => {
      toast({
        title: "Conta criada!",
        description: "Bem-vindo ao Click Ofertas!",
      });
      window.location.href = '/cards';
    },
    onError: (error: any) => {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const storeRegisterMutation = useMutation({
    mutationFn: async (data: StoreRegisterForm) => {
      await apiRequest('POST', '/api/auth/register-store', data);
    },
    onSuccess: () => {
      toast({
        title: "Loja criada!",
        description: "Bem-vindo ao painel de controle!",
      });
      window.location.href = '/admin';
    },
    onError: (error: any) => {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const adminRegisterMutation = useMutation({
    mutationFn: async (data: AdminRegisterForm) => {
      await apiRequest('POST', '/api/auth/register-admin', data);
    },
    onSuccess: () => {
      toast({
        title: "Super Admin criado!",
        description: "Acesso administrativo criado com sucesso!",
      });
      window.location.href = '/admin-panel';
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar Super Admin",
        description: error.message || "Verifique o código de administrador",
        variant: "destructive",
      });
    },
  });

  const handleUserSubmit = (data: UserRegisterForm) => {
    userRegisterMutation.mutate(data);
  };

  const handleStoreSubmit = (data: StoreRegisterForm) => {
    storeRegisterMutation.mutate(data);
  };

  const handleAdminSubmit = (data: AdminRegisterForm) => {
    adminRegisterMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-400 to-orange-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/'}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Cadastrar</h2>
              <p className="text-gray-600">Crie sua conta no Click Ofertas</p>
            </div>
          </div>

          {/* Seletor de tipo */}
          <div className="grid grid-cols-3 bg-gray-100 rounded-lg p-1 gap-1">
            <Button
              variant={userType === 'user' ? 'default' : 'ghost'}
              onClick={() => setUserType('user')}
              className="h-10 text-xs"
              data-testid="button-select-user"
            >
              <User className="w-3 h-3 mr-1" />
              Cliente
            </Button>
            <Button
              variant={userType === 'store' ? 'default' : 'ghost'}
              onClick={() => setUserType('store')}
              className="h-10 text-xs"
              data-testid="button-select-store"
            >
              <Store className="w-3 h-3 mr-1" />
              Loja
            </Button>
            <Button
              variant={userType === 'admin' ? 'default' : 'ghost'}
              onClick={() => setUserType('admin')}
              className="h-10 text-xs"
              data-testid="button-select-admin"
            >
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </Button>
          </div>
        </div>

        {/* Formulário do Cliente */}
        {userType === 'user' && (
          <div className="p-6">
            <Form {...userForm}>
              <form onSubmit={userForm.handleSubmit(handleUserSubmit)} className="space-y-4">
                <FormField
                  control={userForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Nome *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Seu primeiro nome"
                          {...field}
                          data-testid="input-firstname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={userForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sobrenome</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Seu sobrenome"
                          {...field}
                          data-testid="input-lastname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={userForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="seu@email.com"
                          type="email"
                          {...field}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={userForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Senha *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Mínimo 6 caracteres"
                          type="password"
                          {...field}
                          data-testid="input-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={userForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Telefone
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(00) 00000-0000"
                          {...field}
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  disabled={userRegisterMutation.isPending}
                  data-testid="button-register-user"
                >
                  {userRegisterMutation.isPending ? 'Criando conta...' : 'Criar Conta'}
                </Button>
              </form>
            </Form>
          </div>
        )}

        {/* Formulário da Loja */}
        {userType === 'store' && (
          <div className="p-6">
            <Form {...storeForm}>
              <form onSubmit={storeForm.handleSubmit(handleStoreSubmit)} className="space-y-4">
                <FormField
                  control={storeForm.control}
                  name="storeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        Nome da Loja *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome da sua loja"
                          {...field}
                          data-testid="input-storename"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={storeForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="contato@loja.com"
                          type="email"
                          {...field}
                          data-testid="input-store-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={storeForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Senha *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Mínimo 6 caracteres"
                          type="password"
                          {...field}
                          data-testid="input-store-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={storeForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Telefone
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(00) 00000-0000"
                          {...field}
                          data-testid="input-store-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={storeForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Endereço
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Rua, número, bairro"
                          {...field}
                          data-testid="input-store-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={storeForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Sua cidade"
                          {...field}
                          data-testid="input-store-city"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  disabled={storeRegisterMutation.isPending}
                  data-testid="button-register-store"
                >
                  {storeRegisterMutation.isPending ? 'Criando loja...' : 'Criar Loja'}
                </Button>
              </form>
            </Form>
          </div>
        )}

        {/* Formulário do Super Admin */}
        {userType === 'admin' && (
          <div className="p-6">
            <Form {...adminForm}>
              <form onSubmit={adminForm.handleSubmit(handleAdminSubmit)} className="space-y-4">
                <FormField
                  control={adminForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Nome *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Seu primeiro nome"
                          {...field}
                          data-testid="input-admin-firstname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={adminForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sobrenome *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Seu sobrenome"
                          {...field}
                          data-testid="input-admin-lastname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={adminForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="admin@empresa.com"
                          type="email"
                          {...field}
                          data-testid="input-admin-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={adminForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Senha *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Mínimo 8 caracteres"
                          type="password"
                          {...field}
                          data-testid="input-admin-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={adminForm.control}
                  name="adminCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Código de Administrador *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Código especial fornecido"
                          {...field}
                          data-testid="input-admin-code"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={adminRegisterMutation.isPending}
                  data-testid="button-register-admin"
                >
                  {adminRegisterMutation.isPending ? 'Criando Super Admin...' : 'Criar Super Admin'}
                </Button>
              </form>
            </Form>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t text-center">
          <p className="text-sm text-gray-600">
            Já tem conta?{' '}
            <button
              onClick={() => window.location.href = '/api/login'}
              className="text-orange-600 hover:underline font-semibold"
            >
              Fazer login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}