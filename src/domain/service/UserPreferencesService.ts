import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../core/config/firebaseConfig";
import {
  type CombustionConsumptionUnit,
  type ElectricConsumptionUnit,
  type DistanceUnit,
  isCombustionConsumptionUnit,
  isElectricConsumptionUnit,
} from "../model/IRouteData";

export interface UserPreferences {
  distanceUnit: DistanceUnit;
  combustionConsumptionUnit: CombustionConsumptionUnit;
  electricConsumptionUnit: ElectricConsumptionUnit;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  distanceUnit: "km",
  combustionConsumptionUnit: "l/100km",
  electricConsumptionUnit: "kwh/100km",
};

const isDistanceUnit = (value: any): value is DistanceUnit => ["m", "km", "mi"].includes(value);

export class UserPreferencesService {
  async get(userId: string): Promise<UserPreferences> {
    if (!userId) throw new Error("User id is required");
    const ref = doc(db, "users", userId);
    const snapshot = await getDoc(ref);
    const raw = snapshot.exists() ? snapshot.data().preferences : undefined;
    const legacyConsumptionUnit = raw?.consumptionUnit;

    return {
      distanceUnit: isDistanceUnit(raw?.distanceUnit) ? raw.distanceUnit : DEFAULT_PREFERENCES.distanceUnit,
      combustionConsumptionUnit: isCombustionConsumptionUnit(raw?.combustionConsumptionUnit)
        ? raw.combustionConsumptionUnit
        : isCombustionConsumptionUnit(legacyConsumptionUnit)
          ? legacyConsumptionUnit
          : DEFAULT_PREFERENCES.combustionConsumptionUnit,
      electricConsumptionUnit: isElectricConsumptionUnit(raw?.electricConsumptionUnit)
        ? raw.electricConsumptionUnit
        : isElectricConsumptionUnit(legacyConsumptionUnit)
          ? legacyConsumptionUnit
          : DEFAULT_PREFERENCES.electricConsumptionUnit,
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
    await setDoc(
      doc(db, "users", userId),
      { preferences: payload },
      { merge: true }
    );
  }
}
