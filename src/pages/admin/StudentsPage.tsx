import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Student {
  id: string; full_name: string; email: string; phone: string | null;
  notes: string | null; created_at: string;
}
interface Course { id: string; title: string; }

const StudentsPage = () => {
  const { isAdmin } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollMap, setEnrollMap] = useState<Record<string, { course_id: string; title: string; progress: number }[]>>({});

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', notes: '' });

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollStudent, setEnrollStudent] = useState<Student | null>(null);
  const [enrollCourseId, setEnrollCourseId] = useState('');

  const load = async () => {
    const [{ data: s }, { data: c }, { data: en }, { data: pr }, { data: ls }] = await Promise.all([
      supabase.from('students').select('*').order('created_at', { ascending: false }),
      supabase.from('courses').select('id,title').order('title'),
      supabase.from('enrollments').select('student_id, course_id, courses(title)'),
      supabase.from('lesson_progress').select('student_id, lesson_id, completed'),
      supabase.from('lessons').select('id, course_id'),
    ]);
    setStudents((s as Student[]) ?? []);
    setCourses((c as Course[]) ?? []);

    const lessonsByCourse = new Map<string, string[]>();
    (ls ?? []).forEach((l: any) => {
      const arr = lessonsByCourse.get(l.course_id) ?? [];
      arr.push(l.id);
      lessonsByCourse.set(l.course_id, arr);
    });
    const completedSet = new Set<string>();
    (pr ?? []).forEach((p: any) => p.completed && completedSet.add(`${p.student_id}:${p.lesson_id}`));

    const map: Record<string, any[]> = {};
    (en ?? []).forEach((e: any) => {
      const lessonIds = lessonsByCourse.get(e.course_id) ?? [];
      const total = lessonIds.length;
      const done = lessonIds.filter((id) => completedSet.has(`${e.student_id}:${id}`)).length;
      const progress = total ? Math.round((done / total) * 100) : 0;
      map[e.student_id] = [...(map[e.student_id] ?? []), { course_id: e.course_id, title: e.courses?.title ?? '—', progress }];
    });
    setEnrollMap(map);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ full_name: '', email: '', phone: '', notes: '' }); setOpen(true); };
  const openEdit = (s: Student) => {
    setEditing(s);
    setForm({ full_name: s.full_name, email: s.email, phone: s.phone ?? '', notes: s.notes ?? '' });
    setOpen(true);
  };

  const save = async () => {
    if (!form.full_name.trim() || !form.email.trim()) { toast.error('Name and email required'); return; }
    const payload = {
      full_name: form.full_name.trim(), email: form.email.trim(),
      phone: form.phone.trim() || null, notes: form.notes.trim() || null,
    };
    const { error } = editing
      ? await supabase.from('students').update(payload).eq('id', editing.id)
      : await supabase.from('students').insert(payload);
    if (error) toast.error(error.message); else { toast.success('Saved'); setOpen(false); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete student?')) return;
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Deleted'); load(); }
  };

  const openEnroll = (s: Student) => { setEnrollStudent(s); setEnrollCourseId(''); setEnrollOpen(true); };
  const enroll = async () => {
    if (!enrollStudent || !enrollCourseId) return;
    const { error } = await supabase.from('enrollments').insert({
      student_id: enrollStudent.id, course_id: enrollCourseId,
    });
    if (error) toast.error(error.message); else { toast.success('Enrolled'); setEnrollOpen(false); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Students</h1>
          <p className="text-muted-foreground">Manage students, enrollments and progress</p>
        </div>
        <Button variant="glow" onClick={openNew}><Plus size={16} /> Add Student</Button>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle>All Students ({students.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Courses & Progress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <div>{s.email}</div>
                      <div>{s.phone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(enrollMap[s.id] ?? []).map((e) => (
                          <Badge key={e.course_id} variant="secondary">
                            {e.title}: {e.progress}%
                          </Badge>
                        ))}
                        {(enrollMap[s.id] ?? []).length === 0 && <span className="text-xs text-muted-foreground">No enrollments</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => openEnroll(s)}>
                        <BookOpen size={16} />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                        <Pencil size={16} />
                      </Button>
                      {isAdmin && (
                        <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
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
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Student' : 'New Student'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Full Name</Label>
              <Input maxLength={100} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label>
              <Input type="email" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone</Label>
              <Input maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Notes</Label>
              <Textarea maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="glow" onClick={save}>Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enroll {enrollStudent?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Course</Label>
              <Select value={enrollCourseId} onValueChange={setEnrollCourseId}>
                <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
                <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEnrollOpen(false)}>Cancel</Button>
              <Button variant="glow" onClick={enroll} disabled={!enrollCourseId}>Enroll</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentsPage;
