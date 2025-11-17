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

/**
 * 参加者情報からCSVコンテンツを生成
 */
export const generateParticipantInfoCSV = (participantInfo: {
  participantId: string;
  age: number;
  gender: string;
  videoConsent: {
    consentType: string;
    conditions?: string;
  };
}): string => {
  const rows = [
    ['項目', '内容'],
    ['参加者ID', participantInfo.participantId],
    ['年齢', participantInfo.age.toString()],
    ['性別', getGenderLabel(participantInfo.gender)],
    ['ビデオ画像公開の同意タイプ', getConsentTypeLabel(participantInfo.videoConsent.consentType)],
  ];

  if (participantInfo.videoConsent.conditions) {
    rows.push(['公開条件', participantInfo.videoConsent.conditions]);
  }

  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
};

/**
 * 性別のラベルを取得
 */
const getGenderLabel = (gender: string): string => {
  switch (gender) {
    case 'male':
      return '男性';
    case 'female':
      return '女性';
    case 'other':
      return 'その他';
    case 'prefer_not_to_say':
      return '回答しない';
    default:
      return gender;
  }
};

/**
 * 同意タイプのラベルを取得
 */
const getConsentTypeLabel = (consentType: string): string => {
  switch (consentType) {
    case 'approved_identifiable':
      return '承諾（顔が特定される形式のまま公開OK）';
    case 'approved_anonymized':
      return '承諾（モザイク処理等で個人が特定されない形式で公開OK）';
    case 'approved_with_conditions':
      return '条件付きで承諾';
    case 'not_approved':
      return '承諾しない';
    default:
      return consentType;
  }
};
