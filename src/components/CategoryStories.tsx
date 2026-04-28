import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Category } from "@/data/restaurant";

interface CategoryStoriesProps {
  categories: Category[];
  activeCategory: string | null;
  onCategoryClick: (categoryId: string) => void;
}

const CategoryStories = ({ categories, activeCategory, onCategoryClick }: CategoryStoriesProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  // virtual "populares" pseudo-category lives outside DB
  const all = [
    { id: "populares", name: "Populares", emoji: "🔥", image: categories[0]?.image ?? "" },
    ...categories,
  ];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const overflow = el.scrollWidth > el.clientWidth + 4;
      setHasOverflow(overflow);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [categories.length]);

  if (categories.length === 0) return null;

  const showHint = hasOverflow && !atEnd;

  return (
    <div className="px-2 py-3 border-b border-border relative">
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-2 scroll-smooth"
      >
        {all.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryClick(cat.id)}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div
              className={`rounded-full p-[3px] transition-all ${
                activeCategory === cat.id ? "story-ring" : "bg-border"
              }`}
            >
              <div className="rounded-full overflow-hidden bg-background p-[2px]">
                <img
                  src={cat.image}
                  alt={cat.name}
                  width={64}
                  height={64}
                  loading="lazy"
                  className="rounded-full w-16 h-16 object-cover"
                />
              </div>
            </div>
            <span className="text-[11px] text-foreground truncate w-16 text-center">
              {cat.emoji} {cat.name}
            </span>
          </button>
        ))}
      </div>

      {/* Swipe hint */}
      {showHint && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 bottom-0 flex items-center pr-1"
        >
          <div className="h-full w-12 bg-gradient-to-l from-background via-background/80 to-transparent" />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-foreground/80 text-background rounded-full p-1 animate-pulse shadow-md">
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryStories;
