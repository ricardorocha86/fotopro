export const getBase64Data = (dataUrl: string): string => {
  const parts = dataUrl.split(',');
  if (parts.length === 2) {
    return parts[1];
  }
  console.error("Invalid data URL format");
  return '';
};

export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};