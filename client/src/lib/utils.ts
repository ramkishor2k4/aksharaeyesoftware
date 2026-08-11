import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date, fmt = 'dd MMM yyyy'): string {
  if (!date) return '-';
  return format(new Date(date), fmt);
}

export function formatDateTime(date: string | Date): string {
  if (!date) return '-';
  return format(new Date(date), 'dd MMM yyyy, hh:mm a');
}

export function formatWaitingTime(minutes: number): string {
  if (!minutes || minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.floor(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${hours}h ${mins}m`;
}

export function formatTimeAgo(date: string | Date): string {
  if (!date) return '-';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    waiting: 'badge-waiting',
    in_consultation: 'badge-in_consultation',
    completed: 'badge-completed',
    cancelled: 'badge-cancelled',
    sent_to_pharmacy: 'badge-sent_to_pharmacy',
    sent_to_ot: 'badge-sent_to_ot',
    scheduled: 'badge-scheduled',
    in_progress: 'badge-in_progress',
  };
  return colorMap[status] || 'badge bg-gray-100 text-gray-700';
}

export function getStatusLabel(status: string): string {
  const labelMap: Record<string, string> = {
    waiting: 'Waiting',
    in_consultation: 'In Consultation',
    completed: 'Completed',
    cancelled: 'Cancelled',
    sent_to_pharmacy: 'Sent to Pharmacy',
    sent_to_ot: 'Sent to OT',
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
  };
  return labelMap[status] || status;
}

export function generateInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function getExpiryStatus(expiryDate: string): {
  label: string;
  className: string;
} {
  if (!expiryDate) return { label: 'No expiry', className: 'text-gray-500' };
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { label: 'Expired', className: 'text-red-600 font-semibold' };
  if (daysLeft <= 30) return { label: `${daysLeft}d left`, className: 'text-orange-600 font-semibold' };
  if (daysLeft <= 90) return { label: `${daysLeft}d left`, className: 'text-yellow-600' };
  return { label: formatDate(expiryDate, 'MMM yyyy'), className: 'text-green-600' };
}
