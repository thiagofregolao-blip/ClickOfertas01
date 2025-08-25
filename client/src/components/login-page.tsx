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
}

// Schema para cadastro  
const registerSchema = z.object({
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

type RegisterFormData = z.infer<typeof registerSchema>;
type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage({ isOpen, onClose }: LoginPageProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentView, setCurrentView] = useState<'home' | 'login' | 'register'>('home');

  // Form para cadastro
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
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

  // Mutation para cadastro
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      return await apiRequest("/api/auth/register", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Cadastro realizado!",
        description: "Bem-vindo ao Panfleto Rápido!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onClose();
      // Redireciona para admin
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
      return await apiRequest("/api/auth/login", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onClose();
      // Redireciona para admin
      window.location.href = "/admin";
    },
    onError: (error: any) => {
      toast({
        title: "Erro no login",
        description: error.message || "Email ou senha incorretos.",
        variant: "destructive",
      });
    },
  });

  const handleRegister = (data: RegisterFormData) => {
    registerMutation.mutate(data);
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
    registerForm.reset();
    loginForm.reset();
  };

  const goBack = () => {
    resetForms();
    setCurrentView('home');
  };

  const goToLogin = () => {
    resetForms();
    setCurrentView('login');
  };

  const goToRegister = () => {
    resetForms();
    setCurrentView('register');
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
                  Crie panfletos digitais para sua loja
                </p>
              </div>
            </div>

            {/* Botões principais */}
            <div className="space-y-4">
              <Button
                onClick={goToLogin}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium"
                data-testid="button-go-login"
              >
                Login
              </Button>
              
              <Button
                onClick={goToRegister}
                variant="outline"
                className="w-full h-12 border-2 hover:bg-gray-50 font-medium"
                data-testid="button-go-register"
              >
                Cadastrar
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
          </div>
        )}

        {/* LOGIN VIEW */}
        {currentView === 'login' && (
          <div className="space-y-6 p-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost" 
                size="sm"
                onClick={goBack}
                className="p-2"
                data-testid="button-back-from-login"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Login</h2>
                <p className="text-gray-600">Entre na sua conta</p>
              </div>
            </div>

            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="seu@email.com"
                          type="email"
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
                      <FormLabel className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Senha
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Sua senha"
                          type="password"
                          {...field}
                          data-testid="input-login-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium"
                  disabled={loginMutation.isPending}
                  data-testid="button-login-submit"
                >
                  {loginMutation.isPending ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </Form>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Não tem conta?{" "}
                <button
                  onClick={goToRegister}
                  className="text-primary hover:underline font-medium"
                  data-testid="link-go-register"
                >
                  Cadastre-se aqui
                </button>
              </p>
            </div>
          </div>
        )}

        {/* REGISTER VIEW */}
        {currentView === 'register' && (
          <div className="space-y-6 p-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm" 
                onClick={goBack}
                className="p-2"
                data-testid="button-back-from-register"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Cadastro</h2>
                <p className="text-gray-600">Crie sua conta</p>
              </div>
            </div>

            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                <FormField
                  control={registerForm.control}
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
                          data-testid="input-register-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
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
                          data-testid="input-register-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="storeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        Nome da loja *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Minha Loja"
                          {...field}
                          data-testid="input-register-storename"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Telefone
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(11) 99999-9999"
                          {...field}
                          data-testid="input-register-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Endereço
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Rua das Flores, 123"
                          {...field}
                          data-testid="input-register-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="São Paulo"
                          {...field}
                          data-testid="input-register-city"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium"
                  disabled={registerMutation.isPending}
                  data-testid="button-register-submit"
                >
                  {registerMutation.isPending ? "Criando conta..." : "Criar conta"}
                </Button>
              </form>
            </Form>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Já tem conta?{" "}
                <button
                  onClick={goToLogin}
                  className="text-primary hover:underline font-medium"
                  data-testid="link-go-login"
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