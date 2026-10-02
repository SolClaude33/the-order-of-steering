import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export type WalletProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (accounts: unknown) => void) => void;
  removeListener?: (event: string, listener: (accounts: unknown) => void) => void;
};
export type BrowserWallet = {
  info: { uuid: string; name: string; rdns: string };
  provider: WalletProvider;
};
export type SessionInfo = {
  csrf: string;
  authenticated: boolean;
  ready: boolean;
  isKeeper: boolean;
  config: { xConfigured: boolean; walletType: string };
  profile: null | {
    wallet: string;
    chainId: number;
    name: string;
    createdAt: string;
    x: null | { id: string; username: string; name: string; linkedAt: string };
  };
};
export const blankSession: SessionInfo = {
  csrf: '',
  authenticated: false,
  ready: false,
  isKeeper: false,
  config: { xConfigured: false, walletType: 'evm' },
  profile: null,
};
type Auth = SessionInfo & {
  loading: boolean;
  error: string;
  connecting: boolean;
  showConnect: boolean;
  setShowConnect: (value: boolean) => void;
  refresh: () => Promise<void>;
  request: <T>(path: string, body?: unknown) => Promise<T>;
  signIn: (provider: WalletProvider) => Promise<void>;
  signOut: () => Promise<void>;
  connectX: () => Promise<void>;
};
const AuthContext = createContext<Auth | null>(null);
export async function apiRequest<T>(
  path: string,
  csrf: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api' + path, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      headers:
        body === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch {
    throw new Error('The connection is unavailable. Please try again.');
  }
  const data = await response
    .json()
    .catch(() => ({ error: 'The service is unavailable. Please try again.' }));
  if (!response.ok) throw new Error(data.error || 'We could not complete this request.');
  return data as T;
}
export function useWallets() {
  const [wallets, setWallets] = useState<BrowserWallet[]>([]);
  useEffect(() => {
    function announced(event: Event) {
      const detail = (event as CustomEvent<BrowserWallet>).detail;
      if (!detail?.provider?.request || !detail.info?.uuid) return;
      setWallets((current) =>
        current.some((w) => w.info.uuid === detail.info.uuid) ? current : [...current, detail],
      );
    }
    window.addEventListener('eip6963:announceProvider', announced);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    const legacy = (window as unknown as { ethereum?: WalletProvider }).ethereum;
    if (legacy)
      setWallets((current) =>
        current.length
          ? current
          : [
              {
                info: { uuid: 'browser-wallet', name: 'Browser wallet', rdns: 'injected' },
                provider: legacy,
              },
            ],
      );
    return () => window.removeEventListener('eip6963:announceProvider', announced);
  }, []);
  return wallets.filter((w) => w.info.uuid !== 'browser-wallet' || wallets.length === 1);
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionInfo>(blankSession);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [connecting, setConnecting] = useState(false),
    [showConnect, setShowConnect] = useState(false);
  const current = useRef(session);
  current.current = session;
  const request = useCallback(
    <T,>(path: string, body?: unknown) => apiRequest<T>(path, current.current.csrf, body),
    [],
  );
  const refresh = useCallback(async () => {
    try {
      setSession(await apiRequest<SessionInfo>('/session', ''));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  const initialization = useRef<Promise<SessionInfo> | null>(null);
  useEffect(() => {
    initialization.current ||= apiRequest<SessionInfo>('/session', '');
    let active = true;
    void initialization.current
      .then((value) => {
        if (active) {
          setSession(value);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);
  const signOut = useCallback(async () => {
    const next = await request<SessionInfo>('/auth/logout', {});
    setSession(next);
  }, [request]);
  const bound = useRef<{ provider: WalletProvider; listener: (accounts: unknown) => void } | null>(
    null,
  );
  useEffect(
    () => () => {
      if (bound.current)
        bound.current.provider.removeListener?.('accountsChanged', bound.current.listener);
    },
    [],
  );
  async function signIn(provider: WalletProvider) {
    if (connecting) return;
    setConnecting(true);
    setError('');
    try {
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
      if (!accounts?.[0]) throw new Error('Select an account in your wallet to continue.');
      const chainHex = (await provider.request({ method: 'eth_chainId' })) as string;
      const challenge = await request<{ message: string }>('/auth/challenge', {
        address: accounts[0],
        chainId: Number.parseInt(chainHex, 16),
      });
      const bytes = new TextEncoder().encode(challenge.message);
      const encoded = '0x' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      const signature = await provider.request({
        method: 'personal_sign',
        params: [encoded, accounts[0]],
      });
      const next = await request<SessionInfo>('/auth/verify', {
        message: challenge.message,
        signature,
      });
      setSession(next);
      if (bound.current)
        bound.current.provider.removeListener?.('accountsChanged', bound.current.listener);
      const listener = (value: unknown) => {
        const accounts = value as string[];
        if (!accounts[0] || accounts[0].toLowerCase() !== next.profile?.wallet.toLowerCase()) {
          setSession(blankSession);
          void signOut().catch(() => void refresh());
        }
      };
      provider.on?.('accountsChanged', listener);
      bound.current = { provider, listener };
    } catch (e) {
      const code = (e as { code?: number }).code;
      setError(
        code === 4001
          ? 'The signature was declined. You can try again.'
          : (e as Error).message || 'Your wallet could not connect.',
      );
      throw e;
    } finally {
      setConnecting(false);
    }
  }
  async function connectX() {
    const result = await request<{ url: string }>('/auth/x/start', {});
    window.location.assign(result.url);
  }
  return (
    <AuthContext.Provider
      value={{
        ...session,
        loading,
        error,
        connecting,
        showConnect,
        setShowConnect,
        refresh,
        request,
        signIn,
        signOut,
        connectX,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
export const shortWallet = (wallet: string) => wallet.slice(0, 6) + '…' + wallet.slice(-4);
