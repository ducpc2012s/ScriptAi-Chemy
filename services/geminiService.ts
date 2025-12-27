import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalyzedSegment, MasterTemplate, ScriptAnalysis, SegmentLabel, SrtSegment, OutputLanguage } from "../types";

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key is missing from environment variables");
    }
    return new GoogleGenAI({ apiKey });
};

// Helper to chunk array
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Helper to clean JSON string from Markdown code blocks
function cleanJson(text: string): string {
    if (!text) return "";
    let cleaned = text.trim();
    // Remove markdown code blocks if present (start)
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    }
    // Remove markdown code blocks if present (end)
    if (cleaned.endsWith('```')) {
        cleaned = cleaned.replace(/\s*```$/, '');
    }
    return cleaned;
}

const getLanguageInstruction = (lang: OutputLanguage) => {
    const langName = lang === 'vi' ? 'Vietnamese' : 'English';
    return `
    IMPORTANT LANGUAGE RULE: 
    - Provide all analysis, summaries, reasons, and descriptions in **${langName}**.
    - However, keep all direct quotes, script segments, examples, and references to the specific words used in the transcript in their **ORIGINAL LANGUAGE** (do not translate the script content itself).
    `;
};

/**
 * PHASE 1: Global Analysis
 * Analyzes the full text to get summary, tone, pacing, and overall patterns.
 * Does NOT ask for segment breakdown to save output tokens.
 */
async function analyzeGlobalStats(fullText: string, model: string, language: OutputLanguage): Promise<Omit<ScriptAnalysis, 'segments'>> {
  const ai = getClient();
  // Truncate if insanely long, but Gemini usually handles 1M+ tokens.
  // 300k chars is approx 75k tokens, safe.
  const contextText = fullText.substring(0, 300000); 
  const langInstruction = getLanguageInstruction(language);

  const prompt = `
    Analyze the following video script transcript.
    ${langInstruction}

    Provide a high-level strategic analysis:
    1. Summary of the content.
    2. Pacing score (0-100).
    3. Hook score (0-100) based on the opening.
    4. Dominant tone/voice.
    5. Key recurring patterns or psychological triggers used.
    6. Writing Style & Voice Analysis:
       - Tone Keywords (3-5 adjectives).
       - Voice Description (The persona).
       - Instructional Directive (How should a voice actor perform this? e.g., "Speak like a fast-paced energetic friend").
       - Rhetorical Devices used (Metaphors, Repetition, etc.).
       - Complexity Level (Simple/Moderate/Complex).

    TRANSCRIPT:
    "${contextText}"
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          pacingScore: { type: Type.NUMBER },
          hookScore: { type: Type.NUMBER },
          dominantTone: { type: Type.STRING },
          keyPatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
          writingStyle: {
            type: Type.OBJECT,
            properties: {
                toneKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                voiceDescription: { type: Type.STRING },
                instructionalDirective: { type: Type.STRING },
                rhetoricalDevices: { type: Type.ARRAY, items: { type: Type.STRING } },
                complexityLevel: { type: Type.STRING }
            }
          }
        }
      } as Schema
    }
  });

  const jsonText = cleanJson(response.text || "{}");
  return JSON.parse(jsonText);
}

/**
 * PHASE 2: Batch Segment Analysis
 * Analyzes small chunks of segments to ensure precise labeling without hitting output limits.
 */
async function analyzeBatch(
    batch: SrtSegment[], 
    contextSummary: string, 
    model: string,
    language: OutputLanguage
): Promise<AnalyzedSegment[]> {
    const ai = getClient();
    const langInstruction = getLanguageInstruction(language);

    const segmentsText = batch.map(s => 
        `ID:${s.index} [${s.startTime} - ${s.endTime}] ${s.text}`
    ).join('\n');

    const prompt = `
        You are a video script analyst. I will provide a batch of script segments.
        Context: The script is about: "${contextSummary}".
        ${langInstruction}
        
        For EACH segment provided below, identify its structural role (Label) and provide a very brief reason (Analysis).
        The 'analysis' field must be written in the requested output language (${language === 'vi' ? 'Vietnamese' : 'English'}).
        
        Labels allowed: HOOK, SETUP, MAIN_CONTENT, PATTERN_INTERRUPT, ENDING, CTA, OTHER.
        
        Segments to Analyze:
        ${segmentsText}
    `;

    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        index: { type: Type.NUMBER, description: "The ID provided in input" },
                        label: { type: Type.STRING, enum: Object.values(SegmentLabel) },
                        analysis: { type: Type.STRING, description: "Max 10 words reason in target language" }
                    }
                }
            } as Schema
        }
    });

    const jsonText = cleanJson(response.text || "[]");
    let aiResults: any[] = [];
    
    try {
        const parsed = JSON.parse(jsonText);
        // Handle case where AI wraps array in an object (e.g. { result: [...] })
        if (Array.isArray(parsed)) {
            aiResults = parsed;
        } else if (parsed && typeof parsed === 'object') {
             // Try to find the first array property
             const arrayProp = Object.values(parsed).find(val => Array.isArray(val));
             if (arrayProp) {
                 aiResults = arrayProp as any[];
             }
        }
    } catch (e) {
        console.error("Failed to parse batch JSON", e);
        // Fallback empty array will trigger default labeling below
    }

    // Map AI results back to original segments
    return batch.map(original => {
        const found = aiResults.find((r: any) => r.index === original.index);
        return {
            ...original,
            label: found ? (found.label as SegmentLabel) : SegmentLabel.MAIN_CONTENT,
            analysis: found ? found.analysis : "Analysis missing"
        };
    });
}

/**
 * Main Orchestrator
 */
export const analyzeScriptWithGemini = async (
  srtSegments: SrtSegment[], 
  model: string = 'gemini-2.5-flash',
  language: OutputLanguage = 'en',
  onProgress: (msg: string) => void
): Promise<ScriptAnalysis> => {
  
  // 1. Prepare Full Text
  const fullText = srtSegments.map(s => s.text).join(' ');

  // 2. Global Analysis Pass
  onProgress(language === 'vi' ? "Đang phân tích cấu trúc tổng thể..." : "Analyzing global structure, tone & writing style...");
  const globalStats = await analyzeGlobalStats(fullText, model, language);

  // 3. Chunked Segment Analysis Pass
  const BATCH_SIZE = 40; // Conservative batch size to keep output fast and within limits
  const batches = chunkArray(srtSegments, BATCH_SIZE);
  const analyzedSegments: AnalyzedSegment[] = [];

  for (let i = 0; i < batches.length; i++) {
    onProgress(language === 'vi' 
        ? `Đang phân tích chi tiết phần ${i + 1}/${batches.length}...` 
        : `Analyzing segments batch ${i + 1}/${batches.length}...`
    );
    try {
        const batchResults = await analyzeBatch(batches[i], globalStats.summary, model, language);
        analyzedSegments.push(...batchResults);
    } catch (e) {
        console.error(`Error analyzing batch ${i}`, e);
        // Fallback for this batch if it fails
        analyzedSegments.push(...batches[i].map(s => ({...s, label: SegmentLabel.MAIN_CONTENT, analysis: "Error in analysis"})));
    }
  }

  onProgress(language === 'vi' ? "Đang hoàn thiện báo cáo..." : "Finalizing report...");

  return {
    ...globalStats,
    segments: analyzedSegments
  };
};

export const generateMasterTemplate = async (
    analyses: ScriptAnalysis[], 
    model: string = 'gemini-2.5-flash',
    language: OutputLanguage = 'en'
): Promise<MasterTemplate> => {
  const ai = getClient();
  const langInstruction = getLanguageInstruction(language);
  
  // Combine all insights
  const context = analyses.map((a, i) => `
    Script ${i+1}:
    Summary: ${a.summary}
    Patterns: ${a.keyPatterns.join(', ')}
    Tone: ${a.dominantTone}
    Voice Instruction: ${a.writingStyle?.instructionalDirective || 'N/A'}
  `).join('\n---\n');

  const prompt = `
    Based on the analysis of these ${analyses.length} high-performing video scripts, 
    generate a "Master Template" or a "Winning Formula".
    
    ${langInstruction}
    
    Context Data:
    ${context}
    
    Create a JSON response with a structure for a new script, a winning formula description, and tips.
  `;

  const response = await ai.models.generateContent({
    model: model, 
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            targetAudience: { type: Type.STRING },
            structure: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        section: { type: Type.STRING, enum: Object.values(SegmentLabel) },
                        durationPercent: { type: Type.STRING },
                        description: { type: Type.STRING },
                        examplePhrases: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            },
            winningFormula: { type: Type.STRING },
            tips: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      } as Schema
    }
  });

  const jsonText = cleanJson(response.text || "{}");
  return JSON.parse(jsonText);
};