import { describe, expect, it } from 'vitest';
import { formatPhpValue, parseJsonInput, parsePhpSerialized, serializePhpValue } from './php-unserialize.service';

const nestedSerialized = 'a:4:{s:4:"name";s:5:"Alice";s:5:"items";a:2:{i:0;s:3:"foo";i:1;s:3:"bar";}s:6:"active";b:1;s:4:"meta";a:1:{s:5:"count";i:2;}}';
const objectSerialized = 'O:7:"MyClass":1:{s:1:"a";i:1;}';

describe('php-unserialize service', () => {
  it('parses nested serialized values', () => {
    expect(parsePhpSerialized(nestedSerialized)).toEqual({
      ok: true,
      value: {
        name: 'Alice',
        items: ['foo', 'bar'],
        active: true,
        meta: {
          count: 2,
        },
      },
    });
  });

  it('returns an error for invalid serialized values', () => {
    const result = parsePhpSerialized('definitely not serialized');

    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.error).toContain('while unserializing payload');
  });

  it('formats nested arrays with print_r output', () => {
    const parsed = parsePhpSerialized(nestedSerialized);

    expect(parsed.ok && formatPhpValue(parsed.value, 'print_r')).toMatchInlineSnapshot(`
      "Array
      (
          [name] => Alice
          [items] => Array
              (
                  [0] => foo
                  [1] => bar
              )
          [active] => 1
          [meta] => Array
              (
                  [count] => 2
              )
      )"
    `);
  });

  it('formats nested arrays with var_dump output', () => {
    const parsed = parsePhpSerialized(nestedSerialized);

    expect(parsed.ok && formatPhpValue(parsed.value, 'var_dump')).toMatchInlineSnapshot(`
      "array(4) {
        [\\"name\\"]=>
        string(5) \\"Alice\\"
        [\\"items\\"]=>
        array(2) {
          [0]=>
          string(3) \\"foo\\"
          [1]=>
          string(3) \\"bar\\"
        }
        [\\"active\\"]=>
        bool(true)
        [\\"meta\\"]=>
        array(1) {
          [\\"count\\"]=>
          int(2)
        }
      }"
    `);
  });

  it('formats nested arrays with var_export output', () => {
    const parsed = parsePhpSerialized(nestedSerialized);

    expect(parsed.ok && formatPhpValue(parsed.value, 'var_export')).toMatchInlineSnapshot(`
      "array (
        'name' => 'Alice',
        'items' => array (
          0 => 'foo',
          1 => 'bar',
        ),
        'active' => true,
        'meta' => array (
          'count' => 2,
        ),
      )"
    `);
  });

  it('formats nested arrays with json output', () => {
    const parsed = parsePhpSerialized(nestedSerialized);

    expect(parsed.ok && formatPhpValue(parsed.value, 'json')).toMatchInlineSnapshot(`
      "{
        \\"name\\": \\"Alice\\",
        \\"items\\": [
          \\"foo\\",
          \\"bar\\"
        ],
        \\"active\\": true,
        \\"meta\\": {
          \\"count\\": 2
        }
      }"
    `);
  });

  it('formats scalars across output modes', () => {
    const utf8String = parsePhpSerialized('s:6:"你好";');
    const bigintValue = parsePhpSerialized('i:9223372036854775808;');
    const floatValue = parsePhpSerialized('d:3.14;');
    const booleanValue = parsePhpSerialized('b:0;');
    const nullValue = parsePhpSerialized('N;');

    expect(utf8String.ok && formatPhpValue(utf8String.value, 'var_dump')).toBe('string(6) "你好"');
    expect(bigintValue.ok && formatPhpValue(bigintValue.value, 'var_dump')).toBe('int(9223372036854775808)');
    expect(floatValue.ok && formatPhpValue(floatValue.value, 'var_dump')).toBe('float(3.14)');
    expect(booleanValue.ok && formatPhpValue(booleanValue.value, 'var_export')).toBe('false');
    expect(nullValue.ok && formatPhpValue(nullValue.value, 'var_dump')).toBe('NULL');
    expect(bigintValue.ok && formatPhpValue(bigintValue.value, 'json')).toBe('"9223372036854775808"');
  });

  it('keeps original class names for incomplete PHP objects', () => {
    const parsed = parsePhpSerialized(objectSerialized);

    expect(parsed.ok && formatPhpValue(parsed.value, 'print_r')).toMatchInlineSnapshot(`
      "MyClass Object
      (
          [a] => 1
      )"
    `);
    expect(parsed.ok && formatPhpValue(parsed.value, 'var_dump')).toMatchInlineSnapshot(`
      "object(MyClass) (1) {
        [\\"a\\"]=>
        int(1)
      }"
    `);
    expect(parsed.ok && formatPhpValue(parsed.value, 'var_export')).toMatchInlineSnapshot(`
      "MyClass::__set_state(array (
        'a' => 1,
      ))"
    `);
    expect(parsed.ok && formatPhpValue(parsed.value, 'json')).toMatchInlineSnapshot(`
      "{
        \\"__phpClassName\\": \\"MyClass\\",
        \\"a\\": 1
      }"
    `);
  });

  it('parses JSON input before serialization', () => {
    expect(parseJsonInput('{name:"Alice",items:["foo","bar"]}')).toEqual({
      ok: true,
      value: {
        name: 'Alice',
        items: ['foo', 'bar'],
      },
    });
  });

  it('returns an error for invalid JSON input', () => {
    const result = parseJsonInput('{not valid json');

    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.error).not.toBe('');
  });

  it('serializes nested JSON-compatible values as PHP arrays', () => {
    const parsed = parseJsonInput(`{
      "name": "Alice",
      "items": ["foo", "bar"],
      "active": true,
      "meta": { "count": 2 }
    }`);

    expect(parsed.ok && serializePhpValue(parsed.value)).toBe(nestedSerialized);
  });

  it('serializes UTF-8 strings with PHP byte lengths', () => {
    expect(serializePhpValue('你好')).toBe('s:6:"你好";');
  });

  it('serializes JSON scalar values', () => {
    expect(serializePhpValue('hello')).toBe('s:5:"hello";');
    expect(serializePhpValue(42)).toBe('i:42;');
    expect(serializePhpValue(3.14)).toBe('d:3.14;');
    expect(serializePhpValue(true)).toBe('b:1;');
    expect(serializePhpValue(false)).toBe('b:0;');
    expect(serializePhpValue(null)).toBe('N;');
  });
});
