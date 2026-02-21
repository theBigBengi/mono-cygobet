/**
 * Admin Login Page
 * 
 * Provides login form for admin authentication.
 * 
 * Flow:
 * 1. User enters email/password
 * 2. On submit → calls login() from useAdminAuth
 * 3. On success → redirects to original path (or "/")
 * 4. On 401 error → shows "Invalid credentials"
 * 5. If already authenticated → automatically redirects to home
 * 
 * Features:
 * - Preserves return path (redirects back after login)
 * - Shows loading state during submission
 * - Displays error messages for failed login attempts
 * - Auto-redirects if already authenticated
 */

import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AdminApiError } from "@/lib/adminApi";
import { useAdminAuth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, status } = useAdminAuth();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Get return path from navigation state (set by AdminGuard)
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  // Auto-redirect if already authenticated (e.g., user navigated directly to /login)
  React.useEffect(() => {
    if (status === "authed") navigate(from, { replace: true });
  }, [status, navigate, from]);

  /**
   * Handle login form submission
   * 
   * 1. Prevents default form submission
   * 2. Calls login() which sets httpOnly cookie
   * 3. On success → redirects to return path
   * 4. On 401 → shows "Invalid credentials" error
   * 5. On other errors → shows error message
   */
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // login() throws on error, so we catch and handle it
      await login(email, password);
      // If login succeeds, redirect to return path
      navigate(from, { replace: true });
    } catch (err: unknown) {
      // Show user-friendly error for invalid credentials
      if (err instanceof AdminApiError && err.status === 401) {
        setError("Invalid credentials");
      } else {
        // Show generic error for other failures
        setError(err instanceof Error ? err.message : "Login failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-svh grid place-items-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Admin login</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword((p) => !p)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error ? <div className="text-sm text-destructive">{error}</div> : null}

            <Button type="submit" disabled={submitting || status === "loading"}>
              {submitting || status === "loading" ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


