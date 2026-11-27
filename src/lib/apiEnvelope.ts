// One implementation shared by the services that unwrap a response envelope, instead of a copy in each.
export function unwrapEnvelope<T>(raw: unknown, namedKey: string): T {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj[namedKey] !== 'undefined') return obj[namedKey] as T;
  }
  return raw as T;
}
