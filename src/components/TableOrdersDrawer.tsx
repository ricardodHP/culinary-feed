import { useEffect } from "react";
import { X } from "lucide-react";
import OrderCard from "./OrderCard";
import { useTableOrders } from "@/hooks/useTableOrders";

interface Props {
  open: boolean;
  onClose: () => void;
  code: string | null | undefined;
}

export default function TableOrdersDrawer({ open, onClose, code }: Props) {
  const { orders, loading } = useTableOrders(code, open);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-background rounded-t-2xl shadow-elevated max-h-[85vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <h3 className="text-base font-bold">Mis pedidos</h3>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {loading ? (
            <p className="text-center text-sm text-muted-foreground py-10">Cargando...</p>
          ) : orders.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">
              Aún no enviaste ningún pedido.
            </p>
          ) : (
            orders.map((o) => <OrderCard key={o.id} order={o} />)
          )}
        </div>
      </div>
    </div>
  );
}
