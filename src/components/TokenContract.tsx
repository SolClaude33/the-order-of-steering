import { useEffect, useState } from 'react';
import { CheckIcon, CopyIcon } from '@phosphor-icons/react';

export default function TokenContract({
  address,
  placement,
}: {
  address: string;
  placement: 'hero' | 'footer';
}) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => {
    if (status === 'idle') return;
    const timer = window.setTimeout(() => setStatus('idle'), 4000);
    return () => window.clearTimeout(timer);
  }, [status]);
  return (
    <div className={`atlas-contract atlas-contract-${placement}`}>
      <div className="atlas-contract-content">
        <span className="atlas-contract-label">
          TOKEN CONTRACT <span>/ CA</span>
        </span>
        <code>{address}</code>
      </div>
      <button
        type="button"
        className="atlas-contract-copy"
        aria-label="Copy token contract address"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(address);
            setStatus('copied');
          } catch {
            setStatus('failed');
          }
        }}
      >
        {status === 'copied' ? (
          <CheckIcon size={16} aria-hidden="true" />
        ) : (
          <CopyIcon size={16} aria-hidden="true" />
        )}
        <span>{status === 'copied' ? 'Copied' : 'Copy'}</span>
      </button>
      <span
        className={status === 'failed' ? 'atlas-contract-error' : 'sr-only'}
        role="status"
        aria-live="polite"
      >
        {status === 'copied'
          ? 'Contract address copied.'
          : status === 'failed'
            ? 'Copy is unavailable. Select the address to copy it.'
            : ''}
      </span>
    </div>
  );
}
