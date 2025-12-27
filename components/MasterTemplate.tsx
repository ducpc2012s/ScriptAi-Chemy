import React, { useRef, useState } from 'react';
import { useScript } from '../context/ScriptContext';
import { Trophy, Target, Layout, Lightbulb, FileCode, X, Loader2 } from 'lucide-react';
import { SECTION_COLORS } from '../constants';

const MasterTemplateView: React.FC = () => {
  const { masterTemplate, closeMasterTemplate } = useScript();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!masterTemplate) return null;

  const handleDownloadHtml = () => {
    if (!contentRef.current) return;
    setIsExporting(true);

    try {
        const contentHtml = contentRef.current.innerHTML;
        const title = masterTemplate.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);

        const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${masterTemplate.title} - ScriptAlchemy Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script>
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: { sans: ['Inter', 'sans-serif'] },
            colors: {
              gray: { 750: '#2d3748', 850: '#1a202c', 950: '#171923' }
            }
          }
        }
      }
    </script>
    <style>
      body { background-color: #111827; color: #f8fafc; font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="bg-gray-900 min-h-screen p-4 md:p-10 flex justify-center">
    <div class="max-w-4xl w-full">
        ${contentHtml}
    </div>
</body>
</html>`;

        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title}_Master_Script.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error("HTML Export failed:", error);
        alert("Could not generate HTML report. Please try again.");
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 w-full max-w-4xl max-h-[90vh] rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Toolbar (Fixed) */}
        <div className="p-4 border-b border-gray-700 bg-gray-850 flex justify-between items-center shrink-0 z-10">
            <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="text-gray-200 font-bold text-sm uppercase tracking-wide">ScriptAlchemy Report</span>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleDownloadHtml}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4" />}
                    {isExporting ? 'Exporting...' : 'Export HTML'}
                </button>
                <button 
                    onClick={closeMasterTemplate}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* Scrollable Content Area - Captured for Export */}
        <div className="overflow-y-auto flex-1 bg-gray-900 custom-scrollbar">
            <div ref={contentRef} className="p-8 space-y-8 bg-gray-900 min-h-full">
                
                {/* Header Section (Inline for easy capture) */}
                <div className="pb-6 border-b border-gray-800">
                    <span className="inline-block px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-bold border border-yellow-500/20 mb-3">
                        GENERATED MASTER TEMPLATE
                    </span>
                    <h2 className="text-3xl font-bold text-white leading-tight">{masterTemplate.title}</h2>
                </div>

                {/* Top Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-800/50 p-5 rounded-xl border border-gray-700">
                        <h3 className="text-gray-400 text-sm font-semibold mb-2 flex items-center gap-2">
                            <Target className="w-4 h-4" /> Target Audience
                        </h3>
                        <p className="text-lg text-white font-medium">{masterTemplate.targetAudience}</p>
                    </div>
                    <div className="bg-gray-800/50 p-5 rounded-xl border border-gray-700">
                        <h3 className="text-gray-400 text-sm font-semibold mb-2 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" /> The Winning Formula
                        </h3>
                        <p className="text-gray-300 text-sm leading-relaxed">{masterTemplate.winningFormula}</p>
                    </div>
                </div>

                {/* Structure Flow */}
                <div>
                    <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
                        <Layout className="w-5 h-5 text-blue-400" /> Structural Blueprint
                    </h3>
                    <div className="space-y-4">
                        {masterTemplate.structure.map((part, idx) => (
                            <div key={idx} className="flex gap-4 p-4 bg-gray-800 rounded-xl border border-gray-700 relative overflow-hidden group break-inside-avoid">
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${SECTION_COLORS[part.section]}`}></div>
                                
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-white font-bold">{part.section}</h4>
                                        <span className="text-xs font-mono text-gray-500 bg-gray-900 px-2 py-1 rounded">
                                            Approx. {part.durationPercent}
                                        </span>
                                    </div>
                                    <p className="text-gray-300 text-sm mb-3">{part.description}</p>
                                    
                                    <div className="bg-gray-900/50 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase mb-1 font-bold">Example Phrases</p>
                                        <div className="flex flex-wrap gap-2">
                                            {part.examplePhrases.map((phrase, pIdx) => (
                                                <span key={pIdx} className="text-xs text-blue-300 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                                                    "{phrase}"
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tips */}
                <div className="bg-blue-900/10 border border-blue-500/20 p-6 rounded-xl break-inside-avoid">
                    <h3 className="text-blue-400 font-bold mb-3">Pro Tips for Execution</h3>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {masterTemplate.tips.map((tip, i) => (
                            <li key={i} className="text-gray-300 text-sm flex gap-2">
                                <span className="text-blue-500 font-bold">✓</span> {tip}
                            </li>
                        ))}
                    </ul>
                </div>
                
                {/* Footer */}
                <div className="pt-8 text-center border-t border-gray-800 text-gray-600 text-xs">
                    Generated by ScriptAlchemy AI
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MasterTemplateView;