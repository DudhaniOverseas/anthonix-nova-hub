import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, LayoutDashboard, UserCircle2, LogIn } from 'lucide-react';
import logo from '@/assets/logo.png';
import { useAuth } from '@/hooks/useAuth';

const navLinks = [
  { href: '#services', label: 'Services' },
  { href: '#about', label: 'About' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#technology', label: 'Technology' },
  { href: '#contact', label: 'Contact' },
];

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isStaff } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-background/80 backdrop-blur-xl border-b border-border'
          : 'bg-transparent'
      }`}
    >
      <div className="container-custom">
        <div className="flex items-center justify-between h-20">
          <a href="#" className="flex items-center gap-2">
            <img src={logo} alt="AnthoniX Media" className="h-12 w-auto" />
          </a>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="nav-link text-sm font-medium">
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {!user ? (
              <Button variant="outline-glow" size="sm" asChild>
                <Link to="/auth"><LogIn size={14} /> Sign In</Link>
              </Button>
            ) : isStaff ? (
              <Button variant="outline-glow" size="sm" asChild>
                <Link to="/admin"><LayoutDashboard size={14} /> Admin</Link>
              </Button>
            ) : (
              <Button variant="outline-glow" size="sm" asChild>
                <Link to="/account"><UserCircle2 size={14} /> My Account</Link>
              </Button>
            )}
            <Button variant="glow" size="sm">Buy a Plan</Button>
          </div>

          <button
            className="md:hidden text-foreground p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border bg-background/95 backdrop-blur-xl">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 px-4 pt-4 border-t border-border">
                {!user ? (
                  <Button variant="outline-glow" className="w-full" asChild>
                    <Link to="/auth"><LogIn size={14} /> Sign In</Link>
                  </Button>
                ) : isStaff ? (
                  <Button variant="outline-glow" className="w-full" asChild>
                    <Link to="/admin"><LayoutDashboard size={14} /> Admin Panel</Link>
                  </Button>
                ) : (
                  <Button variant="outline-glow" className="w-full" asChild>
                    <Link to="/account"><UserCircle2 size={14} /> My Account</Link>
                  </Button>
                )}
                <Button variant="glow" className="w-full">Buy a Plan</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
