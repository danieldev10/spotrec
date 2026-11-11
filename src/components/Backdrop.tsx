import type { CSSProperties } from "react";

// Faint music notes that bob slowly around the edges of the screen. Positions
// are percentages of the viewport and keep clear of the centre, where the
// prompt box sits.
const NOTES = [
  { top: "13%", left: "9%", size: 30, tilt: -14, seconds: 9, delay: 0, pair: true },
  { top: "24%", left: "80%", size: 22, tilt: 10, seconds: 11, delay: -3, pair: false },
  { top: "44%", left: "4%", size: 18, tilt: 8, seconds: 8, delay: -5, pair: false },
  { top: "58%", left: "88%", size: 28, tilt: -8, seconds: 12, delay: -2, pair: true },
  { top: "78%", left: "14%", size: 24, tilt: 12, seconds: 10, delay: -6, pair: false },
  { top: "86%", left: "70%", size: 20, tilt: -10, seconds: 9, delay: -4, pair: true },
];

/** Decorative background: two slow-moving glows and a few floating notes. */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="backdrop-glow backdrop-glow-a" />
      <div className="backdrop-glow backdrop-glow-b" />
      {NOTES.map((note, index) => (
        <svg
          key={index}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="backdrop-note absolute text-accent"
          style={
            {
              top: note.top,
              left: note.left,
              width: note.size,
              height: note.size,
              "--tilt": `${note.tilt}deg`,
              animationDuration: `${note.seconds}s`,
              animationDelay: `${note.delay}s`,
            } as CSSProperties
          }
        >
          {note.pair ? (
            <>
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </>
          ) : (
            <>
              <circle cx="8" cy="18" r="4" />
              <path d="M12 18V2l7 4" />
            </>
          )}
        </svg>
      ))}
    </div>
  );
}
