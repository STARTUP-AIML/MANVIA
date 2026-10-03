/**
 * MANVIA Real Authentication — Sign In
 * Production-ready login with validation, loading states, error handling,
 * and role-aware navigation.
 */

import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const LoginRoute: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const errs: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errs.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Please enter a valid email address";
    }

    if (!password) {
      errs.password = "Password is required";
    }

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const response = await login({ email: email.trim(), password });

      // Determine redirect path
      const stateFrom = (location.state as { from?: { pathname?: string } })
        ?.from?.pathname;

      if (
        stateFrom &&
        !stateFrom.startsWith("/login") &&
        !stateFrom.startsWith("/register")
      ) {
        navigate(stateFrom, { replace: true });
      } else {
        // Direct to appropriate workspace shell based on user's primary role
        const primaryRole = response.user.roles[0];
        if (primaryRole === "DOCTOR") {
          navigate("/doctor", { replace: true });
        } else if (primaryRole === "ADMIN") {
          navigate("/admin", { replace: true });
        } else {
          navigate("/app", { replace: true });
        }
      }
    } catch {
      // Auth error is captured in auth context state
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <Header />
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-8) var(--space-4)",
          backgroundColor: "var(--color-bg-app)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 440 }}>
          <Card>
            <CardHeader>
              <CardTitle>Sign in to MANVIA</CardTitle>
              <CardDescription>
                Access your personalized clinical or patient healthcare
                workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  style={{
                    padding: "0.75rem 1rem",
                    marginBottom: "var(--space-4)",
                    backgroundColor: "var(--color-state-danger-bg)",
                    border: "1px solid var(--color-state-danger-border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--color-state-danger-text)",
                    fontSize: "var(--font-size-sm)",
                  }}
                >
                  <strong>Sign in failed: </strong>
                  {error}
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                noValidate
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-4)",
                }}
              >
                <Input
                  id="login-email"
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  placeholder="user@manvia.health"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (validationErrors.email) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        email: undefined,
                      }));
                    }
                  }}
                  errorText={validationErrors.email}
                  disabled={isSubmitting || isLoading}
                  required
                />
                <Input
                  id="login-password"
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (validationErrors.password) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        password: undefined,
                      }));
                    }
                  }}
                  errorText={validationErrors.password}
                  disabled={isSubmitting || isLoading}
                  required
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting || isLoading}
                  isLoading={isSubmitting || isLoading}
                  style={{ width: "100%", marginTop: "var(--space-2)" }}
                  data-testid="login-submit-button"
                >
                  {isSubmitting ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </CardContent>
            <CardFooter style={{ justifyContent: "center" }}>
              <span className="body-small">
                Don&apos;t have an account?{" "}
                <Link to="/register" style={{ fontWeight: 600 }}>
                  Create an account
                </Link>
              </span>
            </CardFooter>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};
