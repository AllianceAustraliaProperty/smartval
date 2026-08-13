export const PARKING_TYPES = [
  "Single Garage",
  "Double Garage",
  "Car Port",
  "Car Space",
  "Lock Up Garage",
  "1 Secure Car Space",
  "2 Secure Car Space",
  "3 Secure Car Space",
  "1 Secure Car Space With Storage Space",
  "2 Secure Car Space With Storage Space",
  "3 Secure Car Space With Storage Space",
  "N/A"
] as const;

export type ParkingType = typeof PARKING_TYPES[number];
