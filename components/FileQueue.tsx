import React from 'react';
import { useScript } from '../context/ScriptContext';
import { FileCode, Loader2, CheckCircle2, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { ProcessingStatus } from '../types';

const StatusIcon = ({ status }: { status: ProcessingStatus }) => {
  switch (status) {
    case 'processing': return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
    case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
    default: return <div className="w-4 h-4 rounded-full border-2 border-gray-600" />;
  }
};

const FileQueue: React.FC = () => {
  const { files, activeFileId, setActiveFileId, removeFile, generateTemplate, masterTemplate, isGeneratingTemplate } = useScript();

  const completedCount = files.filter(f => f.status === 'completed').length;

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-gray-700 bg-gray-850">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Analysis Queue</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {files.length === 0 && (
            <div className="text-center p-8 text-gray-500 text-sm">
                No files uploaded
            </div>
        )}
        {files.map(file => (
          <div 
            key={file.id}
            onClick={() => file.status === 'completed' && setActiveFileId(file.id)}
            className={`
              group relative flex items-center gap-3 p-3 rounded-lg transition-colors
              ${file.id === activeFileId ? 'bg-blue-500/20 border border-blue-500/50' : 'hover:bg-gray-700/50 border border-transparent'}
              ${file.status === 'completed' ? 'cursor-pointer' : 'cursor-default'}
            `}
          >
            <FileCode className="w-5 h-5 text-gray-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{file.filename}</p>
              <div className="flex items-center gap-2 h-4">
                  <p className="text-xs text-gray-500 capitalize">{file.status}</p>
                  {file.status === 'processing' && file.processingProgress && (
                      <span className="text-[10px] text-blue-400 truncate max-w-[120px]">
                          - {file.processingProgress}
                      </span>
                  )}
              </div>
            </div>
            <StatusIcon status={file.status} />
            
            <button 
                onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded text-red-400 transition-all absolute right-10"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-700 bg-gray-850">
        <button
            onClick={generateTemplate}
            disabled={completedCount < 1 || isGeneratingTemplate}
            className={`
                w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all
                ${completedCount > 0 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
            `}
        >
            {isGeneratingTemplate ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                </>
            ) : (
                <>
                    Generate Master Script
                    <ArrowRight className="w-4 h-4" />
                </>
            )}
        </button>
      </div>
    </div>
  );
};

export default FileQueue;