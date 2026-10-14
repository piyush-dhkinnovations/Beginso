// A template (unlike a layout) is mounted again on every navigation between the auth screens, so its CSS animation replays: going
// from Log in to Sign up (or to Forgot password and back) rises the new screen in piece by piece instead of swapping it instantly.
// The wordmark and the brand panel live in layout.tsx and stay put, so only the form area moves. The global reduced-motion rule
// switches the animation off for people who ask for that.
export default function AuthTemplate({ children }: { children: React.ReactNode }) {
  return <div className="auth-enter flex flex-col gap-6">{children}</div>;
}
