/**
 * A 39-question film-submission response, shaped like the live form behind the "Submitted response" card: answers keyed by
 * question label, one URL question set to "Top of response", two Drive links, a long synopsis, three unanswered questions.
 * Every name, email, phone number and link is invented.
 */
import { buildAnswerItems, type AnswerItem } from '@/lib/responseAnswers';
import type { FormField } from '@/types/form';
import type { ResponseAnswers } from '@/types/response';

const LONG_SYNOPSIS = Array.from({ length: 12 }, (_, i) => `Line ${i + 1} of the synopsis, written the way a real submission runs on.`).join('\n');

const spec: [label: string, type: string, answer: string | null, extra?: Record<string, unknown>][] = [
  ['Email address', 'email', 'asha.rao@example.com'],
  ['Categories', 'dropdown', 'Shortfilm'],
  ['Content Title', 'short_text', 'Night Train'],
  ['Name of Director', 'short_text', 'Asha Rao'],
  ['Name of Producers', 'short_text', 'Meera Nair And Asha Rao'],
  ['Year of Production', 'number', '2026'],
  ['Language', 'short_text', 'Gujarati'],
  ['Genre', 'dropdown', 'Drama'],
  ['Is there any drug abuse/smoking or alcohol consumption ?', 'multiple_choice', 'No'],
  ['Does your film have subtitles ?', 'multiple_choice', 'Yes'],
  ['PROVIDE ACTORS NAME', 'long_text', 'CAST\nRiya Patel, Kabir Shah, Neha Iyer, Dev Anand Rao'],
  ['Is this an adult / erotic content', 'multiple_choice', 'No'],
  ['Is there any violence or Animal abuse in the film', 'multiple_choice', 'No'],
  ['Accolades/Awards won (if any)', 'short_text', 'No'],
  ['Is this film is censored ?', 'multiple_choice', 'No'],
  ['Do you have a clean copy of the trailer and the film (Without any watermark or logo on the frame) ?', 'multiple_choice', 'Yes'],
  ['Trailer Link (Required.)', 'url', 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=drivesdk'],
  ['Provide your full Length video link', 'url', 'https://drive.google.com/file/d/16-ZyXwVuTsRqPoNm/view?usp=drivesdk'],
  ['Full film Password (if any)', 'short_text', 'No'],
  ['Production house name', 'short_text', 'Blue Door Films'],
  ['Your name', 'short_text', 'Asha Rao'],
  ['Contact No.', 'phone', '9800000001'],
  ['Address', 'address', 'Flat 4, Lake View Road\nPune\nMaharashtra India'],
  ['Duration of your film (Minutes)', 'number', '15'],
  ['Status of the Film', 'dropdown', 'Unreleased'],
  ['Youtube views (if applicable)', 'short_text', 'Unreleased'],
  ['Upload your film poster', 'url', 'https://drive.google.com/open?id=1PoStErImAgE', { urlPreviewPosition: 'top' }],
  ['One line synopsis (under 160 characters) for your film.', 'short_text', 'The film questions the mindset of "It is not my problem"'],
  ['SYNOPSIS - in detail', 'long_text', LONG_SYNOPSIS],
  ['Specified keyword for your film. (separate comma)', 'short_text', '#shortfilm #gujarati'],
  ['Can we publish your film on other OTT platforms and channels?', 'multiple_choice', 'Yes'],
  ['Is your content already available on any other platform?', 'multiple_choice', 'No'],
  ['INSTAGRAM - your social media page link', 'url', 'https://www.instagram.com/asha.rao.films'],
  ['FACEBOOK - your social media page link', 'url', 'https://www.facebook.com/asha.rao.films'],
  ['Twitter - your social media page link', 'url', null],
  ['How did you know about us ?', 'dropdown', 'Google'],
  ['If any queries', 'long_text', 'I want to release this short film on big platforms.'],
  ['STATUS', 'short_text', null],
  ['KC COMMENTS', 'long_text', null],
];

export const SUBMITTED_FIELDS: FormField[] = spec.map(
  ([label, type, , extra], i) => ({ fieldId: `f${i + 1}`, pageId: 'p1', label, type, order: i, required: false, options: [], ...extra }) as unknown as FormField
);

export const SUBMITTED_ANSWERS: ResponseAnswers = Object.fromEntries(spec.filter(([, , answer]) => answer !== null).map(([label, , answer]) => [label, answer]));

export const SUBMITTED_PAGES = [{ id: 'p1', order: 0, title: 'Page 1' }];

export const TOTAL_QUESTIONS = spec.length;
export const UNANSWERED = spec.filter(([, , answer]) => answer === null).length;

export function submittedItems(answers: ResponseAnswers = SUBMITTED_ANSWERS, fields: FormField[] = SUBMITTED_FIELDS): AnswerItem[] {
  return buildAnswerItems(answers, [], fields, SUBMITTED_PAGES as never);
}
