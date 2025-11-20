// 議事録編集タスクのデータ

import { ExperimentCondition } from '../types';
import { minutesDataRotate, MinutesData, Sentence, Section, MissingSentence, Typo } from './minutesDataRotate';
import { minutesDataDefault } from './minutesDataDefault';

// 型定義をエクスポート
export type { Sentence, Section, MissingSentence, Typo, MinutesData };

// 参加者IDから数値を抽出する関数
const extractParticipantNumber = (participantId: string): number => {
  const match = participantId.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

// 条件と参加者IDに応じてデータを取得する関数
export const getMinutesData = (condition?: ExperimentCondition, participantId?: string): MinutesData => {
  // 参加者IDが指定されている場合は偶奇で判定
  if (participantId) {
    const participantNumber = extractParticipantNumber(participantId);
    const isEven = participantNumber % 2 === 0;

    if (condition === 'rotate1' || condition === 'rotate2') {
      // rotate1/rotate2条件: 偶数ID → 防災、奇数ID → 緑化
      return isEven ? minutesDataRotate : minutesDataDefault;
    } else {
      // default条件: 偶数ID → 緑化、奇数ID → 防災
      return isEven ? minutesDataDefault : minutesDataRotate;
    }
  }

  // 参加者IDが指定されていない場合は条件のみで判定（後方互換性）
  if (condition === 'default') {
    return minutesDataDefault;
  }
  return minutesDataRotate;
};

// 後方互換性のため、デフォルトエクスポート（rotate条件のデータ）
export const minutesData: MinutesData = minutesDataRotate;
