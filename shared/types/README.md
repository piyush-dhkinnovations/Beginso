# shared/types

Contract types for V2's memberships work — `Workspace`, `Membership`, `Invitation`.
Interfaces and unions only: no Mongoose, no validation logic, no implementation.

**The backend publishes each route's request/response shape here before the
frontend integrates against it.** This scaffold (Sprint 7 pre-work, P7) carries
the fields P1–P3 already settled — `Membership.notificationPreference`,
`Workspace.timezone` / `Membership.timezoneOverride`, and the nullable
`AssigneeRef` — but the backend developer owns and extends this folder from
here.

**Both `workspaceId` and `membershipId` scoping tests are merge blockers.**
Every endpoint that reads or writes workspace- or membership-scoped data needs
a passing test proving it cannot leak across a `workspaceId` or `membershipId`
boundary before it merges — not just an endpoint that happens to work.
