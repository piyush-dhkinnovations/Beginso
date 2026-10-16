// Roles & Permissions reference — requirements.md §7.6, design.md §5/§15.2.
// Server component, deliberately: the capability matrix is static data (src/lib/roles.ts),
// there is no useQuery anywhere on this page and there must never be one (design.md §5/§21's
// own regression test asserts no loading state ever appears).
import { PageHeader } from '@/components/ui/PageHeader';
import { RolesMatrix } from '@/components/team/RolesMatrix';

export default function RolesPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Roles & Permissions" description="Read-only in this release — permission levels are fixed per role." />
      <RolesMatrix />
      <p className="max-w-prose bg-body-sm text-(--text-muted)">
        Editors can also see the workspace Activity feed and the member list (names and emails), even though they cannot open Team settings or the Audit Log.
      </p>
    </div>
  );
}
