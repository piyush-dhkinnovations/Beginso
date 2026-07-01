'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { signupSchema, SignupFormValues } from '@/lib/schemas/signupSchema';
import * as AuthService from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/common/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function SignupForm() {
  const [serverError, setServerError] = useState<string | null>(null);
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
        type="password"
        placeholder="Create a password (min. 8 characters)..."
        error={errors.password?.message}
        disabled={isSubmitting}
        {...register('password', { onChange: clearError })}
      />

      <Input
        id="confirmPassword"
        label="Confirm Password"
        type="password"
        placeholder="Confirm your password..."
        error={errors.confirmPassword?.message}
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
