import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react';
import { useMotionPreference } from '../lib/useMotionPreference';

/** Pointer and scroll depth share one atmospheric layer. */
export default function Atmosphere({ active = true }: { active?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useMotionPreference();
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start start', 'end start'],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [1.02, 1.15]);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(useTransform(pointerX, [-1, 1], [14, -14]), { stiffness: 38, damping: 22 });
  const y = useSpring(useTransform(pointerY, [-1, 1], [8, -8]), { stiffness: 38, damping: 22 });
  const sceneY = useTransform(() => y.get() + scrollYProgress.get() * 80);
  useEffect(() => {
    if (reduced || !active) return;
    const parent = container.current!.parentElement!;
    function move(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return;
      const rect = parent.getBoundingClientRect();
      pointerX.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
      pointerY.set(((event.clientY - rect.top) / rect.height) * 2 - 1);
    }
    function leave() {
      pointerX.set(0);
      pointerY.set(0);
    }
    parent.addEventListener('pointermove', move);
    parent.addEventListener('pointerleave', leave);
    return () => {
      parent.removeEventListener('pointermove', move);
      parent.removeEventListener('pointerleave', leave);
    };
  }, [active, reduced, pointerX, pointerY]);
  useEffect(() => {
    if (!active || reduced) return;
    const el = canvas.current!;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    let width = 0,
      height = 0,
      frame = 0,
      running = false,
      visible = true,
      last = 0;
    const motes = Array.from({ length: 42 }, (_, i) => ({
      x: (i * 0.618033) % 1,
      y: (i * 0.414213) % 1,
      r: 0.5 + (i % 4) * 0.35,
      speed: 0.008 + (i % 5) * 0.003,
      phase: i * 2.7,
    }));
    function resize() {
      const rect = el.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(devicePixelRatio, 1.5);
      el.width = width * dpr;
      el.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw(timestamp: number) {
      if (!running) return;
      const dt = Math.min((timestamp - last) / 1000, 0.05);
      last = timestamp;
      ctx!.clearRect(0, 0, width, height);
      for (const mote of motes) {
        mote.y -= dt * mote.speed;
        if (mote.y < -0.01) mote.y = 1.01;
        const drift = Math.sin(timestamp * 0.00018 + mote.phase) * 15;
        ctx!.beginPath();
        ctx!.arc(mote.x * width + drift, mote.y * height, mote.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(236,226,250,${0.15 + (mote.r / 2) * 0.28})`;
        ctx!.fill();
      }
      frame = requestAnimationFrame(draw);
    }
    function update() {
      const shouldRun = visible && !document.hidden;
      if (shouldRun && !running) {
        running = true;
        last = performance.now();
        frame = requestAnimationFrame(draw);
      } else if (!shouldRun && running) {
        running = false;
        cancelAnimationFrame(frame);
      }
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(el);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(el);
    document.addEventListener('visibilitychange', update);
    resize();
    update();
    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, [active, reduced]);
  return (
    <div
      className={`atmosphere ${active ? '' : 'atmosphere-paused'}`}
      ref={container}
      aria-hidden="true"
    >
      <motion.div
        className="landscape"
        style={reduced || !active ? { x: 0, y: 0, scale: 1 } : { x, y: sceneY, scale }}
      />
      <div className="landscape-shade" />
      <div className="fog fog-one" />
      <div className="fog fog-two" />
      <canvas ref={canvas} className="motes" />
      <div className="film-grain" />
    </div>
  );
}
