export function generateSlug(text: string): string {
  if (!text) return "";

  return (
    text
      .toLowerCase()
      // Keep Arabic letters, Latin letters, numbers, spaces, hyphens
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      // Replace whitespace with hyphens
      .replace(/\s+/g, "-")
      // Collapse multiple hyphens
      .replace(/-+/g, "-")
      // Trim hyphens from start and end
      .replace(/^-+|-+$/g, "")
  );
}
