import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LikesContextType {
  likedIds: Set<string>;
  toggleLike: (id: string) => void;
  isLiked: (id: string) => boolean;
}

const LikesContext = createContext<LikesContextType | undefined>(undefined);

const STORAGE_KEY = "likedDishes:v1";

const loadInitial = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};

export const LikesProvider = ({ children }: { children: ReactNode }) => {
  const [likedIds, setLikedIds] = useState<Set<string>>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...likedIds]));
    } catch {
      // ignore storage errors
    }
  }, [likedIds]);

  const toggleLike = useCallback((id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        supabase.rpc("decrement_dish_likes", { _dish_id: id });
      } else {
        next.add(id);
        supabase.rpc("increment_dish_likes", { _dish_id: id });
      }
      return next;
    });
  }, []);

  const isLiked = useCallback((id: string) => likedIds.has(id), [likedIds]);

  return (
    <LikesContext.Provider value={{ likedIds, toggleLike, isLiked }}>
      {children}
    </LikesContext.Provider>
  );
};

export const useLikes = () => {
  const ctx = useContext(LikesContext);
  if (!ctx) throw new Error("useLikes must be used within LikesProvider");
  return ctx;
};
