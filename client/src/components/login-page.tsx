import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SiGoogle, SiApple } from "react-icons/si";
import { ArrowLeft, Store, Mail, Lock, Phone, MapPin, Building } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface LoginPageProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'user' | 'store'; // 'user' para ver lojas, 'store' para painel
}

// Schema para cadastro de usuário normal
const userRegisterSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

// Schema para cadastro de lojista  
const storeRegisterSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  storeName: z.string().min(2, "Nome da loja deve ter pelo menos 2 caracteres"),
  phone: z.string().optional(),
  address: z.string().optional(), 
  city: z.string().optional(),
});

// Schema para login
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type UserRegisterFormData = z.infer<typeof userRegisterSchema>;
type StoreRegisterFormData = z.infer<typeof storeRegisterSchema>;
type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage({ isOpen, onClose, mode = 'user' }: LoginPageProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentView, setCurrentView] = useState<'home' | 'user-login' | 'user-register' | 'store-login' | 'store-register'>('home');

  // Form para cadastro de usuário normal
  const userRegisterForm = useForm<UserRegisterFormData>({
    resolver: zodResolver(userRegisterSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
    },
  });

  // Form para cadastro de lojista
  const storeRegisterForm = useForm<StoreRegisterFormData>({
    resolver: zodResolver(storeRegisterSchema),
    defaultValues: {
      email: "",
      password: "",
      storeName: "",
      phone: "",
      address: "",
      city: "",
    },
  });

  // Form para login
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Mutation para cadastro de usuário
  const userRegisterMutation = useMutation({
    mutationFn: async (data: UserRegisterFormData) => {
      return await apiRequest("POST", "/api/auth/register-user", data);
    },
    onSuccess: () => {
      toast({
        title: "Cadastro realizado!",
        description: "Bem-vindo ao Panfleto Rápido!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onClose();
      // Usuário normal fica na galeria
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para cadastro de lojista
  const storeRegisterMutation = useMutation({
    mutationFn: async (data: StoreRegisterFormData) => {
      return await apiRequest("POST", "/api/auth/register-store", data);
    },
    onSuccess: () => {
      toast({
        title: "Cadastro realizado!",
        description: "Bem-vindo ao Panfleto Rápido!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onClose();
      // Lojista vai para admin
      window.location.href = "/admin";
    },
    onError: (error: any) => {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para login
  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      return await apiRequest("POST", "/api/auth/login", data);
    },
    onSuccess: (userData) => {
      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onClose();
      
      // Verifica se tem loja para decidir o redirecionamento
      if (userData.hasStore) {
        window.location.href = "/admin";
      } else {
        window.location.reload();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro no login",
        description: error.message || "Email ou senha incorretos.",
        variant: "destructive",
      });
    },
  });

  const handleUserRegister = (data: UserRegisterFormData) => {
    userRegisterMutation.mutate(data);
  };

  const handleStoreRegister = (data: StoreRegisterFormData) => {
    storeRegisterMutation.mutate(data);
  };

  const handleLogin = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const handleAppleLogin = () => {
    window.location.href = '/api/auth/apple';
  };

  const resetForms = () => {
    userRegisterForm.reset();
    storeRegisterForm.reset();
    loginForm.reset();
  };

  const goBack = () => {
    resetForms();
    setCurrentView('home');
  };

  const goToUserLogin = () => {
    resetForms();
    setCurrentView('user-login');
  };

  const goToUserRegister = () => {
    resetForms();
    setCurrentView('user-register');
  };

  const goToStoreLogin = () => {
    resetForms();
    setCurrentView('store-login');
  };

  const goToStoreRegister = () => {
    resetForms();
    setCurrentView('store-register');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-auto bg-white max-h-[90vh] overflow-y-auto">
        
        {/* HOME VIEW - Logo + Botões */}
        {currentView === 'home' && (
          <div className="text-center space-y-8 p-6">
            {/* Logo */}
            <div className="space-y-4">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center">
                <Store className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Panfleto Rápido
                </h1>
                <p className="text-gray-600 mt-2">
                  {mode === 'user' 
                    ? "Descubra ofertas incríveis das melhores lojas"
                    : "Crie panfletos digitais para sua loja"
                  }
                </p>
              </div>
            </div>

            {/* Botões principais baseados no mode */}
            {mode === 'user' ? (
              <>
                {/* TELA PARA USUÁRIOS */}
                <div className="space-y-4">
                  <Button
                    onClick={goToUserLogin}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium"
                    data-testid="button-go-user-login"
                  >
                    🔥 Entrar e ver ofertas
                  </Button>
                  
                  <Button
                    onClick={goToUserRegister}
                    variant="outline"
                    className="w-full h-12 border-2 hover:bg-gray-50 font-medium"
                    data-testid="button-go-user-register"
                  >
                    ⭐ Cadastrar-se gratuitamente
                  </Button>
                </div>

                {/* OAuth Options */}
                <div className="space-y-3 pt-4 border-t">
                  <p className="text-sm text-gray-500">ou entre com</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={handleGoogleLogin}
                      variant="outline"
                      className="h-12 border-2"
                      data-testid="button-google-oauth"
                    >
                      <SiGoogle className="w-5 h-5 text-red-500" />
                    </Button>

                    <Button
                      onClick={handleAppleLogin}
                      variant="outline"
                      className="h-12 border-2"
                      data-testid="button-apple-oauth"
                    >
                      <SiApple className="w-6 h-6 text-gray-800" />
                    </Button>
                  </div>
                </div>

              </>
            ) : (
              <>
                {/* TELA PARA LOJISTAS */}
                <div className="space-y-4">
                  <Button
                    onClick={goToStoreLogin}
                    className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-medium"
                    data-testid="button-go-store-login-main"
                  >
                    🏪 Acessar Painel da Loja
                  </Button>
                  
                  <Button
                    onClick={goToStoreRegister}
                    variant="outline"
                    className="w-full h-12 border-2 border-orange-300 text-orange-700 hover:bg-orange-50 font-medium"
                    data-testid="button-go-store-register-main"
                  >
                    📝 Cadastrar Nova Loja
                  </Button>
                </div>

                {/* OAuth Options */}
                <div className="space-y-3 pt-4 border-t">
                  <p className="text-sm text-gray-500">ou entre com</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={handleGoogleLogin}
                      variant="outline"
                      className="h-12 border-2"
                      data-testid="button-google-oauth-store"
                    >
                      <SiGoogle className="w-5 h-5 text-red-500" />
                    </Button>

                    <Button
                      onClick={handleAppleLogin}
                      variant="outline"
                      className="h-12 border-2"
                      data-testid="button-apple-oauth-store"
                    >
                      <SiApple className="w-6 h-6 text-gray-800" />
                    </Button>
                  </div>
                </div>

                {/* Link para usuários */}
                <div className="pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-3">Quer apenas ver ofertas?</p>
                  <Button
                    onClick={goToUserLogin}
                    variant="outline"
                    className="w-full h-10 text-sm border border-blue-300 text-blue-700 hover:bg-blue-50 font-medium"
                    data-testid="button-go-user-login-alt"
                  >
                    🔥 Ver ofertas das lojas
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* USER LOGIN VIEW */}
        {currentView === 'user-login' && (
          <div className="space-y-6 p-6">
            <div className="flex items-center space-x-4 mb-8">
              <Button
                variant="ghost" 
                size="sm"
                onClick={goBack}
                className="p-2 hover:bg-gray-100 rounded-full"
                data-testid="button-back-from-login"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Entrar</h2>
                <p className="text-gray-600">Acesse sua conta e veja ofertas exclusivas</p>
              </div>
            </div>

            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-6">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-medium text-gray-700">
                        <Mail className="w-4 h-4 text-primary" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="seu@email.com"
                          type="email"
                          className="h-12 border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-base"
                          {...field}
                          data-testid="input-login-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-medium text-gray-700">
                        <Lock className="w-4 h-4 text-primary" />
                        Senha
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Sua senha"
                          type="password"
                          className="h-12 border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-base"
                          {...field}
                          data-testid="input-login-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold text-base shadow-lg"
                    disabled={loginMutation.isPending}
                    data-testid="button-login-submit"
                  >
                    {loginMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Entrando...
                      </div>
                    ) : (
                      "Fazer Login"
                    )}
                  </Button>
                </div>
              </form>
            </Form>

            <div className="text-center pt-4">
              <p className="text-sm text-gray-600">
                Não tem conta?{" "}
                <button
                  onClick={goToUserRegister}
                  className="text-primary hover:underline font-semibold"
                  data-testid="link-go-user-register"
                >
                  Cadastre-se aqui
                </button>
              </p>
            </div>
          </div>
        )}

        {/* USER REGISTER VIEW */}
        {currentView === 'user-register' && (
          <div className="space-y-6 p-6">
            <div className="flex items-center space-x-4 mb-6">
              <Button
                variant="ghost"
                size="sm" 
                onClick={goBack}
                className="p-2 hover:bg-gray-100 rounded-full"
                data-testid="button-back-from-register"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Criar Conta</h2>
                <p className="text-gray-600">Junte-se e descubra ofertas exclusivas</p>
              </div>
            </div>

            <Form {...userRegisterForm}>
              <form onSubmit={userRegisterForm.handleSubmit(handleUserRegister)} className="space-y-5">
                
                {/* Dados pessoais */}
                <div className="space-y-4">
                  <FormField
                    control={userRegisterForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium text-gray-700">
                          Nome *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Seu primeiro nome"
                            className="h-11 border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                            {...field}
                            data-testid="input-user-register-firstname"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={userRegisterForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium text-gray-700">
                          Sobrenome
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Seu sobrenome"
                            className="h-11 border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                            {...field}
                            data-testid="input-user-register-lastname"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={userRegisterForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-medium text-gray-700">
                          <Mail className="w-4 h-4 text-primary" />
                          Email *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="seu@email.com"
                            type="email"
                            className="h-11 border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                            {...field}
                            data-testid="input-user-register-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={userRegisterForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-medium text-gray-700">
                          <Lock className="w-4 h-4 text-primary" />
                          Senha *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Mínimo 6 caracteres"
                            type="password"
                            className="h-11 border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                            {...field}
                            data-testid="input-user-register-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={userRegisterForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-medium text-gray-700">
                          <Phone className="w-4 h-4 text-primary" />
                          Telefone (opcional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="(11) 99999-9999"
                            className="h-11 border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                            {...field}
                            data-testid="input-user-register-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold text-base shadow-lg"
                    disabled={userRegisterMutation.isPending}
                    data-testid="button-user-register-submit"
                  >
                    {userRegisterMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Criando conta...
                      </div>
                    ) : (
                      "Criar minha conta"
                    )}
                  </Button>
                </div>
              </form>
            </Form>

            <div className="text-center pt-2">
              <p className="text-sm text-gray-600">
                Já tem conta?{" "}
                <button
                  onClick={goToUserLogin}
                  className="text-primary hover:underline font-semibold"
                  data-testid="link-go-user-login"
                >
                  Faça login aqui
                </button>
              </p>
            </div>
          </div>
        )}

        {/* STORE LOGIN VIEW */}
        {currentView === 'store-login' && (
          <div className="space-y-6 p-6">
            <div className="flex items-center space-x-4 mb-8">
              <Button
                variant="ghost" 
                size="sm"
                onClick={goBack}
                className="p-2 hover:bg-gray-100 rounded-full"
                data-testid="button-back-from-store-login"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Login Lojista</h2>
                <p className="text-gray-600">Acesse o painel da sua loja</p>
              </div>
            </div>

            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-6">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-medium text-gray-700">
                        <Mail className="w-4 h-4 text-primary" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="seu@email.com"
                          type="email"
                          className="h-12 border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-base"
                          {...field}
                          data-testid="input-store-login-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-medium text-gray-700">
                        <Lock className="w-4 h-4 text-primary" />
                        Senha
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Sua senha"
                          type="password"
                          className="h-12 border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-base"
                          {...field}
                          data-testid="input-store-login-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-base shadow-lg"
                    disabled={loginMutation.isPending}
                    data-testid="button-store-login-submit"
                  >
                    {loginMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Entrando...
                      </div>
                    ) : (
                      "🏪 Acessar Painel"
                    )}
                  </Button>
                </div>
              </form>
            </Form>

            <div className="text-center pt-4">
              <p className="text-sm text-gray-600">
                Não tem loja cadastrada?{" "}
                <button
                  onClick={goToStoreRegister}
                  className="text-orange-600 hover:underline font-semibold"
                  data-testid="link-go-store-register"
                >
                  Cadastre sua loja
                </button>
              </p>
            </div>
          </div>
        )}

        {/* STORE REGISTER VIEW */}
        {currentView === 'store-register' && (
          <div className="space-y-6 p-6">
            <div className="flex items-center space-x-4 mb-6">
              <Button
                variant="ghost"
                size="sm" 
                onClick={goBack}
                className="p-2 hover:bg-gray-100 rounded-full"
                data-testid="button-back-from-store-register"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Cadastrar Loja</h2>
                <p className="text-gray-600">Crie panfletos digitais para sua loja</p>
              </div>
            </div>

            <Form {...storeRegisterForm}>
              <form onSubmit={storeRegisterForm.handleSubmit(handleStoreRegister)} className="space-y-5">
                
                {/* Dados de acesso */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Dados de Acesso
                  </h3>
                  
                  <FormField
                    control={storeRegisterForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-medium text-gray-700">
                          <Mail className="w-4 h-4 text-primary" />
                          Email *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="seu@email.com"
                            type="email"
                            className="h-11 border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                            {...field}
                            data-testid="input-store-register-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={storeRegisterForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-medium text-gray-700">
                          <Lock className="w-4 h-4 text-primary" />
                          Senha *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Mínimo 6 caracteres"
                            type="password"
                            className="h-11 border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                            {...field}
                            data-testid="input-store-register-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Dados da loja */}
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wider">
                    Dados da Loja
                  </h3>
                  
                  <FormField
                    control={storeRegisterForm.control}
                    name="storeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-medium text-gray-700">
                          <Building className="w-4 h-4 text-primary" />
                          Nome da loja *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Minha Loja"
                            className="h-11 border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                            {...field}
                            data-testid="input-store-register-storename"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={storeRegisterForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-medium text-gray-700">
                          <Phone className="w-4 h-4 text-primary" />
                          Telefone
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="(11) 99999-9999"
                            className="h-11 border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                            {...field}
                            data-testid="input-store-register-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Localização */}
                <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wider">
                    Localização
                  </h3>
                  
                  <FormField
                    control={storeRegisterForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-medium text-gray-700">
                          <MapPin className="w-4 h-4 text-primary" />
                          Endereço
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Rua das Flores, 123"
                            className="h-11 border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                            {...field}
                            data-testid="input-store-register-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={storeRegisterForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium text-gray-700">
                          Cidade
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="São Paulo"
                            className="h-11 border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                            {...field}
                            data-testid="input-store-register-city"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-base shadow-lg"
                    disabled={storeRegisterMutation.isPending}
                    data-testid="button-store-register-submit"
                  >
                    {storeRegisterMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Criando loja...
                      </div>
                    ) : (
                      "🏪 Criar minha loja"
                    )}
                  </Button>
                </div>
              </form>
            </Form>

            <div className="text-center pt-2">
              <p className="text-sm text-gray-600">
                Já tem loja cadastrada?{" "}
                <button
                  onClick={goToStoreLogin}
                  className="text-orange-600 hover:underline font-semibold"
                  data-testid="link-go-store-login"
                >
                  Faça login aqui
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Terms */}
        <div className="text-center text-xs text-gray-500 px-6 pb-4 border-t pt-4">
          <p>
            Ao continuar, você concorda com nossos{" "}
            <a href="#" className="text-primary hover:underline">
              Termos de Serviço
            </a>{" "}
            e{" "}
            <a href="#" className="text-primary hover:underline">
              Política de Privacidade
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}