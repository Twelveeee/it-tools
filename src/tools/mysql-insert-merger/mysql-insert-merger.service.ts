export interface TransformMysqlInsertsOptions {
  removeDatabaseName: boolean
  removeId: boolean
  batchSize?: number | null
}

export type TransformMysqlInsertsResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

interface ParsedInsert {
  table: string
  columns: string[]
  tuples: string[][]
}

interface OutputInsert {
  table: string
  columns: string[]
  tuples: string[][]
}

interface ScanState {
  quote: '\'' | '"' | '`' | null
}

const INSERT_INTO_RE = /^\s*insert\s+into\s+/i;
const VALUES_RE = /^values\b/i;

export function transformMysqlInserts(input: string, options: TransformMysqlInsertsOptions): TransformMysqlInsertsResult {
  if (input.trim() === '') {
    return { ok: true, value: '' };
  }

  try {
    const inserts = splitStatements(input).map(parseInsertStatement);
    const outputInserts = inserts.map(insert => transformInsert(insert, options));
    const output = shouldMerge(options.batchSize)
      ? formatMergedInserts(outputInserts, options.batchSize as number)
      : outputInserts.map(formatInsert).join('\n');

    return { ok: true, value: output };
  }
  catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to parse INSERT INTO statement.',
    };
  }
}

function transformInsert(insert: ParsedInsert, options: TransformMysqlInsertsOptions): OutputInsert {
  const removedIndexes = options.removeId
    ? insert.columns
      .map((column, index) => normalizeIdentifier(column) === 'id' ? index : -1)
      .filter(index => index >= 0)
    : [];
  const removedIndexSet = new Set(removedIndexes);

  return {
    table: options.removeDatabaseName ? removeDatabaseName(insert.table) : insert.table,
    columns: insert.columns.filter((_, index) => !removedIndexSet.has(index)),
    tuples: insert.tuples.map(tuple => tuple.filter((_, index) => !removedIndexSet.has(index))),
  };
}

function formatMergedInserts(inserts: OutputInsert[], batchSize: number) {
  const chunks: string[] = [];
  let current: OutputInsert | null = null;

  function flush() {
    if (!current) {
      return;
    }

    for (let index = 0; index < current.tuples.length; index += batchSize) {
      chunks.push(formatInsert({
        ...current,
        tuples: current.tuples.slice(index, index + batchSize),
      }));
    }

    current = null;
  }

  for (const insert of inserts) {
    if (!current || getInsertKey(current) !== getInsertKey(insert)) {
      flush();
      current = {
        table: insert.table,
        columns: [...insert.columns],
        tuples: [...insert.tuples],
      };
      continue;
    }

    current.tuples.push(...insert.tuples);
  }

  flush();

  return chunks.join('\n');
}

function formatInsert(insert: OutputInsert) {
  return `INSERT INTO ${insert.table} (${insert.columns.join(', ')}) VALUES ${insert.tuples.map(formatTuple).join(', ')};`;
}

function formatTuple(tuple: string[]) {
  return `(${tuple.join(', ')})`;
}

function getInsertKey(insert: OutputInsert) {
  return `${insert.table}\n${insert.columns.join('\0')}`;
}

function shouldMerge(batchSize: number | null | undefined): batchSize is number {
  return typeof batchSize === 'number' && Number.isFinite(batchSize) && batchSize > 0;
}

function parseInsertStatement(statement: string): ParsedInsert {
  const insertMatch = statement.match(INSERT_INTO_RE);
  if (!insertMatch) {
    throw new Error('Expected an INSERT INTO ... VALUES statement.');
  }

  const tableStart = insertMatch[0].length;
  const columnsStart = findTopLevelChar(statement, '(', tableStart);
  if (columnsStart < 0) {
    throw new Error('Expected an INSERT INTO statement with an explicit column list.');
  }

  const table = statement.slice(tableStart, columnsStart).trim();
  if (!table) {
    throw new Error('Expected a table name after INSERT INTO.');
  }

  const columnsEnd = findMatchingParen(statement, columnsStart);
  const columns = splitTopLevelComma(statement.slice(columnsStart + 1, columnsEnd)).map(part => part.trim());
  if (columns.some(column => column === '')) {
    throw new Error('Expected non-empty column names in INSERT INTO column list.');
  }

  const afterColumns = statement.slice(columnsEnd + 1).trimStart();
  const valuesMatch = afterColumns.match(VALUES_RE);
  if (!valuesMatch) {
    throw new Error('Expected an INSERT INTO ... VALUES statement.');
  }

  const tuples = parseTuples(afterColumns.slice(valuesMatch[0].length));
  for (const tuple of tuples) {
    if (tuple.length !== columns.length) {
      throw new Error('Column count does not match value count in INSERT INTO statement.');
    }
  }

  return { table, columns, tuples };
}

function parseTuples(valuesSource: string) {
  const tuples: string[][] = [];
  let index = 0;

  while (index < valuesSource.length) {
    index = skipWhitespace(valuesSource, index);
    if (index >= valuesSource.length) {
      break;
    }

    if (valuesSource[index] !== '(') {
      throw new Error('Expected a VALUES tuple starting with "(".');
    }

    const tupleEnd = findMatchingParen(valuesSource, index);
    tuples.push(splitTopLevelComma(valuesSource.slice(index + 1, tupleEnd)).map(part => part.trim()));

    index = skipWhitespace(valuesSource, tupleEnd + 1);
    if (index >= valuesSource.length) {
      break;
    }

    if (valuesSource[index] !== ',') {
      throw new Error('Expected "," between VALUES tuples.');
    }

    index += 1;
  }

  if (tuples.length === 0) {
    throw new Error('Expected at least one VALUES tuple.');
  }

  return tuples;
}

function splitStatements(input: string) {
  const statements: string[] = [];
  const state: ScanState = { quote: null };
  let statementStart = 0;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (consumeQuotedCharacter(input, index, state)) {
      index += 1;
      continue;
    }

    if (!state.quote && char === ';') {
      const statement = input.slice(statementStart, index).trim();
      if (statement) {
        statements.push(statement);
      }
      statementStart = index + 1;
    }
  }

  if (state.quote) {
    throw new Error('Unterminated quoted string or identifier in INSERT INTO statement.');
  }

  const tail = input.slice(statementStart).trim();
  if (tail) {
    statements.push(tail);
  }

  if (statements.length === 0) {
    throw new Error('Expected an INSERT INTO ... VALUES statement.');
  }

  return statements;
}

function findTopLevelChar(input: string, searchedChar: string, startIndex = 0) {
  const state: ScanState = { quote: null };

  for (let index = startIndex; index < input.length; index += 1) {
    const char = input[index];

    if (consumeQuotedCharacter(input, index, state)) {
      index += 1;
      continue;
    }

    if (!state.quote && char === searchedChar) {
      return index;
    }
  }

  return -1;
}

function findMatchingParen(input: string, openParenIndex: number) {
  const state: ScanState = { quote: null };
  let depth = 0;

  for (let index = openParenIndex; index < input.length; index += 1) {
    const char = input[index];

    if (consumeQuotedCharacter(input, index, state)) {
      index += 1;
      continue;
    }

    if (state.quote) {
      continue;
    }

    if (char === '(') {
      depth += 1;
      continue;
    }

    if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  throw new Error('Unmatched parenthesis in INSERT INTO statement.');
}

function splitTopLevelComma(input: string) {
  const parts: string[] = [];
  const state: ScanState = { quote: null };
  let depth = 0;
  let partStart = 0;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (consumeQuotedCharacter(input, index, state)) {
      index += 1;
      continue;
    }

    if (state.quote) {
      continue;
    }

    if (char === '(') {
      depth += 1;
      continue;
    }

    if (char === ')') {
      depth -= 1;
      continue;
    }

    if (char === ',' && depth === 0) {
      parts.push(input.slice(partStart, index));
      partStart = index + 1;
    }
  }

  if (state.quote) {
    throw new Error('Unterminated quoted string or identifier in INSERT INTO statement.');
  }

  parts.push(input.slice(partStart));

  return parts;
}

function consumeQuotedCharacter(input: string, index: number, state: ScanState) {
  const char = input[index];

  if (!state.quote) {
    if (char === '\'' || char === '"' || char === '`') {
      state.quote = char;
    }
    return false;
  }

  if (state.quote !== '`' && char === '\\') {
    return index + 1 < input.length;
  }

  if (char !== state.quote) {
    return false;
  }

  if (input[index + 1] === state.quote) {
    return true;
  }

  state.quote = null;
  return false;
}

function skipWhitespace(input: string, index: number) {
  while (index < input.length && /\s/.test(input[index])) {
    index += 1;
  }

  return index;
}

function removeDatabaseName(table: string) {
  const parts = splitIdentifierPath(table);

  return parts[parts.length - 1]?.trim() ?? table;
}

function splitIdentifierPath(identifier: string) {
  const parts: string[] = [];
  const state: ScanState = { quote: null };
  let partStart = 0;

  for (let index = 0; index < identifier.length; index += 1) {
    const char = identifier[index];

    if (consumeQuotedCharacter(identifier, index, state)) {
      index += 1;
      continue;
    }

    if (!state.quote && char === '.') {
      parts.push(identifier.slice(partStart, index));
      partStart = index + 1;
    }
  }

  parts.push(identifier.slice(partStart));

  return parts.filter(part => part.trim() !== '');
}

function normalizeIdentifier(identifier: string) {
  const lastPart = splitIdentifierPath(identifier).at(-1)?.trim() ?? identifier.trim();

  if (lastPart.startsWith('`') && lastPart.endsWith('`')) {
    return lastPart.slice(1, -1).replace(/``/g, '`').toLowerCase();
  }

  return lastPart.toLowerCase();
}
