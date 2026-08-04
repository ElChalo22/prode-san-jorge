import { useCallback, useEffect, useState } from "react";

import type { ProdeGameWithDetails } from "../services/prodeGames";
import { getOpenProdeGames } from "../services/prodeGames";

export function useOpenProdeGames() {
  const [games, setGames] = useState<ProdeGameWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGames = useCallback(async () => {
    try {
      setError(null);

      const data = await getOpenProdeGames();

      setGames(data);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los prodes.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshGames = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      const data = await getOpenProdeGames();

      setGames(data);
    } catch (err) {
      console.error(err);
      setError("No se pudieron actualizar los prodes.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  return {
    games,
    loading,
    refreshing,
    error,
    refreshGames,
  };
}