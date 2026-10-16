// What the inbox tells people about deleting and downloading a response. Kept in one place because the same sentence is
// shown by the list's dialog and by the drawer's own confirm, and it had gone stale in both.
//
// The facts it must match: deleting a response (one or many) moves it to Trash, where it stays for 30 days before it is
// removed for good. Bulk delete also offers an immediate Undo in the toast.
export const RETENTION_DAYS = 30;

export const DELETE_COPY = {
  single: `This moves the response to Trash. It is deleted for good after ${RETENTION_DAYS} days.`,
  bulk: `They move to Trash and are deleted for good after ${RETENTION_DAYS} days. You can also undo right away from the toast.`,
} as const;

/** A download of one response is a one-row CSV export: it is queued, then listed on the Exports page when ready. */
export const DOWNLOAD_QUEUED = 'Preparing your download. It will appear on the Exports page when it is ready.';
export const DOWNLOAD_FAILED = 'Failed to start the download. Please try again.';

/** The server answers 404 both for a deleted submission and for someone else's id, so this cannot say which it was. */
export const SUBMISSION_NOT_FOUND = {
  title: 'We could not find that submission.',
  hint: "It may have been removed by the form's owner, or the link may belong to a different account.",
} as const;
