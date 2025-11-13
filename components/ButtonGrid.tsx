import React from 'react';
import { buttonGridStyle, numberButtonStyle } from '../styles';

export const ButtonGrid: React.FC = () => {
  return (
    <div style={buttonGridStyle}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <button
          key={num}
          onClick={() => alert(`ボタン ${num} がクリックされました！`)}
          style={numberButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {num}
        </button>
      ))}
    </div>
  );
};
