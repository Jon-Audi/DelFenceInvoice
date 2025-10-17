
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
  Construction,
  Timer,
  Play,
  Pause,
  StopCircle,
  FolderSymlink,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  Construction,
  Timer,
  Play,
  Pause,
  StopCircle,
  FolderSymlink,
};

type IconProps = {
  name: IconName;
  /** Tooltip text (HTML `title`) */
  title?: string;
} & Omit<LucideProps, "ref">;

export const Icon = ({ name, title, className, ...rest }: IconProps) => {
  const LucideIcon = iconComponents[name] ?? AlertCircle;

  // IMPORTANT: do NOT pass `title` to the SVG; it’s not in LucideProps.
  const svg = (
    <LucideIcon
      className={cn(className)}
      aria-label={title}            // accessibility name
      role="img"
      {...rest}
    />
  );

  // If a tooltip is desired, wrap the SVG in a span with a `title` attribute.
  return title ? (
    <span title={title} className="inline-block align-middle">
      {svg}
    </span>
  ) : (
    svg
  );
};
