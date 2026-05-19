import { X, Minus, Plus, Trash2, ShoppingBag, MessageCircle, Users, LogOut, Share2 } from "lucide-react";
import { useCart, getStoredName } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useRestaurantData } from "@/hooks/useRestaurantData";
import { toast } from "sonner";

const CartModal = () => {
  const {
    items, updateQuantity, removeItem, clearCart, totalItems, totalPrice,
    isCartOpen, setIsCartOpen,
    shared, createSharedCart, leaveSharedCart, participants,
  } = useCart();
  const { slug } = useParams<{ slug: string }>();
  const { restaurant } = useRestaurantData(slug);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  const handleCreateShared = async () => {
    if (!restaurant) {
      toast.error("Restaurante no disponible");
      return;
    }
    const stored = getStoredName();
    const name = stored ?? window.prompt("¿Cuál es tu nombre?", "")?.trim() ?? "";
    if (!name) {
      toast.error("Necesitas un nombre para crear el carrito");
      return;
    }
    setCreating(true);
    try {
      const code = await createSharedCart(restaurant.id, name);
      const url = `${window.location.origin}/r/${restaurant.username}?group=${code}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Carrito compartido creado", {
          description: "Enlace copiado. Envíalo a tus amigos.",
        });
      } catch {
        toast.success("Carrito compartido creado", { description: url });
      }
    } catch (e) {
      toast.error("No se pudo crear el carrito compartido");
    } finally {
      setCreating(false);
    }
  };

  const handleShareLink = async () => {
    if (!shared || !restaurant) return;
    const url = `${window.location.origin}/r/${restaurant.username}?group=${shared.code}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Panel */}
      <div className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-background rounded-t-2xl shadow-elevated animate-fade-in max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-foreground">
              {shared ? "Carrito grupal" : "Mi Orden"} ({totalItems})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && !shared && (
              <button
                onClick={clearCart}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Vaciar
              </button>
            )}
            <button onClick={() => setIsCartOpen(false)} className="p-1 text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Shared banner */}
        {shared && (
          <div className="px-4 py-2.5 bg-primary/10 border-b border-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  Carrito compartido · código {shared.code.toUpperCase()}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {participants.length > 0
                    ? `Participan: ${participants.join(", ")}`
                    : "Comparte el enlace con tus amigos"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleShareLink}
                className="p-1.5 rounded-full hover:bg-primary/20 text-primary"
                aria-label="Copiar enlace"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (window.confirm("¿Salir del carrito grupal? Tu carrito local quedará vacío.")) {
                    leaveSharedCart();
                  }
                }}
                className="p-1.5 rounded-full hover:bg-destructive/10 text-destructive"
                aria-label="Salir del grupo"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Tu orden está vacía</p>
              <p className="text-xs mt-1">Agrega platillos para comenzar</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.dish.id} className="flex items-center gap-3 px-4 py-3">
                  <img
                    src={item.dish.image}
                    alt={item.dish.name}
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {item.dish.name}
                    </p>
                    <p className="text-sm font-bold text-primary">
                      ${item.dish.price * item.quantity} MXN
                    </p>
                    {shared && item.addedByName && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        Agregado por {item.addedByName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.dish.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      ) : (
                        <Minus className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <span className="text-sm font-semibold w-5 text-center text-foreground">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.dish.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border px-4 py-3 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total estimado</span>
              <span className="text-lg font-bold text-foreground">${totalPrice} MXN</span>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 h-11 text-sm font-semibold"
                onClick={() => setIsCartOpen(false)}
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Mostrar al mesero
              </Button>
              <Button
                variant="outline"
                className="h-11 px-4 text-sm font-semibold border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10"
                onClick={() => {
                  const lines = items.map(
                    (i) => `• ${i.quantity}x ${i.dish.name} — $${i.dish.price * i.quantity}`
                  );
                  const msg = `🍽️ *Mi Pedido*\n\n${lines.join("\n")}\n\n*Total: $${totalPrice} MXN*`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                }}
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>
            </div>
            {!shared && (
              <Button
                variant="secondary"
                className="w-full h-10 text-sm font-semibold"
                onClick={handleCreateShared}
                disabled={creating}
              >
                <Users className="w-4 h-4 mr-2" />
                {creating ? "Creando..." : "Compartir con amigos (carrito en vivo)"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CartModal;
