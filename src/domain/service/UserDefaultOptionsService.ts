import { VehicleService } from "./VehicleService";
import {
    DEFAULT_USER_DEFAULT_OPTIONS,
    type TransportMode,
    type RouteTypeOption,
    type UserDefaultOptions,
} from "../model/UserDefaultOptions";
import type { UserDefaultOptionsRepositoryInterface } from "../repository/UserDefaultOptionsRepositoryInterface";
import { UserDefaultOptionsRepository } from "../../data/repository/UserDefaultOptionsRepository";

const requireOnline = () => {
    if (typeof navigator !== "undefined" && navigator && navigator.onLine === false) {
        throw new Error("DatabaseNotAvailableException");
    }
};

const normalizeTransportMode = (value: unknown): TransportMode | null => {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toLowerCase();
    return normalized === "vehicle" || normalized === "bike" || normalized === "walk"
        ? (normalized as TransportMode)
        : null;
};

const normalizeRouteType = (value: unknown): RouteTypeOption | null => {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toLowerCase();
    return normalized === "fastest" || normalized === "shortest" || normalized === "scenic"
        ? (normalized as RouteTypeOption)
        : null;
};

const sanitizeVehicleName = (value: unknown): string | null => {
    if (value === null) return null;
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const ensureVehicleExists = async (userId: string, vehicleName: string): Promise<void> => {
    const service = VehicleService.getInstance();
    const vehicles = await service.getVehicles(userId);
    const exists = vehicles.some((vehicle) => vehicle.name === vehicleName);
    if (!exists) {
        throw new Error("VehicleNotFoundException");
    }
};

export class UserDefaultOptionsService {
    private repository: UserDefaultOptionsRepositoryInterface;

    constructor(repository?: UserDefaultOptionsRepositoryInterface) {
        this.repository = repository ?? new UserDefaultOptionsRepository();
    }

    async get(userId: string): Promise<UserDefaultOptions> {
        if (!userId) throw new Error("User id is required");
        const raw = await this.repository.getDefaultOptions(userId);

        return {
            transportMode: normalizeTransportMode(raw?.transportMode) ?? DEFAULT_USER_DEFAULT_OPTIONS.transportMode,
            routeType: normalizeRouteType(raw?.routeType) ?? DEFAULT_USER_DEFAULT_OPTIONS.routeType,
            vehicleName: sanitizeVehicleName(raw?.vehicleName) ?? DEFAULT_USER_DEFAULT_OPTIONS.vehicleName,
        };
    }

    async save(userId: string, options: Partial<UserDefaultOptions>): Promise<void> {
        if (!userId) throw new Error("User id is required");

        requireOnline();

        const normalizedTransport =
            options.transportMode === undefined ? undefined : normalizeTransportMode(options.transportMode);
        if (options.transportMode !== undefined && !normalizedTransport) {
            throw new Error("MobilityTypeNotFoundException");
        }

        const normalizedRoute =
            options.routeType === undefined ? undefined : normalizeRouteType(options.routeType);
        if (options.routeType !== undefined && !normalizedRoute) {
            throw new Error("InvalidDataException");
        }

        let resolvedVehicleName: string | null | undefined = undefined;
        if (options.vehicleName !== undefined) {
            const sanitized = sanitizeVehicleName(options.vehicleName);
            if (sanitized) {
                await ensureVehicleExists(userId, sanitized);
                resolvedVehicleName = sanitized;
            } else {
                resolvedVehicleName = null;
            }
        }

        const current = await this.get(userId);
        const payload: UserDefaultOptions = {
            transportMode: normalizedTransport ?? current.transportMode,
            routeType: normalizedRoute ?? current.routeType,
            vehicleName:
                resolvedVehicleName !== undefined
                    ? resolvedVehicleName
                    : current.vehicleName,
        };

        await this.repository.saveDefaultOptions(userId, payload);
    }
}
