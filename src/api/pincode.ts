import { apiFetch } from "./api";

export interface PincodeOffice {
  office_name: string;
  circle: string;
  lat?: number;
  lng?: number;
}

export interface PincodeResponse {
  pincode: string;
  state: string;
  district: string;
  offices: PincodeOffice[];
}

/**
 * Get address information by PIN code
 * @param pin - 6-digit PIN code
 * @returns Address information including state, district, and post offices
 */
export async function getAddressByPin(pin: string): Promise<PincodeResponse> {
  if (!/^[1-9]\d{5}$/.test(pin)) {
    throw new Error("Invalid PIN code format");
  }

  const response = await apiFetch(`/pincode/${pin}`);
  return response;
}
