import ClassicRose from './ClassicRose';
import ModernGold from './ModernGold';
import MinimalWhite from './MinimalWhite';
import ElegantNavy from './ElegantNavy';
import { TemplateInfo } from './types';

export const TEMPLATES: Record<string, React.ComponentType<{ data: any }>> = {
  classic_rose: ClassicRose,
  modern_gold: ModernGold,
  minimal_white: MinimalWhite,
  elegant_navy: ElegantNavy,
};

export const TEMPLATE_LIST: TemplateInfo[] = [
  { id: 'classic_rose', name: 'Klasik Rose', preview: '/templates/classic_rose.png' },
  { id: 'modern_gold', name: 'Modern Gold', preview: '/templates/modern_gold.png' },
  { id: 'minimal_white', name: 'Minimal Beyaz', preview: '/templates/minimal_white.png' },
  { id: 'elegant_navy', name: 'Zarif Navy', preview: '/templates/elegant_navy.png' },
];

export { ClassicRose, ModernGold, MinimalWhite, ElegantNavy };
export type { InvitationData, TemplateInfo } from './types';
