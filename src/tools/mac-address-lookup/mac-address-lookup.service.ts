export interface MacAddressLookupRequest {
  id: number
  prefix: string
}

export interface MacAddressLookupResponse {
  id: number
  vendor?: string
}

export function getVendorPrefix(address: string) {
  return address.trim().replace(/[.:-]/g, '').toUpperCase().slice(0, 6);
}
