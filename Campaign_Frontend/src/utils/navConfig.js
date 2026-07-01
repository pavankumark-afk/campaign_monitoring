import { LayoutDashboard, UploadCloud, DownloadCloud, FolderOpen, UserCircle } from 'lucide-react';

export const SUPER_ADMIN_NAV = [
  { to: '/admin', label: 'SIR Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/material/uploads', label: 'Material Uploads', icon: UploadCloud },
  { to: '/admin/material/downloads', label: 'Download Stats', icon: DownloadCloud },
  { to: '/admin/users', label: 'User Management', icon: UserCircle },
  { to: '/admin/profile', label: 'Profile', icon: UserCircle },
];

export const AC_NAV = [
  { to: '/ac', label: 'SIR Dashboard', icon: LayoutDashboard, end: true },
  { to: '/ac/material', label: 'Material', icon: FolderOpen },
  { to: '/ac/profile', label: 'Profile', icon: UserCircle },
];
