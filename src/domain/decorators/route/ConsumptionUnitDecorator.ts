import { areConsumptionUnitsCompatible, type ConsumptionUnit, type IRouteData } from "../../model/IRouteData";
import { RouteDecorator } from "./RouteDecorator";
import { normalizeConsumptionUnit } from "../../utils/consumption";

const convertToBase = (value: number, fromUnit: ConsumptionUnit): number => {
  switch (fromUnit) {
    case "km/l":
      return value <= 0 ? 0 : 100 / value;
    case "km/kwh":
      return value <= 0 ? 0 : 100 / value;
    case "l/100km":
    case "kwh/100km":
    default:
      return value;
  }
};

export class ConsumptionUnitDecorator extends RouteDecorator {
  constructor(route: IRouteData, private readonly preferredUnit: ConsumptionUnit) {
    super(route);
  }

  getConsumptionValue(): number | null {
    const baseValue = this.route.getConsumptionValue();
    const baseUnit = this.route.getConsumptionUnit();
    if (baseValue == null || baseUnit == null) return null;

    // normalize units if needed
    const normalizedBaseUnit = normalizeConsumptionUnit(baseUnit as string) ?? baseUnit;

    if (!areConsumptionUnitsCompatible(normalizedBaseUnit as ConsumptionUnit, this.preferredUnit)) {
      return baseValue;
    }

    // convert to canonical base per mobility type (same unit family)
    const canonical = convertToBase(baseValue, normalizedBaseUnit as ConsumptionUnit);

    switch (this.preferredUnit) {
      case "km/l":
        return canonical === 0 ? null : 100 / canonical;
      case "km/kwh":
        return canonical === 0 ? null : 100 / canonical;
      case "kwh/100km":
      case "l/100km":
      default:
        return canonical;
    }
  }

  getConsumptionUnit(): ConsumptionUnit | null {
    const baseUnit = this.route.getConsumptionUnit();
    if (!baseUnit) return null;
    const normalizedBaseUnit = normalizeConsumptionUnit(baseUnit as string) ?? baseUnit;
    if (!areConsumptionUnitsCompatible(normalizedBaseUnit as ConsumptionUnit, this.preferredUnit)) {
      return normalizedBaseUnit as ConsumptionUnit;
    }
    return this.preferredUnit;
  }
}
