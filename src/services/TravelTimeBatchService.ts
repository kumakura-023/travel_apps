import { measured } from "../telemetry/decorators/measured";
import { directionsService } from "./directionsService";

export interface TravelTimeBatchRequest {
  origin: google.maps.LatLngLiteral;
  destinations: google.maps.LatLngLiteral[];
  travelMode: google.maps.TravelMode;
}

export interface TravelTimeResult {
  destination: google.maps.LatLngLiteral;
  durationMinutes: number;
  path: google.maps.LatLngLiteral[];
}

export interface TravelTimeBatchResult {
  origin: google.maps.LatLngLiteral;
  travelMode: google.maps.TravelMode;
  results: Array<TravelTimeResult | Error>;
}

class TravelTimeBatchService {
  @measured({ operation: "travelTime.calculate.batch", threshold: 500 })
  async calculateBatch(
    requests: TravelTimeBatchRequest[],
  ): Promise<TravelTimeBatchResult[]> {
    if (requests.length === 0) return [];

    const groupedResults: TravelTimeBatchResult[] = requests.map((request) => ({
      origin: request.origin,
      travelMode: request.travelMode,
      results: new Array(request.destinations.length),
    }));

    const flatRequests: Array<{
      origin: google.maps.LatLngLiteral;
      destination: google.maps.LatLngLiteral;
      travelMode: google.maps.TravelMode;
    }> = [];
    const indexMap: Array<{ requestIndex: number; destinationIndex: number }> =
      [];

    requests.forEach((request, requestIndex) => {
      request.destinations.forEach((destination, destinationIndex) => {
        flatRequests.push({
          origin: request.origin,
          destination,
          travelMode: request.travelMode,
        });
        indexMap.push({ requestIndex, destinationIndex });
      });
    });

    if (flatRequests.length === 0) {
      return groupedResults.map((result) => ({
        ...result,
        results: [],
      }));
    }

    const flatResults = await directionsService.getBatchRoutes(flatRequests);

    flatResults.forEach((result, index) => {
      const mapping = indexMap[index];
      if (!mapping) return;

      if (result instanceof Error) {
        groupedResults[mapping.requestIndex].results[mapping.destinationIndex] =
          result;
        return;
      }

      const path =
        result.route.routes[0]?.overview_path.map((point) => ({
          lat: point.lat(),
          lng: point.lng(),
        })) || [];

      groupedResults[mapping.requestIndex].results[mapping.destinationIndex] = {
        destination:
          requests[mapping.requestIndex].destinations[mapping.destinationIndex],
        durationMinutes: result.duration / 60,
        path,
      };
    });

    groupedResults.forEach((group, groupIndex) => {
      if (group.results.length === 0) return;
      group.results = group.results.map(
        (value) =>
          value ??
          new Error(
            `Missing travel time result for request index ${groupIndex}`,
          ),
      );
    });

    return groupedResults;
  }
}

export const travelTimeBatchService = new TravelTimeBatchService();
