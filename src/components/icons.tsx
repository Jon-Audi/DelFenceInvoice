
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  ShoppingCart,
  FileDigit,
  Calculator,
  ChevronDown,
  ChevronRight,
  ChevronUp, // Added ChevronUp
  PlusCircle,
  Edit,
  Trash2,
  Upload,
  Download,
  Send,
  Mail,
  MoreHorizontal,
  Search,
  PanelLeft,
  Sun,
  Moon,
  Settings,
  LogOut,
  ExternalLink,
  PanelsTopLeft,
  AlertCircle,
  XCircle,
  CheckCircle2,
  UsersRound, 
  UserCog,
  Paintbrush,
  Loader2,
  ChevronsUpDown,
  Check,
  CalendarDays,
  TrendingUp,
  Printer,
  Layers,
  PackageCheck,
  ClipboardList,
  Copy,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

export type IconName = keyof typeof iconComponents;

const iconComponents = {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  ShoppingCart,
  FileDigit,
  Calculator,
  ChevronDown,
  ChevronRight,
  ChevronUp, // Added ChevronUp
  PlusCircle,
  Edit,
  Trash2,
  Upload,
  Download,
  Send,
  Mail,
  MoreHorizontal,
  Search,
  PanelLeft,
  Sun,
  Moon,
  Settings,
  LogOut,
  ExternalLink,
  PanelsTopLeft,
  AlertCircle,
  XCircle,
  CheckCircle2,
  UsersRound,
  UserCog,
  Paintbrush,
  Loader2,
  ChevronsUpDown,
  Check,
  Calendar: CalendarDays,
  TrendingUp,
  Printer,
  Layers,
  PackageCheck,
  ClipboardList,
  Copy,
};

interface IconProps extends LucideProps {
  name: IconName;
}

export const Icon = ({ name, ...props }: IconProps) => {
  const LucideIcon = iconComponents[name];
  if (!LucideIcon) {
    console.warn("Icon not found:", name);
    return <AlertCircle {...props} />;
  }
  return <LucideIcon {...props} />;
};
