export { getHeaders, convertArrayToCsv };

function getHeaders({ array }: { array: Record<string, unknown>[] }): string[] {
  const headers = new Set<string>();

  array.forEach(item => Object.keys(item).forEach(key => headers.add(key)));

  return Array.from(headers);
}

function protectSpreadsheetFormula(value: string): string {
  return /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

function serializeValue(value: unknown, { protectFormulas = true } = {}): string {
  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return '';
  }

  const valueAsString = protectFormulas ? protectSpreadsheetFormula(String(value)) : String(value);
  const escapedValue = valueAsString.replace(/"/g, '""');

  if (/[",\r\n]/.test(valueAsString)) {
    return `"${escapedValue}"`;
  }

  return escapedValue;
}

function convertArrayToCsv({ array, protectFormulas = true }: { array: Record<string, unknown>[]; protectFormulas?: boolean }): string {
  const headers = getHeaders({ array });

  const serializedHeaders = headers.map(header => serializeValue(header, { protectFormulas }));
  const rows = array.map(item => headers.map(header => serializeValue(item[header], { protectFormulas })));

  return [serializedHeaders.join(','), ...rows.map(row => row.join(','))].join('\r\n');
}
