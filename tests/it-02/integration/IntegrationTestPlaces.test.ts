import { describe, test, expect, beforeEach, afterEach, vi, type SpyInstance } from "vitest";
import PlaceService from "../../../src/domain/service/PlaceService";
import type { Place } from "../../../src/domain/model/Place";
import { UserSession } from "../../../src/domain/session/UserSession";

type PlaceRepositoryMock = {
  getPlacesByUser: ReturnType<typeof vi.fn>;
  getPlaceById: ReturnType<typeof vi.fn>;
  createPlace: ReturnType<typeof vi.fn>;
  updatePlace: ReturnType<typeof vi.fn>;
  deletePlace: ReturnType<typeof vi.fn>;
};

const OWNER_ID = "USER123";

const buildPlace = (overrides: Partial<Place> = {}) => ({
  id: overrides.id ?? "place-1",
  name: overrides.name ?? "Home",
  latitude: overrides.latitude ?? 1,
  longitude: overrides.longitude ?? 2,
  toponymicAddress: overrides.toponymicAddress ?? "Addr",
  description: overrides.description ?? "",
  ...overrides,
});

const mockFetchResponse = (payload: any, status = 200, contentType = "application/json") => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => contentType },
  json: async () => payload,
  text: async () => JSON.stringify(payload),
});

describe("HU07-HU11: Places integration", () => {
  let repo: PlaceRepositoryMock;
  let service: PlaceService;
  let sessionSpy: SpyInstance;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    repo = {
      getPlacesByUser: vi.fn(),
      getPlaceById: vi.fn(),
      createPlace: vi.fn(),
      updatePlace: vi.fn(),
      deletePlace: vi.fn(),
    };

    (PlaceService as any).instance = undefined;

    sessionSpy = vi.spyOn(UserSession, "loadFromCache").mockReturnValue({
      userId: OWNER_ID,
      token: "token",
    } as any);

    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    service = PlaceService.getInstance(repo as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (vi as any).unstubAllGlobals?.();
  });

  describe("{HU07} Alta de lugar por coordenadas", () => {
    test("HU07-E1 - Válido: guarda un lugar usando solo coordenadas", async () => {
      const storedPlace = buildPlace({
        id: "place-geo",
        name: "Obra",
        latitude: 10.1,
        longitude: -75.2,
        toponymicAddress: undefined,
      });

      repo.getPlacesByUser.mockResolvedValueOnce([]).mockResolvedValue([storedPlace]);
      repo.createPlace.mockResolvedValue(storedPlace.id);
      repo.getPlaceById.mockResolvedValue(storedPlace);

      const result = await service.savePlace({
        name: "Obra",
        latitude: 10.1,
        longitude: -75.2,
        description: "Registrado por coordenadas",
      });

      expect(repo.createPlace).toHaveBeenCalledWith(
        OWNER_ID,
        expect.objectContaining({ latitude: 10.1, longitude: -75.2 })
      );
      expect(result).toEqual(storedPlace);

      const list = await service.getSavedPlaces(OWNER_ID);
      expect(repo.getPlacesByUser).toHaveBeenCalledWith(OWNER_ID);
      expect(list).toEqual([storedPlace]);
    });

    test("HU07-E2 - Inválido: rechaza duplicados por coordenadas", async () => {
      repo.getPlacesByUser.mockResolvedValueOnce([
        buildPlace({ name: "Casa", latitude: 12.5, longitude: -3.4, toponymicAddress: undefined }),
      ]);

      await expect(
        service.savePlace({ name: "Casa", latitude: 12.5, longitude: -3.4 })
      ).rejects.toThrow("PlaceAlreadySavedException");

      expect(repo.createPlace).not.toHaveBeenCalled();
    });
  });

  describe("{HU08} Alta de lugar por nombre/topónimo", () => {
    test("HU08-E1 - Válido: guarda un lugar usando topónimo", async () => {
      const storedPlace = buildPlace({ id: "place-topo", name: "Casa", toponymicAddress: "Calle 123" });

      repo.getPlacesByUser.mockResolvedValueOnce([]).mockResolvedValue([storedPlace]);
      repo.createPlace.mockResolvedValue(storedPlace.id);
      repo.getPlaceById.mockResolvedValue(storedPlace);

      const result = await service.savePlace({
        name: "Casa",
        latitude: 1,
        longitude: 2,
        toponymicAddress: "Calle 123",
      });

      expect(repo.createPlace).toHaveBeenCalledWith(
        OWNER_ID,
        expect.objectContaining({ name: "Casa", toponymicAddress: "Calle 123" })
      );
      expect(result.toponymicAddress).toBe("Calle 123");
    });

    test("HU08-E2 - Inválido: rechaza duplicados por topónimo", async () => {
      repo.getPlacesByUser.mockResolvedValueOnce([
        buildPlace({ name: "Casa", latitude: 4, longitude: 5, toponymicAddress: "Calle 123" }),
      ]);

      await expect(
        service.savePlace({ name: "Casa 2", latitude: 6, longitude: 7, toponymicAddress: "Calle 123" })
      ).rejects.toThrow("PlaceAlreadySavedException");
    });

    test("HU08-E3 - Válido: obtiene sugerencias de topónimos", async () => {
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          features: [
            {
              geometry: { coordinates: ["2.1", "1.1"] },
              properties: { label: "Place A", id: "gid:1" },
            },
          ],
        })
      );

      const suggestions = await service.suggestToponyms("pla", 3);

      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/geocode/search"));
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].label).toBe("Place A");
      expect(suggestions[0].latitude).toBe(1.1);
      expect(suggestions[0].longitude).toBe(2.1);
    });

    test("HU08-E4 - Válido: ignora consultas cortas", async () => {
      const result = await service.suggestToponyms("ab", 3);

      expect(result).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    test("HU08-E5 - Válido: reverse geocode devuelve null en error", async () => {
      fetchMock.mockResolvedValueOnce(mockFetchResponse({}, 500, "text/plain"));

      const result = await service.toponymFromCoords(1, 2);

      expect(result).toBeNull();
    });
  });

  describe("{HU09} Consulta de lugares", () => {
    test("HU09-E1 - Válido: lista los lugares del usuario en sesión", async () => {
      const places = [
        buildPlace({ id: "p1", name: "Casa" }),
        buildPlace({ id: "p2", name: "Trabajo" }),
      ];
      repo.getPlacesByUser.mockResolvedValue(places);

      const result = await service.getSavedPlaces();

      expect(repo.getPlacesByUser).toHaveBeenCalledWith(OWNER_ID);
      expect(result).toEqual(places);
    });

    test("HU09-E2 - Válido: obtiene detalles concretos", async () => {
      const place = buildPlace({ id: "place-42", name: "Parque" });
      repo.getPlaceById.mockResolvedValue(place);

      const details = await service.getPlaceDetails(place.id);

      expect(repo.getPlaceById).toHaveBeenCalledWith(OWNER_ID, place.id);
      expect(details).toEqual(place);
    });

    test("HU09-E3 - Inválido: requerir sesión para listar", async () => {
      sessionSpy.mockReturnValueOnce(undefined as any);

      await expect(service.getSavedPlaces()).rejects.toThrow("SessionNotFoundException");
      expect(repo.getPlacesByUser).not.toHaveBeenCalled();
    });
  });

  describe("{HU10} Eliminación de lugar", () => {
    test("HU10-E1 - Válido: elimina un lugar", async () => {
      repo.deletePlace.mockResolvedValue(undefined);

      await service.deletePlace("place-1");

      expect(repo.deletePlace).toHaveBeenCalledWith(OWNER_ID, "place-1");
    });

    test("HU10-E2 - Inválido: lanza error al fallar la eliminación", async () => {
      repo.deletePlace.mockRejectedValue(new Error("PlaceNotDeletedException"));

      await expect(service.deletePlace("missing"))
        .rejects.toThrow("PlaceNotDeletedException");
    });
  });

  describe("{HU11} Actualización de datos de lugar", () => {
    test("HU11-E1 - Válido: edita un lugar existente", async () => {
      const current = buildPlace({ id: "place-77", name: "Gym" });
      const updated = buildPlace({
        id: "place-77",
        name: "Gym 2",
        description: "updated",
        latitude: 5,
        longitude: 6,
      });

      repo.getPlaceById.mockResolvedValueOnce(current).mockResolvedValueOnce(updated);
      repo.updatePlace.mockResolvedValue(undefined);

      const result = await service.editPlace(current.id, {
        name: "Gym 2",
        description: "updated",
        latitude: 5,
        longitude: 6,
      });

      expect(repo.updatePlace).toHaveBeenCalledWith(OWNER_ID, current.id, expect.anything());
      expect(result).toEqual(updated);
    });

    test("HU11-E2 - Inválido: lanza error si no existe el lugar", async () => {
      repo.getPlaceById.mockResolvedValueOnce(null);

      await expect(service.editPlace("missing", { name: "X" })).rejects.toThrow("Place not found");

      expect(repo.updatePlace).not.toHaveBeenCalled();
    });
  });
});
