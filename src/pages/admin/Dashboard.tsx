import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, GraduationCap, BookOpen, CreditCard, Image } from 'lucide-react';

interface Stats {
  users: number;
  posts: number;
  students: number;
  courses: number;
  media: number;
  paid: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const load = async () => {
      const tables = ['profiles', 'posts', 'students', 'courses', 'media'] as const;
      const counts = await Promise.all(
        tables.map((t) => supabase.from(t).select('*', { count: 'exact', head: true })),
      );
      const { data: pay } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'paid');
      const totalPaid = (pay ?? []).reduce((sum, p: any) => sum + Number(p.amount || 0), 0);
      setStats({
        users: counts[0].count ?? 0,
        posts: counts[1].count ?? 0,
        students: counts[2].count ?? 0,
        courses: counts[3].count ?? 0,
        media: counts[4].count ?? 0,
        paid: totalPaid,
      });
    };
    load();
  }, []);

  const cards = [
    { label: 'Users', value: stats?.users, icon: Users, color: 'text-cyan-400' },
    { label: 'Posts', value: stats?.posts, icon: FileText, color: 'text-purple-400' },
    { label: 'Students', value: stats?.students, icon: GraduationCap, color: 'text-emerald-400' },
    { label: 'Courses', value: stats?.courses, icon: BookOpen, color: 'text-amber-400' },
    { label: 'Media files', value: stats?.media, icon: Image, color: 'text-pink-400' },
    {
      label: 'Revenue (paid)',
      value: stats ? `₹${stats.paid.toLocaleString()}` : undefined,
      icon: CreditCard,
      color: 'text-green-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your CMS</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="glass-card-hover">
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm text-muted-foreground font-medium">{label}</CardTitle>
              <Icon className={color} size={20} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {value === undefined ? '—' : value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Welcome to AnthoniX CMS</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Use the sidebar to manage all content. Quick tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Posts</strong>: create blog/news entries with rich text & cover image.</li>
            <li><strong>Media</strong>: upload images, videos and files (stored in Lovable Cloud).</li>
            <li><strong>Students &amp; Courses</strong>: enroll students and track lesson progress.</li>
            <li><strong>Payments</strong>: log course payments and revenue.</li>
            <li><strong>Settings</strong>: configure site name, logo and contact info (admin only).</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
