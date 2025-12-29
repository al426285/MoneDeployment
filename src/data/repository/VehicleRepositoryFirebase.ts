
import {
    getFirestore,
    doc,
    getDoc,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp,
} from "firebase/firestore";
import { firebaseApp } from "../../core/config/firebaseConfig";
import { type Vehicle, type FuelType, type Consumption } from "../../domain/model/VehicleInterface";
import { VehicleFactory } from "../../domain/model/VehicleFactory";

import type { VehicleRepositoryInterface } from "../../domain/repository/VehicleRepositoryInterface";

const db = getFirestore(firebaseApp);



type VehicleDoc = {
    type: string;
    name: string;
    fuelType?: string | null;
    consumption?: any;
    favorite?: boolean;
    //{ amount: number; unit?: Consumption["unit"]}
};

const collectionForUser = (userId: string) => {
    if (!userId) throw new Error("User id is required to access vehicles");
    // Cada usuario guarda sus vehículos en /users/{uid}/vehicles para aislar la información.
    return collection(db, "users", userId, "vehicles");
};

const normalizeFuelType = (fuelType?: string | null): FuelType | undefined => {
    if (fuelType === "gasoline" || fuelType === "diesel" || fuelType === "electric") {
        return fuelType;
    }
    return undefined;
};

const dropUndefined = (payload: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));

const serializeVehicle = (vehicle: Vehicle | Partial<Vehicle>) => {
    return dropUndefined({
        type: (vehicle as any).type,
        name: vehicle?.name,
        fuelType: vehicle?.fuelType ?? null,
        consumption: vehicle?.consumption,
        favorite: (vehicle as any)?.favorite ?? false,
    });
};


export class VehicleRepositoryFirebase implements VehicleRepositoryInterface {

    //LISTAR VEHICULOS POR OWNERID
    async getVehiclesByOwnerId(ownerId: string): Promise<Vehicle[]> {
        const q = query(collectionForUser(ownerId));
        const snapshot = await getDocs(q);

        return snapshot.docs.map((d) => {
            const data = d.data() as VehicleDoc;
            const normalizedFuel = normalizeFuelType(data.fuelType);
            const type = data.type;
            const baseConsumption: any = (data as any).consumption;
            const amount = typeof baseConsumption === "object" ? (baseConsumption as any).amount : baseConsumption;
            const consumption = amount !== undefined ? amount : (baseConsumption?.amount ?? undefined);
            const favorite = Boolean(data.favorite);

            let base: Vehicle | null = null;
            switch (type.toLowerCase()) {
                case "bike":
                    base = VehicleFactory.createVehicle("bike", data.name, undefined, consumption, favorite);
                    break;
                case "walking":
                    base = VehicleFactory.createVehicle("walking", data.name, undefined, consumption, favorite);
                    break;
                case "fuelcar": {
                    // FuelCar requires gasoline or diesel; default to gasoline if invalid
                    const fuelForCar = (normalizedFuel === "gasoline" || normalizedFuel === "diesel") ? normalizedFuel : "gasoline";
                    base = VehicleFactory.createVehicle("fuelCar", data.name, fuelForCar, consumption, favorite);
                    break;
                }
                case "electriccar":
                    base = VehicleFactory.createVehicle("electricCar", data.name, "electric", consumption, favorite);
                    break;
                default:
                    console.error("Unknown vehicle type in Firestore:", data);
                    return null;
            }

            if (!base) return null;

            // Build plain object manually to ensure favorite flags are preserved
            const vehicle = {
                name: base.name,
                type: (base as any).type,
                fuelType: base.fuelType,
                consumption: base.consumption,
                favorite: favorite,
                isFavorite: favorite,
                mostrarInfo: base.mostrarInfo.bind(base),
            };

            return vehicle;
        }).filter(v => v !== null) as Vehicle[];
    }




    async deleteVehicle(ownerId: string, vehicleName: string): Promise<void> {
        const q = query(collectionForUser(ownerId), where("name", "==", vehicleName));
        const snapshot = await getDocs(q);
        if (snapshot.empty) throw new Error("VehicleNotFoundException");

        snapshot.docs.forEach(async (doc) => {
            await deleteDoc(doc.ref);
        });
    }

    //guardar un vehiculo 
    async saveVehicle(ownerId: string, vehicle: Vehicle): Promise<void> {
        // Usamos collectionForUser para escribir siempre dentro de /users/{uid}/vehicles
        // en lugar de en una colección global "vehicles" que mezclaría datos de todos los usuarios.
      
    //  console.log("Guardando vehículo para ownerId:", ownerId, "Vehículo:", vehicle);
        await addDoc(collectionForUser(ownerId), {
            ownerId,
            type: vehicle.type,
            name: vehicle.name,
            fuelType: vehicle.fuelType,
            consumption: vehicle.consumption,
            favorite: Boolean((vehicle as any).favorite),
            createdAt: serverTimestamp(),
        });
    }

    async updateVehicle(ownerId: string, vehicleName: string, updates: Partial<Vehicle>): Promise<void> {
       if (!vehicleName) throw new Error("vehicleName is required to update a vehicle");
        const q = query(collectionForUser(ownerId), where("name", "==", vehicleName));
        const snapshot = await getDocs(q);
        if (snapshot.empty) throw new Error("VehicleNotFoundException");

        await Promise.all(
            snapshot.docs.map((docSnap) =>
                updateDoc(docSnap.ref, {
                    ...serializeVehicle(updates),
                    updatedAt: serverTimestamp(),
                })
            )
        );
        
    }

    async getVehicleByName(ownerId: string, vehicleName: string): Promise<Vehicle | null> {
        const vehicles: Vehicle[] = await this.getVehiclesByOwnerId(ownerId);
        const vehicle = vehicles.find(v => v.name === vehicleName);
        return vehicle || null;
    }

    
}

