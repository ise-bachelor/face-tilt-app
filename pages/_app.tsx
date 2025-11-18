import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { CameraProvider } from '../contexts/CameraContext';
import { ExperimentProvider } from '../contexts/ExperimentContext';

export default function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // グローバルスタイルを適用して、余白を0にする
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
  }, []);

  return (
    <CameraProvider>
      <ExperimentProvider>
        <Component {...pageProps} />
      </ExperimentProvider>
    </CameraProvider>
  );
}
