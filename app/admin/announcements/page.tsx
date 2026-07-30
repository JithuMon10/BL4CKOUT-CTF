'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2, Trash2, Pencil, Megaphone } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';

export default function AdminAnnouncementsPage() {
  const supabase = createClient();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form & Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadAnnouncements(); }, []);

  const loadAnnouncements = async () => {
    setLoading(true);

    // Clean separate queries to avoid PostgREST relationship ambiguity
    const [announcementsRes, profilesRes] = await Promise.all([
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, username'),
    ]);

    const announcementsData = announcementsRes.data || [];
    const profilesData = profilesRes.data || [];

    const parsed = announcementsData.map((a) => {
      const author = profilesData.find((p) => p.id === a.created_by);
      return {
        ...a,
        author_name: author ? author.username : 'Admin',
      };
    });

    setAnnouncements(parsed);
    setLoading(false);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingId) {
        const { error } = await supabase
          .from('announcements')
          .update({
            title: title.trim(),
            content: content.trim(),
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert({
            title: title.trim(),
            content: content.trim(),
            created_by: user.id,
          });

        if (error) throw error;
      }

      setModalOpen(false);
      await loadAnnouncements();
    } catch (err: any) {
      setError(err.message || 'Failed to save announcement.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    await supabase.from('announcements').delete().eq('id', id);
    await loadAnnouncements();
  };

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-600" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Announcements</h1>
          <p className="text-sm text-zinc-500 mt-1">{announcements.length} published announcements</p>
        </div>
        <Button onClick={openCreateModal} size="sm">
          <Plus className="h-4 w-4" />
          New Announcement
        </Button>
      </div>

      {announcements.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-10 w-10" />}
          title="No announcements published"
          description="Create an announcement to broadcast important updates to all participants."
        />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} padding="md">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-200">{a.title}</h3>
                  <p className="text-sm text-zinc-400 mt-1 whitespace-pre-wrap leading-relaxed">{a.content}</p>
                  <p className="text-xs text-zinc-600 mt-2">
                    Published by <span className="text-zinc-400 font-medium">{a.author_name}</span> · {new Date(a.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditModal(a)}
                    className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                    title="Edit announcement"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete announcement"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Announcement' : 'New Announcement'}>
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>
          )}
          <Input label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Hint released for Forensics challenge!" />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-300">Content</label>
            <textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Announcement details..."
              rows={4}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-colors resize-y"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editingId ? 'Save Changes' : 'Publish Announcement'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
