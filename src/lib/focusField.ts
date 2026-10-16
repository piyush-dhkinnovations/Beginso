/**
 * Move keyboard and screen-reader focus to the first answer that failed validation. Fields mark themselves with
 * aria-invalid (FieldShell) once their error renders, so this reads the DOM instead of guessing at form state, and it
 * is called a frame or two after the state change that produced the error.
 */
export function focusFirstInvalid(root: ParentNode = document): boolean {
  const el = root.querySelector<HTMLElement>('[data-field-id] [aria-invalid="true"]');
  if (!el) return false;
  el.focus({ preventScroll: true });
  el.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  return true;
}

/** Run `focusFirstInvalid` once React has painted the errors (two frames: state update, then the aria-invalid effect). */
export function focusFirstInvalidSoon(): void {
  requestAnimationFrame(() => requestAnimationFrame(() => void focusFirstInvalid()));
}
