import { suggestFormIcon } from '@/lib/formIcons';

// The colour a form is known by, taken from the icon that suits its name (the one the icon picker starts on). It tints things
// that need a single colour, such as the owner avatar, so a form looks the same everywhere.
export interface FormVisual {
  /** A representative colour of the form's icon. */
  ink: string;
}

export function formVisual(title: string): FormVisual {
  return { ink: suggestFormIcon(title).color };
}
