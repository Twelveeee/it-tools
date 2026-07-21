import type { SignatureInfo } from './pdf-signature-checker.types';

export const PDF_SIGNATURE_TRUST_WARNING
  = 'This parser checks the signed bytes, but its certificate-chain authenticity flag is not a standards-compliant PKIX trust validation. It cannot establish the signer’s identity.';

export interface SignatureStatusItem {
  key: 'integrity' | 'authenticity' | 'expired' | 'verified'
  label: string
  value: string
  type: 'success' | 'error' | 'warning'
  description: string
}

export function getSignatureStatusItems(signature: SignatureInfo): SignatureStatusItem[] {
  return [
    {
      key: 'integrity',
      label: 'integrity',
      value: signature.integrity ? 'Passed' : 'Failed',
      type: signature.integrity ? 'success' : 'error',
      description: signature.integrity
        ? 'The signature covers the parsed PDF bytes and the signed digest matches.'
        : 'The signed digest does not match the parsed PDF bytes.',
    },
    {
      key: 'authenticity',
      label: 'authenticity (untrusted library hint)',
      value: signature.authenticity ? 'Reported match — not validated' : 'Not established',
      type: 'warning',
      description: 'This value must not be used as proof that the certificate chain or signer is trusted.',
    },
    {
      key: 'expired',
      label: 'expired',
      value: signature.expired ? 'Expired or not yet valid' : 'Within reported validity period',
      type: signature.expired ? 'error' : 'success',
      description: 'This is a local clock comparison only; it does not validate a trusted timestamp.',
    },
    {
      key: 'verified',
      label: 'verified (untrusted library aggregate)',
      value: signature.verified ? 'Library reported true — not a trust verdict' : 'Library reported false',
      type: 'warning',
      description: 'The library combines integrity, its non-PKIX authenticity hint, and certificate dates.',
    },
  ];
}
