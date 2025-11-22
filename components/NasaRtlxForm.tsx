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
    title: '知的・知覚的要求',
    description: 'どの程度の知的・知覚的活動(考える，決める，計算する，記憶する，見るなど)を必要としましたか．課題はやさしかったですか難しかったですか，単純でしたか複雑でしたか，正確さが求められましたか大ざっぱでよかったですか',
    lowLabel: '小さい',
    highLabel: '大きい'
  },
  {
    key: 'physicalDemand',
    title: '身体的要求',
    description: 'どの程度の身体的活動(押す，引く，回す，制御する，動き回るなど)を必要としましたか．作業はラクでしたかキツかったですか，ゆっくりできましたかキビキビやらなければなりませんでしたか，休み休みできましたか働きづめでしたか',
    lowLabel: '小さい',
    highLabel: '大きい'
  },
  {
    key: 'temporalDemand',
    title: 'タイムプレッシャー',
    description: '仕事のペースや課題が発生する頻度のために感じる時間的切迫感はどの程度でしたか．ペースはゆっくりとして余裕があるものでしたか，それとも速くて余裕のないものでしたか',
    lowLabel: '弱い',
    highLabel: '強い'
  },
  {
    key: 'performance',
    title: '作業成績',
    description: '作業指示者(またはあなた自身)によって設定された課題の目標をどの程度達成できたと思いますか．目標の達成に関して自分の作業成績にどの程度満足していますか',
    lowLabel: '良い',
    highLabel: '悪い'
  },
  {
    key: 'effort',
    title: '努力',
    description: '作業成績のレベルを達成・維持するために，精神的・身体的にどの程度いっしょうけんめいに作業しなければなりませんでしたか',
    lowLabel: '少ない',
    highLabel: '多い'
  },
  {
    key: 'frustration',
    title: 'フラストレーション',
    description: '作業中に，不安感，落胆，いらいら，ストレス，悩みをどの程度感じましたか．あるいは逆に，安心感，満足感，充足感，楽しさ，リラックスをどの程度感じましたか',
    lowLabel: '低い',
    highLabel: '高い'
  }
];

// 5から100まで5刻みの値
const scaleValues = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];

export const NasaRtlxForm: React.FC<NasaRtlxFormProps> = ({
  onSubmit,
  participantId,
  condition,
  taskName
}) => {
  const [values, setValues] = useState<Record<string, number | null>>({
    mentalDemand: null,
    physicalDemand: null,
    temporalDemand: null,
    performance: null,
    effort: null,
    frustration: null
  });

  const handleScaleClick = (key: string, value: number) => {
    setValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const isAllSelected = (): boolean => {
    return Object.values(values).every(v => v !== null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAllSelected()) {
      return;
    }

    const overallScore = Math.round(
      ((values.mentalDemand || 0) +
        (values.physicalDemand || 0) +
        (values.temporalDemand || 0) +
        (values.performance || 0) +
        (values.effort || 0) +
        (values.frustration || 0)) / 6 * 10
    ) / 10;

    const response: NasaRtlxResponse = {
      mentalDemand: values.mentalDemand || 0,
      physicalDemand: values.physicalDemand || 0,
      temporalDemand: values.temporalDemand || 0,
      performance: values.performance || 0,
      effort: values.effort || 0,
      frustration: values.frustration || 0,
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
            ...scaleContainerStyle,
          }}>
            <div style={scaleRowStyle}>
              <div style={scaleTableContainerStyle}>
                <table style={scaleTableStyle}>
                  <tbody>
                    <tr>
                      <td colSpan={20} style={headingStyle}>
                        {item.title}
                      </td>
                    </tr>
                    <tr>
                      {scaleValues.map((value, i) => (
                        <td
                          key={`top-${value}`}
                          onClick={() => handleScaleClick(item.key, value)}
                          style={{
                            ...((i % 2 == 0) ? topCellStyleA : topCellStyleB),
                            backgroundColor: values[item.key] === value
                              ? '#AAAAAA'
                              : '#FFFFFF',
                          }}
                        />
                      ))}
                    </tr>
                    <tr>
                      {scaleValues.map((value) => (
                        <td
                          key={`bottom-${value}`}
                          onClick={() => handleScaleClick(item.key, value)}
                          style={{
                            ...bottomCellStyle,
                            backgroundColor: values[item.key] === value
                              ? '#AAAAAA'
                              : '#FFFFFF',
                          }}
                        />
                      ))}
                    </tr>
                    <tr>
                      <td colSpan={10} style={leftLabelStyle}>
                        {item.lowLabel}
                      </td>
                      <td colSpan={10} style={rightLabelStyle}>
                        {item.highLabel}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={descriptionStyle}>
                {item.description}
              </div>
            </div>
          </div>
        ))}

        <div style={submitContainerStyle}>
          <button
            type="submit"
            disabled={!isAllSelected()}
            style={{
              ...submitButtonStyle,
              ...(isAllSelected() ? enabledButtonStyle : disabledButtonStyle)
            }}
          >
            回答を送信
          </button>
          {!isAllSelected() && (
            <p style={warningTextStyle}>
              全ての項目でスケールを選択してください
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  maxWidth: '900px',
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

const scaleContainerStyle: React.CSSProperties = {
  padding: '20px 0',
};

const scaleRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '20px',
};

const scaleTableContainerStyle: React.CSSProperties = {
  flexShrink: 0,
};

const scaleTableStyle: React.CSSProperties = {
  borderCollapse: 'collapse',
  borderSpacing: 0,
};

const headingStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#262626',
  textAlign: 'center',
  paddingBottom: '8px',
};

const topCellStyleA: React.CSSProperties = {
  width: '0.6cm',
  height: '0.4cm',
  cursor: 'pointer',
  border: '1px solid #000000',
  borderRight: 'none',
  borderBottom: 'none',
  transition: 'background-color 0.1s',
};

const topCellStyleB: React.CSSProperties = {
  width: '0.6cm',
  height: '0.4cm',
  cursor: 'pointer',
  border: '1px solid #000000',
  borderLeft: 'none',
  borderBottom: 'none',
  transition: 'background-color 0.1s',
};

const bottomCellStyle: React.CSSProperties = {
  width: '0.6cm',
  height: '0.4cm',
  cursor: 'pointer',
  border: '1px solid #000000',
  borderTop: 'none',
  transition: 'background-color 0.1s',
};

const leftLabelStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#000000',
  textAlign: 'left',
  paddingTop: '4px',
};

const rightLabelStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#000000',
  textAlign: 'right',
  paddingTop: '4px',
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#000000',
  lineHeight: '1.6',
  flex: 1,
  alignSelf: 'center',
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
  color: '#000000',
  textAlign: 'center',
  marginTop: '12px',
};

export default NasaRtlxForm;
