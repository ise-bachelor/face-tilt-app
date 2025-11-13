import React from 'react';
import type { Rotation } from '../types';
import {
  rotationInfoBoxStyle,
  angleTextStyle,
  angleNoteStyle,
} from '../styles';

type Props = {
  rotation: Rotation;
  isStarted: boolean;
};

export const RotationInfo: React.FC<Props> = ({ rotation, isStarted }) => {
  return (
    <div style={rotationInfoBoxStyle}>
      <p style={angleTextStyle}>
        <strong>Yaw (左右):</strong> {rotation.rotateY.toFixed(1)}°
      </p>
      <p style={angleTextStyle}>
        <strong>Pitch (上下):</strong> {rotation.rotateX.toFixed(1)}°
      </p>
      <p style={angleTextStyle}>
        <strong>Roll (傾き):</strong> {rotation.rotateZ.toFixed(1)}°
      </p>
      {!isStarted && (
        <p style={angleNoteStyle}>
          スタートボタンを押すと、現在の姿勢を基準に画面が傾きます
        </p>
      )}
    </div>
  );
};
