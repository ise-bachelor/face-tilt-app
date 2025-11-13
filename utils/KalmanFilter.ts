export class KalmanFilter {
  private x: number; // 推定値
  private P: number; // 推定誤差の共分散
  private Q: number; // プロセスノイズの共分散
  private R: number; // 観測ノイズの共分散

  constructor(
    processNoise: number = 0.01,
    measurementNoise: number = 0.1,
    initialValue: number = 0
  ) {
    this.x = initialValue; // 初期推定値
    this.P = 1; // 初期推定誤差
    this.Q = processNoise; // プロセスノイズ（システムの不確実性）
    this.R = measurementNoise; // 観測ノイズ（測定の不確実性）
  }

  // カルマンフィルタの更新
  update(measurement: number): number {
    // 予測ステップ
    const x_pred = this.x; // 状態予測（前回の推定値をそのまま使用）
    const P_pred = this.P + this.Q; // 誤差共分散の予測

    // 更新ステップ
    const K = P_pred / (P_pred + this.R); // カルマンゲインの計算
    this.x = x_pred + K * (measurement - x_pred); // 状態推定値の更新
    this.P = (1 - K) * P_pred; // 誤差共分散の更新

    return this.x;
  }

  // フィルタをリセット
  reset(value: number = 0) {
    this.x = value;
    this.P = 1;
  }

  // 現在の推定値を取得
  getValue(): number {
    return this.x;
  }
}
