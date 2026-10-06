// Pinned forms - exact wire shapes. Pins are PER USER (a private bookmark): pinning never changes the
// form or what teammates see. Backend: Beginso-Backend src/controllers/pin.controller.ts,
// src/services/pin.service.ts, src/models/FormPin.ts.

/** Max pins per user. PUT beyond this -> 400 PIN_LIMIT (stale pins on trashed/unreadable forms do not count). */
export const PIN_LIMIT = 50;

export type PinErrorCode =
  | 'INVALID_FORM_ID' // 400
  | 'PIN_LIMIT' // 400
  | 'FORBIDDEN_INSUFFICIENT_PERMISSIONS' // 403: caller cannot read the form (also workspace-level 403s from the permission middleware)
  | 'FORM_NOT_FOUND' // 404
  | 'PIN_FORM_UNAVAILABLE'; // 409: form is trashed or archived

export interface PinError {
  success: false;
  message: string;
  error: { code: PinErrorCode | string; message: string };
}

/**
 * PUT /api/forms/:formId/pin   (no body)
 * Needs only READ access to the form (viewer/reviewer, per-form grant, or creator of a personal form).
 * Idempotent: pinning an already-pinned form is 200 and returns the ORIGINAL pinnedAt.
 * Errors: 400 INVALID_FORM_ID | PIN_LIMIT, 403, 404, 409 PIN_FORM_UNAVAILABLE.
 */
export interface PinFormResponse {
  success: true;
  formId: string;
  pinned: true;
  pinnedAt: string; // ISO date
}

/**
 * DELETE /api/forms/:formId/pin
 * Idempotent, always 200 for an authenticated user (even if not pinned, or the form is gone / the caller
 * lost access: it only removes the caller's own row, so users can always clean up).
 */
export interface UnpinFormResponse {
  success: true;
  formId: string;
  pinned: false;
}

/**
 * GET /api/forms  - existing list, two additions:
 *  - EVERY row now has `pinned: boolean` for the caller; `pinnedAt` (ISO) is present only when pinned.
 *  - `?pinned=true` returns only the caller's pinned forms, newest pin first.
 * Everything else is unchanged and still applies to the pinned list: context scoping (x-workspace-slug /
 * ?workspaceId=personal), search, status, page/limit, `archived` (default "false": archived forms are
 * EXCLUDED from the pinned list; pass archived=true to include them). Trashed forms never appear.
 * Response envelope is unchanged: { success, forms, total, page, limit, pages, totalPages }.
 * For pinned=true, `total`/`pages` count the caller's matching pins in that context.
 *
 * GET /api/shared-with-me rows also carry `pinned` / `pinnedAt` (grant-only forms live outside the
 * caller's workspace list, so that is where their pin state shows).
 */
export interface PinnedFields {
  pinned: boolean;
  pinnedAt?: string;
}
