import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { XIcon, ArrowUpRightIcon } from '@phosphor-icons/react';
import type { Status } from '../lib/model';
import { statusLabels } from '../lib/model';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand ${compact ? 'brand-compact' : ''}`}>
      <img src="/assets/branding/pfp-approved-v01.png" alt="" width="40" height="40" />
      <span>
        The Order<span>of Steering</span>
      </span>
    </span>
  );
}
export function StatusBadge({ status }: { status: Status }) {
  return <span className={`status-badge status-${status}`}>{statusLabels[status]}</span>;
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'modal-wide' : ''}`}
      aria-labelledby="modal-title"
      onKeyDown={(e) => {
        if (e.key !== 'Tab') return;
        const focusable = [
          ...ref.current!.querySelectorAll<HTMLElement>(
            'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]',
          ),
        ].filter((el) => el.getClientRects().length > 0);
        const first = focusable[0],
          last = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
      onCancel={() => closeRef.current()}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            closeRef.current();
        }
      }}
    >
      <div className="modal-top">
        <h2 id="modal-title">{title}</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog">
          <XIcon size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function ExternalEvidence({ url }: { url: string }) {
  return (
    <a className="evidence-link" href={url} target="_blank" rel="noopener noreferrer">
      Open evidence
      <ArrowUpRightIcon size={16} />
      <span className="sr-only"> (new tab)</span>
    </a>
  );
}
export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(
    new Date(date.includes('T') ? date : `${date}T12:00:00`),
  );
