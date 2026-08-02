'use client';

import { useState, useEffect } from 'react';
import {
  Plus, Loader2, Pencil, Trash2, Eye, EyeOff, Search, Upload,
  Lightbulb, CheckSquare, Square, ChevronDown, Droplets, AlertCircle, CheckCircle
} from 'lucide-react';
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
  title: string; category: Category; difficulty: Difficulty;
  description: string; points: number; flag: string;
  file_url: string; author: string; is_visible: boolean;
  has_runtime: boolean;
  runtime_template: 'nc' | 'http' | 'flask' | 'php' | 'pwn' | 'crypto';
  runtime_folder: string;
  runtime_timeout: number;
  runtime_memory: number;
  runtime_cpu: number;
  runtime_pids: number;
  runtime_port: number;
  runtime_protocol: 'nc' | 'http' | 'tcp';
  dockerfile_override: string;
}

const emptyForm: ChallengeForm = {
  title: '', category: 'Web', difficulty: 'Medium', description: '',
  points: 100, flag: '', file_url: '', author: 'Admin', is_visible: false,
  has_runtime: false,
  runtime_template: 'nc',
  runtime_folder: '',
  runtime_timeout: 30,
  runtime_memory: 64,
  runtime_cpu: 0.1,
  runtime_pids: 30,
  runtime_port: 1337,
  runtime_protocol: 'nc',
  dockerfile_override: '',
};

export default function AdminChallengesPage() {
  const supabase = createClient();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Challenge Form Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ChallengeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Hints Modal
  const [hintsModalOpen, setHintsModalOpen] = useState(false);
  const [activeChallengeForHints, setActiveChallengeForHints] = useState<any | null>(null);
  const [hintsList, setHintsList] = useState<any[]>([]);
  const [newHintText, setNewHintText] = useState('');
  const [newHintCost, setNewHintCost] = useState(0);
  const [hintSaving, setHintSaving] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

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

    setChallenges(challengesData.map((c) => ({
      ...c,
      solves_count: solvesData.filter((s) => s.challenge_id === c.id).length,
      hints_count: hintsData.filter((h) => h.challenge_id === c.id).length,
    })));
    setLoading(false);
  };

  // ── Selection ──────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredChallenges.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredChallenges.map((c) => c.id)));
    }
  };

  // ── Bulk Operations ────────────────────────────────────
  const bulkSetVisibility = async (visible: boolean) => {
    if (!selectedIds.size) return;
    setBulkLoading(true);
    await supabase.from('challenges').update({ is_visible: visible }).in('id', [...selectedIds]);
    setSelectedIds(new Set());
    await loadChallenges();
    showToast('success', `${selectedIds.size} challenge${selectedIds.size > 1 ? 's' : ''} ${visible ? 'published' : 'unpublished'}.`);
    setBulkLoading(false);
  };

  const bulkDelete = async () => {
    if (!selectedIds.size) return;
    setBulkLoading(true);
    setBulkDeleteConfirm(false);
    await supabase.from('challenges').delete().in('id', [...selectedIds]);
    setSelectedIds(new Set());
    await loadChallenges();
    showToast('success', `${selectedIds.size} challenge${selectedIds.size > 1 ? 's' : ''} deleted.`);
    setBulkLoading(false);
  };

  // ── Challenge CRUD ─────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      title: c.title, category: c.category, difficulty: c.difficulty || 'Medium',
      description: c.description, points: c.points, flag: c.flag || '',
      file_url: c.file_url || '', author: c.author || 'Admin', is_visible: c.is_visible ?? false,
      has_runtime: c.has_runtime ?? false,
      runtime_template: c.runtime_template || 'nc',
      runtime_folder: c.runtime_folder || '',
      runtime_timeout: c.runtime_timeout || 30,
      runtime_memory: c.runtime_memory || 64,
      runtime_cpu: c.runtime_cpu || 0.1,
      runtime_pids: c.runtime_pids || 30,
      runtime_port: c.runtime_port || 1337,
      runtime_protocol: c.runtime_protocol || 'nc',
      dockerfile_override: '',
    });
    setError(null);
    setModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Upload failed');

      const newUrls: string[] = data.file_urls || (data.file_url ? data.file_url.split(',').map((s: string) => s.trim()) : []);
      setForm((prev) => {
        const existing = prev.file_url ? prev.file_url.split(',').map((s) => s.trim()).filter(Boolean) : [];
        const combined = Array.from(new Set([...existing, ...newUrls]));
        return { ...prev, file_url: combined.join(', ') };
      });
      showToast('success', `${files.length} file${files.length > 1 ? 's' : ''} uploaded.`);
    } catch (err: any) {
      setError(err.message || 'Error uploading file(s).');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

    const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(), category: form.category, difficulty: form.difficulty,
        description: form.description.trim(), points: form.points, flag: form.flag.trim(),
        file_url: form.file_url.trim() || null, author: form.author.trim() || 'Admin',
        is_visible: form.is_visible,
        has_runtime: form.has_runtime,
        runtime_template: form.runtime_template,
        runtime_folder: form.runtime_folder.trim() || null,
        runtime_timeout: form.runtime_timeout,
        runtime_memory: form.runtime_memory,
        runtime_cpu: form.runtime_cpu,
        runtime_pids: form.runtime_pids,
        runtime_port: form.runtime_port,
        runtime_protocol: form.runtime_protocol,
        dockerfile_override: form.dockerfile_override.trim() || null,
      };

      if (editingId) {
        const { error } = await supabase.from('challenges').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const res = await fetch('/api/admin/challenges/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to create challenge.');
        }
      }

      setModalOpen(false);
      await loadChallenges();
      showToast('success', editingId ? 'Challenge updated.' : 'Challenge created with dynamic runtime.');
    } catch (err: any) {
      setError(err.message || 'Failed to save challenge.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await supabase.from('challenges').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    await loadChallenges();
    showToast('success', `"${deleteTarget.title}" deleted.`);
  };

  const toggleVisibility = async (id: string, current: boolean) => {
    await supabase.from('challenges').update({ is_visible: !current }).eq('id', id);
    await loadChallenges();
  };

  // ── Hints CRUD ─────────────────────────────────────────
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
        challenge_id: activeChallengeForHints.id, hint_text: newHintText.trim(), cost: newHintCost,
      });
      if (error) throw error;
      setNewHintText('');
      setNewHintCost(0);
      const { data } = await supabase.from('hints').select('*').eq('challenge_id', activeChallengeForHints.id).order('created_at', { ascending: true });
      setHintsList(data || []);
      await loadChallenges();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to add hint');
    } finally {
      setHintSaving(false);
    }
  };

  const handleDeleteHint = async (hintId: string) => {
    if (!confirm('Delete this hint? Users who already paid for it will not be refunded.')) return;
    await supabase.from('hints').delete().eq('id', hintId);
    if (activeChallengeForHints) {
      const { data } = await supabase.from('hints').select('*').eq('challenge_id', activeChallengeForHints.id).order('created_at', { ascending: true });
      setHintsList(data || []);
      await loadChallenges();
    }
  };

  const filteredChallenges = challenges.filter((c) => {
    const matchesCat = selectedCat === 'All' || c.category === selectedCat;
    const matchesSearch = (c.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (c.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const allSelected = filteredChallenges.length > 0 && selectedIds.size === filteredChallenges.length;
  const someSelected = selectedIds.size > 0;
  const published = challenges.filter((c) => c.is_visible).length;
  const drafts = challenges.filter((c) => !c.is_visible).length;

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-600" /></div>;
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-lg border text-sm flex items-center gap-2 shadow-xl animate-fade-in ${
          toast.type === 'success' ? 'bg-zinc-900 border-emerald-500/40 text-emerald-400' : 'bg-zinc-900 border-red-500/40 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Challenge Management</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {challenges.length} total ·{' '}
            <span className="text-emerald-400">{published} published</span> ·{' '}
            <span className="text-zinc-500">{drafts} drafts</span>
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" /> New Challenge
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {['All', ...CATEGORIES].map((cat) => (
            <button key={cat} onClick={() => setSelectedCat(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${selectedCat === cat ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search challenges..."
            className="w-full rounded-lg bg-zinc-900 border border-zinc-800 pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 outline-none transition-colors" />
        </div>
      </div>

      {/* Bulk Action Bar */}
      {someSelected && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-700 text-sm animate-fade-in">
          <span className="text-zinc-400 font-medium">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="secondary" size="sm" onClick={() => bulkSetVisibility(true)} loading={bulkLoading}>
              <Eye className="h-3.5 w-3.5" /> Publish All
            </Button>
            <Button variant="secondary" size="sm" onClick={() => bulkSetVisibility(false)} loading={bulkLoading}>
              <EyeOff className="h-3.5 w-3.5" /> Unpublish All
            </Button>
            <Button size="sm" onClick={() => setBulkDeleteConfirm(true)} loading={bulkLoading}
              className="!bg-red-500/10 !border-red-500/30 !text-red-400 hover:!bg-red-500/20">
              <Trash2 className="h-3.5 w-3.5" /> Delete {selectedIds.size}
            </Button>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-zinc-500 hover:text-zinc-300 ml-1">Clear</button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900/50 border-b border-zinc-800">
              <tr>
                <th className="py-3 pl-4 pr-2 w-8">
                  <button onClick={toggleSelectAll} className="text-zinc-500 hover:text-zinc-300 transition-colors" aria-label="Select all">
                    {allSelected ? <CheckSquare className="h-4 w-4 text-emerald-400" /> : <Square className="h-4 w-4" />}
                  </button>
                </th>
                <th scope="col" className="py-3 px-4 font-medium text-zinc-500">Title</th>
                <th scope="col" className="py-3 px-4 font-medium text-zinc-500">Category</th>
                <th scope="col" className="py-3 px-4 font-medium text-zinc-500">Difficulty</th>
                <th scope="col" className="py-3 px-4 font-medium text-zinc-500 text-center">Pts</th>
                <th scope="col" className="py-3 px-4 font-medium text-zinc-500 text-center">Solves</th>
                <th scope="col" className="py-3 px-4 font-medium text-zinc-500 text-center">Hints</th>
                <th scope="col" className="py-3 px-4 font-medium text-zinc-500 text-center">Status</th>
                <th scope="col" className="py-3 px-4 font-medium text-zinc-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredChallenges.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-sm text-zinc-500">No challenges found</td></tr>
              ) : filteredChallenges.map((c) => (
                <tr key={c.id} className={`transition-colors ${selectedIds.has(c.id) ? 'bg-emerald-500/5' : 'hover:bg-zinc-800/30'}`}>
                  <td className="py-3 pl-4 pr-2">
                    <button onClick={() => toggleSelect(c.id)} className="text-zinc-500 hover:text-emerald-400 transition-colors" aria-label={`Select ${c.title}`}>
                      {selectedIds.has(c.id) ? <CheckSquare className="h-4 w-4 text-emerald-400" /> : <Square className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-zinc-200 max-w-[160px] truncate">{c.title}</span>
                      {c.first_blood_at && <Droplets className="h-3 w-3 text-red-400 shrink-0" aria-label="First Blood claimed" />}
                    </div>
                    {c.author && <span className="text-[10px] text-zinc-600">by {c.author}</span>}
                  </td>
                  <td className="py-3 px-4"><CategoryBadge category={c.category} /></td>
                  <td className="py-3 px-4">{c.difficulty ? <DifficultyBadge difficulty={c.difficulty} /> : '—'}</td>
                  <td className="py-3 px-4 text-center text-zinc-300 font-semibold">{c.points}</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-medium text-xs">{c.solves_count}</td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => openHintsModal(c)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs hover:bg-amber-500/20 transition-colors">
                      <Lightbulb className="h-3 w-3" /> {c.hints_count}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => toggleVisibility(c.id, c.is_visible)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                        c.is_visible
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-600'
                      }`}
                      title={c.is_visible ? 'Click to unpublish' : 'Click to publish'}
                    >
                      {c.is_visible ? <><Eye className="h-3 w-3" /> Live</> : <><EyeOff className="h-3 w-3" /> Draft</>}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(c)}
                        className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors" title="Edit challenge">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget({ id: c.id, title: c.title })}
                        className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete challenge">
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

      {/* ── Challenge Form Modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Challenge' : 'New Challenge'}>
        <form onSubmit={handleSave} className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>}

          {/* Draft/Publish at the top for visibility */}
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${form.is_visible ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-900 border-zinc-800'}`}>
            <input type="checkbox" id="is_visible" checked={form.is_visible}
              onChange={(e) => setForm({ ...form, is_visible: e.target.checked })}
              className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500" />
            <label htmlFor="is_visible" className="text-sm text-zinc-300 cursor-pointer">
              {form.is_visible ? '✅ Published — visible to participants' : '📝 Draft — hidden from participants'}
            </label>
          </div>

          <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Challenge title" />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-300">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 outline-none">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-300">Difficulty</label>
              <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })}
                className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 outline-none">
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-300">Description</label>
            <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Challenge description — supports multi-line text..." rows={5}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-colors resize-y" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Points" type="number" required min={1} value={form.points} onChange={(e) => setForm({ ...form, points: parseInt(e.target.value) || 0 })} />
            <Input label="Author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Author name" />
          </div>

          <Input label="Flag" required value={form.flag} onChange={(e) => setForm({ ...form, flag: e.target.value })}
            placeholder="BL4CKOUT{flag_here}" className="font-[family-name:var(--font-mono)]" />

          
          {/* ── RUNTIME CONFIGURATION SECTION ── */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <span>⚡ Interactive Container Runtime</span>
                </h4>
                <p className="text-[11px] text-zinc-400">Launch a dedicated Docker container instance per player</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.has_runtime}
                  onChange={(e) => setForm({ ...form, has_runtime: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            {form.has_runtime && (
              <div className="space-y-4 pt-2 border-t border-slate-800/80 text-xs animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-300">Challenge Template</label>
                    <select
                      value={form.runtime_template}
                      onChange={(e) => {
                        const tmpl = e.target.value as any;
                        const defaultPorts: Record<string, number> = { nc: 1337, http: 80, flask: 5000, php: 80, pwn: 1337, crypto: 1337 };
                        const defaultProtos: Record<string, 'nc' | 'http' | 'tcp'> = { nc: 'nc', http: 'http', flask: 'http', php: 'http', pwn: 'nc', crypto: 'nc' };
                        setForm({
                          ...form,
                          runtime_template: tmpl,
                          runtime_port: defaultPorts[tmpl] || 1337,
                          runtime_protocol: defaultProtos[tmpl] || 'nc',
                        });
                      }}
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 focus:border-cyan-500 outline-none"
                    >
                      <option value="nc">Netcat (socat TCP raw socket)</option>
                      <option value="http">Static HTTP (Nginx Web)</option>
                      <option value="flask">Python Flask (WSGI App)</option>
                      <option value="php">PHP Apache Web</option>
                      <option value="pwn">Pwn (Binary Exploitation)</option>
                      <option value="crypto">Crypto (Python Oracle)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-zinc-300">Folder Name</label>
                    <input
                      type="text"
                      value={form.runtime_folder}
                      onChange={(e) => setForm({ ...form, runtime_folder: e.target.value })}
                      placeholder="e.g. sqli-101 (auto-generated if empty)"
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Timeout (Mins)"
                    type="number"
                    min={5}
                    max={120}
                    value={form.runtime_timeout}
                    onChange={(e) => setForm({ ...form, runtime_timeout: parseInt(e.target.value) || 30 })}
                  />
                  <Input
                    label="Memory (MB)"
                    type="number"
                    min={32}
                    max={1024}
                    value={form.runtime_memory}
                    onChange={(e) => setForm({ ...form, runtime_memory: parseInt(e.target.value) || 64 })}
                  />
                  <Input
                    label="Internal Port"
                    type="number"
                    value={form.runtime_port}
                    onChange={(e) => setForm({ ...form, runtime_port: parseInt(e.target.value) || 1337 })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="CPU Quota (Cores)"
                    type="number"
                    step="0.05"
                    min={0.05}
                    max={2.0}
                    value={form.runtime_cpu}
                    onChange={(e) => setForm({ ...form, runtime_cpu: parseFloat(e.target.value) || 0.1 })}
                  />
                  <Input
                    label="PID Limit"
                    type="number"
                    min={10}
                    max={200}
                    value={form.runtime_pids}
                    onChange={(e) => setForm({ ...form, runtime_pids: parseInt(e.target.value) || 30 })}
                  />
                </div>

                {/* Advanced Dockerfile Override */}
                <details className="pt-1">
                  <summary className="cursor-pointer text-[11px] font-semibold text-zinc-500 hover:text-cyan-400">
                    Advanced: Dockerfile Override
                  </summary>
                  <textarea
                    rows={4}
                    value={form.dockerfile_override}
                    onChange={(e) => setForm({ ...form, dockerfile_override: e.target.value })}
                    placeholder="Custom Dockerfile content (leave empty to use default template Dockerfile)..."
                    className="mt-2 w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2 text-xs font-mono text-zinc-300 outline-none focus:border-cyan-500"
                  />
                </details>
              </div>
            )}
          </div>


          {/* File Upload Section (Supports Multiple Files) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-300">Challenge Attachments (Upload 1 or Multiple Files)</label>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors">
                <Upload className="h-3.5 w-3.5" />
                {uploading ? 'Uploading File(s)...' : 'Choose File(s) to Upload'}
                <input type="file" multiple onChange={handleFileUpload} className="hidden" disabled={uploading} />
              </label>
              <span className="text-xs text-zinc-500">Hold Ctrl/Shift to select multiple files</span>
            </div>

            {/* List of attached files with individual removal */}
            {form.file_url && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Attached Files:</p>
                <div className="flex flex-wrap gap-1.5">
                  {form.file_url.split(',').map((urlStr) => urlStr.trim()).filter(Boolean).map((url, idx) => {
                    const filename = url.split('/').pop()?.split('_').slice(1).join('_') || url.split('/').pop() || `File #${idx + 1}`;
                    return (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-950 border border-zinc-800 text-xs text-emerald-400 font-mono">
                        <span className="max-w-[180px] truncate" title={url}>{filename}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = form.file_url.split(',').map((s) => s.trim()).filter((u) => u !== url).join(', ');
                            setForm((prev) => ({ ...prev, file_url: updated }));
                          }}
                          className="text-zinc-500 hover:text-red-400 transition-colors ml-1 font-sans"
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <Input
              value={form.file_url}
              onChange={(e) => setForm({ ...form, file_url: e.target.value })}
              placeholder="Or paste comma-separated URLs directly..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editingId ? 'Save Changes' : 'Create Challenge'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Challenge">
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
            <p className="font-semibold mb-1">⚠️ This action cannot be undone.</p>
            <p>Deleting <strong>"{deleteTarget?.title}"</strong> will permanently remove it along with all associated solves, hints, and submission logs.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} className="!bg-red-500/20 !border-red-500/40 !text-red-400 hover:!bg-red-500/30">
              <Trash2 className="h-4 w-4" /> Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Bulk Delete Confirmation Modal ── */}
      <Modal open={bulkDeleteConfirm} onClose={() => setBulkDeleteConfirm(false)} title="Bulk Delete Challenges">
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
            <p className="font-semibold mb-1">⚠️ This action cannot be undone.</p>
            <p>You are about to permanently delete <strong>{selectedIds.size} challenge{selectedIds.size > 1 ? 's' : ''}</strong> along with all associated solves, hints, and submission logs.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBulkDeleteConfirm(false)}>Cancel</Button>
            <Button onClick={bulkDelete} className="!bg-red-500/20 !border-red-500/40 !text-red-400 hover:!bg-red-500/30">
              <Trash2 className="h-4 w-4" /> Delete {selectedIds.size} Challenges
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Hints Modal ── */}
      <Modal open={hintsModalOpen} onClose={() => setHintsModalOpen(false)} title={`Hints: ${activeChallengeForHints?.title || ''}`}>
        <div className="space-y-6">
          <form onSubmit={handleAddHint} className="space-y-3 bg-zinc-950 p-4 rounded-lg border border-zinc-800">
            <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Add New Hint</h4>
            <textarea required value={newHintText} onChange={(e) => setNewHintText(e.target.value)}
              placeholder="Enter hint text for participants..." rows={3}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 outline-none resize-y" />
            <div className="flex items-center justify-between gap-4">
              <div className="w-36">
                <Input label="Cost (points)" type="number" min={0} value={newHintCost} onChange={(e) => setNewHintCost(parseInt(e.target.value) || 0)} />
              </div>
              <Button type="submit" size="sm" loading={hintSaving} className="self-end">
                <Plus className="h-3.5 w-3.5" /> Add Hint
              </Button>
            </div>
          </form>

          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Configured Hints ({hintsList.length})</h4>
            {hintsList.length === 0 ? (
              <p className="text-xs text-zinc-500">No hints yet for this challenge.</p>
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
                    <button onClick={() => handleDeleteHint(h.id)}
                      className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete hint">
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
