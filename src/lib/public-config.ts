const configuredX = import.meta.env.VITE_X_URL?.trim() || '';
let xUrl = '';
try {
  const url = new URL(configuredX);
  if (
    url.protocol === 'https:' &&
    ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(url.hostname) &&
    !url.username &&
    !url.password
  )
    xUrl = url.href;
} catch {
  /* Unconfigured public links stay hidden. */
}

const configuredCA = import.meta.env.VITE_TOKEN_CA?.trim() || '';
export const publicSite = {
  xUrl,
  tokenCA: /^0x[0-9a-fA-F]{40}$/.test(configuredCA) ? configuredCA : '',
};
