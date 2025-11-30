
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
import { type Vehicle } from "../../domain/model/VehicleInterface";
import type { VehicleRepositoryInterface } from "../../domain/repository/VehicleRepositoryInterface";
import { VehicleFactory } from "../../domain/model/VehicleFactory";

const db = getFirestore(firebaseApp);

export class VehicleRepositoryFirebase implements VehicleRepositoryInterface {
    private vehicleCollection = collection(db, "vehicles");

    //LISTAR VEHICULOS POR OWNERID
    async getVehiclesByOwnerId(ownerId: string): Promise<Vehicle[]> {
        const q = query(this.vehicleCollection, where("ownerId", "==", ownerId));
        const snapshot = await getDocs(q);

        return snapshot.docs.map((d) => {
            const data = d.data() as any;
            // Aquí podemos usar VehicleFactory si quieres mapear por tipo
            if (data.fuelType === null) {
                return VehicleFactory.createVehicle('bike', data.name);
            } else if (data.fuelType === 'electric') {
                return VehicleFactory.createVehicle('electriccar', data.name, data.fuelType, data.consumption);
            } else {
                return VehicleFactory.createVehicle('fuelcar', data.name, data.fuelType, data.consumption);
            }
        });

    }
}

