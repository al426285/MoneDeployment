import PlaceService from "../domain/service/PlaceService";
import { UserService } from "../domain/service/UserService";
import type { Place } from "../domain/model/Place";

const getPlaceService = () => PlaceService.getInstance();
const getUserService = () => UserService.getInstance();

const resolveUserId = (userId?: string): string => {
  if (userId && userId.trim()) {
    return userId.trim();
  }

  const resolved = getUserService().getCurrentUserId();
  if (!resolved) {
    throw new Error("UserNotAuthenticated");
  }
  return resolved;
};

export const placeViewmodel = {

  async getPlaces(userId?: string) {
    const service = getPlaceService();
    return service.getSavedPlaces(resolveUserId(userId));
  },

  async getPlace(placeId: string, userId?: string) {
    const service = getPlaceService();
    return service.getPlaceDetails(placeId, resolveUserId(userId));
  },

  async savePlace(payload: Partial<Place>, userId?: string) {
    const service = getPlaceService();
    return service.savePlace(payload, { userId: resolveUserId(userId) });
  },

  async updatePlace(placeId: string, updates: Partial<Place>, userId?: string) {
    const service = getPlaceService();
    return service.editPlace(placeId, updates, { userId: resolveUserId(userId) });
  },

  async deletePlace(placeId: string, userId?: string) {
    const service = getPlaceService();
    return service.deletePlace(placeId, { userId: resolveUserId(userId) });
  },

  async toggleFavorite(placeId: string, favorite: boolean, userId?: string) {
    const service = getPlaceService();
    return service.setFavorite(placeId, favorite, { userId: resolveUserId(userId) });
  },

  async suggestToponyms(query, limit) {
    const service = getPlaceService();
    return service.suggestToponyms(query, limit);
  },

  async toponymFromCoords(lat, lon) {
    const service = getPlaceService();
    return service.toponymFromCoords(lat, lon);
  },
};

export default placeViewmodel;
