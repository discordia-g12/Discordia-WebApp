
import {
  Mic,
  MicOff,
} from 'lucide-react';
import type { UserSettingsState } from './useUserSettingsState';

/** Pestaña "voice" de UserSettings. */
export function VoiceTab({ s }: { s: UserSettingsState }) {
  const {
    inputDevice,
    setInputDevice,
    outputDevice,
    setOutputDevice,
    inputVolume,
    setInputVolume,
    outputVolume,
    setOutputVolume,
    isTestingMic,
    setIsTestingMic,
    micLevel,
  } = s;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Audio Devices */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Input Device */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 6 }}>
            Input Device (Microphone)
          </label>
          <select
            value={inputDevice}
            onChange={(e) => setInputDevice(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#1e1f22',
              color: '#dbdee1',
              border: '1px solid rgba(0, 0, 0, 0.3)',
              borderRadius: 4,
              padding: '10px 12px',
              fontSize: 14,
              outline: 'none',
            }}
          >
            <option value="Default - Microphone (Built-in)">Default - Microphone (Built-in)</option>
            <option value="External USB Microphone">External USB Microphone</option>
            <option value="Headset Microphone (Bluetooth)">Headset Microphone (Bluetooth)</option>
          </select>

          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#b5bac1', marginBottom: 4 }}>
              <span>Input Volume</span>
              <span>{inputVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={inputVolume}
              onChange={(e) => setInputVolume(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#5865f2' }}
            />
          </div>
        </div>

        {/* Output Device */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 6 }}>
            Output Device (Speakers)
          </label>
          <select
            value={outputDevice}
            onChange={(e) => setOutputDevice(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#1e1f22',
              color: '#dbdee1',
              border: '1px solid rgba(0, 0, 0, 0.3)',
              borderRadius: 4,
              padding: '10px 12px',
              fontSize: 14,
              outline: 'none',
            }}
          >
            <option value="Default - Speakers (Built-in)">Default - Speakers (Built-in)</option>
            <option value="Headphones (AirPods)">Headphones (AirPods)</option>
            <option value="External Studio Monitors">External Studio Monitors</option>
          </select>

          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#b5bac1', marginBottom: 4 }}>
              <span>Output Volume</span>
              <span>{outputVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={outputVolume}
              onChange={(e) => setOutputVolume(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#5865f2' }}
            />
          </div>
        </div>
      </div>

      {/* Microphone Test Section */}
      <div
        style={{
          backgroundColor: '#2b2d31',
          borderRadius: 8,
          padding: 20,
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f2f3f5' }}>Mic Test</div>
            <div style={{ fontSize: 13, color: '#949ba4' }}>
              Having mic issues? Click &ldquo;Let&apos;s Check&rdquo; to test your audio output level.
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsTestingMic(!isTestingMic)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: isTestingMic ? '#da373c' : '#5865f2',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isTestingMic ? <MicOff size={16} /> : <Mic size={16} />}
            {isTestingMic ? 'Stop Testing' : "Let's Check"}
          </button>
        </div>

        {/* Level Indicator Bar */}
        <div
          style={{
            height: 16,
            backgroundColor: '#1e1f22',
            borderRadius: 8,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${micLevel}%`,
              background: 'linear-gradient(90deg, #23a55a 60%, #f0b232 85%, #f23f43 100%)',
              borderRadius: 8,
              transition: 'width 0.1s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
}
