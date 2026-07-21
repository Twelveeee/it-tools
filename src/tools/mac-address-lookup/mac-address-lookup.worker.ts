import db from 'oui-data';
import type { MacAddressLookupRequest, MacAddressLookupResponse } from './mac-address-lookup.service';

interface WorkerScope {
  onmessage: ((event: MessageEvent<MacAddressLookupRequest>) => void) | null
  postMessage: (message: MacAddressLookupResponse) => void
}

const workerScope = globalThis as unknown as WorkerScope;
const vendors = db as Record<string, string>;

workerScope.onmessage = ({ data: { id, prefix } }) => {
  workerScope.postMessage({ id, vendor: vendors[prefix] });
};
