import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const chapters = [
  ['arrival', 'Arrival'],
  ['the-order', 'The Order'],
  ['contribute', 'The journey'],
  ['possibilities', 'Possibilities'],
  ['questions', 'Field notes'],
  ['invitation', 'Your invitation'],
];
export default function ChapterRail() {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setCurrent(chapters.findIndex(([id]) => id === visible.target.id));
      },
      { rootMargin: '-20% 0px -40% 0px', threshold: [0, 0.1, 0.3, 0.5] },
    );
    for (const [id] of chapters) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);
  return (
    <nav className="chapter-rail" aria-label="Page chapters">
      <span className="chapter-rail-index" aria-hidden="true">
        0{current + 1}
        <span>/ 06</span>
      </span>
      {chapters.map(([id, label], i) => (
        <Link
          key={id}
          to={`/#${id}`}
          aria-label={`Chapter ${i + 1}: ${label}`}
          aria-current={i === current ? 'location' : undefined}
        >
          <span className="chapter-dot" />
          <span className="chapter-tooltip">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
