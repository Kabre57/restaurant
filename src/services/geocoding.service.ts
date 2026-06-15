export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DistanceDurationResult {
  distanceKm: number;
  durationMinutes: number;
}

export class GeocodingService {
  private static get apiKey(): string | undefined {
    return process.env.GOOGLE_MAPS_API_KEY;
  }

  private static get isTestOrMock(): boolean {
    return !this.apiKey || process.env.NODE_ENV === "test";
  }

  /**
   * Geocodes an address to latitude and longitude
   */
  static async geocodeAddress(address: string): Promise<Coordinates> {
    if (this.isTestOrMock) {
      // Mocked geocoding for development and testing
      // Deterministic generation based on address length to simulate varying coordinates
      const hash = address.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const lat = 5.3096 + (hash % 100) / 1000; // Centered around Abidjan, Côte d'Ivoire
      const lng = -4.0127 + (hash % 50) / 1000;
      return { lat, lng };
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${this.apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === "OK" && data.results && data.results[0]) {
        const { lat, lng } = data.results[0].geometry.location;
        return { lat, lng };
      }
      throw new Error(`Google Geocoding API returned status: ${data.status}`);
    } catch (error: unknown) {
      console.error("Geocoding failed, falling back to mock:", error);
      // Fallback in case of network or API error
      return { lat: 5.3096, lng: -4.0127 };
    }
  }

  /**
   * Calculates distance and duration between two points
   */
  static async calculateDistanceAndDuration(
    origin: Coordinates | string,
    destination: Coordinates | string
  ): Promise<DistanceDurationResult> {
    if (this.isTestOrMock) {
      // Mock calculation based on Haversine distance if coordinates are passed
      const origCoords = typeof origin === "string" ? await this.geocodeAddress(origin) : origin;
      const destCoords = typeof destination === "string" ? await this.geocodeAddress(destination) : destination;

      const R = 6371; // Earth radius in km
      const dLat = ((destCoords.lat - origCoords.lat) * Math.PI) / 180;
      const dLon = ((destCoords.lng - origCoords.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((origCoords.lat * Math.PI) / 180) *
          Math.cos((destCoords.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceKm = Math.max(0.5, Math.round(R * c * 10) / 10); // Minimum 0.5 km

      // Assume average speed of 30 km/h in Abidjan traffic
      const durationMinutes = Math.max(5, Math.round((distanceKm / 30) * 60) + 5);

      return { distanceKm, durationMinutes };
    }

    const originStr = typeof origin === "string" ? origin : `${origin.lat},${origin.lng}`;
    const destStr = typeof destination === "string" ? destination : `${destination.lat},${destination.lng}`;

    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
        originStr
      )}&destinations=${encodeURIComponent(destStr)}&key=${this.apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === "OK" && data.rows && data.rows[0] && data.rows[0].elements && data.rows[0].elements[0]) {
        const element = data.rows[0].elements[0];
        if (element.status === "OK") {
          const distanceKm = element.distance.value / 1000;
          const durationMinutes = Math.round(element.duration.value / 60);
          return { distanceKm, durationMinutes };
        }
      }
      throw new Error(`Google Distance Matrix API returned status: ${data.status}`);
    } catch (error: unknown) {
      console.error("Distance Matrix failed, falling back to mock:", error);
      // Haversine fallback
      const origCoords = typeof origin === "string" ? await this.geocodeAddress(origin) : origin;
      const destCoords = typeof destination === "string" ? await this.geocodeAddress(destination) : destination;
      return this.calculateDistanceAndDuration(origCoords, destCoords);
    }
  }
}
