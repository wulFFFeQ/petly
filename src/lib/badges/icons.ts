import {
  Award,
  Cake,
  Calendar,
  ClipboardList,
  Compass,
  FileText,
  Footprints,
  Heart,
  Home,
  Map,
  MessageCircle,
  Moon,
  Plane,
  Scale,
  Shield,
  Sparkles,
  Star,
  Stethoscope,
  Syringe,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { BadgeIconKey } from '../../types/badges'

export const BADGE_ICONS: Record<BadgeIconKey, LucideIcon> = {
  award: Award,
  heart: Heart,
  shield: Shield,
  syringe: Syringe,
  stethoscope: Stethoscope,
  scale: Scale,
  clipboard: ClipboardList,
  footprints: Footprints,
  plane: Plane,
  map: Map,
  users: Users,
  message: MessageCircle,
  sparkles: Sparkles,
  moon: Moon,
  calendar: Calendar,
  file: FileText,
  home: Home,
  cake: Cake,
  star: Star,
  compass: Compass,
}

export const CATEGORY_ACCENT: Record<
  string,
  { ring: string; fill: string; ink: string }
> = {
  milestone: {
    ring: 'border-[#E8D8B5]',
    fill: 'from-[#FAF4E6] to-[#F5EED8]',
    ink: 'text-[#9E7D3A]',
  },
  health: {
    ring: 'border-[#D1E0D8]',
    fill: 'from-[#EBF2EE] to-[#E2EBE6]',
    ink: 'text-[#2C4A3E]',
  },
  activity: {
    ring: 'border-[#C5D4D8]',
    fill: 'from-[#EEF3F4] to-[#E4EBED]',
    ink: 'text-[#234B54]',
  },
  community: {
    ring: 'border-[#E0D5C8]',
    fill: 'from-[#F7F2EB] to-[#F0E8DC]',
    ink: 'text-[#6B5A45]',
  },
  care: {
    ring: 'border-[#D1E0D8]',
    fill: 'from-[#EBF2EE] to-[#E8EFEA]',
    ink: 'text-[#2C4A3E]',
  },
  secret: {
    ring: 'border-[#B8934A]/50',
    fill: 'from-[#2C4A3E] to-[#234B54]',
    ink: 'text-[#E8D8B5]',
  },
}
