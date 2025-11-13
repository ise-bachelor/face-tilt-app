import React from 'react';
import { instructionBoxStyle } from '../styles';

export const InstructionBox: React.FC = () => {
  return (
    <div style={instructionBoxStyle}>
      <p style={{ margin: '5px 0', fontSize: '16px' }}>
        📹 カメラを許可して、スタートボタンを押してください
      </p>
      <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
        スタート時の姿勢を基準に、顔の動きの2倍画面が傾きます
      </p>
    </div>
  );
};
