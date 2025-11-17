import React, { useState, useEffect, useRef } from 'react';
import { minutesData, MissingSentence } from '../data/minutesData';
import { MinutesInputLog, MinutesTypoLog } from '../types';

interface MinutesEditingTaskProps {
  onComplete: (inputLogs: MinutesInputLog[], typoLogs: MinutesTypoLog[]) => void;
}

// ランダムな順序を生成（練習を除く本番8文）
const generateRandomOrder = (): number[] => {
  const indices = [1, 2, 3, 4, 5, 6, 7, 8]; // 本番タスクの8文
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
};

export const MinutesEditingTask: React.FC<MinutesEditingTaskProps> = ({ onComplete }) => {
  // タスク状態
  const [isPractice, setIsPractice] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0); // 0: 練習, 1-8: 本番
  const [randomOrder] = useState<number[]>(() => generateRandomOrder());
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [highlightPressedTime, setHighlightPressedTime] = useState<number>(0);

  // 入力状態
  const [missingInputs, setMissingInputs] = useState<Record<string, string>>({});
  const [fixedTypos, setFixedTypos] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [typingStartTime, setTypingStartTime] = useState<number>(0);

  // ログ
  const [inputLogs, setInputLogs] = useState<MinutesInputLog[]>([]);
  const [typoLogs, setTypoLogs] = useState<MinutesTypoLog[]>([]);
  const [currentFixCount, setCurrentFixCount] = useState(0);

  // 現在の欠落文を取得
  const getCurrentMissingSentence = (): MissingSentence | null => {
    if (isPractice) {
      return minutesData.missingSentences[0]; // 練習タスク
    } else {
      if (currentIndex === 0 || currentIndex > 8) return null;
      const orderIndex = randomOrder[currentIndex - 1];
      return minutesData.missingSentences[orderIndex];
    }
  };

  const currentMissing = getCurrentMissingSentence();

  // 「次の文をハイライト」ボタンハンドラ
  const handleNextHighlight = () => {
    if (!isHighlighted) {
      // ハイライト開始
      setIsHighlighted(true);
      setHighlightPressedTime(Date.now());
    } else {
      // 入力チェック
      if (!currentMissing) return;

      const userInput = missingInputs[currentMissing.id] || '';
      const correctText = currentMissing.text;

      if (userInput.trim() !== correctText.trim()) {
        // 入力が不正確
        setCurrentFixCount(prev => prev + 1);
        alert('入力内容が正しくありません。もう一度確認してください。');
        return;
      }

      // 入力が正確
      const now = Date.now();

      // ログを記録（練習タスクの場合は記録しない）
      let newInputLogs = inputLogs;
      if (!isPractice) {
        const log: MinutesInputLog = {
          sentenceId: currentMissing.id,
          T_highlight_pressed: highlightPressedTime,
          T_typing_start: typingStartTime,
          T_typing_end: now,
          search_time: typingStartTime - highlightPressedTime,
          input_time: now - typingStartTime,
          need_fix: currentFixCount > 0,
          fix_count: currentFixCount,
        };
        newInputLogs = [...inputLogs, log];
        setInputLogs(newInputLogs);
      }

      // 次の文へ進む
      setIsHighlighted(false);
      setEditingId(null);
      setCurrentFixCount(0);
      setTypingStartTime(0);

      if (isPractice) {
        // 練習完了 → 本番へ
        setIsPractice(false);
        setCurrentIndex(1);
        alert('練習タスクが完了しました。本番タスクを開始します。');
      } else {
        if (currentIndex < 8) {
          setCurrentIndex(prev => prev + 1);
        } else {
          // 全タスク完了
          onComplete(newInputLogs, typoLogs);
        }
      }
    }
  };

  // 欠落箇所のクリックハンドラ
  const handleMissingClick = (sentenceId: string) => {
    if (!isHighlighted) return;
    if (currentMissing?.id !== sentenceId) return;

    setEditingId(sentenceId);
    if (typingStartTime === 0) {
      setTypingStartTime(Date.now());
    }
  };

  // 入力変更ハンドラ
  const handleInputChange = (sentenceId: string, value: string) => {
    setMissingInputs(prev => ({
      ...prev,
      [sentenceId]: value,
    }));
  };

  // 誤字クリックハンドラ
  const handleTypoClick = (typoId: string) => {
    if (fixedTypos.has(typoId)) return;

    setFixedTypos(prev => new Set(prev).add(typoId));

    const log: MinutesTypoLog = {
      timestamp: Date.now(),
      error_id: typoId,
      corrected: true,
    };

    setTypoLogs(prev => [...prev, log]);
  };

  // タブキーを無効化
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 議事録を左画面用にレンダリング（完全版、ハイライト付き）
  const renderLeftPanel = () => {
    return (
      <div style={panelStyle}>
        <h2 style={panelTitleStyle}>お手本（完全版）</h2>
        <div style={scrollableContentStyle}>
          {minutesData.sections.map((section, sectionIndex) => (
            <div key={sectionIndex} style={sectionStyle}>
              <h3 style={sectionTitleStyle}>{section.title}</h3>
              <p style={paragraphStyle}>
                {section.sentences.map((sentence, sentenceIndex) => {
                  const isCurrentHighlight =
                    isHighlighted &&
                    currentMissing?.sectionIndex === sectionIndex &&
                    currentMissing?.sentenceIndex === sentenceIndex;

                  return (
                    <span
                      key={sentence.id}
                      style={{
                        backgroundColor: isCurrentHighlight ? '#ffeb3b' : 'transparent',
                        fontWeight: isCurrentHighlight ? 'bold' : 'normal',
                        transition: 'background-color 0.3s',
                      }}
                    >
                      {sentence.text}
                    </span>
                  );
                })}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 議事録を右画面用にレンダリング（欠落・誤字入り）
  const renderRightPanel = () => {
    return (
      <div style={panelStyle}>
        <h2 style={panelTitleStyle}>編集用議事録</h2>
        <div style={scrollableContentStyle}>
          {minutesData.sections.map((section, sectionIndex) => (
            <div key={sectionIndex} style={sectionStyle}>
              <h3 style={sectionTitleStyle}>{section.title}</h3>
              <p
                style={paragraphStyle}
                contentEditable={true}
                suppressContentEditableWarning={true}
                onBeforeInput={(e) => {
                  // 欠落箇所以外の編集をブロック
                  const selection = window.getSelection();
                  if (!selection || selection.rangeCount === 0) {
                    e.preventDefault();
                    return;
                  }

                  // 現在のカーソル位置が編集可能な欠落箇所かチェック
                  const range = selection.getRangeAt(0);
                  const container = range.startContainer;

                  // 欠落箇所のinput要素内かチェック
                  let element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as HTMLElement;
                  while (element && element.tagName !== 'P') {
                    if (element.tagName === 'INPUT') {
                      return; // input内なので編集を許可
                    }
                    element = element.parentElement as HTMLElement;
                  }

                  // 欠落箇所以外なので編集をブロック
                  e.preventDefault();
                }}
              >
                {section.sentences.map((sentence, sentenceIndex) => {
                  // この文が欠落しているか確認
                  const missingEntry = minutesData.missingSentences.find(
                    m => m.sectionIndex === sectionIndex && m.sentenceIndex === sentenceIndex
                  );

                  if (missingEntry) {
                    // 欠落文 - 入力欄を表示（インラインで）
                    const isEditing = editingId === missingEntry.id;
                    const inputValue = missingInputs[missingEntry.id] || '';
                    const isCompleted = inputLogs.some(log => log.sentenceId === missingEntry.id);

                    if (isEditing && !isCompleted) {
                      return (
                        <input
                          key={sentence.id}
                          type="text"
                          value={inputValue}
                          onChange={(e) => handleInputChange(missingEntry.id, e.target.value)}
                          style={inlineInputStyle}
                          placeholder=""
                          autoFocus
                        />
                      );
                    } else if (isCompleted) {
                      return (
                        <span
                          key={sentence.id}
                          style={{
                            backgroundColor: '#c8e6c9',
                            padding: '2px',
                            borderRadius: '2px',
                          }}
                        >
                          {inputValue}
                        </span>
                      );
                    } else {
                      // 未入力・未クリック状態：空白なし
                      return (
                        <span
                          key={sentence.id}
                          onClick={() => handleMissingClick(missingEntry.id)}
                          style={missingSpanStyle}
                        >
                        </span>
                      );
                    }
                  }

                  // 通常の文 - 誤字があるか確認
                  const typo = minutesData.typos.find(
                    t => t.sectionIndex === sectionIndex && t.sentenceIndex === sentenceIndex
                  );

                  if (typo) {
                    const isFixed = fixedTypos.has(typo.id);
                    const textToShow = isFixed ? typo.correct : typo.typo;

                    // 誤字を含む文を分割して表示
                    const parts = sentence.text.split(typo.correct);

                    return (
                      <span key={sentence.id}>
                        {parts[0]}
                        <span
                          onClick={() => handleTypoClick(typo.id)}
                          style={{
                            backgroundColor: isFixed ? '#c8e6c9' : 'transparent',
                            cursor: isFixed ? 'default' : 'pointer',
                            padding: '2px',
                            borderRadius: '2px',
                            transition: 'background-color 0.3s',
                          }}
                        >
                          {textToShow}
                        </span>
                        {parts[1]}
                      </span>
                    );
                  }

                  return <span key={sentence.id}>{sentence.text}</span>;
                })}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      {/* 上部：進捗とコントロール */}
      <div style={headerStyle}>
        <div style={progressStyle}>
          {isPractice ? (
            <span>練習タスク中</span>
          ) : (
            <span>本番タスク: {currentIndex} / 8</span>
          )}
        </div>
        <button onClick={handleNextHighlight} style={buttonStyle}>
          {isHighlighted ? '入力確認・次の文へ' : '次の文をハイライト'}
        </button>
      </div>

      {/* 左右分割パネル */}
      <div style={splitPanelContainerStyle}>
        {renderLeftPanel()}
        {renderRightPanel()}
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

const progressStyle: React.CSSProperties = {
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

const splitPanelContainerStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  gap: '0',
  overflow: 'hidden',
};

const panelStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: 'white',
  borderRight: '1px solid #ddd',
  overflow: 'hidden',
};

const panelTitleStyle: React.CSSProperties = {
  padding: '15px 20px',
  margin: 0,
  fontSize: '20px',
  fontWeight: 'bold',
  backgroundColor: '#e3f2fd',
  borderBottom: '2px solid #1976d2',
};

const scrollableContentStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '40px 60px',
  backgroundColor: '#f9f9f9',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '30px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1976d2',
  marginBottom: '15px',
  borderBottom: '2px solid #1976d2',
  paddingBottom: '5px',
};

// Google Docs風の段落スタイル
const paragraphStyle: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '1.8',
  color: '#202124',
  margin: '0 0 16px 0',
  fontFamily: "'Arial', 'Helvetica', sans-serif",
  textAlign: 'justify',
};

// 欠落箇所のインライン入力スタイル
const inlineInputStyle: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '1.8',
  border: 'none',
  borderBottom: '1px solid #1976d2',
  outline: 'none',
  fontFamily: "'Arial', 'Helvetica', sans-serif",
  backgroundColor: 'transparent',
  padding: '0 2px',
  minWidth: '200px',
};

// 欠落箇所のスパンスタイル（目立たない）
const missingSpanStyle: React.CSSProperties = {
  cursor: 'text',
  display: 'inline',
  borderBottom: '1px solid transparent',
};
