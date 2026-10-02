import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth, apiRequest } from './auth';
import type { State, Mission, Submission, Status } from './model';
const empty: State = { version: 1, profile: 'Explorer', missions: [], submissions: [] };
type Store = {
  state: State;
  keeperSubmissions: Submission[];
  loading: boolean;
  warning: string;
  refresh: () => Promise<void>;
  submit: (missionId: string, url: string, description: string) => Promise<void>;
  save: (mission: Mission) => Promise<void>;
  review: (id: string, status: Exclude<Status, 'pending'>, reason: string) => Promise<void>;
  archive: (id: string, archived: boolean) => Promise<void>;
  deleteMission: (id: string) => Promise<void>;
};
const StoreContext = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const identity = auth.profile?.wallet || '';
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;
  const [loaded, setLoaded] = useState<{
    state: State;
    keeperSubmissions: Submission[];
    identity: string;
  }>({ state: empty, keeperSubmissions: [], identity: '' });
  const [loading, setLoading] = useState(true),
    [warning, setWarning] = useState('');
  const refresh = useCallback(async () => {
    const requestIdentity = currentIdentity.current;
    try {
      const data = await apiRequest<{ state: State; keeperSubmissions: Submission[] }>(
        '/state',
        '',
      );
      if (currentIdentity.current === requestIdentity) {
        setLoaded({ ...data, identity: requestIdentity });
        setWarning('');
      }
    } catch (e) {
      setWarning((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (auth.loading) return;
    setLoading(true);
    void refresh();
  }, [identity, auth.loading, auth.ready, refresh]);
  useEffect(() => {
    const focus = () => void refresh();
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, [refresh]);
  async function mutate(path: string, body: unknown) {
    await auth.request(path, body);
    await refresh();
  }
  const state =
    loaded.identity === identity
      ? { ...loaded.state, profile: auth.profile?.name || 'Explorer' }
      : { ...empty, missions: loaded.state.missions };
  return (
    <StoreContext.Provider
      value={{
        state,
        keeperSubmissions: loaded.identity === identity ? loaded.keeperSubmissions : [],
        loading,
        warning,
        refresh,
        submit: (missionId, url, description) =>
          mutate('/submissions', { missionId, url, description }),
        save: (mission) => mutate('/keepers/missions', mission),
        review: (id, status, reason) => mutate('/keepers/review', { id, status, reason }),
        archive: (id, archived) => mutate('/keepers/archive', { id, archived }),
        deleteMission: (id) => mutate('/keepers/delete', { id }),
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('StoreProvider missing');
  return store;
}
