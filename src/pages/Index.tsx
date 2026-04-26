import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Grid3X3, Star, Search, X, User } from "lucide-react";
import { useAuth, getDefaultRouteForRoles } from "@/contexts/AuthContext";
import ProfileHeader from "@/components/ProfileHeader";
import CategoryStories from "@/components/CategoryStories";
import DishGrid from "@/components/DishGrid";
import DishFeed from "@/components/DishFeed";
import CartFloatingButton from "@/components/CartFloatingButton";
import CartModal from "@/components/CartModal";
import AssistantFloatingButton from "@/components/AssistantFloatingButton";
import AssistantModal from "@/components/AssistantModal";
import { dishes, restaurantInfo } from "@/data/restaurant";

const Index = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>("populares");
  const [feedOpen, setFeedOpen] = useState(false);
  const [feedStartIndex, setFeedStartIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "ranked">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const filteredDishes = useMemo(() => {
    let result = dishes;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) => d.name.toLowerCase().includes(q));
    } else if (activeCategory === "populares") {
      result = [...result].sort((a, b) => b.likes - a.likes);
    } else if (activeCategory) {
      result = result.filter((d) => d.category === activeCategory);
    }

    return result;
  }, [activeCategory, searchQuery]);

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
        <div className="flex items-center gap-3">
          <button onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(""); }} className="text-foreground">
            <Search className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1 text-accent">
            <Star className="w-4 h-4 fill-accent" />
            <span className="text-sm font-semibold text-foreground">4.8</span>
          </div>
        </div>
      </div>

      {searchOpen && (
        <div className="sticky top-[45px] z-20 bg-background border-b border-border px-4 py-2 flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar platillo..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

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
      <AssistantFloatingButton onClick={() => setAssistantOpen(true)} />
      <AssistantModal open={assistantOpen} onClose={() => setAssistantOpen(false)} />
      <CartFloatingButton />
      <CartModal />
    </div>
  );
};

export default Index;
