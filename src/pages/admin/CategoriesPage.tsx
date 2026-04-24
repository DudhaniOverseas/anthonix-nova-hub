import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Cat {
  id: string; name: string; slug: string; description: string | null;
  parent_id: string | null;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const CategoriesPage = () => {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Cat[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cat | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', parent_id: '' });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    setRows((data as Cat[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', slug: '', description: '', parent_id: '' });
    setOpen(true);
  };
  const openEdit = (c: Cat) => {
    setEditing(c);
    setForm({
      name: c.name, slug: c.slug,
      description: c.description ?? '', parent_id: c.parent_id ?? '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error('Name required');
    setBusy(true);
    const slug = form.slug.trim() || slugify(form.name);
    const payload = {
      name: form.name.slice(0, 100),
      slug,
      description: form.description.slice(0, 500) || null,
      parent_id: form.parent_id || null,
    };
    const { error } = editing
      ? await supabase.from('categories').update(payload).eq('id', editing.id)
      : await supabase.from('categories').insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? 'Category updated' : 'Category created');
    setOpen(false);
    load();
  };

  const del = async (c: Cat) => {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', c.id);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    load();
  };

  const nameById = (id: string | null) => rows.find((r) => r.id === id)?.name ?? '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Categories</h1>
          <p className="text-muted-foreground">Nested taxonomies for posts and courses.</p>
        </div>
        <Button variant="glow" onClick={openNew}><Plus size={16} /> New Category</Button>
      </div>

      <Card className="glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                    No categories yet.
                  </TableCell>
                </TableRow>
              ) : rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.slug}</TableCell>
                  <TableCell className="text-sm">{nameById(c.parent_id)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                    {isAdmin && (
                      <Button size="icon" variant="ghost" onClick={() => del(c)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Category' : 'New Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({ ...f, name, slug: editing ? f.slug : slugify(name) }));
                }}
                maxLength={100}
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
              />
            </div>
            <div>
              <Label>Parent</Label>
              <Select
                value={form.parent_id || 'none'}
                onValueChange={(v) => setForm((f) => ({ ...f, parent_id: v === 'none' ? '' : v }))}
              >
                <SelectTrigger><SelectValue placeholder="No parent" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent</SelectItem>
                  {rows.filter((r) => r.id !== editing?.id).map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3} maxLength={500}
              />
            </div>
            <Button variant="glow" className="w-full" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoriesPage;
