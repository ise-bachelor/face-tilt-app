// 議事録編集タスクのデータ

import { ExperimentCondition } from '../types';
import { minutesDataRotate, MinutesData, Sentence, Section, MissingSentence, Typo } from './minutesDataRotate';
import { minutesDataDefault } from './minutesDataDefault';

// 型定義をエクスポート
export type { Sentence, Section, MissingSentence, Typo, MinutesData };

// 条件に応じてデータを取得する関数
export const getMinutesData = (condition?: ExperimentCondition): MinutesData => {
  if (condition === 'default') {
    return minutesDataDefault;
  }
  // rotate条件、またはconditionが未指定の場合はrotateを使用
  return minutesDataRotate;
};

// 後方互換性のため、デフォルトエクスポート（rotate条件のデータ）
export const minutesData: MinutesData = minutesDataRotate;
