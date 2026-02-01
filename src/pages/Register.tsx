import { useState, FormEvent, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/auth/AuthLayout";
import PasswordInput from "@/components/auth/PasswordInput";
import PasswordRules, { isPasswordValid } from "@/components/auth/PasswordRules";
import FormMessage from "@/components/auth/FormMessage";
import { supabase } from "@/lib/supabase";

const Register = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const navigate = useNavigate();
  const lastSubmitAt = useRef<number>(0);

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: {
      email?: string;
      username?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (!isPasswordValid(password)) {
      newErrors.password = "Password does not meet requirements";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastSubmitAt.current < 1500 || isRateLimited) {
      return;
    }
    lastSubmitAt.current = now;
    setSubmitted(false);
    setSubmitError(null);
    setIsSubmitting(true);

    if (validateForm()) {
      try {
        const { data: usernameAvailable, error: usernameErr } = await supabase.rpc(
          "is_username_available",
          { p_username: username.trim() },
        );
        if (usernameErr) {
          setSubmitError("Unable to verify username availability. Please try again.");
          setIsSubmitting(false);
          return;
        }
        if (!usernameAvailable) {
          setErrors((prev) => ({ ...prev, username: "Username already exists" }));
          setIsSubmitting(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { username: username.trim() },
          },
        });

        if (error) {
          const err = error as { status?: number; message: string };
          const msg = (err.message || "").toLowerCase();
          if ((err.status === 429) || msg.includes("rate limit")) {
            setSubmitError("Too many signup attempts. Please wait and try again later.");
            setIsRateLimited(true);
            setTimeout(() => setIsRateLimited(false), 60000);
          } else {
            setSubmitError(error.message);
          }
          setIsSubmitting(false);
          return;
        }

        try {
          localStorage.setItem("pending_profile_username", username.trim());
        } catch (_e) {
          void 0;
        }

        setSubmitted(true);
        if (import.meta.env.DEV) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            setTimeout(() => navigate("/dashboard", { replace: true }), 800);
          } else {
            setTimeout(() => navigate("/login", { replace: true }), 800);
          }
        } else {
          setTimeout(() => navigate("/login", { replace: true }), 800);
        }
      } catch {
        setSubmitError("Unexpected error. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <AuthLayout title="Create Account" subtitle="Join us today">
      <form onSubmit={handleSubmit} className="space-y-5">
        {submitted && (
          <FormMessage
            type="success"
            message="Account created. Please check your email to verify your address."
          />
        )}
        {submitError && <FormMessage type="error" message={submitError} />}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className={errors.email ? "border-destructive" : ""}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            className={errors.username ? "border-destructive" : ""}
          />
          {errors.username && (
            <p className="text-xs text-destructive">{errors.username}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            placeholder="Create a password"
            error={errors.password}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password}</p>
          )}
          <PasswordRules password={password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirm your password"
            error={errors.confirmPassword}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11 font-medium"
          disabled={
            !(
              isValidEmail(email) &&
              username.trim().length >= 3 &&
              isPasswordValid(password) &&
              password === confirmPassword
            ) || isSubmitting || isRateLimited
          }
        >
          {isSubmitting ? "Creating..." : "Create Account"}
        </Button>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default Register;
