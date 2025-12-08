import React from 'react';

interface TaskInstructionScreenProps {
  title: string;
  description: string | React.ReactNode;
  additionalInfo?: string | React.ReactNode;
  onStart: () => void;
  isModelLoaded: boolean;
}

export const TaskInstructionScreen: React.FC<TaskInstructionScreenProps> = ({
  title,
  description,
  additionalInfo,
  onStart,
  isModelLoaded,
}) => {
  return (
    <div style={startContainerStyle}>
      <h1 style={titleStyle}>{title}</h1>
      <div style={descriptionStyle}>{description}</div>
      {additionalInfo && <div style={additionalInfoStyle}>{additionalInfo}</div>}
      <button
        onClick={onStart}
        disabled={!isModelLoaded}
        style={startButtonStyle}
      >
        {isModelLoaded ? 'タスク開始' : '顔認識モデル読み込み中...'}
      </button>
    </div>
  );
};

// スタイル定義
const startContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px',
  backgroundColor: 'white',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  maxWidth: '650px',
  margin: '0 auto',
};

const titleStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 'bold',
  marginBottom: '20px',
  color: '#333',
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '18px',
  color: '#666',
  marginBottom: '20px',
  textAlign: 'left',
  lineHeight: '1.6',
};

const additionalInfoStyle: React.CSSProperties = {
  fontSize: '18px',
  color: '#666',
  marginBottom: '20px',
  textAlign: 'left',
  lineHeight: '1.6',
};

const startButtonStyle: React.CSSProperties = {
  padding: '16px 32px',
  fontSize: '18px',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: '#1976d2',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'background-color 0.3s',
};
