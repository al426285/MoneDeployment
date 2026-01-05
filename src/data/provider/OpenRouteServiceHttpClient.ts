const PROFILE_MAP: Record<string, string> = {
  vehicle: "driving-car",
  car: "driving-car",
  bike: "cycling-regular",
  bicycle: "cycling-regular",
  walk: "foot-walking",
  pedestrian: "foot-walking",
};

const ROUTE_PREFERENCE_MAP: Record<string, string> = {
  fastest: "fastest",
  shortest: "shortest",
  scenic: "recommended",
};

const parseCoords = (value: string): [number, number] => {
  const parts = value.split(",").map((p) => parseFloat(p.trim()));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid coordinates: ${value}. Expected format "lat,lng"`);
  }
  return [parts[0], parts[1]];
};

export class OpenRouteServiceHttpClient {
  async getRoute(origin: string, destination: string, mobilityType: string, routeType: string) {
    const [originLat, originLng] = parseCoords(origin);
    const [destLat, destLng] = parseCoords(destination);

    const profile = PROFILE_MAP[mobilityType?.toLowerCase()] ?? mobilityType;
    const preference = ROUTE_PREFERENCE_MAP[routeType?.toLowerCase()] ?? "fastest";
    const url = `/api/ors`;

    return fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        profile,
        coordinates: [
          [originLng, originLat],
          [destLng, destLat],
        ],
        preference,
        instructions: true,
        units: "m",
      }),
    });
  }
}
