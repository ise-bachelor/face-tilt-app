import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { PostTaskQuestionnaires } from '../components/PostTaskQuestionnaires';

const QuestionnaireDebugPage = () => {
  const router = useRouter();
  const [isStarted, setIsStarted] = useState(false);
  const [participantId, setParticipantId] = useState('DEBUG');
  const [condition, setCondition] = useState('Default');
  const [taskName, setTaskName] = useState('Debug');

  const handleFinished = () => {
    alert('アンケートが完了しました。');
    setIsStarted(false);
  };

  if (isStarted) {
    return (
      <PostTaskQuestionnaires
        participantId={participantId}
        condition={condition}
        taskName={taskName}
        onFinished={handleFinished}
      />
    );
  }

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>アンケート デバッグページ</h1>
      <p style={descriptionStyle}>
        NASA-RTLX と CSQ-VR アンケートのテスト用ページです。
      </p>

      <div style={formContainerStyle}>
        <div style={formGroupStyle}>
          <label style={labelStyle}>参加者ID</label>
          <input
            type="text"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>条件</label>
          <input
            type="text"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle}>タスク名</label>
          <input
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            style={inputStyle}
          />
        </div>

        <button onClick={() => setIsStarted(true)} style={startButtonStyle}>
          アンケートを開始
        </button>

        <button onClick={() => router.push('/')} style={homeButtonStyle}>
          ホームに戻る
        </button>
      </div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  backgroundColor: '#f5f5f5',
  padding: '20px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 'bold',
  marginBottom: '10px',
  color: '#333',
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#666',
  marginBottom: '30px',
  textAlign: 'center',
};

const formContainerStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: '30px',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  width: '100%',
  maxWidth: '400px',
};

const formGroupStyle: React.CSSProperties = {
  marginBottom: '20px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 'bold',
  marginBottom: '8px',
  color: '#333',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  fontSize: '14px',
  border: '2px solid #ddd',
  borderRadius: '6px',
  outline: 'none',
  boxSizing: 'border-box',
};

const startButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  fontSize: '16px',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: '#1976d2',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  marginBottom: '10px',
};

const homeButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#666',
  backgroundColor: '#e0e0e0',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
};

export default QuestionnaireDebugPage;
