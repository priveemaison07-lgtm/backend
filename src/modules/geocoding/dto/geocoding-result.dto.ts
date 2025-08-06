export class GeocodingResultDto {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  formatted_address: string;
}
