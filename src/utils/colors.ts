/** Returns a colour for a credit rating string. */
export function ratingColor(rating: string | undefined): string {
  if (!rating) return "#555";
  if (rating.startsWith("AA"))  return "#4ade80";
  if (rating.startsWith("A+"))  return "#86efac";
  if (rating.startsWith("A"))   return "#a3e8bc";
  if (rating === "BBB+")        return "#fde68a";
  if (rating.startsWith("BBB")) return "#fcd34d";
  if (rating.startsWith("BB"))  return "#fb923c";
  return "#f87171";
}
