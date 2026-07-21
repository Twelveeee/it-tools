import { format, parse } from 'mathjs';

const MAX_EXPRESSION_LENGTH = 1_000;
const blockedFunctions = new Set([
  'concat', 'createUnit', 'derivative', 'evaluate', 'eye', 'filter', 'forEach', 'identity', 'import', 'index',
  'map', 'matrix', 'ones', 'parse', 'permutations', 'range', 'repeat', 'reshape', 'resize', 'simplify', 'sort',
  'sparse', 'subset', 'zeros',
]);

const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<{ expression: string }>) => void) | null
  postMessage: (message: unknown) => void
};

workerScope.onmessage = ({ data }) => {
  try {
    const expression = data.expression.trim();
    if (expression.length === 0) {
      workerScope.postMessage({ result: '' });
      return;
    }
    if (expression.length > MAX_EXPRESSION_LENGTH) {
      throw new Error(`Expressions are limited to ${MAX_EXPRESSION_LENGTH} characters.`);
    }

    const node = parse(expression);
    node.traverse((child) => {
      if (child.type === 'FunctionNode' && 'name' in child && blockedFunctions.has(String(child.name))) {
        throw new Error(`The function ${String(child.name)} is disabled because it can allocate unbounded resources.`);
      }
      if (child.type === 'OperatorNode' && 'op' in child && child.op === '!') {
        throw new Error('Factorial is disabled because it can consume unbounded resources.');
      }
      if (['AssignmentNode', 'FunctionAssignmentNode', 'BlockNode'].includes(child.type)) {
        throw new Error('Assignments and multi-statement expressions are not supported.');
      }
    });

    workerScope.postMessage({ result: format(node.evaluate(), { precision: 14 }) });
  }
  catch (error) {
    workerScope.postMessage({ error: error instanceof Error ? error.message : 'Unable to evaluate expression.' });
  }
};
