import React, { useMemo, useState, useEffect } from 'react';
import { useScript } from '../context/ScriptContext';
import { SECTION_COLORS, SECTION_TEXT_COLORS } from '../constants';
import { BarChart, Activity, Zap, MessageSquare, Feather, Mic, ChevronDown, Download, FileJson } from 'lucide-react';

const AnalysisView: React.FC = () => {
  const { files, activeFileId } = useScript();
  const fileIndex = files.findIndex(f => f.id === activeFileId);
  const file = files[fileIndex];
  const [visibleCount, setVisibleCount] = useState(20);

  // Reset visible count when file changes
  useEffect(() => {
    setVisibleCount(20);
  }, [activeFileId]);

  // Calculate percentage widths for the visual timeline bar
  const segments = useMemo(() => {
    if (!file?.analysis) return [];
    return file.analysis.segments;
  }, [file]);

  if (!file || !file.analysis) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500">
        <Activity className="w-12 h-12 mb-4 opacity-20" />
        <p>Select a completed file to view analysis</p>
      </div>
    );
  }

  const { analysis } = file;
  const { writingStyle } = analysis;

  const handleShowMore = () => {
    setVisibleCount(prev => Math.min(prev + 50, segments.length));
  };

  const handleExportHtml = () => {
    if (!file || !file.analysis) return;

    const fileName = `ScriptAlchemy_Analysis_${fileIndex + 1}.html`;
    
    // Construct the full HTML content
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${file.filename} - Analysis</title>
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
<body class="bg-gray-900 min-h-screen p-6 md:p-10 flex justify-center">
    <div class="max-w-4xl w-full space-y-8">
        
        <!-- Header -->
        <div class="border-b border-gray-700 pb-6">
            <h1 class="text-3xl font-bold text-white mb-4">${file.filename}</h1>
            <div class="flex flex-wrap gap-4">
                <span class="px-4 py-2 rounded-full bg-gray-800 text-sm font-medium border border-gray-700">
                    Pacing: <span class="text-blue-400 font-bold">${analysis.pacingScore}/100</span>
                </span>
                <span class="px-4 py-2 rounded-full bg-gray-800 text-sm font-medium border border-gray-700">
                    Hook: <span class="text-red-400 font-bold">${analysis.hookScore}/100</span>
                </span>
                <span class="px-4 py-2 rounded-full bg-gray-800 text-sm font-medium border border-gray-700">
                    Tone: <span class="text-purple-400 font-bold uppercase">${analysis.dominantTone}</span>
                </span>
            </div>
        </div>

        <!-- Summary & Patterns -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 class="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Summary</h3>
                <p class="text-gray-300 leading-relaxed">${analysis.summary}</p>
            </div>
            <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 class="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Key Patterns</h3>
                <ul class="space-y-2">
                    ${analysis.keyPatterns.map(p => `<li class="text-gray-300 flex gap-2"><span class="text-blue-500">•</span> ${p}</li>`).join('')}
                </ul>
            </div>
        </div>

        <!-- Writing Style -->
        ${writingStyle ? `
        <div class="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 class="text-sm font-bold text-purple-400 mb-4 uppercase tracking-wider">Writing Style & Voice</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <div class="mb-4">
                        <span class="text-xs text-gray-500 uppercase font-bold">Voice Persona</span>
                        <p class="text-gray-200 font-medium mt-1">${writingStyle.voiceDescription}</p>
                    </div>
                    <div>
                        <span class="text-xs text-gray-500 uppercase font-bold">Directive</span>
                        <div class="mt-1 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                            <p class="text-purple-200 italic">"${writingStyle.instructionalDirective}"</p>
                        </div>
                    </div>
                </div>
                <div>
                    <div class="mb-4">
                        <span class="text-xs text-gray-500 uppercase font-bold">Keywords</span>
                        <div class="flex flex-wrap gap-2 mt-1">
                            ${writingStyle.toneKeywords?.map(k => `<span class="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded border border-gray-600">${k}</span>`).join('')}
                        </div>
                    </div>
                    <div>
                        <span class="text-xs text-gray-500 uppercase font-bold">Rhetorical Devices</span>
                        <div class="flex flex-wrap gap-2 mt-1">
                             ${writingStyle.rhetoricalDevices?.map(d => `<span class="px-2 py-1 bg-blue-900/30 text-blue-300 text-xs rounded border border-blue-500/20">${d}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        ` : ''}

        <!-- Segment Breakdown -->
        <div class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div class="p-4 bg-gray-850 border-b border-gray-700">
                <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider">Full Script Breakdown</h3>
            </div>
            <div class="divide-y divide-gray-700">
                ${analysis.segments.map(seg => `
                <div class="p-4">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-bold uppercase ${SECTION_TEXT_COLORS[seg.label] || 'text-gray-400'}">
                            ${seg.label.replace('_', ' ')}
                        </span>
                        <span class="text-xs text-gray-500 font-mono">${seg.startTime}</span>
                    </div>
                    <p class="text-sm text-gray-300">${seg.text}</p>
                    <p class="text-xs text-gray-500 mt-2 italic border-l-2 border-gray-600 pl-2">Note: ${seg.analysis}</p>
                </div>
                `).join('')}
            </div>
        </div>

        <div class="text-center pt-8 text-gray-600 text-xs">
            Generated by ScriptAlchemy
        </div>
    </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto pr-2 pb-10 custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-white mb-2">{file.filename}</h2>
            <div className="flex gap-4">
                <span className="px-3 py-1 rounded-full bg-gray-700 text-xs text-gray-300 font-medium border border-gray-600">
                    Pacing: <span className="text-blue-400">{analysis.pacingScore}/100</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-gray-700 text-xs text-gray-300 font-medium border border-gray-600">
                    Hook: <span className="text-red-400">{analysis.hookScore}/100</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-gray-700 text-xs text-gray-300 font-medium border border-gray-600">
                    Tone: <span className="text-purple-400 uppercase">{analysis.dominantTone}</span>
                </span>
            </div>
        </div>
        <button 
            onClick={handleExportHtml}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors border border-gray-600 hover:border-gray-500 shadow-sm"
        >
            <Download className="w-4 h-4" />
            Download HTML
        </button>
      </div>

      {/* Timeline Visualizer */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
            <BarChart className="w-4 h-4" /> Script Structure
        </h3>
        <div className="w-full h-8 flex rounded-md overflow-hidden">
            {segments.map((seg, idx) => (
                <div 
                    key={idx} 
                    className={`${SECTION_COLORS[seg.label] || 'bg-gray-500'} h-full transition-all hover:brightness-110`}
                    style={{ flex: 1 }} // Simplified: assumes equal weight for demo visual. Real app would use duration.
                    title={`${seg.label}: ${seg.text.substring(0, 50)}...`}
                />
            ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
            {Object.keys(SECTION_COLORS).map((key) => (
                <div key={key} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-full ${SECTION_COLORS[key as any]}`}></div>
                    <span className="text-[10px] uppercase text-gray-400">{key.replace('_', ' ')}</span>
                </div>
            ))}
        </div>
      </div>

      {/* Summary & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
             <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Summary
             </h3>
             <p className="text-gray-300 leading-relaxed text-sm">
                {analysis.summary}
             </p>
          </div>

          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
             <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Key Patterns
             </h3>
             <ul className="space-y-2">
                {analysis.keyPatterns.map((pattern, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2">
                        <span className="text-blue-500">•</span> {pattern}
                    </li>
                ))}
             </ul>
          </div>
      </div>

      {/* Writing Style & Voice Section */}
      {writingStyle && (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-800/50">
            <h3 className="text-sm font-semibold text-purple-400 mb-4 flex items-center gap-2 uppercase tracking-wide">
                <Feather className="w-4 h-4" /> Writing Style & Voice Analysis
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <span className="text-xs text-gray-500 uppercase font-bold">Voice Persona</span>
                        <p className="text-gray-200 text-sm font-medium mt-1">{writingStyle.voiceDescription}</p>
                    </div>
                    <div>
                         <span className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1">
                            <Mic className="w-3 h-3" /> Voice Instruction (Directive)
                         </span>
                         <div className="mt-1 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                            <p className="text-purple-200 text-sm italic">"{writingStyle.instructionalDirective}"</p>
                         </div>
                    </div>
                </div>

                <div className="space-y-4">
                     <div>
                        <span className="text-xs text-gray-500 uppercase font-bold">Tone Keywords</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {writingStyle.toneKeywords?.map((tone, i) => (
                                <span key={i} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded border border-gray-600">
                                    {tone}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 uppercase font-bold">Rhetorical Devices</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {writingStyle.rhetoricalDevices?.map((device, i) => (
                                <span key={i} className="px-2 py-1 bg-blue-900/30 text-blue-300 text-xs rounded border border-blue-500/20">
                                    {device}
                                </span>
                            ))}
                        </div>
                    </div>
                     <div>
                        <span className="text-xs text-gray-500 uppercase font-bold">Complexity</span>
                        <p className="text-gray-300 text-sm mt-1">{writingStyle.complexityLevel}</p>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Segment Breakdown Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-4 bg-gray-850 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400">Detailed Breakdown</h3>
        </div>
        <div className="divide-y divide-gray-700">
            {segments.slice(0, visibleCount).map((seg, i) => (
                <div key={i} className="p-4 hover:bg-gray-750 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold uppercase ${SECTION_TEXT_COLORS[seg.label]}`}>
                            {seg.label.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">{seg.startTime}</span>
                    </div>
                    <p className="text-sm text-gray-300">{seg.text}</p>
                </div>
            ))}
        </div>
        
        {segments.length > visibleCount && (
            <button 
                onClick={handleShowMore}
                className="w-full p-4 flex items-center justify-center gap-2 text-sm text-blue-400 hover:bg-gray-750 hover:text-blue-300 transition-colors font-medium border-t border-gray-700"
            >
                Show More ({segments.length - visibleCount} remaining)
                <ChevronDown className="w-4 h-4" />
            </button>
        )}
      </div>
    </div>
  );
};

export default AnalysisView;