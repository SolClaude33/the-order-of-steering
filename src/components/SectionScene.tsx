import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import type { ReactNode } from 'react';
import { useMotionPreference } from '../lib/useMotionPreference';

type SceneImage = 'fabric' | 'courtyard';

/** Purpose-made imagery: textile identity and the city's living public spaces. */
export default function SectionScene({
  image,
  className,
  id,
  active,
  children,
}: {
  image: SceneImage;
  className: string;
  id?: string;
  active: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useMotionPreference();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [-55, 55]);
  return (
    <section ref={ref} className={`section-scene ${className}`} id={id}>
      <motion.div
        className="section-backdrop"
        aria-hidden="true"
        style={{ y: active && !reduced ? y : 0 }}
      >
        <picture>
          <source
            media="(max-width: 767px)"
            srcSet={`/assets/environments/order-${image}-mobile-v01.webp`}
          />
          <img
            src={`/assets/environments/order-${image}-desktop-v01.webp`}
            alt=""
            loading="lazy"
            decoding="async"
            width="2000"
            height="1131"
          />
        </picture>
      </motion.div>
      <div className="scene-shade" aria-hidden="true" />
      <div className="scene-grain film-grain" aria-hidden="true" />
      {children}
    </section>
  );
}
