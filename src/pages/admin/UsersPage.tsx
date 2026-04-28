import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type Role = 'admin' | 'editor' | 'user';
interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  roles: Role[];
}

const UsersPage = () => {
  const { user: me, isAdmin } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone, created_at')
      .order('created_at', { ascending: false });
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    const map = new Map<string, Role[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = map.get(r.user_id) ?? [];
      arr.push(r.role);
      map.set(r.user_id, arr);
    });
    setRows(
      (profiles ?? []).map((p: any) => ({ ...p, roles: map.get(p.id) ?? [] })),
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setRole = async (userId: string, role: Role) => {
    if (!isAdmin) return;
    await supabase.from('user_roles').delete().eq('user_id', userId);
    const { error } = await supabase.from('user_roles').insert({ user_id: userId, role });
    if (error) toast.error(error.message);
    else { toast.success('Role updated'); load(); }
  };

  const removeUser = async (userId: string) => {
    if (userId === me?.id) { toast.error("You can't delete yourself"); return; }
    if (!confirm('Delete this user profile? (Auth user will remain — delete from Cloud > Users to fully remove.)')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) toast.error(error.message);
    else { toast.success('Profile deleted'); load(); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Users</h1>
        <p className="text-muted-foreground">Manage user accounts and roles</p>
      </div>
      <Card className="glass-card">
        <CardHeader><CardTitle>All Users ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const primary = (r.roles[0] ?? 'user') as Role;
                    return (
                      <TableRow key={r.id}>
                        <TableCell>{r.full_name ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{r.email ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.phone ? (
                            <a href={`tel:${r.phone}`} className="hover:text-primary">{r.phone}</a>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {isAdmin ? (
                            <Select value={primary} onValueChange={(v) => setRole(r.id, v as Role)}>
                              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={primary === 'admin' ? 'default' : 'secondary'}>
                              {primary}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(r.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {isAdmin && (
                            <Button size="icon" variant="ghost" onClick={() => removeUser(r.id)}>
                              <Trash2 size={16} className="text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersPage;
