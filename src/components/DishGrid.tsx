import { type Dish } from "@/data/restaurant";

interface DishGridProps {
  dishes: Dish[];
  onDishClick: (dishIndex: number) => void;
}

const DishGrid = ({ dishes, onDishClick }: DishGridProps) => {
  if (dishes.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">No hay platillos en esta categoría</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-[2px] animate-fade-in">
      {dishes.map((dish, index) => (
        <button
          key={dish.id}
          onClick={() => onDishClick(index)}
          className="relative aspect-square overflow-hidden group"
        >
          <img
            src={dish.image}
            alt={dish.name}
            loading="lazy"
            width={512}
            height={512}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex items-center gap-3 text-primary-foreground text-sm font-semibold">
              <span>❤️ {dish.likes}</span>
            </div>
          </div>
          {dish.tags.includes("Best Seller") && (
            <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              🔥
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

export default DishGrid;
