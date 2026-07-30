'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Challenge, Category, Difficulty } from '@/types/database';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { CategoryBadge, DifficultyBadge } from '@/components/ui/Badge';
import Badge from '@/components/ui/Badge';

const CATEGORIES: Category[] = ['Web', 'Forensics', 'Pwn', 'Crypto', 'Reverse', 'Misc'];
const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

interface ChallengeForm {
  title: string;
  category: Category;
  difficulty: Difficulty;
  description: string;
  points: number;
  flag: string;
  file_url: string;
  author: string;
  is_visible: boolean;
}

const emptyForm: ChallengeForm = {
  title: '', category: 'Web', difficulty: 'Medium', description: '',
  points: 100, flag: '', file_url: '', author: '', is_visible: true,
};

export default function AdminChallengesPage() {
  const supabase = createClient();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ChallengeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadChallenges(); }, []);

  const loadChallenges = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('challenges')
      .select('*')
      .order('created_at', { ascending: false });
    setChallenges((data || []) as Challenge[]);
    setLoading(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (c: Challenge) => {
    setEditingId(c.id);
    setForm({
      title: c.title,
      category: c.category,
      difficulty: c.difficulty || 'Medium',
      description: c.description,
      points: c.points,
      flag: c.flag || '',
      file_url: c.file_url || '',
      author: c.author,
      is_visible: c.is_visible ?? true,
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        difficulty: form.difficulty,
        description: form.description.trim(),
        points: form.points,
        flag: form.flag.trim(),
        file_url: form.file_url.trim() || null,
        author: form.author.trim(),
        is_visible: form.is_visible,
      };

      if (editingId) {
        const { error } = await supabase.from('challenges').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('challenges').insert(payload);
        if (error) throw error;
      }

      setModalOpen(false);
      await loadChallenges();
    } catch (err: any) {
      setError(err.message || 'Failed to save challenge.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this challenge? This cannot be undone.')) return;
    await supabase.from('challenges').delete().eq('id', id);
    await loadChallenges();
  };

  const toggleVisibility = async (id: string, current: boolean) => {
    await supabase.from('challenges').update({ is_visible: !current }).eq('id', id);
    await loadChallenges();
  };

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-600" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Challenges</h1>
          <p className="text-sm text-zinc-500 mt-1">{challenges.length} challenges</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" />
          New Challenge
        </Button>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900/50 border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4 font-medium text-zinc-500">Title</th>
                <th className="py-3 px-4 font-medium text-zinc-500">Category</th>
                <th className="py-3 px-4 font-medium text-zinc-500">Difficulty</th>
                <th className="py-3 px-4 font-medium text-zinc-500 text-center">Points</th>
                <th className="py-3 px-4 font-medium text-zinc-500 text-center">Visible</th>
                <th className="py-3 px-4 font-medium text-zinc-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {challenges.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-zinc-200 max-w-[200px] truncate">{c.title}</td>
                  <td className="py-3 px-4"><CategoryBadge category={c.category} /></td>
                  <td className="py-3 px-4">{c.difficulty ? <DifficultyBadge difficulty={c.difficulty} /> : '—'}</td>
                  <td className="py-3 px-4 text-center text-zinc-300">{c.points}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => toggleVisibility(c.id, c.is_visible)}
                      className={`p-1 rounded transition-colors ${c.is_visible ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-zinc-600 hover:bg-zinc-800'}`}
                      aria-label={c.is_visible ? 'Hide challenge' : 'Show challenge'}
                    >
                      {c.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                        aria-label="Edit challenge"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        aria-label="Delete challenge"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Challenge' : 'New Challenge'}>
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>
          )}

          <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Challenge title" />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-300">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 outline-none"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-300">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })}
                className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 outline-none"
              >
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-300">Description</label>
            <textarea
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Challenge description..."
              rows={4}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-colors resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Points" type="number" required min={1} value={form.points} onChange={(e) => setForm({ ...form, points: parseInt(e.target.value) || 0 })} />
            <Input label="Author" required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Author name" />
          </div>

          <Input
            label="Flag"
            required
            value={form.flag}
            onChange={(e) => setForm({ ...form, flag: e.target.value })}
            placeholder="TCF{flag_here}"
            className="font-[family-name:var(--font-mono)]"
          />

          <Input label="File URL (optional)" value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="/files/challenge.bin" />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_visible"
              checked={form.is_visible}
              onChange={(e) => setForm({ ...form, is_visible: e.target.checked })}
              className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
            />
            <label htmlFor="is_visible" className="text-sm text-zinc-300">Visible to participants</label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editingId ? 'Save Changes' : 'Create Challenge'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
