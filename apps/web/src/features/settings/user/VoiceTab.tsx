
import {
  Mic,
  MicOff,
} from 'lucide-react';
import type { UserSettingsState } from './useUserSettingsState';
import styles from './VoiceTab.module.css';

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
    <div className={styles.root}>
      {/* Audio Devices */}
      <div className={styles.audioDevices}>
        {/* Input Device */}
        <div>
          <label className={styles.inputDeviceMicrophone}>
            Input Device (Microphone)
          </label>
          <select
            value={inputDevice}
            onChange={(e) => setInputDevice(e.target.value)}
            className={styles.inputDeviceSelect}
          >
            <option value="Default - Microphone (Built-in)">Default - Microphone (Built-in)</option>
            <option value="External USB Microphone">External USB Microphone</option>
            <option value="Headset Microphone (Bluetooth)">Headset Microphone (Bluetooth)</option>
          </select>

          <div className={styles.inputDeviceDiv}>
            <div className={styles.inputDeviceDivDiv}>
              <span>Input Volume</span>
              <span>{inputVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={inputVolume}
              onChange={(e) => setInputVolume(Number(e.target.value))}
              className={styles.inputDeviceDivInput}
            />
          </div>
        </div>

        {/* Output Device */}
        <div>
          <label className={styles.inputDeviceMicrophone}>
            Output Device (Speakers)
          </label>
          <select
            value={outputDevice}
            onChange={(e) => setOutputDevice(e.target.value)}
            className={styles.inputDeviceSelect}
          >
            <option value="Default - Speakers (Built-in)">Default - Speakers (Built-in)</option>
            <option value="Headphones (AirPods)">Headphones (AirPods)</option>
            <option value="External Studio Monitors">External Studio Monitors</option>
          </select>

          <div className={styles.inputDeviceDiv}>
            <div className={styles.inputDeviceDivDiv}>
              <span>Output Volume</span>
              <span>{outputVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={outputVolume}
              onChange={(e) => setOutputVolume(Number(e.target.value))}
              className={styles.inputDeviceDivInput}
            />
          </div>
        </div>
      </div>

      {/* Microphone Test Section */}
      <div className={styles.microphoneTestSection}>
        <div className={styles.microphoneTestSectionDiv}>
          <div>
            <div className={styles.micTest}>Mic Test</div>
            <div className={styles.microphoneTestSectionDivDiv}>
              Having mic issues? Click &ldquo;Let&apos;s Check&rdquo; to test your audio output level.
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsTestingMic(!isTestingMic)}
            className={styles.microphoneTestSectionDivButton} style={{ backgroundColor: isTestingMic ? 'var(--danger)' : 'var(--brand)' }}
          >
            {isTestingMic ? <MicOff size={16} /> : <Mic size={16} />}
            {isTestingMic ? 'Stop Testing' : "Let's Check"}
          </button>
        </div>

        {/* Level Indicator Bar */}
        <div className={styles.levelIndicatorBar}>
          <div
            className={styles.levelIndicatorBarDiv} style={{ width: `${micLevel}%` }}
          />
        </div>
      </div>
    </div>
  );
}
