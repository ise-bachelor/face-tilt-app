import type { Rotation } from '../types';

export const appContainerStyle = {
  width: '100vw',
  height: '100vh',
  overflow: 'hidden',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'relative' as const,
};

export const loadingBoxStyle = {
  background: 'white',
  padding: '40px',
  borderRadius: '20px',
  fontSize: '20px',
  color: '#333',
};

export const getContainerStyle = (rotation: Rotation) => ({
  transform: `
    translateZ(-1000px)
    perspective(1000px)
    rotateX(${rotation.rotateX}deg)
    rotateY(${rotation.rotateY}deg)
    rotateZ(${rotation.rotateZ}deg)
  `,
  transformStyle: 'preserve-3d' as const,
  transition: 'transform 0.05s linear',
  width: '80%',
  maxWidth: '800px',
  background: 'white',
  borderRadius: '20px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  padding: '60px',
  position: 'relative' as const,
});

export const titleStyle = {
  fontSize: '48px',
  marginBottom: '30px',
  color: '#333',
  textAlign: 'center' as const,
};

export const rotationInfoBoxStyle = {
  marginBottom: '30px',
  padding: '20px',
  background: '#f0f0f0',
  borderRadius: '10px',
};

export const angleTextStyle = {
  margin: '10px 0',
  fontSize: '18px',
};

export const angleNoteStyle = {
  margin: '10px 0',
  fontSize: '14px',
  color: '#666',
  marginTop: '15px',
};

export const buttonGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '20px',
  marginTop: '40px',
};

export const numberButtonStyle = {
  padding: '30px',
  fontSize: '24px',
  fontWeight: 'bold' as const,
  border: 'none',
  borderRadius: '10px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  cursor: 'pointer',
  transition: 'transform 0.2s',
  boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
};

export const instructionBoxStyle = {
  position: 'absolute' as const,
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(255,255,255,0.9)',
  padding: '20px 40px',
  borderRadius: '10px',
  textAlign: 'center' as const,
  maxWidth: '600px',
};

export const controlButtonBaseStyle = {
  width: '100%',
  padding: '30px',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  border: 'none',
  borderRadius: '15px',
  color: 'white',
  cursor: 'pointer',
  transition: 'transform 0.2s, opacity 0.2s',
  marginBottom: '40px',
};
