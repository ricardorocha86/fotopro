import React, { useState, useCallback, ChangeEvent } from 'react';
import { AppState, GeneratedPhoto } from './types';
import { PROFESSIONAL_PROMPTS } from './constants';
import { generateImage } from './services/geminiService';
import { fileToDataUrl } from './utils/imageUtils';

// --- Helper Icons ---
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

// --- Main App Component ---
export default function App() {
    const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
    const [selfie, setSelfie] = useState<string | null>(null);
    const [generatedPhotos, setGeneratedPhotos] = useState<GeneratedPhoto[]>([]);
    const [error, setError] = useState<string | null>(null);

    const resetApp = () => {
        setAppState(AppState.UPLOAD);
        setSelfie(null);
        setGeneratedPhotos([]);
        setError(null);
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) { // 4MB limit
                setError("O arquivo é muito grande. Por favor, escolha uma imagem com menos de 4MB.");
                return;
            }
            try {
                setError(null);
                const dataUrl = await fileToDataUrl(file);
                setSelfie(dataUrl);
            } catch (err) {
                console.error("Error reading file:", err);
                setError("Não foi possível ler o arquivo de imagem.");
            }
        }
    };

    const handleGenerateClick = useCallback(async () => {
        if (!selfie) return;

        setAppState(AppState.GENERATING);
        setGeneratedPhotos(PROFESSIONAL_PROMPTS.map(p => ({ ...p, imageUrl: null })));

        try {
            const promises = PROFESSIONAL_PROMPTS.map(p => generateImage(p.prompt, selfie));
            const results = await Promise.all(promises);

            const finalPhotos: GeneratedPhoto[] = results.map((imageUrl, index) => ({
                ...PROFESSIONAL_PROMPTS[index],
                imageUrl
            }));
            
            setGeneratedPhotos(finalPhotos);
            setAppState(AppState.RESULTS);

        } catch (err) {
            console.error("Failed to generate photos", err);
            setError("Ocorreu um erro ao gerar as fotos. Por favor, tente novamente.");
            setAppState(AppState.UPLOAD);
        }
    }, [selfie]);
    
    const handleDownload = (imageUrl: string, title: string) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `foto_profissional_${title.toLowerCase().replace(' ', '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderHeader = () => (
        <header className="text-center mb-8 md:mb-12">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
                Gerador de Fotos Profissionais
            </h1>
            <p className="text-gray-300 mt-2 max-w-2xl mx-auto">Transforme sua selfie em fotos de perfil impressionantes para LinkedIn, sites e mais.</p>
        </header>
    );

    const renderContent = () => {
        switch (appState) {
            case AppState.GENERATING:
                return (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-teal-300 mb-4">Gerando suas fotos...</h2>
                        <p className="text-lg text-gray-300 mb-8">Aguarde um momento. A IA está criando seus retratos profissionais.</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-4xl mx-auto">
                            {PROFESSIONAL_PROMPTS.map((p) => (
                                <div key={p.id} className="aspect-[3/4] bg-gray-800 rounded-lg animate-pulse flex flex-col items-center justify-center">
                                    <div className="loader border-t-4 border-b-4 border-teal-300 rounded-full w-12 h-12 animate-spin"></div>
                                    <p className="text-sm mt-4 text-gray-400">{p.title}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case AppState.RESULTS:
                return (
                     <div className="text-center">
                        <h2 className="text-3xl font-bold mb-2 text-teal-300">Suas fotos estão prontas!</h2>
                        <p className="text-lg text-gray-200 mb-8">Baixe suas favoritas ou comece de novo com outra selfie.</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto mb-8">
                            {generatedPhotos.map(photo => (
                                <div key={photo.id} className="group relative aspect-[3/4] bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                                    {photo.imageUrl ? (
                                        <>
                                            <img src={photo.imageUrl} alt={photo.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-2">
                                                <h3 className="font-bold text-lg text-white text-center mb-4">{photo.title}</h3>
                                                <button onClick={() => handleDownload(photo.imageUrl!, photo.title)} className="flex items-center justify-center px-4 py-2 bg-teal-500 text-white font-semibold rounded-full shadow-md hover:bg-teal-600 transition-colors">
                                                    <DownloadIcon className="w-5 h-5 mr-2"/>
                                                    Baixar
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <p className="text-red-400">Falha</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button onClick={resetApp} className="px-10 py-4 bg-gradient-to-r from-blue-500 to-teal-500 text-white font-bold rounded-full shadow-lg hover:from-blue-600 hover:to-teal-600 transition-all transform hover:scale-105 text-lg">
                            Gerar Novas Fotos
                        </button>
                    </div>
                );

            case AppState.UPLOAD:
            default:
                return (
                    <div className="max-w-2xl mx-auto bg-gray-800/50 p-6 md:p-8 rounded-2xl shadow-2xl flex flex-col items-center">
                        {selfie ? (
                             <div className="w-full flex flex-col items-center">
                                 <h3 className="text-xl font-semibold mb-4 text-center">Sua selfie está pronta!</h3>
                                 <div className="w-64 h-64 md:w-80 md:h-80 rounded-lg overflow-hidden mb-6 shadow-lg">
                                     <img src={selfie} alt="Preview da selfie" className="w-full h-full object-cover" />
                                 </div>
                                 <div className="flex flex-col sm:flex-row gap-4">
                                     <label className="cursor-pointer px-6 py-3 bg-gray-600 text-white font-semibold rounded-full hover:bg-gray-700 transition-colors">
                                         Trocar Foto
                                         <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleFileChange} />
                                     </label>
                                     <button onClick={handleGenerateClick} className="px-8 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white font-bold rounded-full shadow-lg hover:from-blue-600 hover:to-teal-600 transition-all transform hover:scale-105">
                                         Gerar Fotos Profissionais
                                     </button>
                                 </div>
                             </div>
                        ) : (
                            <div className="w-full flex flex-col items-center text-center">
                                <label htmlFor="file-upload" className="w-full cursor-pointer border-4 border-dashed border-gray-600 hover:border-teal-400 transition-colors rounded-xl p-8 md:p-12 flex flex-col items-center justify-center">
                                    <UploadIcon className="w-16 h-16 text-gray-500 mb-4" />
                                    <span className="text-xl font-semibold text-gray-200">Clique para carregar sua selfie</span>
                                    <p className="text-gray-400 mt-2">PNG ou JPG (máx 4MB)</p>
                                </label>
                                <input id="file-upload" type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleFileChange} />
                            </div>
                        )}
                        {error && <p className="mt-4 text-red-400 bg-red-900/50 px-4 py-2 rounded-md">{error}</p>}
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-blue-900/50 p-4 sm:p-6 md:p-8 flex flex-col justify-center">
            {renderHeader()}
            <main>
                {renderContent()}
            </main>
        </div>
    );
}