'use client';

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { loginSchema, LoginFormValues } from '@/lib/schemas/loginSchema';
import * as AuthService from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { extractApiErrorMessage } from '@/lib/errorHelpers';

export function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isUiLoading, setIsUiLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const { login } = useAuth();

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
    setIsUiLoading(true);

    // Start 30-second UI timeout
    timeoutRef.current = setTimeout(() => {
      setIsUiLoading(false);
      setServerError('Connection timeout. Please try again.');
    }, 30000);

    try {
      const data = await AuthService.login(values.email, values.password);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      login(data.token, data.user);
      router.push('/dashboard');
    } catch (error: unknown) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsUiLoading(false);
      
      const err = error as { response?: { data?: { error?: { message?: string; fields?: Array<{ field: string; message: string }> | Record<string, string> } } } };
      const fields = err.response?.data?.error?.fields;
      if (fields) {
        if (Array.isArray(fields)) {
          fields.forEach((f) => {
            setError(f.field as any, { type: 'server', message: f.message });
          });
        } else if (typeof fields === 'object') {
          Object.keys(fields).forEach((key) => {
            setError(key as any, { type: 'server', message: (fields as Record<string, string>)[key] });
          });
        }
      }
      
      setServerError(extractApiErrorMessage(error, 'Invalid email or password. Please check your credentials and try again.'));
    }
  };

  const handleGoogleLogin = async () => {
    setServerError(null);
    setIsUiLoading(true);
    try {
      const data = await AuthService.loginWithGoogle();
      login(data.token, data.user);
      router.push('/dashboard');
    } catch (error: unknown) {
      setIsUiLoading(false);
      setServerError(extractApiErrorMessage(error, 'Failed to authenticate with Google. Please try again.'));
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
      className="text-neutral-400 hover:text-neutral-600 focus:outline-none flex items-center justify-center min-w-[44px] min-h-[44px]"
      aria-label={showPassword ? 'Hide password' : 'Show password'}
    >
      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 w-full">
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
        placeholder="Password"
        error={errors.password?.message}
        rightSlot={passwordToggleSlot}
        disabled={isUiLoading}
        {...register('password', { onChange: clearError })}
      />

      {serverError && (
        <div
          role="alert"
          className="p-3 text-[13px] font-semibold text-error bg-red-50 border border-error/20 rounded-md"
        >
          {serverError}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        className="w-full mt-2"
        isLoading={isUiLoading}
        disabled={isUiLoading}
      >
        Log In
      </Button>

      <div className="relative my-2 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-200"></div>
        </div>
        <span className="relative bg-white px-3 text-[12px] text-neutral-400 font-medium uppercase">
          Or continue with
        </span>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full flex items-center justify-center gap-2"
        onClick={handleGoogleLogin}
        disabled={isUiLoading}
      >
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </Button>
    </form>
  );
}
