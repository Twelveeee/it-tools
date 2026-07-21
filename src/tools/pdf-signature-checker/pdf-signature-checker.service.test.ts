import { describe, expect, it } from 'vitest';
import type { SignatureInfo } from './pdf-signature-checker.types';
import {
  PDF_SIGNATURE_TRUST_WARNING,
  getSignatureStatusItems,
} from './pdf-signature-checker.service';

function signatureWith(overrides: Partial<SignatureInfo> = {}): SignatureInfo {
  return {
    verified: true,
    authenticity: true,
    integrity: true,
    expired: false,
    meta: { certs: [], signatureMeta: { reason: '', contactInfo: null, location: '', name: null } },
    ...overrides,
  };
}

describe('PDF signature status presentation', () => {
  it('never presents authenticity or aggregate verified flags as trust verdicts', () => {
    const statuses = getSignatureStatusItems(signatureWith());
    const authenticity = statuses.find(status => status.key === 'authenticity');
    const verified = statuses.find(status => status.key === 'verified');

    expect(authenticity).toMatchObject({ type: 'warning' });
    expect(authenticity?.value).toContain('not validated');
    expect(verified).toMatchObject({ type: 'warning' });
    expect(verified?.value).toContain('not a trust verdict');
    expect(PDF_SIGNATURE_TRUST_WARNING).toContain('not a standards-compliant PKIX');
  });

  it('makes integrity and certificate-date failures visible', () => {
    const statuses = getSignatureStatusItems(signatureWith({ integrity: false, expired: true }));

    expect(statuses.find(status => status.key === 'integrity')).toMatchObject({
      value: 'Failed',
      type: 'error',
    });
    expect(statuses.find(status => status.key === 'expired')).toMatchObject({
      value: 'Expired or not yet valid',
      type: 'error',
    });
  });
});
