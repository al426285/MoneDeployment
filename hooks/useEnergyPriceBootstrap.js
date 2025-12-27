import { useEffect } from "react";
import { energyPriceGateway } from "../src/data/provider/EnergyPriceGateway";

export function useEnergyPriceBootstrap(isLoggedIn) {
  useEffect(() => {
    if (!isLoggedIn) return;

    let cancelled = false;

    (async () => {
      try {
        await energyPriceGateway.prefetch();
      } catch (err) {
        console.warn("useEnergyPriceBootstrap: prefetch failed", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);
}
