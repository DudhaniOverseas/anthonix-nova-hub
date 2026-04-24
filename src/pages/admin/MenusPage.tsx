import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';

type Location = 'header' | 'footer' | 'none';
type ItemKind = 'page' | 'post' | 'category' | 'custom' | 'course';

interface Menu { id: string; name: string; slug: string; location: Location; }
interface MenuItem {
  id: string; menu_id: string; parent_id: string | null;
  kind: ItemKind; label: string; url: string | null; ref_id: string | null;
  position: number; open_in_new: boolean;
}
interface RefRow { id: string; label: string; }

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const MenusPage = () => {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [activeMenu, setActiveMenu] = useState<Menu | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [pages, setPages] = useState<RefRow[]>([]);
  const [posts, setPosts] = useState<RefRow[]>([]);
  const [cats, setCats] = useState<RefRow[]>([]);
  const [courses, setCourses] = useState<RefRow[]>([]);

  const [menuDialog, setMenuDialog] = useState(false);
  const [menuForm, setMenuForm] = useState({ name: '', slug: '', location: 'none' as Location });

  const [itemDialog, setItemDialog] = useState(false);
  const [itemForm, setItemForm] = useState({
    kind: 'custom' as ItemKind, label: '', url: '', ref_id: '', open_in_new: false,
  });

  const loadMenus = async () => {
    const { data } = await supabase.from('menus').select('*').order('name');
    const list = (data as Menu[]) ?? [];
    setMenus(list);
    if (!activeMenu && list.length) setActiveMenu(list[0]);
  };
  const loadItems = async (menuId: string) => {
    const { data } = await supabase
      .from('menu_items').select('*').eq('menu_id', menuId).order('position');
    setItems((data as MenuItem[]) ?? []);
  };
  const loadRefs = async () => {
    const [p, b, c, k] = await Promise.all([
      supabase.from('pages').select('id,title').order('title'),
      supabase.from('posts').select('id,title').order('title'),
      supabase.from('categories').select('id,name').order('name'),
      supabase.from('courses').select('id,title').order('title'),
    ]);
    setPages((p.data ?? []).map((r: any) => ({ id: r.id, label: r.title })));
    setPosts((b.data ?? []).map((r: any) => ({ id: r.id, label: r.title })));
    setCats((c.data ?? []).map((r: any) => ({ id: r.id, label: r.name })));
    setCourses((k.data ?? []).map((r: any) => ({ id: r.id, label: r.title })));
  };

  useEffect(() => { loadMenus(); loadRefs(); }, []);
  useEffect(() => { if (activeMenu) loadItems(activeMenu.id); }, [activeMenu]);

  const createMenu = async () => {
    if (!menuForm.name.trim()) return toast.error('Name required');
    const slug = menuForm.slug.trim() || slugify(menuForm.name);
    const { data, error } = await supabase.from('menus')
      .insert({ name: menuForm.name.slice(0, 100), slug, location: menuForm.location })
      .select().single();
    if (error) return toast.error(error.message);
    toast.success('Menu created');
    setMenuDialog(false);
    setMenuForm({ name: '', slug: '', location: 'none' });
    await loadMenus();
    setActiveMenu(data as Menu);
  };

  const updateMenuLocation = async (location: Location) => {
    if (!activeMenu) return;
    const { error } = await supabase.from('menus')
      .update({ location }).eq('id', activeMenu.id);
    if (error) return toast.error(error.message);
    toast.success('Location updated');
    setActiveMenu({ ...activeMenu, location });
    loadMenus();
  };

  const deleteMenu = async () => {
    if (!activeMenu || !confirm(`Delete menu "${activeMenu.name}"?`)) return;
    const { error } = await supabase.from('menus').delete().eq('id', activeMenu.id);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    setActiveMenu(null);
    setItems([]);
    loadMenus();
  };

  const refsForKind = (k: ItemKind): RefRow[] => {
    switch (k) {
      case 'page': return pages;
      case 'post': return posts;
      case 'category': return cats;
      case 'course': return courses;
      default: return [];
    }
  };

  const addItem = async () => {
    if (!activeMenu) return;
    if (!itemForm.label.trim()) return toast.error('Label required');
    if (itemForm.kind === 'custom' && !itemForm.url.trim()) return toast.error('URL required');
    if (itemForm.kind !== 'custom' && !itemForm.ref_id) return toast.error('Choose a target');
    const nextPos = items.length ? Math.max(...items.map((i) => i.position)) + 1 : 0;
    const { error } = await supabase.from('menu_items').insert({
      menu_id: activeMenu.id,
      kind: itemForm.kind,
      label: itemForm.label.slice(0, 100),
      url: itemForm.kind === 'custom' ? itemForm.url.slice(0, 500) : null,
      ref_id: itemForm.kind === 'custom' ? null : itemForm.ref_id,
      position: nextPos,
      open_in_new: itemForm.open_in_new,
    });
    if (error) return toast.error(error.message);
    toast.success('Item added');
    setItemDialog(false);
    setItemForm({ kind: 'custom', label: '', url: '', ref_id: '', open_in_new: false });
    loadItems(activeMenu.id);
  };

  const move = async (item: MenuItem, dir: -1 | 1) => {
    const idx = items.findIndex((i) => i.id === item.id);
    const swap = items[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from('menu_items').update({ position: swap.position }).eq('id', item.id),
      supabase.from('menu_items').update({ position: item.position }).eq('id', swap.id),
    ]);
    if (activeMenu) loadItems(activeMenu.id);
  };

  const removeItem = async (it: MenuItem) => {
    if (!confirm(`Remove "${it.label}"?`)) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', it.id);
    if (error) return toast.error(error.message);
    if (activeMenu) loadItems(activeMenu.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Menus</h1>
          <p className="text-muted-foreground">Build navigation for header & footer.</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select
            value={activeMenu?.id ?? ''}
            onValueChange={(v) => setActiveMenu(menus.find((m) => m.id === v) ?? null)}
          >
            <SelectTrigger className="w-56"><SelectValue placeholder="Select menu" /></SelectTrigger>
            <SelectContent>
              {menus.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name} ({m.location})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="glow" onClick={() => setMenuDialog(true)}><Plus size={14} /> New menu</Button>
        </div>
      </div>

      {!activeMenu ? (
        <Card className="glass-card">
          <CardContent className="py-16 text-center text-muted-foreground">
            Create your first menu to start building site navigation.
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="glass-card lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle>Menu settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={activeMenu.name} disabled />
              </div>
              <div>
                <Label>Display location</Label>
                <Select value={activeMenu.location} onValueChange={(v) => updateMenuLocation(v as Location)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not assigned</SelectItem>
                    <SelectItem value="header">Header</SelectItem>
                    <SelectItem value="footer">Footer</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Only one menu can be assigned per location.
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={deleteMenu}>
                <Trash2 size={14} /> Delete menu
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-card lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Items</CardTitle>
              <Button size="sm" variant="glow" onClick={() => setItemDialog(true)}>
                <Plus size={14} /> Add item
              </Button>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-sm text-muted-foreground p-6 border border-dashed border-border rounded-lg text-center">
                  No items in this menu yet.
                </div>
              ) : (
                <ul className="space-y-2">
                  {items.map((it, i) => (
                    <li key={it.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/40">
                      <div className="flex flex-col">
                        <Button size="icon" variant="ghost" className="h-6 w-6"
                          disabled={i === 0} onClick={() => move(it, -1)}>
                          <ArrowUp size={12} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6"
                          disabled={i === items.length - 1} onClick={() => move(it, 1)}>
                          <ArrowDown size={12} />
                        </Button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{it.label}</span>
                          <Badge variant="outline" className="text-[10px]">{it.kind}</Badge>
                          {it.open_in_new && <ExternalLink size={12} className="text-muted-foreground" />}
                        </div>
                        {it.url && (
                          <div className="text-xs text-muted-foreground truncate">{it.url}</div>
                        )}
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeItem(it)}>
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* New menu dialog */}
      <Dialog open={menuDialog} onOpenChange={setMenuDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New menu</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={menuForm.name}
                onChange={(e) => setMenuForm((f) => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
                maxLength={100} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={menuForm.slug}
                onChange={(e) => setMenuForm((f) => ({ ...f, slug: slugify(e.target.value) }))} />
            </div>
            <div>
              <Label>Location</Label>
              <Select value={menuForm.location}
                onValueChange={(v) => setMenuForm((f) => ({ ...f, location: v as Location }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assigned</SelectItem>
                  <SelectItem value="header">Header</SelectItem>
                  <SelectItem value="footer">Footer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="glow" className="w-full" onClick={createMenu}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add item dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add menu item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={itemForm.kind}
                onValueChange={(v) => setItemForm((f) => ({ ...f, kind: v as ItemKind, ref_id: '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="page">Page</SelectItem>
                  <SelectItem value="post">Post</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="course">Course</SelectItem>
                  <SelectItem value="custom">Custom link</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Label</Label>
              <Input value={itemForm.label}
                onChange={(e) => setItemForm((f) => ({ ...f, label: e.target.value }))}
                maxLength={100} />
            </div>
            {itemForm.kind === 'custom' ? (
              <div>
                <Label>URL</Label>
                <Input value={itemForm.url}
                  onChange={(e) => setItemForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://… or /about" maxLength={500} />
              </div>
            ) : (
              <div>
                <Label>Target</Label>
                <Select value={itemForm.ref_id}
                  onValueChange={(v) => setItemForm((f) => ({ ...f, ref_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {refsForKind(itemForm.kind).map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={itemForm.open_in_new}
                onChange={(e) => setItemForm((f) => ({ ...f, open_in_new: e.target.checked }))} />
              Open in new tab
            </label>
            <Button variant="glow" className="w-full" onClick={addItem}>Add</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenusPage;
