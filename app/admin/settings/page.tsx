'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, Snowflake, Flame, Users, Dumbbell, AlertCircle, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface SettingsState {
  competition_name: string;
  registration_open: string;
  competition_start: string;
  competition_end: string;
  scoreboard_frozen: string;
  scoreboard_frozen_at: string;
  platform_mode: string;
  allow_solo_submissions: string;
}

const defaultSettings: SettingsState = {
  competition_name: 'BL4CKOUT CTF',
  registration_open: '',
  competition_start: '',
  competition_end: '',
  scoreboard_frozen: 'false',
  scoreboard_frozen_at: '',
  platform_mode: 'practice',
  allow_solo_submissions: 'true',
};

export default function AdminSettingsPage() {
  const supabase = createClient();
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('settings').select('key, value');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((s: any) => { map[s.key] = s.value; });
      setSettings({
        competition_name: map.competition_name || defaultSettings.competition_name,
        registration_open: map.registration_open || '',
        competition_start: map.competition_start || '',
        competition_end: map.competition_end || '',
        scoreboard_frozen: map.scoreboard_frozen || 'false',
        scoreboard_frozen_at: map.scoreboard_frozen_at || '',
        platform_mode: map.platform_mode || 'practice',
        allow_solo_submissions: map.allow_solo_submissions ?? 'true',
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const entries = Object.entries(settings);
      for (const [key, value] of entries) {
        await supabase
          .from('settings')
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      }
      setMessage({ type: 'success', text: 'Settings saved successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  // When toggling scoreboard freeze, record the timestamp
  const handleFreezeToggle = (freeze: boolean) => {
    setSettings({
      ...settings,
      scoreboard_frozen: freeze ? 'true' : 'false',
      scoreboard_frozen_at: freeze ? new Date().toISOString() : '',
    });
  };

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-600" /></div>;
  }

  const isFrozen = settings.scoreboard_frozen === 'true';
  const isCompetitionMode = settings.platform_mode === 'competition';

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Platform Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Configure platform behavior and competition parameters</p>
      </div>

      {/* Platform Mode */}
      <Card padding="lg">
        <h2 className="text-sm font-semibold text-zinc-200 mb-1 flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-blue-400" />
          Platform Mode
        </h2>
        <p className="text-xs text-zinc-500 mb-4">
          Practice mode allows users to solve challenges at their own pace without a team. Competition mode enforces teams and a live scoreboard.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSettings({ ...settings, platform_mode: 'practice', allow_solo_submissions: 'true' })}
            className={`p-4 rounded-lg border text-left transition-all ${
              !isCompetitionMode
                ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
            }`}
          >
            <Dumbbell className="h-5 w-5 mb-2" />
            <p className="text-sm font-semibold">Practice Mode</p>
            <p className="text-xs mt-1 opacity-75">Solo submissions allowed · Scoreboard optional</p>
          </button>

          <button
            onClick={() => setSettings({ ...settings, platform_mode: 'competition', allow_solo_submissions: 'false' })}
            className={`p-4 rounded-lg border text-left transition-all ${
              isCompetitionMode
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
            }`}
          >
            <Flame className="h-5 w-5 mb-2" />
            <p className="text-sm font-semibold">Competition Mode</p>
            <p className="text-xs mt-1 opacity-75">Team required · Live scoreboard active</p>
          </button>
        </div>

        {!isCompetitionMode && (
          <div className="mt-4 flex items-center gap-3">
            <input
              type="checkbox"
              id="allow_solo"
              checked={settings.allow_solo_submissions === 'true'}
              onChange={(e) => setSettings({ ...settings, allow_solo_submissions: e.target.checked ? 'true' : 'false' })}
              className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
            />
            <label htmlFor="allow_solo" className="text-sm text-zinc-300 cursor-pointer">
              Allow solo flag submissions (without a team)
              <span className="block text-xs text-zinc-600 mt-0.5">When disabled, users still need a team even in practice mode</span>
            </label>
          </div>
        )}
      </Card>

      {/* Competition Identity */}
      <Card padding="lg">
        <h2 className="text-sm font-semibold text-zinc-200 mb-4">Competition Details</h2>
        <div className="space-y-4">
          <Input
            label="Competition Name"
            value={settings.competition_name}
            onChange={(e) => setSettings({ ...settings, competition_name: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Registration Opens"
              type="datetime-local"
              value={settings.registration_open}
              onChange={(e) => setSettings({ ...settings, registration_open: e.target.value })}
            />
            <Input
              label="Competition Starts"
              type="datetime-local"
              value={settings.competition_start}
              onChange={(e) => setSettings({ ...settings, competition_start: e.target.value })}
            />
          </div>
          <Input
            label="Competition Ends"
            type="datetime-local"
            value={settings.competition_end}
            onChange={(e) => setSettings({ ...settings, competition_end: e.target.value })}
          />
        </div>
      </Card>

      {/* Scoreboard Freeze */}
      <Card padding="lg">
        <h2 className="text-sm font-semibold text-zinc-200 mb-1 flex items-center gap-2">
          <Snowflake className="h-4 w-4 text-cyan-400" />
          Scoreboard Freeze
        </h2>
        <p className="text-xs text-zinc-500 mb-4">
          When frozen, the public scoreboard only shows solves that happened <strong>before the freeze time</strong>. New solves are still recorded privately.
        </p>

        {isFrozen && settings.scoreboard_frozen_at && (
          <div className="mb-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-400 flex items-center gap-2">
            <Snowflake className="h-4 w-4 shrink-0" />
            Frozen since {new Date(settings.scoreboard_frozen_at).toLocaleString()}
          </div>
        )}

        <div className="flex items-center gap-3">
          {isFrozen ? (
            <Button variant="secondary" onClick={() => handleFreezeToggle(false)}>
              <Flame className="h-4 w-4" /> Unfreeze Scoreboard
            </Button>
          ) : (
            <Button onClick={() => handleFreezeToggle(true)}>
              <Snowflake className="h-4 w-4" /> Freeze Scoreboard Now
            </Button>
          )}
          <span className="text-xs text-zinc-500">
            {isFrozen ? 'Scoreboard is currently frozen' : 'Scoreboard is live'}
          </span>
        </div>
      </Card>

      {/* Save */}
      {message && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {message.text}
        </div>
      )}

      <Button onClick={handleSave} loading={saving} className="w-full sm:w-auto">
        <Save className="h-4 w-4" />
        Save All Settings
      </Button>
    </div>
  );
}
