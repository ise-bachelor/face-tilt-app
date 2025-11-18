import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { getMinutesData, MissingSentence } from '../data/minutesData';
import { MinutesInputLog, MinutesTypoLog, ExperimentCondition } from '../types';

interface MinutesEditingTaskProps {
  condition?: ExperimentCondition;
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

export const MinutesEditingTask: React.FC<MinutesEditingTaskProps> = ({ condition, onComplete }) => {
  // 条件に応じたデータを取得
  const minutesData = getMinutesData(condition);
  // タスク状態
  const [isPractice, setIsPractice] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0); // 0: 練習, 1-8: 本番
  const [randomOrder] = useState<number[]>(() => generateRandomOrder());
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [highlightPressedTime, setHighlightPressedTime] = useState<number>(0);

  // 入力状態
  const [missingInputs, setMissingInputs] = useState<Record<string, string>>({});
  const [fixedTypos, setFixedTypos] = useState<Set<string>>(new Set());
  const [typingStartTime, setTypingStartTime] = useState<number>(0);

  // モーダル状態
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorExpected, setErrorExpected] = useState<string>('');
  const [errorInput, setErrorInput] = useState<string>('');
  const [modalOpenTime, setModalOpenTime] = useState<number>(0);
  const [modalTotalTime, setModalTotalTime] = useState<number>(0);

  // ログ
  const [inputLogs, setInputLogs] = useState<MinutesInputLog[]>([]);
  const [typoLogs, setTypoLogs] = useState<MinutesTypoLog[]>([]);
  const [currentFixCount, setCurrentFixCount] = useState(0);
  const [completedSentenceIds, setCompletedSentenceIds] = useState<Set<string>>(new Set());

  // 左画面のハイライト位置への参照
  const highlightRef = useRef<HTMLSpanElement>(null);

  // カーソル位置を保存するためのref
  const editableSpanRef = useRef<HTMLSpanElement>(null);
  const cursorPositionRef = useRef<number | null>(null);

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

  // ハイライト時に自動スクロール
  useEffect(() => {
    if (isHighlighted && highlightRef.current) {
      highlightRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [isHighlighted, currentMissing]);

  // カーソル位置を復元
  useLayoutEffect(() => {
    if (cursorPositionRef.current !== null && editableSpanRef.current) {
      const span = editableSpanRef.current;
      const selection = window.getSelection();
      if (selection && span.firstChild) {
        const range = document.createRange();
        const offset = Math.min(cursorPositionRef.current, span.textContent?.length || 0);
        range.setStart(span.firstChild, offset);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      cursorPositionRef.current = null;
    }
  }, [missingInputs]);

  // 「次の文をハイライト」ボタンハンドラ
  const handleNextHighlight = () => {
    if (!isHighlighted) {
      // ハイライト開始
      setIsHighlighted(true);
      setHighlightPressedTime(Date.now());
      setCompletedSentenceIds(new Set());
      console.log("探索時間計測開始");
    } else {
      // 入力チェック
      if (!currentMissing) return;

      const userInput = missingInputs[currentMissing.id] || '';
      const correctText = currentMissing.text;

      // デバッグ用ログ
      console.log('入力チェック:', {
        userInput: `"${userInput}"`,
        correctText: `"${correctText}"`,
        userInputTrim: `"${userInput.trim()}"`,
        correctTextTrim: `"${correctText.trim()}"`,
        isEqual: userInput.trim() === correctText.trim()
      });

      if (userInput.trim() !== correctText.trim()) {
        // 入力が不正確
        setCurrentFixCount(prev => prev + 1);
        setErrorMessage('入力内容が正しくありません。もう一度確認してください。');
        setErrorExpected(correctText);
        setErrorInput(userInput);
        setModalOpenTime(Date.now());
        return;
      }

      // 入力が正確
      const now = Date.now();
      console.log("入力正確、入力時間計測終了");

      // ログを記録（練習タスクの場合は記録しない）
      let newInputLogs = inputLogs;
      if (!isPractice) {
        const log: MinutesInputLog = {
          sentenceId: currentMissing.id,
          T_highlight_pressed: highlightPressedTime,
          T_typing_start: typingStartTime,
          T_typing_end: now,
          search_time: typingStartTime - highlightPressedTime,
          input_time: (now - typingStartTime) - modalTotalTime,
          modal_time: modalTotalTime,
          need_fix: currentFixCount > 0,
          fix_count: currentFixCount,
        };
        newInputLogs = [...inputLogs, log];
        console.log('入力ログ記録:', log);
        setInputLogs(newInputLogs);
      }

      // 完了した文を記録
      const newCompletedIds = new Set(completedSentenceIds);
      newCompletedIds.add(currentMissing.id);
      setCompletedSentenceIds(newCompletedIds);

      // 次の文へ進む
      setIsHighlighted(false);
      setCurrentFixCount(0);
      setTypingStartTime(0);
      setModalTotalTime(0);

      if (isPractice) {
        // 練習完了 → 本番へ
        setIsPractice(false);
        setCurrentIndex(1);
        setCompletedSentenceIds(new Set());
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

  // 入力変更ハンドラ
  const handleInputChange = (sentenceId: string, value: string) => {
    // カーソル位置を保存
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      cursorPositionRef.current = range.startOffset;
    }

    // 初回入力時にタイムスタンプを記録
    if (typingStartTime === 0 && value.length > 0) {
      setTypingStartTime(Date.now());
    }

    setMissingInputs(prev => ({
      ...prev,
      [sentenceId]: value,
    }));
    console.log(missingInputs);
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
                  // この文が欠落文かどうか確認
                  const missingEntry = minutesData.missingSentences.find(
                    m => m.sectionIndex === sectionIndex && m.sentenceIndex === sentenceIndex
                  );
                  
                  const isCurrentHighlight =
                    isHighlighted &&
                    currentMissing?.sectionIndex === sectionIndex &&
                    currentMissing?.sentenceIndex === sentenceIndex;
                  
                  const isCompleted = missingEntry && completedSentenceIds.has(missingEntry.id);

                  // 完了状態の方が優先度が高い
                  let backgroundColor = 'transparent';
                  let textColor = 'inherit';
                  let fontWeight = 'normal';
                  let padding = '0';
                  
                  if (isCompleted) {
                    backgroundColor = 'rgb(3, 175, 122)';
                    textColor = 'white';
                    fontWeight = 'bold';
                    padding = '2px 4px';
                  } else if (isCurrentHighlight) {
                    backgroundColor = 'rgb(255, 241, 0)';
                    fontWeight = 'bold';
                  }

                  return (
                    <span
                      key={sentence.id}
                      ref={isCurrentHighlight && !isCompleted ? highlightRef : null}
                      style={{
                        backgroundColor,
                        color: textColor,
                        fontWeight,
                        transition: 'background-color 0.3s',
                        padding,
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
                onBeforeInput={(e) => {
                  // contentEditableなspan以外の入力をブロック
                  const target = e.target as HTMLElement;
                  if (target.tagName !== 'SPAN' || !target.getAttribute('contenteditable')) {
                    e.preventDefault();
                  }
                }}
                onKeyDown={(e) => {
                  // contentEditableなspan以外のキー入力をブロック
                  const target = e.target as HTMLElement;
                  if (target.tagName !== 'SPAN' || !target.getAttribute('contenteditable')) {
                    e.preventDefault();
                  }
                }}
              >
                {section.sentences.map((sentence, sentenceIndex) => {
                  // この文が欠落しているか確認
                  const missingEntry = minutesData.missingSentences.find(
                    m => m.sectionIndex === sectionIndex && m.sentenceIndex === sentenceIndex
                  );

                  if (missingEntry) {
                    // 欠落文 - contentEditableな領域を表示
                    const isCurrentEditing = isHighlighted && currentMissing?.id === missingEntry.id;
                    const inputValue = missingInputs[missingEntry.id] || '';
                    const isCompleted = inputLogs.some(log => log.sentenceId === missingEntry.id);

                    return (
                      <span
                        key={sentence.id}
                        ref={isCurrentEditing ? editableSpanRef : null}
                        contentEditable={isCurrentEditing && !isCompleted}
                        suppressContentEditableWarning={true}
                        onCompositionEnd={(e) => {
                          const value = e.currentTarget.textContent || '';
                          handleInputChange(missingEntry.id, value);
                        }}
                        onKeyDown={(e) => {
                          if (!isCurrentEditing || isCompleted) {
                            e.preventDefault();
                          }
                        }}
                        style={{
                          outline: 'none',
                        }}
                      >
                        {inputValue}
                      </span>
                    );
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
                            cursor: isFixed ? 'default' : 'pointer',
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
          {isHighlighted ? '入力確認' : '次の文をハイライト'}
        </button>
      </div>

      {/* 左右分割パネル */}
      <div style={splitPanelContainerStyle}>
        {renderLeftPanel()}
        {renderRightPanel()}
      </div>

      {/* エラーモーダル */}
      {errorMessage && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h2 style={modalTitleStyle}>入力エラー</h2>
            <p style={modalMessageStyle}>{errorMessage}</p>
            <div style={modalComparisonStyle}>
              <div style={modalItemStyle}>
                <p style={modalItemLabelStyle}>期待される内容:</p>
                <p style={modalItemTextStyle}>{errorExpected}</p>
              </div>
              <div style={modalItemStyle}>
                <p style={modalItemLabelStyle}>入力された内容:</p>
                <p style={modalItemTextStyle}>{errorInput}</p>
              </div>
            </div>
            <button
              onClick={() => {
                // モーダル表示時間を計算して加算
                const modalCloseTime = Date.now();
                const elapsedModalTime = modalCloseTime - modalOpenTime;
                setModalTotalTime(prev => prev + elapsedModalTime);
                
                setErrorMessage('');
                setErrorExpected('');
                setErrorInput('');
                setModalOpenTime(0);
              }}
              style={modalButtonStyle}
            >
              確認
            </button>
          </div>
        </div>
      )}
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

// モーダルのスタイル
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '12px',
  padding: '30px',
  maxWidth: '500px',
  width: '90%',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
};

const modalTitleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#d32f2f',
  marginTop: 0,
  marginBottom: '15px',
};

const modalMessageStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#333',
  marginBottom: '20px',
};

const modalComparisonStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '15px',
  marginBottom: '25px',
  backgroundColor: '#f5f5f5',
  padding: '15px',
  borderRadius: '8px',
};

const modalItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

const modalItemLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 'bold',
  color: '#666',
  marginBottom: '5px',
};

const modalItemTextStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#333',
  padding: '10px',
  backgroundColor: 'white',
  borderRadius: '4px',
  border: '1px solid #ddd',
  margin: 0,
};

const modalButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  fontSize: '16px',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: '#1976d2',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};
