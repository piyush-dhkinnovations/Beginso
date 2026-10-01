import type { ReactNode } from 'react';
import {
  Briefcase,
  CalendarCheck,
  ClipboardCheck,
  CreditCard,
  FileText,
  GraduationCap,
  Lightbulb,
  LifeBuoy,
  Mail,
  MessageSquare,
  Phone,
  ShoppingCart,
  Star,
  Users,
} from 'lucide-react';

// A form's icon and colour come from its title, so a list of forms is scannable at a glance and the
// same form looks the same everywhere. Colours are semantic tokens mixed into the card surface, so
// they follow every theme. Unknown titles get the generic icon and a stable colour from a hash of
// the title (never random per render).

export type FormTone = 'primary' | 'success' | 'info' | 'warning' | 'error' | 'secondary';

const TONE_VAR: Record<FormTone, string> = {
  primary: 'var(--action-primary)',
  success: 'var(--success)',
  info: 'var(--info)',
  warning: 'var(--warning)',
  error: 'var(--error)',
  secondary: 'var(--secondary-500)',
};

const TONES: FormTone[] = ['primary', 'success', 'secondary', 'warning', 'error', 'info'];

interface Rule {
  match: RegExp;
  icon: ReactNode;
  tone: FormTone;
}

const RULES: Rule[] = [
  { match: /feedback|survey|review|rating|nps/i, icon: <Star />, tone: 'success' },
  { match: /event|registration|rsvp|webinar|conference/i, icon: <CalendarCheck />, tone: 'secondary' },
  { match: /job|application|hiring|career|recruit|resume|hr\b/i, icon: <Briefcase />, tone: 'warning' },
  { match: /order|product|shop|purchase|sales|cart|store/i, icon: <ShoppingCart />, tone: 'error' },
  { match: /contact|enquiry|inquiry|reach/i, icon: <Phone />, tone: 'info' },
  { match: /pitch|plan|proposal|business|idea|strategy/i, icon: <Lightbulb />, tone: 'primary' },
  { match: /quiz|test|exam|assessment|score/i, icon: <ClipboardCheck />, tone: 'secondary' },
  { match: /payment|invoice|billing|donation|fee/i, icon: <CreditCard />, tone: 'success' },
  { match: /student|course|school|class|learn|training/i, icon: <GraduationCap />, tone: 'info' },
  { match: /booking|appointment|schedule|reservation/i, icon: <CalendarCheck />, tone: 'primary' },
  { match: /newsletter|subscribe|signup|sign-up|mailing/i, icon: <Mail />, tone: 'warning' },
  { match: /support|ticket|help|issue|bug|request/i, icon: <LifeBuoy />, tone: 'error' },
  { match: /team|member|volunteer|join|community/i, icon: <Users />, tone: 'info' },
  { match: /comment|message|chat|opinion/i, icon: <MessageSquare />, tone: 'primary' },
];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

export interface FormVisual {
  icon: ReactNode;
  tone: FormTone;
  /** Soft tile background — the tone mixed into the card surface. */
  surface: string;
  /** Icon / accent colour. */
  ink: string;
}

export function formVisual(title: string): FormVisual {
  const rule = RULES.find((r) => r.match.test(title));
  const tone = rule?.tone ?? TONES[hash(title.trim().toLowerCase()) % TONES.length];
  const ink = TONE_VAR[tone];
  return {
    icon: rule?.icon ?? <FileText />,
    tone,
    surface: `color-mix(in srgb, ${ink} 14%, var(--surface-card))`,
    ink,
  };
}
