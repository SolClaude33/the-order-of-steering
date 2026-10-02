import { legacyEnglishContent } from './legacy-content.ts';

const builtInMissionIds = new Set([
  'share-vision',
  'first-meme',
  'test-app',
  'welcome',
  'tutorial',
  'bug-report',
]);
const translateLegacy = (value: string): string =>
  typeof value === 'string' && Object.hasOwn(legacyEnglishContent, value)
    ? legacyEnglishContent[value]
    : value;

export type Category = 'Content' | 'Community' | 'Testing';
export type Status = 'pending' | 'verified' | 'rejected' | 'review';
export type Mission = {
  id: string;
  title: string;
  description: string;
  category: Category;
  points: number;
  effort: string;
  requirements: string[];
  deadline: string;
  archived: boolean;
  verification?: 'manual' | 'x_post' | 'x_reply' | 'visit';
  actionUrl?: string;
  targetPostId?: string;
  requiredText?: string;
};
export type Submission = {
  id: string;
  missionId: string;
  missionTitle: string;
  points: number;
  url: string;
  description: string;
  createdAt: string;
  status: Status;
  reason: string;
  reviewedAt: string | null;
  decisions: { status: Status; reason: string; at: string }[];
  wallet?: string;
  xUsername?: string;
  verificationSource?: string;
};
export type State = { version: 1; profile: string; missions: Mission[]; submissions: Submission[] };
export const STORAGE_KEY = 'order-of-steering:v1';
export const categories: Category[] = ['Content', 'Community', 'Testing'];
export const statusLabels: Record<Status, string> = {
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
  review: 'In review',
};

function deadline(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function initialState(): State {
  return {
    version: 1,
    profile: 'Acolyte',
    submissions: [],
    missions: [
      {
        id: 'share-vision',
        verification: 'x_post',
        requiredText: 'Order',
        title: 'Share the vision of the Order',
        category: 'Content',
        points: 120,
        effort: '20 min',
        deadline: deadline(14),
        archived: false,
        description:
          'Describe what a community that recognizes contributions can build. Publish an original reflection on The Order of Steering.',
        requirements: [
          'Publish an original X post of at least 100 words and mention the Order.',
          'Explain a practical way to contribute to the community.',
          'Submit a public link and a brief description.',
        ],
      },
      {
        id: 'first-meme',
        verification: 'x_post',
        title: 'Turn the lore into a meme',
        category: 'Content',
        points: 80,
        effort: '15 min',
        deadline: deadline(14),
        archived: false,
        description:
          'A good idea can begin with a smile. Create an original meme about missions, Keepers or contributions.',
        requirements: [
          'Create your own artwork; only use images you have permission to share.',
          'Connect the meme to the project.',
          'Publish your work on X and share its post link.',
        ],
      },
      {
        id: 'test-app',
        title: 'Explore the app. Find an improvement.',
        category: 'Testing',
        points: 150,
        effort: '30 min',
        deadline: deadline(21),
        archived: false,
        description:
          'Try the mission journey and suggest a practical improvement. Your experience helps make the next version better.',
        requirements: [
          'Try the flow on desktop or mobile.',
          'Describe what you did, what happened and what you expected.',
          'Share a link to your report or document.',
        ],
      },
      {
        id: 'welcome',
        title: 'Open the door to someone new',
        category: 'Community',
        points: 60,
        effort: '10 min',
        deadline: deadline(14),
        archived: false,
        description:
          'Help someone understand the Order and start contributing. A thoughtful welcome makes a difference.',
        requirements: [
          'Share a helpful, respectful explanation.',
          'Include a mission idea to get started.',
          'Submit a link to your public contribution.',
        ],
      },
      {
        id: 'tutorial',
        title: 'Create the guide you wish you had',
        category: 'Content',
        points: 200,
        effort: '45 min',
        deadline: deadline(21),
        archived: false,
        description:
          'Write or record a tutorial on completing a mission and submitting clear evidence. Make the journey easier for new members.',
        requirements: [
          'Include clear steps from choosing a mission to submitting evidence.',
          'Show how to connect a wallet and X account.',
          'Share a public link to the tutorial.',
        ],
      },
      {
        id: 'bug-report',
        title: 'Give a bug nowhere to hide',
        category: 'Testing',
        points: 180,
        effort: '30 min',
        deadline: deadline(21),
        archived: false,
        description:
          'Find a reproducible bug and document how it happens. Clear reports help us resolve issues with confidence.',
        requirements: [
          'Include steps to reproduce the issue.',
          'Specify the browser, device and expected result.',
          'Share your report through an accessible link.',
        ],
      },
    ],
  };
}

export function normalizeEvidence(value: string): string | null {
  try {
    if (value.length > 2048) return null;
    const url = new URL(value.trim());
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      !url.hostname.includes('.')
    )
      return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith('utm_') || ['ref', 's', 't', 'fbclid'].includes(key))
        url.searchParams.delete(key);
    }
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.href;
  } catch {
    return null;
  }
}

export function isExpired(mission: Mission): boolean {
  return new Date(`${mission.deadline}T23:59:59`).getTime() < Date.now();
}
export function totalPoints(state: State): number {
  return state.submissions.reduce((sum, s) => sum + (s.status === 'verified' ? s.points : 0), 0);
}
export function canSubmit(state: State, missionId: string): boolean {
  const mission = state.missions.find((m) => m.id === missionId);
  return (
    !!mission &&
    !mission.archived &&
    !isExpired(mission) &&
    !state.submissions.some((s) => s.missionId === missionId && s.status !== 'rejected')
  );
}
export function submitEvidence(
  state: State,
  missionId: string,
  url: string,
  description: string,
  id: string,
  now: string,
): State {
  if (state.submissions.length >= 2000)
    throw new Error(
      'Your contribution record has reached 2000 submissions. Contact the Keepers before submitting more evidence.',
    );
  const normalized = normalizeEvidence(url);
  if (!canSubmit(state, missionId))
    throw new Error('This mission already has an active submission or is closed.');
  if (!normalized) throw new Error('Use a full link beginning with https:// or http://.');
  if (description.trim().length < 20 || description.trim().length > 2000)
    throw new Error('Describe your contribution in 20 to 2000 characters.');
  if (state.submissions.some((s) => normalizeEvidence(s.url) === normalized))
    throw new Error(
      'This link has already been submitted. Use new evidence for this contribution.',
    );
  const mission = state.missions.find((m) => m.id === missionId)!;
  const submission: Submission = {
    id,
    missionId,
    missionTitle: mission.title,
    points: mission.points,
    url: normalized,
    description: description.trim(),
    createdAt: now,
    status: 'pending',
    reason: 'Evidence received. Awaiting a Keepers review.',
    reviewedAt: null,
    decisions: [],
  };
  return { ...state, submissions: [submission, ...state.submissions] };
}

export function reviewSubmission(
  state: State,
  id: string,
  status: Exclude<Status, 'pending'>,
  reason: string,
  now: string,
): State {
  if (reason.trim().length < 10 || reason.trim().length > 1000)
    throw new Error('Give a reason in 10 to 1000 characters.');
  const submission = state.submissions.find((s) => s.id === id);
  if (!submission) throw new Error('Submission not found.');
  if (submission.status !== 'pending' && submission.status !== 'review')
    throw new Error('This submission already has a final decision.');
  return {
    ...state,
    submissions: state.submissions.map((s) =>
      s.id !== id
        ? s
        : {
            ...s,
            status,
            reason: reason.trim(),
            reviewedAt: now,
            decisions: [...s.decisions, { status, reason: reason.trim(), at: now }],
          },
    ),
  };
}

export function validateMission(mission: Mission): void {
  if (!mission.title.trim() || mission.title.trim().length > 100)
    throw new Error('The title must contain 1 to 100 characters.');
  if (mission.description.trim().length < 20 || mission.description.length > 2000)
    throw new Error('The description must contain 20 to 2000 characters.');
  if (!categories.includes(mission.category)) throw new Error('Select a valid category.');
  if (!Number.isInteger(mission.points) || mission.points < 1 || mission.points > 1000)
    throw new Error('Points must be a whole number between 1 and 1000.');
  if (!mission.effort.trim() || mission.effort.length > 40)
    throw new Error('Enter the estimated time.');
  if (mission.verification === 'visit' && !mission.actionUrl?.trim())
    throw new Error('Add a mission link for an automatic visit.');
  if (
    mission.actionUrl &&
    (mission.actionUrl.length > 2048 ||
      !normalizeEvidence(mission.actionUrl) ||
      new URL(mission.actionUrl.trim()).protocol !== 'https:')
  )
    throw new Error('Use a full mission link beginning with https://.');
  if (
    !mission.requirements.length ||
    mission.requirements.length > 8 ||
    mission.requirements.some((r) => !r.trim() || r.length > 300)
  )
    throw new Error('Add 1 to 8 requirements, each up to 300 characters.');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(mission.deadline) ||
    !Number.isFinite(Date.parse(`${mission.deadline}T23:59:59`)) ||
    isExpired(mission)
  )
    throw new Error('Choose a closing date of today or later.');
}

export function saveMission(state: State, mission: Mission): State {
  validateMission(mission);
  const clean = {
    ...mission,
    title: mission.title.trim(),
    description: mission.description.trim(),
    effort: mission.effort.trim(),
    actionUrl: mission.actionUrl?.trim() || undefined,
    requirements: mission.requirements.map((r) => r.trim()),
  };
  const exists = state.missions.some((m) => m.id === mission.id);
  if (!exists && state.missions.length >= 200)
    throw new Error('The mission board supports up to 200 missions. Edit an existing mission.');
  return {
    ...state,
    missions: exists
      ? state.missions.map((m) => (m.id === mission.id ? clean : m))
      : [clean, ...state.missions],
  };
}

export function parseState(raw: string): State {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('Invalid data.');
  const s = value as State;
  if (
    s.version !== 1 ||
    typeof s.profile !== 'string' ||
    !s.profile.trim() ||
    s.profile.length > 40 ||
    !Array.isArray(s.missions) ||
    !Array.isArray(s.submissions) ||
    s.missions.length > 200 ||
    s.submissions.length > 2000
  )
    throw new Error('Invalid data format.');
  const ids = new Set<string>();
  for (const m of s.missions) {
    // Migrate built-in Spanish content without resetting progress or rewriting custom text.
    if (m && typeof m === 'object') {
      m.category = translateLegacy(m.category) as Category;
      if (builtInMissionIds.has(m.id)) {
        m.title = translateLegacy(m.title);
        m.description = translateLegacy(m.description);
        if (Array.isArray(m.requirements)) m.requirements = m.requirements.map(translateLegacy);
      }
    }
    if (
      !m ||
      typeof m.id !== 'string' ||
      ids.has(m.id) ||
      typeof m.title !== 'string' ||
      typeof m.description !== 'string' ||
      !categories.includes(m.category) ||
      !Number.isInteger(m.points) ||
      m.points < 1 ||
      m.points > 1000 ||
      typeof m.effort !== 'string' ||
      typeof m.deadline !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(m.deadline) ||
      !Array.isArray(m.requirements) ||
      m.requirements.some((r) => typeof r !== 'string') ||
      typeof m.archived !== 'boolean'
    )
      throw new Error('Invalid missions.');
    ids.add(m.id);
  }
  const submissionIds = new Set<string>();
  for (const sub of s.submissions) {
    if (sub && typeof sub === 'object') {
      if (builtInMissionIds.has(sub.missionId))
        sub.missionTitle = translateLegacy(sub.missionTitle);
      sub.reason = translateLegacy(sub.reason);
    }
    if (
      !sub ||
      typeof sub.id !== 'string' ||
      submissionIds.has(sub.id) ||
      !ids.has(sub.missionId) ||
      typeof sub.missionTitle !== 'string' ||
      typeof sub.description !== 'string' ||
      !Number.isInteger(sub.points) ||
      sub.points < 1 ||
      sub.points > 1000 ||
      typeof sub.url !== 'string' ||
      !normalizeEvidence(sub.url) ||
      !Object.hasOwn(statusLabels, sub.status) ||
      typeof sub.reason !== 'string' ||
      !Number.isFinite(Date.parse(sub.createdAt)) ||
      !(sub.reviewedAt === null || Number.isFinite(Date.parse(sub.reviewedAt))) ||
      !Array.isArray(sub.decisions) ||
      sub.decisions.some(
        (d) =>
          !d ||
          !Object.hasOwn(statusLabels, d.status) ||
          typeof d.reason !== 'string' ||
          !Number.isFinite(Date.parse(d.at)),
      )
    )
      throw new Error('Invalid submissions.');
    submissionIds.add(sub.id);
  }
  return s;
}
