import React, { useState } from 'react';
import { CsqVrItemKey, CsqVrItemResponse, CsqVrResponse } from '../types';

interface CsqVrFormProps {
  onSubmit: (data: CsqVrResponse) => void;
  participantId: string;
  condition: string;
  taskName: string;
}

interface QuestionItem {
  key: CsqVrItemKey;
  titleJa: string;
  questionJa: string;
  questionEn: string;
}

const questionItems: QuestionItem[] = [
  {
    key: 'nauseaA',
    titleJa: '吐き気 (Nausea A)',
    questionJa: '吐き気を感じますか。（例：胃の痛み、胸やけ、吐き気など）',
    questionEn: 'Nausea A: Do you experience nausea (e.g., stomach pain, acid reflux, or tension to vomit)?'
  },
  {
    key: 'nauseaB',
    titleJa: 'めまい (Nausea B)',
    questionJa: 'めまいを感じますか。（例：ふらつき感、ぐるぐる回る感じなど）',
    questionEn: 'Nausea B: Do you experience dizziness (e.g., light-headedness or spinning feeling)?'
  },
  {
    key: 'vestibularA',
    titleJa: '方向感覚の乱れ (Vestibular A)',
    questionJa: '方向感覚の乱れを感じますか。（例：空間的な混乱や回転しているような感覚など）',
    questionEn: 'Vestibular A: Do you experience disorientation (e.g., spatial confusion or vertigo)?'
  },
  {
    key: 'vestibularB',
    titleJa: '姿勢の不安定さ (Vestibular B)',
    questionJa: '姿勢の不安定さを感じますか。（すなわち、バランスが取りにくいと感じますか）',
    questionEn: 'Vestibular B: Do you experience postural instability (i.e., imbalance)?'
  },
  {
    key: 'oculomotorA',
    titleJa: '視覚的な疲労 (Oculomotor A)',
    questionJa: '視覚的な疲労を感じますか。（例：目が疲れる、眠くなる など）',
    questionEn: 'Oculomotor A: Do you experience a visually induced fatigue (e.g., feeling of tiredness or sleepiness)?'
  },
  {
    key: 'oculomotorB',
    titleJa: '視覚的な不快感 (Oculomotor B)',
    questionJa: '視覚的な不快感を感じますか。（例：眼精疲労、ぼやけ、頭痛 など）',
    questionEn: 'Oculomotor B: Do you experience a visually induced discomfort (e.g., eyestrain, blurred vision, or headache)?'
  }
];

const scaleLabels = [
  { value: 1, labelJa: '全く感じない', labelEn: 'Absent Feeling' },
  { value: 2, labelJa: 'ごくわずかに感じる', labelEn: 'Very Mild Feeling' },
  { value: 3, labelJa: '少し感じる', labelEn: 'Mild Feeling' },
  { value: 4, labelJa: 'まあまあ感じる', labelEn: 'Moderate Feeling' },
  { value: 5, labelJa: '強く感じる', labelEn: 'Intense Feeling' },
  { value: 6, labelJa: 'とても強く感じる', labelEn: 'Very Intense Feeling' },
  { value: 7, labelJa: '極めて強く感じる', labelEn: 'Extreme Feeling' }
];

type ItemResponses = Record<CsqVrItemKey, CsqVrItemResponse>;

const initialResponses: ItemResponses = {
  nauseaA: { score: 0, comment: '' },
  nauseaB: { score: 0, comment: '' },
  vestibularA: { score: 0, comment: '' },
  vestibularB: { score: 0, comment: '' },
  oculomotorA: { score: 0, comment: '' },
  oculomotorB: { score: 0, comment: '' }
};

export const CsqVrForm: React.FC<CsqVrFormProps> = ({
  onSubmit,
  participantId,
  condition,
  taskName
}) => {
  const [responses, setResponses] = useState<ItemResponses>(initialResponses);

  const handleScoreChange = (key: CsqVrItemKey, score: number) => {
    setResponses(prev => ({
      ...prev,
      [key]: { ...prev[key], score }
    }));
  };

  const handleCommentChange = (key: CsqVrItemKey, comment: string) => {
    setResponses(prev => ({
      ...prev,
      [key]: { ...prev[key], comment }
    }));
  };

  const isAllScoresSelected = (): boolean => {
    return Object.values(responses).every(item => item.score >= 1 && item.score <= 7);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAllScoresSelected()) {
      return;
    }

    const nauseaScore = responses.nauseaA.score + responses.nauseaB.score;
    const vestibularScore = responses.vestibularA.score + responses.vestibularB.score;
    const oculomotorScore = responses.oculomotorA.score + responses.oculomotorB.score;
    const totalScore = nauseaScore + vestibularScore + oculomotorScore;

    const result: CsqVrResponse = {
      items: responses,
      nauseaScore,
      vestibularScore,
      oculomotorScore,
      totalScore
    };

    onSubmit(result);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-2">
        CSQ-VR アンケート
      </h2>
      <p className="text-sm text-gray-600 text-center mb-2">
        CyberSickness in Virtual Reality Questionnaire
      </p>
      <p className="text-sm text-gray-600 text-center mb-6">
        参加者: {participantId} / 条件: {condition} / タスク: {taskName}
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {questionItems.map((item) => (
          <div key={item.key} className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {item.titleJa}
            </h3>
            <p className="text-sm text-gray-700 mb-1">
              {item.questionJa}
            </p>
            <p className="text-xs text-gray-500 italic mb-4">
              {item.questionEn}
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-7 gap-1">
                {scaleLabels.map((label) => (
                  <button
                    key={label.value}
                    type="button"
                    onClick={() => handleScoreChange(item.key, label.value)}
                    className={`
                      p-2 text-xs rounded border transition-all duration-200
                      ${responses[item.key].score === label.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                      }
                    `}
                  >
                    <div className="font-bold">{label.value}</div>
                    <div className="text-[10px] leading-tight hidden sm:block">
                      {label.labelJa}
                    </div>
                  </button>
                ))}
              </div>

              <div className="text-xs text-gray-500 flex justify-between px-1">
                <span>{scaleLabels[0].labelEn}</span>
                <span>{scaleLabels[6].labelEn}</span>
              </div>

              <textarea
                placeholder="この症状に関するコメント（任意） / Optional comments about this symptom"
                value={responses[item.key].comment}
                onChange={(e) => handleCommentChange(item.key, e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
              />
            </div>
          </div>
        ))}

        <div className="pt-4">
          <button
            type="submit"
            disabled={!isAllScoresSelected()}
            className={`
              w-full font-bold py-3 px-4 rounded-lg transition-colors duration-200
              ${isAllScoresSelected()
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            回答を送信
          </button>
          {!isAllScoresSelected() && (
            <p className="text-sm text-red-500 text-center mt-2">
              全ての項目でスコアを選択してください
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default CsqVrForm;
