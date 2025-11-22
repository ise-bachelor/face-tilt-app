import React, { useState } from 'react';
import { NasaRtlxForm } from './NasaRtlxForm';
import { CsqVrForm } from './CsqVrForm';
import { NasaRtlxResponse, CsqVrResponse } from '../types';
import { downloadNasaRtlxCsv, downloadCsqVrCsv } from '../utils/downloadUtils';

interface PostTaskQuestionnairesProps {
  participantId: string;
  condition: string;
  taskName: string;
  onFinished?: () => void;
}

type Step = 'nasa' | 'csqvr' | 'done';

export const PostTaskQuestionnaires: React.FC<PostTaskQuestionnairesProps> = ({
  participantId,
  condition,
  taskName,
  onFinished
}) => {
  const [step, setStep] = useState<Step>('nasa');

  const handleNasaSubmit = (data: NasaRtlxResponse) => {
    downloadNasaRtlxCsv(participantId, condition, taskName, data);
    setStep('csqvr');
  };

  const handleCsqvrSubmit = (data: CsqVrResponse) => {
    downloadCsqVrCsv(participantId, condition, taskName, data);
    setStep('done');
    onFinished?.();
  };

  if (step === 'nasa') {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="mb-4 text-center">
          <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded">
            ステップ 1/2: NASA-TLX
          </span>
        </div>
        <NasaRtlxForm
          onSubmit={handleNasaSubmit}
          participantId={participantId}
          condition={condition}
          taskName={taskName}
        />
      </div>
    );
  }

  if (step === 'csqvr') {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="mb-4 text-center">
          <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded">
            ステップ 2/2: CSQ-VR
          </span>
        </div>
        <CsqVrForm
          onSubmit={handleCsqvrSubmit}
          participantId={participantId}
          condition={condition}
          taskName={taskName}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 flex items-center justify-center">
      <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-md text-center">
        <div className="text-green-500 text-5xl mb-4">
          &#10003;
        </div>
        <h2 className="text-2xl font-bold mb-4">
          アンケート完了
        </h2>
        <p className="text-gray-600 mb-2">
          全てのアンケートが完了しました。
        </p>
        <p className="text-sm text-gray-500">
          回答データは CSV ファイルとしてダウンロードされました。
        </p>
      </div>
    </div>
  );
};

export default PostTaskQuestionnaires;
