import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../core/config/firebaseConfig.js";
import type { PlaceRepository } from "../../domain/repository/PlaceRepository.js";
import { Place } from "../../domain/model/Place.js";
import { handleAuthError } from "../../core/utils/exceptions.js";
import type { FirebaseError } from "firebase/app";

const collectionForUser = (userId: string) => {
	if (!userId) throw new Error("User id is required to access places");
	return collection(db, "users", userId, "places");
};

const normalizeDoc = (snapshot: any): { id: string; name: string; latitude: number; longitude: number; toponymicAddress?: string; description?: string } => {
	const data = snapshot.data() || {};
	const place = new Place(
		data.name ?? "",
		Number(data.latitude) || 0,
		Number(data.longitude) || 0,
		data.toponymicAddress ?? undefined,
		data.description ?? undefined
	);

	return {
		id: snapshot.id,
		name: place.name,
		latitude: place.latitude,
		longitude: place.longitude,
		toponymicAddress: place.toponymicAddress,
		description: place.description,
	};
};

const dropUndefined = (payload: Record<string, unknown>) =>
	Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));

const serializePlace = (place: Place | Partial<Place>) => {
	if (place instanceof Place) return dropUndefined(place.toJSON());
	return dropUndefined({
		name: place?.name,
		latitude: place?.latitude,
		longitude: place?.longitude,
		toponymicAddress: (place as any)?.toponymicAddress,
		description: place?.description,
	});
};

export class PlaceRepositoryFirebase implements PlaceRepository {
	async getPlacesByUser(userId: string): Promise<any[]> {
		try{const placesRef = collectionForUser(userId);
		const q = query(placesRef, orderBy("createdAt", "desc"));
		const snapshot = await getDocs(q);
		return snapshot.docs.map((docSnap) => normalizeDoc(docSnap));}
		catch(error){
			handleAuthError(error as FirebaseError);
		}
	}

	async getPlaceById(userId: string, placeId: string): Promise<any | null> {
		if (!placeId) return null;
		const docRef = doc(collectionForUser(userId), placeId);
		const snapshot = await getDoc(docRef);
		if (!snapshot.exists()) return null;
		return normalizeDoc(snapshot);
	}

	async createPlace(userId: string, place: Place): Promise<string> {
		const placesRef = collectionForUser(userId);
		const docRef = await addDoc(placesRef, {
			...serializePlace(place),
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		});
		return docRef.id;
	}
	
	async updatePlace(userId: string, placeId: string, place: Place): Promise<void> {
		if (!placeId) throw new Error("placeId is required to update a place");
		const docRef = doc(collectionForUser(userId), placeId);
		await updateDoc(docRef, {
			...serializePlace(place),
			updatedAt: serverTimestamp(),
		});
	}

	async deletePlace(userId: string, placeId: string): Promise<void> {
		if (!placeId) throw new Error("placeId is required to delete a place");
		const docRef = doc(collectionForUser(userId), placeId);
		await deleteDoc(docRef);
	}
}

export default PlaceRepositoryFirebase;
