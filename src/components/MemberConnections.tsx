import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  WalletIcon,
  XLogoIcon,
  SignOutIcon,
  CopyIcon,
} from '@phosphor-icons/react';
import { Modal } from './Primitives';
import { MemberAvatar, memberDisplayName } from './MemberIdentity';
import { shortWallet, useAuth, useWallets } from '../lib/auth';
export function Connections({ compact = false }: { compact?: boolean }) {
  const auth = useAuth(),
    wallets = useWallets();
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false);
  async function linkX() {
    setBusy(true);
    setError('');
    try {
      await auth.connectX();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className={`member-connections ${compact ? 'compact' : ''}`}>
      <div className="connection-step">
        <span className={`connection-icon ${auth.authenticated ? 'complete' : ''}`}>
          <WalletIcon size={23} />
        </span>
        <div className="connection-content">
          <span className="connection-eyebrow">01 / YOUR WALLET</span>
          <h3>{auth.authenticated ? 'Wallet authenticated' : 'Sign in with your wallet'}</h3>
          <p>
            {auth.authenticated
              ? 'Your verified wallet is the address on your reward record.'
              : 'Connect an EVM wallet and sign a message to create your profile.'}
          </p>
          {auth.profile ? (
            <div className="wallet-address">
              <code title={auth.profile.wallet}>
                {compact ? shortWallet(auth.profile.wallet) : auth.profile.wallet}
              </code>
              <button
                className="icon-button"
                aria-label="Copy wallet address"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(auth.profile!.wallet)
                    .then(() => setCopied(true))
                    .catch(() => setError('The address could not be copied.'));
                }}
              >
                <CopyIcon size={17} />
              </button>
              {copied && <span role="status">Copied</span>}
            </div>
          ) : (
            <div className="wallet-options">
              {wallets.length ? (
                wallets.map((wallet) => (
                  <button
                    className="button button-primary"
                    key={wallet.info.uuid}
                    disabled={auth.loading || auth.connecting}
                    onClick={() => {
                      setError('');
                      void auth.signIn(wallet.provider).catch(() => {});
                    }}
                  >
                    <WalletIcon size={18} />
                    {auth.connecting
                      ? 'Waiting for your wallet…'
                      : `Continue with ${wallet.info.name}`}
                  </button>
                ))
              ) : (
                <div>
                  <button
                    className="button button-primary"
                    onClick={() =>
                      setError(
                        'No wallet was detected. Open this page in an EVM wallet browser or enable your wallet extension.',
                      )
                    }
                    disabled={auth.loading}
                  >
                    <WalletIcon size={18} />
                    Connect wallet
                  </button>
                  <p className="field-help">Use MetaMask, Rabby or another EVM wallet browser.</p>
                </div>
              )}
            </div>
          )}
        </div>
        <span className="connection-state">
          {auth.authenticated ? <CheckCircleIcon size={20} weight="fill" /> : 'Required'}
        </span>
      </div>
      <div className={`connection-step ${!auth.authenticated ? 'waiting' : ''}`}>
        <span className={`connection-icon ${auth.ready ? 'complete' : ''}`}>
          <XLogoIcon size={23} />
        </span>
        <div className="connection-content">
          <span className="connection-eyebrow">02 / YOUR X ACCOUNT</span>
          <h3>{auth.ready ? `@${auth.profile?.x?.username}` : 'Connect your X account'}</h3>
          <p>
            {auth.ready
              ? 'Linked to your profile. Mission evidence is checked against this account.'
              : 'Authorize X so we can confirm which contributions belong to you.'}
          </p>
          {auth.authenticated ? (
            <>
              <button
                className="button button-outline"
                disabled={busy || !auth.config.xConfigured}
                onClick={() => void linkX()}
              >
                <XLogoIcon size={17} />
                {busy
                  ? 'Opening X…'
                  : !auth.config.xConfigured
                    ? 'X unavailable'
                    : auth.ready
                      ? 'Reconnect X'
                      : 'Connect X'}
                <ArrowRightIcon size={17} />
              </button>
            </>
          ) : (
            <span className="field-help">Available after wallet sign-in.</span>
          )}
        </div>
        <span className="connection-state">
          {auth.ready ? <CheckCircleIcon size={20} weight="fill" /> : 'Required'}
        </span>
      </div>
      {(error || auth.error) && (
        <p className="form-error" role="alert">
          {error || auth.error}
        </p>
      )}
    </div>
  );
}
export function MemberProfile() {
  const auth = useAuth(),
    location = useLocation();
  const [name, setName] = useState(auth.profile?.name || ''),
    [error, setError] = useState(''),
    [savedName, setSavedName] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setName(auth.profile?.name || '');
  }, [auth.profile?.wallet, auth.profile?.name]);
  const outcome = new URLSearchParams(location.search).get('connection');
  const outcomes: Record<string, string> = {
    success: 'Your X account is connected. You can now submit missions.',
    declined: 'You declined the X connection. Both connections are required to submit missions.',
    expired: 'The X connection request expired. Please try again.',
    used: 'This X account is already linked to another wallet.',
    different: 'Use the X account already linked to this wallet.',
    failed: 'X could not complete the connection. Please try again.',
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="page-kicker">YOUR MEMBERSHIP</span>
          <h1>{auth.authenticated ? 'Your profile' : 'Your place in the Order'}</h1>
          <p>One wallet. One X account. A contribution record of your own.</p>
        </div>
        {auth.authenticated && (
          <button
            className="button button-outline"
            onClick={() => void auth.signOut().catch((e) => setError(e.message))}
          >
            <SignOutIcon size={18} />
            Sign out
          </button>
        )}
      </div>
      <div className="profile-overview">
        <div className="profile-identity">
          <MemberAvatar size={72} />
          <div>
            <span className="page-kicker">THE ORDER OF STEERING</span>
            <h2>{memberDisplayName(auth.profile, 'A new perspective')}</h2>
            <p>
              {auth.profile?.x
                ? '@' + auth.profile.x.username
                : auth.profile
                  ? shortWallet(auth.profile.wallet)
                  : 'Begin with your wallet, continue with X.'}
            </p>
          </div>
        </div>
        <span className={`membership-badge ${auth.ready ? 'ready' : ''}`}>
          <span />
          {auth.ready
            ? 'Ready to contribute'
            : auth.authenticated
              ? 'Complete your profile'
              : 'Not signed in'}
        </span>
      </div>
      {outcome && outcomes[outcome] && (
        <div className={`notice ${outcome === 'success' ? 'success-notice' : ''}`} role="status">
          <ShieldCheckIcon size={20} />
          <p>{outcomes[outcome]}</p>
        </div>
      )}
      <div className="profile-columns">
        <section className="identity-panel">
          <div className="panel-heading">
            <h2>Your connections</h2>
            <span>Both required</span>
          </div>
          <Connections />
        </section>
        <aside className="profile-side-note">
          <span className="page-kicker">A RECORD THAT FOLLOWS YOU</span>
          <h2>Identity before recognition.</h2>
          <p>
            Your wallet identifies your member profile. Your X account connects your social
            contributions to your identity.
          </p>
          <div>
            <span>Reward destination</span>
            <strong>{auth.profile ? shortWallet(auth.profile.wallet) : 'Connect a wallet'}</strong>
          </div>
          <div>
            <span>X identity</span>
            <strong>{auth.profile?.x ? '@' + auth.profile.x.username : 'Not connected'}</strong>
          </div>
          <Link to="/app" className="text-link">
            Explore missions
            <ArrowRightIcon size={17} />
          </Link>
        </aside>
      </div>
      {auth.profile && (
        <section className="profile-name-panel">
          <h2>Profile details</h2>
          <form
            className="profile-form"
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              setSavedName('');
              if (!name.trim() || name.trim().length > 40) {
                setError('Enter a display name of 1 to 40 characters.');
                setBusy(false);
                return;
              }
              try {
                await auth.request('/profile', { name: name.trim() });
                await auth.refresh();
                setSavedName(`${auth.profile!.wallet}:${name.trim()}`);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label htmlFor="member-name">
              Display name
              <input
                id="member-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSavedName('');
                }}
                maxLength={40}
                required
              />
            </label>
            <button className="button button-outline" disabled={busy}>
              {busy ? 'Saving…' : 'Save profile'}
            </button>
            {savedName === `${auth.profile.wallet}:${name.trim()}` && (
              <span role="status">Profile saved.</span>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </form>
        </section>
      )}
    </>
  );
}
export function ConnectDialog() {
  const auth = useAuth();
  return auth.showConnect ? (
    <Modal title="Join the Order" onClose={() => auth.setShowConnect(false)} wide>
      <p className="dialog-intro">Connect your wallet and X to start your contribution record.</p>
      <Connections compact />
      {auth.ready && (
        <div className="form-actions">
          <button className="button button-primary" onClick={() => auth.setShowConnect(false)}>
            Continue to missions
            <ArrowRightIcon size={18} />
          </button>
        </div>
      )}
    </Modal>
  ) : null;
}
export function ConnectionBanner() {
  const auth = useAuth();
  return auth.ready ? null : (
    <div className="onboarding-banner">
      <div className="onboarding-mark">
        <WalletIcon size={24} />
      </div>
      <div>
        <strong>
          {auth.authenticated ? 'One more step to contribute' : 'Make this journey yours'}
        </strong>
        <p>
          {auth.authenticated
            ? 'Connect X to complete your profile and submit missions.'
            : 'Sign in with your wallet and connect X before submitting a mission.'}
        </p>
      </div>
      <div className="onboarding-progress">
        <span className={auth.authenticated ? 'done' : ''}>01 Wallet</span>
        <i />
        <span>02 X</span>
      </div>
      <Link className="button button-primary" to="/app/profile">
        {auth.authenticated ? 'Complete profile' : 'Connect your accounts'}
        <ArrowRightIcon size={17} />
      </Link>
    </div>
  );
}
