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
  // slug-mapped glyphs (redesigned category cards)
  Code2,
  Heart,
  Car,
  UtensilsCrossed,
  Megaphone,
  Wrench,
  Shield,
  Home,
  Scale,
  Palette,
  ShoppingBag,
  Flame,
  Building2,
  Clock,
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

/** Redesigned card glyphs, keyed by category slug (falls back to Briefcase). */
const BY_SLUG: Record<string, LucideIcon> = {
  it: Code2,
  healthcare: Heart,
  construction: HardHat,
  driving: Car,
  hospitality: UtensilsCrossed,
  finance: TrendingUp,
  sales: Megaphone,
  education: GraduationCap,
  engineering: Wrench,
  admin: Briefcase,
  security: Shield,
  domestic: Home,
  beauty: Sparkles,
  legal: Scale,
  media: Palette,
  manufacturing: Factory,
  retail: ShoppingBag,
  'oil-gas': Flame,
  government: Building2,
  'part-time': Clock,
};

export function CategoryGlyph({ slug, className }: { slug: string; className?: string }) {
  const Icon = BY_SLUG[slug] ?? Briefcase;
  return <Icon className={className} />;
}

/** Brand colour cycle for category icon backgrounds: teal → orange → yellow → lime. */
export const CAT_ICON_COLORS = [
  { bg: 'bg-[#2a9aa4]/12', fg: 'text-[#1d7a82]' },
  { bg: 'bg-[#E8622A]/12', fg: 'text-[#E8622A]' },
  { bg: 'bg-[#F5C842]/25', fg: 'text-[#a97d05]' },
  { bg: 'bg-[#8DC63F]/18', fg: 'text-[#5a8a1f]' },
] as const;

export function catColor(index: number) {
  return CAT_ICON_COLORS[index % CAT_ICON_COLORS.length]!;
}
