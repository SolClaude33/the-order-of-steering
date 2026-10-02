import { useState } from 'react';
import { useAuth } from '../lib/auth';
import type { SessionInfo } from '../lib/auth';

export function memberDisplayName(profile: SessionInfo['profile'], fallback: string) {
  return profile?.x?.name || profile?.x?.username || profile?.name || fallback;
}

export function ProfileAvatar({ size, url }: { size: number; url?: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showXPhoto = !!url && failedUrl !== url;
  return (
    <img
      src={showXPhoto ? url : '/assets/branding/pfp-approved-v01.png'}
      alt=""
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={showXPhoto ? () => setFailedUrl(url) : undefined}
    />
  );
}

export function MemberAvatar({ size }: { size: number }) {
  const { profile } = useAuth();
  return <ProfileAvatar size={size} url={profile?.x?.avatarUrl} />;
}
