'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { signupSchema, SignupFormValues } from '@/lib/schemas/signupSchema';
import * as AuthService from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/common/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function SignupForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
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
      const data = await AuthService.signup(values.name, values.email, values.password);
      toast('Account created successfully!', 'success');
      login(data.token, data.user);
      router.push('/dashboard');
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const apiMessage = axiosError.response?.data?.error?.message || axiosError.message;
      setServerError(apiMessage || 'An unexpected error occurred. Please try again.');
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
      className="text-neutral-400 hover:text-neutral-600 focus:outline-none flex items-center justify-center min-w-[44px] min-h-[44px]"
      aria-label={showPassword ? 'Hide password' : 'Show password'}
    >
      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  const confirmPasswordToggleSlot = (
    <button
      type="button"
      onClick={toggleConfirmPasswordVisibility}
      className="text-neutral-400 hover:text-neutral-600 focus:outline-none flex items-center justify-center min-w-[44px] min-h-[44px]"
      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
    >
      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 w-full">
      <Input
        id="name"
        label="Full Name"
        placeholder="Enter your name..."
        error={errors.name?.message}
        disabled={isSubmitting}
        {...register('name', { onChange: clearError })}
      />

      <Input
        id="email"
        label="Email Address"
        placeholder="Enter your email..."
        error={errors.email?.message}
        disabled={isSubmitting}
        {...register('email', { onChange: clearError })}
      />

      <Input
        id="password"
        label="Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="Create a password (min. 8 characters)..."
        error={errors.password?.message}
        rightSlot={passwordToggleSlot}
        disabled={isSubmitting}
        {...register('password', { onChange: clearError })}
      />

      <Input
        id="confirmPassword"
        label="Confirm Password"
        type={showConfirmPassword ? 'text' : 'password'}
        placeholder="Confirm your password..."
        error={errors.confirmPassword?.message}
        rightSlot={confirmPasswordToggleSlot}
        disabled={isSubmitting}
        {...register('confirmPassword', { onChange: clearError })}
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
        isLoading={isSubmitting}
        disabled={isSubmitting}
      >
        Sign Up
      </Button>
    </form>
  );
}
