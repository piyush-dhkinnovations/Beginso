// Why a public form is not taking responses. The backend answers 410 with a stable `error.code` only for states the
// form's owner chose; a draft, an archived form and a link that never existed stay one indistinguishable 404, so a
// link never confirms that a draft exists.
export type FormUnavailableReason = 'closed' | 'closeDate' | 'limit';

const BY_CODE: Record<string, FormUnavailableReason> = {
  FORM_CLOSED: 'closed',
  FORM_CLOSE_DATE_PASSED: 'closeDate',
  FORM_RESPONSE_LIMIT_REACHED: 'limit',
};

/** Reason for a 410 response (or a submit error code). An unknown code on a 410 still means "closed". */
export const reasonFromCode = (code: string | undefined, status?: number): FormUnavailableReason | undefined =>
  (code && BY_CODE[code]) || (status === 410 ? 'closed' : undefined);

export const UNAVAILABLE_COPY: Record<FormUnavailableReason | 'notFound' | 'generic', { title: string; description: string }> = {
  closed: {
    title: 'This form is closed',
    description: 'It is no longer accepting responses. If you think this is a mistake, contact the person who shared it.',
  },
  closeDate: {
    title: "This form's closing date has passed",
    description: 'It stopped accepting responses on the date its owner set. Contact the person who shared it if you still need to respond.',
  },
  limit: {
    title: 'This form has reached its response limit',
    description: 'It has received all the responses it was set up to collect. Contact the person who shared it if you think this is a mistake.',
  },
  notFound: {
    title: 'Form not found',
    description: 'Check the link you were given, or contact the person who shared it.',
  },
  generic: {
    title: 'This form is not currently accepting responses.',
    description: 'If you believe this is an error, please contact the form owner.',
  },
};

/** What the respondent is told when the form stops accepting answers while they are filling it in. Answers are kept. */
export const MID_FILL_COPY: Record<FormUnavailableReason | 'gone', string> = {
  closed: 'This form was closed while you were filling it in, so your response could not be sent. Your answers are still on this page.',
  closeDate: "This form's closing date passed while you were filling it in, so your response could not be sent. Your answers are still on this page.",
  limit: 'This form reached its response limit while you were filling it in, so your response could not be sent. Your answers are still on this page.',
  gone: 'This form is no longer available, so your response could not be sent. Your answers are still on this page.',
};
