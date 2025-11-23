import type { Rotation } from '../types';

// 顔の回転と並行移動を含む結果
export interface FaceAnglesResult {
  rotation: Rotation;
  translation: {
    tx: number;  // 左右位置（正規化、右が正）
    ty: number;  // 上下位置（正規化、下が正）
    tz: number;  // 前後位置（顔サイズで推定、大きい=近い）
  };
}

export const calculateFaceAngles = (keypoints: any[]): Rotation => {
  const result = calculateFaceAnglesWithTranslation(keypoints);
  return result.rotation;
};

export const calculateFaceAnglesWithTranslation = (keypoints: any[]): FaceAnglesResult => {
  // 主要な特徴点のインデックス
  const noseTip = keypoints[1];        // 鼻先
  const leftEye = keypoints[33];       // 左目
  const rightEye = keypoints[263];     // 右目
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

  // 並行移動の計算
  // Tx: 顔の中心（鼻先）のx位置
  // MediaPipeの座標は0-1に正規化されているため、0.5を中心として計算
  const tx = (noseTip.x - 0.5) * 100; // 中心からのずれをパーセンテージで表現

  // Ty: 顔の中心（鼻先）のy位置
  const ty = (noseTip.y - 0.5) * 100; // 中心からのずれをパーセンテージで表現

  // Tz: 顔のサイズ（額からあごまでの距離）で前後を推定
  // 基準サイズを0.3（画面の30%）として、それより大きければ近い、小さければ遠い
  const baseFaceHeight = 0.3;
  const tz = (faceHeight - baseFaceHeight) * 100; // 基準からの差をパーセンテージで表現

  return {
    rotation: {
      rotateY: yawAngle,      // 左右の向き
      rotateX: -pitchAngle,   // 上下の向き（マイナスで反転）
      rotateZ: -rollAngle     // 傾き（マイナスで反転）
    },
    translation: {
      tx,  // 右方向が正
      ty,  // 下方向が正
      tz   // 前方向（近づく）が正
    }
  };
};
