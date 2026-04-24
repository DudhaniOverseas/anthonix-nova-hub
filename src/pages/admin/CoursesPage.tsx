import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Video, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

interface Course {
  id: string; title: string; slug: string; description: string | null;
  thumbnail_url: string | null; price: number; is_published: boolean;
}
interface Lesson {
  id: string; course_id: string; title: string; description: string | null;
  position: number; kind: 'upload' | 'embed'; video_url: string | null;
  video_path: string | null; duration_seconds: number | null;
}

const CoursesPage = () => {
  const { user, isAdmin } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessonsBy, setLessonsBy] = useState<Record<string, Lesson[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Course modal
  const [cOpen, setCOpen] = useState(false);
  const [cEditing, setCEditing] = useState<Course | null>(null);
  const [cForm, setCForm] = useState({ title: '', slug: '', description: '', thumbnail_url: '', price: 0, is_published: false });

  // Lesson modal
  const [lOpen, setLOpen] = useState(false);
  const [lCourse, setLCourse] = useState<Course | null>(null);
  const [lEditing, setLEditing] = useState<Lesson | null>(null);
  const [lForm, setLForm] = useState({ title: '', description: '', position: 0, kind: 'embed' as 'upload' | 'embed', video_url: '', video_path: '' });

  const load = async () => {
    const { data: c } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    setCourses((c as Course[]) ?? []);
    const { data: l } = await supabase.from('lessons').select('*').order('position');
    const map: Record<string, Lesson[]> = {};
    (l ?? []).forEach((les: any) => { (map[les.course_id] ??= []).push(les); });
    setLessonsBy(map);
  };
  useEffect(() => { load(); }, []);

  // ----- Course CRUD -----
  const openNewCourse = () => {
    setCEditing(null);
    setCForm({ title: '', slug: '', description: '', thumbnail_url: '', price: 0, is_published: false });
    setCOpen(true);
  };
  const openEditCourse = (c: Course) => {
    setCEditing(c);
    setCForm({
      title: c.title, slug: c.slug, description: c.description ?? '',
      thumbnail_url: c.thumbnail_url ?? '', price: Number(c.price) || 0, is_published: c.is_published,
    });
    setCOpen(true);
  };
  const uploadThumb = async (file: File) => {
    const ext = file.name.split('.').pop();
    const path = `courses/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
    setCForm((f) => ({ ...f, thumbnail_url: pub.publicUrl }));
  };
  const saveCourse = async () => {
    if (!cForm.title.trim()) { toast.error('Title required'); return; }
    const payload = {
      title: cForm.title.trim(),
      slug: cForm.slug.trim() || slugify(cForm.title),
      description: cForm.description.trim() || null,
      thumbnail_url: cForm.thumbnail_url || null,
      price: cForm.price,
      is_published: cForm.is_published,
    };
    const { error } = cEditing
      ? await supabase.from('courses').update(payload).eq('id', cEditing.id)
      : await supabase.from('courses').insert(payload);
    if (error) toast.error(error.message); else { toast.success('Saved'); setCOpen(false); load(); }
  };
  const removeCourse = async (id: string) => {
    if (!confirm('Delete course and all its lessons?')) return;
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Deleted'); load(); }
  };

  // ----- Lesson CRUD -----
  const openNewLesson = (c: Course) => {
    setLCourse(c); setLEditing(null);
    const next = (lessonsBy[c.id]?.length ?? 0) + 1;
    setLForm({ title: '', description: '', position: next, kind: 'embed', video_url: '', video_path: '' });
    setLOpen(true);
  };
  const openEditLesson = (c: Course, l: Lesson) => {
    setLCourse(c); setLEditing(l);
    setLForm({
      title: l.title, description: l.description ?? '', position: l.position,
      kind: l.kind, video_url: l.video_url ?? '', video_path: l.video_path ?? '',
    });
    setLOpen(true);
  };
  const uploadLessonVideo = async (file: File) => {
    const ext = file.name.split('.').pop();
    const path = `${user?.id}/${crypto.randomUUID()}.${ext}`;
    toast.message('Uploading video…');
    const { error } = await supabase.storage.from('videos').upload(path, file);
    if (error) { toast.error(error.message); return; }
    setLForm((f) => ({ ...f, video_path: path, kind: 'upload' }));
    toast.success('Video uploaded');
  };
  const saveLesson = async () => {
    if (!lCourse) return;
    if (!lForm.title.trim()) { toast.error('Title required'); return; }
    const payload: any = {
      course_id: lCourse.id,
      title: lForm.title.trim(),
      description: lForm.description.trim() || null,
      position: lForm.position,
      kind: lForm.kind,
      video_url: lForm.kind === 'embed' ? (lForm.video_url.trim() || null) : null,
      video_path: lForm.kind === 'upload' ? (lForm.video_path || null) : null,
    };
    const { error } = lEditing
      ? await supabase.from('lessons').update(payload).eq('id', lEditing.id)
      : await supabase.from('lessons').insert(payload);
    if (error) toast.error(error.message); else { toast.success('Saved'); setLOpen(false); load(); }
  };
  const removeLesson = async (id: string) => {
    if (!confirm('Delete lesson?')) return;
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Deleted'); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Courses</h1>
          <p className="text-muted-foreground">Build courses with video lessons</p>
        </div>
        <Button variant="glow" onClick={openNewCourse}><Plus size={16} /> New Course</Button>
      </div>

      <div className="space-y-4">
        {courses.map((c) => (
          <Card key={c.id} className="glass-card">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Button size="icon" variant="ghost"
                  onClick={() => setExpanded((e) => ({ ...e, [c.id]: !e[c.id] }))}>
                  {expanded[c.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </Button>
                {c.thumbnail_url && <img src={c.thumbnail_url} alt="" className="h-10 w-10 rounded object-cover" />}
                <div className="min-w-0">
                  <CardTitle className="text-lg truncate">{c.title}</CardTitle>
                  <div className="text-xs text-muted-foreground flex gap-2 items-center mt-1">
                    <Badge variant={c.is_published ? 'default' : 'secondary'}>
                      {c.is_published ? 'Published' : 'Draft'}
                    </Badge>
                    <span>₹{Number(c.price).toLocaleString()}</span>
                    <span>· {(lessonsBy[c.id] ?? []).length} lessons</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => openNewLesson(c)}><Plus size={14} /> Lesson</Button>
                <Button size="icon" variant="ghost" onClick={() => openEditCourse(c)}><Pencil size={16} /></Button>
                {isAdmin && (
                  <Button size="icon" variant="ghost" onClick={() => removeCourse(c.id)}>
                    <Trash2 size={16} className="text-destructive" />
                  </Button>
                )}
              </div>
            </CardHeader>
            {expanded[c.id] && (
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(lessonsBy[c.id] ?? []).map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>{l.position}</TableCell>
                        <TableCell className="font-medium">{l.title}</TableCell>
                        <TableCell><Badge variant="secondary">{l.kind}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-xs">
                          {l.kind === 'embed' ? l.video_url : l.video_path}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="icon" variant="ghost" onClick={() => openEditLesson(c, l)}><Pencil size={14} /></Button>
                          <Button size="icon" variant="ghost" onClick={() => removeLesson(l.id)}>
                            <Trash2 size={14} className="text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(lessonsBy[c.id] ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No lessons yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
        ))}
        {courses.length === 0 && <p className="text-center text-muted-foreground py-8">No courses yet.</p>}
      </div>

      {/* Course Dialog */}
      <Dialog open={cOpen} onOpenChange={setCOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{cEditing ? 'Edit Course' : 'New Course'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Title</Label>
                <Input maxLength={200} value={cForm.title}
                  onChange={(e) => setCForm({ ...cForm, title: e.target.value, slug: cForm.slug || slugify(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Slug</Label>
                <Input maxLength={200} value={cForm.slug} onChange={(e) => setCForm({ ...cForm, slug: slugify(e.target.value) })} /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label>
              <Textarea maxLength={2000} value={cForm.description} onChange={(e) => setCForm({ ...cForm, description: e.target.value })} /></div>
            <div className="space-y-2"><Label>Thumbnail</Label>
              <div className="flex gap-3 items-center">
                <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadThumb(e.target.files[0])} />
                {cForm.thumbnail_url && <img src={cForm.thumbnail_url} className="h-12 w-12 object-cover rounded" alt="" />}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Price (₹)</Label>
                <Input type="number" min={0} value={cForm.price} onChange={(e) => setCForm({ ...cForm, price: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={cForm.is_published} onCheckedChange={(v) => setCForm({ ...cForm, is_published: v })} />
                <Label>Published</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCOpen(false)}>Cancel</Button>
              <Button variant="glow" onClick={saveCourse}>Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={lOpen} onOpenChange={setLOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{lEditing ? 'Edit Lesson' : 'New Lesson'} · {lCourse?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2"><Label>Title</Label>
                <Input maxLength={200} value={lForm.title} onChange={(e) => setLForm({ ...lForm, title: e.target.value })} /></div>
              <div className="space-y-2"><Label>Position</Label>
                <Input type="number" min={1} value={lForm.position} onChange={(e) => setLForm({ ...lForm, position: Number(e.target.value) })} /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label>
              <Textarea maxLength={1000} value={lForm.description} onChange={(e) => setLForm({ ...lForm, description: e.target.value })} /></div>
            <div className="space-y-2"><Label>Video Source</Label>
              <Select value={lForm.kind} onValueChange={(v: any) => setLForm({ ...lForm, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="embed">Embed URL (YouTube/Vimeo)</SelectItem>
                  <SelectItem value="upload">Upload Video File</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {lForm.kind === 'embed' ? (
              <div className="space-y-2"><Label>Video URL</Label>
                <Input placeholder="https://youtube.com/..." maxLength={500}
                  value={lForm.video_url} onChange={(e) => setLForm({ ...lForm, video_url: e.target.value })} /></div>
            ) : (
              <div className="space-y-2"><Label>Video file</Label>
                <Input type="file" accept="video/*" onChange={(e) => e.target.files?.[0] && uploadLessonVideo(e.target.files[0])} />
                {lForm.video_path && <p className="text-xs text-muted-foreground flex items-center gap-1"><Video size={12} /> {lForm.video_path}</p>}
              </div>
            )}
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setLOpen(false)}>Cancel</Button>
              <Button variant="glow" onClick={saveLesson}>Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoursesPage;
