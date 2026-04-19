import { useEffect, useMemo, useState } from 'react';
import accountApi, { type NotificationStateFilter } from '../api/account';
import type {
  NotificationEvent,
  UserAccountSettings,
  UserNotificationSettings,
} from '../types';

const notificationFilters: Array<{ value: NotificationStateFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'saved', label: 'Saved' },
  { value: 'done', label: 'Done' },
];

const dateFormatOptions = [
  { value: 'iso', label: 'ISO (2026-04-18)' },
  { value: 'eu', label: 'EU (18/04/2026)' },
  { value: 'us', label: 'US (04/18/2026)' },
];

const mapLayoutOptions = ['mindmap', 'tree', 'outline', 'kanban'];
const mapThemeOptions = ['system', 'light', 'dark', 'focus'];
const exportFormatOptions = ['cryptmind', 'json', 'markdown', 'png'];

function formatRelativeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatEventLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function cloneSettings(settings: UserAccountSettings): UserAccountSettings {
  return { ...settings };
}

function cloneNotificationSettings(settings: UserNotificationSettings): UserNotificationSettings {
  return { ...settings };
}

export function CloudAccountPanel({ enabled }: { enabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserAccountSettings | null>(null);
  const [draftSettings, setDraftSettings] = useState<UserAccountSettings | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<UserNotificationSettings | null>(null);
  const [draftNotificationSettings, setDraftNotificationSettings] = useState<UserNotificationSettings | null>(null);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [filter, setFilter] = useState<NotificationStateFilter>('unread');
  const [workingNotificationId, setWorkingNotificationId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    setLoading(true);
    setSettingsError(null);
    setInboxError(null);

    Promise.all([
      accountApi.getSettings(),
      accountApi.getNotificationSettings(),
      accountApi.listNotifications(filter, 8),
    ])
      .then(([settingsData, notificationSettingsData, notificationData]) => {
        if (!mounted) return;
        setSettings(settingsData);
        setDraftSettings(cloneSettings(settingsData));
        setNotificationSettings(notificationSettingsData);
        setDraftNotificationSettings(cloneNotificationSettings(notificationSettingsData));
        setNotifications(notificationData);
      })
      .catch((error) => {
        if (!mounted) return;
        const message = error instanceof Error ? error.message : String(error);
        setSettingsError(message);
        setInboxError(message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [enabled, filter]);

  const settingsDirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(draftSettings), [settings, draftSettings]);
  const notificationSettingsDirty = useMemo(
    () => JSON.stringify(notificationSettings) !== JSON.stringify(draftNotificationSettings),
    [notificationSettings, draftNotificationSettings],
  );

  const saveSettings = async () => {
    if (!draftSettings) return;
    setSavingSettings(true);
    setSettingsError(null);
    try {
      const updated = await accountApi.updateSettings({
        locale: draftSettings.locale,
        timezone: draftSettings.timezone,
        date_format: draftSettings.date_format,
        accessibility_reduce_motion: draftSettings.accessibility_reduce_motion,
        sync_appearance_across_devices: draftSettings.sync_appearance_across_devices,
        default_share_expiry_days: draftSettings.default_share_expiry_days,
        default_include_attachments_on_share: draftSettings.default_include_attachments_on_share,
        default_map_layout: draftSettings.default_map_layout,
        default_map_theme: draftSettings.default_map_theme,
        default_export_format: draftSettings.default_export_format,
        default_node_style_preset: draftSettings.default_node_style_preset,
      });
      setSettings(updated);
      setDraftSettings(cloneSettings(updated));
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingSettings(false);
    }
  };

  const saveNotificationSettings = async () => {
    if (!draftNotificationSettings) return;
    setSavingNotifications(true);
    setSettingsError(null);
    try {
      const updated = await accountApi.updateNotificationSettings({
        inbox_enabled: draftNotificationSettings.inbox_enabled,
        email_enabled: draftNotificationSettings.email_enabled,
        push_enabled: draftNotificationSettings.push_enabled,
        desktop_enabled: draftNotificationSettings.desktop_enabled,
        digest_enabled: draftNotificationSettings.digest_enabled,
        quiet_hours_start: draftNotificationSettings.quiet_hours_start ?? null,
        quiet_hours_end: draftNotificationSettings.quiet_hours_end ?? null,
        allow_preview_local_only: draftNotificationSettings.allow_preview_local_only,
        share_created: draftNotificationSettings.share_created,
        share_revoked: draftNotificationSettings.share_revoked,
        attachment_upload_failures: draftNotificationSettings.attachment_upload_failures,
        billing_notices: draftNotificationSettings.billing_notices,
        security_alerts: draftNotificationSettings.security_alerts,
        admin_messages: draftNotificationSettings.admin_messages,
        collaboration_mentions: draftNotificationSettings.collaboration_mentions,
      });
      setNotificationSettings(updated);
      setDraftNotificationSettings(cloneNotificationSettings(updated));
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingNotifications(false);
    }
  };

  const refreshNotifications = async (nextFilter = filter) => {
    try {
      const items = await accountApi.listNotifications(nextFilter, 8);
      setNotifications(items);
      setInboxError(null);
    } catch (error) {
      setInboxError(error instanceof Error ? error.message : String(error));
    }
  };

  const updateNotificationState = async (
    notificationId: string,
    action: 'read' | 'saved' | 'done',
    value: boolean,
  ) => {
    setWorkingNotificationId(notificationId);
    try {
      if (action === 'read') {
        await accountApi.markNotificationRead(notificationId, value);
      } else if (action === 'saved') {
        await accountApi.markNotificationSaved(notificationId, value);
      } else {
        await accountApi.markNotificationDone(notificationId, value);
      }
      await refreshNotifications();
    } catch (error) {
      setInboxError(error instanceof Error ? error.message : String(error));
    } finally {
      setWorkingNotificationId(null);
    }
  };

  const markAllRead = async () => {
    setWorkingNotificationId('all');
    try {
      await accountApi.markAllNotificationsRead();
      await refreshNotifications();
    } catch (error) {
      setInboxError(error instanceof Error ? error.message : String(error));
    } finally {
      setWorkingNotificationId(null);
    }
  };

  if (!enabled) return null;

  return (
    <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Cloud account
      </span>

      {settingsError && (
        <p className="mb-3 rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#fca5a5' }}>
          {settingsError}
        </p>
      )}

      <div className="rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Synced defaults</h3>
          <button
            type="button"
            onClick={() => { void saveSettings(); }}
            disabled={!settingsDirty || savingSettings || loading || !draftSettings}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {savingSettings ? 'Saving...' : 'Save'}
          </button>
        </div>

        {draftSettings && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Locale
              <input
                type="text"
                value={draftSettings.locale}
                onChange={(event) => setDraftSettings({ ...draftSettings, locale: event.target.value })}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
              />
            </label>
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Timezone
              <input
                type="text"
                value={draftSettings.timezone}
                onChange={(event) => setDraftSettings({ ...draftSettings, timezone: event.target.value })}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
              />
            </label>
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Date format
              <select
                value={draftSettings.date_format}
                onChange={(event) => setDraftSettings({ ...draftSettings, date_format: event.target.value })}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
              >
                {dateFormatOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Share expiry days
              <input
                type="number"
                min={1}
                max={365}
                value={draftSettings.default_share_expiry_days}
                onChange={(event) => setDraftSettings({ ...draftSettings, default_share_expiry_days: Number(event.target.value) || 1 })}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
              />
            </label>
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Default map layout
              <select
                value={draftSettings.default_map_layout}
                onChange={(event) => setDraftSettings({ ...draftSettings, default_map_layout: event.target.value })}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
              >
                {mapLayoutOptions.map((option) => (
                  <option key={option} value={option}>{formatEventLabel(option)}</option>
                ))}
              </select>
            </label>
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Default map theme
              <select
                value={draftSettings.default_map_theme}
                onChange={(event) => setDraftSettings({ ...draftSettings, default_map_theme: event.target.value })}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
              >
                {mapThemeOptions.map((option) => (
                  <option key={option} value={option}>{formatEventLabel(option)}</option>
                ))}
              </select>
            </label>
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Export format
              <select
                value={draftSettings.default_export_format}
                onChange={(event) => setDraftSettings({ ...draftSettings, default_export_format: event.target.value })}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
              >
                {exportFormatOptions.map((option) => (
                  <option key={option} value={option}>{formatEventLabel(option)}</option>
                ))}
              </select>
            </label>
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Node style preset
              <input
                type="text"
                value={draftSettings.default_node_style_preset}
                onChange={(event) => setDraftSettings({ ...draftSettings, default_node_style_preset: event.target.value })}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
              />
            </label>
            <label className="col-span-full flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={draftSettings.default_include_attachments_on_share}
                onChange={(event) => setDraftSettings({ ...draftSettings, default_include_attachments_on_share: event.target.checked })}
              />
              Include attachments in new encrypted shares by default
            </label>
            <label className="col-span-full flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={draftSettings.accessibility_reduce_motion}
                onChange={(event) => setDraftSettings({ ...draftSettings, accessibility_reduce_motion: event.target.checked })}
              />
              Reduce motion for this synced account profile
            </label>
            <label className="col-span-full flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={draftSettings.sync_appearance_across_devices}
                onChange={(event) => setDraftSettings({ ...draftSettings, sync_appearance_across_devices: event.target.checked })}
              />
              Sync appearance defaults across devices
            </label>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Notification preferences</h3>
          <button
            type="button"
            onClick={() => { void saveNotificationSettings(); }}
            disabled={!notificationSettingsDirty || savingNotifications || loading || !draftNotificationSettings}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {savingNotifications ? 'Saving...' : 'Save'}
          </button>
        </div>

        {draftNotificationSettings && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={draftNotificationSettings.inbox_enabled} onChange={(event) => setDraftNotificationSettings({ ...draftNotificationSettings, inbox_enabled: event.target.checked })} />
              Inbox enabled
            </label>
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={draftNotificationSettings.desktop_enabled} onChange={(event) => setDraftNotificationSettings({ ...draftNotificationSettings, desktop_enabled: event.target.checked })} />
              Desktop alerts
            </label>
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={draftNotificationSettings.email_enabled} onChange={(event) => setDraftNotificationSettings({ ...draftNotificationSettings, email_enabled: event.target.checked })} />
              Email alerts
            </label>
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={draftNotificationSettings.digest_enabled} onChange={(event) => setDraftNotificationSettings({ ...draftNotificationSettings, digest_enabled: event.target.checked })} />
              Digest email
            </label>
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Quiet hours start
              <input
                type="time"
                value={draftNotificationSettings.quiet_hours_start ?? ''}
                onChange={(event) => setDraftNotificationSettings({ ...draftNotificationSettings, quiet_hours_start: event.target.value || null })}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
              />
            </label>
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Quiet hours end
              <input
                type="time"
                value={draftNotificationSettings.quiet_hours_end ?? ''}
                onChange={(event) => setDraftNotificationSettings({ ...draftNotificationSettings, quiet_hours_end: event.target.value || null })}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
              />
            </label>
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={draftNotificationSettings.share_created} onChange={(event) => setDraftNotificationSettings({ ...draftNotificationSettings, share_created: event.target.checked })} />
              Share created events
            </label>
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={draftNotificationSettings.share_revoked} onChange={(event) => setDraftNotificationSettings({ ...draftNotificationSettings, share_revoked: event.target.checked })} />
              Share revoked events
            </label>
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={draftNotificationSettings.attachment_upload_failures} onChange={(event) => setDraftNotificationSettings({ ...draftNotificationSettings, attachment_upload_failures: event.target.checked })} />
              Attachment failure events
            </label>
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={draftNotificationSettings.billing_notices} onChange={(event) => setDraftNotificationSettings({ ...draftNotificationSettings, billing_notices: event.target.checked })} />
              Billing notices
            </label>
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={draftNotificationSettings.security_alerts} onChange={(event) => setDraftNotificationSettings({ ...draftNotificationSettings, security_alerts: event.target.checked })} />
              Security alerts
            </label>
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={draftNotificationSettings.collaboration_mentions} onChange={(event) => setDraftNotificationSettings({ ...draftNotificationSettings, collaboration_mentions: event.target.checked })} />
              Collaboration mentions
            </label>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Pager inbox</h3>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as NotificationStateFilter)}
              className="rounded-lg px-2 py-1.5 text-xs"
              style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
            >
              {notificationFilters.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => { void markAllRead(); }}
              disabled={workingNotificationId === 'all' || notifications.length === 0}
              className="rounded-lg px-2 py-1.5 text-xs font-semibold transition disabled:opacity-50"
              style={{ background: 'var(--surface-1)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}
            >
              {workingNotificationId === 'all' ? 'Updating...' : 'Mark all read'}
            </button>
          </div>
        </div>

        {inboxError && (
          <p className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#fca5a5' }}>
            {inboxError}
          </p>
        )}

        <div className="mt-3 space-y-2">
          {notifications.length === 0 && (
            <p className="rounded-lg px-3 py-3 text-sm" style={{ background: 'var(--surface-1)', color: 'var(--text-muted)' }}>
              No pager items for this filter yet.
            </p>
          )}

          {notifications.map((notification) => (
            <div key={notification.id} className="rounded-lg px-3 py-3" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-light)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {notification.object_label_safe || formatEventLabel(notification.event_type)}
                    </span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ background: notification.unread ? 'rgba(99, 102, 241, 0.16)' : 'var(--surface-2)', color: notification.unread ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {notification.unread ? 'Unread' : 'Read'}
                    </span>
                    {notification.saved && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ background: 'rgba(245, 158, 11, 0.14)', color: '#f59e0b' }}>Saved</span>}
                    {notification.done && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ background: 'rgba(16, 185, 129, 0.14)', color: '#10b981' }}>Done</span>}
                  </div>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {formatEventLabel(notification.event_type)} · {formatEventLabel(notification.category)} · {formatRelativeDate(notification.created_at)}
                  </p>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                  {notification.priority}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { void updateNotificationState(notification.id, 'read', notification.unread); }}
                  disabled={workingNotificationId === notification.id}
                  className="rounded-lg px-2 py-1 text-xs transition disabled:opacity-50"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}
                >
                  {notification.unread ? 'Mark read' : 'Mark unread'}
                </button>
                <button
                  type="button"
                  onClick={() => { void updateNotificationState(notification.id, 'saved', !notification.saved); }}
                  disabled={workingNotificationId === notification.id}
                  className="rounded-lg px-2 py-1 text-xs transition disabled:opacity-50"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}
                >
                  {notification.saved ? 'Unsave' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => { void updateNotificationState(notification.id, 'done', !notification.done); }}
                  disabled={workingNotificationId === notification.id}
                  className="rounded-lg px-2 py-1 text-xs transition disabled:opacity-50"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}
                >
                  {notification.done ? 'Reopen' : 'Done'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CloudAccountPanel;