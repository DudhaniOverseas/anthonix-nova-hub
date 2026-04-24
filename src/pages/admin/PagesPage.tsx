import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

type Status = 'draft' | 'published' | 'archived';
interface PageRow {
  id: string; title: string; slug: string; content: string | null;
  status: Status; seo_title: string | null; seo_description: string | null;
  created_at: string; published_at: string | null;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const PagesPage = () => {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<PageRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PageRow | null>(null);
  const [form, setForm] = useState({
    title: '', slug: '', content: '', seo_title: '', seo_description: '', status: 'draft' as Status,
  });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('pages').select('*').order('created_at', { ascending: false });
    setRows((data as PageRow[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', slug: '', content: '', seo_title: '', seo_description: '', status: 'draft' });
    setOpen(true);
  };
  const openEdit = (p: PageRow) => {
    setEditing(p);
    setForm({
      title: p.title, slug: p.slug, content: p.content ?? '',
      seo_title: p.seo_title ?? '', seo_description: p.seo_description ?? '', status: p.status,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error('Title required');
    setBusy(true);
    const slug = form.slug.trim() || slugify(form.title);
    const payload = {
      title: form.title.slice(0, 200),
      slug,
      content: form.content,
      seo_title: form.seo_title.slice(0, 200) || null,
      seo_description: form.seo_description.slice(0, 300) || null,
      status: form.status,
      author_id: user?.id ?? null,
      published_at: form.status === 'published' ? new Date().toISOString() : null,
    };
    const { error } = editing
      ? await supabase.from('pages').update(payload).eq('id', editing.id)
      : await supabase.from('pages').insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? 'Page updated' : 'Page created');
    setOpen(false);
    load();
  };

  const del = async (p: PageRow) => {
    if (!confirm(`Delete page "${p.title}"?`)) return;
    const { error } = await supabase.from('pages').delete().eq('id', p.id);
    if (error) return toast.error(error.message);
    toast.success('Page deleted');
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Pages</h1>
          <p className="text-muted-foreground">Static pages like Home, About, Contact.</p>
        </div>
        <Button variant="glow" onClick={openNew}><Plus size={16} /> New Page</Button>
      </div>

      <Card className="glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    No pages yet.
                  </TableCell>
                </TableRow>
              ) : rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">/{p.slug}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'published' ? 'default' : 'outline'}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil size={14} /></Button>
                    {isAdmin && (
                      <Button size="icon" variant="ghost" onClick={() => del(p)}>
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Page' : 'New Page'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((f) => ({
                      ...f, title,
                      slug: editing ? f.slug : slugify(title),
                    }));
                  }}
                  maxLength={200}
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                />
              </div>
            </div>
            <div>
              <Label>Content</Label>
              <ReactQuill theme="snow" value={form.content}
                onChange={(v) => setForm((f) => ({ ...f, content: v }))} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>SEO title</Label>
                <Input
                  value={form.seo_title}
                  onChange={(e) => setForm((f) => ({ ...f, seo_title: e.target.value }))}
                  maxLength={200}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as Status }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>SEO description</Label>
              <Textarea
                value={form.seo_description}
                onChange={(e) => setForm((f) => ({ ...f, seo_description: e.target.value }))}
                rows={2} maxLength={300}
              />
            </div>
            <Button variant="glow" className="w-full" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Update Page' : 'Create Page'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PagesPage;
