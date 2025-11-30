import { Place } from "../model/Place";

export type LatLngTuple = [number, number];
export interface PlaceRepository {
	getPlacesByUser(userId: string): Promise<Place[]>;
	getPlaceById(userId: string, placeId: string): Promise<Place | null>;
	createPlace(userId: string, place: Place): Promise<string>;
	updatePlace(userId: string, placeId: string, place: Place): Promise<void>;
	deletePlace(userId: string, placeId: string): Promise<void>;
}
