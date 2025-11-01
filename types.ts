export enum AppState {
  UPLOAD,
  GENERATING,
  RESULTS,
}

export interface GeneratedPhoto {
  id: number;
  prompt: string;
  imageUrl: string | null;
  title: string;
}