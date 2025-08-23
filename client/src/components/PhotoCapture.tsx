import { useState, useRef, useCallback } from "react";
import { Camera, Upload, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PhotoCaptureProps {
  onPhotoCapture: (photoUrl: string) => void;
  disabled?: boolean;
}

export function PhotoCapture({ onPhotoCapture, disabled = false }: PhotoCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    try {
      console.log("=== INICIANDO PROCESSO DA CÂMERA ===");
      
      // Verificar se o navegador suporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Seu navegador não suporta acesso à câmera");
      }
      
      console.log("Navegador suporta getUserMedia ✓");
      
      // Listar dispositivos disponíveis
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log(`Encontradas ${videoDevices.length} câmeras disponíveis:`, videoDevices);
      } catch (err) {
        console.log("Não foi possível listar dispositivos");
      }
      
      console.log("Tentando acessar câmera com configuração básica...");
      
      // Configuração muito simples primeiro
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 320, ideal: 640, max: 1920 },
          height: { min: 240, ideal: 480, max: 1080 }
        },
        audio: false
      });

      console.log("✓ Câmera acessada com sucesso!");
      console.log("Stream info:", {
        active: mediaStream.active,
        id: mediaStream.id,
        tracks: mediaStream.getTracks().length
      });
      
      setStream(mediaStream);
      setIsCapturing(true);
      
      // Aguardar um pouco antes de definir o stream no vídeo
      setTimeout(() => {
        if (videoRef.current && mediaStream) {
          console.log("Definindo stream no elemento video...");
          videoRef.current.srcObject = mediaStream;
          
          videoRef.current.onloadedmetadata = () => {
            console.log("✓ Video metadata carregada!");
            console.log("Video dimensions:", {
              width: videoRef.current?.videoWidth,
              height: videoRef.current?.videoHeight
            });
            setVideoLoaded(true);
          };
          
          videoRef.current.oncanplay = () => {
            console.log("✓ Video can play!");
          };
          
          videoRef.current.onerror = (err) => {
            console.error("Erro no elemento video:", err);
          };
        }
      }, 100);
      
    } catch (error: any) {
      console.error("=== ERRO NA CÂMERA ===");
      console.error("Tipo do erro:", error.name);
      console.error("Mensagem:", error.message);
      console.error("Stack:", error.stack);
      
      let errorMessage = "Erro desconhecido";
      
      if (error.name === "NotAllowedError") {
        errorMessage = "Permissão negada. Clique no ícone da câmera na barra do navegador e permita o acesso.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "Nenhuma câmera encontrada no dispositivo.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Câmera já está sendo usada por outro aplicativo.";
      } else if (error.name === "SecurityError") {
        errorMessage = "Acesso negado por motivos de segurança. Certifique-se de estar usando HTTPS.";
      } else {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro na câmera",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
    setVideoLoaded(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Define o tamanho do canvas igual ao vídeo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Desenha o frame atual do vídeo no canvas
    context.drawImage(video, 0, 0);

    // Converte para base64
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(imageData);
    stopCamera();
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const uploadPhoto = useCallback(async (file: File | Blob, fileName: string) => {
    try {
      setIsUploading(true);

      // Obter URL de upload
      const response = await fetch("/api/photos/upload-url", {
        method: "POST",
        body: JSON.stringify({ fileName }),
        headers: {
          "Content-Type": "application/json"
        }
      });
      const { uploadURL } = await response.json();

      // Upload direto para o storage
      await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": "image/jpeg"
        }
      });

      // Extrair o caminho do objeto da URL de upload
      const url = new URL(uploadURL);
      const pathParts = url.pathname.split("/");
      const objectPath = `/products/${pathParts[pathParts.length - 1]}`;

      return objectPath;
    } catch (error) {
      console.error("Erro no upload:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const confirmPhoto = useCallback(async () => {
    if (!capturedImage) return;

    try {
      // Converter base64 para blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      const fileName = `photo_${Date.now()}.jpg`;
      const photoUrl = await uploadPhoto(blob, fileName);
      
      onPhotoCapture(photoUrl);
      setCapturedImage(null);
      setIsOpen(false);
      
      toast({
        title: "Foto capturada!",
        description: "A foto foi salva com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Não foi possível salvar a foto.",
        variant: "destructive"
      });
    }
  }, [capturedImage, uploadPhoto, onPhotoCapture, toast]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione apenas imagens.",
        variant: "destructive"
      });
      return;
    }

    try {
      const photoUrl = await uploadPhoto(file, file.name);
      onPhotoCapture(photoUrl);
      setIsOpen(false);
      
      toast({
        title: "Foto selecionada!",
        description: "A foto foi salva com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Não foi possível salvar a foto.",
        variant: "destructive"
      });
    }
  }, [uploadPhoto, onPhotoCapture, toast]);

  const handleClose = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setVideoLoaded(false);
    setIsOpen(false);
  }, [stopCamera]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full"
            data-testid="button-photo-capture"
          >
            <Camera className="mr-2 h-4 w-4" />
            Tirar Foto
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-md mx-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Capturar Foto do Produto</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {!isCapturing && !capturedImage && (
              <div className="space-y-3">
                <Button 
                  onClick={startCamera} 
                  className="w-full"
                  data-testid="button-start-camera"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Abrir Câmera
                </Button>
                
                <div className="text-center text-sm text-gray-500">ou</div>
                
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline" 
                  className="w-full"
                  data-testid="button-select-file"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Selecionar da Galeria
                </Button>
              </div>
            )}

            {isCapturing && (
              <div className="space-y-4">
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full rounded-lg bg-gray-100 ${videoLoaded ? 'block' : 'hidden'}`}
                    data-testid="video-preview"
                    onLoadedMetadata={() => {
                      console.log("Vídeo carregado com sucesso!");
                      setVideoLoaded(true);
                    }}
                    style={{ minHeight: "200px" }}
                  />
                  {/* Indicador de carregamento */}
                  {!videoLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                      <div className="text-center">
                        <div className="animate-pulse">📸</div>
                        <p className="text-sm text-gray-500 mt-2">Carregando câmera...</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={capturePhoto} className="flex-1" data-testid="button-capture">
                    <Camera className="mr-2 h-4 w-4" />
                    Capturar
                  </Button>
                  <Button onClick={handleClose} variant="outline" data-testid="button-cancel">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {capturedImage && (
              <div className="space-y-4">
                <img
                  src={capturedImage}
                  alt="Foto capturada"
                  className="w-full rounded-lg"
                  data-testid="img-captured"
                />
                
                <div className="flex gap-2">
                  <Button 
                    onClick={confirmPhoto} 
                    className="flex-1"
                    disabled={isUploading}
                    data-testid="button-confirm"
                  >
                    {isUploading ? "Salvando..." : "Confirmar"}
                  </Button>
                  <Button 
                    onClick={retakePhoto} 
                    variant="outline"
                    disabled={isUploading}
                    data-testid="button-retake"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-file"
      />

      <canvas ref={canvasRef} className="hidden" />
    </>
  );
}