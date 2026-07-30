'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2, Pencil, Trash2, Eye, EyeOff, Search, Upload, Lightbulb, Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Challenge, Category, Difficulty } from '@/types/database';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { CategoryBadge, DifficultyBadge } from '@/components/ui/Badge';

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
  points: 100, flag: '', file_url: '', author: 'Admin', is_visible: true,
};

export default function AdminChallengesPage() {
  const supabase = createClient();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');

  // Challenge Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ChallengeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hints Modal State
  const [hintsModalOpen, setHintsModalOpen] = useState(false);
  const [activeChallengeForHints, setActiveChallengeForHints] = useState<any | null>(null);
  const [hintsList, setHintsList] = useState<any[]>([]);
  const [newHintText, setNewHintText] = useState('');
  const [newHintCost, setNewHintCost] = useState(0);
  const [hintSaving, setHintSaving] = useState(false);

  useEffect(() => { loadChallenges(); }, []);

  const loadChallenges = async () => {
    setLoading(true);

    const [challengesRes, solvesRes, hintsRes] = await Promise.all([
      supabase.from('challenges').select('*').order('created_at', { ascending: false }),
      supabase.from('solves').select('challenge_id'),
      supabase.from('hints').select('challenge_id'),
    ]);

    const challengesData = challengesRes.data || [];
    const solvesData = solvesRes.data || [];
    const hintsData = hintsRes.data || [];

    const parsed = challengesData.map((c) => {
      const solvesCount = solvesData.filter((s) => s.challenge_id === c.id).length;
      const hintsCount = hintsData.filter((h) => h.challenge_id === c.id).length;
      return {
        ...c,
        solves_count: solvesCount,
        hints_count: hintsCount,
      };
    });

    setChallenges(parsed);
    setLoading(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      title: c.title,
      category: c.category,
      difficulty: c.difficulty || 'Medium',
      description: c.description,
      points: c.points,
      flag: c.flag || '',
      file_url: c.file_url || '',
      author: c.author || 'Admin',
      is_visible: c.is_visible ?? true,
    });
    setError(null);
    setModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Upload failed');

      setForm((prev) => ({ ...prev, file_url: data.file_url }));
    } catch (err: any) {
      setError(err.message || 'Error uploading file.');
    } finally {
      setUploading(false);
    }
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
        author: form.author.trim() || 'Admin',
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

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete challenge "${title}"?`)) return;
    await supabase.from('challenges').delete().eq('id', id);
    await loadChallenges();
  };

  const toggleVisibility = async (id: string, current: boolean) => {
    await supabase.from('challenges').update({ is_visible: !current }).eq('id', id);
    await loadChallenges();
  };

  // Hints Management
  const openHintsModal = async (c: any) => {
    setActiveChallengeForHints(c);
    setNewHintText('');
    setNewHintCost(0);
    setHintsModalOpen(true);

    const { data } = await supabase.from('hints').select('*').eq('challenge_id', c.id).order('created_at', { ascending: true });
    setHintsList(data || []);
  };

  const handleAddHint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHintText.trim() || !activeChallengeForHints) return;

    setHintSaving(true);
    try {
      const { error } = await supabase.from('hints').insert({
        challenge_id: activeChallengeForHints.id,
        hint_text: newHintText.trim(),
        cost: newHintCost,
      });

      if (error) throw error;

      setNewHintText('');
      setNewHintCost(0);
      const { data } = await supabase.from('hints').select('*').eq('challenge_id', activeChallengeForHints.id).order('created_at', { ascending: true });
      setHintsList(data || []);
      await loadChallenges();
    } catch (err: any) {
      alert(err.message || 'Failed to add hint');
    } finally {
      setHintSaving(false);
    }
  };

  const handleDeleteHint = async (hintId: string) => {
    if (!confirm('Delete this hint?')) return;
    await supabase.from('hints').delete().eq('id', hintId);
    if (activeChallengeForHints) {
      const { data } = await supabase.from('hints').select('*').eq('challenge_id', activeChallengeForHints.id).order('created_at', { ascending: true });
      setHintsList(data || []);
      await loadChallenges();
    }
  };

  const filteredChallenges = challenges.filter((c) => {
    const matchesCat = selectedCat === 'All' || c.category === selectedCat;
    const matchesSearch =
      (c.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-600" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Challenge Management</h1>
          <p className="text-sm text-zinc-500 mt-1">{challenges.length} total challenges</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" />
          New Challenge
        </Button>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {['All', ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedCat === cat
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search challenges..."
            className="w-full rounded-lg bg-zinc-900 border border-zinc-800 pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 outline-none transition-colors"
          />
        </div>
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
                <th className="py-3 px-4 font-medium text-zinc-500 text-center">Solves</th>
                <th className="py-3 px-4 font-medium text-zinc-500 text-center">Hints</th>
                <th className="py-3 px-4 font-medium text-zinc-500 text-center">Visible</th>
                <th className="py-3 px-4 font-medium text-zinc-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredChallenges.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-zinc-200 max-w-[180px] truncate">{c.title}</td>
                  <td className="py-3 px-4"><CategoryBadge category={c.category} /></td>
                  <td className="py-3 px-4">{c.difficulty ? <DifficultyBadge difficulty={c.difficulty} /> : '—'}</td>
                  <td className="py-3 px-4 text-center text-zinc-300 font-semibold">{c.points}</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-medium text-xs">{c.solves_count}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => openHintsModal(c)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs hover:bg-amber-500/20 transition-colors"
                    >
                      <Lightbulb className="h-3 w-3" /> {c.hints_count}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => toggleVisibility(c.id, c.is_visible)}
                      className={`p-1 rounded transition-colors ${c.is_visible ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-zinc-600 hover:bg-zinc-800'}`}
                      title={c.is_visible ? 'Hide from players' : 'Show to players'}
                    >
                      {c.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                        title="Edit challenge"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.title)}
                        className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete challenge"
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

      {/* Challenge Modal */}
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

          {/* File Upload Section */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-300">Challenge Attachment File</label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors">
                <Upload className="h-3.5 w-3.5" />
                {uploading ? 'Uploading...' : 'Choose File to Upload'}
                <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} />
              </label>
              <span className="text-xs text-zinc-500">or enter URL directly:</span>
            </div>
            <Input
              value={form.file_url}
              onChange={(e) => setForm({ ...form, file_url: e.target.value })}
              placeholder="https://... or /files/challenge.bin"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
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

      {/* Hints Modal */}
      <Modal open={hintsModalOpen} onClose={() => setHintsModalOpen(false)} title={`Manage Hints: ${activeChallengeForHints?.title || ''}`}>
        <div className="space-y-6">
          {/* Add Hint Form */}
          <form onSubmit={handleAddHint} className="space-y-3 bg-zinc-950 p-4 rounded-lg border border-zinc-800">
            <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Add New Hint</h4>
            <div className="space-y-1.5">
              <textarea
                required
                value={newHintText}
                onChange={(e) => setNewHintText(e.target.value)}
                placeholder="Enter hint text for participants..."
                rows={3}
                className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 outline-none resize-y"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="w-36">
                <Input
                  label="Cost (points)"
                  type="number"
                  min={0}
                  value={newHintCost}
                  onChange={(e) => setNewHintCost(parseInt(e.target.value) || 0)}
                />
              </div>
              <Button type="submit" size="sm" loading={hintSaving} className="self-end">
                <Plus className="h-3.5 w-3.5" /> Add Hint
              </Button>
            </div>
          </form>

          {/* Existing Hints List */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Configured Hints ({hintsList.length})</h4>
            {hintsList.length === 0 ? (
              <p className="text-xs text-zinc-500">No hints added yet for this challenge.</p>
            ) : (
              <div className="space-y-2">
                {hintsList.map((h, i) => (
                  <div key={h.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-amber-400 flex items-center gap-1">
                          <Lightbulb className="h-3.5 w-3.5" /> Hint #{i + 1}
                        </span>
                        {h.cost > 0 && <span className="text-zinc-500">(-{h.cost} pts)</span>}
                      </div>
                      <p className="text-zinc-300 whitespace-pre-wrap">{h.hint_text}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteHint(h.id)}
                      className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete hint"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
