'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
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
}

const defaultSettings: SettingsState = {
  competition_name: 'BL4CKOUT CTF',
  registration_open: '',
  competition_start: '',
  competition_end: '',
  scoreboard_frozen: 'false',
};

export default function AdminSettingsPage() {
  const supabase = createClient();
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    const entries = Object.entries(settings);
    for (const [key, value] of entries) {
      await supabase
        .from('settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-600" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Competition configuration</p>
      </div>

      <Card padding="lg">
        <div className="space-y-5">
          <Input
            label="Competition Name"
            value={settings.competition_name}
            onChange={(e) => setSettings({ ...settings, competition_name: e.target.value })}
          />

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

          <Input
            label="Competition Ends"
            type="datetime-local"
            value={settings.competition_end}
            onChange={(e) => setSettings({ ...settings, competition_end: e.target.value })}
          />

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="scoreboard_frozen"
              checked={settings.scoreboard_frozen === 'true'}
              onChange={(e) => setSettings({ ...settings, scoreboard_frozen: e.target.checked ? 'true' : 'false' })}
              className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
            />
            <label htmlFor="scoreboard_frozen" className="text-sm text-zinc-300">
              Freeze scoreboard
              <span className="block text-xs text-zinc-600">When frozen, the scoreboard stops updating publicly. Solves are still recorded.</span>
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} loading={saving}>
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
            {saved && (
              <span className="text-sm text-emerald-400 animate-fade-in">Settings saved.</span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
