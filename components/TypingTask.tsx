import React, { useState, useEffect, useRef } from 'react';
import { Passage } from '../data/typingPassages';
import { TypingKeyLog, TypingResultLog, ExperimentCondition } from '../types';

interface TypingTaskProps {
  passage: Passage;
  participantId: string;
  condition: ExperimentCondition;
  onComplete: (result: TypingResultLog) => void;
}

export const TypingTask: React.FC<TypingTaskProps> = ({
  passage,
  participantId,
  condition,
  onComplete,
}) => {
  const [inputText, setInputText] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [keyLogs, setKeyLogs] = useState<TypingKeyLog[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // タスク開始時間を記録（初回キー入力時）
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 開始時刻を記録
    if (startTime === null) {
      setStartTime(Date.now());
    }

    const timestamp = Date.now();
    const isBackspace = e.key === 'Backspace' || e.key === 'Delete';

    // キーログを記録
    const keyLog: TypingKeyLog = {
      key: e.key,
      timestamp_ms: timestamp,
      is_backspace: isBackspace,
    };

    setKeyLogs(prev => [...prev, keyLog]);
  };

  // テキスト変更ハンドラ
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  // コピー・ペースト・カットを防止
  const handleCopyPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
  };

  // ドラッグ&ドロップを防止
  const handleDragDrop = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // 完了ボタンのハンドラ
  const handleComplete = () => {
    if (startTime === null) {
      alert('まだ入力が開始されていません。');
      return;
    }

    const endTime = Date.now();
    const finalTime = endTime - startTime;

    const result: TypingResultLog = {
      participant_id: participantId,
      condition: condition,
      passage_id: passage.id,
      final_text: inputText,
      final_time_ms: finalTime,
      key_logs: keyLogs,
    };

    setIsCompleted(true);
    onComplete(result);
  };

  // テキストエリアにフォーカス
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // 左パネルのテキスト選択を防止
  const handleSelectStart = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div style={containerStyle}>
      {/* ヘッダー */}
      <div style={headerStyle}>
        <div style={titleStyle}>{passage.title}</div>
        <button
          onClick={handleComplete}
          style={buttonStyle}
          disabled={isCompleted || inputText.length === 0}
        >
          完了
        </button>
      </div>

      {/* 左右分割パネル */}
      <div style={splitPanelStyle}>
        {/* 左パネル: 課題文表示 */}
        <div style={leftPanelStyle}>
          <div style={panelHeaderStyle}>課題文</div>
          <div
            style={passageContainerStyle}
            onMouseDown={handleSelectStart}
            onCopy={handleCopyPaste}
          >
            <div style={passageTextStyle}>
              {passage.text}
            </div>
          </div>
        </div>

        {/* 右パネル: テキストエリア */}
        <div style={rightPanelStyle}>
          <div style={panelHeaderStyle}>入力エリア</div>
          <div style={textareaContainerStyle}>
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onCopy={handleCopyPaste}
              onPaste={handleCopyPaste}
              onCut={handleCopyPaste}
              onDrag={handleDragDrop}
              onDrop={handleDragDrop}
              style={textareaStyle}
              placeholder="ここに課題文を入力してください..."
              disabled={isCompleted}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// スタイル定義
const containerStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#f5f5f5',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '15px 30px',
  backgroundColor: 'white',
  borderBottom: '2px solid #ddd',
};

const titleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#333',
};

const buttonStyle: React.CSSProperties = {
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: '#1976d2',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};

const splitPanelStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
};

const leftPanelStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: 'white',
  borderRight: '2px solid #ddd',
};

const rightPanelStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: 'white',
};

const panelHeaderStyle: React.CSSProperties = {
  padding: '15px 20px',
  fontSize: '16px',
  fontWeight: 'bold',
  backgroundColor: '#e3f2fd',
  borderBottom: '2px solid #1976d2',
  textAlign: 'center',
};

const passageContainerStyle: React.CSSProperties = {
  flex: 1,
  padding: '30px',
  overflowY: 'auto',
  display: 'flex',
  justifyContent: 'center',
  userSelect: 'none',
  WebkitUserSelect: 'none',
};

const passageTextStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '500px',
  fontSize: '16px',
  lineHeight: '2',
  color: '#333',
  textAlign: 'center',
  fontFamily: "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif",
};

const textareaContainerStyle: React.CSSProperties = {
  flex: 1,
  padding: '30px',
  display: 'flex',
  justifyContent: 'center',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '500px',
  height: '100%',
  padding: '20px',
  fontSize: '16px',
  lineHeight: '2',
  fontFamily: "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif",
  border: '2px solid #ddd',
  borderRadius: '8px',
  resize: 'none',
  outline: 'none',
  boxSizing: 'border-box',
};
