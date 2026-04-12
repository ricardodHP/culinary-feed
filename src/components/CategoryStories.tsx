import { categories, type Category } from "@/data/restaurant";

interface CategoryStoriesProps {
  activeCategory: string | null;
  onCategoryClick: (categoryId: string) => void;
}

const CategoryStories = ({ activeCategory, onCategoryClick }: CategoryStoriesProps) => {
  return (
    <div className="px-2 py-3 border-b border-border">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide px-2">
        {categories.map((cat: Category) => (
          <button
            key={cat.id}
            onClick={() => onCategoryClick(cat.id)}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div
              className={`rounded-full p-[3px] transition-all ${
                activeCategory === cat.id
                  ? "story-ring"
                  : "bg-border"
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
    </div>
  );
};

export default CategoryStories;
