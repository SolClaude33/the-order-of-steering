import { useContext, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { AnimatePresence, motion, useInView, useScroll, useTransform } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowUpRightIcon, BugIcon, FeatherIcon, UsersThreeIcon } from '@phosphor-icons/react';
import { EditorialMotionContext } from './EditorialMotion';
import ContributionArt from './ContributionArt';
import { useMotionPreference } from '../lib/useMotionPreference';

export function AtlasReveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const active = useContext(EditorialMotionContext),
    reduced = useMotionPreference();
  return (
    <motion.div
      className={className}
      initial={active && !reduced ? { opacity: 0, y: 28 } : false}
      animate={!active || reduced ? { opacity: 1, y: 0 } : undefined}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{
        duration: active && !reduced ? 0.8 : 0,
        delay: active && !reduced ? delay : 0,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

/** An original ornamental diagram, not an emblem attributed to Snowmoon. */
export function OrderOrbit({ className = '' }: { className?: string }) {
  const active = useContext(EditorialMotionContext),
    reduced = useMotionPreference();
  const ref = useRef<SVGSVGElement>(null),
    visible = useInView(ref);
  const moving = active && !reduced && visible;
  return (
    <svg ref={ref} className={`atlas-orbit ${className}`} viewBox="0 0 300 300" aria-hidden="true">
      <circle cx="150" cy="150" r="139" fill="none" stroke="currentColor" strokeWidth=".6" />
      <circle
        cx="150"
        cy="150"
        r="123"
        fill="none"
        stroke="currentColor"
        strokeWidth=".4"
        strokeDasharray="1 7"
      />
      <motion.g
        animate={{ rotate: moving ? 360 : 0 }}
        style={{ transformOrigin: '150px 150px' }}
        transition={moving ? { duration: 100, ease: 'linear', repeat: Infinity } : { duration: 0 }}
      >
        {Array.from({ length: 24 }, (_, i) => (
          <path
            key={i}
            d="M150 40 C173 74 169 110 150 150 C131 110 127 74 150 40"
            fill="none"
            stroke="currentColor"
            strokeWidth=".45"
            transform={`rotate(${i * 15} 150 150)`}
          />
        ))}
      </motion.g>
      <circle cx="150" cy="150" r="10" fill="none" stroke="currentColor" strokeWidth=".7" />
      <circle cx="150" cy="150" r="2" fill="currentColor" />
    </svg>
  );
}

export function AtlasManifesto() {
  const ref = useRef<HTMLElement>(null);
  const active = useContext(EditorialMotionContext),
    reduced = useMotionPreference();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start .9', 'center .4'] });
  const reveal = useTransform(scrollYProgress, [0, 1], ['inset(0 100% 0 0)', 'inset(0 0% 0 0)']);
  return (
    <section className="atlas-manifesto" ref={ref} aria-labelledby="manifesto-title">
      <div className="atlas-shell atlas-manifesto-grid">
        <div className="atlas-margin">
          <span className="atlas-kicker">01 / OUR REASON TO EXIST</span>
          <OrderOrbit />
          <span>
            A shared direction.
            <br />A place to begin.
          </span>
        </div>
        <div>
          <h2 id="manifesto-title">
            <span className="atlas-manifesto-line">
              Good ideas deserve
              <motion.span
                aria-hidden="true"
                style={{ clipPath: active && !reduced ? reveal : 'none' }}
              >
                Good ideas deserve
              </motion.span>
            </span>
            <em>more than a moment.</em>
          </h2>
          <div className="atlas-manifesto-bottom">
            <p>
              They deserve people who will carry them forward. The Order turns your perspective into
              a mission, and your contribution into a record that matters.
            </p>
            <Link to="/#possibilities" className="atlas-text-link">
              Find your place <ArrowUpRightIcon size={20} />
            </Link>
          </div>
        </div>
      </div>
      <div className="atlas-value-strip" aria-label="Our approach">
        <span>Independent minds</span>
        <i aria-hidden="true">✳</i>
        <span>Shared purpose</span>
        <i aria-hidden="true">✳</i>
        <span>Visible contributions</span>
        <i aria-hidden="true">✳</i>
        <span>A lasting record</span>
      </div>
    </section>
  );
}

const paths = [
  {
    category: 'Content' as const,
    title: 'Tell the story.',
    copy: 'An original guide. A new perspective. An idea in your own words.',
    headline: 'Give an idea a voice.',
    icon: FeatherIcon,
    image: 'fabric',
    alt: '',
  },
  {
    category: 'Community' as const,
    title: 'Open the door.',
    copy: 'Welcome someone new. Share what you know. Build a connection.',
    headline: 'Make room for others.',
    icon: UsersThreeIcon,
    image: 'conversation',
    alt: 'Two fictional members in purple robes sharing ideas in a stone garden',
  },
  {
    category: 'Testing' as const,
    title: 'Make it better.',
    copy: 'Notice what could work better. Turn a fresh observation into progress.',
    headline: 'Move an idea forward.',
    icon: BugIcon,
    image: 'open-chamber',
    alt: '',
  },
];

export function ContributionPaths() {
  const [selected, setSelected] = useState(0);
  const active = useContext(EditorialMotionContext),
    reduced = useMotionPreference();
  const item = paths[selected];
  function keyNav(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % paths.length;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft')
      next = (index + paths.length - 1) % paths.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = paths.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    document.getElementById(`atlas-tab-${paths[next].category}`)?.focus();
  }
  return (
    <div className="atlas-paths">
      <div
        className="atlas-path-tabs"
        role="tablist"
        aria-label="Choose your contribution"
        aria-orientation="vertical"
      >
        {paths.map((path, i) => (
          <button
            key={path.category}
            role="tab"
            id={`atlas-tab-${path.category}`}
            aria-controls={`atlas-panel-${path.category}`}
            aria-selected={selected === i}
            tabIndex={selected === i ? 0 : -1}
            onClick={() => setSelected(i)}
            onKeyDown={(e) => keyNav(e, i)}
          >
            <span className="atlas-path-index">0{i + 1}</span>
            <span>
              <span className="atlas-path-category">{path.category}</span>
              <strong>{path.title}</strong>
              <span className="atlas-path-copy">{path.copy}</span>
            </span>
            <ArrowUpRightIcon size={26} />
          </button>
        ))}
      </div>
      <div
        className="atlas-path-panel"
        role="tabpanel"
        tabIndex={0}
        id={`atlas-panel-${item.category}`}
        aria-labelledby={`atlas-tab-${item.category}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={item.category}
            className={`atlas-path-art atlas-art-${item.category.toLowerCase()}`}
            initial={active && !reduced ? { opacity: 0, scale: 1.035 } : false}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: active && !reduced ? 0.35 : 0 }}
          >
            <picture>
              <source
                media="(max-width: 767px)"
                srcSet={`/assets/environments/order-${item.image}-mobile-${item.image === 'open-chamber' ? 'v02' : 'v01'}.webp`}
              />
              <img
                src={`/assets/environments/order-${item.image}-desktop-${item.image === 'open-chamber' ? 'v02' : 'v01'}.webp`}
                alt={item.alt}
                width="1600"
                height="905"
                loading="lazy"
              />
            </picture>
            <div className="atlas-path-image-shade" />
            <span className="atlas-path-edition">THE ORDER / {item.category.toUpperCase()}</span>
            <ContributionArt category={item.category} />
            <div className="atlas-path-caption">
              <item.icon size={22} />
              <h3>{item.headline}</h3>
              <span>Every contribution starts somewhere.</span>
            </div>
          </motion.div>
        </AnimatePresence>
        <Link
          to={item.category === 'Testing' ? '/app' : `/app?category=${item.category}`}
          className="atlas-path-action"
        >
          {item.category === 'Testing'
            ? 'Explore missions'
            : `Explore ${item.category.toLowerCase()} missions`}{' '}
          <ArrowUpRightIcon size={22} />
        </Link>
      </div>
    </div>
  );
}
