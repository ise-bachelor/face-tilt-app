import React from 'react';
import type { NextPage } from 'next';

import { useCamera } from '../hooks/useCamera';
import { useFaceDetector } from '../hooks/useFaceDetector';
import { useFaceTracking } from '../hooks/useFaceTracking';

import { ButtonGrid } from '../components/ButtonGrid';
import { ControlButton } from '../components/ControlButton';
import { InstructionBox } from '../components/InstructionBox';
import { RotationInfo } from '../components/RotationInfo';

import { appContainerStyle, loadingBoxStyle, getContainerStyle, titleStyle } from '../styles';

const Home: NextPage = () => {
  const { videoRef, isBrowser } = useCamera();
  const { detector, isModelLoaded } = useFaceDetector(isBrowser);
  const { rotation, isStarted, handleStart, handleStop } = useFaceTracking({
    videoRef,
    detector,
    isModelLoaded,
  });

  const containerStyle = getContainerStyle(rotation);

  return (
    <div style={appContainerStyle}>
      {!isBrowser ? (
        <div style={loadingBoxStyle}>読み込み中...</div>
      ) : (
        <>
          {/* 非表示のビデオ要素 */}
          <video
            ref={videoRef}
            style={{ display: 'none' }}
            width={640}
            height={480}
          />

          {/* 3D変換されるコンテナ */}
          <div style={containerStyle}>
            <h1 style={titleStyle}>顔の動きで画面が傾く</h1>

            <RotationInfo rotation={rotation} isStarted={isStarted} />

            <ControlButton
              isStarted={isStarted}
              isModelLoaded={isModelLoaded}
              onStart={handleStart}
              onStop={handleStop}
            />

            <ButtonGrid />
          </div>

          <InstructionBox />
        </>
      )}
    </div>
  );
};

export default Home;
