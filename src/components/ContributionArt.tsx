import { motion, useInView } from 'motion/react';
import { useContext, useRef } from 'react';
import { EditorialMotionContext } from './EditorialMotion';
import { useMotionPreference } from '../lib/useMotionPreference';

export default function ContributionArt({ category }: { category: string }) {
  const active = useContext(EditorialMotionContext),
    reduced = useMotionPreference();
  const ref = useRef<SVGSVGElement>(null);
  const visible = useInView(ref);
  return (
    <svg
      ref={ref}
      className={`contribution-art art-${category.toLowerCase()}`}
      viewBox="0 0 320 170"
      aria-hidden="true"
    >
      <defs>
        <pattern id={`art-dots-${category}`} width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".7" fill="currentColor" opacity=".17" />
        </pattern>
      </defs>
      <rect width="320" height="170" fill={`url(#art-dots-${category})`} />
      {category === 'Content' ? (
        <g fill="none" stroke="currentColor">
          <path d="M74 142 V25 H214 L247 58 V142 Z" opacity=".3" />
          <path d="M214 25 V58 H247 M93 110 H150 M93 123 H133" opacity=".35" />
          <motion.path
            d="m138 109 18-51 66-22-20 67-51 19 Z M140 110 198 52 M159 103 H174 V86"
            strokeWidth="1.2"
            initial={active && !reduced ? { pathLength: 0 } : false}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4 }}
          />
          <circle cx="166" cy="91" r="3" />
        </g>
      ) : category === 'Community' ? (
        <g fill="none" stroke="currentColor">
          <path d="M96 144 V74 A64 64 0 0 1 128 20 A64 64 0 0 1 192 74 V144" opacity=".38" />
          <path d="M119 144 V74 Q145 25 172 74 V144" />
          <path d="M68 144 H243 M191 74 H226 V144" opacity=".4" />
          <circle cx="158" cy="108" r="15" strokeDasharray="1 5" />
          <motion.circle
            cx="158"
            cy="108"
            r="29"
            animate={
              active && !reduced && visible
                ? { opacity: [0.2, 0.7, 0.2], scale: [1, 1.07, 1] }
                : { opacity: 0.5, scale: 1 }
            }
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <path d="m152 108 5 5 10-11" />
        </g>
      ) : (
        <g fill="none" stroke="currentColor">
          <rect x="70" y="27" width="178" height="117" rx="4" opacity=".3" />
          <path d="M70 49 H248 M88 39 H91 M98 39 H101 M108 39 H111" opacity=".4" />
          <circle cx="159" cy="93" r="28" strokeDasharray="3 5" opacity=".4" />
          <path d="M147 79 Q159 68 171 79 V105 Q159 118 147 105 Z M141 88 H132 M178 88 H187 M141 101 H132 M178 101 H187 M150 73 143 65 M168 73 175 65 M159 80 V109" />
          <motion.path
            d="m214 107 8 8 16-19"
            strokeWidth="1.4"
            initial={active && !reduced ? { pathLength: 0 } : false}
            whileInView={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
          />
        </g>
      )}
    </svg>
  );
}
