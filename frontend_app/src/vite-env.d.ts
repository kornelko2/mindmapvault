/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLOUD_API_BASE?: string;
  readonly VITE_DISABLE_APP_LOGIN_TURNSTILE?: string;
  readonly VITE_HOSTED_APP_HOSTNAMES?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
