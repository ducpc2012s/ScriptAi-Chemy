export enum SegmentLabel {
  HOOK = 'HOOK',
  SETUP = 'SETUP',
  MAIN_CONTENT = 'MAIN_CONTENT',
  PATTERN_INTERRUPT = 'PATTERN_INTERRUPT',
  ENDING = 'ENDING',
  CTA = 'CTA',
  OTHER = 'OTHER'
}

export type AiModel = 'gemini-2.5-flash' | 'gemini-3-pro-preview' | 'gemini-3-flash-preview' | 'gemini-2.5-flash-lite-latest';

export type OutputLanguage = 'en' | 'vi';

export interface SrtSegment {
  index: number;
  startTime: string; // "00:00:00,000"
  endTime: string;
  text: string;
  startSeconds: number;
  endSeconds: number;
}

export interface AnalyzedSegment extends SrtSegment {
  label: SegmentLabel;
  analysis: string; // Short reason/insight
}

export interface WritingStyle {
  toneKeywords: string[]; // e.g., ["Energetic", "Authoritative", "Empathetic"]
  voiceDescription: string; // General description of the persona
  instructionalDirective: string; // Specific instruction: "Act like a knowledgeable friend..."
  rhetoricalDevices: string[]; // e.g., "Metaphors", "Rhetorical Questions"
  complexityLevel: string; // "Simple", "Moderate", "Academic"
}

export interface ScriptAnalysis {
  segments: AnalyzedSegment[];
  summary: string;
  pacingScore: number; // 0-100
  hookScore: number; // 0-100
  dominantTone: string;
  writingStyle?: WritingStyle; // Optional to support legacy data
  keyPatterns: string[];
}

export type ProcessingStatus = 'queued' | 'processing' | 'completed' | 'error';

export interface ScriptFile {
  id: string;
  filename: string;
  content: string; // Raw SRT content
  uploadDate: number;
  status: ProcessingStatus;
  parsedSegments: SrtSegment[];
  analysis?: ScriptAnalysis;
  error?: string;
  processingProgress?: string; // New field for progress updates
}

export interface MasterTemplate {
  title: string;
  targetAudience: string;
  structure: {
    section: SegmentLabel;
    durationPercent: string;
    description: string;
    examplePhrases: string[];
  }[];
  winningFormula: string;
  tips: string[];
}