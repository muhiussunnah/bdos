'use client';

import {
  LayoutDashboard, Sparkles, Users, Building2, Send, Inbox, ListChecks,
  BarChart3, BookOpen, FolderKanban, Settings, Shield, UserCircle, Share2, type LucideIcon,
} from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Sparkles, Users, Building2, Send, Inbox, ListChecks,
  BarChart3, BookOpen, FolderKanban, Settings, Shield, UserCircle, Share2,
};

export function Icon({ name, size = 17, className }: { name: string; size?: number; className?: string }) {
  const C = MAP[name] || Sparkles;
  return <C size={size} className={className} />;
}
