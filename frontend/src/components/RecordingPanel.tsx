import React, { useState, useEffect, useRef } from 'react';
import { useEEGStore, RecordingSuggestion } from '../store/eeg';
import { Recording } from '../types';
import { getStateEmoji, getStateColor } from '../utils/recordingName';

const CHANNEL_NAMES: Record<string, string> = {
  Fp1: '左前额', Fp2: '右前额', F3: '左额', F4: '右额',
  C3: '左中央', C4: '右中央', P3: '左顶', P4: '右顶',
  O1: '左枕', O2: '右枕'
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatTime = (ms: number): string => {
  return new Date(ms).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const RecordingPanel: React.FC = () => {
  const {
    isRecording,
    currentRecordingFrames,
    recordings,
    playbackMode,
    activeRecording,
    playbackState,
    startRecording,
    stopRecording,
    deleteRecording,
    enterPlaybackMode,
    exitPlaybackMode,
    setPlaybackTime,
    togglePlayback,
    setPlaybackPlaying,
    selectedChannel,
  } = useEEGStore();

  const [recordingName, setRecordingName] = useState('');
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [suggestion, setSuggestion] = useState<RecordingSuggestion | null>(null);
  const timerRef = useRef<number | null>(null);
  const playbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setElapsedTime(currentRecordingFrames.length * 3);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsedTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, currentRecordingFrames.length]);

  useEffect(() => {
    if (playbackState.isPlaying && activeRecording) {
      playbackTimerRef.current = window.setInterval(() => {
        const { playbackState, activeRecording, setPlaybackTime, setPlaybackPlaying } = useEEGStore.getState();
        if (!activeRecording) return;
        const newTime = playbackState.currentTime + 0.1;
        if (newTime >= activeRecording.duration) {
          setPlaybackTime(activeRecording.duration);
          setPlaybackPlaying(false);
        } else {
          setPlaybackTime(newTime);
        }
      }, 100);
    } else {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
    }
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [playbackState.isPlaying, activeRecording]);

  const handleStartRecording = () => {
    startRecording();
  };

  const handleStopRecording = () => {
    const s = useEEGStore.getState().getRecordingSuggestion();
    setSuggestion(s);
    if (s) {
      setRecordingName(s.suggestedName);
    }
    setShowNameDialog(true);
  };

  const handleUseSuggestion = () => {
    if (suggestion) {
      setRecordingName(suggestion.suggestedName);
    }
  };

  const handleConfirmSave = () => {
    stopRecording(recordingName.trim());
    setRecordingName('');
    setShowNameDialog(false);
  };

  const handleCancelSave = () => {
    useEEGStore.setState({
      isRecording: false,
      recordingStartTime: 0,
      currentRecordingFrames: [],
    });
    setShowNameDialog(false);
    setRecordingName('');
    setSuggestion(null);
  };

  const handlePlayRecording = (recording: Recording) => {
    enterPlaybackMode(recording);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setPlaybackTime(time);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeRecording) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const time = percentage * activeRecording.duration;
    setPlaybackTime(time);
  };

  return (
    <div style={{ padding: '16px', background: '#fff', borderRadius: '12px', margin: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '20px' }}>⏺</span>
        录制与回放
      </h3>

      {!playbackMode && (
        <div style={{ marginBottom: '16px' }}>
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #d32f2f, #b71c1c)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <span style={{ fontSize: '16px' }}>⏺</span>
              开始录制 ({CHANNEL_NAMES[selectedChannel] || selectedChannel})
            </button>
          ) : (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                background: '#ffebee',
                borderRadius: '8px',
                marginBottom: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#d32f2f',
                    animation: 'pulse 1s infinite',
                  }} />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#d32f2f' }}>录制中</span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>
                  {formatDuration(elapsedTime)} · {currentRecordingFrames.length} 帧
                </span>
              </div>
              <button
                onClick={handleStopRecording}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#757575',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ⏹ 停止录制
              </button>
            </div>
          )}
        </div>
      )}

      {playbackMode && activeRecording && (
        <div style={{
          marginBottom: '16px',
          padding: '14px',
          background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)',
          borderRadius: '10px',
          border: '1px solid #90caf9',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1565c0' }}>
                {activeRecording.name}
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                {CHANNEL_NAMES[activeRecording.channel] || activeRecording.channel} · {formatDuration(activeRecording.duration)}
              </div>
            </div>
            <button
              onClick={exitPlaybackMode}
              style={{
                padding: '6px 12px',
                background: '#fff',
                color: '#1565c0',
                border: '1px solid #90caf9',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              退出回放
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '10px',
          }}>
            <button
              onClick={togglePlayback}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#1565c0',
                color: '#fff',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {playbackState.isPlaying ? '⏸' : '▶'}
            </button>

            <div style={{ flex: 1 }}>
              <div
                onClick={handleProgressClick}
                style={{
                  height: '8px',
                  background: '#90caf9',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    background: '#1565c0',
                    width: `${(playbackState.currentTime / activeRecording.duration) * 100}%`,
                    borderRadius: '4px',
                    transition: 'width 0.1s linear',
                  }}
                />
              </div>
              <input
                type="range"
                min="0"
                max={activeRecording.duration}
                step="0.1"
                value={playbackState.currentTime}
                onChange={handleSeek}
                style={{
                  width: '100%',
                  marginTop: '4px',
                  opacity: 0,
                  position: 'absolute',
                  pointerEvents: 'none',
                }}
              />
            </div>

            <span style={{ fontSize: '12px', color: '#666', minWidth: '70px', textAlign: 'right' }}>
              {formatDuration(playbackState.currentTime)} / {formatDuration(activeRecording.duration)}
            </span>
          </div>

          {playbackState.currentFrame && (
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              padding: '8px',
              background: 'rgba(255,255,255,0.5)',
              borderRadius: '6px',
            }}>
              <span style={{ fontSize: '11px', color: '#1976d2' }}>专注: {playbackState.currentFrame.brainState.focus.toFixed(0)}</span>
              <span style={{ fontSize: '11px', color: '#388e3c' }}>放松: {playbackState.currentFrame.brainState.relaxation.toFixed(0)}</span>
              <span style={{ fontSize: '11px', color: '#d32f2f' }}>疲劳: {playbackState.currentFrame.brainState.fatigue.toFixed(0)}</span>
              <span style={{ fontSize: '11px', color: '#666' }}>|</span>
              <span style={{ fontSize: '11px', color: '#1565c0' }}>α: {playbackState.currentFrame.bands.alpha.toFixed(2)}</span>
              <span style={{ fontSize: '11px', color: '#e53935' }}>β: {playbackState.currentFrame.bands.beta.toFixed(2)}</span>
              <span style={{ fontSize: '11px', color: '#2e7d32' }}>θ: {playbackState.currentFrame.bands.theta.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      <div>
        <div style={{
          fontSize: '12px',
          color: '#666',
          marginBottom: '8px',
          fontWeight: 500,
        }}>
          历史录制 ({recordings.length})
        </div>
        {recordings.length === 0 ? (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: '#999',
            fontSize: '13px',
            border: '1px dashed #e0e0e0',
            borderRadius: '8px',
          }}>
            暂无录制记录
          </div>
        ) : (
          <div style={{ maxHeight: '280px', overflow: 'auto' }}>
            {[...recordings].reverse().map((recording) => (
              <div
                key={recording.id}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: activeRecording?.id === recording.id
                    ? '2px solid #1565c0'
                    : '1px solid #e0e0e0',
                  marginBottom: '8px',
                  background: activeRecording?.id === recording.id ? '#e3f2fd' : '#fff',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '6px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#333',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {recording.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                      {formatTime(recording.startTime)} · {CHANNEL_NAMES[recording.channel] || recording.channel}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button
                      onClick={() => handlePlayRecording(recording)}
                      style={{
                        padding: '4px 10px',
                        background: activeRecording?.id === recording.id ? '#1565c0' : '#f5f5f5',
                        color: activeRecording?.id === recording.id ? '#fff' : '#1565c0',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {activeRecording?.id === recording.id ? '回放中' : '▶ 回放'}
                    </button>
                    <button
                      onClick={() => deleteRecording(recording.id)}
                      style={{
                        padding: '4px 8px',
                        background: '#ffebee',
                        color: '#d32f2f',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '11px', color: '#666' }}>
                    时长: {formatDuration(recording.duration)} · {recording.frames.length} 帧
                  </span>
                  <span style={{ fontSize: '11px', color: '#999' }}>
                    {recording.channel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNameDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '12px',
            width: '380px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <h4 style={{ margin: '0 0 4px', fontSize: '16px', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💡</span>
              智能命名建议
            </h4>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#999' }}>
              系统根据录制内容自动生成，包含日期、通道和状态特征
            </p>

            {suggestion && (
              <>
                <div style={{
                  background: 'linear-gradient(135deg, #f3e5f5, #e1bee7)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '12px',
                }}>
                  <div style={{ fontSize: '11px', color: '#7b1fa2', marginBottom: '4px', fontWeight: 500 }}>
                    建议名称
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#4a148c', wordBreak: 'break-all' }}>
                    {suggestion.suggestedName}
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  marginBottom: '12px',
                }}>
                  <div style={{
                    background: '#f5f5f5',
                    borderRadius: '6px',
                    padding: '8px 10px',
                  }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>📅 日期</div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#333' }}>{suggestion.components.date}</div>
                  </div>
                  <div style={{
                    background: '#f5f5f5',
                    borderRadius: '6px',
                    padding: '8px 10px',
                  }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>⏰ 时间</div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#333' }}>{suggestion.components.time}</div>
                  </div>
                  <div style={{
                    background: '#f5f5f5',
                    borderRadius: '6px',
                    padding: '8px 10px',
                  }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>📍 通道</div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#333' }}>{suggestion.components.channelLabel}</div>
                  </div>
                  <div style={{
                    background: '#f5f5f5',
                    borderRadius: '6px',
                    padding: '8px 10px',
                  }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>
                      {getStateEmoji(suggestion.components.state)} 主导状态
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: getStateColor(suggestion.components.state) }}>
                      {suggestion.components.stateLabel}
                    </div>
                  </div>
                </div>

                <div style={{
                  background: '#fafafa',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  marginBottom: '12px',
                }}>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px', fontWeight: 500 }}>
                    📊 状态分布 ({suggestion.analysis.stateDistribution.focused + suggestion.analysis.stateDistribution.relaxed + suggestion.analysis.stateDistribution.fatigued + suggestion.analysis.stateDistribution.neutral} 帧)
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                    {(['focused', 'relaxed', 'fatigued', 'neutral'] as const).map((state) => {
                      const total = suggestion.analysis.stateDistribution.focused + suggestion.analysis.stateDistribution.relaxed + suggestion.analysis.stateDistribution.fatigued + suggestion.analysis.stateDistribution.neutral;
                      const count = suggestion.analysis.stateDistribution[state] || 0;
                      const percent = total > 0 ? (count / total) * 100 : 0;
                      const labels: Record<string, string> = { focused: '专注', relaxed: '放松', fatigued: '疲劳', neutral: '平稳' };
                      return (
                        <div key={state} style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{
                            height: '4px',
                            background: '#eee',
                            borderRadius: '2px',
                            overflow: 'hidden',
                            marginBottom: '2px',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${percent}%`,
                              background: getStateColor(state),
                              transition: 'width 0.3s',
                            }} />
                          </div>
                          <div style={{ fontSize: '9px', color: getStateColor(state), fontWeight: 500 }}>
                            {labels[state]} {percent.toFixed(0)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '10px', color: '#999' }}>
                    <span>专注 {suggestion.analysis.avgFocus.toFixed(0)}</span>
                    <span>放松 {suggestion.analysis.avgRelaxation.toFixed(0)}</span>
                    <span>疲劳 {suggestion.analysis.avgFatigue.toFixed(0)}</span>
                  </div>
                </div>

                <button
                  onClick={handleUseSuggestion}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#f3e5f5',
                    color: '#7b1fa2',
                    border: '1px solid #ce93d8',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    marginBottom: '12px',
                  }}
                >
                  🔄 重新生成建议
                </button>
              </>
            )}

            <div style={{
              fontSize: '12px',
              color: '#666',
              marginBottom: '6px',
              fontWeight: 500,
            }}>
              录制名称
            </div>
            <input
              type="text"
              value={recordingName}
              onChange={(e) => setRecordingName(e.target.value)}
              placeholder="可编辑或直接使用建议名称"
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                marginBottom: '16px',
                boxSizing: 'border-box',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmSave();
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelSave}
                style={{
                  padding: '8px 16px',
                  background: '#f5f5f5',
                  color: '#666',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={handleConfirmSave}
                style={{
                  padding: '8px 16px',
                  background: '#1565c0',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};
