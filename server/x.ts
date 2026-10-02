import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { Mission } from '../src/lib/model.ts';

export class PublicError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export type XTokens = { access_token: string; refresh_token?: string; expires_at: number };
export type XConfig = { clientId: string; clientSecret: string; callback: string; key: Buffer };
export function encrypt(value: unknown, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  return Buffer.concat([
    iv,
    cipher.update(JSON.stringify(value)),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString('base64');
}
export function decrypt(value: string, key: Buffer): XTokens {
  const raw = Buffer.from(value, 'base64');
  const cipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
  cipher.setAuthTag(raw.subarray(-16));
  return JSON.parse(
    Buffer.concat([cipher.update(raw.subarray(12, -16)), cipher.final()]).toString(),
  );
}
export class XClient {
  private config: XConfig;
  private request: typeof fetch;
  constructor(config: XConfig, request: typeof fetch = fetch) {
    this.config = config;
    this.request = request;
  }
  async token(params: Record<string, string>): Promise<XTokens> {
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (this.config.clientSecret)
      headers.Authorization =
        'Basic ' +
        Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    else params.client_id = this.config.clientId;
    const response = await this.request('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers,
      body: new URLSearchParams(params),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok)
      throw new PublicError('X authorization expired or was declined. Connect X again.', 502);
    const data = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    if (
      !data.access_token ||
      !data.scope?.split(' ').includes('users.read') ||
      !data.scope?.split(' ').includes('tweet.read')
    )
      throw new PublicError('X did not grant the permissions needed for verification.', 502);
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in || 7200) * 1000,
    };
  }
  async get(path: string, token: string) {
    const response = await this.request('https://api.x.com/2/' + path, {
      headers: { Authorization: 'Bearer ' + token },
      signal: AbortSignal.timeout(12000),
    });
    if (response.status === 429)
      throw new PublicError('X is temporarily rate limited. Try verification again later.', 503);
    if (response.status === 401)
      throw new PublicError('Your X authorization expired. Reconnect X in your profile.', 401);
    if (response.status === 403)
      throw new PublicError('X cannot verify this evidence with the current API access.', 503);
    if (!response.ok)
      throw new PublicError(
        'X could not retrieve this evidence. Check the link and try again.',
        502,
      );
    return response.json();
  }
  async me(
    token: string,
  ): Promise<{ id: string; username: string; name: string; avatarUrl: string | null }> {
    const response = await this.get('users/me?user.fields=profile_image_url', token);
    if (!response.data?.id || !response.data?.username)
      throw new PublicError('X could not confirm your account.', 502);
    let avatarUrl: string | null = null;
    try {
      const image = new URL(response.data.profile_image_url);
      if (
        image.protocol === 'https:' &&
        ['pbs.twimg.com', 'abs.twimg.com'].includes(image.hostname) &&
        !image.username &&
        !image.password &&
        !image.port
      )
        avatarUrl = image.href;
    } catch {
      /* An absent image must not prevent account linking. */
    }
    return {
      id: response.data.id,
      username: response.data.username,
      name: response.data.name || response.data.username,
      avatarUrl,
    };
  }
  async verifyPost(mission: Mission, url: string, userId: string, token: string) {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/^\/(?:[A-Za-z0-9_]+|i\/web)\/status\/(\d+)\/?$/);
    if (
      !['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(parsed.hostname) ||
      !match
    )
      throw new PublicError('Use a public X post link for this mission.');
    const response = await this.get(
      `tweets/${match[1]}?tweet.fields=author_id,created_at,referenced_tweets`,
      token,
    );
    const post = response.data;
    if (!post || post.id !== match[1] || post.author_id !== userId)
      throw new PublicError('This post was not published by your connected X account.');
    if (
      mission.verification === 'x_reply' &&
      !post.referenced_tweets?.some(
        (r: { type: string; id: string }) =>
          r.type === 'replied_to' && r.id === mission.targetPostId,
      )
    )
      throw new PublicError('This post is not a reply to the mission’s target post.');
    if (
      mission.requiredText &&
      !post.text?.toLowerCase().includes(mission.requiredText.toLowerCase())
    )
      throw new PublicError('Your post does not contain the text required by this mission.');
    return { postId: post.id, source: `X API · post ${post.id} · author ${userId}` };
  }
}
