import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';

const signInSchema = z.object({
  email: z.string().trim().email('Invalid email').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(72),
});
const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(1, 'Name required').max(100),
});

const Auth = () => {
  const { user, signIn, signUp, loading, redirectPath } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  // Auto-redirect once we know the user's role
  useEffect(() => {
    if (!loading && user) navigate(redirectPath, { replace: true });
  }, [user, loading, redirectPath, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({ email: fd.get('email'), password: fd.get('password') });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setBusy(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success('Welcome back');
    // navigation happens via the effect once roles load
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      email: fd.get('email'),
      password: fd.get('password'),
      fullName: fd.get('fullName'),
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setBusy(true);
    const { error } = await signUp(parsed.data.email, parsed.data.password, parsed.data.fullName);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success('Account created — you can now sign in.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background tech-grid p-4">
      <div className="absolute inset-0 gradient-radial pointer-events-none" />
      <Card className="w-full max-w-md glass-card relative z-10">
        <CardHeader className="text-center">
          <Link to="/" className="flex justify-center mb-4">
            <img src={logo} alt="AnthoniX Media" className="h-14 w-auto" />
          </Link>
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>
            Access your AnthoniX account. Staff are redirected to the admin panel automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="si-password">Password</Label>
                  <Input id="si-password" name="password" type="password" required />
                </div>
                <Button type="submit" variant="glow" className="w-full" disabled={busy}>
                  {busy ? 'Signing in…' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="su-name">Full Name</Label>
                  <Input id="su-name" name="fullName" required maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-password">Password</Label>
                  <Input id="su-password" name="password" type="password" required minLength={6} />
                </div>
                <Button type="submit" variant="glow" className="w-full" disabled={busy}>
                  {busy ? 'Creating…' : 'Create Account'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  The first account becomes admin automatically.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
