<script setup lang="ts">
import type { SignatureInfo } from '../pdf-signature-checker.types';
import { getSignatureStatusItems } from '../pdf-signature-checker.service';

const props = defineProps<{ signature: SignatureInfo }>();
const { signature } = toRefs(props);

const tableHeaders = {
  validityPeriod: 'Validity period',
  issuedBy: 'Issued by',
  issuedTo: 'Issued to',
  pemCertificate: 'PEM certificate',
};

const certs = computed(() => signature.value.meta.certs.map((certificate, index) => ({
  ...certificate,
  validityPeriod: {
    notBefore: new Date(certificate.validityPeriod.notBefore).toLocaleString(),
    notAfter: new Date(certificate.validityPeriod.notAfter).toLocaleString(),
  },
  certificateName: `Certificate ${index + 1}`,
})),
);

const statusItems = computed(() => getSignatureStatusItems(signature.value));
</script>

<template>
  <div flex flex-col gap-2>
    <div grid mb-3 gap-3 md:grid-cols-2>
      <div v-for="item in statusItems" :key="item.key" rounded b="1px solid gray op-30" p-3>
        <div mb-2 flex items-center justify-between gap-2>
          <span font-bold>{{ item.label }}</span>
          <n-tag :type="item.type" :bordered="false">
            {{ item.value }}
          </n-tag>
        </div>
        <div text-sm op-70>
          {{ item.description }}
        </div>
      </div>
    </div>

    <c-table :data="certs" :headers="tableHeaders">
      <template #validityPeriod="{ value }">
        <c-key-value-list
          :items="[{
            label: 'Not before',
            value: value.notBefore,
          }, {
            label: 'Not after',
            value: value.notAfter,
          }]"
        />
      </template>

      <template #issuedBy="{ value }">
        <c-key-value-list
          :items="[{
            label: 'Common name',
            value: value.commonName,
          }, {
            label: 'Organization name',
            value: value.organizationName,
          }, {
            label: 'Country name',
            value: value.countryName,
          }, {
            label: 'Locality name',
            value: value.localityName,
          }, {
            label: 'Organizational unit name',
            value: value.organizationalUnitName,
          }, {
            label: 'State or province name',
            value: value.stateOrProvinceName,
          }]"
        />
      </template>

      <template #issuedTo="{ value }">
        <c-key-value-list
          :items="[{
            label: 'Common name',
            value: value.commonName,
          }, {
            label: 'Organization name',
            value: value.organizationName,
          }, {
            label: 'Country name',
            value: value.countryName,
          }, {
            label: 'Locality name',
            value: value.localityName,
          }, {
            label: 'Organizational unit name',
            value: value.organizationalUnitName,
          }, {
            label: 'State or province name',
            value: value.stateOrProvinceName,
          }]"
        />
      </template>

      <template #pemCertificate="{ value }">
        <c-modal-value :value="value" label="View PEM cert">
          <template #value>
            <div break-all text-xs>
              {{ value }}
            </div>
          </template>
        </c-modal-value>
      </template>
    </c-table>
  </div>
</template>
