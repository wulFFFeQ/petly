import {
  Award,
  Cake,
  Calendar,
  Camera,
  Check,
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
import type { BadgeCategory, BadgeIconKey } from '../../types/badges'

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
  camera: Camera,
  check: Check,
}

/** Seal palette — earned medallions feel warm and intentional. */
export const SEAL_PALETTE: Record<
  BadgeCategory,
  {
    outer: string
    mid: string
    disc: string
    ink: string
    glow: string
  }
> = {
  milestone: {
    outer: 'from-[#C9A55B] via-[#E8D8B5] to-[#B8934A]',
    mid: 'bg-[#FAF4E6]',
    disc: 'from-[#2C4A3E] to-[#234B54]',
    ink: 'text-[#E8D8B5]',
    glow: 'shadow-[0_6px_20px_rgba(184,147,74,0.28)]',
  },
  health: {
    outer: 'from-[#3D5C4E] via-[#8FA99A] to-[#2C4A3E]',
    mid: 'bg-[#EBF2EE]',
    disc: 'from-[#2C4A3E] to-[#1E352C]',
    ink: 'text-[#D4E5DB]',
    glow: 'shadow-[0_6px_20px_rgba(44,74,62,0.28)]',
  },
  activity: {
    outer: 'from-[#3A5A63] via-[#8AA3AA] to-[#234B54]',
    mid: 'bg-[#EEF3F4]',
    disc: 'from-[#234B54] to-[#1A3A42]',
    ink: 'text-[#D5E4E8]',
    glow: 'shadow-[0_6px_20px_rgba(35,75,84,0.28)]',
  },
  community: {
    outer: 'from-[#8B7355] via-[#D4C4A8] to-[#6B5A45]',
    mid: 'bg-[#F7F2EB]',
    disc: 'from-[#5C4A38] to-[#3E3228]',
    ink: 'text-[#E8D8B5]',
    glow: 'shadow-[0_6px_20px_rgba(107,90,69,0.25)]',
  },
  care: {
    outer: 'from-[#B8934A] via-[#E8D8B5] to-[#2C4A3E]',
    mid: 'bg-[#FAF8F5]',
    disc: 'from-[#2C4A3E] to-[#234B54]',
    ink: 'text-[#E8D8B5]',
    glow: 'shadow-[0_6px_20px_rgba(44,74,62,0.22)]',
  },
  secret: {
    outer: 'from-[#B8934A] via-[#D4B26F] to-[#8A6E35]',
    mid: 'bg-[#1E352C]',
    disc: 'from-[#191E1B] to-[#2C4A3E]',
    ink: 'text-[#E8D8B5]',
    glow: 'shadow-[0_8px_24px_rgba(184,147,74,0.35)]',
  },
}
