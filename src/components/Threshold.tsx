import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { useMotionPreference } from '../lib/useMotionPreference';

/** An original visual interpretation of the book's everyday authentication light. */
export default function Threshold({ active }: { active: boolean }) {
  const reduced = useMotionPreference();
  const ref = useRef<SVGSVGElement>(null);
  const visible = useInView(ref, { amount: 0.1 });
  const moving = active && !reduced && visible;
  return (
    <svg ref={ref} className="threshold-art" viewBox="0 0 700 650" aria-hidden="true">
      <defs>
        <radialGradient id="threshold-halo">
          <stop stopColor="#8abfaa" stopOpacity=".18" />
          <stop offset="1" stopColor="#8abfaa" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="445" cy="320" r="290" fill="url(#threshold-halo)" />
      <g fill="none" stroke="#7ba9903b">
        <circle cx="445" cy="320" r="238" />
        <circle cx="445" cy="320" r="205" strokeDasharray="1 8" />
        <circle cx="445" cy="320" r="280" strokeDasharray="3 15" />
        <path d="M445 40 V600 M165 320 H700" />
      </g>
      <motion.circle
        cx="445"
        cy="320"
        r="238"
        fill="none"
        stroke="#b5d7c3"
        strokeWidth="1"
        strokeDasharray="100 1396"
        animate={moving ? { rotate: 360 } : { rotate: 0 }}
        transition={moving ? { duration: 45, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
        style={{ transformOrigin: '445px 320px' }}
      />
      <g stroke="#b5d7c3" fill="#17271f">
        <circle cx="445" cy="82" r="6" />
        <circle cx="207" cy="320" r="6" />
        <circle cx="445" cy="558" r="6" />
      </g>
      <g fill="none" stroke="#b5d7c3" strokeWidth="2">
        <rect x="416" y="282" width="58" height="76" rx="13" />
        <path d="M435 256 H455 V282 H435 Z M435 358 H455 V384 H435 Z" />
        <circle cx="445" cy="320" r="13" strokeWidth="1" />
        <path d="m438 320 5 5 9-10" />
      </g>
    </svg>
  );
}
