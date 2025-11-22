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
      <div style={pageStyle}>
        <div style={stepIndicatorContainerStyle}>
          <span style={stepIndicatorStyle}>
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
      <div style={pageStyle}>
        <div style={stepIndicatorContainerStyle}>
          <span style={stepIndicatorStyle}>
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
    <div style={completionPageStyle}>
      <div style={completionContainerStyle}>
        <div style={checkmarkStyle}>
          &#10003;
        </div>
        <h2 style={completionTitleStyle}>
          アンケート完了
        </h2>
        <p style={completionTextStyle}>
          全てのアンケートが完了しました。
        </p>
        <p style={completionSubtextStyle}>
          回答データは CSV ファイルとしてダウンロードされました。
        </p>
      </div>
    </div>
  );
};

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#f5f5f5',
  padding: '32px 16px',
};

const stepIndicatorContainerStyle: React.CSSProperties = {
  marginBottom: '16px',
  textAlign: 'center',
};

const stepIndicatorStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#e5e5e5',
  color: '#525252',
  fontSize: '14px',
  fontWeight: '600',
  padding: '8px 16px',
  borderRadius: '20px',
};

const completionPageStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#f5f5f5',
  padding: '32px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const completionContainerStyle: React.CSSProperties = {
  maxWidth: '400px',
  margin: '0 auto',
  padding: '48px 32px',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  textAlign: 'center',
};

const checkmarkStyle: React.CSSProperties = {
  fontSize: '48px',
  color: '#525252',
  marginBottom: '16px',
};

const completionTitleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#171717',
  margin: '0 0 16px 0',
};

const completionTextStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#525252',
  margin: '0 0 8px 0',
};

const completionSubtextStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#737373',
  margin: 0,
};

export default PostTaskQuestionnaires;
