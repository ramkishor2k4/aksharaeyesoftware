import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard, Users, Stethoscope, Scissors,
  Pill, FileText, BarChart3, Settings, LogOut,
  ChevronLeft, ChevronRight, Menu, Eye, Building2,
  ClipboardList, ShieldCheck, Activity
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
  badge?: string;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} />, roles: ['admin', 'doctor', 'receptionist', 'pharmacist'] },
  { path: '/patients', label: 'Patients', icon: <Users size={18} />, roles: ['admin', 'doctor', 'receptionist'] },
  { path: '/op', label: 'OP Queue', icon: <ClipboardList size={18} />, roles: ['admin', 'doctor', 'receptionist'] },
  { path: '/ot', label: 'OT Management', icon: <Scissors size={18} />, roles: ['admin', 'doctor', 'receptionist'] },
  { path: '/pharmacy', label: 'Pharmacy', icon: <Pill size={18} />, roles: ['admin', 'pharmacist'] },
  { path: '/bills', label: 'Billing', icon: <FileText size={18} />, roles: ['admin', 'pharmacist', 'receptionist'] },
  { path: '/reports', label: 'Reports', icon: <BarChart3 size={18} />, roles: ['admin'] },
  { path: '/activity', label: 'Activity Logs', icon: <Activity size={18} />, roles: ['admin'] },
  { path: '/admin/users', label: 'User Management', icon: <ShieldCheck size={18} />, roles: ['admin'] },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ collapsed, onToggle, isMobile, isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const filteredNav = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-blue-700',
        collapsed && !isMobile && 'justify-center px-2'
      )}>
        <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
          <Eye size={20} className="text-blue-700" />
        </div>
        {(!collapsed || isMobile) && (
          <div className="overflow-hidden">
            <div className="font-bold text-white text-sm leading-tight">AKSHARA</div>
            <div className="text-blue-200 text-xs leading-tight">Eye Hospital & Opticals</div>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={onToggle}
            className="ml-auto text-blue-200 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
        {isMobile && (
          <button onClick={onClose} className="ml-auto text-blue-200 hover:text-white">
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-0.5">
          {filteredNav.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                onClick={isMobile ? onClose : undefined}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white',
                  collapsed && !isMobile && 'justify-center px-2'
                )}
                title={collapsed && !isMobile ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {(!collapsed || isMobile) && (
                  <span className="truncate">{item.label}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User info & logout */}
      <div className={cn('border-t border-blue-700 p-3', collapsed && !isMobile && 'px-2')}>
        {(!collapsed || isMobile) && user && (
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="text-white text-sm font-medium truncate">{user.name}</div>
              <div className="text-blue-200 text-xs capitalize">{user.role}</div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-all',
            collapsed && !isMobile && 'justify-center'
          )}
        >
          <LogOut size={16} />
          {(!collapsed || isMobile) && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  // Mobile overlay
  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
        )}
        <div className={cn(
          'fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-blue-800 to-blue-900 z-50 transform transition-transform duration-300 shadow-xl',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          {sidebarContent}
        </div>
      </>
    );
  }

  return (
    <div className={cn(
      'h-screen bg-gradient-to-b from-blue-800 to-blue-900 flex flex-col transition-all duration-300 flex-shrink-0 shadow-sidebar',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {sidebarContent}
    </div>
  );
}

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuthStore();
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 flex-shrink-0 shadow-sm">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
      >
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Building2 size={14} className="text-blue-600" />
        <span className="font-medium text-gray-700">Akshara Eye Hospital</span>
        <span className="hidden sm:inline text-gray-300">|</span>
        <span className="hidden sm:inline">{today}</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-soft" />
          <span className="text-xs text-gray-500">System Online</span>
        </div>
        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-medium text-gray-700">{user.name}</div>
              <div className="text-xs text-gray-400 capitalize">{user.role}</div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
