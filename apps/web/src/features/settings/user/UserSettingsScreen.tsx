import { useState } from 'react';
import type { Status } from '../../../types';
import { ActionLink, BlockButton, SquareAvatar, UnderlineInput } from '../../../ui';
import { getThemePreference, setThemePreference, type ThemePreference } from '../../../ui/theme';
import { Choice, Feedback, SettingsCell, SettingsRow, SettingsScreen, Switch, type SettingsSection } from '../SettingsScreen';
import type { UserSettingsProps } from './useUserSettingsState';
import { useUserSettingsState, type UserSettingsState } from './useUserSettingsState';
import { useWebPushToggle } from './useWebPushToggle';
import { CHAT_FONT_SIZE_MAX, CHAT_FONT_SIZE_MIN, usePreferences, type MessageMode } from '../../../app/preferences';
import { useDesktopNotificationsToggle } from '../../notifications/useAppNotificationAlerts';
import { canChooseAudioOutput, selectedDevice, useAudioDevices, useMicrophoneTest, type AudioDevice } from '../../voice/audioDevices';
import styles from './UserSettingsScreen.module.css';

type Section = 'account' | 'notifications' | 'voice' | 'billing' | 'experience';

const SECTIONS: SettingsSection<Section>[] = [
  { id: 'account', label: 'Cuenta', items: ['Información de la cuenta', 'Estado', 'Contraseña y seguridad', 'Autenticación de dos factores'] },
  { id: 'notifications', label: 'Notificación', items: ['Notificaciones push', 'Notificaciones de escritorio', 'Sonidos', 'Vista previa'] },
  { id: 'voice', label: 'Voz', items: ['Entrada', 'Salida', 'Prueba de micrófono'] },
  { id: 'billing', label: 'Factura', items: ['Discordia Premium', 'Puntos'] },
  { id: 'experience', label: 'Experiencia', items: ['Tema', 'Modo de los mensajes', 'Tamaño de letra'] },
];

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'online', label: 'Conectado' },
  { value: 'idle', label: 'Ausente' },
  { value: 'dnd', label: 'No molestar' },
  { value: 'invisible', label: 'Invisible' },
];

/**
 * Ajustes de usuario del rediseño (PDF, pág. 11) sobre SettingsScreen: CUENTA, NOTIFICACIÓN, VOZ,
 * FACTURA, EXPERIENCIA y CERRAR SESIÓN. El estado es el de useUserSettingsState (compartido con la vista
 * anterior). Van al backend la información de la cuenta y el estado personalizado; el tema es el real de
 * la app (data-theme). Lo que todavía no se guarda queda deshabilitado con "próximamente".
 */
export function UserSettingsScreen(props: UserSettingsProps) {
  const s = useUserSettingsState(props);
  const [section, setSection] = useState<Section>('account');
  const user = s.baseUser;

  return (
    <SettingsScreen
      title="Ajustes de usuario"
      identity={
        <div className={styles.identity}>
          <SquareAvatar user={{ ...user, avatar: user.avatarUrl || user.avatar }} size={32} />
          <div>
            <p className={styles.identityName}>{s.displayName || user.displayName}</p>
            <p className={styles.identityMeta}>@{user.username}</p>
          </div>
        </div>
      }
      sections={SECTIONS}
      active={section}
      onSelect={setSection}
      actions={[
        {
          label: 'Cerrar sesión',
          // onLogout abre la confirmación (FullScreenViews): la del rediseño, no la del navegador
          onPress: () => props.onLogout?.(),
        },
      ]}
      onClose={() => props.onClose?.()}
    >
      {section === 'account' && <AccountSection s={s} />}
      {section === 'notifications' && <NotificationsSection />}
      {section === 'voice' && <VoiceSection />}
      {section === 'billing' && <BillingSection s={s} />}
      {section === 'experience' && <ExperienceSection />}
    </SettingsScreen>
  );
}

// ==========================================
// CUENTA
// ==========================================

function AccountSection({ s }: { s: UserSettingsState }) {
  return (
    <>
      <SettingsCell title="Información de la cuenta">
        <UnderlineInput label="nombre visible" value={s.displayName} maxLength={32} onChange={(e) => s.setDisplayName(e.target.value)} />
        <UnderlineInput label="nombre de usuario" value={`@${s.baseUser.username ?? ''}`} disabled hint="Es tu identificador en Discordia: no se puede cambiar." />
        <UnderlineInput
          label="sobre mí"
          value={s.bio}
          maxLength={190}
          onChange={(e) => s.setBio(e.target.value)}
          hint={`${s.bio.length}/190`}
        />
        {/* Va al backend (updateMyProfile); el aviso de la app confirma cuando responde */}
        <BlockButton onPress={s.handleSaveProfile}>Guardar</BlockButton>
      </SettingsCell>

      <SettingsCell title="Estado">
        <Choice label="Estado" options={STATUS_OPTIONS} value={s.status === 'offline' ? 'invisible' : s.status} onChange={s.setStatus} />
        <p className={styles.note}>/ La presencia vale para esta sesión: todavía no se guarda en el servidor. El estado personalizado sí.</p>
        <UnderlineInput
          label="estado personalizado"
          value={s.customStatus}
          maxLength={64}
          placeholder="¿En qué andás?"
          onChange={(e) => s.setCustomStatus(e.target.value)}
        />
        <BlockButton onPress={s.handleSaveProfile}>Guardar estado</BlockButton>
      </SettingsCell>

      <SettingsCell title="Contraseña y seguridad" soon>
        <form className={styles.form} onSubmit={s.handleUpdatePassword} noValidate>
          <UnderlineInput label="contraseña actual" secret value={s.currentPassword} onChange={(e) => s.setCurrentPassword(e.target.value)} autoComplete="current-password" />
          <UnderlineInput
            label="contraseña nueva"
            secret
            value={s.newPassword}
            onChange={(e) => s.setNewPassword(e.target.value)}
            hint="mínimo 8 caracteres"
            autoComplete="new-password"
          />
          <UnderlineInput label="confirmar contraseña" secret value={s.confirmPassword} onChange={(e) => s.setConfirmPassword(e.target.value)} autoComplete="new-password" />
          {s.passwordMsg && (
            <Feedback tone={s.passwordMsg.type === 'error' ? 'error' : 'default'}>/ {s.passwordMsg.text}</Feedback>
          )}
          <BlockButton type="submit">Actualizar contraseña</BlockButton>
        </form>
      </SettingsCell>

      <SettingsCell title="Autenticación de dos factores">
        {s.isSettingUpTwoFactor && s.twoFactorSetupData ? (
          <form className={styles.form} onSubmit={s.handleConfirmSetup} noValidate>
            <div className={styles.qrBox}>
              <img src={s.twoFactorSetupData.qrCode} alt="Código QR 2FA" className={styles.qrImage} />
              <span className={styles.secretText}>Clave manual: {s.twoFactorSetupData.secret}</span>
            </div>
            <UnderlineInput
              label="código de 6 dígitos"
              value={s.setupCode}
              onChange={(e) => s.setSetupCode(e.target.value)}
              placeholder="ej: 123456"
              maxLength={6}
              autoFocus
              required
            />
            {s.setupError && <Feedback tone="error">/ {s.setupError}</Feedback>}
            <div className={styles.setupActions}>
              <BlockButton type="submit" loading={s.isActivating}>
                Confirmar y activar
              </BlockButton>
              <ActionLink onPress={s.handleCancelSetup}>cancelar</ActionLink>
            </div>
          </form>
        ) : s.showDisableConfirm ? (
          <form className={styles.form} onSubmit={s.handleConfirmDisable} noValidate>
            {s.isGoogleUser ? (
              <>
                <p className={styles.note}>
                  / Al haber ingresado con Google tu cuenta no usa contraseña. Confirmá la desactivación con el código de tu app autenticadora o un código de recuperación.
                </p>
                <UnderlineInput
                  label="código de verificación o recuperación"
                  value={s.disablePassword}
                  onChange={(e) => s.setDisablePassword(e.target.value)}
                  placeholder="ej: 123456 o A1B2-C3D4"
                  autoFocus
                  required
                />
              </>
            ) : (
              <>
                <p className={styles.note}>
                  / Confirmá la desactivación con tu contraseña actual, tu código de 6 dígitos o un código de recuperación.
                </p>
                <UnderlineInput
                  label="contraseña actual"
                  secret
                  value={s.disablePassword}
                  onChange={(e) => s.setDisablePassword(e.target.value)}
                  placeholder="contraseña o código A1B2-C3D4"
                  autoComplete="current-password"
                  autoFocus
                  required
                />
              </>
            )}
            {s.disableError && <Feedback tone="error">/ {s.disableError}</Feedback>}
            <div className={styles.setupActions}>
              <BlockButton type="submit" loading={s.isDisabling}>
                Confirmar desactivación
              </BlockButton>
              <ActionLink onPress={s.handleCancelDisable}>cancelar</ActionLink>
            </div>
          </form>
        ) : s.twoFactorEnabled ? (
          <>
            <SettingsRow title="activada/" description="Tu cuenta pide un código además de la contraseña.">
              <ActionLink onPress={s.handleStartDisable}>desactivar 2fa</ActionLink>
            </SettingsRow>
            <SettingsRow title="códigos de recuperación" description="Códigos de un solo uso por si perdés tu app de autenticación.">
              <ActionLink onPress={() => s.setShowBackupCodes(!s.showBackupCodes)} aria-expanded={s.showBackupCodes}>
                {s.showBackupCodes ? 'ocultar códigos' : 'mostrar códigos'}
              </ActionLink>
            </SettingsRow>
            {s.showBackupCodes && (
              <>
                {s.backupCodes.length > 0 ? (
                  <>
                    <ul className={styles.codes}>
                      {s.backupCodes.map((code) => (
                        <li key={code}>{code}</li>
                      ))}
                    </ul>
                    <div className={styles.setupActions}>
                      <ActionLink onPress={s.copyBackupCodesToClipboard}>{s.copiedCode ? 'copiados' : 'copiar todos'}</ActionLink>
                      <ActionLink onPress={s.handleRegenerateCodes}>regenerar lista</ActionLink>
                    </div>
                  </>
                ) : (
                  <div className={styles.setupActions}>
                    <ActionLink onPress={s.handleRegenerateCodes}>regenerar lista</ActionLink>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <SettingsRow title="desactivada/" description="Protegé tu cuenta requiriendo un código de tu aplicación autenticadora al iniciar sesión.">
            <BlockButton onPress={s.handleStartSetup}>Activar 2FA</BlockButton>
          </SettingsRow>
        )}
      </SettingsCell>
    </>
  );
}

// ==========================================
// NOTIFICACIÓN
// ==========================================

function NotificationsSection() {
  const prefs = usePreferences();
  const desktop = useDesktopNotificationsToggle();
  const toggles = [
    {
      title: 'Contador de no leídos',
      description: 'Los avisos sin leer en el título de la pestaña y en el ícono de la app instalada.',
      checked: prefs.unreadBadge,
      set: (next: boolean) => prefs.setPreference('unreadBadge', next),
    },
    {
      title: 'Sonidos',
      description: 'Un sonido corto cuando llega un aviso: mensajes directos, menciones y respuestas en hilos.',
      checked: prefs.sounds,
      set: (next: boolean) => prefs.setPreference('sounds', next),
    },
    {
      title: 'Vista previa',
      description: 'El comienzo del mensaje en los avisos de escritorio. Apagada, solo dice quién y dónde.',
      checked: prefs.notificationPreview,
      set: (next: boolean) => prefs.setPreference('notificationPreview', next),
    },
  ];
  return (
    <>
      <PushCell />
      <SettingsCell title="Notificaciones de la app" wide>
        <SettingsRow
          title="Notificaciones de escritorio"
          description="Avisos del sistema con Discordia abierta en otra pestaña o ventana. Si tenés push activo, avisa el push."
        >
          <Switch label="Notificaciones de escritorio" checked={desktop.checked} disabled={desktop.disabled} onChange={(next) => void desktop.toggle(next)} />
        </SettingsRow>
        {desktop.unavailable && <p className={styles.note}>/ {desktop.unavailable}</p>}
        {toggles.map((t) => (
          <SettingsRow key={t.title} title={t.title} description={t.description}>
            <Switch label={t.title} checked={t.checked} onChange={t.set} />
          </SettingsRow>
        ))}
        <p className={styles.note}>/ Se guardan en este navegador. Con Discordia cerrada avisa el push.</p>
      </SettingsCell>
    </>
  );
}

/** Web Push (ADR-08): avisos del sistema con la pestaña cerrada o sin foco. Con la app a la vista avisa la bandeja. */
function PushCell() {
  const push = useWebPushToggle();
  return (
    <SettingsCell title="Notificaciones push" wide>
      <SettingsRow
        title="Notificaciones push"
        description="Menciones, mensajes directos y respuestas en hilos cuando Discordia no está a la vista."
      >
        <Switch label="Notificaciones push" checked={push.checked} disabled={push.disabled} onChange={(next) => void push.toggle(next)} />
      </SettingsRow>
      {push.unavailable && <p className={styles.note}>/ {push.unavailable}</p>}
      {push.error && <Feedback tone="error">/ {push.error}</Feedback>}
    </SettingsCell>
  );
}

// ==========================================
// VOZ
// ==========================================

function DeviceSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: AudioDevice[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <select className={styles.select} value={selectedDevice(options, value)} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Range({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  unit = '%',
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>
        {label}{' '}
        <span className={styles.fieldValue}>
          {value}
          {unit}
        </span>
      </span>
      <input className={styles.range} type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function VoiceSection() {
  const prefs = usePreferences();
  const devices = useAudioDevices();
  const mic = useMicrophoneTest(prefs.inputDeviceId);
  const outputChoosable = canChooseAudioOutput();

  return (
    <>
      <SettingsCell title="Entrada">
        <DeviceSelect
          label="micrófono"
          value={prefs.inputDeviceId}
          options={devices.inputs}
          disabled={!devices.supported}
          onChange={(id) => prefs.setPreference('inputDeviceId', id)}
        />
        {devices.needsPermission && (
          <p className={styles.note}>
            / Para ver los nombres, el navegador necesita permiso de micrófono.{' '}
            <ActionLink onPress={() => void devices.requestAccess()}>permitir</ActionLink>
          </p>
        )}
        {devices.error && <Feedback tone="error">/ {devices.error}</Feedback>}
        <p className={styles.note}>/ Con una llamada en curso, cambia enseguida.</p>
      </SettingsCell>
      <SettingsCell title="Salida">
        <DeviceSelect
          label="parlantes"
          value={prefs.outputDeviceId}
          options={devices.outputs}
          disabled={!outputChoosable}
          onChange={(id) => prefs.setPreference('outputDeviceId', id)}
        />
        {!outputChoosable && <p className={styles.note}>/ Este navegador usa siempre los parlantes del sistema.</p>}
        <Range label="volumen de los demás" value={prefs.outputVolume} onChange={(value) => prefs.setPreference('outputVolume', value)} />
      </SettingsCell>
      <SettingsCell title="Prueba de micrófono" wide>
        <SettingsRow title={mic.testing ? 'escuchando/' : '¿problemas con el micrófono?'} description="Hablá y mirá si la barra se mueve. No se manda nada a nadie.">
          <BlockButton onPress={mic.toggle}>{mic.testing ? 'Detener' : 'Probar'}</BlockButton>
        </SettingsRow>
        <div className={styles.meter} role="meter" aria-label="Nivel del micrófono" aria-valuemin={0} aria-valuemax={100} aria-valuenow={mic.level}>
          <span className={styles.meterFill} style={{ transform: `scaleX(${mic.level / 100})` }} />
        </div>
        {mic.error && <Feedback tone="error">/ {mic.error}</Feedback>}
      </SettingsCell>
    </>
  );
}

// ==========================================
// FACTURA
// ==========================================

const PREMIUM_FEATURES = [
  'video y pantalla compartida en 1080p a 60 FPS',
  'adjuntos de hasta 50 MB (10 MB sin premium)',
  '2 mejoras de servidor por mes',
  'emojis propios en cualquier servidor o mensaje directo',
  'insignia de premium y avatares animados',
  'mensajes de hasta 4.000 caracteres',
];

const POINT_PACKS = [
  { points: 500, price: '$4.99', badge: null },
  { points: 1000, price: '$9.49', badge: '5% menos' },
  { points: 2500, price: '$21.99', badge: '12% menos' },
  { points: 5000, price: '$39.99', badge: 'conviene' },
];

function BillingSection({ s }: { s: UserSettingsState }) {
  const price = s.billingCycle === 'monthly' ? '$9.99 por mes' : '$99.99 por año';
  return (
    <>
      <SettingsCell title="Discordia Premium" soon>
        <div>
          <p className={styles.planTitle}>{s.isPremium ? 'suscripción activa/' : 'plan gratis/'}</p>
          <p className={styles.note}>Más calidad, archivos más grandes y mejoras de servidor.</p>
        </div>
        <ul className={styles.features}>
          {PREMIUM_FEATURES.map((f) => (
            <li key={f}>/ {f}</li>
          ))}
        </ul>
        {!s.isPremium && (
          <Choice
            label="Ciclo de facturación"
            options={[
              { value: 'monthly', label: 'mensual' },
              { value: 'yearly', label: 'anual (16% menos)' },
            ]}
            value={s.billingCycle}
            onChange={s.setBillingCycle}
          />
        )}
        {s.isPremium ? (
          <BlockButton tone="danger" onPress={s.handleCancelPremium}>
            Cancelar premium
          </BlockButton>
        ) : (
          <BlockButton onPress={s.handleSubscribePremium} loading={s.paymentStatus === 'paying'}>
            {`Suscribirme · ${price}`}
          </BlockButton>
        )}
      </SettingsCell>

      <SettingsCell title="Puntos" soon>
        <p className={styles.points}>
          {s.points.toLocaleString('es-AR')}
          <span className={styles.pointsUnit}> puntos</span>
        </p>
        <p className={styles.note}>/ Para mejoras de servidor (500 puntos) y emojis propios.</p>
        <ul className={styles.packs}>
          {POINT_PACKS.map((pack) => (
            <li key={pack.points}>
              <span>
                <strong>{pack.points.toLocaleString('es-AR')}</strong> puntos
                {pack.badge && <span className={styles.badge}>{pack.badge}</span>}
              </span>
              <span className={styles.packAction}>
                {pack.price}{' '}
                <ActionLink onPress={() => s.handleBuyPoints(pack.points)} disabled={s.purchasingPackage === pack.points}>
                  {s.purchasingPackage === pack.points ? 'comprando' : 'comprar'}
                </ActionLink>
              </span>
            </li>
          ))}
        </ul>
      </SettingsCell>
    </>
  );
}

// ==========================================
// EXPERIENCIA
// ==========================================

function ExperienceSection() {
  const [theme, setTheme] = useState<ThemePreference>(getThemePreference);
  const messageMode = usePreferences((p) => p.messageMode);
  const chatFontSize = usePreferences((p) => p.chatFontSize);
  const setPreference = usePreferences((p) => p.setPreference);
  return (
    <>
      <SettingsCell title="Tema" wide>
        <SettingsRow title="apariencia/" description="Sistema sigue la preferencia de tu dispositivo.">
          <Choice
            label="Tema"
            options={[
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Oscuro' },
              { value: 'system', label: 'Sistema' },
            ]}
            value={theme}
            onChange={(value) => {
              setTheme(value);
              setThemePreference(value);
            }}
          />
        </SettingsRow>
      </SettingsCell>

      <SettingsCell title="Modo de los mensajes">
        <Choice
          label="Modo de los mensajes"
          options={[
            { value: 'cozy', label: 'cómodo' },
            { value: 'compact', label: 'compacto' },
          ]}
          value={messageMode}
          onChange={(value: MessageMode) => setPreference('messageMode', value)}
        />
        <p className={styles.note}>
          / {messageMode === 'cozy' ? 'Con aire y avatares grandes.' : 'Más mensajes por pantalla, con avatares chicos.'}
        </p>
      </SettingsCell>

      <SettingsCell title="Tamaño de letra">
        <Range
          label="tamaño del chat"
          value={chatFontSize}
          onChange={(value) => setPreference('chatFontSize', value)}
          min={CHAT_FONT_SIZE_MIN}
          max={CHAT_FONT_SIZE_MAX}
          unit="px"
        />
        <p className={styles.preview} style={{ fontSize: chatFontSize }}>
          Así se van a ver los mensajes.
        </p>
        <p className={styles.note}>/ Se guarda en este navegador.</p>
      </SettingsCell>
    </>
  );
}
