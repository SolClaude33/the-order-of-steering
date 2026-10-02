import { createContext, useContext, useRef } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'motion/react';
import { useMotionPreference } from '../lib/useMotionPreference';

export const EditorialMotionContext = createContext(true);

export function EditorialHeading({
  lines,
  level = 2,
  className = '',
  id,
}: {
  lines: { text: string; italic?: boolean }[];
  level?: 1 | 2;
  className?: string;
  id?: string;
}) {
  const active = useContext(EditorialMotionContext);
  const reduced = useMotionPreference();
  const ref = useRef<HTMLHeadingElement>(null);
  const visible = useInView(ref, { once: true, amount: 0.15 });
  const Tag = level === 1 ? 'h1' : 'h2';
  return (
    <Tag
      ref={ref}
      id={id}
      className={`editorial-heading ${className}`}
      aria-label={lines.map((line) => line.text).join(' ')}
    >
      {lines.map((line, i) => (
        <span className="line-mask" key={line.text} aria-hidden="true">
          <motion.span
            className="line-content"
            initial={active && !reduced ? { y: '108%', rotate: 2 } : false}
            animate={visible || !active || reduced ? { y: '0%', rotate: 0 } : undefined}
            transition={{
              duration: active && !reduced ? 1.05 : 0,
              delay: active && !reduced ? i * 0.1 : 0,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {line.italic ? <em>{line.text}</em> : line.text}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

export function TiltSurface({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const active = useContext(EditorialMotionContext);
  const reduced = useMotionPreference();
  const rx = useMotionValue(0),
    ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 100, damping: 22 }),
    rotateY = useSpring(ry, { stiffness: 100, damping: 22 });
  function move(event: PointerEvent<HTMLDivElement>) {
    if (!active || reduced || event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width,
      y = (event.clientY - rect.top) / rect.height;
    rx.set((0.5 - y) * 5);
    ry.set((x - 0.5) * 6);
    event.currentTarget.style.setProperty('--pointer-x', `${x * 100}%`);
    event.currentTarget.style.setProperty('--pointer-y', `${y * 100}%`);
  }
  return (
    <motion.div
      className={`tilt-surface ${className}`}
      onPointerMove={move}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      style={
        active && !reduced
          ? { rotateX, rotateY, transformPerspective: 1100 }
          : { rotateX: 0, rotateY: 0 }
      }
    >
      {children}
      <span className="surface-sheen" aria-hidden="true" />
    </motion.div>
  );
}
