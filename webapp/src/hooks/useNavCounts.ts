import { useEffect, useState } from "react";
import { apiService } from "../services/api.service";
import { useAuth } from "../contexts/useAuth";

/**
 * Compteurs affichés dans la navigation.
 *
 * Ils donnent la charge courante sans avoir à ouvrir l'écran. Les erreurs sont
 * silencieuses : un compteur absent vaut mieux qu'une navigation qui échoue,
 * et l'écran lui-même signalera le problème s'il y en a un.
 */
export interface NavCounts {
  interventions?: number;
  clients?: number;
  stock?: number;
}

export function useNavCounts(): NavCounts {
  const { user } = useAuth();
  const [counts, setCounts] = useState<NavCounts>({});

  useEffect(() => {
    if (!user) return;

    let annule = false;
    const charger = async () => {
      try {
        const [interventions, clients, stock] = await Promise.allSettled([
          apiService.getInterventions({ limit: 1 }),
          user.role === "technicien" ? Promise.resolve(null) : apiService.getClients({ limit: 1 }),
          user.role === "technicien" ? Promise.resolve(null) : apiService.getStock({ limit: 1 }),
        ]);
        if (annule) return;

        const total = (r: PromiseSettledResult<unknown>) => {
          if (r.status !== "fulfilled" || !r.value) return undefined;
          const v = r.value as { pagination?: { total?: number } };
          return v.pagination?.total;
        };

        setCounts({
          interventions: total(interventions),
          clients: total(clients),
          stock: total(stock),
        });
      } catch {
        // Compteurs indisponibles : la navigation reste utilisable.
      }
    };

    charger();
    return () => {
      annule = true;
    };
  }, [user]);

  return counts;
}
