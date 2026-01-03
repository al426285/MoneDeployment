import type {
  CombustionConsumptionUnit,
  DistanceUnit,
  ElectricConsumptionUnit,
} from "./IRouteData";

export interface UserPreferences {
  distanceUnit: DistanceUnit;
  combustionConsumptionUnit: CombustionConsumptionUnit;
  electricConsumptionUnit: ElectricConsumptionUnit;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  distanceUnit: "km",
  combustionConsumptionUnit: "l/100km",
  electricConsumptionUnit: "kwh/100km",
};
