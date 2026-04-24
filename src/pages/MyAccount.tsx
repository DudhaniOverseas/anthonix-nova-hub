import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LogOut, BookOpen, User as UserIcon, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';

interface Profile { id: string; full_name: string | null; email: string | null; bio: string | null; }
interface CourseRow { id: string; title: string; slug: string; thumbnail_url: string | null; }
interface EnrollmentRow {
  id: string;
  course: CourseRow | null;
  totalLessons: number;
  completedLessons: number;
}

const MyAccount = () => {
  const { user, loading, isStaff, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [studentRow, setStudentRow] = useState<{ id: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/auth', { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id,full_name,email,bio')
        .eq('id', user.id)
        .maybeSingle();
      setProfile(prof as Profile);

      const { data: stu } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!stu) {
        setEnrollments([]);
        return;
      }
      setStudentRow(stu as { id: string });

      const { data: enr } = await supabase
        .from('enrollments')
        .select('id, course:courses(id,title,slug,thumbnail_url)')
        .eq('student_id', stu.id);

      const rows: EnrollmentRow[] = [];
      for (const e of enr ?? []) {
        const course = (e as any).course as CourseRow | null;
        if (!course) continue;
        const { data: lessons } = await supabase
          .from('lessons')
          .select('id')
          .eq('course_id', course.id);
        const lessonIds = (lessons ?? []).map((l: any) => l.id);
        let completed = 0;
        if (lessonIds.length) {
          const { data: progress } = await supabase
            .from('lesson_progress')
            .select('id, completed, lesson_id')
            .eq('student_id', stu.id)
            .in('lesson_id', lessonIds);
          completed = (progress ?? []).filter((p: any) => p.completed).length;
        }
        rows.push({
          id: (e as any).id,
          course,
          totalLessons: lessonIds.length,
          completedLessons: completed,
        });
      }
      setEnrollments(rows);
    };
    load();
  }, [user]);

  const saveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    setSavingProfile(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: String(fd.get('full_name') || '').slice(0, 100),
        bio: String(fd.get('bio') || '').slice(0, 500),
      })
      .eq('id', user.id);
    setSavingProfile(false);
    if (error) toast.error(error.message);
    else {
      toast.success('Profile updated');
      setProfile((p) => p && {
        ...p,
        full_name: String(fd.get('full_name') || ''),
        bio: String(fd.get('bio') || ''),
      });
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card/40 backdrop-blur-xl">
        <div className="container-custom flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="AnthoniX Media" className="h-9 w-auto" />
            <span className="font-display font-semibold hidden sm:inline">My Account</span>
          </Link>
          <div className="flex items-center gap-2">
            {isStaff && (
              <Button variant="outline-glow" size="sm" asChild>
                <Link to="/admin"><ShieldCheck size={14} /> Admin</Link>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                toast.success('Signed out');
                navigate('/');
              }}
            >
              <LogOut size={14} /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container-custom py-10 grid gap-8 lg:grid-cols-3">
        {/* Profile */}
        <Card className="glass-card lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon size={18} /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={profile?.email ?? user.email ?? ''} disabled />
              </div>
              <div>
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  defaultValue={profile?.full_name ?? ''}
                  maxLength={100}
                />
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" name="bio" rows={3} defaultValue={profile?.bio ?? ''} maxLength={500} />
              </div>
              <Button type="submit" variant="glow" className="w-full" disabled={savingProfile}>
                {savingProfile ? 'Saving…' : 'Save changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Enrollments */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen size={18} /> My Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!studentRow ? (
              <div className="text-sm text-muted-foreground p-6 border border-dashed border-border rounded-lg text-center">
                You don't have a student profile yet. Contact an administrator to get enrolled in courses.
              </div>
            ) : enrollments.length === 0 ? (
              <div className="text-sm text-muted-foreground p-6 border border-dashed border-border rounded-lg text-center">
                You aren't enrolled in any course yet.
              </div>
            ) : (
              <div className="space-y-4">
                {enrollments.map((e) => {
                  const pct = e.totalLessons
                    ? Math.round((e.completedLessons / e.totalLessons) * 100)
                    : 0;
                  return (
                    <div
                      key={e.id}
                      className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg border border-border bg-secondary/40"
                    >
                      <div className="w-full sm:w-32 h-24 rounded-md overflow-hidden bg-muted shrink-0">
                        {e.course?.thumbnail_url ? (
                          <img
                            src={e.course.thumbnail_url}
                            alt={e.course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold">{e.course?.title}</h3>
                          <Badge variant="outline">{pct}%</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {e.completedLessons} / {e.totalLessons} lessons completed
                        </p>
                        <Progress value={pct} className="mt-3 h-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MyAccount;
