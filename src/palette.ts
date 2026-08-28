/**
 * Curated tag colors. Chosen to stay legible as tinted pills in both light and
 * dark themes (pills use these via color-mix in styles.css). Tags store one of
 * these hex values directly.
 */
export const TAG_COLORS: string[] = [
  '#e5484d', // red
  '#f76b15', // orange
  '#ffb224', // amber
  '#30a46c', // green
  '#12a594', // teal
  '#3e63dd', // blue
  '#6e56cf', // violet
  '#d6409f', // pink
];

export const DEFAULT_TAG_COLOR = TAG_COLORS[5]; // blue
