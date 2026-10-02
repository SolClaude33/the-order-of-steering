import { useContext, useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowUpRightIcon } from '@phosphor-icons/react';
import { EditorialMotionContext } from './EditorialMotion';
import { useMotionPreference } from '../lib/useMotionPreference';

export default function SharedDirection() {
  const ref = useRef<HTMLElement>(null);
  const active = useContext(EditorialMotionContext),
    reduced = useMotionPreference();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const pathLength = useTransform(scrollYProgress, [0, 0.9], [0.05, 1]);
  const x = useTransform(scrollYProgress, [0, 1], [35, -35]);
  const firstColor = useTransform(scrollYProgress, [0, 0.25], ['#778471', '#293c31']);
  const secondColor = useTransform(scrollYProgress, [0.15, 0.6], ['#778471', '#293c31']);
  return (
    <section className={`shared-direction ${reduced ? 'direction-static' : ''}`} ref={ref}>
      <div className="shared-sticky">
        <div className="section-shell shared-layout">
          <div className="shared-marginalia">
            <span>THE WORLD OF SNOWMOON</span>
            <span>
              STONE. NATURE.
              <br />
              PEOPLE. POSSIBILITY.
            </span>
          </div>
          <div className="shared-main">
            <p className="chapter-label">A FICTIONAL WORLD. A REAL INVITATION.</p>
            <h2 aria-label="A world shaped by what we do.">
              <motion.span style={{ color: active && !reduced ? firstColor : '#293c31' }}>
                A world shaped
              </motion.span>
              <br />
              <motion.em style={{ color: active && !reduced ? secondColor : '#293c31' }}>
                by what we do.
              </motion.em>
            </h2>
            <p>
              Ideas need people. People need a place to begin.
              <br />
              The Order is our invitation to contribute.
            </p>
            <a
              className="text-link"
              href="https://vitalik.eth.limo/snowmoon/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Explore the world that inspired us
              <ArrowUpRightIcon size={17} />
              <span className="sr-only"> (new tab)</span>
            </a>
          </div>
          <motion.svg
            className="direction-thread"
            viewBox="0 0 900 320"
            aria-hidden="true"
            style={{ x: active && !reduced ? x : 0 }}
          >
            <path
              d="M0 260 C200 310 220 30 400 60 S640 300 770 130 S850 40 900 50"
              fill="none"
              stroke="#55705225"
              strokeWidth="1"
            />
            <motion.path
              d="M0 260 C200 310 220 30 400 60 S640 300 770 130 S850 40 900 50"
              fill="none"
              stroke="#557052"
              strokeWidth="1"
              style={{ pathLength: active && !reduced ? pathLength : 1 }}
            />
            <circle cx="400" cy="60" r="25" fill="#e9e7df" stroke="#55705280" />
            <circle cx="400" cy="60" r="5" fill="#557052" />
            <circle cx="770" cy="130" r="4" fill="#557052" />
          </motion.svg>
          <span className="shared-footnote">
            AN INDEPENDENT INTERPRETATION / THE ORDER OF STEERING
          </span>
        </div>
      </div>
    </section>
  );
}
