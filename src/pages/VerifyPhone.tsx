import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';

const VerifyPhone = () => {
  const { user, loading, phoneVerified, isStaff, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sentOnce, setSentOnce] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth', { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (phoneVerified) navigate(isStaff ? '/admin' : '/account', { replace: true });
  }, [phoneVerified, isStaff, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('phone')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setPhone(data?.phone ?? ''));
  }, [user]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendOtp = async () => {
    setSending(true);
    const { data, error } = await supabase.functions.invoke('send-whatsapp-otp');
    setSending(false);
    if (error || (data && data.error)) {
      toast.error((data?.error as string) || error?.message || 'Failed to send code');
      return;
    }
    setSentOnce(true);
    setCooldown(60);
    toast.success('Code sent to your WhatsApp');
  };

  const verify = async () => {
    if (code.length !== 6) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setVerifying(true);
    const { data, error } = await supabase.functions.invoke('verify-whatsapp-otp', {
      body: { code },
    });
    setVerifying(false);
    if (error || (data && data.error)) {
      toast.error((data?.error as string) || error?.message || 'Verification failed');
      return;
    }
    toast.success('Phone verified!');
    await refreshProfile();
  };

  const maskedPhone = phone ? phone.replace(/(\+\d{2,3})\d+(\d{2})/, '$1•••••$2') : '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background tech-grid p-4">
      <div className="absolute inset-0 gradient-radial pointer-events-none" />
      <Card className="w-full max-w-md glass-card relative z-10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="AnthoniX Media" className="h-14 w-auto" />
          </div>
          <CardTitle className="text-2xl">Verify your WhatsApp</CardTitle>
          <CardDescription>
            We'll send a 6-digit code to{' '}
            <span className="text-foreground font-medium">{maskedPhone || 'your number'}</span> on
            WhatsApp. Enter it below to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!sentOnce ? (
            <Button onClick={sendOtp} variant="glow" className="w-full" disabled={sending || !phone}>
              {sending ? 'Sending…' : 'Send WhatsApp Code'}
            </Button>
          ) : (
            <>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={code} onChange={setCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button onClick={verify} variant="glow" className="w-full" disabled={verifying || code.length !== 6}>
                {verifying ? 'Verifying…' : 'Verify & Continue'}
              </Button>
              <Button
                onClick={sendOtp}
                variant="ghost"
                className="w-full"
                disabled={sending || cooldown > 0}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : sending ? 'Sending…' : 'Resend code'}
              </Button>
            </>
          )}
          <button
            onClick={async () => {
              await signOut();
              navigate('/auth', { replace: true });
            }}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition"
          >
            Sign out
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyPhone;
