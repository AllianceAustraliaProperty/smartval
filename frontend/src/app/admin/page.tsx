'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building, 
  Shield, 
  Users, 
  Activity, 
  AlertTriangle, 
  Settings, 
  Lock, 
  Eye, 
  UserPlus, 
  Database,
  TrendingUp,
  Clock,
  Globe,
  FileText,
  LogOut,
  Mail,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { getCurrentUser, signOut, getAllUsers, createUser, updateUser, type User } from '@/lib/auth';
import { SECURITY_CONFIG } from '@/lib/security-config';
import { apiRepository } from '@/lib/api-repository';
import LoadingScreen from '@/components/ui/LoadingScreen';
import AdminMetricCard from '@/components/admin/AdminMetricCard';

interface SecurityEvent {
  id: string;
  type: string;
  timestamp: Date;
  user: string;
  ip: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  securityEvents: number;
  totalReports: number;
  reportsThisWeek: number;
  uptime: string;
  lastBackup: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'security' | 'settings' | 'trash'>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [trashedReports, setTrashedReports] = useState<any[]>([]);
  const [isFetchingTrash, setIsFetchingTrash] = useState(false);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    securityEvents: 0,
    totalReports: 0,
    reportsThisWeek: 0,
    uptime: '0m',
    lastBackup: 'Automatic',
  });
  const [isLoading, setIsLoading] = useState(true);

  // user creation modal state
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({ name: '', email: '', username: '', password: '' });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState('');

  // user editing modal state
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editUserData, setEditUserData] = useState({ name: '', username: '', password: '', isActive: true });
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [updateUserError, setUpdateUserError] = useState('');

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    setCreateUserError('');
    try {
      const newUser = await createUser(newUserData.email, newUserData.password, newUserData.name, newUserData.username);
      if (newUser) {
        setUsers([newUser, ...users]);
        setIsAddUserModalOpen(false);
        setNewUserData({ name: '', email: '', username: '', password: '' });
        setSystemStats(prev => ({ ...prev, totalUsers: prev.totalUsers + 1 }));
      }
    } catch (error: any) {
      setCreateUserError(error.message || 'Failed to create user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditUserData({ name: user.name, username: user.username || '', password: '', isActive: user.isActive !== false });
    setIsEditUserModalOpen(true);
    setUpdateUserError('');
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsUpdatingUser(true);
    setUpdateUserError('');
    try {
      const updatePayload: any = { name: editUserData.name, username: editUserData.username, isActive: editUserData.isActive };
      if (editUserData.password) updatePayload.password = editUserData.password;
      
      const updatedUser = await updateUser(editingUser.id, updatePayload);
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...updatedUser } : u));
      setIsEditUserModalOpen(false);
    } catch (error: any) {
      setUpdateUserError(error.message || 'Failed to update user');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const fetchTrashed = async () => {
    setIsFetchingTrash(true);
    try {
      const results = await apiRepository.getTrashedProperties();
      setTrashedReports(results.map(r => r.property));
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingTrash(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'trash') {
      fetchTrashed();
    }
  }, [activeTab]);

  const handleRestore = async (id: string) => {
    if (confirm('Restore this valuation report?')) {
      try {
        await apiRepository.restoreProperty(id);
        fetchTrashed();
      } catch (e) {
        alert('Failed to restore report.');
      }
    }
  };

  const handleHardDelete = async (id: string) => {
    if (confirm('Permanently delete this report? This action cannot be undone.')) {
      try {
        await apiRepository.hardDeleteProperty(id);
        fetchTrashed();
      } catch (e) {
        alert('Failed to permanently delete report.');
      }
    }
  };

  // check admin access and load live metrics
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push('/login');
          return;
        }
        if (user.role !== 'admin') {
          router.push('/valuation-reports');
          return;
        }
        setCurrentUser(user);
        await loadAdminData();
      } catch (error) {
        console.error('Admin access check failed:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  const loadAdminData = async () => {
    try {
      // load registered users
      const allUsers = await getAllUsers();
      setUsers(allUsers);

      // fetch live metrics from dedicated endpoint
      const res = await fetch('/api/admin/metrics');
      if (res.ok) {
        const metrics = await res.json();
        setSystemStats({
          totalUsers: metrics.totalUsers || allUsers.length,
          activeUsers: metrics.activeUsers || 0,
          securityEvents: metrics.securityEventsCount || 0,
          totalReports: metrics.totalReports || 0,
          reportsThisWeek: metrics.reportsThisWeek || 0,
          uptime: metrics.uptime || '15m',
          lastBackup: new Date().toLocaleDateString('en-AU'),
        });
        setSecurityEvents(metrics.securityEvents || []);
      } else {
        // fallback to client-side user counts if metrics endpoint unavailable
        setSystemStats({
          totalUsers: allUsers.length,
          activeUsers: allUsers.filter(u => u.lastLogin && new Date().getTime() - u.lastLogin.getTime() < 24 * 60 * 60 * 1000).length,
          securityEvents: 0,
          totalReports: 0,
          reportsThisWeek: 0,
          uptime: 'Online',
          lastBackup: new Date().toLocaleDateString('en-AU'),
        });
        setSecurityEvents([]);
      }
    } catch (error) {
      console.error('Failed to load admin telemetry:', error);
    }
  };

  const handleLogout = async () => {
    signOut();
    router.push('/login');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 text-red-700 border-red-200';
      case 'high': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'medium': return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      default: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (isLoading) {
    return <LoadingScreen message="Loading Admin Console..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* branded royal blue top bar */}
      <header className="bg-white border-b border-blue-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-11 h-11 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-[#006ABE] shadow-xs">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#006ABE] tracking-tight">
                  SMARTval Admin Console
                </h1>
              </div>
            </div>

            {/* quick navigation actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                type="button"
                onClick={() => router.push('/valuation-reports')}
                className="inline-flex items-center px-4 py-2 text-xs sm:text-sm font-semibold rounded-full text-slate-700 bg-white border border-slate-200 hover:border-[#006ABE] hover:text-[#006ABE] shadow-xs transition-all duration-200 cursor-pointer"
              >
                <Building className="w-4 h-4 mr-1.5 text-slate-400" />
                Reports
              </button>

              <button
                type="button"
                onClick={() => router.push('/settings')}
                className="inline-flex items-center px-4 py-2 text-xs sm:text-sm font-semibold rounded-full text-slate-700 bg-white border border-slate-200 hover:border-[#006ABE] hover:text-[#006ABE] shadow-xs transition-all duration-200 cursor-pointer"
              >
                <Mail className="w-4 h-4 mr-1.5 text-slate-400" />
                Templates
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 text-xs sm:text-sm font-semibold rounded-full text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-all duration-200 cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* main body container */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1">
        {/* segmented navigation tab controls */}
        <div className="flex items-center space-x-2 p-1.5 bg-slate-200/70 rounded-full w-full sm:w-fit overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'users', label: 'User Management', icon: Users },
            { id: 'security', label: 'Security Events', icon: Shield },
            { id: 'settings', label: 'System Settings', icon: Settings },
            { id: 'trash', label: 'Trash / Recovery', icon: Trash2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#006ABE] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* tab 1: overview */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">System Overview</h2>
              <p className="text-sm text-slate-500 font-medium">Real-time database statistics and platform telemetry</p>
            </div>

            {/* 4 live metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <AdminMetricCard
                title="Total Users"
                value={systemStats.totalUsers}
                subtitle="Active registered valuers"
                icon={Users}
                badgeText="+ live"
                badgeVariant="blue"
              />
              <AdminMetricCard
                title="Active Users"
                value={systemStats.activeUsers}
                subtitle="Signed in last 24h"
                icon={Activity}
                badgeText="active"
                badgeVariant="emerald"
              />
              <AdminMetricCard
                title="Security Events"
                value={systemStats.securityEvents}
                subtitle="Infractions last 24h"
                icon={AlertTriangle}
                badgeText="clean"
                badgeVariant="emerald"
              />
              <AdminMetricCard
                title="System Uptime"
                value={systemStats.uptime}
                subtitle="Process availability"
                icon={Clock}
                badgeText="healthy"
                badgeVariant="blue"
              />
            </div>

            {/* recent security events */}
            <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-[#006ABE]">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Recent Security Events</h3>
                    <p className="text-xs text-slate-500">Live audit telemetry stream</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadAdminData}
                  className="inline-flex items-center text-xs font-semibold text-[#006ABE] hover:underline cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
                </button>
              </div>

              {securityEvents.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-[#006ABE] mb-3">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800">No Security Events Recorded</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    No suspicious activity, failed login attempts, or rate limit infractions detected in the last 24 hours.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {securityEvents.slice(0, 5).map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center space-x-4">
                        <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getSeverityColor(event.severity)}`}>
                          {event.severity.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{event.type.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-slate-500">{event.details}</p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <p className="font-semibold text-slate-700">{formatTimeAgo(event.timestamp)}</p>
                        <p className="font-mono text-[11px] text-slate-400">{event.ip}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* tab 2: user management */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">User Management</h2>
                <p className="text-sm text-slate-500 font-medium">Manage valuer accounts, credentials, and access roles</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(true)}
                className="inline-flex items-center px-6 py-2.5 text-sm font-bold rounded-full text-white bg-[#006ABE] hover:bg-[#00589e] shadow-sm hover:shadow transition-all duration-200 cursor-pointer self-start sm:self-auto"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add New User
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Last Login</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 text-[#006ABE] font-bold flex items-center justify-center shrink-0">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-3">
                              <div className="font-bold text-slate-900">{user.name}</div>
                              <div className="text-xs text-slate-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-0.5 text-xs font-bold rounded-full border ${
                            user.role === 'admin' ? 'bg-red-50 text-red-700 border-red-200' :
                            user.role === 'valuer' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-medium">
                          {user.lastLogin ? formatTimeAgo(user.lastLogin) : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.isActive !== false ? (
                            <span className="inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              Disabled
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border border-slate-200 text-slate-700 hover:border-[#006ABE] hover:text-[#006ABE] transition-colors cursor-pointer"
                          >
                            <Settings className="w-3.5 h-3.5 mr-1" /> Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* tab 3: security events */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Security Events & Audit Log</h2>
              <p className="text-sm text-slate-500 font-medium">System threat monitoring and access log inspection</p>
            </div>

            <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-8 space-y-6">
              {securityEvents.length === 0 ? (
                <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center space-y-3">
                  <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-[#006ABE]">
                    <Shield className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">No Security Events Recorded</h3>
                  <p className="text-sm text-slate-500 max-w-md">
                    Zero authentication failures, unauthorized access attempts, or rate limit infractions were logged in the last 24 hours.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {securityEvents.map((event) => (
                    <div key={event.id} className="flex items-start space-x-4 p-5 border border-slate-200 rounded-2xl bg-slate-50">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getSeverityColor(event.severity)}`}>
                        {event.severity.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="font-bold text-slate-900">{event.type.replace(/_/g, ' ')}</h4>
                          <span className="text-xs text-slate-500 font-medium">{formatTimeAgo(event.timestamp)}</span>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{event.details}</p>
                        <div className="flex items-center space-x-4 text-xs text-slate-400">
                          <span>User: {event.user}</span>
                          <span>IP: {event.ip}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* tab 4: system settings */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">System Parameters</h2>
              <p className="text-sm text-slate-500 font-medium">Platform environment parameters and security guardrails</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-8 space-y-4">
                <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-[#006ABE]">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Security Configuration</h3>
                </div>
                <div className="space-y-3 pt-2 text-sm">
                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-600 font-medium">Rate Limiting</span>
                    <span className="font-bold text-emerald-600">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-600 font-medium">CSRF Protection</span>
                    <span className="font-bold text-emerald-600">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-600 font-medium">Account Lockout</span>
                    <span className="font-bold text-slate-900">{SECURITY_CONFIG.LOCKOUT.MAX_ATTEMPTS} attempts</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600 font-medium">Session Timeout</span>
                    <span className="font-bold text-slate-900">{SECURITY_CONFIG.SESSION.TIMEOUT / 60000} minutes</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-8 space-y-4">
                <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-[#006ABE]">
                    <Database className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">System Telemetry</h3>
                </div>
                <div className="space-y-3 pt-2 text-sm">
                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-600 font-medium">Version</span>
                    <span className="font-mono text-xs font-bold text-[#006ABE]">v1.0.0</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-600 font-medium">Environment</span>
                    <span className="font-bold text-slate-900">{process.env.NODE_ENV || 'production'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-600 font-medium">Database State</span>
                    <span className="font-bold text-emerald-600">Connected</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600 font-medium">Uptime</span>
                    <span className="font-bold text-slate-900">{systemStats.uptime}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* tab 5: trash & recovery */}
        {activeTab === 'trash' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Trash & Recovery</h2>
                <p className="text-sm text-slate-500 font-medium">Restore or permanently delete soft-deleted valuation reports</p>
              </div>
              <button
                type="button"
                onClick={fetchTrashed}
                className="inline-flex items-center px-4 py-2 text-xs sm:text-sm font-semibold rounded-full border border-slate-200 text-slate-700 hover:border-[#006ABE] hover:text-[#006ABE] transition-colors cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isFetchingTrash ? 'animate-spin' : ''}`} />
                Refresh Trash
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">File Number / ID</th>
                      <th className="px-6 py-4">Address</th>
                      <th className="px-6 py-4">Deleted At</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {trashedReports.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">
                          No deleted reports in trash. All items are active.
                        </td>
                      </tr>
                    ) : (
                      trashedReports.map((report) => (
                        <tr key={report.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">
                            {report.fileNumber || report.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600 text-xs font-medium">
                            {report.address?.fullAddress || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                            {report.deletedAt ? new Date(report.deletedAt).toLocaleDateString('en-AU') : 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleRestore(report.id)}
                              className="px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full hover:bg-emerald-100 transition-colors cursor-pointer"
                            >
                              Restore
                            </button>
                            <button
                              type="button"
                              onClick={() => handleHardDelete(report.id)}
                              className="px-3 py-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-full hover:bg-red-100 transition-colors cursor-pointer"
                            >
                              Permanently Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* add user modal */}
        {isAddUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-blue-100">
              <h3 className="text-xl font-extrabold text-slate-900 mb-1">Add New Valuer</h3>
              <p className="text-xs text-slate-500 mb-6">Create credentials for a valuer to access SMARTval</p>
              
              <form onSubmit={handleCreateUser} className="space-y-4">
                {createUserError && (
                  <div className="p-3.5 bg-red-50 text-red-700 text-xs font-medium rounded-2xl border border-red-200 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{createUserError}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Full Name</label>
                  <input
                    required
                    type="text"
                    value={newUserData.name}
                    onChange={e => setNewUserData({...newUserData, name: e.target.value})}
                    className="w-full h-11 px-5 rounded-full border border-slate-300 bg-white text-slate-900 font-medium text-sm outline-none transition-all hover:border-[#006ABE] focus:border-[#006ABE] focus:ring-2 focus:ring-[#006ABE]/15"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Username (e.g. jsmith)</label>
                  <input
                    required
                    type="text"
                    value={newUserData.username}
                    onChange={e => setNewUserData({...newUserData, username: e.target.value})}
                    className="w-full h-11 px-5 rounded-full border border-slate-300 bg-white text-slate-900 font-medium text-sm outline-none transition-all hover:border-[#006ABE] focus:border-[#006ABE] focus:ring-2 focus:ring-[#006ABE]/15"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email Address</label>
                  <input
                    required
                    type="email"
                    value={newUserData.email}
                    onChange={e => setNewUserData({...newUserData, email: e.target.value})}
                    className="w-full h-11 px-5 rounded-full border border-slate-300 bg-white text-slate-900 font-medium text-sm outline-none transition-all hover:border-[#006ABE] focus:border-[#006ABE] focus:ring-2 focus:ring-[#006ABE]/15"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Temporary Password</label>
                  <input
                    required
                    type="password"
                    value={newUserData.password}
                    onChange={e => setNewUserData({...newUserData, password: e.target.value})}
                    className="w-full h-11 px-5 rounded-full border border-slate-300 bg-white text-slate-900 font-medium text-sm outline-none transition-all hover:border-[#006ABE] focus:border-[#006ABE] focus:ring-2 focus:ring-[#006ABE]/15"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddUserModalOpen(false)}
                    className="px-5 py-2.5 text-xs font-semibold rounded-full text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingUser}
                    className="px-6 py-2.5 text-xs font-bold rounded-full text-white bg-[#006ABE] hover:bg-[#00589e] transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isCreatingUser ? 'Creating...' : 'Create Valuer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* edit user modal */}
        {isEditUserModalOpen && editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-blue-100">
              <h3 className="text-xl font-extrabold text-slate-900 mb-1">Edit User</h3>
              <p className="text-xs text-slate-500 mb-6">{editingUser.email}</p>
              
              <form onSubmit={handleUpdateUser} className="space-y-4">
                {updateUserError && (
                  <div className="p-3.5 bg-red-50 text-red-700 text-xs font-medium rounded-2xl border border-red-200 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{updateUserError}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Full Name</label>
                  <input
                    required
                    type="text"
                    value={editUserData.name}
                    onChange={e => setEditUserData({...editUserData, name: e.target.value})}
                    className="w-full h-11 px-5 rounded-full border border-slate-300 bg-white text-slate-900 font-medium text-sm outline-none transition-all hover:border-[#006ABE] focus:border-[#006ABE] focus:ring-2 focus:ring-[#006ABE]/15"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Username</label>
                  <input
                    required
                    type="text"
                    value={editUserData.username}
                    onChange={e => setEditUserData({...editUserData, username: e.target.value})}
                    className="w-full h-11 px-5 rounded-full border border-slate-300 bg-white text-slate-900 font-medium text-sm outline-none transition-all hover:border-[#006ABE] focus:border-[#006ABE] focus:ring-2 focus:ring-[#006ABE]/15"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">New Password (leave blank to keep current)</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={editUserData.password}
                    onChange={e => setEditUserData({...editUserData, password: e.target.value})}
                    className="w-full h-11 px-5 rounded-full border border-slate-300 bg-white text-slate-900 font-medium text-sm outline-none transition-all hover:border-[#006ABE] focus:border-[#006ABE] focus:ring-2 focus:ring-[#006ABE]/15"
                  />
                </div>
                <div className="flex items-center pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editUserData.isActive}
                    onChange={e => setEditUserData({...editUserData, isActive: e.target.checked})}
                    className="w-4 h-4 text-[#006ABE] border-slate-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2.5 text-xs font-semibold text-slate-700">Account is Active</label>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditUserModalOpen(false)}
                    className="px-5 py-2.5 text-xs font-semibold rounded-full text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingUser}
                    className="px-6 py-2.5 text-xs font-bold rounded-full text-white bg-[#006ABE] hover:bg-[#00589e] transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isUpdatingUser ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
