export function getDisplayName(
  profile: { display_name?: string | null; email?: string | null } | null | undefined,
  fallback = 'Anonim',
): string {
  return profile?.display_name || profile?.email || fallback;
}
