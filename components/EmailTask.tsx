import React, { useState, useEffect, useRef } from 'react';
import { ManualViewer } from './ManualViewer';
import { Manual } from '../data/emailData';
import {
  EmailScenario,
  EmailKeyLog,
  EmailScenarioLog,
  EmailSessionLog,
  Experiment2Condition,
  ManualType,
} from '../types';

interface EmailTaskProps {
  manual: Manual;
  scenarios: EmailScenario[];
  participantId: string;
  condition: Experiment2Condition;
  manualId: ManualType;
  isDebugMode?: boolean; // デバッグモード（制限時間なし）
  isPracticeMode?: boolean; // 練習モード
  onComplete: (sessionLog: EmailSessionLog) => void;
  onPracticeEnd?: () => void; // 練習終了時のコールバック
}

// const TASK_DURATION_MS = 25 * 60 * 1000; // 25分
const TASK_DURATION_MS = 5 * 1000;

export const EmailTask: React.FC<EmailTaskProps> = ({
  manual,
  scenarios,
  participantId,
  condition,
  manualId,
  isDebugMode = false,
  isPracticeMode = false,
  onComplete,
  onPracticeEnd,
}) => {
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [keyLogs, setKeyLogs] = useState<EmailKeyLog[]>([]);
  const [scenarioLogs, setScenarioLogs] = useState<EmailScenarioLog[]>([]);
  const [scenarioStartTime, setScenarioStartTime] = useState<number>(Date.now());
  const [taskStartTime] = useState<number>(Date.now());
  const [remainingTime, setRemainingTime] = useState<number>(TASK_DURATION_MS);
  const [consecutiveEmptySends, setConsecutiveEmptySends] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scenarioLogsRef = useRef<EmailScenarioLog[]>([]);
  const keyLogsRef = useRef<EmailKeyLog[]>([]);

  const currentScenario = scenarios[currentScenarioIndex];

  // keyLogsの更新を同期
  useEffect(() => {
    keyLogsRef.current = keyLogs;
  }, [keyLogs]);

  // scenarioLogsの更新を同期
  useEffect(() => {
    scenarioLogsRef.current = scenarioLogs;
  }, [scenarioLogs]);

  // 30分タイマー（デバッグモードでは無効）
  useEffect(() => {
    if (isDebugMode) {
      return; // デバッグモードの場合はタイマーを設定しない
    }

    const timer = setInterval(() => {
      const elapsed = Date.now() - taskStartTime;
      const remaining = TASK_DURATION_MS - elapsed;

      if (remaining <= 0) {
        // 時間切れ
        completeTask('time_up');
      } else {
        setRemainingTime(remaining);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [taskStartTime, isDebugMode]);

  // タスク完了処理
  const completeTask = (endReason: 'time_up' | 'empty_send_3times') => {
    console.log('EmailTask.completeTask called with endReason:', endReason);
    console.log('EmailTask.completeTask - scenarioLogs.length:', scenarioLogsRef.current.length);
    console.log('EmailTask.completeTask - scenarioLogs:', scenarioLogsRef.current);
    
    const currentTime = Date.now();
    const relativeTaskEndTime = currentTime - taskStartTime; // タスク開始からの経過時間
    
    const sessionLog: EmailSessionLog = {
      participant_id: participantId,
      condition,
      manual_id: manualId,
      task_start_time: 0, // 相対時間: タスク開始は 0ms
      task_end_time: relativeTaskEndTime, // 相対時間: 経過時間
      end_reason: endReason,
      scenarios_completed: scenarioLogsRef.current.length,
      scenario_logs: scenarioLogsRef.current,
    };
    
    console.log('EmailTask.completeTask - sessionLog being passed:', sessionLog);
    onComplete(sessionLog);
  };

  // キー入力ハンドラ
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const currentTime = Date.now();
    const relativeTime = currentTime - taskStartTime; // タスク開始からの経過時間
    const isBackspace = e.key === 'Backspace';
    const isDelete = e.key === 'Delete';
    const isPaste = e.ctrlKey && e.key === 'v';

    const keyLog: EmailKeyLog = {
      key: e.key,
      timestamp_ms: relativeTime,
      is_backspace: isBackspace,
      is_delete: isDelete,
      is_paste: isPaste,
    };

    setKeyLogs(prev => [...prev, keyLog]);
  };

  // テキスト変更ハンドラ
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyText(e.target.value);
  };

  // 送信ボタンのハンドラ
  const handleSend = () => {
    const currentTime = Date.now();
    const sendTimeRelative = currentTime - taskStartTime; // タスク開始からの相対時間
    const scenarioStartTimeRelative = scenarioStartTime - taskStartTime; // シナリオ開始時刻の相対時間
    const durationMs = sendTimeRelative - scenarioStartTimeRelative; // 期間を相対時間で計算
    
    const isEmpty = replyText.trim().length === 0;

    // 空送信のカウント
    if (isEmpty) {
      const newCount = consecutiveEmptySends + 1;
      setConsecutiveEmptySends(newCount);

      if (newCount >= 3) {
        // 3回連続で空送信 → タスク終了
        completeTask('empty_send_3times');
        return;
      }
    } else {
      setConsecutiveEmptySends(0);
    }

    // シナリオログを記録
    const scenarioLog: EmailScenarioLog = {
      participant_id: participantId,
      condition,
      manual_id: manualId,
      scenario_id: currentScenario.id,
      scenario_order_index: currentScenarioIndex,
      reply_start_time: scenarioStartTimeRelative,
      reply_send_time: sendTimeRelative,
      reply_duration_ms: durationMs,
      reply_body_text: replyText,
      reply_body_length_chars: replyText.length,
      is_empty_body: isEmpty,
      keypress_count_total: keyLogs.length,
      backspace_count: keyLogs.filter(log => log.is_backspace).length,
      delete_count: keyLogs.filter(log => log.is_delete).length,
      paste_count: keyLogs.filter(log => log.is_paste).length,
      key_logs: keyLogs,
    };

    console.log('EmailTask.handleSend - before setScenarioLogs:', { scenarioLog, currentCount: scenarioLogs.length });
    setScenarioLogs(prev => {
      console.log('EmailTask.handleSend - setScenarioLogs callback, prev.length:', prev.length);
      return [...prev, scenarioLog];
    });

    // 次のシナリオへ
    if (currentScenarioIndex < scenarios.length - 1) {
      setCurrentScenarioIndex(prev => prev + 1);
      setReplyText('');
      setKeyLogs([]);
      setScenarioStartTime(Date.now());

      // テキストエリアにフォーカス
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } else {
      // 全シナリオ完了
      completeTask('time_up');
    }
  };

  // 残り時間を分:秒形式で表示
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 練習終了ハンドラ
  const handlePracticeEnd = () => {
    if (onPracticeEnd) {
      onPracticeEnd();
    }
  };

  // テキストエリアに初期フォーカス
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [currentScenarioIndex]);

  // 挨拶文
  const GREETING_HEADER = `○○株式会社 カスタマーサポートの△△でございます。いつもご利用いただきありがとうございます。

`;
  const GREETING_FOOTER = `

今後ともよろしくお願いいたします。`;

  return (
    <div style={containerStyle}>
      {/* ヘッダー（残り時間は非表示だが内部で管理） */}
      <div style={headerStyle}>
        <div style={titleStyle}>メール作成タスク</div>
        {/* デバッグ用に残り時間を表示しない */}
        {/* <div style={timerStyle}>{formatTime(remainingTime)}</div> */}
      </div>

      {/* メインコンテンツ */}
      <div style={mainContentStyle}>
        {/* 左ペイン: マニュアル */}
        <div style={leftPanelStyle}>
          <ManualViewer manual={manual} />
        </div>

        {/* 右ペイン: メール作成 */}
        <div style={rightPanelStyle}>
          {/* 上部: 顧客メール */}
          <div style={customerEmailContainerStyle}>
            <div style={panelHeaderStyle}>顧客からのメール</div>
            <div style={customerEmailContentStyle}>
              <pre style={customerEmailTextStyle}>{currentScenario.customerEmail}</pre>
            </div>
          </div>

          {/* 下部: 返信メール */}
          <div style={replyEmailContainerStyle}>
            <div style={panelHeaderStyle}>返信メール作成</div>
            <div style={replyFormStyle}>
              {/* To */}
              <div style={fieldRowStyle}>
                <label style={fieldLabelStyle}>To:</label>
                <input
                  type="text"
                  value="customer@example.com"
                  readOnly
                  style={fieldInputStyle}
                />
              </div>

              {/* Subject */}
              <div style={fieldRowStyle}>
                <label style={fieldLabelStyle}>Subject:</label>
                <input
                  type="text"
                  value="お問い合わせへのご回答"
                  readOnly
                  style={fieldInputStyle}
                />
              </div>

              {/* Body */}
              <div style={bodyContainerStyle}>
                <div style={bodyHeaderStyle}>
                  <div style={greetingTextStyle}>{GREETING_HEADER}</div>
                </div>
                <textarea
                  ref={textareaRef}
                  value={replyText}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  style={textareaStyle}
                  placeholder="回答内容を入力してください..."
                />
                <div style={bodyFooterStyle}>
                  <div style={greetingTextStyle}>{GREETING_FOOTER}</div>
                </div>
              </div>

              {/* 送信ボタン */}
              <div style={buttonContainerStyle}>
                {!isPracticeMode && (
                  <button onClick={handleSend} style={sendButtonStyle}>
                    送信する
                  </button>
                )}

                {/* 練習モードの場合は「本番のメールを送信する」ボタンを表示 */}
                {isPracticeMode && (
                  <button onClick={handlePracticeEnd} style={practiceEndButtonStyle}>
                    送信する
                  </button>
                )}
              </div>
            </div>
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

const timerStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#d32f2f',
  fontFamily: 'monospace',
};

const mainContentStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
};

const leftPanelStyle: React.CSSProperties = {
  flex: '0 0 50%',
  borderRight: '2px solid #ddd',
  overflow: 'hidden',
};

const rightPanelStyle: React.CSSProperties = {
  flex: '0 0 50%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const customerEmailContainerStyle: React.CSSProperties = {
  flex: '0 0 35%',
  display: 'flex',
  flexDirection: 'column',
  borderBottom: '2px solid #ddd',
  backgroundColor: 'white',
  minHeight: 0, // flex内でのスクロールを有効化
  overflow: 'hidden', // 子要素のオーバーフローを制御
};

const replyEmailContainerStyle: React.CSSProperties = {
  flex: '0 0 65%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: 'white',
  minHeight: 0, // flex内でのスクロールを有効化
  overflow: 'hidden', // 子要素のオーバーフローを制御
};

const panelHeaderStyle: React.CSSProperties = {
  padding: '12px 20px',
  fontSize: '14px',
  fontWeight: 'bold',
  backgroundColor: '#e3f2fd',
  borderBottom: '2px solid #1976d2',
};

const customerEmailContentStyle: React.CSSProperties = {
  flex: 1,
  padding: '20px',
  overflowY: 'auto',
};

const customerEmailTextStyle: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.8',
  color: '#333',
  whiteSpace: 'pre-wrap',
  fontFamily: "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif",
  margin: 0,
};

const replyFormStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: '20px',
  overflowY: 'auto',
  minHeight: 0, // flexコンテナ内でのスクロールを有効にする
};

const fieldRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '10px',
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 'bold',
  width: '80px',
  color: '#555',
};

const fieldInputStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  fontSize: '14px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  backgroundColor: '#f9f9f9',
  color: '#666',
};

const bodyContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1, // 利用可能なスペースを使用
  marginBottom: '15px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  backgroundColor: '#fafafa',
  minHeight: 0, // flex内でのスクロールを有効化
  overflow: 'hidden', // 子要素のオーバーフローを制御
};

const bodyHeaderStyle: React.CSSProperties = {
  padding: '12px',
  borderBottom: '1px solid #ddd',
  backgroundColor: '#f0f0f0',
};

const bodyFooterStyle: React.CSSProperties = {
  padding: '12px',
  borderTop: '1px solid #ddd',
  backgroundColor: '#f0f0f0',
};

const greetingTextStyle: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#666',
  whiteSpace: 'pre-wrap',
  fontFamily: "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif",
};

const textareaStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px',
  fontSize: '14px',
  lineHeight: '1.8',
  fontFamily: "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif",
  border: 'none',
  resize: 'none',
  outline: 'none',
  minHeight: '100px', // 最小高さを小さくして柔軟性を向上
  overflow: 'auto', // スクロール可能にする
};

const buttonContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  gap: '12px',
  flexShrink: 0, // ボタンが縮小されないようにする
  marginTop: '10px', // 上部に余白を追加
};

const sendButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: '#1976d2',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};

const practiceEndButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  fontSize: '16px',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: '#4caf50',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};
