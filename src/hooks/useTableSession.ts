import { useCallback, useEffect, useState } from "react";

const KEY = "tableSession";

export interface TableSessionInfo {
  code: string;
  session_id: string;
  diner_id: string;
  alias: string | null;
  table_label: string;
  restaurant_slug: string;
  restaurant_name?: string;
}

function read(): TableSessionInfo | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TableSessionInfo;
  } catch {
    return null;
  }
}

export function useTableSession() {
  const [session, setSession] = useState<TableSessionInfo | null>(() => read());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setSession(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const save = useCallback((info: TableSessionInfo) => {
    localStorage.setItem(KEY, JSON.stringify(info));
    setSession(info);
  }, []);

  const leave = useCallback(() => {
    localStorage.removeItem(KEY);
    setSession(null);
  }, []);

  return { session, save, leave };
}
