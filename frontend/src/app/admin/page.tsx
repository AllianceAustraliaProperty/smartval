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
  Home,
  ChevronRight
} from 'lucide-react';
import { getCurrentUser, signOut, getAllUsers, createUser, type User } from '@/lib/auth';
import { SECURITY_CONFIG, SECURITY_EVENTS } from '@/lib/security-config';


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
  uptime: string;
  lastBackup: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'security' | 'settings'>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    securityEvents: 0,
    uptime: '0 days',
    lastBackup: 'Never'
  });
  const [isLoading, setIsLoading] = useState(true);

  // Check admin access
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
        
        // Load admin data
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
      // Load users
      const allUsers = await getAllUsers();
      setUsers(allUsers);

      // Mock security events for demo
      const mockEvents: SecurityEvent[] = [
        {
          id: '1',
          type: SECURITY_EVENTS.LOGIN_SUCCESS,
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          user: 'admin@valai.com',
          ip: '192.168.1.100',
          details: 'Successful admin login',
          severity: 'low'
        },
        {
          id: '2',
          type: SECURITY_EVENTS.LOGIN_FAILURE,
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          user: 'unknown@test.com',
          ip: '192.168.1.50',
          details: 'Failed login attempt with invalid credentials',
          severity: 'medium'
        },
        {
          id: '3',
          type: SECURITY_EVENTS.RATE_LIMIT_EXCEEDED,
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          user: 'unknown',
          ip: '10.0.0.45',
          details: 'Rate limit exceeded on /api/auth/login',
          severity: 'high'
        },
        {
          id: '4',
          type: SECURITY_EVENTS.PERMISSION_DENIED,
          timestamp: new Date(Date.now() - 45 * 60 * 1000),
          user: 'user@valai.com',
          ip: '192.168.1.75',
          details: 'Attempted to access admin panel without permissions',
          severity: 'medium'
        }
      ];
      setSecurityEvents(mockEvents);

      // Update system stats
      setSystemStats({
        totalUsers: allUsers.length,
        activeUsers: allUsers.filter(u => u.lastLogin && 
          new Date().getTime() - u.lastLogin.getTime() < 24 * 60 * 60 * 1000).length,
        securityEvents: mockEvents.length,
        uptime: '2 days, 14 hours',
        lastBackup: new Date().toLocaleDateString('en-AU')
      });
    } catch (error) {
      console.error('Failed to load admin data:', error);
    }
  };

  const handleLogout = async () => {
    signOut();
    router.push('/login');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
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
    return (
      <div
        className={`min-h-screen relative overflow-hidden flex items-center justify-center`}
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
          <p className="text-slate-700 font-medium tracking-wide animate-pulse">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-xl sticky top-0 z-50">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-700 rounded-2xl blur-lg opacity-75"></div>
                  <div className="relative w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-2xl">
                    <Building className="w-6 h-6 text-white drop-shadow-lg" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent">
                    SMARTval Admin
                  </h1>
                  <p className="text-sm text-gray-600 font-medium">System Administration</p>
                </div>
              </div>

              {/* Breadcrumb */}
              <div className="flex items-center text-sm text-gray-500">
                <Home className="w-4 h-4" />
                <ChevronRight className="w-4 h-4 mx-2" />
                <span className="text-blue-600 font-medium">Admin Dashboard</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-200">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  {currentUser?.name}
                </span>
              </div>
              
              <button
                onClick={() => router.push('/properties')}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors duration-200"
              >
                <Building className="w-4 h-4 mr-2" />
                Properties
              </button>
              
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white/70 backdrop-blur-xl border-r border-white/30 min-h-screen p-6">
          <nav className="space-y-2">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'users', label: 'User Management', icon: Users },
              { id: 'security', label: 'Security Events', icon: Shield },
              { id: 'settings', label: 'System Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">System Overview</h2>
                <p className="text-gray-600">Monitor system health and security status</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { 
                    label: 'Total Users', 
                    value: systemStats.totalUsers, 
                    icon: Users, 
                    color: 'blue',
                    change: '+2 this week'
                  },
                  { 
                    label: 'Active Users', 
                    value: systemStats.activeUsers, 
                    icon: Activity, 
                    color: 'green',
                    change: 'Last 24h'
                  },
                  { 
                    label: 'Security Events', 
                    value: systemStats.securityEvents, 
                    icon: AlertTriangle, 
                    color: 'yellow',
                    change: 'Last 24h'
                  },
                  { 
                    label: 'System Uptime', 
                    value: systemStats.uptime, 
                    icon: Clock, 
                    color: 'purple',
                    change: '99.9% availability'
                  },
                ].map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 bg-${stat.color}-100 rounded-xl flex items-center justify-center`}>
                          <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                        </div>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
                        <p className="text-xs text-gray-500">{stat.change}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recent Activity */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Security Events</h3>
                <div className="space-y-3">
                  {securityEvents.slice(0, 5).map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center space-x-4">
                        <div className={`px-2 py-1 rounded-lg text-xs font-medium border ${getSeverityColor(event.severity)}`}>
                          {event.severity.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{event.type.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-gray-600">{event.details}</p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>{formatTimeAgo(event.timestamp)}</p>
                        <p>{event.ip}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">User Management</h2>
                  <p className="text-gray-600">Manage user accounts and permissions</p>
                </div>
                <button className="inline-flex items-center px-6 py-3 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Add New User
                </button>
              </div>

              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-blue-600 font-medium text-sm">
                                    {user.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === 'admin' ? 'bg-red-100 text-red-800' :
                              user.role === 'valuer' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.lastLogin ? formatTimeAgo(user.lastLogin) : 'Never'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Active
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button className="text-blue-600 hover:text-blue-900">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-gray-600 hover:text-gray-900">
                              <Settings className="w-4 h-4" />
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

          {activeTab === 'security' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Security Events</h2>
                <p className="text-gray-600">Monitor security events and system threats</p>
              </div>

              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 p-6">
                <div className="space-y-4">
                  {securityEvents.map((event) => (
                    <div key={event.id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-xl">
                      <div className={`px-3 py-1 rounded-lg text-xs font-bold border ${getSeverityColor(event.severity)}`}>
                        {event.severity.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{event.type.replace(/_/g, ' ')}</h4>
                          <span className="text-sm text-gray-500">{formatTimeAgo(event.timestamp)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{event.details}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>User: {event.user}</span>
                          <span>IP: {event.ip}</span>
                          <span>Time: {event.timestamp.toLocaleDateString('en-AU')} {event.timestamp.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">System Settings</h2>
                <p className="text-gray-600">Configure security and system parameters</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Security Configuration</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Rate Limiting</span>
                      <span className="text-sm text-green-600">Enabled</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">CSRF Protection</span>
                      <span className="text-sm text-green-600">Enabled</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Account Lockout</span>
                      <span className="text-sm text-green-600">{SECURITY_CONFIG.LOCKOUT.MAX_ATTEMPTS} attempts</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Session Timeout</span>
                      <span className="text-sm text-green-600">{SECURITY_CONFIG.SESSION.TIMEOUT / 60000}min</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">System Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Version</span>
                      <span className="text-sm text-gray-600">v1.0.0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Environment</span>
                      <span className="text-sm text-gray-600">{process.env.NODE_ENV}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Last Backup</span>
                      <span className="text-sm text-gray-600">{systemStats.lastBackup}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Uptime</span>
                      <span className="text-sm text-gray-600">{systemStats.uptime}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
} 