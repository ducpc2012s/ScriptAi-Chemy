import React from 'react';
import { ScriptProvider, useScript } from './context/ScriptContext';
import UploadZone from './components/UploadZone';
import FileQueue from './components/FileQueue';
import AnalysisView from './components/AnalysisView';
import MasterTemplateView from './components/MasterTemplate';
import { Sparkles, Settings, Bot, Clock, Globe } from 'lucide-react';
import { AiModel, OutputLanguage } from './types';

const Header = () => {
    const { 
        selectedModel, setSelectedModel, 
        analysisLimit, setAnalysisLimit,
        outputLanguage, setOutputLanguage
    } = useScript();

    return (
        <header className="h-16 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-10">
            <div className="container mx-auto px-4 h-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 hidden sm:block">
                        ScriptAlchemy
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    
                    {/* Language Selector */}
                    <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1 border border-gray-700">
                        <div className="px-2 text-gray-400">
                            <Globe className="w-4 h-4" />
                        </div>
                        <select 
                            value={outputLanguage}
                            onChange={(e) => setOutputLanguage(e.target.value as OutputLanguage)}
                            className="bg-transparent text-sm text-gray-200 focus:outline-none border-none pr-8 py-1 cursor-pointer w-20"
                        >
                            <option value="vi">Tiếng Việt</option>
                            <option value="en">English</option>
                        </select>
                    </div>

                    {/* Duration Limit Input */}
                    <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1 border border-gray-700 hidden md:flex" title="Limit analysis to the first N minutes (0 = Unlimited)">
                        <div className="px-2 text-gray-400 flex items-center gap-1 border-r border-gray-700 mr-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs font-medium hidden sm:inline">Limit</span>
                        </div>
                        <input 
                            type="number" 
                            min="0"
                            value={analysisLimit === 0 ? '' : analysisLimit}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setAnalysisLimit(isNaN(val) || val < 0 ? 0 : val);
                            }}
                            placeholder="All"
                            className="bg-transparent text-sm text-gray-200 focus:outline-none border-none w-12 text-center"
                        />
                        <span className="text-xs text-gray-500 pr-2">min</span>
                    </div>

                    {/* Model Selector */}
                    <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1 border border-gray-700 hidden sm:flex">
                        <div className="px-2 text-gray-400">
                            <Bot className="w-4 h-4" />
                        </div>
                        <select 
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value as AiModel)}
                            className="bg-transparent text-sm text-gray-200 focus:outline-none border-none pr-8 py-1 cursor-pointer max-w-[140px] sm:max-w-none"
                        >
                            <option value="gemini-3-flash-preview">Gemini 3.0 Flash</option>
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                            <option value="gemini-2.5-flash-lite-latest">Gemini 2.5 Flash Lite</option>
                            <option value="gemini-3-pro-preview">Gemini 3.0 Pro</option>
                        </select>
                    </div>

                    <button className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800">
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </header>
    );
};

const MainLayout = () => {
    const { masterTemplate } = useScript();

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-blue-500/30">
            <Header />

            {/* Dashboard Grid */}
            <main className="container mx-auto px-4 py-6 h-[calc(100vh-4rem)]">
                <div className="grid grid-cols-12 gap-6 h-full">
                    
                    {/* Left Col: Upload & Queue */}
                    <div className="col-span-12 lg:col-span-3 flex flex-col gap-6 h-full">
                        <UploadZone />
                        <FileQueue />
                    </div>

                    {/* Right Col: Analysis View */}
                    <div className="col-span-12 lg:col-span-9 bg-gray-900/30 border border-gray-800 rounded-2xl p-1 overflow-hidden h-full">
                        <AnalysisView />
                    </div>
                </div>
            </main>

            {/* Modal Overlay for Master Template */}
            {masterTemplate && <MasterTemplateView />}
        </div>
    );
};

const App: React.FC = () => {
  return (
    <ScriptProvider>
      <MainLayout />
    </ScriptProvider>
  );
};

export default App;