import { PlaceRepositoryFirebase } from "../../data/repository/PlaceRepositoryFirebase.js";
import { Place } from "../model/Place.js";
import type { PlaceRepository } from    "../repository/PlaceRepository.js";
import { UserSession } from "../session/UserSession.js";

const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY ;
const ORS_BASE = "/ors";


export interface ToponymSuggestion {
    id: string;
    label: string;
    latitude: number;
    longitude: number;
    context?: string;
    raw?: unknown;
}

export class PlaceService {
    private static instance: PlaceService;
    private placeRepository: PlaceRepository;
    private sessionProvider: () => UserSession | null;

    private constructor(
        repository?: PlaceRepository,
        sessionProvider: () => UserSession | null = () => UserSession.loadFromCache()
    ) {
        this.placeRepository = repository ?? new PlaceRepositoryFirebase();
        this.sessionProvider = sessionProvider;
    }

    public static getInstance(repProvider?: PlaceRepository): PlaceService {
        if (!PlaceService.instance) {
            PlaceService.instance = new PlaceService(repProvider);
        } else if (repProvider) {
            PlaceService.instance.placeRepository = repProvider;
        }
        return PlaceService.instance;
    }

        private resolveUserId(explicit?: string): string {
            if (explicit) return explicit;
            const session = this.sessionProvider();
            if (session?.userId) return session.userId;
            throw new Error("User session not found. Provide an explicit user id or ensure the session is stored.");
        }

        async getSavedPlaces(userId?: string): Promise<Place[]> {
            const resolvedId = this.resolveUserId(userId);
            return this.placeRepository.getPlacesByUser(resolvedId);
        }

        async getPlaceDetails(placeId: string, userId?: string): Promise<Place | null> {
            const resolvedId = this.resolveUserId(userId);
            return this.placeRepository.getPlaceById(resolvedId, placeId);
        }

        async savePlace(place: Partial<Place>, options: { userId?: string } = {}): Promise<Place> {
            const resolvedId = this.resolveUserId(options.userId);
            const entity = new Place(
                place.name ?? "",
                place.latitude ?? 0,
                place.longitude ?? 0,
                place.toponymicAddress ?? "",
                place.description ?? ""
            );
            await this.ensureUniquePlace(resolvedId, entity);
            const docId = await this.placeRepository.createPlace(resolvedId, entity);
            const created = await this.placeRepository.getPlaceById(resolvedId, docId);
            if (!created) throw new Error("Place could not be created");
            return created;
        }

        async editPlace(placeId: string, updates: Partial<Place>, options: { userId?: string } = {}): Promise<Place> {
            const resolvedId = this.resolveUserId(options.userId);
            const current = await this.getPlaceDetails(placeId, resolvedId);
            if (!current) throw new Error("Place not found");
            const entity = new Place(
                updates.name ?? current.name,
                updates.latitude ?? current.latitude,
                updates.longitude ?? current.longitude,
                updates.toponymicAddress ?? current.toponymicAddress,
                updates.description ?? current.description
            );
            await this.placeRepository.updatePlace(resolvedId, placeId, entity);
            const refreshed = await this.placeRepository.getPlaceById(resolvedId, placeId);
            if (!refreshed) throw new Error("Place could not be refreshed after edit");
            return refreshed;
        }

        async deletePlace(placeId: string, options: { userId?: string } = {}): Promise<void> {
            const resolvedId = this.resolveUserId(options.userId);
            await this.placeRepository.deletePlace(resolvedId, placeId);
        }

        private async ensureUniquePlace(userId: string, candidate: Place): Promise<void> {
            const normalizedName = candidate.name?.trim().toLowerCase();
            const normalizedToponym = candidate.toponymicAddress?.trim().toLowerCase();
            const coordinatesEmpty = !candidate.latitude && !candidate.longitude;
            if (coordinatesEmpty) return;
            if (!normalizedName && !normalizedToponym) return;

            const existing = await this.placeRepository.getPlacesByUser(userId);
            const duplicated = existing.some((existingPlace) => {
                const existingName = existingPlace.name?.trim().toLowerCase();
                const existingToponym = existingPlace.toponymicAddress?.trim().toLowerCase();
                const coordsMatch =
                    existingPlace.latitude === candidate.latitude &&
                    existingPlace.longitude === candidate.longitude;
                if (coordsMatch) return true;
                return (
                    (normalizedName && existingName === normalizedName) ||
                    (normalizedToponym && existingToponym === normalizedToponym)
                );
            });

            if (duplicated) {
                throw new Error("PlaceAlreadySavedException");
            }
        }

        private mapFeatureToSuggestion(feature: any, fallbackLabel: string, index = 0): ToponymSuggestion {
            const coordinates = feature?.geometry?.coordinates ?? [];
            const latitude = Number(coordinates[1]) || 0;
            const longitude = Number(coordinates[0]) || 0;
            const label = feature?.properties?.label || feature?.properties?.name || fallbackLabel;
            const context = feature?.properties?.locality || feature?.properties?.region || feature?.properties?.county;
            const identifier =
                feature?.properties?.id ||
                feature?.properties?.gid ||
                feature?.properties?.osm_id ||
                `${label}-${latitude}-${longitude}-${index}`;

            return {
                id: String(identifier),
                label,
                latitude,
                longitude,
                context: context || undefined,
                raw: feature,
            };
        }

        async suggestToponyms(query: string, limit = 3): Promise<ToponymSuggestion[]> {
            const cleaned = query?.trim();
            if (!cleaned || cleaned.length < 3) return [];

            const params = new URLSearchParams({
            text: cleaned,
            size: String(Math.max(1, limit)),
            });

            const res = await fetch(`${ORS_BASE}/geocode/search?${params.toString()}`);
            const contentType = res.headers.get("content-type") ?? "";

                        if (!res.ok || !contentType.includes("application/json")) {
                            const errorBody = await res.text();
                            console.error("[suggestToponyms] ORS error:", res.status, errorBody);
                            throw new Error("Unable to fetch toponym suggestions.");
                        }

            const data = await res.json();
            const features = Array.isArray(data?.features) ? data.features : [];
            return features.map((feature: any, index: number): ToponymSuggestion => {
            return this.mapFeatureToSuggestion(feature, cleaned, index);
            });
        }

        async toponymFromCoords(lat: number, lon: number): Promise<ToponymSuggestion | null> {
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

            const params = new URLSearchParams({
                "point.lat": String(lat),
                "point.lon": String(lon),
                size: "1",
            });

            const res = await fetch(`${ORS_BASE}/geocode/reverse?${params.toString()}`);
            const contentType = res.headers.get("content-type") ?? "";

            if (!res.ok || !contentType.includes("application/json")) {
                const errorBody = await res.text();
                console.error("[toponymFromCoords] ORS error:", res.status, errorBody);
                return null;
            }

            const data = await res.json();
            const feature = Array.isArray(data?.features) ? data.features[0] : null;
            if (!feature) return null;
            return this.mapFeatureToSuggestion(feature, "", 0);
        }
    }

    export default PlaceService;