import { useState, useEffect, useCallback } from "react";
import { VehicleService } from "../domain/service/VehicleService";
import type { Vehicle } from "../domain/model/VehicleInterface";
import { UserSession } from "../domain/session/UserSession";
import { VehicleRepositoryFirebase } from "../data/repository/VehicleRepositoryFirebase";

export function VehicleViewModel() {
    const vehicleService = VehicleService.getInstance(new VehicleRepositoryFirebase());

    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getCurrentUid = useCallback((): string | undefined => {
        try {
            return UserSession.loadFromCache()?.userId ?? undefined;
        } catch {
            return undefined;
        }
    }, []);


    // cargar vehículos, listado
    const loadVehicles = useCallback(async () => {
        //la función NO se recrea cada render, solo cuando cambian las dependencias del useCallback.
        try {
            setLoading(true);
            setError(null);

            const ownerid = getCurrentUid(); //si no hay sesión, undefined
            const list = await vehicleService.getVehicles(ownerid);
            setVehicles(list);
        } catch (err: any) {
            setError(err.message ?? "Error loading vehicles");
        } finally {
            setLoading(false);
        }
    }, [vehicleService]);// solo se ejecuta una vez cuando el componente se monta, cuanto entramos a la pagina web, por el useCallback

    useEffect(() => {
        loadVehicles();
    },
        [loadVehicles]);//si no tuvieramos callback, la función se recrearía en cada render y el useEffect se ejecutaría infinitamente

    // añadir vehículo (obv no le pasamos el userid desde el front, sería inseguro)
    const addVehicle = async (type: string, name: string, units: string, fuelType?: any, consumption?: number) => {
        try {
            setLoading(true);
            setError(null);
            const ownerid = getCurrentUid(); //si no hay sesión, undefined
            /*TRANFORMAMOS LAS UNIDADES */
            if (type === "electricCar") {
                consumption = normalizeElectricConsumption(consumption, units);
            }
            else if (type === "fuelCar") {
                consumption = normalizeFuelConsumption(consumption, units);
            }
            await vehicleService.registerVehicle(ownerid, type, name, fuelType, consumption);
            await loadVehicles();  // refrescamos la lista
        } catch (err: any) {
            setError(err.message ?? "Error adding vehicle");
        } finally {
            setLoading(false);
        }
    };

    // eliminar vehículo
    const deleteVehicle = async (vehicleId: string) => {
        try {
            setLoading(true);
            setError(null);
            const ownerid = getCurrentUid() ?? undefined; //si no hay sesión, undefined
            await vehicleService.deleteVehicle(ownerid, vehicleId);
            await loadVehicles(); // refrescamos la lista
        } catch (err: any) {
            setError(err.message ?? "Error deleting vehicle");
        } finally {
            setLoading(false);
        }
    };

    const updateVehicle = async (vehicleId: string, updates: Partial<Vehicle>) => {
        try {
            setLoading(true);
            setError(null);
            const ownerid = getCurrentUid() ?? undefined; //si no hay sesión, undefined
            await vehicleService.editVehicle(ownerid, vehicleId, updates);
            await loadVehicles(); // refrescamos la lista
        } catch (err: any) {
            setError(err.message ?? "Error updating vehicle");
        } finally {
            setLoading(false);
        }
    };

    //metodo para obtener las preferencias de unidades del usuario
    const getFuelUnitsPreference = async (): Promise<string | undefined> => {
       // const ownerid = getCurrentUid();
        return undefined;
    }
     const getElectricUnitsPreference = async (): Promise<string | undefined> => {
       // const ownerid = getCurrentUid();
        return undefined;
    }


    return {
        vehicles,
        loading,
        error,
        loadVehicles,
        addVehicle,
        deleteVehicle,
        updateVehicle,
        getFuelUnitsPreference,
        getElectricUnitsPreference,
    };
}

function normalizeElectricConsumption(consumption: number | undefined, units: string): number | undefined {
    if (!consumption) return undefined;

    if (units === "km/kWh" && consumption > 0) {
        return Number((100 / consumption).toFixed(2));
    }

    // Ya está en kWh/100km
    return consumption;
}

function normalizeFuelConsumption(consumption: number | undefined, units: string): number | undefined {
    if (!consumption) return undefined;
    if (units === "km/l" && consumption > 0) {
        return Number((100 / consumption).toFixed(2));
    }
    // Ya está en L/100km
    return consumption;
}