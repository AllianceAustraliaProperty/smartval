'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building, Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle, MapPin } from 'lucide-react';
import { getCurrentUser, changePassword, type User } from '@/lib/auth';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

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

  // Fetch approximate sign-in location
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
    if (newPassword.length < 8) return 'Password must be at least 8 characters.';
    if (newPassword !== confirmPassword) return 'New passwords do not match.';
    if (newPassword === currentPassword) return 'New password must be different.';
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
    return (
      <div
        className={`min-h-screen relative overflow-hidden flex items-center justify-center ${inter.className}`}
        style={{ background: 'radial-gradient(ellipse 80% 75% at bottom center, #1f7cc6 20%, #ddeaf4 70%, #ffffff 90%)' }}
      >
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, #ffffff 2px, transparent 0)',
            backgroundSize: '20px 20px'
          }}
        ></div>
        <div
          className="absolute inset-0 pointer-events-none animate-breath origin-bottom"
          style={{ background: 'radial-gradient(ellipse 80% 80% at bottom center, #1f7cc6 0%, transparent 70%)'}}
        ></div>
        
        <div className="relative z-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0b70c5] border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-700 font-medium tracking-wide animate-pulse">Loading Account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-blue-100 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto p-8">
        <div className="flex items-center mb-8">
          <button
            onClick={() => router.push('/valuation-reports')}
            className="inline-flex items-center text-blue-700 hover:text-blue-800 font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8">
          <div className="flex items-center mb-6">
            <div className="relative w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-2xl mr-4">
              <Building className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent">Account Settings</h1>
              <p className="text-gray-600">Manage your account details</p>
            </div>
          </div>

          {/* Email Display */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <div className="flex items-center px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700">
              <Mail className="w-5 h-5 mr-3 text-gray-400" />
              <span className="font-medium">{currentUser?.email}</span>
            </div>
          </div>

          {/* Approximate Sign-in Location */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Approximate Sign-in Location</label>
            <div className="flex items-center px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700">
              <MapPin className="w-5 h-5 mr-3 text-gray-400" />
              {ipLoading ? (
                <span className="text-gray-600">Detecting location…</span>
              ) : ipInfo && (ipInfo.city || ipInfo.region || ipInfo.country) ? (
                <div className="flex flex-col">
                  <span className="font-medium">{[ipInfo.city, ipInfo.region, ipInfo.country].filter(Boolean).join(', ')}</span>
                  <span className="text-xs text-gray-500">IP: {ipInfo?.ip || 'N/A'} {ipInfo?.timezone ? `• ${ipInfo.timezone}` : ''}</span>
                </div>
              ) : (
                <span className="text-gray-600">Location unavailable</span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">City/region is approximate and derived from IP.</p>
          </div>

          {/* Change Password */}
          <form onSubmit={onSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Change Password</h2>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" /> {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 flex items-center">
                <CheckCircle2 className="w-5 h-5 mr-2" /> {successMsg}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  className="block w-full pr-12 pl-4 py-3 border-2 border-gray-200 rounded-xl bg-white/70 text-gray-900"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowCurrent(!showCurrent)}>
                  {showCurrent ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="block w-full pr-12 pl-4 py-3 border-2 border-gray-200 rounded-xl bg-white/70 text-gray-900"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowNew(!showNew)}>
                    {showNew ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="block w-full pr-12 pl-4 py-3 border-2 border-gray-200 rounded-xl bg-white/70 text-gray-900"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex items-center px-6 py-3 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
            >
              <Lock className="w-4 h-4 mr-2" />
              {submitting ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}


