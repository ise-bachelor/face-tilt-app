import type { AppProps } from 'next/app';
import { CameraProvider } from '../contexts/CameraContext';
import { ExperimentProvider } from '../contexts/ExperimentContext';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <CameraProvider>
      <ExperimentProvider>
        <Component {...pageProps} />
      </ExperimentProvider>
    </CameraProvider>
  );
}
