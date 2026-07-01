export function normalizeCommunityName(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function formatCommunityDisplayName(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
