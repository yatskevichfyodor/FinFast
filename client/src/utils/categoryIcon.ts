export function toVuetifyCategoryIcon(icon: string): string {
  // Older categories stored MDI names in Vuetify's `mdi-name` format.
  return icon.startsWith("mdi:") ? icon.replace(/^mdi:/, "mdi-") : icon;
}