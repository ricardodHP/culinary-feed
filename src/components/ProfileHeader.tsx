import { Heart, MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RestaurantInfo } from "@/data/restaurant";

interface ProfileHeaderProps {
  restaurant: RestaurantInfo;
}

const ProfileHeader = ({ restaurant }: ProfileHeaderProps) => {
  return (
    <div className="px-4 pt-4 pb-2">
      {/* Top row: avatar + stats */}
      <div className="flex items-center gap-4 mb-3">
        <div className="story-ring shrink-0">
          <div className="rounded-full overflow-hidden bg-background p-[2px]">
            <img
              src={restaurant.logo}
              alt={restaurant.name}
              width={86}
              height={86}
              className="rounded-full w-[86px] h-[86px] object-cover"
            />
          </div>
        </div>

        <div className="flex-1 grid grid-cols-3 text-center gap-1">
          <div>
            <p className="text-lg font-bold text-foreground">{restaurant.posts}</p>
            <p className="text-xs text-muted-foreground">platillos</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{restaurant.followers}</p>
            <p className="text-xs text-muted-foreground">seguidores</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{restaurant.following}</p>
            <p className="text-xs text-muted-foreground">siguiendo</p>
          </div>
        </div>
      </div>

      {/* Name + Bio */}
      <div className="mb-3">
        <h1 className="text-sm font-bold text-foreground">{restaurant.name}</h1>
        {restaurant.bio && (
          <p className="text-sm text-foreground whitespace-pre-line mt-1 leading-relaxed">
            {restaurant.bio}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-2">
        {restaurant.instagramLink && (
          <Button
            variant="default"
            size="sm"
            className="flex-1 h-8 text-xs font-semibold"
            onClick={() => window.open(restaurant.instagramLink, "_blank")}
          >
            <Heart className="w-3.5 h-3.5 mr-1" />
            Seguir
          </Button>
        )}
        {restaurant.whatsappLink && (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 h-8 text-xs font-semibold"
            onClick={() => window.open(restaurant.whatsappLink, "_blank")}
          >
            <MessageCircle className="w-3.5 h-3.5 mr-1" />
            Mensaje
          </Button>
        )}
        {restaurant.instagramLink && (
          <Button
            variant="secondary"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => window.open(restaurant.instagramLink, "_blank")}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;
