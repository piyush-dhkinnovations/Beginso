/** Dial codes for the phone field's country selector: [ISO 3166 alpha-2, name, dial code without the "+"]. */
export const COUNTRY_CODES: ReadonlyArray<readonly [string, string, string]> = [
  ['IN', 'India', '91'], ['US', 'United States', '1'], ['CA', 'Canada', '1'], ['GB', 'United Kingdom', '44'],
  ['AE', 'United Arab Emirates', '971'], ['AU', 'Australia', '61'], ['SG', 'Singapore', '65'], ['DE', 'Germany', '49'],
  ['FR', 'France', '33'], ['AF', 'Afghanistan', '93'], ['AL', 'Albania', '355'], ['DZ', 'Algeria', '213'],
  ['AR', 'Argentina', '54'], ['AM', 'Armenia', '374'], ['AT', 'Austria', '43'], ['AZ', 'Azerbaijan', '994'],
  ['BH', 'Bahrain', '973'], ['BD', 'Bangladesh', '880'], ['BY', 'Belarus', '375'], ['BE', 'Belgium', '32'],
  ['BT', 'Bhutan', '975'], ['BO', 'Bolivia', '591'], ['BR', 'Brazil', '55'], ['BN', 'Brunei', '673'],
  ['BG', 'Bulgaria', '359'], ['KH', 'Cambodia', '855'], ['CL', 'Chile', '56'], ['CN', 'China', '86'],
  ['CO', 'Colombia', '57'], ['CR', 'Costa Rica', '506'], ['HR', 'Croatia', '385'], ['CY', 'Cyprus', '357'],
  ['CZ', 'Czechia', '420'], ['DK', 'Denmark', '45'], ['EC', 'Ecuador', '593'], ['EG', 'Egypt', '20'],
  ['EE', 'Estonia', '372'], ['ET', 'Ethiopia', '251'], ['FI', 'Finland', '358'], ['GE', 'Georgia', '995'],
  ['GH', 'Ghana', '233'], ['GR', 'Greece', '30'], ['HK', 'Hong Kong', '852'], ['HU', 'Hungary', '36'],
  ['IS', 'Iceland', '354'], ['ID', 'Indonesia', '62'], ['IR', 'Iran', '98'], ['IQ', 'Iraq', '964'],
  ['IE', 'Ireland', '353'], ['IL', 'Israel', '972'], ['IT', 'Italy', '39'], ['JM', 'Jamaica', '1876'],
  ['JP', 'Japan', '81'], ['JO', 'Jordan', '962'], ['KZ', 'Kazakhstan', '7'], ['KE', 'Kenya', '254'],
  ['KW', 'Kuwait', '965'], ['LA', 'Laos', '856'], ['LV', 'Latvia', '371'], ['LB', 'Lebanon', '961'],
  ['LT', 'Lithuania', '370'], ['LU', 'Luxembourg', '352'], ['MY', 'Malaysia', '60'], ['MV', 'Maldives', '960'],
  ['MT', 'Malta', '356'], ['MU', 'Mauritius', '230'], ['MX', 'Mexico', '52'], ['MN', 'Mongolia', '976'],
  ['MA', 'Morocco', '212'], ['MM', 'Myanmar', '95'], ['NP', 'Nepal', '977'], ['NL', 'Netherlands', '31'],
  ['NZ', 'New Zealand', '64'], ['NG', 'Nigeria', '234'], ['NO', 'Norway', '47'], ['OM', 'Oman', '968'],
  ['PK', 'Pakistan', '92'], ['PA', 'Panama', '507'], ['PE', 'Peru', '51'], ['PH', 'Philippines', '63'],
  ['PL', 'Poland', '48'], ['PT', 'Portugal', '351'], ['QA', 'Qatar', '974'], ['RO', 'Romania', '40'],
  ['RU', 'Russia', '7'], ['SA', 'Saudi Arabia', '966'], ['RS', 'Serbia', '381'], ['SK', 'Slovakia', '421'],
  ['SI', 'Slovenia', '386'], ['ZA', 'South Africa', '27'], ['KR', 'South Korea', '82'], ['ES', 'Spain', '34'],
  ['LK', 'Sri Lanka', '94'], ['SE', 'Sweden', '46'], ['CH', 'Switzerland', '41'], ['TW', 'Taiwan', '886'],
  ['TZ', 'Tanzania', '255'], ['TH', 'Thailand', '66'], ['TR', 'Türkiye', '90'], ['UG', 'Uganda', '256'],
  ['UA', 'Ukraine', '380'], ['UY', 'Uruguay', '598'], ['UZ', 'Uzbekistan', '998'], ['VE', 'Venezuela', '58'],
  ['VN', 'Vietnam', '84'], ['ZM', 'Zambia', '260'], ['ZW', 'Zimbabwe', '263'],
];

export const DEFAULT_COUNTRY = 'IN';

const dialOf = (iso: string): string => COUNTRY_CODES.find(([code]) => code === iso)?.[2] ?? '91';

// Longest dial code first, so "+1876…" is read as 1876 and not as 1 followed by 876…
const BY_DIAL_LENGTH = [...COUNTRY_CODES].sort((a, b) => b[2].length - a[2].length);

/** "+919876543210" → { country: 'IN', number: '9876543210' }. A value with no "+" is taken as a bare local number. */
export function splitPhone(value: string, fallback: string = DEFAULT_COUNTRY): { country: string; number: string } {
  const trimmed = value.trim();
  if (!trimmed.startsWith('+')) return { country: fallback, number: trimmed };
  const digits = trimmed.slice(1).replace(/\D/g, '');
  const hit = BY_DIAL_LENGTH.find(([, , dial]) => digits.startsWith(dial));
  return hit ? { country: hit[0], number: digits.slice(hit[2].length) } : { country: fallback, number: digits };
}

/** Joins the chosen country and typed digits into E.164-style text ("+919876543210"); no digits → '' (no answer). */
export function joinPhone(country: string, number: string): string {
  const digits = number.replace(/\D/g, '');
  return digits ? `+${dialOf(country)}${digits}` : '';
}
