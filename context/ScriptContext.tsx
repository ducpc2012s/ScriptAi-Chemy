import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { ScriptFile, ScriptAnalysis, MasterTemplate, ProcessingStatus, SrtSegment, AiModel, OutputLanguage } from '../types';
import { parseSrt } from '../services/srtParser';
import { analyzeScriptWithGemini, generateMasterTemplate } from '../services/geminiService';

interface ScriptContextType {
  files: ScriptFile[];
  activeFileId: string | null;
  masterTemplate: MasterTemplate | null;
  isGeneratingTemplate: boolean;
  selectedModel: AiModel;
  analysisLimit: number; // Duration limit in minutes (0 = unlimited)
  outputLanguage: OutputLanguage;
  addFiles: (files: File[]) => void;
  setActiveFileId: (id: string) => void;
  removeFile: (id: string) => void;
  generateTemplate: () => void;
  closeMasterTemplate: () => void;
  setSelectedModel: (model: AiModel) => void;
  setAnalysisLimit: (minutes: number) => void;
  setOutputLanguage: (lang: OutputLanguage) => void;
}

const ScriptContext = createContext<ScriptContextType | undefined>(undefined);

const STORAGE_KEYS = {
  FILES: 'scriptAlchemy_files',
  ACTIVE_ID: 'scriptAlchemy_activeId',
  TEMPLATE: 'scriptAlchemy_masterTemplate',
  MODEL: 'scriptAlchemy_selectedModel',
  LIMIT: 'scriptAlchemy_analysisLimit',
  LANG: 'scriptAlchemy_outputLanguage'
};

export const ScriptProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state from LocalStorage
  const [files, setFiles] = useState<ScriptFile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FILES);
      if (saved) {
        const parsedFiles: ScriptFile[] = JSON.parse(saved);
        // If the app was closed while processing, reset those files to 'queued' so they process on load
        return parsedFiles.map(f => f.status === 'processing' ? { ...f, status: 'queued' as ProcessingStatus, processingProgress: undefined } : f);
      }
    } catch (e) {
      console.error("Failed to load files from storage", e);
    }
    return [];
  });

  const [activeFileId, setActiveFileId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_ID) || null;
    } catch (e) {
      return null;
    }
  });

  const [masterTemplate, setMasterTemplate] = useState<MasterTemplate | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEMPLATE);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [selectedModel, setSelectedModel] = useState<AiModel>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEYS.MODEL) as AiModel) || 'gemini-2.5-flash';
    } catch (e) {
      return 'gemini-2.5-flash';
    }
  });

  const [analysisLimit, setAnalysisLimit] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LIMIT);
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      return 0;
    }
  });

  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEYS.LANG) as OutputLanguage) || 'vi'; // Default to Vietnamese based on user request context
    } catch (e) {
      return 'vi';
    }
  });

  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const [processingQueue, setProcessingQueue] = useState<boolean>(false);
  
  // Ref to track settings without triggering effect dependency loop
  const selectedModelRef = useRef(selectedModel);
  const analysisLimitRef = useRef(analysisLimit);
  const outputLanguageRef = useRef(outputLanguage);

  // Persistence Effect: Save state to LocalStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
    } catch (e) {
      console.error("Failed to save files to storage (quota exceeded?)", e);
    }
  }, [files]);

  useEffect(() => {
    if (activeFileId) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, activeFileId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ID);
    }
  }, [activeFileId]);

  useEffect(() => {
    if (masterTemplate) {
      localStorage.setItem(STORAGE_KEYS.TEMPLATE, JSON.stringify(masterTemplate));
    } else {
      localStorage.removeItem(STORAGE_KEYS.TEMPLATE);
    }
  }, [masterTemplate]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MODEL, selectedModel);
    selectedModelRef.current = selectedModel;
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LIMIT, analysisLimit.toString());
    analysisLimitRef.current = analysisLimit;
  }, [analysisLimit]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LANG, outputLanguage);
    outputLanguageRef.current = outputLanguage;
  }, [outputLanguage]);

  const addFiles = async (uploadedFiles: File[]) => {
    const newScriptFiles: ScriptFile[] = [];

    for (const file of uploadedFiles) {
      const text = await file.text();
      const parsed = parseSrt(text);
      newScriptFiles.push({
        id: Math.random().toString(36).substring(2, 9),
        filename: file.name,
        content: text,
        uploadDate: Date.now(),
        status: 'queued',
        parsedSegments: parsed,
      });
    }

    setFiles(prev => [...prev, ...newScriptFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (activeFileId === id) setActiveFileId(null);
  };

  // Processing Queue Effect
  useEffect(() => {
    const processNext = async () => {
      if (processingQueue) return;
      
      const nextFileIndex = files.findIndex(f => f.status === 'queued');
      if (nextFileIndex === -1) return;

      setProcessingQueue(true);
      
      // Update status to processing
      const fileToProcess = files[nextFileIndex];
      setFiles(prev => {
        const newFiles = [...prev];
        newFiles[nextFileIndex] = { ...fileToProcess, status: 'processing', processingProgress: 'Initializing...' };
        return newFiles;
      });

      try {
        const currentModel = selectedModelRef.current;
        const currentLimit = analysisLimitRef.current;
        const currentLang = outputLanguageRef.current;

        // Apply Duration Limit Filter
        let segmentsToAnalyze = fileToProcess.parsedSegments;
        let progressSuffix = "";

        if (currentLimit > 0) {
            const limitSeconds = currentLimit * 60;
            segmentsToAnalyze = segmentsToAnalyze.filter(s => s.startSeconds < limitSeconds);
            progressSuffix = ` (First ${currentLimit} mins)`;
        }
        
        if (segmentsToAnalyze.length === 0) {
            throw new Error("No segments found within the specified duration limit.");
        }

        // Use the chunked analysis with a progress callback
        const analysis = await analyzeScriptWithGemini(
            segmentsToAnalyze, 
            currentModel,
            currentLang,
            (progressMsg) => {
                setFiles(prev => {
                    const idx = prev.findIndex(f => f.id === fileToProcess.id);
                    if (idx === -1) return prev;
                    const updated = [...prev];
                    updated[idx] = { ...updated[idx], processingProgress: `${progressMsg}${progressSuffix}` };
                    return updated;
                });
            }
        );
        
        setFiles(prev => {
          const idx = prev.findIndex(f => f.id === fileToProcess.id);
          if (idx === -1) return prev;
          const newFiles = [...prev];
          newFiles[idx] = { 
            ...newFiles[idx], 
            status: 'completed', 
            analysis: analysis,
            processingProgress: undefined 
          };
          return newFiles;
        });

      } catch (error: any) {
        console.error("Processing error", error);
        setFiles(prev => {
          const idx = prev.findIndex(f => f.id === fileToProcess.id);
          if (idx === -1) return prev;
          const newFiles = [...prev];
          newFiles[idx] = { 
            ...newFiles[idx], 
            status: 'error', 
            error: error.message || 'AI Processing Failed',
            processingProgress: undefined 
          };
          return newFiles;
        });
      } finally {
        setProcessingQueue(false);
      }
    };

    processNext();
  }, [files, processingQueue]); 

  const generateTemplate = async () => {
    const completedFiles = files.filter(f => f.status === 'completed' && f.analysis);
    if (completedFiles.length === 0) return;

    setIsGeneratingTemplate(true);
    try {
        const analyses = completedFiles.map(f => f.analysis!);
        const template = await generateMasterTemplate(analyses, selectedModelRef.current, outputLanguageRef.current);
        setMasterTemplate(template);
    } catch (e) {
        console.error(e);
        alert("Failed to generate master template. Check API Key.");
    } finally {
        setIsGeneratingTemplate(false);
    }
  };

  const closeMasterTemplate = () => {
    setMasterTemplate(null);
  };

  return (
    <ScriptContext.Provider value={{ 
      files, 
      activeFileId, 
      addFiles, 
      setActiveFileId, 
      removeFile,
      masterTemplate,
      generateTemplate,
      closeMasterTemplate,
      isGeneratingTemplate,
      selectedModel,
      setSelectedModel,
      analysisLimit,
      setAnalysisLimit,
      outputLanguage,
      setOutputLanguage
    }}>
      {children}
    </ScriptContext.Provider>
  );
};

export const useScript = () => {
  const context = useContext(ScriptContext);
  if (!context) throw new Error("useScript must be used within ScriptProvider");
  return context;
};