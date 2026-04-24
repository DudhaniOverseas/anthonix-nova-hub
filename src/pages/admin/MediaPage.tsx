import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Trash2, Copy, FileIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface MediaItem {
  id: string; file_name: string; file_path: string; bucket: string;
  mime_type: string | null; size_bytes: number | null; created_at: string;
}

const MediaPage = () => {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('media').select('*').order('created_at', { ascending: false });
    setItems((data as MediaItem[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const upload = async (files: FileList) => {
    setBusy(true);
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/');
      const bucket = isVideo ? 'videos' : 'media';
      const ext = file.name.split('.').pop();
      const path = `${user?.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file);
      if (upErr) { toast.error(`${file.name}: ${upErr.message}`); continue; }
      await supabase.from('media').insert({
        file_name: file.name, file_path: path, bucket,
        mime_type: file.type, size_bytes: file.size, uploaded_by: user?.id,
      });
    }
    setBusy(false);
    toast.success('Upload complete');
    load();
  };

  const remove = async (item: MediaItem) => {
    if (!confirm('Delete this file?')) return;
    await supabase.storage.from(item.bucket).remove([item.file_path]);
    await supabase.from('media').delete().eq('id', item.id);
    toast.success('Deleted');
    load();
  };

  const publicUrl = (item: MediaItem) =>
    supabase.storage.from(item.bucket).getPublicUrl(item.file_path).data.publicUrl;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Media Library</h1>
        <p className="text-muted-foreground">Upload and manage images, videos, and files</p>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle>Upload</CardTitle></CardHeader>
        <CardContent>
          <Input type="file" multiple onChange={(e) => e.target.files && upload(e.target.files)} disabled={busy} />
          {busy && <p className="text-sm text-muted-foreground mt-2">Uploading…</p>}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle>All Files ({items.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((it) => {
              const url = publicUrl(it);
              const isImg = it.mime_type?.startsWith('image/');
              const isVid = it.mime_type?.startsWith('video/');
              return (
                <div key={it.id} className="glass-card-hover p-3 space-y-2">
                  <div className="aspect-square bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
                    {isImg ? (
                      <img src={url} alt={it.file_name} className="w-full h-full object-cover" />
                    ) : isVid ? (
                      <video src={url} className="w-full h-full object-cover" />
                    ) : (
                      <FileIcon size={48} className="text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs truncate" title={it.file_name}>{it.file_name}</p>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1"
                      onClick={() => { navigator.clipboard.writeText(url); toast.success('URL copied'); }}>
                      <Copy size={12} />
                    </Button>
                    {isAdmin && (
                      <Button size="sm" variant="outline" onClick={() => remove(it)}>
                        <Trash2 size={12} className="text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-8">No files yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MediaPage;
