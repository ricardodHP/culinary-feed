import { useState, useMemo } from "react";
import { Grid3X3, Star } from "lucide-react";
import ProfileHeader from "@/components/ProfileHeader";
import CategoryStories from "@/components/CategoryStories";
import DishGrid from "@/components/DishGrid";
import DishFeed from "@/components/DishFeed";
import CartFloatingButton from "@/components/CartFloatingButton";
import CartModal from "@/components/CartModal";
import { dishes, restaurantInfo } from "@/data/restaurant";

const Index = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>("populares");
  const [feedOpen, setFeedOpen] = useState(false);
  const [feedStartIndex, setFeedStartIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "ranked">("grid");

  const filteredDishes = useMemo(() => {
    if (!activeCategory) return dishes;
    if (activeCategory === "populares") {
      return [...dishes].sort((a, b) => b.likes - a.likes);
    }
    return dishes.filter((d) => d.category === activeCategory);
  }, [activeCategory]);

  const handleDishClick = (index: number) => {
    setFeedStartIndex(index);
    setFeedOpen(true);
  };

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(activeCategory === categoryId ? null : categoryId);
  };

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-background border-b border-border px-4 py-2.5 flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">{restaurantInfo.username}</h2>
        <div className="flex items-center gap-1 text-accent">
          <Star className="w-4 h-4 fill-accent" />
          <span className="text-sm font-semibold text-foreground">4.8</span>
        </div>
      </div>

      <ProfileHeader />
      
      <CategoryStories
        activeCategory={activeCategory}
        onCategoryClick={handleCategoryClick}
      />

      {/* Tab bar */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setViewMode("grid")}
          className={`flex-1 py-2.5 flex justify-center border-b-2 transition-colors ${
            viewMode === "grid"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground"
          }`}
        >
          <Grid3X3 className="w-5 h-5" />
        </button>
        <button
          onClick={() => setViewMode("ranked")}
          className={`flex-1 py-2.5 flex justify-center border-b-2 transition-colors ${
            viewMode === "ranked"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground"
          }`}
        >
          <Star className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      {viewMode === "grid" ? (
        <DishGrid dishes={filteredDishes} onDishClick={handleDishClick} />
      ) : (
        <DishGrid
          dishes={[...filteredDishes].sort((a, b) => b.rating - a.rating)}
          onDishClick={handleDishClick}
        />
      )}

      {/* Feed overlay */}
      {feedOpen && (
        <DishFeed
          dishes={filteredDishes}
          startIndex={feedStartIndex}
          onClose={() => setFeedOpen(false)}
        />
      )}
      <CartFloatingButton />
      <CartModal />
    </div>
  );
};

export default Index;
