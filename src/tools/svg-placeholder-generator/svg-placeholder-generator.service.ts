function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function createPlaceholderSvg({
  width,
  height,
  fontSize,
  backgroundColor,
  foregroundColor,
  customText,
  useExactSize,
}: {
  width: number
  height: number
  fontSize: number
  backgroundColor: string
  foregroundColor: string
  customText: string
  useExactSize: boolean
}): string {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const safeFontSize = Math.max(1, Math.round(fontSize));
  const text = customText.length > 0 ? customText : `${safeWidth}x${safeHeight}`;
  const size = useExactSize ? ` width="${safeWidth}" height="${safeHeight}"` : '';

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${safeWidth} ${safeHeight}"${size}>
  <rect width="${safeWidth}" height="${safeHeight}" fill="${escapeXml(backgroundColor)}"></rect>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="${safeFontSize}px" fill="${escapeXml(foregroundColor)}">${escapeXml(text)}</text>
</svg>
  `.trim();
}

export { escapeXml };
