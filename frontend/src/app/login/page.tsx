'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Shield, Lock, Mail, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import aapLogo from '../aap-logo.svg';
import { Dancing_Script} from 'next/font/google';
import { signIn, getCurrentUser, getIdToken } from '@/lib/auth';
import { loginSchema, type LoginInput } from '@/lib/validation';
import { z } from 'zod';

const dancingScript = Dancing_Script({
  weight: ['700'],
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
  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear errors as user types
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

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setGeneralError('');

    try {
      const user = await signIn(formData.email, formData.password);

      if (user) {
        // Get Firebase ID token and set it via HttpOnly cookie API route
        const idToken = await getIdToken();
        if (idToken) {
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: idToken }),
          });
        }

        // Redirect based on user role
        switch (user.role) {
          case 'admin':
            router.push('/admin');
            break;
          case 'valuer':
            router.push('/valuation-reports');
            break;
          default:
            router.push('/valuation-reports');
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        setGeneralError(error.message);
      } else {
        setGeneralError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen relative overflow-hidden flex items-center justify-center`}
      style={{ background: 'radial-gradient(ellipse 80% 75% at bottom center, #1f7cc6 20%, #ddeaf4 70%, #ffffff 90%)' }}
    >

      {/* breathing glow of the background overlay */}
      <div
      className="absolute inset-0 pointer-events-none animate-breath origin-bottom"
      style={{ background: 'radial-gradient(ellipse 80% 80% at bottom center, #1f7cc6 0%, transparent 70%)'}}
      ></div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg min-w-0 sm:min-w-[450px]">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              {/* Add the "group" class here so hovering triggers children */}
              <div className="relative group cursor-pointer">

                {/* The glowing aura */}
                <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl transition-all duration-500 ease-out group-hover:scale-[1.3] group-hover:opacity-100 group-hover:blur-2xl"></div>
                                                                                                                                                       
                {/* The circular logo container */}                                                                                                
                <div                                                                                                                               
                  className="relative w-24 h-24 rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(59,130,246,0.15)] border border-white transform transition-transform duration-500 ease-out group-hover:scale-105"
                  style={{
                    background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #e2e8f0 100%)'
                  }}
                >
                  <Image
                    src={aapLogo}
                    alt="AAP Logo"
                    width={64}
                    height={64}
                    className="w-16 h-16 object-contain drop-shadow-sm"
                    priority
                  />
                </div>
              </div>
            </div>

            <h1 className="text-5xl tracking-wide mb-3 flex items-center justify-center">
              <span className={`font-bold text-[#1f7cc6]`}>SMART</span>
              <span className={`text-[#1f7cc6] relative -top-[0.1px] ${dancingScript.className}`} style={{ marginLeft: '2px', fontSize: '1.05em' }}>val</span>
            </h1>
            <p className="text-slate-700 tracking-wide font-medium mb-3 text-sm">A Digital Solution for Alliance Australia Property PTY LTD</p>
            <div className="flex items-center justify-center text-sm text-slate-500 tracking-wider">
              <Shield className="w-4 h-4 mr-1.5 opacity-70" />
              Secure Dashboard Portal
            </div>
          </div>

          {/* Login Form */}
          <div className="w-full px-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* General Error Message */}
              {generalError && (
                <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                    <p className="text-sm text-red-700">{generalError}</p>
                  </div>
                </div>
              )}

              {/* Login ID Field */}
              <div className="flex flex-col">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={`block w-full pl-12 pr-4 py-4 border rounded-3xl shadow-inner transition-all duration-300 ${errors.email
                      ? 'border-red-300 bg-red-50/50'
                      : 'border-white/40 bg-white/30 hover:bg-white/40 focus:bg-white/50 focus:border-white/60'
                    } focus:ring-4 focus:ring-white/20 text-slate-800 placeholder-slate-400 font-medium outline-none`}
                    placeholder="Login ID"
                  />
                  {errors.email && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                </div>
                {errors.email && (
                  <div className="mt-2 ml-2 flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600 font-medium break-words leading-snug min-w-0 flex-1">
                      {errors.email}
                    </p>
                  </div>
                )}
              </div>

              {/* Passkey Field */}
              <div className="flex flex-col">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={`block w-full pl-12 pr-12 py-4 border rounded-3xl shadow-inner transition-all duration-300 ${errors.password
                      ? 'border-red-300 bg-red-50/50'
                      : 'border-white/40 bg-white/30 hover:bg-white/40 focus:bg-white/50 focus:border-white/60'
                    } focus:ring-4 focus:ring-white/20 text-slate-800 placeholder-slate-400 font-medium outline-none`}
                    placeholder="Passkey"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-slate-500 hover:text-slate-700 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-slate-700 hover:text-slate-900 transition-colors" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <div className="mt-2 ml-2 flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600 font-medium break-words leading-snug flex-1">
                      {errors.password}
                    </p>
                  </div>
                )}
              </div>

              {/* Divider */}
                  <hr className="border-t border-[#000000]/25 my-6 mx-2" />

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0b70c5] text-white font-bold text-lg tracking-wide rounded-3xl py-4 transition-all duration-300 border border-white/50 disabled:opacity-50 flex items-center justify-center hover:[text-shadow:0_0_12px_rgba(255,255,255,0.9)] hover:brightness-105"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}