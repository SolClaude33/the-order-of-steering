import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  ArrowRightIcon,
  CompassIcon,
  ScrollIcon,
  DiamondIcon,
  TrophyIcon,
  ShieldCheckIcon,
  GearSixIcon,
  MagnifyingGlassIcon,
  FeatherIcon,
  UsersThreeIcon,
  BugIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  PencilSimpleIcon,
  ArchiveIcon,
  TrashIcon,
  SunIcon,
  MoonIcon,
  DownloadSimpleIcon,
  WarningCircleIcon,
  LinkIcon,
  XIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import type { FormEvent, ReactNode } from 'react';
import {
  Brand,
  EmptyState,
  ExternalEvidence,
  Modal,
  StatusBadge,
  formatDate,
} from '../components/Primitives';
import { useStore } from '../lib/store';
import { canSubmit, categories, isExpired, totalPoints, validateMission } from '../lib/model';
import type { Category, Mission, Status, Submission } from '../lib/model';
import { useAuth, shortWallet } from '../lib/auth';
import { ConnectDialog, ConnectionBanner, MemberProfile } from '../components/MemberConnections';
import { MemberAvatar, memberDisplayName } from '../components/MemberIdentity';
import Leaderboard from './Leaderboard';

const categoryIcons: Record<Category, Icon> = {
  Content: FeatherIcon,
  Community: UsersThreeIcon,
  Testing: BugIcon,
};
const boardCategories = categories.filter((category) => category !== 'Testing');
const navItems = [
  { to: '/app', label: 'Missions', icon: CompassIcon, end: true },
  { to: '/app/history', label: 'My journey', icon: ScrollIcon },
  { to: '/app/rewards', label: 'Rewards', icon: DiamondIcon },
  { to: '/app/leaderboard', label: 'Leaderboard', icon: TrophyIcon },
  { to: '/app/keepers', label: 'Keepers', icon: ShieldCheckIcon },
  { to: '/app/profile', label: 'Profile', icon: UsersThreeIcon },
  { to: '/app/settings', label: 'Settings', icon: GearSixIcon },
];
function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
function Stats() {
  const { state } = useStore();
  const pending = state.submissions.filter(
    (s) => s.status === 'pending' || s.status === 'review',
  ).length;
  const verified = state.submissions.filter((s) => s.status === 'verified').length;
  return (
    <div className="stats-grid">
      <div>
        <span className="stat-icon">
          <DiamondIcon size={21} />
        </span>
        <div>
          <span className="stat-value">
            {totalPoints(state).toLocaleString('en-US')}
            <small>pts</small>
          </span>
          <span>Approved points</span>
        </div>
      </div>
      <div>
        <span className="stat-icon">
          <CheckCircleIcon size={21} />
        </span>
        <div>
          <span className="stat-value">{verified}</span>
          <span>Verified contributions</span>
        </div>
      </div>
      <div>
        <span className="stat-icon">
          <ClockIcon size={21} />
        </span>
        <div>
          <span className="stat-value">{pending}</span>
          <span>Submissions in review</span>
        </div>
      </div>
    </div>
  );
}
function MissionCard({ mission, onOpen }: { mission: Mission; onOpen: () => void }) {
  const { state } = useStore();
  const Icon = categoryIcons[mission.category];
  const latest = state.submissions.find((s) => s.missionId === mission.id);
  const closed = mission.archived || isExpired(mission);
  return (
    <motion.article
      className={`mission-card category-${mission.category.toLowerCase()}`}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="mission-card-top">
        <span className="mission-category">
          <Icon size={18} />
          {mission.category}
        </span>
        <span className="points-pill">
          +{mission.points}
          <span>pts</span>
        </span>
      </div>
      <h3>{mission.title}</h3>
      <p>{mission.description}</p>
      <span className="mission-verification">
        <ShieldCheckIcon size={13} />
        {mission.verification === 'x_post' || mission.verification === 'x_reply'
          ? 'X check + Keepers review'
          : mission.verification === 'visit'
            ? 'Automatic visit · 3 seconds'
            : 'Keepers review'}
      </span>
      <div className="mission-meta">
        <span>
          <ClockIcon size={14} />
          {mission.effort}
        </span>
        <span>Closes {formatDate(mission.deadline)}</span>
      </div>
      <div className="mission-card-bottom">
        {latest ? (
          <StatusBadge status={latest.status} />
        ) : (
          <span>{closed ? 'Mission closed' : 'Available'}</span>
        )}
        <button
          className="mission-open"
          onClick={onOpen}
          aria-label={`View mission: ${mission.title}`}
        >
          {latest && latest.status !== 'rejected' ? 'View submission' : 'View mission'}
          <ArrowUpRightIcon size={18} />
        </button>
      </div>
    </motion.article>
  );
}
function VisitAction({ mission, notify }: { mission: Mission; notify: (text: string) => void }) {
  const auth = useAuth();
  const { refresh } = useStore();
  const [starting, setStarting] = useState(false);
  const [attempt, setAttempt] = useState<{ token: string; readyAt: number } | null>(null);
  const [seconds, setSeconds] = useState(3);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!attempt) return;
    let active = true;
    const interval = window.setInterval(
      () => setSeconds(Math.max(0, Math.ceil((attempt.readyAt - Date.now()) / 1000))),
      200,
    );
    const timer = window.setTimeout(
      async () => {
        try {
          await auth.request('/visits/complete', { missionId: mission.id, token: attempt.token });
          if (!active) return;
          await refresh();
          notify(`Visit completed. ${mission.points} points added to your journey.`);
        } catch (e) {
          if (active) {
            setError((e as Error).message);
            setAttempt(null);
          }
        }
      },
      Math.max(0, attempt.readyAt - Date.now()),
    );
    return () => {
      active = false;
      window.clearInterval(interval);
      window.clearTimeout(timer);
    };
  }, [attempt, auth.request, mission.id, mission.points, notify, refresh]);
  async function start() {
    setError('');
    const popup = window.open('about:blank', '_blank');
    if (!popup) {
      setError('Allow a new tab for this site, then open the mission link again.');
      return;
    }
    popup.opener = null;
    setStarting(true);
    try {
      const result = await auth.request<{ token: string; url: string; waitMs: number }>(
        '/visits/start',
        { missionId: mission.id },
      );
      popup.location.replace(result.url);
      setSeconds(3);
      setAttempt({ token: result.token, readyAt: Date.now() + result.waitMs + 150 });
    } catch (e) {
      popup.close();
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }
  return (
    <div className="mission-visit-panel">
      <h3>Visit to complete</h3>
      <p>Open the link. Your visit is approved automatically after 3 seconds.</p>
      <button className="button button-primary" onClick={start} disabled={starting || !!attempt}>
        {starting ? 'Opening link…' : attempt ? 'Visit in progress' : 'Open link & start visit'}
        <ArrowUpRightIcon size={18} />
      </button>
      {attempt && (
        <p className="field-help" role="status">
          {seconds > 0 ? `Recording your visit in ${seconds}s…` : 'Recording your points…'}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
function MissionDialog({
  mission,
  onClose,
  notify,
}: {
  mission: Mission;
  onClose: () => void;
  notify: (text: string) => void;
}) {
  const { state, submit: submitContribution } = useStore();
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const latest = state.submissions.find((s) => s.missionId === mission.id);
  const eligible = canSubmit(state, mission.id);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await submitContribution(mission.id, url, description);
      notify('Evidence submitted. Follow its status in My journey.');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const Icon = categoryIcons[mission.category];
  return (
    <Modal title={mission.title} onClose={onClose} wide>
      <div className="mission-detail-meta">
        <span className="mission-category">
          <Icon size={18} />
          {mission.category}
        </span>
        <span className="points-pill">+{mission.points} pts</span>
        <span>
          <ClockIcon size={15} />
          {mission.effort}
        </span>
      </div>
      <p className="detail-description">{mission.description}</p>
      <h3 className="small-heading">What your contribution should include</h3>
      <ol className="requirements">
        {mission.requirements.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ol>
      {mission.actionUrl && mission.verification !== 'visit' && (
        <a
          className="button button-outline"
          href={mission.actionUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open mission link <ArrowUpRightIcon size={18} />
        </a>
      )}
      <p className="muted text-small">
        Closes on {formatDate(mission.deadline)}. Both wallet and X connections are required.
      </p>
      {latest && (
        <div className="previous-submission">
          <div>
            <h3>Your latest submission</h3>
            <StatusBadge status={latest.status} />
          </div>
          <p>{latest.reason}</p>
          <ExternalEvidence url={latest.url} />
        </div>
      )}
      {eligible && !auth.ready ? (
        <div className="mission-connect-gate">
          <ShieldCheckIcon size={24} />
          <h3>Connect your accounts to contribute</h3>
          <p>
            Wallet sign-in and a linked X account are required. Your evidence and points will belong
            to your profile.
          </p>
          <button
            className="button button-primary"
            onClick={() => {
              onClose();
              auth.setShowConnect(true);
            }}
          >
            Connect your accounts
            <ArrowRightIcon size={18} />
          </button>
        </div>
      ) : eligible && mission.verification === 'visit' ? (
        <VisitAction mission={mission} notify={notify} />
      ) : eligible ? (
        <form className="evidence-form" onSubmit={submit} noValidate>
          <h3>Submit your evidence</h3>
          <label htmlFor="evidence-url">
            Public link
            <span className="input-with-icon">
              <LinkIcon size={18} />
              <input
                id="evidence-url"
                type="url"
                placeholder="https://…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                maxLength={2048}
                aria-describedby="evidence-help"
                required
              />
            </span>
          </label>
          <span id="evidence-help" className="field-help">
            {mission.verification === 'x_post' || mission.verification === 'x_reply'
              ? 'An X post from your connected account. Authorship and criteria are checked before a quality review.'
              : 'A post, document or report. Keepers review the link against the mission requirements.'}
          </span>
          <label htmlFor="evidence-description">
            Tell us what you did
            <textarea
              id="evidence-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain your contribution and how it meets the requirements…"
              minLength={20}
              maxLength={2000}
              required
            />
          </label>
          <div className="form-footnote">
            {description.length}/2000 characters<span>At least 20</span>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button type="button" className="button button-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? 'Checking evidence…' : 'Submit evidence'}
              <ArrowRightIcon size={18} />
            </button>
          </div>
        </form>
      ) : (
        <div className="notice">
          <ShieldCheckIcon size={20} />
          <p>
            {mission.archived || isExpired(mission)
              ? 'This mission is closed to new submissions.'
              : mission.verification === 'visit'
                ? 'Your visit is complete. Points are recorded in My journey.'
                : 'Your evidence has been recorded. Find the decision and its reasons in My journey.'}
          </p>
        </div>
      )}
    </Modal>
  );
}
function Missions({ notify }: { notify: (text: string) => void }) {
  const { state, loading } = useStore();
  const auth = useAuth();
  const location = useLocation();
  const initialCategory = new URLSearchParams(location.search).get('category');
  const [category, setCategory] = useState<string>(
    boardCategories.some((value) => value === initialCategory) ? initialCategory! : 'All',
  );
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('available');
  const [selected, setSelected] = useState<Mission | null>(null);
  const missions = state.missions.filter(
    (m) =>
      (category === 'All' || m.category === category) &&
      `${m.title} ${m.description}`
        .toLocaleLowerCase('en')
        .includes(search.toLocaleLowerCase('en')) &&
      (filter === 'all' ||
        (filter === 'available'
          ? canSubmit(state, m.id)
          : state.submissions.some((s) => s.missionId === m.id))),
  );
  return (
    <>
      <PageHeading
        title="Mission board"
        description="Find a contribution that fits your skills. Follow every decision."
      />
      <ConnectionBanner />
      <div className="campaign-banner">
        <div className="campaign-visual" aria-hidden="true" />
        <div className="campaign-copy">
          <span className="campaign-tag">
            GENESIS <span>Community missions</span>
          </span>
          <h2>The Genesis chapter.</h2>
          <p>
            Content, community and new ideas.
            <br />
            Choose how you want to contribute.
          </p>
          <Link to="/app#mission-list" className="text-link">
            Find your mission
            <ArrowRightIcon size={17} />
          </Link>
        </div>
        <div className="campaign-editorial-note">
          <span>THE ORDER / CHAPTER 001</span>
          <p>
            Ideas into action.
            <br />
            Contributions into recognition.
          </p>
        </div>
      </div>
      <Stats />
      {loading && (
        <p className="board-loading" role="status">
          Loading missions…
        </p>
      )}
      <section id="mission-list" className="mission-list-section">
        <div className="list-heading">
          <h2>
            Mission board<span>{missions.length}</span>
          </h2>
          <label className="search-field">
            <MagnifyingGlassIcon size={18} />
            <input
              aria-label="Search missions"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for a mission…"
            />
            {search && (
              <button aria-label="Clear search" onClick={() => setSearch('')}>
                <XIcon size={16} />
              </button>
            )}
          </label>
        </div>
        <div className="mission-filters">
          <div className="category-tabs" role="group" aria-label="Filter by category">
            {['All', ...boardCategories].map((c) => (
              <button
                key={c}
                className={category === c ? 'active' : ''}
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
              >
                {c}
              </button>
            ))}
          </div>
          <select
            aria-label="Filter by availability"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="available">Available</option>
            <option value="mine">My submissions</option>
            <option value="all">All missions</option>
          </select>
        </div>
        {missions.length ? (
          <div className="missions-grid">
            <AnimatePresence mode="popLayout">
              {missions.map((m) => (
                <MissionCard key={m.id} mission={m} onOpen={() => setSelected(m)} />
              ))}
            </AnimatePresence>
          </div>
        ) : !loading && state.missions.length === 0 ? (
          <EmptyState
            icon={<CompassIcon size={38} />}
            title="A new chapter is on its way."
            action={
              auth.isKeeper && auth.ready ? (
                <Link className="button button-primary" to="/app/keepers">
                  Create a mission
                  <PlusIcon size={17} />
                </Link>
              ) : undefined
            }
          >
            {auth.isKeeper && auth.ready
              ? 'Publish your first mission from the Keepers space.'
              : 'New missions will appear here when the Keepers publish them.'}
          </EmptyState>
        ) : (
          !loading && (
            <EmptyState
              icon={<CompassIcon size={34} />}
              title="No missions in this view"
              action={
                <button
                  className="text-link inline-reset"
                  onClick={() => {
                    setCategory('All');
                    setFilter('all');
                    setSearch('');
                  }}
                >
                  Show all missions
                  <ArrowRightIcon size={16} />
                </button>
              }
            >
              Try another category or change the filter.
            </EmptyState>
          )
        )}
      </section>
      {selected && (
        <MissionDialog mission={selected} onClose={() => setSelected(null)} notify={notify} />
      )}
    </>
  );
}
function History() {
  const { state } = useStore();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Submission | null>(null);
  const entries = state.submissions.filter((s) => filter === 'all' || s.status === filter);
  return (
    <>
      <PageHeading
        title="Every contribution leaves a mark."
        description="Your history of contributions, decisions and points."
      />
      <Stats />
      <div className="list-heading history-heading">
        <h2>My journey</h2>
        <select
          aria-label="Filter submissions by status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="review">In review</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      {entries.length ? (
        <div className="history-list">
          {entries.map((s) => (
            <button key={s.id} className="history-entry" onClick={() => setSelected(s)}>
              <span className="history-entry-icon">
                {s.status === 'verified' ? <CheckCircleIcon size={24} /> : <ScrollIcon size={24} />}
              </span>
              <span className="history-entry-copy">
                <strong>{s.missionTitle}</strong>
                <span>Submitted on {formatDate(s.createdAt)}</span>
              </span>
              <StatusBadge status={s.status} />
              <span className="history-points">
                {s.status === 'verified' ? '+' : ''}
                {s.points}
                <small>{s.status === 'verified' ? 'pts' : 'potential pts'}</small>
              </span>
              <ArrowUpRightIcon size={20} />
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ScrollIcon size={36} />}
          title={
            state.submissions.length
              ? 'No submissions with this status.'
              : 'Your story is yet to be written.'
          }
          action={
            !state.submissions.length && (
              <Link className="button button-primary" to="/app">
                Explore missions
                <ArrowRightIcon size={18} />
              </Link>
            )
          }
        >
          {state.submissions.length
            ? 'Change the filter to see your other contributions.'
            : 'Choose a mission and share your work to start your record.'}
        </EmptyState>
      )}
      {selected && (
        <Modal title={selected.missionTitle} onClose={() => setSelected(null)}>
          <div className="submission-summary">
            <StatusBadge status={selected.status} />
            <span>
              {selected.points} points {selected.status === 'verified' ? 'approved' : 'potential'}
            </span>
          </div>
          {selected.verificationSource && <p className="notice">{selected.verificationSource}</p>}
          <h3 className="small-heading">Your contribution</h3>
          <p className="preserve-lines">{selected.description}</p>
          <ExternalEvidence url={selected.url} />
          <h3 className="small-heading timeline-heading">Decision history</h3>
          <div className="decision-timeline">
            <div>
              <span className="timeline-mark" />
              <strong>Evidence received</strong>
              <small>{formatDate(selected.createdAt)}</small>
              <p>Source: the link and description submitted by your authenticated profile.</p>
            </div>
            {selected.decisions.map((d, i) => (
              <div key={`${d.at}-${i}`}>
                <span className="timeline-mark" />
                <StatusBadge status={d.status} />
                <small>{formatDate(d.at)}</small>
                <p>{d.reason}</p>
                <span className="field-help">Reviewed by an authorized Keeper.</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
function Rewards() {
  const { state } = useStore();
  return (
    <>
      <PageHeading
        title="The value of your contribution."
        description="Your approved points and the work behind them."
      />
      <div className="rewards-grid">
        <div className="points-panel">
          <DiamondIcon size={34} />
          <span>Your approved balance</span>
          <strong>
            {totalPoints(state).toLocaleString('en-US')}
            <small>pts</small>
          </strong>
          <p>
            {state.submissions.filter((s) => s.status === 'verified').length} verified
            contributions.
          </p>
          <Link className="text-link" to="/app/history">
            View my journey
            <ArrowRightIcon size={18} />
          </Link>
        </div>
        <div className="reward-roadmap">
          <span className="soft-tag">Your contribution record</span>
          <h2>
            Every contribution.
            <br />
            Every milestone.
          </h2>
          <p>
            Your work builds your place in the Order. Find a mission, share the evidence and follow
            your progress as Keepers recognize each contribution.
          </p>
          <div className="roadmap-items">
            <div>
              <span>Recognition</span>
              <strong>Approved mission points</strong>
            </div>
            <div>
              <span>Review</span>
              <strong>Keepers</strong>
            </div>
            <div>
              <span>Your journey</span>
              <Link className="text-link" to="/app/history">
                View contributions <ArrowUpRightIcon size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Link className="button button-outline" to="/app">
        Keep contributing
        <ArrowRightIcon size={18} />
      </Link>
    </>
  );
}
function MissionEditor({
  mission,
  onClose,
  notify,
}: {
  mission?: Mission;
  onClose: () => void;
  notify: (text: string) => void;
}) {
  const { save } = useStore();
  const [busy, setBusy] = useState(false);
  const date = new Date();
  date.setDate(date.getDate() + 14);
  const [draft, setDraft] = useState<Mission>(
    mission || {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      category: 'Content',
      points: 100,
      effort: '20 min',
      deadline: date.toISOString().slice(0, 10),
      requirements: [],
      archived: false,
    },
  );
  const [requirements, setRequirements] = useState(mission?.requirements.join('\n') || '');
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const verification = draft.verification || 'manual';
      const clean = {
        ...draft,
        verification,
        targetPostId: verification === 'x_reply' ? (draft.targetPostId || '').trim() : undefined,
        requiredText:
          verification === 'x_post' || verification === 'x_reply'
            ? draft.requiredText?.trim()
            : undefined,
        actionUrl: draft.actionUrl?.trim() || undefined,
        requirements: requirements
          .split('\n')
          .map((r) => r.trim())
          .filter(Boolean),
      };
      validateMission(clean);
      if (verification === 'x_reply' && !/^\d+$/.test(clean.targetPostId || ''))
        throw new Error(
          'Enter the numeric post ID to verify a reply. To verify an account follow, choose Keepers review.',
        );
      await save(clean);
      notify(
        mission
          ? 'Mission updated. Existing submissions retain their original points.'
          : 'New mission published on the board.',
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={mission ? 'Edit mission' : 'Create a mission'} onClose={onClose} wide>
      <form className="editor-form" onSubmit={submit} onChange={() => setError('')} noValidate>
        <label htmlFor="mission-title">
          Title
          <input
            id="mission-title"
            autoFocus
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            maxLength={100}
            required
          />
        </label>
        <label htmlFor="mission-description">
          Description
          <textarea
            id="mission-description"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            rows={3}
            maxLength={2000}
            required
          />
        </label>
        <div className="form-columns">
          <label htmlFor="mission-category">
            Category
            <select
              aria-label="Category"
              id="mission-category"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label htmlFor="mission-points">
            Points
            <input
              id="mission-points"
              type="number"
              min="1"
              max="1000"
              step="1"
              value={draft.points}
              onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) })}
              required
            />
          </label>
        </div>
        <div className="form-columns">
          <label htmlFor="mission-effort">
            Estimated time
            <input
              id="mission-effort"
              value={draft.effort}
              onChange={(e) => setDraft({ ...draft, effort: e.target.value })}
              maxLength={40}
              required
            />
          </label>
          <label htmlFor="mission-deadline">
            Closing date
            <input
              id="mission-deadline"
              type="date"
              value={draft.deadline}
              onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
              required
            />
          </label>
        </div>
        <label htmlFor="mission-requirements">
          Requirements
          <textarea
            id="mission-requirements"
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            rows={4}
            required
            aria-describedby="requirements-help"
          />
        </label>
        <span id="requirements-help" className="field-help">
          One requirement per line. Up to 8 requirements.
        </span>
        <label htmlFor="mission-link">
          Mission link
          <input
            id="mission-link"
            type="url"
            placeholder="https://x.com/orderofsteering"
            value={draft.actionUrl || ''}
            onChange={(e) => setDraft({ ...draft, actionUrl: e.target.value })}
            maxLength={2048}
            aria-describedby="mission-link-help"
            required={draft.verification === 'visit'}
          />
        </label>
        <span id="mission-link-help" className="field-help">
          Members can open this link from the mission. Required for automatic visits; optional for
          other missions.
        </span>
        <label htmlFor="mission-verification">
          Verification
          <select
            id="mission-verification"
            aria-label="Verification"
            aria-describedby="mission-verification-help"
            value={draft.verification || 'manual'}
            onChange={(e) =>
              setDraft({ ...draft, verification: e.target.value as Mission['verification'] })
            }
          >
            <option value="manual">Keepers review</option>
            <option value="visit">Visit link — automatic after 3 seconds</option>
            <option value="x_post">X post ownership + Keepers review</option>
            <option value="x_reply">X reply to target + Keepers review</option>
          </select>
        </label>
        <span id="mission-verification-help" className="field-help">
          Automatic visits reward opening the link. For account follows, choose Keepers review. X
          post and reply checks verify posts from the connected account.
        </span>
        {draft.verification === 'x_reply' && (
          <>
            <label htmlFor="mission-target">
              Target X post ID
              <input
                id="mission-target"
                inputMode="numeric"
                placeholder="e.g. 1234567890123456789"
                aria-describedby="mission-target-help"
                value={draft.targetPostId || ''}
                onChange={(e) => setDraft({ ...draft, targetPostId: e.target.value })}
                required
              />
            </label>
            <span id="mission-target-help" className="field-help">
              Use the number after /status/ in a post URL. A profile URL is not a post ID.
            </span>
          </>
        )}
        {(draft.verification === 'x_post' || draft.verification === 'x_reply') && (
          <label htmlFor="mission-required-text">
            Required text in the X post (optional)
            <input
              id="mission-required-text"
              value={draft.requiredText || ''}
              maxLength={100}
              onChange={(e) => setDraft({ ...draft, requiredText: e.target.value })}
            />
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="button button-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button-primary" disabled={busy}>
            {busy ? 'Saving…' : mission ? 'Save changes' : 'Publish mission'}
            <ArrowRightIcon size={18} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
function ReviewDialog({
  submission,
  onClose,
  notify,
}: {
  submission: Submission;
  onClose: () => void;
  notify: (text: string) => void;
}) {
  const { review: reviewContribution } = useStore();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Exclude<Status, 'pending'>>('verified');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await reviewContribution(submission.id, status, reason);
      notify(
        status === 'verified'
          ? `Contribution verified. Added ${submission.points} points.`
          : 'Decision recorded in the submission history.',
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Review contribution" onClose={onClose}>
      <div className="review-context">
        <p className="review-member">
          {submission.wallet && shortWallet(submission.wallet)}{' '}
          {submission.xUsername && '· @' + submission.xUsername}
        </p>
        {submission.verificationSource && (
          <p className="field-help">{submission.verificationSource}</p>
        )}
        <h3>{submission.missionTitle}</h3>
        <p className="preserve-lines">{submission.description}</p>
        <ExternalEvidence url={submission.url} />
        <span className="field-help">
          Submitted on {formatDate(submission.createdAt)}. {submission.points} potential points.
        </span>
      </div>
      <form className="review-form" onSubmit={submit} noValidate>
        <label htmlFor="review-decision">
          Decision
          <select
            aria-label="Decision"
            id="review-decision"
            value={status}
            onChange={(e) => setStatus(e.target.value as Exclude<Status, 'pending'>)}
          >
            <option value="verified">Verify and award points</option>
            <option value="review">Keep in review</option>
            <option value="rejected">Reject submission</option>
          </select>
        </label>
        <label htmlFor="review-reason">
          Reason for the decision
          <textarea
            id="review-reason"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            minLength={10}
            maxLength={1000}
            placeholder="Explain which requirements are met or what is missing…"
            required
          />
        </label>
        <span className="field-help">At least 10 characters. The member can read this reason.</span>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="button button-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button-primary" disabled={busy}>
            {busy ? 'Recording…' : 'Record decision'}
            <CheckCircleIcon size={18} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
function DeleteMissionDialog({
  mission,
  onClose,
  notify,
}: {
  mission: Mission;
  onClose: () => void;
  notify: (text: string) => void;
}) {
  const { deleteMission } = useStore();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);
  return (
    <Modal
      title="Delete mission"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p>
        <strong>{mission.title}</strong>
      </p>
      <p>
        This permanently removes the mission from all mission boards and Keeper management. Existing
        submissions and earned points are preserved.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button ref={cancelRef} className="button button-ghost" disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button
          className="button button-danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              await deleteMission(mission.id);
              notify('Mission deleted. Existing submissions and earned points are preserved.');
              onClose();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <TrashIcon size={18} />
          {busy ? 'Deleting…' : 'Delete mission'}
        </button>
      </div>
    </Modal>
  );
}
function Keepers({ notify }: { notify: (text: string) => void }) {
  const { state, keeperSubmissions, archive: archiveMission } = useStore();
  const auth = useAuth();
  const [actionError, setActionError] = useState('');
  const [tab, setTab] = useState('review');
  const [editor, setEditor] = useState<Mission | 'new' | null>(null);
  const [review, setReview] = useState<Submission | null>(null);
  const [archive, setArchive] = useState<Mission | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Mission | null>(null);
  const pending = keeperSubmissions.filter((s) => s.status === 'pending' || s.status === 'review');
  if (!auth.isKeeper || !auth.ready)
    return (
      <>
        <PageHeading title="Keepers" description="Mission management and contribution review." />
        <EmptyState
          icon={<ShieldCheckIcon size={38} />}
          title="Keeper access required"
          action={
            <Link to="/app/profile" className="text-link">
              View your profile
              <ArrowRightIcon size={17} />
            </Link>
          }
        >
          This workspace is available to authorized team wallets with a connected X account.
        </EmptyState>
      </>
    );
  return (
    <>
      <PageHeading
        title="Chart the path of the Order."
        description="Create clear briefs and review the community’s contributions."
      >
        <button className="button button-primary" onClick={() => setEditor('new')}>
          <PlusIcon size={18} />
          Create mission
        </button>
      </PageHeading>
      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}
      <button
        className="button button-outline keeper-export"
        onClick={async () => {
          try {
            const data = await auth.request('/keepers/reward-register', {});
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
            );
            const link = document.createElement('a');
            link.href = url;
            link.download = 'order-reward-register.json';
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            notify('Reward register exported.');
          } catch (e) {
            setActionError((e as Error).message);
          }
        }}
      >
        <DownloadSimpleIcon size={17} />
        Export reward register
      </button>
      <div className="keeper-tabs" role="group" aria-label="Keepers views">
        <button
          className={tab === 'review' ? 'active' : ''}
          onClick={() => setTab('review')}
          aria-pressed={tab === 'review'}
        >
          Awaiting review<span>{pending.length}</span>
        </button>
        <button
          className={tab === 'missions' ? 'active' : ''}
          onClick={() => setTab('missions')}
          aria-pressed={tab === 'missions'}
        >
          Manage missions<span>{state.missions.length}</span>
        </button>
      </div>
      {tab === 'review' ? (
        pending.length ? (
          <div className="review-list">
            {pending.map((s) => (
              <article key={s.id}>
                <div>
                  <StatusBadge status={s.status} />
                  <span className="muted text-small">{formatDate(s.createdAt)}</span>
                </div>
                <h3>{s.missionTitle}</h3>
                <p>{s.description}</p>
                <div>
                  <span>{s.points} potential points</span>
                  <button
                    className="button button-outline button-small"
                    onClick={() => setReview(s)}
                  >
                    Review submission
                    <ArrowRightIcon size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ShieldCheckIcon size={38} />}
            title="Ready for the next contribution."
            action={
              <Link className="text-link" to="/app">
                Explore missions
                <ArrowRightIcon size={17} />
              </Link>
            }
          >
            New submissions will appear here for review.
          </EmptyState>
        )
      ) : state.missions.length ? (
        <div className="manage-list">
          {state.missions.map((m) => (
            <article key={m.id}>
              <span className="manage-icon">
                {(() => {
                  const Icon = categoryIcons[m.category];
                  return <Icon size={21} />;
                })()}
              </span>
              <div>
                <h3>{m.title}</h3>
                <p>
                  {m.category} · {m.points} pts ·{' '}
                  {m.archived
                    ? 'Archived'
                    : isExpired(m)
                      ? 'Closed'
                      : `Until ${formatDate(m.deadline)}`}
                </p>
              </div>
              <div
                className="mission-management-actions"
                role="group"
                aria-label={`Manage ${m.title}`}
              >
                <button
                  className="icon-button"
                  aria-label={`Edit ${m.title}`}
                  onClick={() => setEditor(m)}
                >
                  <PencilSimpleIcon size={20} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`${m.archived ? 'Reopen' : 'Archive'} ${m.title}`}
                  onClick={() => setArchive(m)}
                >
                  <ArchiveIcon size={20} />
                </button>
                <button
                  className="button button-ghost button-small danger-button"
                  aria-label={`Delete ${m.title}`}
                  onClick={() => setDeleteTarget(m)}
                >
                  <TrashIcon size={17} /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CompassIcon size={38} />}
          title="Your first mission starts here."
          action={
            <button className="button button-primary" onClick={() => setEditor('new')}>
              <PlusIcon size={18} />
              Create your first mission
            </button>
          }
        >
          Set the brief, choose how evidence is checked and publish it for the community.
        </EmptyState>
      )}
      {editor && (
        <MissionEditor
          mission={editor === 'new' ? undefined : editor}
          onClose={() => setEditor(null)}
          notify={notify}
        />
      )}
      {review && (
        <ReviewDialog submission={review} onClose={() => setReview(null)} notify={notify} />
      )}
      {deleteTarget && (
        <DeleteMissionDialog
          mission={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          notify={notify}
        />
      )}
      {archive && (
        <Modal
          title={archive.archived ? 'Reopen mission' : 'Archive mission'}
          onClose={() => setArchive(null)}
        >
          <p>
            {archive.archived
              ? 'The mission will return to the board if its closing date has not passed.'
              : 'New submissions will be closed for this mission. Existing evidence and reviews will be preserved.'}
          </p>
          <p>
            <strong>{archive.title}</strong>
          </p>
          <div className="form-actions">
            <button className="button button-ghost" onClick={() => setArchive(null)}>
              Cancel
            </button>
            <button
              className="button button-primary"
              onClick={async () => {
                try {
                  await archiveMission(archive.id, !archive.archived);
                  notify(archive.archived ? 'Mission reopened.' : 'Mission archived.');
                  setArchive(null);
                } catch (e) {
                  setActionError((e as Error).message);
                  setArchive(null);
                }
              }}
            >
              {archive.archived ? 'Reopen mission' : 'Archive mission'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function Settings({
  theme,
  setTheme,
  notify,
}: {
  theme: string;
  setTheme: (theme: string) => void;
  notify: (text: string) => void;
}) {
  const { state } = useStore();
  const auth = useAuth();
  function download() {
    const data = {
      profile: auth.profile,
      missions: state.missions,
      submissions: state.submissions,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'the-order-my-journey.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Your contribution record has been exported.');
  }
  function downloadLegacy() {
    const saved = localStorage.getItem('order-of-steering:v1');
    if (!saved) return;
    const url = URL.createObjectURL(new Blob([saved], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'order-browser-archive.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  let hasLegacy = false;
  try {
    hasLegacy = !!localStorage.getItem('order-of-steering:v1');
  } catch {
    /* Browser storage is optional. */
  }
  return (
    <>
      <PageHeading title="Settings" description="Make the workspace your own." />
      <div className="settings-sections">
        <section>
          <h2>Appearance</h2>
          <p>Choose how you want to see the Order.</p>
          <div className="theme-options">
            <button
              className={theme === 'dark' ? 'active' : ''}
              aria-pressed={theme === 'dark'}
              onClick={() => setTheme('dark')}
            >
              <MoonIcon size={22} />
              Dark
            </button>
            <button
              className={theme === 'light' ? 'active' : ''}
              aria-pressed={theme === 'light'}
              onClick={() => setTheme('light')}
            >
              <SunIcon size={22} />
              Light
            </button>
          </div>
        </section>
        <section>
          <h2>Your profile</h2>
          <p>Manage the wallet and X account associated with your contributions.</p>
          <Link className="button button-outline" to="/app/profile">
            Manage profile
            <ArrowRightIcon size={17} />
          </Link>
        </section>
        <section>
          <h2>Your contribution record</h2>
          <p>Your evidence, decisions and approved points are saved to your wallet profile.</p>
          <button
            className="button button-outline"
            onClick={download}
            disabled={!auth.authenticated}
          >
            <DownloadSimpleIcon size={18} />
            Export data
          </button>
        </section>
        {hasLegacy && (
          <section>
            <h2>Browser archive</h2>
            <button className="button button-outline" onClick={downloadLegacy}>
              <DownloadSimpleIcon size={18} />
              Export browser archive
            </button>
          </section>
        )}
      </div>
    </>
  );
}
export default function MissionApp() {
  const { state, warning } = useStore();
  const auth = useAuth();
  const location = useLocation();
  const [toast, setToast] = useState('');
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('order:theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('order:theme', theme);
    } catch {
      /* Appearance remains available for the session. */
    }
  }, [theme]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  const pending = state.submissions.filter(
    (s) => s.status === 'pending' || s.status === 'review',
  ).length;
  return (
    <div className="mission-app app-professional" data-theme={theme}>
      <Link to={location.pathname + '#app-main'} className="skip-link">
        Skip to content
      </Link>
      <aside className="app-sidebar">
        <Link className="sidebar-brand" to="/" aria-label="Go to the public website">
          <Brand />
        </Link>
        <div className="sidebar-section-label">YOUR SPACE</div>
        <nav aria-label="App navigation">
          {navItems
            .filter((item) => item.to !== '/app/keepers' || (auth.isKeeper && auth.ready))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
              >
                <item.icon size={21} weight={location.pathname === item.to ? 'fill' : 'regular'} />
                <span>{item.label}</span>
                {item.label === 'Keepers' && pending > 0 && (
                  <span className="nav-count">{pending}</span>
                )}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-mode">
            <ShieldCheckIcon size={19} />
            <div>
              <strong>{auth.ready ? 'Profile connected' : 'Your membership'}</strong>
              <p>{auth.ready ? 'Wallet + X verified' : 'Wallet + X required'}</p>
            </div>
          </div>
          <Link className="back-to-site" to="/">
            <ArrowLeftIcon size={17} />
            Back to the website
          </Link>
          <Link className="profile-link" to="/app/profile">
            <MemberAvatar size={36} />
            <span>
              <strong>{memberDisplayName(auth.profile, state.profile)}</strong>
              <small>
                {auth.profile?.x
                  ? '@' + auth.profile.x.username
                  : auth.profile
                    ? shortWallet(auth.profile.wallet)
                    : 'Connect your accounts'}
              </small>
            </span>
            <GearSixIcon size={17} />
          </Link>
        </div>
      </aside>
      <div className="app-body">
        <header className="app-topbar">
          <span>
            The Order of Steering<span className="topbar-divider">/</span>
            <strong>{navItems.find((n) => n.to === location.pathname)?.label || 'Missions'}</strong>
          </span>
          <div>
            <button className="member-topbar-button" onClick={() => auth.setShowConnect(true)}>
              <span className={auth.ready ? 'online-dot' : 'offline-dot'} />
              {auth.profile ? shortWallet(auth.profile.wallet) : 'Connect wallet'}
            </button>
            <button
              className="icon-button"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
            </button>
            <Link to="/app/profile" className="topbar-avatar" aria-label="Open profile settings">
              <MemberAvatar size={32} />
            </Link>
          </div>
        </header>
        <main id="app-main" className="app-main" tabIndex={-1}>
          {warning && (
            <div className="notice storage-warning" role="alert">
              <WarningCircleIcon size={21} />
              <p>{warning}</p>
            </div>
          )}
          <motion.div
            className="route-content"
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Routes>
              <Route index element={<Missions notify={setToast} />} />
              <Route path="history" element={<History />} />
              <Route path="rewards" element={<Rewards />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="profile" element={<MemberProfile />} />
              <Route path="keepers" element={<Keepers notify={setToast} />} />
              <Route
                path="settings"
                element={<Settings theme={theme} setTheme={setTheme} notify={setToast} />}
              />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </motion.div>
          <footer className="app-footer">
            <span>The Order of Steering</span>
            <span>A clear journey for your contribution.</span>
          </footer>
        </main>
      </div>
      <ConnectDialog />
      <div className="toast-region" role="status" aria-live="polite" aria-atomic="true">
        <AnimatePresence>
          {toast && (
            <motion.div
              className="toast"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
            >
              <CheckCircleIcon size={21} />
              <span>{toast}</span>
              <button aria-label="Dismiss notification" onClick={() => setToast('')}>
                <XIcon size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
