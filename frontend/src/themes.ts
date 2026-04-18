// Keep this list in sync with daisyUI 5's built-in themes.
// The CSS directive `@plugin "daisyui" { themes: all; }` enables every
// theme daisyUI ships; this array exposes them in the UI.
// Verified against daisyUI 5.5.19 (resolved via context7 and cross-checked
// against node_modules/daisyui/theme/*.css) on 2026-04-17.
export const THEMES = [
  "light",
  "dark",
  "cupcake",
  "bumblebee",
  "emerald",
  "corporate",
  "synthwave",
  "retro",
  "cyberpunk",
  "valentine",
  "halloween",
  "garden",
  "forest",
  "aqua",
  "lofi",
  "pastel",
  "fantasy",
  "wireframe",
  "black",
  "luxury",
  "dracula",
  "cmyk",
  "autumn",
  "business",
  "acid",
  "lemonade",
  "night",
  "coffee",
  "winter",
  "dim",
  "nord",
  "sunset",
  "caramellatte",
  "abyss",
  "silk",
] as const;

export type Theme = (typeof THEMES)[number];
