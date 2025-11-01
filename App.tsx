import React, { useState, useCallback } from 'react';
import { generateStory } from './services/geminiService';

// --- App State Enum ---
enum AppState {
  INPUT,
  GENERATING,
  RESULTS,
}

// --- Helper Icons ---
const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);

const ClipboardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a2.25 2.25 0 0 1-2.25 2.25H9A2.25 2.25 0 0 1 6.75 5.25v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5A2.25 2.25 0 0 1 16.5 21.75H7.5A2.25 2.25 0 0 1 5.25 19.5V7.221c0-1.108.806-2.057 1.907-2.185A48.208 48.208 0 0 1 12 4.5c.673 0 1.342.026 2.003.075M10.5 14.25h3M10.5 11.25h.008v.008H10.5v-.008Z" />
    </svg>
);


// --- Main App Component ---
export default function App() {
    const [appState, setAppState] = useState<AppState>(AppState.INPUT);
    const [storyIdea, setStoryIdea] = useState<string>('');
    const [generatedStory, setGeneratedStory] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState<boolean>(false);

    const resetApp = () => {
        setAppState(AppState.INPUT);
        setStoryIdea('');
        setGeneratedStory('');
        setError(null);
        setIsCopied(false);
    };

    const handleGenerateClick = useCallback(async () => {
        if (!storyIdea.trim()) {
            setError("Por favor, escreva sua ideia para a história.");
            return;
        }

        setError(null);
        setAppState(AppState.GENERATING);

        try {
            const story = await generateStory(storyIdea);
            setGeneratedStory(story);
            setAppState(AppState.RESULTS);
        } catch (err) {
            console.error("Failed to generate story", err);
            setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido. Por favor, tente novamente.");
            setAppState(AppState.INPUT);
        }
    }, [storyIdea]);
    
    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(generatedStory).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
        });
    };
    
    const renderHeader = () => (
        <header className="text-center mb-8 md:mb-12">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-pink-500">
                Gerador de Histórias Românticas
            </h1>
            <p className="text-gray-300 mt-2 max-w-2xl mx-auto">Dê vida às suas fantasias. Escreva uma ideia e deixe a IA criar uma história de amor para você.</p>
        </header>
    );

    const renderContent = () => {
        switch (appState) {
            case AppState.GENERATING:
                return (
                    <div className="text-center flex flex-col items-center justify-center p-8">
                        <div className="loader border-t-4 border-b-4 border-pink-400 rounded-full w-16 h-16 animate-spin mb-6"></div>
                        <h2 className="text-2xl font-bold text-pink-300 mb-2">Criando sua história...</h2>
                        <p className="text-lg text-gray-300">Aguarde um momento. A IA está tecendo os fios do romance.</p>
                    </div>
                );

            case AppState.RESULTS:
                return (
                     <div className="w-full max-w-4xl mx-auto">
                        <div className="bg-gray-800/50 p-6 md:p-8 rounded-2xl shadow-2xl mb-8">
                            <p className="text-lg text-gray-200 leading-relaxed whitespace-pre-wrap">
                                {generatedStory}
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                             <button onClick={handleCopyToClipboard} className="flex items-center justify-center w-full sm:w-auto px-6 py-3 bg-gray-600 text-white font-semibold rounded-full hover:bg-gray-700 transition-colors">
                                <ClipboardIcon className="w-5 h-5 mr-2"/>
                                {isCopied ? 'Copiado!' : 'Copiar Texto'}
                            </button>
                            <button onClick={resetApp} className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-bold rounded-full shadow-lg hover:from-fuchsia-700 hover:to-pink-700 transition-all transform hover:scale-105">
                                Escrever Outra História
                            </button>
                        </div>
                    </div>
                );

            case AppState.INPUT:
            default:
                return (
                    <div className="max-w-2xl mx-auto bg-gray-800/50 p-6 md:p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6">
                        <h2 className="text-2xl font-semibold text-center text-gray-100">Qual é a sua ideia?</h2>
                        <textarea
                            value={storyIdea}
                            onChange={(e) => setStoryIdea(e.target.value)}
                            placeholder="Ex: Um encontro inesperado entre uma astrônoma e um músico de jazz em um observatório abandonado..."
                            className="w-full h-40 p-4 bg-gray-900/70 border-2 border-gray-700 rounded-lg text-lg text-gray-200 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors resize-none"
                            aria-label="Ideia para a história"
                        />
                        <button onClick={handleGenerateClick} className="w-full sm:w-auto flex items-center justify-center px-10 py-4 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-bold rounded-full shadow-lg hover:from-fuchsia-700 hover:to-pink-700 transition-all transform hover:scale-105 text-lg">
                            <SparklesIcon className="w-6 h-6 mr-2" />
                            Gerar História
                        </button>
                        {error && <p className="mt-2 text-red-400 bg-red-900/50 px-4 py-2 rounded-md">{error}</p>}
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-fuchsia-900/50 p-4 sm:p-6 md:p-8 flex flex-col justify-center items-center">
            {renderHeader()}
            <main className="w-full flex justify-center">
                {renderContent()}
            </main>
        </div>
    );
}