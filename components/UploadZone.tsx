import React, { useCallback, useState } from 'react';
import { UploadCloud, FileText, ClipboardPaste, ArrowRight } from 'lucide-react';
import { useScript } from '../context/ScriptContext';
import { convertTranscriptToSrt } from '../services/srtParser';

const UploadZone: React.FC = () => {
  const { addFiles } = useScript();
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [processingPaste, setProcessingPaste] = useState(false);

  // --- Drag & Drop Handlers ---
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (activeTab === 'upload') setIsDragging(true);
  }, [activeTab]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (activeTab !== 'upload') return;
    
    const files = Array.from(e.dataTransfer.files).filter((f: File) => f.name.endsWith('.srt'));
    if (files.length > 0) addFiles(files);
  }, [addFiles, activeTab]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter((f: File) => f.name.endsWith('.srt'));
      addFiles(files);
    }
  };

  // --- Paste Handler ---
  const handleProcessPaste = () => {
    if (!pasteContent.trim()) return;
    setProcessingPaste(true);
    
    try {
      // 1. Convert text to SRT format
      const srtContent = convertTranscriptToSrt(pasteContent);
      
      if (!srtContent) {
        alert("Could not parse timestamps. Please ensure format is [0:00] Text...");
        setProcessingPaste(false);
        return;
      }

      // 2. Create a synthetic File object
      const blob = new Blob([srtContent], { type: 'text/plain' });
      const file = new File([blob], `transcribed_paste_${Date.now()}.srt`, { type: 'text/plain' });

      // 3. Add to queue
      addFiles([file]);
      setPasteContent(''); // Clear input
      setActiveTab('upload'); // Switch back to view queue context easier
    } catch (e) {
      console.error(e);
      alert("Error processing transcript");
    } finally {
      setProcessingPaste(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'upload' 
              ? 'bg-gray-700 text-white shadow-sm' 
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <UploadCloud className="w-4 h-4" /> Upload SRT
        </button>
        <button
          onClick={() => setActiveTab('paste')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'paste' 
              ? 'bg-gray-700 text-white shadow-sm' 
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <ClipboardPaste className="w-4 h-4" /> Paste Transcript
        </button>
      </div>

      {/* Content Area */}
      <div className="h-64">
        {activeTab === 'upload' ? (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative h-full border-2 border-dashed rounded-xl p-8 transition-all duration-300
              flex flex-col items-center justify-center text-center cursor-pointer
              ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-blue-400 bg-gray-800/50'}
            `}
          >
            <input 
              type="file" 
              multiple 
              accept=".srt" 
              onChange={handleInput} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="bg-gray-800 p-4 rounded-full mb-4">
              <UploadCloud className={`w-8 h-8 ${isDragging ? 'text-blue-400' : 'text-gray-400'}`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-200 mb-1">
              Upload SRT Files
            </h3>
            <p className="text-sm text-gray-400 max-w-xs">
              Drag & drop your subtitle files here, or click to browse.
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full gap-3">
            <textarea 
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder="Paste transcript here using format:&#10;[0:00] Introduction text...&#10;[0:15] Next topic..."
              className="flex-1 w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
            />
            <button
              onClick={handleProcessPaste}
              disabled={!pasteContent.trim() || processingPaste}
              className={`
                w-full py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all
                ${!pasteContent.trim() || processingPaste
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'}
              `}
            >
              {processingPaste ? 'Converting...' : 'Convert to SRT & Analyze'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadZone;