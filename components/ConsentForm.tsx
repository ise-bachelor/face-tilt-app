import React, { useState } from 'react';
import { ParticipantInfo, VideoConsentType } from '../types';

interface ConsentFormProps {
  onSubmit: (participantInfo: ParticipantInfo) => void;
}

export const ConsentForm: React.FC<ConsentFormProps> = ({ onSubmit }) => {
  const [participantId, setParticipantId] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say'>('prefer_not_to_say');
  const [mainConsent, setMainConsent] = useState<'approved' | 'conditional' | 'not_approved' | ''>('');
  const [subConsent, setSubConsent] = useState<'identifiable' | 'anonymized' | ''>('');
  const [conditions, setConditions] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション
    if (!participantId.trim()) {
      alert('参加者IDを入力してください');
      return;
    }

    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
      alert('有効な年齢を入力してください');
      return;
    }

    if (!mainConsent) {
      alert('ビデオ画像公開についての同意を選択してください');
      return;
    }

    if (mainConsent === 'approved' && !subConsent) {
      alert('公開形式を選択してください');
      return;
    }

    if (mainConsent === 'conditional' && !conditions.trim()) {
      alert('条件を記述してください');
      return;
    }

    // VideoConsentTypeを決定
    let consentType: VideoConsentType;
    if (mainConsent === 'approved') {
      consentType = subConsent === 'identifiable' ? 'approved_identifiable' : 'approved_anonymized';
    } else if (mainConsent === 'conditional') {
      consentType = 'approved_with_conditions';
    } else {
      consentType = 'not_approved';
    }

    const participantInfo: ParticipantInfo = {
      participantId: participantId.trim(),
      age: ageNum,
      gender,
      videoConsent: {
        consentType,
        conditions: mainConsent === 'conditional' ? conditions.trim() : undefined,
      },
    };

    onSubmit(participantInfo);
  };

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>実験参加同意フォーム</h1>

      <form onSubmit={handleSubmit} style={formStyle}>
        {/* 参加者ID */}
        <div style={formGroupStyle}>
          <label style={labelStyle}>参加者ID *</label>
          <input
            type="text"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            placeholder="例: P001"
            style={inputStyle}
            required
          />
        </div>

        {/* 年齢 */}
        <div style={formGroupStyle}>
          <label style={labelStyle}>年齢 *</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="例: 25"
            style={inputStyle}
            min="0"
            max="150"
            required
          />
        </div>

        {/* 性別 */}
        <div style={formGroupStyle}>
          <label style={labelStyle}>性別 *</label>
          <div style={radioGroupStyle}>
            <label style={radioLabelStyle}>
              <input
                type="radio"
                value="male"
                checked={gender === 'male'}
                onChange={(e) => setGender(e.target.value as any)}
              />
              <span style={radioTextStyle}>男性</span>
            </label>
            <label style={radioLabelStyle}>
              <input
                type="radio"
                value="female"
                checked={gender === 'female'}
                onChange={(e) => setGender(e.target.value as any)}
              />
              <span style={radioTextStyle}>女性</span>
            </label>
            <label style={radioLabelStyle}>
              <input
                type="radio"
                value="other"
                checked={gender === 'other'}
                onChange={(e) => setGender(e.target.value as any)}
              />
              <span style={radioTextStyle}>その他</span>
            </label>
            <label style={radioLabelStyle}>
              <input
                type="radio"
                value="prefer_not_to_say"
                checked={gender === 'prefer_not_to_say'}
                onChange={(e) => setGender(e.target.value as any)}
              />
              <span style={radioTextStyle}>回答しない</span>
            </label>
          </div>
        </div>

        {/* ビデオ画像公開についての同意 */}
        <div style={formGroupStyle}>
          <label style={labelStyle}>ビデオ画像公開についての同意 *</label>
          <div style={consentBoxStyle}>
            <p style={consentTextStyle}>
              私は、「研究課題:ユーザの姿勢に連動したブラウザ画面の傾き変更を用いた座位姿勢改善手法」における
              ビデオ画像が公開されることについて
            </p>
            <p style={consentSubTextStyle}>
              (該当する選択肢の□にチェックを付けてください)
            </p>

            {/* 承諾します */}
            <div style={consentOptionStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={mainConsent === 'approved'}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setMainConsent('approved');
                      setConditions('');
                    } else {
                      setMainConsent('');
                      setSubConsent('');
                    }
                  }}
                />
                <span style={checkboxTextStyle}>承諾します。(どちらかにチェックを付けてください。)</span>
              </label>

              {mainConsent === 'approved' && (
                <div style={subConsentGroupStyle}>
                  <label style={subCheckboxLabelStyle}>
                    <input
                      type="checkbox"
                      checked={subConsent === 'identifiable'}
                      onChange={(e) => setSubConsent(e.target.checked ? 'identifiable' : '')}
                    />
                    <span style={subCheckboxTextStyle}>
                      顔が特定される形式のままで、画像が論文発表、Web への掲載、テレビ放映などで公開されることに異存ありません。
                    </span>
                  </label>
                  <label style={subCheckboxLabelStyle}>
                    <input
                      type="checkbox"
                      checked={subConsent === 'anonymized'}
                      onChange={(e) => setSubConsent(e.target.checked ? 'anonymized' : '')}
                    />
                    <span style={subCheckboxTextStyle}>
                      モザイク処理等をして個人が特定されない形式にした上で、画像が論文発表、Web への掲載、テレビ放映などで公開されることに異存ありません。
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* 条件付きで承諾します */}
            <div style={consentOptionStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={mainConsent === 'conditional'}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setMainConsent('conditional');
                      setSubConsent('');
                    } else {
                      setMainConsent('');
                      setConditions('');
                    }
                  }}
                />
                <span style={checkboxTextStyle}>以下の条件付きで公開を承諾します。</span>
              </label>

              {mainConsent === 'conditional' && (
                <div style={conditionsInputGroupStyle}>
                  <label style={conditionsLabelStyle}>条件:(具体的に記述してください。)</label>
                  <textarea
                    value={conditions}
                    onChange={(e) => setConditions(e.target.value)}
                    style={textareaStyle}
                    rows={3}
                    placeholder="条件を具体的に記述してください"
                  />
                </div>
              )}
            </div>

            {/* 承諾しません */}
            <div style={consentOptionStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={mainConsent === 'not_approved'}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setMainConsent('not_approved');
                      setSubConsent('');
                      setConditions('');
                    } else {
                      setMainConsent('');
                    }
                  }}
                />
                <span style={checkboxTextStyle}>承諾しません。</span>
              </label>
            </div>
          </div>
        </div>

        {/* 送信ボタン */}
        <button type="submit" style={submitButtonStyle}>
          次へ
        </button>
      </form>
    </div>
  );
};

// スタイル定義
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  backgroundColor: '#f5f5f5',
  padding: '20px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 'bold',
  marginBottom: '30px',
  color: '#333',
};

const formStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: '40px',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  maxWidth: '800px',
  width: '100%',
};

const formGroupStyle: React.CSSProperties = {
  marginBottom: '25px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '16px',
  fontWeight: 'bold',
  marginBottom: '10px',
  color: '#333',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  fontSize: '16px',
  border: '2px solid #ddd',
  borderRadius: '6px',
  outline: 'none',
  boxSizing: 'border-box',
};

const radioGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const radioLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
};

const radioTextStyle: React.CSSProperties = {
  marginLeft: '8px',
  fontSize: '16px',
  color: '#555',
};

const consentBoxStyle: React.CSSProperties = {
  backgroundColor: '#f9f9f9',
  padding: '20px',
  borderRadius: '8px',
  border: '2px solid #ddd',
};

const consentTextStyle: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#333',
  marginBottom: '10px',
};

const consentSubTextStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#666',
  marginBottom: '15px',
};

const consentOptionStyle: React.CSSProperties = {
  marginBottom: '15px',
};

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  cursor: 'pointer',
  marginBottom: '8px',
};

const checkboxTextStyle: React.CSSProperties = {
  marginLeft: '8px',
  fontSize: '15px',
  color: '#333',
  fontWeight: '500',
};

const subConsentGroupStyle: React.CSSProperties = {
  marginLeft: '30px',
  marginTop: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const subCheckboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  cursor: 'pointer',
};

const subCheckboxTextStyle: React.CSSProperties = {
  marginLeft: '8px',
  fontSize: '14px',
  color: '#555',
  lineHeight: '1.5',
};

const conditionsInputGroupStyle: React.CSSProperties = {
  marginLeft: '30px',
  marginTop: '10px',
};

const conditionsLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  color: '#555',
  marginBottom: '8px',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  fontSize: '14px',
  border: '2px solid #ddd',
  borderRadius: '6px',
  outline: 'none',
  resize: 'vertical',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const submitButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '16px',
  fontSize: '18px',
  fontWeight: 'bold',
  color: 'white',
  backgroundColor: '#1976d2',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  marginTop: '20px',
};
