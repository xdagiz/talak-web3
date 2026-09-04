import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, User, LogOut, Settings } from "lucide-react";
import { TalakMark } from "./TalakMark";
import { NpmIcon } from "./icons/LangIcons";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import githubLogo from "@/assets/logos/github.png";

const ITEMS = [
  { label: "Packages",  href: "/packages" },
  { label: "Docs",      href: "/docs" },
  { label: "Install",   href: "/install" },
  { label: "Pricing",   href: "/pricing" },
  { label: "Changelog", href: "/changelog" },
  { label: "Blog",      href: "/blog" },
];

const NPM_URL = "https://www.npmjs.com/package/talak-web3";
const GITHUB_URL = "https://github.com/dagimabebe/talak-web3";

export function PublicNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, profile, signOut, loading } = useAuth();
  const profileRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) =>
    location.pathname === href || (href !== "/" && location.pathname.startsWith(href));

  const handleSignOut = async () => {
    try {
      await signOut();
      setProfileOpen(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const getProfilePicture = () => {
    if (profile?.avatar_url) {
      return profile.avatar_url;
    }
    
    // Generate initials-based avatar
    const initials = profile?.full_name 
      ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : user?.email?.slice(0, 2).toUpperCase();
    
    return `https://ui-avatars.com/api/?name=${initials}&background=6366f1&color=ffffff&size=32`;
  };

  const getDisplayName = () => {
    return profile?.full_name || user?.email?.split('@')[0] || 'User';
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto max-w-[1200px] px-6 h-14 flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <TalakMark className="h-5 w-5 text-foreground" />
          <span className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-foreground">talak-web3</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {ITEMS.map(item => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "px-2.5 py-1.5 text-[12.5px] rounded transition-colors",
                isActive(item.href) ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* npm link — desktop only */}
          <a
            href={NPM_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="View talak-web3 on npm"
            title="View on npm"
            className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded border border-border hover:border-[#CB3837]/60 transition-colors"
          >
            <NpmIcon className="h-4 w-4" />
          </a>

          {/* GitHub star with golden star */}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Star on GitHub"
            title="Star on GitHub"
            className="group hidden sm:inline-flex items-stretch h-8 border border-border hover:border-foreground/40 transition-colors rounded overflow-hidden"
          >
            <span className="inline-flex items-center px-2">
              <img src={githubLogo} alt="GitHub" className="h-3.5 w-3.5 object-contain" aria-hidden="true" />
            </span>
            <span className="inline-flex items-center px-2 border-l border-border bg-foreground/[0.04] group-hover:bg-foreground/[0.08] transition-colors">
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 drop-shadow-[0_0_4px_rgba(244,185,66,0.45)]"
                fill="#F4B942"
                stroke="#B97E0F"
                strokeWidth="0.6"
                aria-hidden="true"
              >
                <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </span>
          </a>

          {/* Auth section */}
          {loading ? (
            <div className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded border border-border">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground"></div>
            </div>
          ) : user ? (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-border hover:border-foreground/40 transition-colors"
              >
                <img 
                  src={getProfilePicture()} 
                  alt={getDisplayName()}
                  className="h-6 w-6 rounded-full object-cover"
                />
                <span className="text-[12.5px] text-foreground">{getDisplayName()}</span>
                <User className="h-3.5 w-3.5 text-muted-foreground" />
              </button>

              {/* Profile dropdown */}
              {profileOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-md shadow-lg z-50">
                  <div className="p-3 border-b border-border">
                    <p className="text-[12px] font-medium text-foreground truncate">{getDisplayName()}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="p-1">
                    <Link
                      to="/dashboard"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-[12px] text-foreground hover:bg-muted/50 rounded-md transition-colors"
                    >
                      <User className="h-3.5 w-3.5" />
                      Dashboard
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-[12px] text-foreground hover:bg-muted/50 rounded-md transition-colors"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 px-3 py-2 text-[12px] text-foreground hover:bg-muted/50 rounded-md transition-colors w-full text-left"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/auth"
                className="hidden sm:inline-flex text-[12.5px] text-muted-foreground hover:text-foreground px-3 py-1.5"
              >
                Log in
              </Link>
              <Link
                to="/auth?mode=signup"
                className="hidden sm:inline-flex text-[12.5px] font-medium text-background bg-foreground hover:bg-foreground/90 px-3 py-1.5 transition-colors"
              >
                Get started
              </Link>
            </>
          )}

          {/* Hamburger — mobile only */}
          <button
            type="button"
            className="md:hidden h-8 w-8 inline-flex items-center justify-center rounded border border-border text-foreground hover:bg-muted/40 transition-colors"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="mx-auto max-w-[1200px] px-6 py-3 flex flex-col">
            {ITEMS.map(item => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "py-2.5 text-[14px] border-b border-border/60 last:border-0 transition-colors",
                  isActive(item.href) ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex items-center gap-2 mt-3">
              <a
                href={NPM_URL}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 h-9 text-[12.5px] border border-border rounded"
                onClick={() => setOpen(false)}
              >
                <NpmIcon className="h-4 w-4" />
                npm
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 h-9 text-[12.5px] border border-border rounded"
                onClick={() => setOpen(false)}
              >
                <img src={githubLogo} alt="GitHub" className="h-3.5 w-3.5 object-contain" aria-hidden="true" />
                GitHub
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="#F4B942"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" /></svg>
              </a>
            </div>
            <div className="flex items-center gap-2 mt-2 pb-1">
              {loading ? (
                <div className="flex-1 flex items-center justify-center h-9">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground"></div>
                </div>
              ) : user ? (
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-2 p-2 border border-border rounded-md">
                    <img 
                      src={getProfilePicture()} 
                      alt={getDisplayName()}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground truncate">{getDisplayName()}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to="/dashboard"
                      onClick={() => setOpen(false)}
                      className="flex-1 inline-flex items-center justify-center h-9 text-[12.5px] border border-border rounded"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex-1 inline-flex items-center justify-center h-9 text-[12.5px] border border-border rounded"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Link
                    to="/auth"
                    onClick={() => setOpen(false)}
                    className="flex-1 inline-flex items-center justify-center h-9 text-[12.5px] border border-border rounded"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/auth?mode=signup"
                    onClick={() => setOpen(false)}
                    className="flex-1 inline-flex items-center justify-center h-9 text-[12.5px] font-medium text-background bg-foreground rounded"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export default PublicNav;
