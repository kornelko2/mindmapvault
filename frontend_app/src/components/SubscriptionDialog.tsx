import { useEffect, useState } from 'react';
import {
  getSubscription,
  createCheckoutSession,
  createPortalSession,
  Subscription,
} from '../api/subscription';

function formatPlanLabel(plan?: string): string {
  return plan === 'paid' ? 'Pro' : 'Free';
}

function formatStatusLabel(status?: string): string {
  return status === 'active' ? 'Active' : 'Free';
}

function formatLimitLabel(bytes?: number): string {
  if (!bytes) return '...';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export function SubscriptionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [sub, setSub] = useState<Subscription>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setError(null);
    setLoading(true);
    getSubscription()
      .then((data) => {
        if (mounted && data) setSub(data);
      })
      .catch((e) => {
        if (mounted) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [open]);

  const handleSubscribe = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const { url } = await createCheckoutSession();
      if (url) window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActionLoading(false);
    }
  };

  const handleManage = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const { url } = await createPortalSession();
      if (url) window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActionLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="subscription-dialog fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="subscription-dialog__panel w-full max-w-xl overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-950 shadow-[0_24px_120px_rgba(15,23,42,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="subscription-dialog__hero border-b border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.2),_transparent_38%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(2,6,23,0.98))] px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="subscription-dialog__pill inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Cloud plan
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-white">Subscription</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">
                Manage your cloud storage tier and billing without interrupting access to encrypted vault data.
              </p>
            </div>
            <button onClick={onClose} className="subscription-dialog__close rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white">Close</button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="subscription-dialog__stat rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Plan</p>
              <p className="mt-2 text-xl font-semibold text-white">{loading ? 'Loading…' : formatPlanLabel(sub.plan)}</p>
            </div>
            <div className="subscription-dialog__stat rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
              <p className="mt-2 text-xl font-semibold text-white">{loading ? 'Loading…' : formatStatusLabel(sub.status)}</p>
            </div>
            <div className="subscription-dialog__stat rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Current limit</p>
              <p className="mt-2 text-xl font-semibold text-white">{loading ? 'Loading…' : formatLimitLabel(sub.current_limit_bytes)}</p>
            </div>
            <div className="subscription-dialog__stat rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Attachment cap</p>
              <p className="mt-2 text-xl font-semibold text-white">{loading ? 'Loading…' : formatLimitLabel(sub.max_attachment_size_bytes)}</p>
            </div>
            <div className="subscription-dialog__stat rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Active shares</p>
              <p className="mt-2 text-xl font-semibold text-white">{loading ? 'Loading…' : sub.max_active_shares ?? '...'}</p>
            </div>
          </div>
        </div>

        <div className="subscription-dialog__body bg-[linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,1))] px-6 py-6">
          {error && (
            <p className="rounded-2xl border border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300 px-4 py-3 text-sm">
              {error}
            </p>
          )}
          {!error && (
            <div className="grid gap-6 lg:grid-cols-[1.25fr_0.9fr]">
              <div className="subscription-dialog__section rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Current subscription</p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  You are on the {loading ? 'Loading…' : formatPlanLabel(sub.plan)} plan
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Your current cloud storage limit is <span className="font-semibold text-slate-100">{loading ? 'Loading…' : formatLimitLabel(sub.current_limit_bytes)}</span>.
                </p>
                <ul className="mt-4 space-y-3 text-sm text-slate-200">
                  <li>Current status: {loading ? 'Loading…' : formatStatusLabel(sub.status)}.</li>
                  <li>Paid plan capacity: {formatLimitLabel(sub.paid_yearly_limit_bytes)} encrypted cloud storage.</li>
                  <li>Per-attachment cap: {formatLimitLabel(sub.max_attachment_size_bytes)}.</li>
                  <li>Active encrypted share slots: {sub.max_active_shares ?? '...'}.</li>
                  <li>Share attachments: {sub.can_include_attachments_in_shares ? 'included on this plan' : 'upgrade required'}.</li>
                  <li>Billing portal is available for payment methods and invoices.</li>
                </ul>
                {sub.current_period_end && (
                  <p className="mt-4 text-sm text-slate-400">
                    Current period ends on <span className="text-slate-100">{new Date(sub.current_period_end).toLocaleString()}</span>
                  </p>
                )}
                {sub.plan_source && (
                  <p className="mt-4 text-sm text-slate-400">
                    Plan source: <span className="text-slate-100">{sub.plan_source}</span>
                    {sub.manual_override_active ? ' · manual override active' : ''}
                  </p>
                )}
                {loading && <p className="mt-4 text-sm text-slate-400">Loading billing details…</p>}
              </div>

              <div className="subscription-dialog__section rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Current offer</p>
                <p className="mt-3 text-3xl font-semibold text-white">{sub.paid_yearly_price_label ?? '$10/year'}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {sub.plan === 'paid'
                    ? 'Your paid subscription is active. Use the billing portal to manage renewal and payment details.'
                    : 'Upgrade from the free tier to unlock higher cloud capacity while keeping all vault contents encrypted client-side.'}
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    onClick={handleSubscribe}
                    disabled={loading || actionLoading || sub.stripe_ready === false || sub.plan === 'paid'}
                    className="rounded-xl bg-accent px-4 py-3 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
                  >
                    {actionLoading ? 'Opening checkout…' : sub.plan === 'paid' ? 'Already subscribed' : 'Subscribe'}
                  </button>
                  <button
                    onClick={handleManage}
                    disabled={actionLoading || loading}
                    className="rounded-xl border border-slate-600 px-4 py-3 text-sm text-slate-200 transition hover:border-slate-500 disabled:opacity-60"
                  >
                    Manage billing
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SubscriptionDialog;
