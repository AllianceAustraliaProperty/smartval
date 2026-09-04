'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import aapLogo from '../aap-logo.svg';
import { Dancing_Script, Poppins, Montserrat } from 'next/font/google';
import { signIn, getIdToken } from '@/lib/auth';
import { loginSchema, type LoginInput } from '@/lib/validation';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';

const dancingScript = Dancing_Script({
  weight: ['700'],
  subsets: ['latin'],
});

const poppins = Poppins({
  weight: ['700'],
  subsets: ['latin'],
});

const montserrat = Montserrat({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
});

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginInput>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginInput>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string>('');

  // Determine if both fields have values (for button active state)
  const isFormFilled = formData.email.trim() !== '' && formData.password.trim() !== '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name as keyof LoginInput]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
    setGeneralError('');
  };

  const validateForm = (): boolean => {
    try {
      loginSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formErrors: Partial<LoginInput> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            formErrors[err.path[0] as keyof LoginInput] = err.message;
          }
        });
        setErrors(formErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormFilled) return;
    if (!validateForm()) return;

    setIsLoading(true);
    setGeneralError('');

    try {
      let finalEmail = formData.email.trim();

      if (!finalEmail.includes('@')) {
        const res = await fetch('/api/auth/lookup-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ loginId: finalEmail }),
        });
        if (!res.ok) {
          throw new Error('Invalid username or password');
        }
        const data = await res.json();
        finalEmail = data.email;
      }

      const user = await signIn(finalEmail, formData.password);

      if (user) {
        const idToken = await getIdToken();
        if (idToken) {
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: idToken }),
          });
        }
        switch (user.role) {
          case 'admin':
            router.push('/admin');
            break;
          default:
            router.push('/valuation-reports');
        }
      }
    } catch (error) {
      setGeneralError('Invalid login ID or passkey. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      {/* Card Container */}
      <div className="w-full max-w-[460px] rounded-[48px] border border-[#006ABE]/20 bg-white px-12 py-12 shadow-[0_8px_24px_rgba(0,106,190,0.12)]">
        
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src={aapLogo}
            alt="AAP Logo"
            width={64}
            height={64}
            className="object-contain"
            priority
          />
        </div>

        {/* Brand Name */}
        <div className="text-center mb-2">
          <h1 className="flex items-baseline justify-center">
            <span className={`${poppins.className} text-[2.75rem] font-bold text-[#006ABE] tracking-tight leading-none`}>
              SMART
            </span>
            <span
              className={`${dancingScript.className} text-[#006ABE] leading-none relative`}
              style={{ fontSize: '2.5rem', marginLeft: '5px', top: '-2px' }}
            >
              val
            </span>
          </h1>
        </div>

        {/* Subtitle */}
        <div className="text-center mb-10">
          <p className={`${montserrat.className} text-[0.85rem] font-semibold text-gray-800 tracking-wide`}>
            Alliance Australia Property PTY LTD
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* General Error */}
          {generalError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                <p className="text-sm text-red-700">{generalError}</p>
              </div>
            </div>
          )}

          {/* Username / Email Field */}
          <div className="mb-6">
            <input
              id="email"
              name="email"
              type="text"
              autoComplete="username"
              required
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              className={`${montserrat.className} w-full border-0 border-b-[3px] bg-transparent px-0 pb-3 pt-2 text-[1.05rem] font-medium text-[#333333] outline-none transition-colors placeholder:text-[#999999] placeholder:font-normal focus:border-b-[#006ABE] focus:ring-0 ${
                formData.email.length > 0 ? 'border-b-[#006ABE]' : 'border-b-[#BEBEBE]'
              }`}
              style={{ boxShadow: 'none' }}
              placeholder="enter your username/email"
            />
            {errors.email && (
              <div className="mt-2 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 font-medium">{errors.email}</p>
              </div>
            )}
          </div>

          {/* Password Field */}
          <div className="mb-14 relative">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              className={`${montserrat.className} w-full border-0 border-b-[3px] bg-transparent px-0 pb-3 pt-2 text-[1.05rem] font-medium text-[#333333] outline-none transition-colors placeholder:text-[#999999] placeholder:font-normal focus:border-b-[#006ABE] focus:ring-0 ${
                formData.password.length > 0 ? 'border-b-[#006ABE]' : 'border-b-[#BEBEBE]'
              }`}
              style={{ boxShadow: 'none' }}
              placeholder="enter your password"
            />
            {errors.password && (
              <div className="mt-2 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 font-medium">{errors.password}</p>
              </div>
            )}
          </div>

          {/* Sign In Button */}
          <div className="mt-2 mb-2">
            <button
              type="submit"
              disabled={isLoading}
              className={`${montserrat.className} w-full rounded-3xl py-[1.15rem] text-[1.1rem] font-semibold tracking-wide transition-all duration-300 flex items-center justify-center border ${
                isFormFilled
                  ? 'bg-[#006ABE] border-[#006ABE] text-white hover:bg-[#005a9e]'
                  : 'bg-[#F2F2F2] border-[#E5E5E5] text-[#4A4A4A] cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-3"></div>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}