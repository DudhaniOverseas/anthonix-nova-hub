import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Settings {
  site_name: string; site_logo_url: string | null; contact_email: string | null;
  contact_phone: string | null; address: string | null; description: string | null;
}

const SettingsPage = () => {
  const [s, setS] = useState<Settings>({
    site_name: '', site_logo_url: '', contact_email: '', contact_phone: '', address: '', description: '',
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from('site_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setS({
        site_name: data.site_name ?? '',
        site_logo_url: data.site_logo_url ?? '',
        contact_email: data.contact_email ?? '',
        contact_phone: data.contact_phone ?? '',
        address: data.address ?? '',
        description: data.description ?? '',
      });
    });
  }, []);

  const uploadLogo = async (file: File) => {
    const ext = file.name.split('.').pop();
    const path = `logos/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(path, file);
    if (error) { toast.error(error.message); return; }
    const url = supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
    setS((p) => ({ ...p, site_logo_url: url }));
  };

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from('site_settings').update(s).eq('id', 1);
    setBusy(false);
    if (error) toast.error(error.message); else toast.success('Settings saved');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure site identity and contact info</p>
      </div>
      <Card className="glass-card">
        <CardHeader><CardTitle>Website</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Site name</Label>
            <Input maxLength={100} value={s.site_name} onChange={(e) => setS({ ...s, site_name: e.target.value })} /></div>
          <div className="space-y-2"><Label>Logo</Label>
            <div className="flex gap-3 items-center">
              <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
              {s.site_logo_url && <img src={s.site_logo_url} alt="logo" className="h-12 w-12 object-contain rounded bg-secondary p-1" />}
            </div>
          </div>
          <div className="space-y-2"><Label>Description</Label>
            <Textarea maxLength={500} value={s.description ?? ''} onChange={(e) => setS({ ...s, description: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Email</Label>
              <Input type="email" maxLength={255} value={s.contact_email ?? ''} onChange={(e) => setS({ ...s, contact_email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone</Label>
              <Input maxLength={30} value={s.contact_phone ?? ''} onChange={(e) => setS({ ...s, contact_phone: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Address</Label>
            <Textarea maxLength={300} value={s.address ?? ''} onChange={(e) => setS({ ...s, address: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Button variant="glow" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Settings'}</Button>
    </div>
  );
};

export default SettingsPage;
