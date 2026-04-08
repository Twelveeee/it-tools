// eslint-disable-next-line unicorn/prefer-node-protocol
import { Buffer as BufferPolyfill } from 'buffer';
import { unserialize as phpUnserialize } from 'php-serialize';

export type PhpUnserializeMode = 'json' | 'print_r' | 'var_dump' | 'var_export';

export type ParsePhpSerializedResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

const PRINT_R_INDENT = '    ';
const VAR_DUMP_INDENT = '  ';
const VAR_EXPORT_INDENT = '  ';
const INCOMPLETE_CLASS_NAME_KEY = '__PHP_Incomplete_Class_Name';

export function parsePhpSerialized(input: string): ParsePhpSerializedResult {
  ensureBuffer();

  try {
    return {
      ok: true,
      value: phpUnserialize(input, {}, { strict: false }),
    };
  }
  catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to unserialize input.',
    };
  }
}

export function formatPhpValue(value: unknown, mode: PhpUnserializeMode): string {
  switch (mode) {
    case 'json':
      return formatJson(value);
    case 'print_r':
      return formatPrintR(value);
    case 'var_dump':
      return formatVarDump(value);
    case 'var_export':
      return formatVarExport(value);
  }
}

function formatJson(value: unknown) {
  return JSON.stringify(normalizeJsonValue(value), null, 2);
}

function normalizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(entry => normalizeJsonValue(entry));
  }

  if (typeof value === 'bigint') {
    return String(value);
  }

  if (isPlainPhpArray(value)) {
    return Object.fromEntries(getDisplayEntries(value).map(([key, entryValue]) => [key, normalizeJsonValue(entryValue)]));
  }

  if (isIncompletePhpClass(value)) {
    return {
      __phpClassName: getObjectClassName(value),
      ...Object.fromEntries(getDisplayEntries(value).map(([key, entryValue]) => [key, normalizeJsonValue(entryValue)])),
    };
  }

  if (isObjectLike(value)) {
    return {
      __phpClassName: getObjectClassName(value),
      ...Object.fromEntries(getDisplayEntries(value).map(([key, entryValue]) => [key, normalizeJsonValue(entryValue)])),
    };
  }

  return value;
}

function ensureBuffer() {
  const runtime = globalThis as typeof globalThis & { Buffer?: typeof BufferPolyfill };

  if (runtime.Buffer !== BufferPolyfill) {
    runtime.Buffer = BufferPolyfill;
  }
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPlainPhpArray(value: unknown): value is Record<string, unknown> {
  return isObjectLike(value)
    && !isIncompletePhpClass(value)
    && (value.constructor === Object || typeof value.constructor === 'undefined');
}

function isIncompletePhpClass(value: unknown): value is Record<string, unknown> & { __PHP_Incomplete_Class_Name: string } {
  return isObjectLike(value) && typeof value[INCOMPLETE_CLASS_NAME_KEY] === 'string';
}

function getObjectClassName(value: Record<string, unknown>) {
  if (isIncompletePhpClass(value)) {
    return value[INCOMPLETE_CLASS_NAME_KEY];
  }

  return value.constructor?.name ?? 'Object';
}

function getDisplayEntries(value: unknown): Array<[string | number, unknown]> {
  if (Array.isArray(value)) {
    return value.map((entry, index) => [index, entry] as [number, unknown]);
  }

  if (!isObjectLike(value)) {
    return [];
  }

  return Object.entries(value).filter(([key]) => key !== INCOMPLETE_CLASS_NAME_KEY);
}

function formatPrintR(value: unknown, level = 0): string {
  if (Array.isArray(value) || isPlainPhpArray(value)) {
    return formatPrintRComposite('Array', getDisplayEntries(value), level);
  }

  if (isObjectLike(value)) {
    return formatPrintRComposite(`${getObjectClassName(value)} Object`, getDisplayEntries(value), level);
  }

  return formatPrintRScalar(value);
}

function formatPrintRComposite(label: string, entries: Array<[string | number, unknown]>, level: number) {
  const indent = PRINT_R_INDENT.repeat(level);

  if (entries.length === 0) {
    return `${label}\n${indent}(\n${indent})`;
  }

  const body = entries.map(([key, entryValue]) => {
    const entryPrefix = `${PRINT_R_INDENT.repeat(level + 1)}[${String(key)}] => `;

    if (Array.isArray(entryValue) || isObjectLike(entryValue)) {
      return `${entryPrefix}${formatPrintR(entryValue, level + 2)}`;
    }

    return `${entryPrefix}${formatPrintRScalar(entryValue)}`;
  }).join('\n');

  return `${label}\n${indent}(\n${body}\n${indent})`;
}

function formatPrintRScalar(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? '1' : '';
  }

  if (value === null || typeof value === 'undefined') {
    return '';
  }

  return String(value);
}

function formatVarDump(value: unknown, level = 0): string {
  const indent = VAR_DUMP_INDENT.repeat(level);

  if (Array.isArray(value) || isPlainPhpArray(value)) {
    return formatVarDumpComposite({
      header: `array(${getDisplayEntries(value).length}) {`,
      entries: getDisplayEntries(value),
      level,
    });
  }

  if (isObjectLike(value)) {
    const entries = getDisplayEntries(value);
    return formatVarDumpComposite({
      header: `object(${getObjectClassName(value)}) (${entries.length}) {`,
      entries,
      level,
    });
  }

  if (typeof value === 'string') {
    return `${indent}string(${getByteLength(value)}) "${escapeForDoubleQuotedString(value)}"`;
  }

  if (typeof value === 'number') {
    return `${indent}${Number.isInteger(value) ? 'int' : 'float'}(${String(value)})`;
  }

  if (typeof value === 'bigint') {
    return `${indent}int(${String(value)})`;
  }

  if (typeof value === 'boolean') {
    return `${indent}bool(${value ? 'true' : 'false'})`;
  }

  if (value === null || typeof value === 'undefined') {
    return `${indent}NULL`;
  }

  return `${indent}string(${getByteLength(String(value))}) "${escapeForDoubleQuotedString(String(value))}"`;
}

function formatVarDumpComposite({
  header,
  entries,
  level,
}: {
  header: string
  entries: Array<[string | number, unknown]>
  level: number
}) {
  const indent = VAR_DUMP_INDENT.repeat(level);

  if (entries.length === 0) {
    return `${indent}${header}\n${indent}}`;
  }

  const body = entries.map(([key, entryValue]) =>
    `${VAR_DUMP_INDENT.repeat(level + 1)}${formatVarDumpKey(key)}=>\n${formatVarDump(entryValue, level + 1)}`,
  ).join('\n');

  return `${indent}${header}\n${body}\n${indent}}`;
}

function formatVarDumpKey(key: string | number) {
  if (typeof key === 'number') {
    return `[${key}]`;
  }

  return `["${escapeForDoubleQuotedString(key)}"]`;
}

function formatVarExport(value: unknown, level = 0): string {
  if (Array.isArray(value) || isPlainPhpArray(value)) {
    return formatVarExportArray(getDisplayEntries(value), level);
  }

  if (isObjectLike(value)) {
    const className = getObjectClassName(value);
    return `${className}::__set_state(${formatVarExportArray(getDisplayEntries(value), level)})`;
  }

  if (typeof value === 'string') {
    return `'${escapeForSingleQuotedString(value)}'`;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (value === null || typeof value === 'undefined') {
    return 'NULL';
  }

  return `'${escapeForSingleQuotedString(String(value))}'`;
}

function formatVarExportArray(entries: Array<[string | number, unknown]>, level: number) {
  const indent = VAR_EXPORT_INDENT.repeat(level);

  if (entries.length === 0) {
    return 'array (\n)';
  }

  const body = entries.map(([key, entryValue]) =>
    `${VAR_EXPORT_INDENT.repeat(level + 1)}${formatVarExportKey(key)} => ${formatVarExport(entryValue, level + 1)},`,
  ).join('\n');

  return `array (\n${body}\n${indent})`;
}

function formatVarExportKey(key: string | number) {
  if (typeof key === 'number') {
    return String(key);
  }

  return `'${escapeForSingleQuotedString(key)}'`;
}

function getByteLength(value: string) {
  return BufferPolyfill.byteLength(value, 'utf8');
}

function escapeForDoubleQuotedString(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .split('\0').join('\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/"/g, '\\"');
}

function escapeForSingleQuotedString(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '\\\'');
}
