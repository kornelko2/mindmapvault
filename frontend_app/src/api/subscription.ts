import { api } from './client';
import type { AccountCapabilitiesResponse, SubscriptionSummaryResponse } from '../types';

type BillingConfig = {
  stripe_ready: boolean;
  publishable_key: string;
  paid_yearly_price_label: string;
  paid_yearly_limit_bytes: number;
};

export type Subscription = {
  plan?: string;
  status?: string;
  current_limit_bytes?: number;
  current_period_end?: string;
  plan_source?: string;
  manual_override_active?: boolean;
  stripe_ready?: boolean;
  publishable_key?: string;
  paid_yearly_price_label?: string;
  paid_yearly_limit_bytes?: number;
  max_attachment_size_bytes?: number;
  max_active_shares?: number;
  can_create_public_shares?: boolean;
  can_include_attachments_in_shares?: boolean;
  can_use_plaintext_collaboration?: boolean;
  can_export_large_maps?: boolean;
  can_use_admin_controls?: boolean;
};

export async function getBillingConfig(): Promise<Subscription> {
  const billing = await api.get<BillingConfig>('/billing/config');

  // Allow overriding the publishable key with a local env var for development
  // (only the public publishable key, never a secret key).
  const envKey = (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  const publishable = envKey && envKey.length > 0 ? envKey : billing.publishable_key;

  return {
    stripe_ready: billing.stripe_ready,
    publishable_key: publishable,
    paid_yearly_price_label: billing.paid_yearly_price_label,
    paid_yearly_limit_bytes: billing.paid_yearly_limit_bytes,
  };
}

export async function getProfileSubscription(): Promise<Subscription> {
  const subscription = await api.get<SubscriptionSummaryResponse>('/auth/subscription');

  return {
    plan: subscription.subscription_tier,
    status: subscription.subscription_tier === 'paid' ? 'active' : 'free',
    current_limit_bytes: subscription.storage_limit_bytes,
    current_period_end: subscription.subscription_current_period_end,
    plan_source: subscription.plan_source,
    manual_override_active: subscription.manual_override_active,
  };
}

export async function getCapabilities(): Promise<Subscription> {
  const capabilities = await api.get<AccountCapabilitiesResponse>('/auth/capabilities');

  return {
    plan: capabilities.plan_tier,
    current_limit_bytes: capabilities.storage_limit_bytes,
    max_attachment_size_bytes: capabilities.max_attachment_size_bytes,
    max_active_shares: capabilities.max_active_shares,
    can_create_public_shares: capabilities.can_create_public_shares,
    can_include_attachments_in_shares: capabilities.can_include_attachments_in_shares,
    can_use_plaintext_collaboration: capabilities.can_use_plaintext_collaboration,
    can_export_large_maps: capabilities.can_export_large_maps,
    can_use_admin_controls: capabilities.can_use_admin_controls,
  };
}

export async function getSubscription(): Promise<Subscription | null> {
  const [billing, profile, capabilities] = await Promise.all([
    getBillingConfig(),
    getProfileSubscription(),
    getCapabilities(),
  ]);

  return {
    ...billing,
    ...profile,
    ...capabilities,
  };
}

export async function createCheckoutSession(): Promise<{ url: string; session_id?: string }> {
  return api.post<{ url: string; session_id?: string }>('/billing/checkout-session', {});
}

export async function confirmCheckoutSession(sessionId: string): Promise<{ subscription_tier: string; stripe_subscription_status?: string }> {
  return api.post<{ subscription_tier: string; stripe_subscription_status?: string }>('/billing/checkout-session/confirm', {
    session_id: sessionId,
  });
}

export async function createPortalSession(): Promise<{ url: string }> {
  return api.post<{ url: string }>('/billing/portal-session', {});
}

export default { getSubscription, getBillingConfig, getProfileSubscription, getCapabilities, createCheckoutSession, confirmCheckoutSession, createPortalSession };
