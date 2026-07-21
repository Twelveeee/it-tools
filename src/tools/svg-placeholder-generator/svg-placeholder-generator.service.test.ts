import { describe, expect, it } from 'vitest';
import { createPlaceholderSvg } from './svg-placeholder-generator.service';

describe('SVG placeholder generator', () => {
  it('escapes user-provided text instead of creating executable SVG nodes', () => {
    const svg = createPlaceholderSvg({
      width: 600,
      height: 350,
      fontSize: 26,
      backgroundColor: '#ccc',
      foregroundColor: '#333',
      customText: '</text><script>alert(1)</script><text>',
      useExactSize: true,
    });

    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;/text&gt;&lt;script&gt;alert(1)&lt;/script&gt;&lt;text&gt;');
  });

  it('normalizes invalid dimensions to positive integers', () => {
    const svg = createPlaceholderSvg({
      width: -1,
      height: 10.8,
      fontSize: 0,
      backgroundColor: '#ccc',
      foregroundColor: '#333',
      customText: '',
      useExactSize: true,
    });

    expect(svg).toContain('viewBox="0 0 1 11"');
    expect(svg).toContain('font-size="1px"');
  });
});
