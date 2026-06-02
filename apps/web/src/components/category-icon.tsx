import {
  Laptop,
  Stethoscope,
  Landmark,
  TrendingUp,
  HardHat,
  ConciergeBell,
  Truck,
  GraduationCap,
  Briefcase,
  Factory,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  Laptop,
  Stethoscope,
  Landmark,
  TrendingUp,
  HardHat,
  ConciergeBell,
  Truck,
  GraduationCap,
  Briefcase,
  Factory,
  ShieldCheck,
  Sparkles,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? Briefcase;
  return <Icon className={className} />;
}
