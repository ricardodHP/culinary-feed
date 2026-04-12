import { useEffect, useRef, useState, useCallback } from "react";
import { Heart, Star, Plus, Check } from "lucide-react";
import { type Dish } from "@/data/restaurant";
import { restaurantInfo } from "@/data/restaurant";
import { useCart } from "@/contexts/CartContext";
import { useLikes } from "@/contexts/LikesContext";
import restaurantLogo from "@/assets/restaurant-logo.png";

interface DishFeedProps {
  dishes: Dish[];
  startIndex: number;
  onClose: () => void;
}

const DishFeed = ({ dishes, startIndex, onClose }: DishFeedProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addItem, items } = useCart();
  const { toggleLike, isLiked } = useLikes();
  const [heartAnimation, setHeartAnimation] = useState<string | null>(null);
  const lastTapRef = useRef<Record<string, number>>({});

  const handleDoubleTap = useCallback((dishId: string) => {
    const now = Date.now();
    const last = lastTapRef.current[dishId] || 0;
    if (now - last < 300) {
      if (!isLiked(dishId)) toggleLike(dishId);
      setHeartAnimation(dishId);
      setTimeout(() => setHeartAnimation(null), 800);
      lastTapRef.current[dishId] = 0;
    } else {
      lastTapRef.current[dishId] = now;
    }
  }, [isLiked, toggleLike]);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.children[startIndex] as HTMLElement;
      if (el) el.scrollIntoView({ behavior: "instant" });
    }
  }, [startIndex]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background border-b border-border">
        <div className="flex items-center gap-2">
          <img src={restaurantLogo} alt="" className="w-8 h-8 rounded-full object-cover" />
          <span className="text-sm font-semibold text-foreground">{restaurantInfo.username}</span>
        </div>
        <button onClick={onClose} className="flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80 transition-opacity">
          ← Volver al menú
        </button>
      </div>

      {/* Scrollable feed */}
      <div ref={scrollRef} className="overflow-y-auto h-[calc(100vh-57px)]">
        {dishes.map((dish) => (
          <div key={dish.id} className="border-b border-border animate-fade-in">
            {/* Dish image */}
            <div
              className="aspect-square w-full relative select-none"
              onClick={() => handleDoubleTap(dish.id)}
            >
              <img
                src={dish.image}
                alt={dish.name}
                loading="lazy"
                width={512}
                height={512}
                className="w-full h-full object-cover"
              />
              {heartAnimation === dish.id && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Heart className="w-20 h-20 text-white fill-white drop-shadow-lg animate-heart-pop" />
                </div>
              )}
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-4">
                <button onClick={() => toggleLike(dish.id)} className="active:scale-125 transition-transform">
                  <Heart className={`w-6 h-6 transition-colors ${isLiked(dish.id) ? "text-red-500 fill-red-500" : "text-foreground"}`} />
                </button>
                <button
                  onClick={() => addItem(dish)}
                  className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity active:scale-95"
                >
                  {items.some((i) => i.dish.id === dish.id) ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Agregar más
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" /> Agregar
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-accent fill-accent" />
                <span className="text-sm font-semibold text-foreground">{dish.rating}</span>
              </div>
            </div>

            {/* Likes */}
            <div className="px-4 pb-1">
              <p className="text-sm font-semibold text-foreground">
                {(dish.likes + (isLiked(dish.id) ? 1 : 0)).toLocaleString()} me gusta
              </p>
            </div>

            {/* Name + description */}
            <div className="px-4 pb-1">
              <p className="text-sm text-foreground">
                <span className="font-semibold">{dish.name}</span>{" "}
                {dish.description}
              </p>
            </div>

            {/* Price + tags */}
            <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-primary">
                ${dish.price} MXN
              </span>
              {dish.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DishFeed;
