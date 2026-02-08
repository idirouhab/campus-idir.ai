'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AppRole } from '@/lib/roles/app-role';

interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  roles: AppRole[];
}

const ROLE_OPTIONS: AppRole[] = ['super_admin', 'billing_admin', 'instructor', 'student'];

export default function ManageUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AppRole>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [openRolesFor, setOpenRolesFor] = useState<string | null>(null);
  const [createRolesOpen, setCreateRolesOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    roles: [] as AppRole[],
  });

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.email.localeCompare(b.email));
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sortedUsers.filter((user) => {
      const matchesQuery =
        !query ||
        user.email.toLowerCase().includes(query) ||
        user.first_name.toLowerCase().includes(query) ||
        user.last_name.toLowerCase().includes(query);
      const matchesRole = roleFilter === 'all' || (user.roles || []).includes(roleFilter);
      const matchesActive =
        activeFilter === 'all' ||
        (activeFilter === 'active' && user.is_active) ||
        (activeFilter === 'inactive' && !user.is_active);
      return matchesQuery && matchesRole && matchesActive;
    });
  }, [sortedUsers, search, roleFilter, activeFilter]);

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      try {
        const sessionRes = await fetch('/api/auth/session', { credentials: 'include' });
        if (!sessionRes.ok) {
          router.push('/instructor/login');
          return;
        }
        const sessionData = await sessionRes.json();
        const roles = sessionData?.user?.roles || [];
        if (!roles.includes('super_admin')) {
          router.push('/instructor/dashboard');
          return;
        }

        const res = await fetch('/api/admin/users', { credentials: 'include' });
        if (!res.ok) {
          throw new Error('Failed to load users');
        }
        const data = await res.json();
        setUsers(data.users || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndLoad();
  }, [router]);

  const updateUserField = (id: string, patch: Partial<AdminUser>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };

  const handleRoleChange = (id: string, selected: AppRole[]) => {
    updateUserField(id, { roles: selected });
  };

  const handleSave = async (user: AdminUser) => {
    setSaving(user.id);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          isActive: user.is_active,
          roles: user.roles,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      setSuccess('User updated');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;

    setSaving(id);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setSuccess('User deleted');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    } finally {
      setSaving(null);
    }
  };

  const handleCreate = async () => {
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          password: newUser.password,
          roles: newUser.roles,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      const refreshed = await fetch('/api/admin/users', { credentials: 'include' });
      const refreshedData = await refreshed.json();
      setUsers(refreshedData.users || []);

              setNewUser({ email: '', firstName: '', lastName: '', password: '', roles: [] });
      setSuccess('User created');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-600 mt-1">Super admin only</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-600">
              Total Users: <span className="font-semibold text-gray-900">{users.length}</span>
            </div>
            <Link
              href="/instructor/dashboard"
              className="text-sm text-[#10b981] hover:text-[#059669] font-semibold"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 p-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm">
            {success}
          </div>
        )}

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <details className="group">
            <summary className="cursor-pointer select-none px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Create User</h2>
                <p className="text-xs text-gray-500 mt-1">Add a new account and assign roles</p>
              </div>
              <span className="text-xs text-gray-500 group-open:hidden">Show</span>
              <span className="text-xs text-gray-500 hidden group-open:inline">Hide</span>
            </summary>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="Email"
                  value={newUser.email}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                />
                <input
                  className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="Password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                />
                <input
                  className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="First name"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, firstName: e.target.value }))}
                />
                <input
                  className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="Last name"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, lastName: e.target.value }))}
                />
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Roles</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCreateRolesOpen((prev) => !prev)}
                      className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-900 text-left focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    >
                      {newUser.roles.length > 0 ? newUser.roles.join(', ') : 'Select roles'}
                    </button>
                    {createRolesOpen && (
                      <div className="absolute z-10 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg p-2">
                        {ROLE_OPTIONS.map((role) => {
                          const checked = newUser.roles.includes(role);
                          return (
                            <label key={role} className="flex items-center gap-2 px-2 py-1 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setNewUser((prev) => ({
                                    ...prev,
                                    roles: checked
                                      ? prev.roles.filter((r) => r !== role)
                                      : [...prev.roles, role],
                                  }));
                                }}
                              />
                              {role}
                            </label>
                          );
                        })}
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            className="text-xs text-gray-500 hover:text-gray-700"
                            onClick={() => setCreateRolesOpen(false)}
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleCreate}
                className="mt-4 px-4 py-2 text-sm bg-[#10b981] text-white font-semibold rounded-lg hover:bg-[#059669]"
              >
                Create User
              </button>
            </div>
          </details>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Users</h2>
                <p className="text-xs text-gray-500 mt-1">Edit details and assign roles</p>
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <input
                  className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm w-full md:w-64 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="Search name or email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as 'all' | AppRole)}
                >
                  <option value="all">All roles</option>
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <select
                  className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                  <th className="py-2.5 pr-3 pl-5">Email</th>
                  <th className="py-2.5 pr-3">First</th>
                  <th className="py-2.5 pr-3">Last</th>
                  <th className="py-2.5 pr-3">Active</th>
                  <th className="py-2.5 pr-3">Roles</th>
                  <th className="py-2.5 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="py-2.5 pr-3 pl-5">
                      <span className="text-sm text-gray-900">{user.email}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="text-sm text-gray-900">{user.first_name}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="text-sm text-gray-900">{user.last_name}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <input
                        type="checkbox"
                        checked={user.is_active}
                        onChange={(e) => updateUserField(user.id, { is_active: e.target.checked })}
                      />
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenRolesFor((prev) => (prev === user.id ? null : user.id))}
                          className="w-full border border-gray-200 bg-white rounded-lg px-2 py-1 text-sm text-gray-900 text-left focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        >
                          {user.roles && user.roles.length > 0 ? user.roles.join(', ') : 'Select roles'}
                        </button>
                        {openRolesFor === user.id && (
                          <div className="absolute z-10 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg p-2">
                            {ROLE_OPTIONS.map((role) => {
                              const checked = (user.roles || []).includes(role);
                              return (
                                <label key={role} className="flex items-center gap-2 px-2 py-1 text-sm text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      const next = checked
                                        ? (user.roles || []).filter((r) => r !== role)
                                        : [...(user.roles || []), role];
                                      handleRoleChange(user.id, next);
                                    }}
                                  />
                                  {role}
                                </label>
                              );
                            })}
                            <div className="flex justify-end pt-2">
                              <button
                                type="button"
                                className="text-xs text-gray-500 hover:text-gray-700"
                                onClick={() => setOpenRolesFor(null)}
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleSave(user)}
                          className="px-3 py-1 text-xs rounded-md bg-[#10b981] text-white font-semibold hover:bg-[#059669] disabled:opacity-50"
                          disabled={saving === user.id}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="px-3 py-1 text-xs rounded-md bg-red-50 text-red-700 font-semibold hover:bg-red-100 disabled:opacity-50"
                          disabled={saving === user.id}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
