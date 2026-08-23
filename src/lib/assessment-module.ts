import type { ModuleType } from "@/generated/prisma/enums";

/**
 * A Job Role and a Skill Framework are mutually exclusive per Assessment,
 * scoped by moduleType: Job Role only applies to PSYCHOMETRIC, Skill
 * Framework only to TECHNICAL. Every write path that sets either field must
 * go through this so the two taxonomies never end up set on the same row.
 */
export function resolveModuleFields(
  moduleType: ModuleType,
  jobRoleId: string | null,
  skillFrameworkId: string | null,
): { jobRoleId: string | null; skillFrameworkId: string | null } {
  return {
    jobRoleId: moduleType === "PSYCHOMETRIC" ? jobRoleId : null,
    skillFrameworkId: moduleType === "TECHNICAL" ? skillFrameworkId : null,
  };
}
