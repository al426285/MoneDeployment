import { type ConsumptionUnit, type IRouteData } from "../model/IRouteData";
import { type IRouteProvider } from "../route/IRouteProvider";
import { RouteProxy } from "../proxy/RouteProxy";
import { OpenRouteServiceAdapter } from "../../data/provider/OpenRouteServiceAdapter";
import { OpenRouteServiceHttpClient } from "../../data/provider/OpenRouteServiceHttpClient";
import { type VehicleEnergySource } from "../../data/provider/EnergyPriceGateway";
import { type RouteRepository, type RouteSavedDTO } from "../repository/RouteRespository";
import { RouteRepositoryFirebase } from "../../data/repository/RouteRepositoryFirebase";
import { UserSession } from "../session/UserSession";

const ROUTE_CACHE_KEY = (userId: string) => `routes_cache_${userId}`;

const readCache = <T>(key: string): T | null => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
};

const writeCache = (key: string, payload: unknown) => {
    try {
        const wrapped = { data: payload, cachedAt: Date.now() };
        localStorage.setItem(key, JSON.stringify(wrapped));
    } catch { /* ignore cache write errors */ }
};

const requireOnline = () => {
    if (typeof navigator !== "undefined" && navigator && navigator.onLine === false) {
        throw new Error("Se requiere conexión a internet para esta acción.");
    }
};


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
        requireOnline();
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
        try {
            return await this.provider.getRoute(
                options.origin,
                options.destination,
                options.mobilityType?.toLowerCase?.() || options.mobilityType,
                options.routeType?.toLowerCase?.() || options.routeType
            );
        } catch (err: any) {
            const msg = (err?.message || "").toLowerCase();
            if (
                msg.includes("openrouteservice") ||
                msg.includes("failed to fetch") ||
                msg.includes("network") ||
                msg.includes("fetch") ||
                msg.includes("internal server error")
            ) {
                throw new Error("No se pudo calcular la ruta. Comprueba tu conexión a internet y vuelve a intentarlo.");
            }
            throw err;
        }
	}

    async saveRoute(options: SaveRouteOptions): Promise<string> {
        requireOnline();
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
        const id = await this.repository.saveRoute(userId, payload);
        await this.refreshRouteCache(userId);
        return id;
    }

    async listSavedRoutes(userId?: string): Promise<RouteSavedDTO[]> {
        const resolvedId = this.resolveUserId(userId);
        return this.listRoutesWithCache(resolvedId);
    }

    async getSavedRoute(routeId: string, userId?: string): Promise<RouteSavedDTO | null> {
        const resolvedId = this.resolveUserId(userId);
        return this.repository.getRoute(resolvedId, routeId);
    }

    async deleteSavedRoute(routeId: string, userId?: string): Promise<void> {
        requireOnline();
        const resolvedId = this.resolveUserId(userId);
        await this.repository.deleteRoute(resolvedId, routeId);
        await this.refreshRouteCache(resolvedId);
    }

    async updateSavedRoute(routeId: string, payload: RouteSavedDTO, userId?: string): Promise<void> {
        requireOnline();
        const resolvedId = this.resolveUserId(userId);
        this.ensureRequiredFields(payload);
        const trimmedName = payload.name?.trim();
        if (!trimmedName) throw new Error("Route name is required");
        const existing = await this.repository.getRoute(resolvedId, routeId);
        if (!existing) throw new Error("RouteNotFoundException");
        await this.repository.updateRoute(resolvedId, routeId, {
            ...payload,
            name: trimmedName,
            mobilityMethod: payload.mobilityMethod ?? payload.mobilityType,
        });
        await this.refreshRouteCache(resolvedId);
    }

    async setFavorite(routeId: string, favorite: boolean, userId?: string): Promise<void> {
        requireOnline();
        const resolvedId = this.resolveUserId(userId);
        await this.repository.updateRoute(resolvedId, routeId, { favorite } as any);
        await this.refreshRouteCache(resolvedId);
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

    private async listRoutesWithCache(userId: string): Promise<RouteSavedDTO[]> {
        const cacheKey = ROUTE_CACHE_KEY(userId);
        const cached = readCache<{ data: RouteSavedDTO[] }>(cacheKey)?.data ?? null;
        const offline = typeof navigator !== "undefined" && navigator && navigator.onLine === false;
        if (offline) {
            if (cached) return cached;
            throw new Error("OfflineNoCache");
        }
        try {
            const routes = await this.repository.listRoutes(userId);
            if (Array.isArray(routes) && routes.length === 0 && cached && cached.length > 0) {
                // Keep previous snapshot if current read is empty (likely offline/flaky).
                return cached;
            }
            writeCache(cacheKey, routes);
            return routes;
        } catch (err) {
            if (cached) return cached; // offline fallback
            throw err;
        }
    }

    private async refreshRouteCache(userId: string): Promise<void> {
        const offline = typeof navigator !== "undefined" && navigator && navigator.onLine === false;
        if (offline) return; // avoid clearing cache when offline fetch returns empty/failed
        try {
            const routes = await this.repository.listRoutes(userId);
            writeCache(ROUTE_CACHE_KEY(userId), routes);
        } catch {
            /* best-effort cache refresh */
        }
    }
}
