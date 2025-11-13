/**
 * CSVファイルをダウンロード
 */
export const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
};

/**
 * テキストファイルをダウンロード
 */
export const downloadText = (textContent: string, filename: string) => {
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
  downloadBlob(blob, filename);
};

/**
 * WebM動画ファイルをダウンロード
 */
export const downloadWebM = (blob: Blob, filename: string) => {
  downloadBlob(blob, filename);
};

/**
 * Blobをダウンロード
 */
const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * ファイル名を生成（参加者ID、タスク、タイムスタンプ付き）
 */
export const generateFilename = (
  participantId: string,
  taskName: string,
  condition: string,
  extension: string
): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${participantId}_${taskName}_${condition}_${timestamp}.${extension}`;
};
