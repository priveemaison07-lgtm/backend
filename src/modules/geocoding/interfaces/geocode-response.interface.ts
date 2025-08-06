import { GoogleGeocodeResult } from './geocode.interface';

export interface GoogleGeocodeResponse {
  status: string;
  results: GoogleGeocodeResult[];
}
