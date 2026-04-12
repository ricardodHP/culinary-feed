import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

const CartModal = () => {
  const { items, updateQuantity, removeItem, clearCart, totalItems, totalPrice, isCartOpen, setIsCartOpen } = useCart();

  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isCartOpen]);

  if (!isCartOpen) return null;

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
              Mi Orden ({totalItems})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
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
            <Button
              className="w-full h-11 text-sm font-semibold"
              onClick={() => {
                setIsCartOpen(false);
              }}
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Listo — Mostrar al mesero
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartModal;
