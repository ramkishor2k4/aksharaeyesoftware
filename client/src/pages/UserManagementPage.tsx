import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, ShieldCheck, User, Eye, EyeOff, X } from 'lucide-react';
import api from '@/lib/api';
import { Card, Button, Input, Select, LoadingSpinner, EmptyState, PageHeader } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'doctor' | 'receptionist' | 'pharmacist';
  is_active: boolean;
  created_at: string;
}

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'pharmacist', label: 'Pharmacist' },
];

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  doctor: 'bg-green-100 text-green-700',
  receptionist: 'bg-blue-100 text-blue-700',
  pharmacist: 'bg-purple-100 text-purple-700',
};

interface UserFormProps {
  user: SystemUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

function UserFormModal({ user, onClose, onSuccess }: UserFormProps) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'receptionist',
    is_active: user?.is_active ?? true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      isEdit
        ? api.put(`/admin/users/${user!.id}`, data).then(r => r.data)
        : api.post('/admin/users', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(isEdit ? 'User updated' : 'User created');
      onSuccess();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to save user'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) { toast.error('Name and email required'); return; }
    if (!isEdit && !form.password) { toast.error('Password required for new user'); return; }
    if (form.password && form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    mutation.mutate(form);
  };

  const f = (field: string, value: string | boolean) =>
    setForm(p => ({ ...p, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <ShieldCheck size={16} className="text-indigo-600" />
            </div>
            <h2 className="font-semibold text-gray-800">{isEdit ? 'Edit User' : 'Create User'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Full Name *"
            value={form.name}
            onChange={e => f('name', e.target.value)}
            placeholder="User's full name"
          />
          <Input
            label="Email Address *"
            type="email"
            value={form.email}
            onChange={e => f('email', e.target.value)}
            placeholder="user@akshara.com"
          />

          {/* Password field */}
          <div className="space-y-1">
            <label className="form-label">
              {isEdit ? 'New Password (leave blank to keep)' : 'Password *'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => f('password', e.target.value)}
                placeholder={isEdit ? 'Leave blank to keep current' : 'Min. 6 characters'}
                className="form-input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Select
            label="Role"
            value={form.role}
            onChange={e => f('role', e.target.value)}
            options={ROLES}
          />

          <label className="flex items-center gap-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => f('is_active', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <div>
              <div className="text-sm font-medium text-gray-700">Active Account</div>
              <div className="text-xs text-gray-400">Inactive users cannot log in</div>
            </div>
          </label>

          {/* Role info */}
          <div className={`rounded-xl p-3 text-xs ${
            form.role === 'admin' ? 'bg-red-50 text-red-700' :
            form.role === 'doctor' ? 'bg-green-50 text-green-700' :
            form.role === 'receptionist' ? 'bg-blue-50 text-blue-700' :
            'bg-purple-50 text-purple-700'
          }`}>
            {{
              admin: '🛡 Admin: Full access to all modules, reports, and user management.',
              doctor: '🩺 Doctor: View patients, conduct consultations, prescribe medicines, recommend OT.',
              receptionist: '📋 Receptionist: Register patients, manage appointments, collect fees.',
              pharmacist: '💊 Pharmacist: Manage medicines, stock, and pharmacy billing.',
            }[form.role]}
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" loading={mutation.isPending} className="flex-1">
              {isEdit ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function UserManagementPage() {
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<SystemUser | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/admin/users/${id}/toggle`, { is_active: active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Status updated'); },
  });

  const users: SystemUser[] = data?.users || [];

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="User Management" subtitle={`${users.length} system users`}>
        <Button icon={<Plus size={16} />} onClick={() => { setEditUser(null); setShowModal(true); }}>
          Create User
        </Button>
      </PageHeader>

      {/* Role Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ROLES.map(role => (
          <div key={role.value} className={`rounded-xl p-4 border text-center ${
            role.value === 'admin' ? 'bg-red-50 border-red-100' :
            role.value === 'doctor' ? 'bg-green-50 border-green-100' :
            role.value === 'receptionist' ? 'bg-blue-50 border-blue-100' :
            'bg-purple-50 border-purple-100'
          }`}>
            <div className={`text-3xl font-bold ${
              role.value === 'admin' ? 'text-red-700' :
              role.value === 'doctor' ? 'text-green-700' :
              role.value === 'receptionist' ? 'text-blue-700' : 'text-purple-700'
            }`}>
              {roleCounts[role.value] || 0}
            </div>
            <div className="text-xs font-medium text-gray-500 mt-0.5 capitalize">{role.label}s</div>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <Card padding={false}>
        {isLoading ? <LoadingSpinner className="py-16" /> :
         users.length === 0 ? (
           <EmptyState title="No users found"
             action={<Button icon={<Plus size={16} />} onClick={() => setShowModal(true)}>Create User</Button>} />
         ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                          user.role === 'admin' ? 'bg-red-500' :
                          user.role === 'doctor' ? 'bg-green-500' :
                          user.role === 'receptionist' ? 'bg-blue-500' : 'bg-purple-500'
                        }`}>
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{user.name}</div>
                          <div className="text-xs text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${ROLE_COLORS[user.role]}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleMutation.mutate({ id: user.id, active: !user.is_active })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          user.is_active ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          user.is_active ? 'translate-x-5' : 'translate-x-1'
                        }`} />
                      </button>
                      <span className={`ml-2 text-xs ${user.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-gray-500 text-xs">{formatDate(user.created_at)}</td>
                    <td>
                      <button
                        onClick={() => { setEditUser(user); setShowModal(true); }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
         )}
      </Card>

      {showModal && (
        <UserFormModal
          user={editUser}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); refetch(); }}
        />
      )}
    </div>
  );
}
