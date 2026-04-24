import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

type Status = 'draft' | 'published' | 'archived';
interface Post {
  id: string; title: string; slug: string; excerpt: string | null;
  content: string | null; cover_image_url: string | null; status: Status;
  created_at: string; published_at: string | null;
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const PostsPage = () => {
  const { user, isAdmin } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [form, setForm] = useState({
    title: '', slug: '', excerpt: '', content: '', cover_image_url: '', status: 'draft' as Status,
  });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    setPosts((data as Post[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', slug: '', excerpt: '', content: '', cover_image_url: '', status: 'draft' });
    setOpen(true);
  };
  const openEdit = (p: Post) => {
    setEditing(p);
    setForm({
      title: p.title, slug: p.slug, excerpt: p.excerpt ?? '', content: p.content ?? '',
      cover_image_url: p.cover_image_url ?? '', status: p.status,
    });
    setOpen(true);
  };

  const uploadCover = async (file: File) => {
    const ext = file.name.split('.').pop();
    const path = `posts/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
    setForm((f) => ({ ...f, cover_image_url: pub.publicUrl }));
    toast.success('Cover uploaded');
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    setBusy(true);
    const slug = form.slug.trim() || slugify(form.title);
    const payload: any = {
      title: form.title.trim(),
      slug,
      excerpt: form.excerpt.trim() || null,
      content: form.content || null,
      cover_image_url: form.cover_image_url || null,
      status: form.status,
      author_id: user?.id,
      published_at: form.status === 'published' ? new Date().toISOString() : null,
    };
    const { error } = editing
      ? await supabase.from('posts').update(payload).eq('id', editing.id)
      : await supabase.from('posts').insert(payload);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success('Saved'); setOpen(false); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Deleted'); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Posts</h1>
          <p className="text-muted-foreground">Create and manage blog posts/pages</p>
        </div>
        <Button variant="glow" onClick={openNew}><Plus size={16} /> New Post</Button>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle>All Posts ({posts.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.slug}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'published' ? 'default' : 'secondary'}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                        <Pencil size={16} />
                      </Button>
                      {isAdmin && (
                        <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                          <Trash2 size={16} className="text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Post' : 'New Post'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input maxLength={200} value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input maxLength={200} value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Excerpt</Label>
              <Textarea maxLength={500} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <div className="flex gap-3 items-center">
                <Input type="file" accept="image/*"
                  onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
                {form.cover_image_url && (
                  <img src={form.cover_image_url} alt="cover" className="h-12 w-12 object-cover rounded" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <div className="bg-background rounded-md">
                <ReactQuill theme="snow" value={form.content} onChange={(v) => setForm({ ...form, content: v })} />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="glow" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostsPage;
