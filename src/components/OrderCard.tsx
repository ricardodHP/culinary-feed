import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, ChefHat, Bell, Check, X } from "lucide-react";
import type { OrderStatus, OrderItem } from "@/hooks/useTableOrders";

interface BaseOrder {
  id: string;
  status: OrderStatus;
  notes: string | null;
  created_by_alias: string | null;
  created_at: string;
  items: OrderItem[];
  table_label?: string;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pendiente",
  preparing: "En preparación",
  ready: "Listo",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_VARIANT: Record<
  OrderStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "default",
  preparing: "secondary",
  ready: "default",
  delivered: "outline",
  cancelled: "destructive",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export interface OrderCardProps {
  order: BaseOrder;
  showTable?: boolean;
  onAdvance?: (status: OrderStatus) => void;
  busy?: boolean;
}

export default function OrderCard({ order, showTable, onAdvance, busy }: OrderCardProps) {
  const total = order.items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);
  const next: { status: OrderStatus; label: string; icon: React.ReactNode } | null =
    order.status === "pending"
      ? { status: "preparing", label: "Tomar", icon: <ChefHat className="h-3.5 w-3.5" /> }
      : order.status === "preparing"
        ? { status: "ready", label: "Listo", icon: <Bell className="h-3.5 w-3.5" /> }
        : order.status === "ready"
          ? { status: "delivered", label: "Entregado", icon: <Check className="h-3.5 w-3.5" /> }
          : null;

  return (
    <Card className={order.status === "ready" ? "border-primary" : ""}>
      <CardContent className="p-3.5 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">
              {showTable && order.table_label ? `${order.table_label} · ` : ""}
              {order.created_by_alias ?? "Invitado"}
            </p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {timeAgo(order.created_at)}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[order.status]} className="text-[10px] shrink-0">
            {STATUS_LABEL[order.status]}
          </Badge>
        </div>
        <ul className="text-sm space-y-0.5">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-2">
              <span className="truncate">
                <span className="font-semibold">{i.quantity}×</span> {i.dish_name}
                {i.notes && <span className="text-muted-foreground italic"> — {i.notes}</span>}
              </span>
              <span className="text-muted-foreground shrink-0">
                ${Number(i.unit_price) * i.quantity}
              </span>
            </li>
          ))}
        </ul>
        {order.notes && (
          <p className="text-[11px] text-muted-foreground italic border-l-2 border-border pl-2">
            {order.notes}
          </p>
        )}
        <div className="flex items-center justify-between text-xs pt-1 border-t">
          <span className="text-muted-foreground">Total</span>
          <span className="font-semibold">${total} MXN</span>
        </div>
        {onAdvance && order.status !== "delivered" && order.status !== "cancelled" && (
          <div className="flex gap-1.5">
            {next && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => onAdvance(next.status)}
                disabled={busy}
              >
                {next.icon} {next.label}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAdvance("cancelled")}
              disabled={busy}
              aria-label="Cancelar pedido"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
