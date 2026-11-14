'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User as UserIcon, Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle, MapPin, Shield } from 'lucide-react';
import { getCurrentUser, changePassword, type User } from '@/lib/auth';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function AccountPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [ipInfo, setIpInfo] = useState<{ ip?: string | null; city?: string | null; region?: string | null; country?: string | null; timezone?: string | null } | null>(null);
  const [ipLoading, setIpLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setCurrentUser(user);
      } catch (e) {
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [router]);

  // fetch approximate sign-in location with graceful fallback
  useEffect(() => {
    const fetchIp = async () => {
      try {
        setIpLoading(true);
        const res = await fetch('/api/whoami', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setIpInfo(data);
        } else {
          setIpInfo(null);
        }
      } catch (_) {
        setIpInfo(null);
      } finally {
        setIpLoading(false);
      }
    };
    fetchIp();
  }, []);

  const validate = (): string | null => {
    if (newPassword !== confirmPassword) return 'New passwords do not match.';
    if (newPassword === currentPassword) return 'New password must be different.';
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.';
    }
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    const err = validate();
    if (err) {
      setErrorMsg(err);
      return;
    }
    try {
      setSubmitting(true);
      await changePassword(currentPassword, newPassword);
      setSuccessMsg('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setErrorMsg(error?.message || 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading Account Settings..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* navigation back to dashboard */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.push('/valuation-reports')}
            className="group inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-full hover:border-[#006ABE] hover:text-[#006ABE] shadow-xs transition-all duration-200 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
            Back to Dashboard
          </button>
        </div>

        {/* main elevated card shell matching report wizard aesthetic */}
        <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-8 sm:p-10 space-y-8">
          {/* header with royal blue brand badge */}
          <div className="flex items-center space-x-4 border-b border-slate-100 pb-6">
            <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-[#006ABE] shadow-xs">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#006ABE] tracking-tight">
                Account Settings
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Manage your credentials and security preferences
              </p>
            </div>
          </div>

          {/* email address display */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Registered Email
            </label>
            <div className="flex items-center px-5 py-3 border border-slate-200 rounded-full bg-slate-50/70 text-slate-800 text-sm font-semibold">
              <Mail className="w-4 h-4 mr-3 text-slate-400" />
              <span>{currentUser?.email}</span>
            </div>
          </div>

          {/* approximate sign-in location */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Approximate Sign-in Location
            </label>
            <div className="flex items-center px-5 py-3 border border-slate-200 rounded-full bg-slate-50/70 text-slate-800 text-sm">
              <MapPin className="w-4 h-4 mr-3 text-slate-400 shrink-0" />
              {ipLoading ? (
                <span className="text-slate-500 text-sm">Detecting connection info…</span>
              ) : ipInfo && (ipInfo.city || ipInfo.region || ipInfo.country) ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-800">
                    {[ipInfo.city, ipInfo.region, ipInfo.country].filter(Boolean).join(', ')}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ({ipInfo?.ip || 'N/A'}{ipInfo?.timezone ? ` • ${ipInfo.timezone}` : ''})
                  </span>
                </div>
              ) : (
                <span className="text-slate-500 font-medium text-sm">
                  Approximate location not detected
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 pl-2">
              Derived from connection IP when available.
            </p>
          </div>

          {/* change password form */}
          <form onSubmit={onSubmit} className="pt-6 border-t border-slate-100 space-y-6">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-[#006ABE]" />
              <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm font-medium flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 text-sm font-medium flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  className="w-full h-11 px-5 pr-12 rounded-full border border-slate-300 bg-white text-slate-900 font-medium text-sm outline-none transition-all hover:border-[#006ABE] focus:border-[#006ABE] focus:ring-2 focus:ring-[#006ABE]/15"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer text-slate-400 hover:text-slate-600"
                  onClick={() => setShowCurrent(!showCurrent)}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="w-full h-11 px-5 pr-12 rounded-full border border-slate-300 bg-white text-slate-900 font-medium text-sm outline-none transition-all hover:border-[#006ABE] focus:border-[#006ABE] focus:ring-2 focus:ring-[#006ABE]/15"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer text-slate-400 hover:text-slate-600"
                    onClick={() => setShowNew(!showNew)}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="w-full h-11 px-5 pr-12 rounded-full border border-slate-300 bg-white text-slate-900 font-medium text-sm outline-none transition-all hover:border-[#006ABE] focus:border-[#006ABE] focus:ring-2 focus:ring-[#006ABE]/15"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer text-slate-400 hover:text-slate-600"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center px-7 py-3 text-sm font-bold rounded-full text-white bg-[#006ABE] hover:bg-[#00589e] shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                <Lock className="w-4 h-4 mr-2" />
                {submitting ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
