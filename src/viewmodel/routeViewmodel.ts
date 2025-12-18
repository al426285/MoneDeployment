import { useCallback, useRef, useState } from "react";
import { RouteFacade, type RouteResponse, type SerializedRoute } from "../domain/service/RouteFacade";
import type { Vehicle } from "../domain/model/VehicleInterface";

const getRouteFacade = (() => {
	let instance: RouteFacade | null = null;
	return (): RouteFacade => {
		if (!instance) {
			instance = new RouteFacade();
		}
		return instance;
	};
})();

export interface RouteSearchOptions {
	origin: string;
	destination: string;
	mobilityType: string;
	routeType: string;
	userId?: string;
	name?: string;
	save?: boolean;
	vehicle?: Vehicle;
}

export interface RouteViewmodelState {
	loading: boolean;
	error: string | null;
	result: RouteResponse | null;
	searchRoute: (options: RouteSearchOptions) => Promise<RouteResponse>;
	previewRoute: (options: RouteSearchOptions) => Promise<SerializedRoute>;
	reset: () => void;
}

const sanitizeValue = (value?: string | null): string => value?.trim() ?? "";

const createDefaultVehicle = (mode: string): Vehicle => {
	switch (mode) {
		case "bike":
			return {
				name: "Bicycle (default)",
				fuelType: null,
				consumption: { amount: 6.0, unit: "kcal/min" },
				type: "Bike",
				mostrarInfo: () => {},
			};
		case "walk":
			return {
				name: "Walking (default)",
				fuelType: null,
				consumption: { amount: 4.5, unit: "kcal/min" },
				type: "Walking",
				mostrarInfo: () => {},
			};
		case "vehicle":
		default:
			return {
				name: "Default car",
				fuelType: "gasoline",
				consumption: { amount: 6.5, unit: "l/100km" },
				type: "FuelCar",
				mostrarInfo: () => {},
			};
	}
};

interface NormalizedRouteContext {
	origin: string;
	destination: string;
	mobilityType: string;
	routeType: string;
	userId?: string;
	routeName: string;
	shouldSave: boolean;
	vehicleToUse?: Vehicle;
}

const normalizeRouteOptions = (options: RouteSearchOptions): NormalizedRouteContext => {
	const origin = sanitizeValue(options.origin);
	const destination = sanitizeValue(options.destination);
	const mobilityType = sanitizeValue(options.mobilityType) || "vehicle";
	const routeType = sanitizeValue(options.routeType) || "fastest";
	const userId = sanitizeValue(options.userId ?? undefined) || undefined;
	const routeName = sanitizeValue(options.name);
	const shouldSave = options.save === true && Boolean(routeName);
	const vehicleToUse: Vehicle | undefined = options.vehicle ?? createDefaultVehicle(mobilityType);
	return {
		origin,
		destination,
		mobilityType,
		routeType,
		userId,
		routeName,
		shouldSave,
		vehicleToUse,
	};
};

export const useRouteViewmodel = (): RouteViewmodelState => {
	const facadeRef = useRef<RouteFacade>();
	const facade = facadeRef.current ?? (facadeRef.current = getRouteFacade());

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<RouteResponse | null>(null);

	const reset = useCallback(() => {
		setError(null);
		setResult(null);
	}, []);

	const searchRoute = useCallback(
		async (options: RouteSearchOptions): Promise<RouteResponse> => {
			const context = normalizeRouteOptions(options);

			if (!context.origin) throw new Error("Origin is required");
			if (!context.destination) throw new Error("Destination is required");

			setLoading(true);
			setError(null);

			try {
				const basePayload = {
					origin: context.origin,
					destination: context.destination,
					mobilityType: context.mobilityType,
					routeType: context.routeType,
					userId: context.userId,
				} as const;

				const response = context.shouldSave
					? await facade.requestAndSaveRoute({ ...basePayload, name: context.routeName }, context.vehicleToUse)
					: await facade.requestRoute(basePayload, context.vehicleToUse);

				setResult(response);
				return response;
			} catch (err) {
				const message = err instanceof Error ? err.message : "Unable to request route";
				setError(message);
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[facade]
	);

	const previewRoute = useCallback(
		async (options: RouteSearchOptions): Promise<SerializedRoute> => {
			const context = normalizeRouteOptions(options);

			if (!context.origin) throw new Error("Origin is required");
			if (!context.destination) throw new Error("Destination is required");

			setLoading(true);
			setError(null);

			try {
				return await facade.previewRoute(
					{
						origin: context.origin,
						destination: context.destination,
						mobilityType: context.mobilityType,
						routeType: context.routeType,
					},
					context.vehicleToUse
				);
			} catch (err) {
				const message = err instanceof Error ? err.message : "Unable to request route";
				setError(message);
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[facade]
	);

	return {
		loading,
		error,
		result,
		searchRoute,
		previewRoute,
		reset,
	};
};
