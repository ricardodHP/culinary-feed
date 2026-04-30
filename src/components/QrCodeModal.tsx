import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface QrCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  restaurantName: string;
}

export default function QrCodeModal({ open, onOpenChange, url, restaurantName }: QrCodeModalProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(url, { width: 1024, margin: 2, color: { dark: "#000000", light: "#ffffff" } })
      .then(setDataUrl)
      .catch(() => toast.error("No se pudo generar el QR"));
  }, [open, url]);

  const fileName = `menu-${restaurantName.toLowerCase().replace(/\s+/g, "-")}.png`;

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    a.click();
  };

  const handleShare = async () => {
    try {
      if (navigator.share && dataUrl) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], fileName, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Menú de ${restaurantName}`,
            text: `Mira el menú de ${restaurantName}`,
            url,
          });
          return;
        }
        await navigator.share({ title: `Menú de ${restaurantName}`, text: `Mira el menú de ${restaurantName}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Enlace copiado");
      }
    } catch {
      // user cancelled
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Código QR de tu menú</DialogTitle>
          <DialogDescription>
            Comparte o imprime este QR para que tus clientes vean tu menú al escanearlo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2 min-w-0">
          <div className="rounded-lg bg-white p-3 border">
            {dataUrl ? (
              <img src={dataUrl} alt="QR del menú" className="w-[220px] h-[220px] sm:w-[260px] sm:h-[260px]" />
            ) : (
              <div className="w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] animate-pulse bg-muted" />
            )}
          </div>

          <div className="w-full flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 min-w-0">
            <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">{url}</span>
            <Button size="sm" variant="ghost" className="h-7 px-2 shrink-0" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>

          <div className="flex w-full gap-2 flex-col sm:flex-row">
            <Button onClick={handleDownload} className="flex-1" disabled={!dataUrl}>
              <Download className="h-4 w-4" />
              Descargar
            </Button>
            <Button onClick={handleShare} variant="secondary" className="flex-1">
              <Share2 className="h-4 w-4" />
              Compartir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
