// Guest-funnel events. The app has no product-analytics sink yet, so events are published on `window`
// ('beginso:funnel') for whatever sink gets wired later; nothing leaves the browser from here.
export type FunnelEvent =
  | 'guest_start'
  | 'guest_template_chosen'
  | 'guest_look_chosen'
  | 'guest_gate_shown'
  | 'guest_signed_up'
  | 'guest_claim_done'
  | 'guest_claim_failed';

export function trackFunnel(event: FunnelEvent, props: Record<string, unknown> = {}) {
  try {
    window.dispatchEvent(new CustomEvent('beginso:funnel', { detail: { event, ...props } }));
  } catch {
    /* analytics must never break the flow */
  }
}
