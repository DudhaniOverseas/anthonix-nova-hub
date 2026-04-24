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
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type Status = 'pending' | 'paid' | 'failed' | 'refunded';
interface Payment {
  id: string; student_id: string | null; course_id: string | null;
  amount: number; currency: string; status: Status;
  reference: string | null; notes: string | null; created_at: string;
  students?: { full_name: string } | null;
  courses?: { title: string } | null;
}

const PaymentsPage = () => {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Payment[]>([]);
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    student_id: '', course_id: '', amount: 0, currency: 'INR',
    status: 'pending' as Status, reference: '', notes: '',
  });

  const load = async () => {
    const { data } = await supabase
      .from('payments')
      .select('*, students(full_name), courses(title)')
      .order('created_at', { ascending: false });
    setRows((data as any[]) ?? []);
  };
  useEffect(() => {
    load();
    supabase.from('students').select('id,full_name').order('full_name').then(({ data }) => setStudents((data as any[]) ?? []));
    supabase.from('courses').select('id,title').order('title').then(({ data }) => setCourses((data as any[]) ?? []));
  }, []);

  const save = async () => {
    if (!form.amount || form.amount <= 0) { toast.error('Amount must be > 0'); return; }
    const { error } = await supabase.from('payments').insert({
      student_id: form.student_id || null,
      course_id: form.course_id || null,
      amount: form.amount,
      currency: form.currency,
      status: form.status,
      reference: form.reference.trim() || null,
      notes: form.notes.trim() || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success('Payment recorded'); setOpen(false);
      setForm({ student_id: '', course_id: '', amount: 0, currency: 'INR', status: 'pending', reference: '', notes: '' });
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete payment record?')) return;
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Deleted'); load(); }
  };

  const totalPaid = rows.filter((r) => r.status === 'paid').reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Payments</h1>
          <p className="text-muted-foreground">
            Track student payments · Total received: <span className="text-primary font-semibold">₹{totalPaid.toLocaleString()}</span>
          </p>
        </div>
        <Button variant="glow" onClick={() => setOpen(true)}><Plus size={16} /> Record Payment</Button>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle>All Payments ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.students?.full_name ?? '—'}</TableCell>
                    <TableCell>{r.courses?.title ?? '—'}</TableCell>
                    <TableCell>{r.currency} {Number(r.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'paid' ? 'default' : r.status === 'failed' ? 'destructive' : 'secondary'}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.reference}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {isAdmin && (
                        <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
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
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Student</Label>
                <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="space-y-2"><Label>Course</Label>
                <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                </Select></div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2"><Label>Amount</Label>
                <Input type="number" min={0} step="0.01" value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Currency</Label>
                <Input maxLength={5} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div>
            </div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v: Status) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Reference (txn id)</Label>
              <Input maxLength={200} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
            <div className="space-y-2"><Label>Notes</Label>
              <Textarea maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="glow" onClick={save}>Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsPage;
