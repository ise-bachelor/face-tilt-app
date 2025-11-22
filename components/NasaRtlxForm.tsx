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
}

const scaleItems: ScaleItem[] = [
  {
    key: 'mentalDemand',
    title: '知的・知覚的要求 (Mental Demand)',
    description: 'どの程度の知的・知覚的活動（考える，決める，計算する，記憶する，見るなど）を必要としましたか。課題はやさしかったですか難しかったですか，単純でしたか複雑でしたか，正確さが求められましたか大ざっぱでよかったですか。'
  },
  {
    key: 'physicalDemand',
    title: '身体的要求 (Physical Demand)',
    description: 'どの程度の身体的活動（押す，引く，回す，制御する，動き回るなど）を必要としましたか。作業はラクでしたかキツかったですか，ゆっくりできましたかキビキビやらなければなりませんでしたか，休み休みできましたか働きづめでしたか。'
  },
  {
    key: 'temporalDemand',
    title: 'タイムプレッシャー (Temporal Demand)',
    description: '仕事のペースや課題が発生する頻度のために感じる時間的切迫感はどの程度でしたか。ペースはゆっくりとして余裕があるものでしたか，それとも速くて余裕のないものでしたか。'
  },
  {
    key: 'performance',
    title: '作業成績 (Performance)',
    description: '作業指示者（またはあなた自身）によって設定された課題の目標をどの程度達成できたと思いますか。目標の達成に関して自分の作業成績にどの程度満足していますか。'
  },
  {
    key: 'effort',
    title: '努力 (Effort)',
    description: '作業成績のレベルを達成・維持するために，精神的・身体的にどの程度いっしょうけんめいに作業しなければなりませんでしたか。'
  },
  {
    key: 'frustration',
    title: 'フラストレーション (Frustration)',
    description: '作業中に，不安感，落胆，いらいら，ストレス，悩みをどの程度感じましたか。あるいは逆に，安心感，満足感，充足感，楽しさ，リラックスをどの程度感じましたか。'
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
        <h2 style={titleStyle}>NASA-TLX アンケート</h2>
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
                <span>低い (0)</span>
                <span>高い (100)</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={values[item.key]}
                onChange={(e) => handleSliderChange(item.key, Number(e.target.value))}
                style={sliderStyle}
              />
              <div style={valueDisplayContainerStyle}>
                <span style={valueDisplayStyle}>
                  {values[item.key]}
                </span>
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
          height: 8px;
          background: linear-gradient(to right, #d4d4d4, #737373);
          border-radius: 4px;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          background: #262626;
          cursor: pointer;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          background: #262626;
          cursor: pointer;
          border-radius: 50%;
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
  fontSize: '14px',
  color: '#525252',
  margin: '0 0 20px 0',
  lineHeight: '1.6',
};

const sliderContainerStyle: React.CSSProperties = {
  padding: '0 4px',
};

const sliderLabelsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '12px',
  color: '#737373',
  marginBottom: '8px',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  cursor: 'pointer',
};

const valueDisplayContainerStyle: React.CSSProperties = {
  textAlign: 'center',
  marginTop: '12px',
};

const valueDisplayStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#f5f5f5',
  color: '#262626',
  fontSize: '16px',
  fontWeight: '600',
  padding: '8px 20px',
  borderRadius: '6px',
  minWidth: '60px',
  border: '1px solid #e5e5e5',
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
