'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { loginSchema, LoginFormValues } from '@/lib/schemas/loginSchema';
import { authService } from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { GoogleSignInButton } from './GoogleSignInButton';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { sanitizeNextParam } from '@/lib/authRoutes';

interface LoginFormProps {
  /**
   * Where to land after signing in, for a form embedded in another page (the sign-in gate of a members-only form): it signs in right
   * there and returns to that page. An internal path only. Without it the address comes from `?next=`, like the login page.
   */
  redirectTo?: string;
  /** The text of the main button. */
  submitLabel?: string;
}

export function LoginForm({ redirectTo, submitLabel = 'Log In' }: LoginFormProps = {}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { login } = useAuth();
  const router = useRouter();
  // Requirements §7.5.1: the Invite Accept page's sign-in link carries ?next=/invite/:token so
  // login() lands the user back there instead of the default destination.
  const searchNext = sanitizeNextParam(useSearchParams().get('next'));
  const nextParam = redirectTo ? sanitizeNextParam(redirectTo) : searchNext;

  const isAnyLoading = isEmailLoading || isGoogleLoading;

  // Set by axios.ts's response interceptor / authContext's initAuth() when a 403 mid-session
  // (blockSuspended()) bounces the user back here — otherwise they'd land on a blank login
  // form with no explanation for why they were signed out.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('reason') === 'suspended') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServerError('Your account has been suspended. Please contact support for assistance.');
    }
  }, []);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    setIsEmailLoading(true);

    // Start 30-second UI timeout
    timeoutRef.current = setTimeout(() => {
      setIsEmailLoading(false);
      setServerError('Connection timeout. Please try again.');
    }, 30000);

    try {
      await authService.login(values.email, values.password);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      await login(nextParam);
    } catch (error: unknown) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsEmailLoading(false);

      if ((error as { code?: string })?.code === 'auth/email-not-verified') {
        router.push('/verify-email');
        return;
      }

      const err = error as { response?: { data?: { error?: { message?: string; fields?: Array<{ field: string; message: string }> | Record<string, string> } } } };
      const fields = err.response?.data?.error?.fields;
      if (fields) {
        if (Array.isArray(fields)) {
          fields.forEach((f) => {
            setError(f.field as keyof LoginFormValues, { type: 'server', message: f.message });
          });
        } else if (typeof fields === 'object') {
          Object.keys(fields).forEach((key) => {
            setError(key as keyof LoginFormValues, { type: 'server', message: (fields as Record<string, string>)[key] });
          });
        }
      }

      setServerError(getFriendlyErrorMessage(error));
    }
  };

  const handleGoogleLogin = async () => {
    setServerError(null);
    setIsGoogleLoading(true);
    try {
      await authService.loginWithGoogle();
      await login(nextParam);
    } catch (error: unknown) {
      setIsGoogleLoading(false);
      setServerError(getFriendlyErrorMessage(error));
    }
  };

  const clearError = () => {
    if (serverError) {
      setServerError(null);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const passwordToggleSlot = (
    <button
      type="button"
      onClick={togglePasswordVisibility}
      className="text-(--text-muted) hover:text-(--text-primary) focus:outline-none flex items-center justify-center min-w-11 min-h-11"
      aria-label={showPassword ? 'Hide password' : 'Show password'}
    >
      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    // eslint-disable-next-line react-hooks/refs
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 w-full">
      <Input
        id="email"
        type="email"
        autoComplete="email"
        label="Email Address"
        placeholder="you@company.com"
        error={errors.email?.message}
        disabled={isAnyLoading}
        {...register('email', { onChange: clearError })}
      />

      <Input
        id="password"
        autoComplete="current-password"
        label="Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="Password"
        error={errors.password?.message}
        rightSlot={passwordToggleSlot}
        disabled={isAnyLoading}
        {...register('password', { onChange: clearError })}
      />

      {/* Right under the password, on the right: where people look for it. */}
      <div className="-mt-2 flex justify-end">
        <Link href="/forgot-password" className="bg-body-sm font-medium text-(--accent-soft-text) hover:underline">
          Forgot password?
        </Link>
      </div>

      {serverError && (
        <div
          role="alert"
          className="p-3 bg-body-sm font-semibold text-(--error-text) bg-(--error-surface) border border-(--error)/20 rounded-md"
        >
          {serverError}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        className="w-full mt-2"
        isLoading={isEmailLoading}
        disabled={isAnyLoading}
      >
        {submitLabel}
      </Button>

      {/* Two rules either side of the label: no label background to clash with the card surface. */}
      <div className="my-2 flex items-center gap-3" role="separator" aria-label="Or continue with">
        <span className="h-px flex-1 bg-(--border-default)" />
        <span className="bg-caption font-medium uppercase tracking-wider text-(--text-muted)">Or continue with</span>
        <span className="h-px flex-1 bg-(--border-default)" />
      </div>

      <GoogleSignInButton
        onClick={handleGoogleLogin}
        isLoading={isGoogleLoading}
        disabled={isAnyLoading}
        label="Sign in with Google"
      />
    </form>
  );
}
