type MetadataValue = string | number | Array<string | number> | null | undefined;

function escapeHtmlAttribute(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toValues(value: MetadataValue): Array<string | number> {
  const values = Array.isArray(value) ? value : [value];
  return values.filter((item): item is string | number => item !== null && item !== undefined && item !== '');
}

export function generateMetaTags(metadata: Record<string, MetadataValue>): string {
  return Object.entries(metadata)
    .flatMap(([key, value]) => {
      const isTwitterProperty = key.startsWith('twitter:');
      const attribute = isTwitterProperty ? 'name' : 'property';
      const property = isTwitterProperty || key.includes(':') ? key : `og:${key}`;

      return toValues(value).map(item =>
        `<meta ${attribute}="${escapeHtmlAttribute(property)}" content="${escapeHtmlAttribute(item)}">`,
      );
    })
    .join('\n');
}

export { escapeHtmlAttribute };
