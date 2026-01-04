import { type ConsumptionUnit, type DistanceUnit, type IRouteData } from "../../model/IRouteData";

export abstract class RouteDecorator implements IRouteData {
  constructor(protected route: IRouteData) {}

  getDistance(): number { return this.route.getDistance(); }
  getDistanceUnit(): DistanceUnit { return this.route.getDistanceUnit(); }
  getDuration(): number { return this.route.getDuration(); }
  getCost(): number { return this.route.getCost(); }
  getCostCurrency(): string { return this.route.getCostCurrency(); }
  getSteps(): string[] { return this.route.getSteps(); }
  getMobilityType(): string { return this.route.getMobilityType(); }
  getRouteType(): string { return this.route.getRouteType(); }
  getConsumptionValue(): number | null { return this.route.getConsumptionValue(); }
  getConsumptionUnit(): ConsumptionUnit | null { return this.route.getConsumptionUnit(); }
  getPolyline(): Array<[number, number]> | null { return this.route.getPolyline(); }
}
