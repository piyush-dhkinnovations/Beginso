// Live feedback while someone types a confirmation password: nothing until they start, then match or mismatch.
export function passwordMatch(password: string, confirm: string): { success?: string; error?: string } {
  if (!confirm) return {};
  return password === confirm ? { success: 'Passwords match' } : { error: 'Passwords do not match' };
}
