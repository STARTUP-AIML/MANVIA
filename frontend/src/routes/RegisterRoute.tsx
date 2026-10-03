/**
 * MANVIA Real Authentication — Registration
 * Production-ready registration adhering strictly to backend RegisterDto:
 * email: string, required
 * password: string, 12-128 chars, 1 uppercase, 1 lowercase, 1 digit, 1 symbol
 * phone: string, optional E.164
 * role: 'PATIENT' | 'DOCTOR' | 'ADMIN', optional (default 'PATIENT')
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import type { Role } from "@/auth/types";
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

export const RegisterRoute: React.FC = () => {
  const { register, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("PATIENT");

  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
    phone?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Backend regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,128}$/
  const passwordComplexityRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,128}$/;

  const validate = (): boolean => {
    const errs: { email?: string; password?: string; phone?: string } = {};

    if (!email.trim()) {
      errs.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Please enter a valid email address";
    }

    if (!password) {
      errs.password = "Password is required";
    } else if (password.length < 12) {
      errs.password = "Password must be at least 12 characters";
    } else if (!passwordComplexityRegex.test(password)) {
      errs.password =
        "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special symbol";
    }

    if (phone.trim()) {
      // Backend E.164: ^\+[1-9]\d{6,14}$
      if (!/^\+[1-9]\d{6,14}$/.test(phone.trim())) {
        errs.phone =
          "Phone must be in international format (e.g. +12345678900)";
      }
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
      const response = await register({
        email: email.trim(),
        password,
        phone: phone.trim() ? phone.trim() : undefined,
        role,
      });

      const userRole = response.user.roles[0];
      if (userRole === "DOCTOR") {
        navigate("/doctor", { replace: true });
      } else if (userRole === "ADMIN") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/app", { replace: true });
      }
    } catch {
      // Error handled in auth context state
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
        <div style={{ width: "100%", maxWidth: 480 }}>
          <Card>
            <CardHeader>
              <CardTitle>Create your MANVIA Account</CardTitle>
              <CardDescription>
                Register to begin your clinical journey or access patient
                healthcare services.
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
                  <strong>Registration failed: </strong>
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
                  id="register-email"
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
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
                  id="register-password"
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min 12 chars (upper, lower, digit, symbol)"
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
                  helperText="Must contain 12+ characters with uppercase, lowercase, number, and special character."
                  disabled={isSubmitting || isLoading}
                  required
                />

                <Input
                  id="register-phone"
                  label="Phone number (optional)"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+12345678900"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (validationErrors.phone) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        phone: undefined,
                      }));
                    }
                  }}
                  errorText={validationErrors.phone}
                  helperText="International E.164 format with country code (+)."
                  disabled={isSubmitting || isLoading}
                />

                {/* Role Selection */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                  }}
                >
                  <label
                    htmlFor="register-role"
                    style={{
                      fontSize: "var(--font-size-sm)",
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    Account Role
                  </label>
                  <select
                    id="register-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    disabled={isSubmitting || isLoading}
                    style={{
                      padding: "0.625rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border-subtle)",
                      backgroundColor: "var(--color-bg-surface)",
                      color: "var(--color-text-primary)",
                      fontSize: "var(--font-size-base)",
                      outline: "none",
                    }}
                  >
                    <option value="PATIENT">Patient (Care & Wellness)</option>
                    <option value="DOCTOR">Doctor (Clinical Practice)</option>
                    <option value="ADMIN">System Administrator</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting || isLoading}
                  isLoading={isSubmitting || isLoading}
                  style={{ width: "100%", marginTop: "var(--space-2)" }}
                  data-testid="register-submit-button"
                >
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </CardContent>
            <CardFooter style={{ justifyContent: "center" }}>
              <span className="body-small">
                Already have an account?{" "}
                <Link to="/login" style={{ fontWeight: 600 }}>
                  Sign In
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
