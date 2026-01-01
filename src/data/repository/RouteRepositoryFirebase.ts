import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../core/config/firebaseConfig";
import { type RouteRepository, type RouteSavedDTO } from "../../domain/repository/RouteRespository";

const userRoutesCollection = (userId: string) => {
  if (!userId) throw new Error("User id is required to access routes");
  return collection(db, "users", userId, "routes");
};

export class RouteRepositoryFirebase implements RouteRepository {
  async saveRoute(userId: string, payload: RouteSavedDTO): Promise<string> {
    const routeName = payload.name?.trim();
    if (!routeName) {
      throw new Error("Route name is required when saving a request");
    }
    const ref = await addDoc(userRoutesCollection(userId), {
      name: routeName,
      origin: payload.origin,
      destination: payload.destination,
      mobilityType: payload.mobilityType,
      mobilityMethod: payload.mobilityMethod,
      routeType: payload.routeType,
      favorite: Boolean((payload as any)?.favorite),
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }

  async listRoutes(userId: string): Promise<RouteSavedDTO[]> {
    const q = query(userRoutesCollection(userId), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        origin: data.origin,
        destination: data.destination,
        mobilityType: data.mobilityType,
        mobilityMethod: data.mobilityMethod,
        routeType: data.routeType,
        favorite: Boolean(data.favorite),
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
      };
    });
  }

  async deleteRoute(userId: string, routeId: string): Promise<void> {
    if (!routeId) throw new Error("Route id is required");
    await deleteDoc(doc(userRoutesCollection(userId), routeId));
  }

  async getRoute(userId: string, routeId: string) {
    if (!routeId) throw new Error("Route id is required");
    const snap = await getDoc(doc(userRoutesCollection(userId), routeId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      name: data.name,
      origin: data.origin,
      destination: data.destination,
      mobilityType: data.mobilityType,
      mobilityMethod: data.mobilityMethod,
      routeType: data.routeType,
      favorite: Boolean(data.favorite),
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
    };
  }

  async updateRoute(userId: string, routeId: string, payload: RouteSavedDTO): Promise<void> {
    if (!routeId) throw new Error("Route id is required");
    const updatePayload: Partial<RouteSavedDTO> & { updatedAt: ReturnType<typeof serverTimestamp> } = {
      updatedAt: serverTimestamp(),
    };

    if (payload.name !== undefined) {
      const routeName = payload.name?.trim();
      if (routeName) {
        updatePayload.name = routeName;
      }
      // If name is provided but empty, skip updating it to allow favorite-only updates without throwing.
    }

    if (payload.origin !== undefined) updatePayload.origin = payload.origin;
    if (payload.destination !== undefined) updatePayload.destination = payload.destination;
    if (payload.mobilityType !== undefined) updatePayload.mobilityType = payload.mobilityType;
    if ((payload as any)?.mobilityMethod !== undefined) updatePayload.mobilityMethod = (payload as any).mobilityMethod;
    if (payload.routeType !== undefined) updatePayload.routeType = payload.routeType;
    if ((payload as any)?.favorite !== undefined) updatePayload.favorite = Boolean((payload as any).favorite);

    await setDoc(doc(userRoutesCollection(userId), routeId), updatePayload, { merge: true });
  }
}
