import { describe, expect, it } from 'vitest';
import { generateMetaTags } from './meta-tag-generator.service';

describe('meta tag generator', () => {
  it('uses the correct attributes for Open Graph and Twitter metadata', () => {
    expect(generateMetaTags({ 'title': 'IT Tools', 'twitter:card': 'summary' })).toBe([
      '<meta property="og:title" content="IT Tools">',
      '<meta name="twitter:card" content="summary">',
    ].join('\n'));
  });

  it('escapes attribute values and cannot inject markup', () => {
    const result = generateMetaTags({ title: 'x"><script>alert(1)</script>' });

    expect(result).toBe('<meta property="og:title" content="x&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;">');
    expect(result).not.toContain('<script>');
  });

  it('creates one tag per non-empty array value', () => {
    expect(generateMetaTags({ image: ['one.png', '', 'two.png'] })).toBe([
      '<meta property="og:image" content="one.png">',
      '<meta property="og:image" content="two.png">',
    ].join('\n'));
  });

  it('preserves namespaced Open Graph properties', () => {
    expect(generateMetaTags({ 'article:author': 'https://example.com/author', 'music:duration': 180 })).toBe([
      '<meta property="article:author" content="https://example.com/author">',
      '<meta property="music:duration" content="180">',
    ].join('\n'));
  });
});
