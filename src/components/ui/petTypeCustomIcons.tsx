import { frogFace, horseHead, spider } from '@lucide/lab'
import { createLucideIcon, type IconNode } from 'lucide-react'

/** Obojživelníci – oficiální ikona Lucide Lab (frog-face) */
export const FrogIcon = createLucideIcon('FrogFace', frogFace)

/** Koně a osli – oficiální ikona Lucide Lab (horse-head) */
export const HorseHeadIcon = createLucideIcon('HorseHead', horseHead)

/** Hospodářská zvířata – ovce v profilu (koza/ovce, Lucide styl) */
const sheepHead: IconNode = [
  ['path', { d: 'M8 7.5c4.5-1.5 9.5 1 10.5 6s-2.5 8.5-7.5 8.5H9.5C5 21.5 3 18 3.5 13S4.5 8.5 8 7.5' }],
  ['path', { d: 'M8 7.5C6 6 4.5 7 4.5 9.5c0 1.8 1.2 3 2.5 3.2' }],
  ['path', { d: 'M5.5 7.5 4.5 6.2' }],
  ['path', { d: 'M5 9.5h.01' }],
  ['path', { d: 'M7.5 20v2.5' }],
  ['path', { d: 'M10.5 20v2.5' }],
  ['path', { d: 'M14 20v2.5' }],
  ['path', { d: 'M17 20v2.5' }],
  ['circle', { cx: '18.5', cy: '12', r: '1.2' }],
] 

export const GoatIcon = createLucideIcon('Sheep', sheepHead)

/** Bezobratlí – oficiální ikona Lucide Lab (spider) */
export const SpiderIcon = createLucideIcon('Spider', spider)

export type PetTypeCustomIcon = typeof FrogIcon
