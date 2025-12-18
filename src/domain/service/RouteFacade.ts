import { RouteService,  type RouteRequestOptions } from "./RouteService";
import { UserPreferencesService, type UserPreferences } from "./UserPreferencesService";
import { energyPriceGateway, type VehicleEnergySource } from "../../data/provider/EnergyPriceGateway";
import { type CostEstimatorGateway, type PriceSnapshot } from "../decorators/Cost/CostEstimatorDecorator";
import { UserSession } from "../session/UserSession";
import type { Vehicle } from "../model/VehicleInterface";
import type { ConsumptionUnit, IRouteData, DistanceUnit } from "../model/IRouteData";
import { Route, type RouteProps } from "../model/Route";
import { DistanceUnitDecorator } from "../decorators/route/DistanceUnitDecorator";
import { ConsumptionUnitDecorator } from "../decorators/route/ConsumptionUnitDecorator";
import { CostEstimatorDecorator } from "../decorators/Cost/CostEstimatorDecorator";

export interface RouteResponse {
    preferences: UserPreferences;
    route: SerializedRoute;
    baseRoute: SerializedRoute;
    priceSnapshot?: PriceSnapshot | null;
}

export interface SerializedRoute {
    distance: number;
    distanceUnit: DistanceUnit;
    duration: number;
    mobilityType: string;
    routeType: string;
    steps: string[];
    cost: number;
    currency: string;
    consumptionPer100Km: number | null;
    consumptionUnit: ConsumptionUnit | null;
    polyline: Array<[number, number]> | null;
}

export class RouteFacade {
    private service: RouteService;
    private preferencesService: UserPreferencesService;
    private costGateway?: CostEstimatorGateway;

    constructor(
        deps: {
            service?: RouteService;
            preferencesService?: UserPreferencesService;
            costGateway?: CostEstimatorGateway;
        } = {}
    ) {
        this.service = deps.service ?? RouteService.getInstance();
        this.preferencesService = deps.preferencesService ?? new UserPreferencesService();
        this.costGateway = deps.costGateway ?? energyPriceGateway;
    }

    async requestRoute(options: RouteRequestOptions & { userId?: string }, vehicle?: Vehicle): Promise<RouteResponse> {
        const resolvedUserId = this.resolveUserId(options.userId);
        const preferences = await this.preferencesService.get(resolvedUserId);
        const priceSnapshot = await this.loadPriceSnapshot();

        const plannerOptions = this.applyVehicleOverrides(this.stripFacadeFields(options), vehicle);
        const rawRoute = await this.service.requestRoute(plannerOptions);

        const canonicalConsumption =
            this.normalizeConsumption(plannerOptions.estimatedConsumption) ??
            this.canonicalizeConsumption(rawRoute.getConsumptionPer100Km(), rawRoute.getConsumptionUnit());

        const routeProps: RouteProps = {
            origin: plannerOptions.origin,
            destination: plannerOptions.destination,
            distanceMeters: rawRoute.getDistance(),
            durationMinutes: rawRoute.getDuration(),
            mobilityType: plannerOptions.mobilityType,
            routeType: plannerOptions.routeType,
            steps: rawRoute.getSteps(),
            consumptionPer100Km: canonicalConsumption?.value ?? null,
            consumptionUnit: canonicalConsumption?.unit ?? null,
            cost: rawRoute.getCost(),
            currency: rawRoute.getCostCurrency(),
            polyline: rawRoute.getPolyline(),
        };

        const energySource = this.resolveEnergySource(plannerOptions);
        if (priceSnapshot) {
            const costEstimate = this.estimateCost(routeProps, priceSnapshot, energySource);
            if (costEstimate != null) {
                routeProps.cost = costEstimate;
                routeProps.currency = priceSnapshot.currency ?? routeProps.currency;
            }
        }

        const enrichedRoute = new Route(routeProps);

        const preferredConsumptionUnit = this.resolveConsumptionPreference(preferences, plannerOptions.mobilityType);
        let decorated: IRouteData = enrichedRoute;
        decorated = new DistanceUnitDecorator(decorated, preferences.distanceUnit);
        decorated = new ConsumptionUnitDecorator(decorated, preferredConsumptionUnit);
        if (priceSnapshot) {
            decorated = new CostEstimatorDecorator(decorated, priceSnapshot);
        }

        return {
            preferences,
            route: this.serializeRoute(decorated),
            baseRoute: this.serializeRoute(enrichedRoute),
            priceSnapshot,
        };
    }

    async previewRoute(options: RouteRequestOptions, vehicle?: Vehicle): Promise<SerializedRoute> {
        const plannerOptions = this.applyVehicleOverrides(options, vehicle);
        const rawRoute = await this.service.requestRoute(plannerOptions);
        return this.serializeRoute(rawRoute);
    }

    async requestAndSaveRoute(
        options: RouteRequestOptions & { userId?: string; name: string },
        vehicle?: Vehicle
    ): Promise<RouteResponse> {
        const plan = await this.requestRoute(options, vehicle);
        const resolvedUserId = this.resolveUserId(options.userId);
        await this.service.saveRoute({
        origin: options.origin,
        destination: options.destination,
        mobilityType: options.mobilityType,
        routeType: options.routeType,
        name: options.name,
        userId: resolvedUserId,
        });
        return plan;
    }

    async saveRoute(options: any) {
        return this.service.saveRoute(options);
    }

    async listSavedRoutes(userId?: string) {
        return this.service.listSavedRoutes(userId);
    }

    async deleteSavedRoute(routeId: string, userId?: string) {
        return this.service.deleteSavedRoute(routeId, userId);
    }

    private stripFacadeFields(options: RouteRequestOptions & { userId?: string }): RouteRequestOptions {
        const { userId: _ignored, ...routeOptions } = options;
        return routeOptions;
    }

    private applyVehicleOverrides(options: RouteRequestOptions, vehicle?: Vehicle): RouteRequestOptions {
        if (!vehicle) return options;

        const overrides: Partial<RouteRequestOptions> = {};

        const energySource = this.mapVehicleFuelType(vehicle);
        if (energySource) {
            overrides.fuelType = energySource;
        }

        const consumption = this.mapVehicleConsumption(vehicle);
        if (consumption) {
            overrides.estimatedConsumption = consumption;
        }

        return { ...options, ...overrides };
    }

    private mapVehicleFuelType(vehicle: Vehicle): VehicleEnergySource | undefined {
        if (!vehicle.fuelType) return undefined;
        if (vehicle.fuelType === "gasoline" || vehicle.fuelType === "diesel" || vehicle.fuelType === "electric") {
            return vehicle.fuelType;
        }
        return undefined;
    }

    private mapVehicleConsumption(vehicle: Vehicle): { value: number; unit: ConsumptionUnit } | null {
        const unit = vehicle.consumption?.unit.toLocaleLowerCase() as ConsumptionUnit | undefined;
        if (!unit) return null;
        const amount = vehicle.consumption?.amount ?? null;
        if (amount == null || !Number.isFinite(amount) || amount <= 0) return null;
        return { value: amount, unit };
    }

    private async loadPriceSnapshot(): Promise<PriceSnapshot | null> {
        if (!this.costGateway) return null;
        try {
            return await this.costGateway.getLatestPrices();
        } catch (err) {
            console.warn("RouteFacade: unable to load price snapshot", err);
            return null;
        }
    }

    private resolveUserId(explicit?: string): string {
        if (explicit) return explicit;
        const session = UserSession.loadFromCache();
        if (session?.userId) return session.userId;
        throw new Error("User session not found. Provide a user id or ensure the session is cached.");
    }

    private normalizeConsumption(
        estimated?: { value: number; unit: ConsumptionUnit }
    ): { value: number; unit: ConsumptionUnit } | null {
        if (!estimated) return null;
        if (!Number.isFinite(estimated.value) || estimated.value <= 0) {
            throw new Error("Consumption must be a positive value");
        }
        return this.canonicalizeConsumption(estimated.value, estimated.unit);
    }

    private canonicalizeConsumption(
        value?: number | null,
        unit?: ConsumptionUnit | null
    ): { value: number; unit: ConsumptionUnit } | null {
        if (value == null || unit == null) return null;
        if (!Number.isFinite(value) || value <= 0) return null;
        switch (unit) {
            case "km/l":
                return { value: 100 / value, unit: "l/100km" };
            case "km/kwh":
                return { value: 100 / value, unit: "kwh/100km" };
            case "l/100km":
            case "kwh/100km":
            default:
                return { value, unit };
        }
    }

    private resolveConsumptionPreference(preferences: UserPreferences, mobilityType: string): ConsumptionUnit {
        return mobilityType === "electric"
            ? preferences.electricConsumptionUnit
            : preferences.combustionConsumptionUnit;
    }

    private resolveEnergySource(options: RouteRequestOptions): VehicleEnergySource | undefined {
        if (options.fuelType) return options.fuelType;
    }

    private estimateCost(
        routeProps: RouteProps,
        priceSnapshot: PriceSnapshot,
        energy: VehicleEnergySource
    ): number | null {
        const distanceMeters = routeProps.distanceMeters;
        if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return null;
        const consumption = routeProps.consumptionPer100Km;
        const unit = routeProps.consumptionUnit;
        if (consumption == null || !unit) return null;

        const distanceKm = distanceMeters / 1000;
        let pricePerUnit: number | undefined;
        if (energy === "electric") {
            if (unit !== "kwh/100km") return null;
            pricePerUnit = priceSnapshot.electricityPerKwh;
        } else {
            if (unit !== "l/100km") return null;
            pricePerUnit = energy === "diesel" ? priceSnapshot.dieselPerLiter : priceSnapshot.gasolinePerLiter;
            if (pricePerUnit == null && energy === "gasoline") {
                pricePerUnit = priceSnapshot.dieselPerLiter;
            }
        }

        if (pricePerUnit == null) return null;
        const cost = (distanceKm / 100) * consumption * pricePerUnit;
        return Number.isFinite(cost) ? Math.max(cost, 0) : null;
    }

    private serializeRoute(route: IRouteData): SerializedRoute {
        return {
            distance: route.getDistance(),
            distanceUnit: route.getDistanceUnit(),
            duration: route.getDuration(),
            mobilityType: route.getMobilityType(),
            routeType: route.getRouteType(),
            steps: route.getSteps(),
            cost: route.getCost(),
            currency: route.getCostCurrency(),
            consumptionPer100Km: route.getConsumptionPer100Km(),
            consumptionUnit: route.getConsumptionUnit(),
            polyline: route.getPolyline(),
        };
    }
}

