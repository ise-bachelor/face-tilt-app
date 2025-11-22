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
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-2">
        NASA-TLX アンケート
      </h2>
      <p className="text-sm text-gray-600 text-center mb-6">
        参加者: {participantId} / 条件: {condition} / タスク: {taskName}
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {scaleItems.map((item) => (
          <div key={item.key} className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {item.title}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {item.description}
            </p>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
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
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="text-center">
                <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded">
                  {values[item.key]}
                </span>
              </div>
            </div>
          </div>
        ))}

        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            回答を送信
          </button>
        </div>
      </form>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: #2563eb;
          cursor: pointer;
          border-radius: 50%;
        }
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #2563eb;
          cursor: pointer;
          border-radius: 50%;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default NasaRtlxForm;
