export type TransportMode = "vehicle" | "bike" | "walk";
export type RouteTypeOption = "fastest" | "shortest" | "scenic";

export interface UserDefaultOptions {
    transportMode: TransportMode;
    routeType: RouteTypeOption;
    vehicleName: string | null;
}

export const DEFAULT_USER_DEFAULT_OPTIONS: UserDefaultOptions = {
    transportMode: "vehicle",
    routeType: "fastest",
    vehicleName: null,
};
