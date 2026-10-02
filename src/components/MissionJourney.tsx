import { useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import {
  ArrowRightIcon,
  CheckIcon,
  FeatherIcon,
  LinkIcon,
  ShieldCheckIcon,
} from '@phosphor-icons/react';
import { useMotionPreference } from '../lib/useMotionPreference';

const steps = [
  {
    title: 'Choose your mission',
    copy: 'Keepers set the brief. Find a mission that fits your skills and know what a good contribution looks like.',
    label: 'A clear starting point',
    status: 'Ready to contribute',
    detail: 'An original guide, a useful idea, a better experience.',
    icon: FeatherIcon,
  },
  {
    title: 'Share the evidence',
    copy: 'Add a public link and explain your work. Your contribution gets a record you can follow.',
    label: 'Your work, made visible',
    status: 'Evidence received',
    detail: 'A public link. Your description. The mission requirements.',
    icon: LinkIcon,
  },
  {
    title: 'Follow the decision',
    copy: 'Read the review and its reasons. Approved contributions earn points and become part of your journey.',
    label: 'Recognition with a reason',
    status: 'Contribution approved',
    detail: 'The evidence meets the requirements. The decision is recorded.',
    icon: ShieldCheckIcon,
  },
];

export default function MissionJourney({ active }: { active: boolean }) {
  const [selected, setSelected] = useState(0);
  const reduced = useMotionPreference();
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref);
  const moving = active && !reduced && visible;
  const step = steps[selected];
  return (
    <div ref={ref} className="mission-journey" data-stage={selected}>
      <div className="journey-controls" role="group" aria-label="Explore the contribution journey">
        {steps.map((item, i) => (
          <button
            key={item.title}
            className={`journey-choice ${selected === i ? 'selected' : ''}`}
            aria-pressed={selected === i}
            aria-controls="journey-illustration"
            onClick={() => setSelected(i)}
          >
            <span className="journey-number">0{i + 1}</span>
            <span>
              <strong>{item.title}</strong>
              <span>{item.copy}</span>
            </span>
            <ArrowRightIcon size={20} />
          </button>
        ))}
      </div>
      <div className="journey-illustration" id="journey-illustration">
        <span className="journey-phase-number" aria-hidden="true">
          0{selected + 1}
        </span>
        <span className="diagram-eyebrow">THE CONTRIBUTION RECORD</span>
        <svg className="proof-network" viewBox="0 0 600 540" aria-hidden="true">
          <defs>
            <pattern id="proof-dots" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.7" fill="var(--proof-light)" opacity=".24" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="600" height="540" fill="url(#proof-dots)" />
          <g fill="none" stroke="var(--proof-faint)" strokeWidth="1">
            <path d="M110 120 L485 155 L455 430 L105 405 Z" />
            <path d="M110 120 L455 430 M485 155 L105 405 M300 42 L300 495" />
            <path d="M110 120 L300 42 L485 155 M105 405 L300 495 L455 430" />
            <ellipse cx="300" cy="270" rx="230" ry="190" />
            <ellipse cx="300" cy="270" rx="265" ry="222" strokeDasharray="2 9" />
          </g>
          <motion.circle
            cx="300"
            cy="270"
            r="220"
            fill="none"
            stroke="var(--proof-line)"
            strokeWidth="1"
            strokeDasharray="55 1327"
            animate={moving ? { rotate: 360 } : { rotate: 0 }}
            style={{ transformOrigin: '300px 270px' }}
            transition={
              moving ? { duration: 32, repeat: Infinity, ease: 'linear' } : { duration: 0 }
            }
          />
          <motion.path
            d={
              selected === 0
                ? 'M110 120 L300 42 L485 155'
                : selected === 1
                  ? 'M485 155 L455 430 L300 495'
                  : 'M300 495 L105 405 L110 120'
            }
            fill="none"
            stroke="var(--proof-light)"
            strokeWidth="1.5"
            initial={active && !reduced ? { pathLength: 0, opacity: 0.4 } : false}
            animate={{ pathLength: 1, opacity: 1 }}
            key={selected}
            transition={{ duration: reduced || !active ? 0 : 0.9 }}
          />
          {[
            [110, 120],
            [485, 155],
            [105, 405],
          ].map(([cx, cy], i) => (
            <g key={i}>
              <circle
                cx={cx}
                cy={cy}
                r="18"
                fill="var(--proof-ink)"
                stroke={selected === i ? 'var(--proof-light)' : 'var(--proof-line)'}
              />
              <circle
                cx={cx}
                cy={cy}
                r={selected === i ? 5 : 3}
                fill={selected === i ? 'var(--proof-light)' : 'var(--proof-muted)'}
              />
            </g>
          ))}
          <g fill="var(--proof-muted)">
            {[
              [300, 42],
              [455, 430],
              [300, 495],
            ].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="3" />
            ))}
          </g>
        </svg>
        <motion.div
          className="ledger-device"
          style={{ x: '-50%', y: '-50%' }}
          animate={{
            rotate: reduced || !active ? 0 : selected === 0 ? -4 : selected === 1 ? 3 : -2,
          }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="ledger-device-top">
            <span>THE ORDER</span>
            <span>MISSION / 001</span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={selected}
              className="ledger-stage"
              aria-live="polite"
              aria-atomic="true"
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <span className="ledger-icon">
                <step.icon size={26} />
              </span>
              <p>{step.label}</p>
              <h3>{step.status}</h3>
              <span className="ledger-rule" />
              <p className="ledger-detail">{step.detail}</p>
              <div className={`ledger-status ${selected === 2 ? 'approved' : ''}`}>
                {selected === 2 ? <CheckIcon size={15} /> : <span className="status-dot" />}
                {selected === 2
                  ? 'Points added after approval'
                  : selected === 1
                    ? 'Awaiting a review'
                    : 'Requirements before rewards'}
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="ledger-device-bottom">
            <span>Your contribution journey</span>
            <span>0{selected + 1} / 03</span>
          </div>
        </motion.div>
        <motion.div
          className="evidence-slip"
          aria-hidden="true"
          animate={{
            rotate: reduced || !active ? 0 : selected === 1 ? -7 : 5,
            y: reduced || !active ? 0 : selected === 1 ? 8 : 0,
          }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <span>
            {selected === 0 ? 'THE BRIEF' : selected === 1 ? 'THE EVIDENCE' : 'THE DECISION'}
          </span>
          <span className="slip-rule" />
          <strong>
            {selected === 0
              ? 'An original idea.'
              : selected === 1
                ? 'Your work, linked.'
                : 'A reason, recorded.'}
          </strong>
          <span className="slip-line" />
          <span className="slip-line short" />
          <span className="slip-foot">CONTRIBUTION RECORD / 001</span>
        </motion.div>
        <span className="diagram-label label-keepers">KEEPERS / THE BRIEF</span>
        <span className="diagram-label label-member">YOU / THE CONTRIBUTION</span>
        <span className="diagram-label label-review">REVIEW / THE DECISION</span>
      </div>
    </div>
  );
}
