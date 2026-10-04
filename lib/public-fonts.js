// Fonts for the public pages only: Mukta (clean Devanagari + Latin body) and Tiro Devanagari Hindi (headlines).
import { Mukta, Tiro_Devanagari_Hindi } from 'next/font/google';
export const mukta = Mukta({ subsets: ['devanagari', 'latin'], weight: ['400', '600', '700'], variable: '--font-mukta', display: 'swap' });
export const tiro = Tiro_Devanagari_Hindi({ subsets: ['devanagari', 'latin'], weight: ['400'], variable: '--font-tiro', display: 'swap' });
