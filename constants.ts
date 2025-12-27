import { SegmentLabel } from './types';

export const SECTION_COLORS: Record<SegmentLabel, string> = {
  [SegmentLabel.HOOK]: 'bg-red-500',
  [SegmentLabel.SETUP]: 'bg-blue-500',
  [SegmentLabel.MAIN_CONTENT]: 'bg-green-500',
  [SegmentLabel.PATTERN_INTERRUPT]: 'bg-yellow-500',
  [SegmentLabel.ENDING]: 'bg-purple-500',
  [SegmentLabel.CTA]: 'bg-pink-500',
  [SegmentLabel.OTHER]: 'bg-gray-500',
};

export const SECTION_TEXT_COLORS: Record<SegmentLabel, string> = {
  [SegmentLabel.HOOK]: 'text-red-400',
  [SegmentLabel.SETUP]: 'text-blue-400',
  [SegmentLabel.MAIN_CONTENT]: 'text-green-400',
  [SegmentLabel.PATTERN_INTERRUPT]: 'text-yellow-400',
  [SegmentLabel.ENDING]: 'text-purple-400',
  [SegmentLabel.CTA]: 'text-pink-400',
  [SegmentLabel.OTHER]: 'text-gray-400',
};