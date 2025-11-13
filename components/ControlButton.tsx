import React from 'react';
import { controlButtonBaseStyle } from '../styles';

type Props = {
  isStarted: boolean;
  isModelLoaded: boolean;
  onStart: () => void;
  onStop: () => void;
};

export const ControlButton: React.FC<Props> = ({
  isStarted,
  isModelLoaded,
  onStart,
  onStop,
}) => {
  if (!isStarted) {
    const disabled = !isModelLoaded;
    return (
      <button
        onClick={onStart}
        disabled={disabled}
        style={{
          ...controlButtonBaseStyle,
          background: disabled
            ? '#ccc'
            : 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: disabled
            ? 'none'
            : '0 8px 25px rgba(17, 153, 142, 0.4)',
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.transform = 'scale(1.02)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {isModelLoaded ? 'スタート 🚀' : 'モデルを読み込み中...'}
      </button>
    );
  }

  return (
    <button
      onClick={onStop}
      style={{
        ...controlButtonBaseStyle,
        background: 'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)',
        boxShadow: '0 8px 25px rgba(252, 74, 26, 0.4)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      ストップ ⏸️
    </button>
  );
};
