import type { Rotation } from '../types';

export const calculateFaceAngles = (keypoints: any[]): Rotation => {
  // 主要な特徴点のインデックス
  const noseTip = keypoints[1];        // 鼻先
  const leftEye = keypoints[33];       // 左目
  const rightEye = keypoints[263];     // 右目
  const leftMouth = keypoints[61];     // 口の左端
  const rightMouth = keypoints[291];   // 口の右端
  const chin = keypoints[152];         // あご
  const forehead = keypoints[10];      // 額

  // Yaw（左右の回転）- 顔が左右を向いているか
  const eyeCenterX = (leftEye.x + rightEye.x) / 2;
  const yawAngle = (noseTip.x - eyeCenterX) * 0.5; // -30度から+30度程度

  // Pitch（上下の回転）- 顔が上下を向いているか
  const eyeCenterY = (leftEye.y + rightEye.y) / 2;
  const faceHeight = Math.abs(forehead.y - chin.y);
  const pitchAngle = ((noseTip.y - eyeCenterY) / faceHeight) * 60; // -30度から+30度程度

  // Roll（傾き）- 顔が左右に傾いているか
  const eyeAngle = Math.atan2(
    rightEye.y - leftEye.y,
    rightEye.x - leftEye.x
  );
  const rollAngle = (eyeAngle * 180) / Math.PI; // ラジアンから度に変換

  return {
    rotateY: yawAngle,      // 左右の向き
    rotateX: -pitchAngle,   // 上下の向き（マイナスで反転）
    rotateZ: -rollAngle     // 傾き（マイナスで反転）
  };
};
