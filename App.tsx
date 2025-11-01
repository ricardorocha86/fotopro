import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateProfessionalPhotos } from './services/geminiService';
import { fileToDataUrl } from './utils/imageUtils';
import { AppState, GeneratedPhoto } from './types';
import { PROFESSIONAL_PROMPTS } from './constants';

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

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);

interface GenerationProgress {
  id: number;
  title: string;
  status: 'pending' | 'done' | 'error';
  time?: number;
}

// --- Main App Component ---
export default function App() {
    const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
    const [originalPhoto, setOriginalPhoto] = useState<{ url: string; file: File } | null>(null);
    const [generatedPhotos, setGeneratedPhotos] = useState<GeneratedPhoto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [revealedPhotos, setRevealedPhotos] = useState<Set<number>>(new Set());
    const [generationProgress, setGenerationProgress] = useState<GenerationProgress[]>([]);
    const generationStartTimes = useRef<Map<number, number>>(new Map());
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let interval: number | undefined;

        if (appState === AppState.GENERATING) {
            interval = window.setInterval(() => {
                const now = performance.now();
                setGenerationProgress(currentProgress => {
                    if (!currentProgress.some(p => p.status === 'pending')) {
                        clearInterval(interval);
                        return currentProgress;
                    }

                    return currentProgress.map(p => {
                        if (p.status === 'pending') {
                            const startTime = generationStartTimes.current.get(p.id) || now;
                            const duration = (now - startTime) / 1000;
                            return { ...p, time: duration };
                        }
                        return p;
                    });
                });
            }, 100); 
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [appState]);

    const resetApp = () => {
        setAppState(AppState.UPLOAD);
        setOriginalPhoto(null);
        setGeneratedPhotos([]);
        setError(null);
        setRevealedPhotos(new Set());
        setGenerationProgress([]);
    };

    const handleFileSelect = useCallback(async (file: File | null) => {
        if (!file || !file.type.startsWith('image/')) {
            setError('Por favor, selecione um arquivo de imagem válido (JPEG, PNG, etc).');
            return;
        }
        setError(null);
        try {
            const dataUrl = await fileToDataUrl(file);
            setOriginalPhoto({ url: dataUrl, file });
        } catch (err) {
            console.error(err);
            setError('Não foi possível carregar a imagem.');
        }
    }, []);

    const handleGenerateClick = useCallback(async () => {
        if (!originalPhoto) {
            setError("Por favor, envie uma foto primeiro.");
            return;
        }

        setError(null);
        
        const now = performance.now();
        generationStartTimes.current.clear();
        const initialProgress = PROFESSIONAL_PROMPTS.map(p => {
            generationStartTimes.current.set(p.id, now);
            return {
                id: p.id,
                title: p.title,
                status: 'pending' as const,
            };
        });
        setGenerationProgress(initialProgress);
        setAppState(AppState.GENERATING);

        const handlePhotoGenerated = (photo: GeneratedPhoto) => {
            const endTime = performance.now();
            const startTime = generationStartTimes.current.get(photo.id) || endTime;
            const duration = (endTime - startTime) / 1000;

            setGenerationProgress(prevProgress =>
                prevProgress.map(p =>
                    p.id === photo.id
                        ? { ...p, status: photo.imageUrl ? 'done' : 'error', time: duration }
                        : p
                )
            );
        };

        try {
            const photos = await generateProfessionalPhotos(originalPhoto.url, originalPhoto.file.type, handlePhotoGenerated);
            setGeneratedPhotos(photos);
            setTimeout(() => {
                 setAppState(AppState.RESULTS);
            }, 1200);
        } catch (err) {
            console.error("Failed to generate photos", err);
            setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido. Por favor, tente novamente.");
            setAppState(AppState.UPLOAD);
        }
    }, [originalPhoto]);
    
    const handleRevealPhoto = (id: number) => {
        setRevealedPhotos(prev => {
            const newSet = new Set(prev);
            newSet.add(id);
            return newSet;
        });
    };

    const handleDownload = (imageUrl: string, title: string) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        const fileExtension = imageUrl.split(';')[0].split('/')[1] || 'png';
        link.download = `foto-pro-${title.toLowerCase().replace(/\s+/g, '-')}.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Drag and Drop Handlers ---
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        handleFileSelect(file);
    };

    const renderHeader = () => (
        <header className="text-center mb-8 md:mb-12">
            <h1 className="text-5xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-400"
                style={{ filter: 'drop-shadow(0 0 10px rgba(217, 70, 239, 0.6))' }}>
                Foto Pro
            </h1>
            <p className="text-lime-300 mt-2 max-w-2xl mx-auto tracking-wider">Crie uma foto de perfil profissional para o LinkedIn em segundos.</p>
        </header>
    );
    
    const CardWrapper = ({ children }: { children: React.ReactNode }) => (
      <div className="glow-border rounded-3xl p-1 w-full">
        <div className="bg-black/70 backdrop-blur-xl rounded-[22px] p-6 md:p-8 h-full">
          {children}
        </div>
      </div>
    );

    const renderContent = () => {
        switch (appState) {
            case AppState.GENERATING:
                return (
                    <div className="w-full max-w-2xl mx-auto">
                       <CardWrapper>
                          <div className="text-center flex flex-col items-center justify-center p-4 md:p-6">
                            <div className="psy-loader mb-6">
                              <div className="inner one"></div>
                              <div className="inner two"></div>
                              <div className="inner three"></div>
                            </div>
                            <h2 className="text-3xl font-bold text-cyan-300 mb-2">Gerando suas fotos...</h2>
                            <p className="text-lg text-fuchsia-300 mb-8">Aguarde enquanto a IA cria cada estilo.</p>
                            
                            <div className="w-full space-y-3 text-left">
                              {generationProgress.map(p => (
                                <div key={p.id} className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-white/10 transition-all duration-500">
                                  <span className="text-lg font-medium text-white tracking-wide">{p.title}</span>
                                  <div className="flex items-center gap-3 text-lg">
                                    <span className={`font-mono font-bold w-16 text-right ${
                                        p.status === 'done' ? 'text-lime-400' :
                                        p.status === 'error' ? 'text-red-400' : 'text-cyan-300'
                                    }`}>
                                        {p.status === 'error' ? 'Erro' : (p.time !== undefined ? `${p.time.toFixed(1)}s` : '...')}
                                    </span>
                                    <div className="w-6 h-6 flex items-center justify-center">
                                        {p.status === 'pending' && <div className="simple-spinner" role="status" aria-label="gerando"></div>}
                                        {p.status === 'done' && <span className="text-2xl text-lime-400">✓</span>}
                                        {p.status === 'error' && <span className="text-2xl text-red-400">✗</span>}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                       </CardWrapper>
                   </div>
                );

            case AppState.RESULTS:
                return (
                     <div className="w-full max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-8">
                            {generatedPhotos.map(photo => {
                                const isRevealed = revealedPhotos.has(photo.id);
                                return (
                                    <div key={photo.id} className="glow-border rounded-2xl p-0.5">
                                        <div className="bg-black/60 backdrop-blur-lg rounded-xl p-4 flex flex-col items-center text-center h-full">
                                            <h3 className="text-2xl font-bold text-lime-300 mb-3">{photo.title}</h3>
                                            
                                            <div className="relative w-full mb-4">
                                                {photo.imageUrl ? (
                                                    <>
                                                        <img 
                                                            src={photo.imageUrl} 
                                                            alt={`Generated headshot - ${photo.title}`}
                                                            className={`w-full aspect-auto rounded-lg border-2 border-fuchsia-500/50 transition-all duration-700 ease-in-out ${isRevealed ? 'opacity-100 scale-100 blur-0' : 'opacity-40 scale-95 blur-md'}`}
                                                        />
                                                        {!isRevealed && (
                                                            <div 
                                                                onClick={() => handleRevealPhoto(photo.id)}
                                                                className="absolute inset-0 rounded-lg flex flex-col items-center justify-center cursor-pointer group bg-black/40"
                                                                aria-label={`Revelar foto ${photo.title}`}
                                                                role="button"
                                                            >
                                                                <div className="text-center p-4 rounded-full bg-black/60 backdrop-blur-sm transition-transform duration-300 group-hover:scale-105">
                                                                    <SparklesIcon className="w-10 h-10 text-cyan-300 mx-auto" />
                                                                    <p className="mt-2 text-sm font-bold text-white tracking-wider">REVELAR</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="w-full aspect-square bg-gray-900 border-2 border-red-500/50 rounded-lg flex items-center justify-center text-red-400">Falha ao gerar</div>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => photo.imageUrl && handleDownload(photo.imageUrl, photo.title)}
                                                disabled={!photo.imageUrl}
                                                className="w-full mt-auto flex items-center justify-center px-4 py-2 bg-cyan-500 text-black font-bold text-lg rounded-full transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/50 disabled:bg-gray-700 disabled:shadow-none disabled:cursor-not-allowed">
                                                <DownloadIcon className="w-5 h-5 mr-2"/>
                                                Baixar
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-center">
                             <button onClick={resetApp} 
                                className="px-10 py-4 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 text-white font-bold rounded-full shadow-lg shadow-fuchsia-500/40 transition-all transform hover:scale-110 hover:shadow-xl hover:shadow-fuchsia-500/60 text-xl">
                                Enviar Nova Foto
                            </button>
                        </div>
                    </div>
                );

            case AppState.UPLOAD:
            default:
                return (
                    <div className="max-w-2xl w-full mx-auto flex flex-col items-center gap-6">
                        <CardWrapper>
                           <div className="flex flex-col items-center gap-6">
                             {!originalPhoto ? (
                                 <div 
                                    className={`w-full h-64 border-4 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isDragging ? 'border-lime-400 bg-lime-500/20 scale-105' : 'border-fuchsia-500/80 hover:border-fuchsia-400'}`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <UploadIcon className={`w-16 h-16 mb-4 transition-colors ${isDragging ? 'text-lime-300' : 'text-fuchsia-400'}`}/>
                                    <p className="text-2xl font-semibold">Arraste sua foto aqui</p>
                                    <p className="text-gray-300">ou clique para selecionar</p>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={(e) => handleFileSelect(e.target.files ? e.target.files[0] : null)}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                </div>
                            ) : (
                                <div className="w-full flex flex-col items-center gap-4">
                                    <img src={originalPhoto.url} alt="Preview" className="max-h-64 rounded-lg shadow-md border-2 border-cyan-400/50" />
                                    <button onClick={() => setOriginalPhoto(null)} className="text-cyan-400 hover:text-cyan-300 font-bold tracking-wider">TROCAR FOTO</button>
                                </div>
                            )}
                        
                            <ul className="text-sm text-lime-200/80 list-disc list-inside text-left w-full space-y-1">
                                <li>Use uma foto com boa iluminação e seu rosto bem visível.</li>
                                <li>Evite fotos com chapéus, óculos de sol ou com o rosto coberto.</li>
                                <li>Um fundo neutro funciona melhor.</li>
                            </ul>
                            
                            <button 
                                onClick={handleGenerateClick}
                                disabled={!originalPhoto}
                                className="w-full flex items-center justify-center px-10 py-4 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 text-white font-bold rounded-full shadow-lg shadow-fuchsia-500/40 transition-all transform hover:scale-110 hover:shadow-xl hover:shadow-fuchsia-500/60 text-xl disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none">
                                <SparklesIcon className="w-7 h-7 mr-3" />
                                GERAR FOTOS PROFISSIONAIS
                            </button>

                            {error && <p className="mt-2 text-red-300 bg-red-900/70 px-4 py-2 rounded-md border border-red-500">{error}</p>}
                           </div>
                        </CardWrapper>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen p-4 sm:p-6 md:p-8 flex flex-col justify-center items-center">
            {renderHeader()}
            <main className="w-full flex justify-center">
                {renderContent()}
            </main>
        </div>
    );
}