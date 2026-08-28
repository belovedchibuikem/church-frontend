import type { MessageTree, SupportedLocale } from './types.ts';
import { ar } from './messages/ar.ts';
import { en } from './messages/en.ts';
import { fr } from './messages/fr.ts';
import { ha } from './messages/ha.ts';
import { ig } from './messages/ig.ts';
import { sw } from './messages/sw.ts';
import { yo } from './messages/yo.ts';
import { zh } from './messages/zh.ts';

export const messageCatalogs: Record<SupportedLocale, MessageTree> = {
  en,
  yo,
  ig,
  ha,
  fr,
  ar,
  zh,
  sw,
};
