import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiGoogle, SiApple } from "react-icons/si";
import { X, User, Mail, Phone, MapPin } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RegisterLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Schema para cadastro
const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  fullName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

// Schema para login
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
});

type RegisterFormData = z.infer<typeof registerSchema>;
type LoginFormData = z.infer<typeof loginSchema>;

export default function RegisterLoginModal({ isOpen, onClose }: RegisterLoginModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form para cadastro
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      fullName: "",
      phone: "",
      city: "",
      state: "",
      country: "",
    },
  });

  // Form para login
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
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
        description: error.message || "Usuário não encontrado ou dados incorretos.",
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

  const handleReplitLogin = () => {
    window.location.href = '/api/login';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-auto bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 p-2 hover:bg-gray-100 rounded-full transition-colors"
            data-testid="button-close-login"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Acesse sua conta
            </DialogTitle>
            <p className="text-gray-600">
              Faça login ou crie uma nova conta para começar
            </p>
          </div>
        </DialogHeader>

        <Tabs defaultValue="register" className="w-full mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="register">Criar Conta</TabsTrigger>
            <TabsTrigger value="login">Fazer Login</TabsTrigger>
          </TabsList>
          
          <TabsContent value="register" className="space-y-4">
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
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Nome completo *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="João Silva"
                          {...field}
                          data-testid="input-register-fullname"
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
                          placeholder="+55 11 99999-9999"
                          {...field}
                          data-testid="input-register-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={registerForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Cidade
                        </FormLabel>
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

                  <FormField
                    control={registerForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="SP"
                            {...field}
                            data-testid="input-register-state"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={registerForm.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Brasil"
                          {...field}
                          data-testid="input-register-country"
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
          </TabsContent>

          <TabsContent value="login" className="space-y-4">
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
                          {...field}
                          data-testid="input-login-email"
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
                  {loginMutation.isPending ? "Entrando..." : "Fazer login"}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        <div className="relative my-6">
          <Separator />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-white px-3 text-sm text-gray-500">ou</span>
          </div>
        </div>

        <div className="space-y-3">
          {/* Google Login */}
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            size="lg"
            className="w-full h-12 flex items-center justify-center gap-3 border-2 hover:bg-gray-50 transition-colors"
            data-testid="button-login-google"
          >
            <SiGoogle className="w-5 h-5 text-red-500" />
            <span className="text-gray-700 font-medium">Continuar com Google</span>
          </Button>

          {/* Apple Login */}
          <Button
            onClick={handleAppleLogin}
            variant="outline"  
            size="lg"
            className="w-full h-12 flex items-center justify-center gap-3 border-2 hover:bg-gray-50 transition-colors"
            data-testid="button-login-apple"
          >
            <SiApple className="w-6 h-6 text-gray-800" />
            <span className="text-gray-700 font-medium">Continuar com Apple</span>
          </Button>

          {/* Replit Login (fallback) */}
          <Button
            onClick={handleReplitLogin}
            variant="outline"
            className="w-full h-10 text-sm text-gray-600"
            data-testid="button-login-replit"
          >
            Entrar com conta Replit
          </Button>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500 border-t pt-4">
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