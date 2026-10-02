import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowClockwiseIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  CrownIcon,
  TrophyIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { apiRequest, useAuth } from '../lib/auth';
import type { LeaderboardData, LeaderboardEntry } from '../lib/leaderboard';
import { ProfileAvatar } from '../components/MemberIdentity';
import { EmptyState } from '../components/Primitives';
import '../leaderboard.css';

const pointsFormat = new Intl.NumberFormat('en-US');

function MemberLink({ member }: { member: LeaderboardEntry }) {
  return (
    <a
      className="leaderboard-member"
      href={`https://x.com/${encodeURIComponent(member.username)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View @${member.username} on X`}
    >
      <ProfileAvatar url={member.avatarUrl} size={40} />
      <span className="leaderboard-member-copy">
        <strong>{member.name}</strong>
        <span>@{member.username}</span>
      </span>
      <ArrowUpRightIcon className="leaderboard-profile-arrow" size={16} aria-hidden="true" />
    </a>
  );
}

export default function Leaderboard() {
  const auth = useAuth();
  const identity = auth.profile?.wallet || '';
  const [loaded, setLoaded] = useState<{ data: LeaderboardData; identity: string } | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const data = loaded?.identity === identity ? loaded.data : null;

  useEffect(() => {
    if (auth.loading) return;
    const controller = new AbortController();
    setBusy(true);
    setError('');
    void apiRequest<LeaderboardData>('/leaderboard', '', undefined, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setLoaded({ data: next, identity });
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [identity, auth.loading, revision]);

  useEffect(() => {
    const onFocus = () => setRevision((current) => current + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  return (
    <section className="leaderboard-page" aria-labelledby="leaderboard-title">
      <div className="page-heading">
        <div>
          <span className="leaderboard-eyebrow">RECOGNITION THROUGH CONTRIBUTION</span>
          <h1 id="leaderboard-title">Leaderboard</h1>
          <p>The top 50 members, ranked by approved points.</p>
        </div>
        <button
          className="button button-outline button-small"
          disabled={busy}
          onClick={() => setRevision((current) => current + 1)}
        >
          <ArrowClockwiseIcon size={17} aria-hidden="true" />
          {busy ? 'Refreshing…' : 'Refresh leaderboard'}
        </button>
      </div>
      {error && (
        <div className="notice leaderboard-error" role="alert">
          <WarningCircleIcon size={22} aria-hidden="true" />
          <p>{error}</p>
          <button
            className="button button-ghost button-small"
            onClick={() => setRevision((current) => current + 1)}
          >
            Try again
          </button>
        </div>
      )}
      {!data && busy && (
        <div className="leaderboard-loading" role="status" aria-live="polite">
          <span>Loading leaderboard…</span>
          <div aria-hidden="true">
            {[0, 1, 2, 3, 4].map((row) => (
              <span key={row} />
            ))}
          </div>
        </div>
      )}
      {data?.entries.length === 0 && (
        <EmptyState
          icon={<TrophyIcon size={32} />}
          title="The first place is waiting."
          action={
            <Link className="button button-primary" to="/app">
              Explore missions <ArrowRightIcon size={18} />
            </Link>
          }
        >
          Connect your wallet and X account to take your place in the Order.
        </EmptyState>
      )}
      {!!data?.entries.length && (
        <>
          <div className="leaderboard-leaders" aria-label="Top three members">
            {data.entries.slice(0, 3).map((member) => (
              <article
                className={`leaderboard-leader leaderboard-place-${member.rank}`}
                key={member.username}
              >
                <div className="leaderboard-leader-top">
                  <span>#{String(member.rank).padStart(2, '0')}</span>
                  {member.rank === 1 ? (
                    <CrownIcon size={24} weight="duotone" aria-hidden="true" />
                  ) : (
                    <TrophyIcon size={21} aria-hidden="true" />
                  )}
                </div>
                <MemberLink member={member} />
                <div className="leaderboard-leader-score">
                  <strong>{pointsFormat.format(member.points)}</strong>
                  <span>approved points</span>
                </div>
                {member.isYou && <span className="leaderboard-you">You</span>}
              </article>
            ))}
          </div>
          <div className="leaderboard-board" aria-busy={busy}>
            <div className="leaderboard-board-heading">
              <h2>Top 50 members</h2>
              <span>All time</span>
            </div>
            <table className="leaderboard-table">
              <caption className="sr-only">Member ranking by approved mission points</caption>
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Member</th>
                  <th scope="col">Points</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((member) => (
                  <tr
                    key={member.username}
                    className={member.isYou ? 'leaderboard-own-row' : undefined}
                  >
                    <td>
                      <span
                        className={`leaderboard-rank ${member.rank <= 3 ? 'leaderboard-medal' : ''}`}
                      >
                        {String(member.rank).padStart(2, '0')}
                      </span>
                    </td>
                    <td>
                      <div className="leaderboard-table-member">
                        <MemberLink member={member} />
                        {member.isYou && <span className="leaderboard-you">You</span>}
                      </div>
                    </td>
                    <td>
                      <strong>{pointsFormat.format(member.points)}</strong>
                      <span className="leaderboard-points-label">pts</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="leaderboard-board-footer">
              <span>
                {data.entries.length} {data.entries.length === 1 ? 'member' : 'members'} ranked
              </span>
              <Link className="text-link" to="/app">
                Find your next mission <ArrowRightIcon size={16} />
              </Link>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
