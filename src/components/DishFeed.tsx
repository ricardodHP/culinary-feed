import { useEffect, useRef } from "react";
import { X, Heart, Star, Plus, Check } from "lucide-react";
import { type Dish } from "@/data/restaurant";
import { restaurantInfo } from "@/data/restaurant";
import { useCart } from "@/contexts/CartContext";
import restaurantLogo from "@/assets/restaurant-logo.png";

interface DishFeedProps {
  dishes: Dish[];
  startIndex: number;
  onClose: () => void;
}

const DishFeed = ({ dishes, startIndex, onClose }: DishFeedProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addItem, items } = useCart();

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
        <button onClick={onClose} className="p-1 text-foreground">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Scrollable feed */}
      <div ref={scrollRef} className="overflow-y-auto h-[calc(100vh-57px)]">
        {dishes.map((dish) => (
          <div key={dish.id} className="border-b border-border animate-fade-in">
            {/* Dish image */}
            <div className="aspect-square w-full">
              <img
                src={dish.image}
                alt={dish.name}
                loading="lazy"
                width={512}
                height={512}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-4">
                <Heart className="w-6 h-6 text-foreground" />
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
                {dish.likes.toLocaleString()} me gusta
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
