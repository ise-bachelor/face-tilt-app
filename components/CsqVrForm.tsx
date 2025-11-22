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
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>CSQ-VR アンケート</h2>
        <p style={englishTitleStyle}>CyberSickness in Virtual Reality Questionnaire</p>
        <p style={subtitleStyle}>
          参加者: {participantId} / 条件: {condition} / タスク: {taskName}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {questionItems.map((item, index) => (
          <div key={item.key} style={{
            ...questionContainerStyle,
            borderBottom: index < questionItems.length - 1 ? '1px solid #e5e5e5' : 'none'
          }}>
            <p style={questionJaStyle}>
              {item.key}：{item.questionJa}
            </p>
            <p style={questionEnStyle}>
              {item.questionEn}
            </p>

            <div style={scaleContainerStyle}>
              <div style={scaleButtonsStyle}>
                {scaleLabels.map((label) => (
                  <button
                    key={label.value}
                    type="button"
                    onClick={() => handleScoreChange(item.key, label.value)}
                    style={{
                      ...scaleButtonStyle,
                      ...(responses[item.key].score === label.value ? selectedButtonStyle : unselectedButtonStyle)
                    }}
                  >
                    <div style={buttonNumberStyle}>{label.value}</div>
                    <div style={buttonLabelStyle}>{label.labelJa}</div>
                    <div style={buttonLabelStyle}>{label.labelEn}</div>
                  </button>
                ))}
              </div>

              <textarea
                placeholder="この症状に関するコメント（任意） / Optional comments about this symptom"
                value={responses[item.key].comment}
                onChange={(e) => handleCommentChange(item.key, e.target.value)}
                style={textareaStyle}
                rows={2}
              />
            </div>
          </div>
        ))}

        <div style={submitContainerStyle}>
          <button
            type="submit"
            disabled={!isAllScoresSelected()}
            style={{
              ...submitButtonStyle,
              ...(isAllScoresSelected() ? enabledButtonStyle : disabledButtonStyle)
            }}
          >
            回答を送信
          </button>
          {!isAllScoresSelected() && (
            <p style={warningTextStyle}>
              全ての項目でスコアを選択してください
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
  padding: '32px',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
};

const headerStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '32px',
  paddingBottom: '24px',
  borderBottom: '2px solid #e5e5e5',
};

const titleStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#171717',
  margin: '0 0 4px 0',
  letterSpacing: '-0.5px',
};

const englishTitleStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#737373',
  margin: '0 0 8px 0',
  fontStyle: 'italic',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#737373',
  margin: 0,
};

const questionContainerStyle: React.CSSProperties = {
  padding: '24px 0',
};

const questionTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#262626',
  margin: '0 0 8px 0',
};

const questionJaStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '800',
  color: '#343434ff',
  margin: '0 0 4px 0',
  lineHeight: '1.6',
};

const questionEnStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#737373',
  margin: '0 0 20px 0',
  fontStyle: 'italic',
};

const scaleContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const scaleButtonsStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '6px',
};

const scaleButtonStyle: React.CSSProperties = {
  padding: '10px 4px',
  borderRadius: '6px',
  border: '2px solid',
  cursor: 'pointer',
  transition: 'all 0.2s',
  textAlign: 'center',
};

const selectedButtonStyle: React.CSSProperties = {
  backgroundColor: '#262626',
  borderColor: '#262626',
  color: '#ffffff',
};

const unselectedButtonStyle: React.CSSProperties = {
  backgroundColor: '#fafafa',
  borderColor: '#d4d4d4',
  color: '#525252',
};

const buttonNumberStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '700',
};

const buttonLabelStyle: React.CSSProperties = {
  fontSize: '9px',
  lineHeight: '1.2',
  marginTop: '4px',
};

const scaleLabelsRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '11px',
  color: '#737373',
  padding: '0 4px',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: '14px',
  border: '1px solid #d4d4d4',
  borderRadius: '6px',
  resize: 'vertical',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  outline: 'none',
};

const submitContainerStyle: React.CSSProperties = {
  marginTop: '32px',
  paddingTop: '24px',
  borderTop: '2px solid #e5e5e5',
};

const submitButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '16px',
  fontSize: '16px',
  fontWeight: '600',
  border: 'none',
  borderRadius: '8px',
  transition: 'background-color 0.2s',
};

const enabledButtonStyle: React.CSSProperties = {
  backgroundColor: '#262626',
  color: '#ffffff',
  cursor: 'pointer',
};

const disabledButtonStyle: React.CSSProperties = {
  backgroundColor: '#d4d4d4',
  color: '#737373',
  cursor: 'not-allowed',
};

const warningTextStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#525252',
  textAlign: 'center',
  marginTop: '12px',
};

export default CsqVrForm;
