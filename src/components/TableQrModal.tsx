import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { X, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface TableQrModalProps {
  open: boolean;
  onClose: () => void;
  code: string;
  tableLabel?: string;
  restaurantName?: string;
}

const TableQrModal = ({ open, onClose, code, tableLabel, restaurantName }: TableQrModalProps) => {
  const [dataUrl, setDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/m/${code.toUpperCase()}`;

  useEffect(() => {
    if (!open || !code) return;
    QRCode.toDataURL(url, { width: 520, margin: 2, errorCorrectionLevel: "M" })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [open, code, url]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code.toUpperCase());
      setCopied(true);
      toast.success("Código copiado");
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error("No se pudo copiar"); }
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado");
    } catch { toast.error("No se pudo copiar el enlace"); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-background rounded-2xl shadow-elevated p-5 animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted text-foreground"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1 mb-4 pr-6">
          <h3 className="text-base font-bold text-foreground">
            {tableLabel ? `Mesa ${tableLabel}` : "Mesa abierta"}
          </h3>
          {restaurantName && (
            <p className="text-xs text-muted-foreground truncate">{restaurantName}</p>
          )}
          <p className="text-xs text-muted-foreground">
            El cliente escanea el QR o ingresa el código en el menú.
          </p>
        </div>

        <div className="flex items-center justify-center bg-white rounded-xl p-3 mb-4">
          {dataUrl ? (
            <img src={dataUrl} alt="QR de la mesa" className="w-56 h-56" />
          ) : (
            <div className="w-56 h-56 animate-pulse bg-muted rounded" />
          )}
        </div>

        <div className="rounded-xl border border-border bg-secondary/40 p-3 mb-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground text-center mb-1">
            Código de mesa
          </p>
          <button
            onClick={copyCode}
            className="w-full flex items-center justify-center gap-2 text-2xl font-bold tracking-[0.3em] text-foreground hover:text-primary transition-colors"
          >
            {code.toUpperCase()}
            {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 opacity-60" />}
          </button>
        </div>

        <button onClick={copyLink} className="w-full text-xs text-primary hover:underline">
          Copiar enlace
        </button>
      </div>
    </div>
  );
};

export default TableQrModal;
