import {
  Atom,
  BookOpen,
  Brain,
  Calculator,
  Compass,
  Dna,
  Earth,
  FlaskConical,
  Globe,
  GraduationCap,
  Infinity as InfinityIcon,
  Landmark,
  Languages,
  Leaf,
  Lightbulb,
  Microscope,
  Music,
  Palette,
  PenTool,
  Pi,
  Scroll,
  Sigma,
  Sparkles,
  Dumbbell,
  Code2,
  type LucideIcon,
} from "lucide-react";

export const SUBJECT_ICONS: Record<string, LucideIcon> = {
  "book-open": BookOpen,
  sigma: Sigma,
  infinity: InfinityIcon,
  pi: Pi,
  calculator: Calculator,
  "flask-conical": FlaskConical,
  atom: Atom,
  microscope: Microscope,
  dna: Dna,
  leaf: Leaf,
  brain: Brain,
  lightbulb: Lightbulb,
  globe: Globe,
  earth: Earth,
  landmark: Landmark,
  scroll: Scroll,
  languages: Languages,
  "pen-tool": PenTool,
  compass: Compass,
  "graduation-cap": GraduationCap,
  palette: Palette,
  music: Music,
  dumbbell: Dumbbell,
  code: Code2,
  sparkles: Sparkles,
};

export const SUBJECT_ICON_NAMES = Object.keys(SUBJECT_ICONS);

export function SubjectIcon({ name, className }: { name: string; className?: string }) {
  const Icon = SUBJECT_ICONS[name] ?? BookOpen;
  return <Icon className={className} />;
}

export const SUBJECT_PALETTE = [
  "#6366F1", "#8B5CF6", "#A855F7", "#EC4899", "#F43F5E", "#F97316",
  "#F59E0B", "#EAB308", "#84CC16", "#22C55E", "#10B981", "#14B8A6",
  "#06B6D4", "#0EA5E9", "#3B82F6", "#64748B",
];

export const PRIORITY_LABEL: Record<"haute" | "normale" | "light", string> = {
  haute: "Haute",
  normale: "Normale",
  light: "Light",
};
