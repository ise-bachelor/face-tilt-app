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

/**
 * CSV用に値をエスケープ（カンマ、改行、ダブルクォートを含む場合）
 */
export const escapeCsvValue = (value: string | number): string => {
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

/**
 * ヘッダと1行分のデータからCSV文字列を生成
 */
export const generateCsvString = (headers: string[], data: (string | number)[]): string => {
  const headerLine = headers.map(escapeCsvValue).join(',');
  const dataLine = data.map(escapeCsvValue).join(',');
  return `${headerLine}\n${dataLine}`;
};

/**
 * NASA-RTLX 用 CSV を生成してダウンロード
 */
export const downloadNasaRtlxCsv = (
  participantId: string,
  condition: string,
  taskName: string,
  data: {
    mentalDemand: number;
    physicalDemand: number;
    temporalDemand: number;
    performance: number;
    effort: number;
    frustration: number;
    overallScore: number;
  }
): void => {
  const headers = [
    'timestamp',
    'participant_id',
    'condition',
    'task_name',
    'nasa_mental_demand',
    'nasa_physical_demand',
    'nasa_temporal_demand',
    'nasa_performance',
    'nasa_effort',
    'nasa_frustration',
    'nasa_overall_score'
  ];

  const timestamp = new Date().toISOString();
  const rowData = [
    timestamp,
    participantId,
    condition,
    taskName,
    data.mentalDemand,
    data.physicalDemand,
    data.temporalDemand,
    data.performance,
    data.effort,
    data.frustration,
    data.overallScore
  ];

  const csvContent = generateCsvString(headers, rowData);
  const filename = `${participantId}_${condition}_${taskName}_NASA-RTLX.csv`;
  downloadCSV(csvContent, filename);
};

/**
 * CSQ-VR 用 CSV を生成してダウンロード
 */
export const downloadCsqVrCsv = (
  participantId: string,
  condition: string,
  taskName: string,
  data: {
    items: Record<string, { score: number; comment: string }>;
    nauseaScore: number;
    vestibularScore: number;
    oculomotorScore: number;
    totalScore: number;
  }
): void => {
  const headers = [
    'timestamp',
    'participant_id',
    'condition',
    'task_name',
    'csqvr_nauseaA_score',
    'csqvr_nauseaB_score',
    'csqvr_vestibularA_score',
    'csqvr_vestibularB_score',
    'csqvr_oculomotorA_score',
    'csqvr_oculomotorB_score',
    'csqvr_nauseaA_comment',
    'csqvr_nauseaB_comment',
    'csqvr_vestibularA_comment',
    'csqvr_vestibularB_comment',
    'csqvr_oculomotorA_comment',
    'csqvr_oculomotorB_comment',
    'csqvr_nausea_score',
    'csqvr_vestibular_score',
    'csqvr_oculomotor_score',
    'csqvr_total_score'
  ];

  const timestamp = new Date().toISOString();
  const rowData = [
    timestamp,
    participantId,
    condition,
    taskName,
    data.items.nauseaA.score,
    data.items.nauseaB.score,
    data.items.vestibularA.score,
    data.items.vestibularB.score,
    data.items.oculomotorA.score,
    data.items.oculomotorB.score,
    data.items.nauseaA.comment,
    data.items.nauseaB.comment,
    data.items.vestibularA.comment,
    data.items.vestibularB.comment,
    data.items.oculomotorA.comment,
    data.items.oculomotorB.comment,
    data.nauseaScore,
    data.vestibularScore,
    data.oculomotorScore,
    data.totalScore
  ];

  const csvContent = generateCsvString(headers, rowData);
  const filename = `${participantId}_${condition}_${taskName}_CSQ-VR.csv`;
  downloadCSV(csvContent, filename);
};
