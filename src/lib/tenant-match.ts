/** Demo / migration: rows with no tenant are treated as belonging to the default portal tenant. */
export function tenantMatchesRow(storedTenantId: string | null | undefined, defaultTenantId: string): boolean {
  if (storedTenantId == null || storedTenantId === "") return true;
  return storedTenantId === defaultTenantId;
}
