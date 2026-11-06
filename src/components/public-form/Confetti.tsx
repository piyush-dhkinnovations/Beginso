// A one-off fall of confetti over the thank-you screen, in the form's colour and a few friendly ones. Pure CSS (see .aa-confetti in globals.css): no
// script, nothing to click, and it is not drawn at all for people who ask their device for less motion.

const PIECES = Array.from({ length: 36 }, (_, i) => ({
  left: (i * 53) % 100,
  delay: (i * 137) % 900,
  duration: 2400 + ((i * 211) % 1700),
  size: 6 + ((i * 7) % 7),
  drift: ((i * 29) % 90) - 45,
  turn: 240 + ((i * 47) % 480),
  round: i % 3 === 0,
  shade: i % 5,
}));

export function Confetti({ colour }: { colour: string }) {
  const shades = [colour, `color-mix(in srgb, ${colour} 55%, white)`, '#f59e0b', '#ec4899', '#14b8a6'];
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="aa-confetti absolute top-0"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.round ? p.size : p.size * 1.6,
              borderRadius: p.round ? '9999px' : '2px',
              backgroundColor: shades[p.shade],
              '--delay': `${p.delay}ms`,
              '--dur': `${p.duration}ms`,
              '--dx': `${p.drift}vw`,
              '--turn': `${p.turn}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
