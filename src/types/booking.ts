export interface BookingLinkParams {
  name: string;
  latitude?: number;
  longitude?: number;
  checkIn?: Date;
  checkOut?: Date;
  adults?: number;
  rooms?: number;
}

export interface BookingLinks {
  [key: string]: string;
} 