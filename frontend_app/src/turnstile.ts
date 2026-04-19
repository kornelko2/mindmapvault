export type TurnstileRenderOptions = {
  sitekey: string;
  theme?: 'auto' | 'light' | 'dark';
  appearance?: 'always' | 'execute' | 'interaction-only';
  retry?: 'auto' | 'never';
  'refresh-expired'?: 'auto' | 'manual' | 'never';
  'refresh-timeout'?: 'auto' | 'manual' | 'never';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
  'timeout-callback'?: () => void;
  'unsupported-callback'?: () => void;
};

export type TurnstileWidget = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove?: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileWidget;
    __turnstileScriptPromise?: Promise<void>;
  }
}

export function getTurnstileSiteKey() {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  return typeof siteKey === 'string' ? siteKey.trim() : '';
}

function getHostedAppHostnames() {
  const configured = import.meta.env.VITE_HOSTED_APP_HOSTNAMES;
  const hostnames = typeof configured === 'string'
    ? configured.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean)
    : [];

  if (hostnames.length > 0) {
    return hostnames;
  }

  return ['app.mindmapvault.com', 'mindmap.marazfamily.eu'];
}

export function isHostedWebLogin() {
  if (typeof window === 'undefined') return false;
  if ('__TAURI_INTERNALS__' in window) return false;
  return getHostedAppHostnames().includes(window.location.hostname.toLowerCase());
}

export function loadTurnstileScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Turnstile is only available in the browser.'));
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (window.__turnstileScriptPromise) {
    return window.__turnstileScriptPromise;
  }

  window.__turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const fail = (message: string, script?: HTMLScriptElement | null) => {
      if (script?.parentNode) {
        script.parentNode.removeChild(script);
      }
      window.__turnstileScriptPromise = undefined;
      reject(new Error(message));
    };

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-turnstile-script="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => fail('Failed to load Turnstile.', existingScript), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.turnstileScript = 'true';
    script.onload = () => resolve();
    script.onerror = () => fail('Failed to load Turnstile.', script);
    document.head.appendChild(script);
  });

  return window.__turnstileScriptPromise;
}
