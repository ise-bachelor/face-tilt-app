import React, { useState } from 'react';
import { NasaRtlxResponse } from '../types';

interface NasaRtlxFormProps {
  onSubmit: (data: NasaRtlxResponse) => void;
  participantId: string;
  condition: string;
  taskName: string;
}

interface ScaleItem {
  key: keyof Omit<NasaRtlxResponse, 'overallScore'>;
  title: string;
  description: string;
  lowLabel: string;
  highLabel: string;
}

const scaleItems: ScaleItem[] = [
  {
    key: 'mentalDemand',
    title: '精神的欲求',
    description: 'どの程度の精神的、知覚的活動が必要でしたか？（例：思考、決定、計算、記憶、観察、検索など）課題は易しかったですか、それとも難しかったですか？単純でしたか、複雑でしたか？厳密さを要求されましたか、それとも寛大でしたか？',
    lowLabel: '低い',
    highLabel: '高い'
  },
  {
    key: 'physicalDemand',
    title: '身体的欲求',
    description: 'どの程度の身体的活動が必要でしたか？（例：押す、引く、回す、制御する、起動するなど）課題は易しかったですか、それとも難しかったですか？ゆっくりでしたか、きびきびしていましたか？ゆるやかでしたか、骨の折れるものでしたか？休息できましたか、骨身を惜しまぬものでしたか？',
    lowLabel: '低い',
    highLabel: '高い'
  },
  {
    key: 'temporalDemand',
    title: '時間的欲求',
    description: '課題の遂行中にどの程度の時間的圧迫を感じましたか？ペースはゆっくりで余裕がありましたか、それとも速くてあわただしかったですか？',
    lowLabel: '低い',
    highLabel: '高い'
  },
  {
    key: 'performance',
    title: '作業達成度',
    description: '実験者（または自分自身）によって設定された課題の目標をどの程度うまく達成できたと思いますか？課題目標の達成における自身の作業成績について、どの程度満足していますか？',
    lowLabel: '良い',
    highLabel: '悪い'
  },
  {
    key: 'effort',
    title: '努力',
    description: '自身の作業成績のレベルを達成するために、精神的及び身体的にどの程度一生懸命作業しなければなりませんでしたか？',
    lowLabel: '低い',
    highLabel: '高い'
  },
  {
    key: 'frustration',
    title: '不満',
    description: '課題遂行中に、不安、落胆、いらいら、ストレス、うんざりといった感情と対照的に、安心、満足、充足、リラックスといった感情をどの程度感じましたか？',
    lowLabel: '低い',
    highLabel: '高い'
  }
];

export const NasaRtlxForm: React.FC<NasaRtlxFormProps> = ({
  onSubmit,
  participantId,
  condition,
  taskName
}) => {
  const [values, setValues] = useState<Record<string, number>>({
    mentalDemand: 50,
    physicalDemand: 50,
    temporalDemand: 50,
    performance: 50,
    effort: 50,
    frustration: 50
  });

  const handleSliderChange = (key: string, value: number) => {
    setValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const overallScore = Math.round(
      (values.mentalDemand +
        values.physicalDemand +
        values.temporalDemand +
        values.performance +
        values.effort +
        values.frustration) / 6 * 10
    ) / 10;

    const response: NasaRtlxResponse = {
      mentalDemand: values.mentalDemand,
      physicalDemand: values.physicalDemand,
      temporalDemand: values.temporalDemand,
      performance: values.performance,
      effort: values.effort,
      frustration: values.frustration,
      overallScore
    };

    onSubmit(response);
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>NASA-TLX</h2>
        <p style={subtitleStyle}>
          参加者: {participantId} / 条件: {condition} / タスク: {taskName}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {scaleItems.map((item, index) => (
          <div key={item.key} style={{
            ...questionContainerStyle,
            borderBottom: index < scaleItems.length - 1 ? '1px solid #e5e5e5' : 'none'
          }}>
            <h3 style={questionTitleStyle}>
              {item.title}
            </h3>
            <p style={questionDescriptionStyle}>
              {item.description}
            </p>

            <div style={sliderContainerStyle}>
              <div style={sliderLabelsStyle}>
                <span style={labelStyle}>{item.lowLabel}</span>
                <span style={labelStyle}>{item.highLabel}</span>
              </div>
              <div style={sliderWrapperStyle}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={values[item.key]}
                  onChange={(e) => handleSliderChange(item.key, Number(e.target.value))}
                  style={sliderInputStyle}
                />
                <div style={tickMarksStyle}>
                  {Array.from({ length: 21 }).map((_, i) => (
                    <div key={i} style={tickMarkStyle} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        <div style={submitContainerStyle}>
          <button type="submit" style={submitButtonStyle}>
            回答を送信
          </button>
        </div>
      </form>

      <style jsx>{`
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          background: #404040;
          border-radius: 0;
          outline: none;
          margin: 0;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 32px;
          background: #262626;
          cursor: pointer;
          border-radius: 2px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 32px;
          background: #262626;
          cursor: pointer;
          border-radius: 2px;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        input[type="range"]:hover::-webkit-slider-thumb {
          background: #404040;
        }
        input[type="range"]:hover::-moz-range-thumb {
          background: #404040;
        }
      `}</style>
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
  margin: '0 0 8px 0',
  letterSpacing: '-0.5px',
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

const questionDescriptionStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#525252',
  margin: '0 0 20px 0',
  lineHeight: '1.7',
};

const sliderContainerStyle: React.CSSProperties = {
  padding: '0 4px',
};

const sliderLabelsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '8px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#262626',
};

const sliderWrapperStyle: React.CSSProperties = {
  position: 'relative',
  paddingBottom: '16px',
};

const sliderInputStyle: React.CSSProperties = {
  width: '100%',
  cursor: 'pointer',
  position: 'relative',
  zIndex: 2,
};

const tickMarksStyle: React.CSSProperties = {
  position: 'absolute',
  top: '2px',
  left: '0',
  right: '0',
  display: 'flex',
  justifyContent: 'space-between',
  pointerEvents: 'none',
};

const tickMarkStyle: React.CSSProperties = {
  width: '1px',
  height: '12px',
  backgroundColor: '#737373',
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
  color: '#ffffff',
  backgroundColor: '#262626',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

export default NasaRtlxForm;
