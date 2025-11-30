import React, { useState } from 'react';
import { Manual } from '../data/emailData';

interface ManualViewerProps {
  manual: Manual;
}

export const ManualViewer: React.FC<ManualViewerProps> = ({ manual }) => {
  const [activeTabId, setActiveTabId] = useState(manual.categories[0].id);

  const activeCategory = manual.categories.find(cat => cat.id === activeTabId);

  return (
    <div style={containerStyle}>
      {/* タブヘッダー */}
      <div style={tabHeaderContainerStyle}>
        {manual.categories.map(category => (
          <button
            key={category.id}
            onClick={() => setActiveTabId(category.id)}
            style={
              activeTabId === category.id
                ? { ...tabButtonStyle, ...activeTabButtonStyle }
                : tabButtonStyle
            }
          >
            {category.title}
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      <div style={tabContentContainerStyle}>
        {activeCategory && (
          <div style={contentStyle}>
            <h3 style={categoryTitleStyle}>{activeCategory.title}</h3>
            <pre style={categoryContentStyle}>{activeCategory.content}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

// スタイル定義
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  backgroundColor: 'white',
};

const tabHeaderContainerStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '2px solid #ddd',
  backgroundColor: '#f5f5f5',
  overflowX: 'auto',
};

const tabButtonStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '14px',
  fontWeight: 'bold',
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  color: '#666',
  borderBottom: '3px solid transparent',
  transition: 'all 0.2s',
};

const activeTabButtonStyle: React.CSSProperties = {
  color: '#1976d2',
  borderBottom: '3px solid #1976d2',
  backgroundColor: 'white',
};

const tabContentContainerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '20px',
};

const contentStyle: React.CSSProperties = {
  maxWidth: '800px',
};

const categoryTitleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 'bold',
  marginBottom: '15px',
  color: '#333',
};

const categoryContentStyle: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.8',
  color: '#444',
  whiteSpace: 'pre-wrap',
  fontFamily: "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif",
  margin: 0,
};
