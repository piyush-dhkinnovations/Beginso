'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { signupSchema, SignupFormValues } from '@/lib/schemas/signupSchema';
import { authService } from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { GoogleSignInButton } from './GoogleSignInButton';
import { useRouter, useSearchParams } from 'next/navigation';
import { sanitizeNextParam } from '@/lib/authRoutes';

export function SignupForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  // Requirements §7.5.1. Email signup still needs email verification first, so `next` is
  // forwarded to /verify-email rather than used here directly (see onSubmit below).
  const nextParam = sanitizeNextParam(useSearchParams().get('next'));

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setServerError(null);
    try {
      await authService.signup(values.name, values.email, values.password);
      toast('Verification code sent. Check your inbox.', 'success');
      router.push(nextParam ? `/verify-email?next=${encodeURIComponent(nextParam)}` : '/verify-email');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string; fields?: Array<{ field: string; message: string }> | Record<string, string> } } } };
      const fields = err.response?.data?.error?.fields;
      if (fields) {
        if (Array.isArray(fields)) {
          fields.forEach((f) => {
            setError(f.field as keyof SignupFormValues, { type: 'server', message: f.message });
          });
        } else if (typeof fields === 'object') {
          Object.keys(fields).forEach((key) => {
            setError(key as keyof SignupFormValues, { type: 'server', message: (fields as Record<string, string>)[key] });
          });
        }
      }
      setServerError(getFriendlyErrorMessage(error));
    }
  };

  const handleGoogleSignup = async () => {
    setServerError(null);
    setIsGoogleLoading(true);
    try {
      await authService.loginWithGoogle();
      toast('Account created successfully!', 'success');
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

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword((prev) => !prev);
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

  const confirmPasswordToggleSlot = (
    <button
      type="button"
      onClick={toggleConfirmPasswordVisibility}
      
      className="text-(--text-muted) hover:text-(--text-primary) focus:outline-none flex items-center justify-center min-w-11 min-h-11"
      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
    >
      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  const isUiLoading = isSubmitting || isGoogleLoading;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 w-full">
      <Input
        id="name"
        label="Full Name"
        placeholder="Jane Cooper"
        error={errors.name?.message}
        disabled={isUiLoading}
        {...register('name', { onChange: clearError })}
      />

      <Input
        id="email"
        label="Email Address"
        placeholder="you@company.com"
        error={errors.email?.message}
        disabled={isUiLoading}
        {...register('email', { onChange: clearError })}
      />

      <Input
        id="password"
        label="Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="At least 8 characters"
        error={errors.password?.message}
        rightSlot={passwordToggleSlot}
        disabled={isUiLoading}
        {...register('password', { onChange: clearError })}
      />

      <Input
        id="confirmPassword"
        label="Confirm Password"
        type={showConfirmPassword ? 'text' : 'password'}
        placeholder="Re-enter your password"
        error={errors.confirmPassword?.message}
        rightSlot={confirmPasswordToggleSlot}
        disabled={isUiLoading}
        {...register('confirmPassword', { onChange: clearError })}
      />

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
        isLoading={isSubmitting}
        disabled={isUiLoading}
      >
        Sign Up
      </Button>

      <div className="relative my-2 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-(--border-default)"></div>
        </div>
        <span className="relative bg-(--surface-card) px-3 bg-body-sm text-(--text-muted) font-medium uppercase">
          Or continue with
        </span>
      </div>

      <GoogleSignInButton
        onClick={handleGoogleSignup}
        isLoading={isGoogleLoading}
        disabled={isUiLoading}
        label="Sign up with Google"
      />
    </form>
  );
}
