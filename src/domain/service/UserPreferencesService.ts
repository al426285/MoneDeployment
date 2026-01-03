import {
  type DistanceUnit,
  isCombustionConsumptionUnit,
  isElectricConsumptionUnit,
} from "../model/IRouteData";
import {
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
} from "../model/UserPreferences";
import type { UserPreferencesRepositoryInterface } from "../repository/UserPreferencesRepositoryInterface";
import { UserPreferencesRepository } from "../../data/repository/UserPreferencesRepository";

const isDistanceUnit = (value: any): value is DistanceUnit => ["m", "km", "mi"].includes(value);

export class UserPreferencesService {
  private repository: UserPreferencesRepositoryInterface;

  constructor(repository?: UserPreferencesRepositoryInterface) {
    this.repository = repository ?? new UserPreferencesRepository();
  }

  async get(userId: string): Promise<UserPreferences> {
    if (!userId) throw new Error("User id is required");
    const raw = await this.repository.getPreferences(userId);
    const legacyConsumptionUnit = (raw as any)?.consumptionUnit;

    return {
      distanceUnit: isDistanceUnit(raw?.distanceUnit)
        ? raw.distanceUnit
        : DEFAULT_USER_PREFERENCES.distanceUnit,
      combustionConsumptionUnit: isCombustionConsumptionUnit(raw?.combustionConsumptionUnit)
        ? raw.combustionConsumptionUnit
        : isCombustionConsumptionUnit(legacyConsumptionUnit)
          ? legacyConsumptionUnit
          : DEFAULT_USER_PREFERENCES.combustionConsumptionUnit,
      electricConsumptionUnit: isElectricConsumptionUnit(raw?.electricConsumptionUnit)
        ? raw.electricConsumptionUnit
        : isElectricConsumptionUnit(legacyConsumptionUnit)
          ? legacyConsumptionUnit
          : DEFAULT_USER_PREFERENCES.electricConsumptionUnit,
    };
  }

  async save(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    if (!userId) throw new Error("User id is required");
    const hasInvalidDistance =
      preferences.distanceUnit !== undefined && !isDistanceUnit(preferences.distanceUnit);
    const hasInvalidCombustion =
      preferences.combustionConsumptionUnit !== undefined &&
      !isCombustionConsumptionUnit(preferences.combustionConsumptionUnit);
    const hasInvalidElectric =
      preferences.electricConsumptionUnit !== undefined &&
      !isElectricConsumptionUnit(preferences.electricConsumptionUnit);

    if (hasInvalidDistance || hasInvalidCombustion || hasInvalidElectric) {
      throw new Error("InvalidDataException");
    }

    const current = await this.get(userId);
    const payload: UserPreferences = {
      distanceUnit: isDistanceUnit(preferences.distanceUnit)
        ? preferences.distanceUnit
        : current.distanceUnit,
      combustionConsumptionUnit: isCombustionConsumptionUnit(preferences.combustionConsumptionUnit)
        ? preferences.combustionConsumptionUnit
        : current.combustionConsumptionUnit,
      electricConsumptionUnit: isElectricConsumptionUnit(preferences.electricConsumptionUnit)
        ? preferences.electricConsumptionUnit
        : current.electricConsumptionUnit,
    };
    await this.repository.savePreferences(userId, payload);
  }
}
