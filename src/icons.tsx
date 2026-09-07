import { Github, Instagram, Linkedin } from "./brand-icons";
import {
  Atom,
  Award,
  BookOpen,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Code2,
  Download,
  ExternalLink,
  FileText,
  Globe,
  GraduationCap,
  Hexagon,
  Image,
  Infinity,
  Languages,
  LayoutDashboard,
  Link,
  Mail,
  Megaphone,
  Menu,
  MessageCircle,
  Network,
  Palette,
  PenTool,
  Phone,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
const icons = {
  react: Atom,
  node: Hexagon,
  meta: Infinity,
  google: Search,
  wordpress: Globe,
  network: Network,
  sparkles: Sparkles,
  award: Award,
  "graduation-cap": GraduationCap,
  book: BookOpen,
  briefcase: BriefcaseBusiness,
  chart: ChartNoAxesCombined,
  code: Code2,
  download: Download,
  external: ExternalLink,
  file: FileText,
  github: Github,
  globe: Globe,
  image: Image,
  instagram: Instagram,
  languages: Languages,
  dashboard: LayoutDashboard,
  linkedin: Linkedin,
  link: Link,
  mail: Mail,
  megaphone: Megaphone,
  menu: Menu,
  whatsapp: MessageCircle,
  palette: Palette,
  pen: PenTool,
  phone: Phone,
  search: Search,
  settings: Settings,
  shield: ShieldCheck,
  "shopping-bag": ShoppingBag,
  smartphone: Smartphone,
  users: Users,
};
export const iconChoices = Object.keys(icons);
export function Icon({
  name,
  size = 22,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Component = icons[name as keyof typeof icons] || Sparkles;
  return (
    <Component
      size={size}
      strokeWidth={1.65}
      className={className}
      aria-hidden="true"
    />
  );
}
