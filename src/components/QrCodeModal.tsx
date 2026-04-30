import { useEffect, useState } from "react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Download, Share2, Copy, Check, FileText } from "lucide-react";
import { toast } from "sonner";

interface QrCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  restaurantName: string;
  logoUrl?: string | null;
}

const PRESET_COLORS = ["#000000", "#0F172A", "#7C2D12", "#065F46", "#1E3A8A", "#7E22CE"];

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function QrCodeModal({ open, onOpenChange, url, restaurantName, logoUrl }: QrCodeModalProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Customization
  const [size, setSize] = useState(512);
  const [margin, setMargin] = useState(2);
  const [darkColor, setDarkColor] = useState("#000000");
  const [lightColor, setLightColor] = useState("#FFFFFF");
  const [includeLogo, setIncludeLogo] = useState(true);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setGenerating(true);

    (async () => {
      try {
        const useLogo = includeLogo && !!logoUrl;
        const png = await QRCode.toDataURL(url, {
          width: size,
          margin,
          errorCorrectionLevel: useLogo ? "H" : "M",
          color: { dark: darkColor, light: lightColor },
        });

        if (!useLogo) {
          if (!cancelled) setDataUrl(png);
          return;
        }

        // Composite logo in the center
        const qrImg = await loadImage(png);
        const canvas = document.createElement("canvas");
        canvas.width = qrImg.width;
        canvas.height = qrImg.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no ctx");
        ctx.drawImage(qrImg, 0, 0);

        try {
          const logo = await loadImage(logoUrl as string);
          const logoSize = Math.round(qrImg.width * 0.22);
          const cx = (qrImg.width - logoSize) / 2;
          const cy = (qrImg.height - logoSize) / 2;
          const pad = Math.round(logoSize * 0.1);

          // White rounded background behind logo
          const r = Math.round(logoSize * 0.18);
          ctx.fillStyle = lightColor;
          const x = cx - pad;
          const y = cy - pad;
          const w = logoSize + pad * 2;
          const h = logoSize + pad * 2;
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + w, y, x + w, y + h, r);
          ctx.arcTo(x + w, y + h, x, y + h, r);
          ctx.arcTo(x, y + h, x, y, r);
          ctx.arcTo(x, y, x + w, y, r);
          ctx.closePath();
          ctx.fill();

          // Clip logo into rounded square
          ctx.save();
          ctx.beginPath();
          const lr = Math.round(logoSize * 0.15);
          ctx.moveTo(cx + lr, cy);
          ctx.arcTo(cx + logoSize, cy, cx + logoSize, cy + logoSize, lr);
          ctx.arcTo(cx + logoSize, cy + logoSize, cx, cy + logoSize, lr);
          ctx.arcTo(cx, cy + logoSize, cx, cy, lr);
          ctx.arcTo(cx, cy, cx + logoSize, cy, lr);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(logo, cx, cy, logoSize, logoSize);
          ctx.restore();
        } catch {
          // logo failed (CORS, etc.) — fall back to plain QR
          toast.message("No se pudo cargar el logo, se generó el QR sin él");
        }

        if (!cancelled) setDataUrl(canvas.toDataURL("image/png"));
      } catch {
        if (!cancelled) toast.error("No se pudo generar el QR");
      } finally {
        if (!cancelled) setGenerating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, url, size, margin, darkColor, lightColor, includeLogo, logoUrl]);

  const baseFileName = `menu-${restaurantName.toLowerCase().replace(/\s+/g, "-")}`;
  const fileName = `${baseFileName}.png`;
  const pdfFileName = `${baseFileName}.pdf`;

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    a.click();
  };

  const handleDownloadPdf = () => {
    if (!dataUrl) return;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Title — restaurant name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text(restaurantName, pageW / 2, 35, { align: "center" });

    // Short tagline
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(90);
    doc.text("Escanea para ver nuestro menú", pageW / 2, 48, { align: "center" });
    doc.setTextColor(0);

    // QR image (centered)
    const qrSizeMm = 110;
    const qrX = (pageW - qrSizeMm) / 2;
    const qrY = 60;
    doc.addImage(dataUrl, "PNG", qrX, qrY, qrSizeMm, qrSizeMm);

    // Instructions
    const instructionsY = qrY + qrSizeMm + 18;
    doc.setFontSize(12);
    doc.setTextColor(60);
    const lines = [
      "1. Abre la cámara de tu celular",
      "2. Apunta al código QR",
      "3. Toca el enlace para ver el menú",
    ];
    lines.forEach((line, i) => {
      doc.text(line, pageW / 2, instructionsY + i * 7, { align: "center" });
    });

    // URL footer
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(url, pageW / 2, pageH - 18, { align: "center" });

    doc.save(pdfFileName);
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
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Código QR de tu menú</DialogTitle>
          <DialogDescription>
            Personaliza, descarga o comparte el QR para que tus clientes vean tu menú al escanearlo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2 min-w-0">
          <div className="rounded-lg p-3 border" style={{ backgroundColor: lightColor }}>
            {dataUrl ? (
              <img
                src={dataUrl}
                alt="QR del menú"
                className={`w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] transition-opacity ${generating ? "opacity-60" : "opacity-100"}`}
              />
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

          {/* Customization */}
          <div className="w-full space-y-4 rounded-md border p-3">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs">Tamaño</Label>
              <span className="text-xs text-muted-foreground">{size}px</span>
            </div>
            <Slider
              min={256}
              max={1024}
              step={32}
              value={[size]}
              onValueChange={(v) => setSize(v[0])}
            />

            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs">Margen</Label>
              <span className="text-xs text-muted-foreground">{margin}</span>
            </div>
            <Slider
              min={0}
              max={8}
              step={1}
              value={[margin]}
              onValueChange={(v) => setMargin(v[0])}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block">Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={darkColor}
                    onChange={(e) => setDarkColor(e.target.value)}
                    className="h-8 w-10 rounded border bg-transparent cursor-pointer"
                    aria-label="Color del QR"
                  />
                  <div className="flex flex-wrap gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setDarkColor(c)}
                        className="h-5 w-5 rounded-full border"
                        style={{ backgroundColor: c }}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Fondo</Label>
                <input
                  type="color"
                  value={lightColor}
                  onChange={(e) => setLightColor(e.target.value)}
                  className="h-8 w-10 rounded border bg-transparent cursor-pointer"
                  aria-label="Color de fondo"
                />
              </div>
            </div>

            {logoUrl && (
              <div className="flex items-center justify-between gap-3 pt-1">
                <div>
                  <Label className="text-xs">Logo al centro</Label>
                  <p className="text-[11px] text-muted-foreground">Usa el logo del restaurante.</p>
                </div>
                <Switch checked={includeLogo} onCheckedChange={setIncludeLogo} />
              </div>
            )}
          </div>

          <div className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2">
            <Button onClick={handleDownload} className="w-full" disabled={!dataUrl || generating}>
              <Download className="h-4 w-4" />
              PNG
            </Button>
            <Button onClick={handleDownloadPdf} variant="outline" className="w-full" disabled={!dataUrl || generating}>
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button onClick={handleShare} variant="secondary" className="w-full" disabled={!dataUrl || generating}>
              <Share2 className="h-4 w-4" />
              Compartir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
