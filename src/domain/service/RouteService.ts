import { type ConsumptionUnit, type IRouteData } from "../model/IRouteData";
import { type IRouteProvider } from "../route/IRouteProvider";
import { RouteProxy } from "../proxy/RouteProxy";
import { OpenRouteServiceAdapter } from "../../data/provider/OpenRouteServiceAdapter";
import { OpenRouteServiceHttpClient } from "../../data/provider/OpenRouteServiceHttpClient";
import { type VehicleEnergySource } from "../../data/provider/EnergyPriceGateway";
import { type RouteRepository, type RouteSavedDTO } from "../repository/RouteRespository";
import { RouteRepositoryFirebase } from "../../data/repository/RouteRepositoryFirebase";
import { UserSession } from "../session/UserSession";


export interface BaseRouteOptions {
	origin: string;
	destination: string;
	mobilityType: string;
	routeType: string;
}

export interface RouteRequestOptions extends BaseRouteOptions {
	origin: string;
	destination: string;
	mobilityType: string;
	routeType: string;
	fuelType?: VehicleEnergySource;
	estimatedConsumption?: {
		value: number;
		unit: ConsumptionUnit;
	};
}

export interface RouteServiceDeps {
    provider?: IRouteProvider;
    repository?: RouteRepository;
}
export interface SaveRouteOptions extends BaseRouteOptions {
	name: string;
	userId?: string;
}

export class RouteService {
    private static instance: RouteService | null = null;
    private readonly repository: RouteRepository;
    private readonly provider: IRouteProvider;

    private constructor(deps: RouteServiceDeps = {}) {
        this.repository = deps.repository ?? new RouteRepositoryFirebase();
        const fallbackProvider = new OpenRouteServiceAdapter(new OpenRouteServiceHttpClient());
        const realProvider = deps.provider ?? fallbackProvider;
        this.provider = realProvider instanceof RouteProxy ? realProvider : new RouteProxy(realProvider);
    }

    static getInstance(deps: RouteServiceDeps = {}): RouteService {
        if (!RouteService.instance) {
            RouteService.instance = new RouteService(deps);
        }
        return RouteService.instance;
    }


	async requestRoute(options: RouteRequestOptions): Promise<IRouteData> {
        this.ensureRequiredFields(options);

        // Validate coordinate format and ranges before delegating to provider.
        const validateCoord = (value?: string) => {
            if (!value) throw new Error("InvalidDataException");
            const parts = String(value)
                .split(",")
                .map((p) => parseFloat(p.trim()));
            if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) throw new Error("InvalidDataException");
            const [lat, lng] = parts;
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new Error("InvalidDataException");
            return [lat, lng] as [number, number];
        };

        validateCoord(options.origin);
        validateCoord(options.destination);

        return this.provider.getRoute(
            options.origin,
            options.destination,
            options.mobilityType,
            options.routeType
        );
	}

    async saveRoute(options: SaveRouteOptions): Promise<string> {
        const userId = this.resolveUserId(options.userId);
        this.ensureRequiredFields(options);
        const trimmedName = options.name?.trim();
        if (!trimmedName) {
            throw new Error("Route name is required");
        }
        const payload: RouteSavedDTO = {
            name: trimmedName,
            origin: options.origin,
            destination: options.destination,
            mobilityType: options.mobilityType,
            mobilityMethod: options.mobilityType,
            routeType: options.routeType,
        };
        return this.repository.saveRoute(userId, payload);
    }

    async listSavedRoutes(userId?: string): Promise<RouteSavedDTO[]> {
        const resolvedId = this.resolveUserId(userId);
        return this.repository.listRoutes(resolvedId);
    }

    async deleteSavedRoute(routeId: string, userId?: string): Promise<void> {
        const resolvedId = this.resolveUserId(userId);
        await this.repository.deleteRoute(resolvedId, routeId);
    }

    private ensureRequiredFields(options: BaseRouteOptions) {
        if (!options.origin?.trim()) throw new Error("Origin is required");
        if (!options.destination?.trim()) throw new Error("Destination is required");
        if (!options.mobilityType?.trim()) throw new Error("Mobility type is required");
        if (!options.routeType?.trim()) throw new Error("Route type is required");
    }

    private resolveUserId(explicit?: string): string {
        if (explicit) return explicit;
        const session = UserSession.loadFromCache();
        if (session?.userId) return session.userId;
        throw new Error("User session not found. Provide a user id or ensure the session is cached.");
    }
}
