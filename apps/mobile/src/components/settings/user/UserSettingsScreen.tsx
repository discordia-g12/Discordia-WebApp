import React, { useEffect, useState } from 'react'
import { Image, Platform, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import {
  activateTwoFactor,
  disableTwoFactor,
  getTwoFactorStatus,
  regenerateRecoveryCodes,
  setupTwoFactor,
  usePushSettings,
  useSession,
} from '@discordia/core'
import { useAuth } from '../../../providers/AppProviders'
import { makeStyles, useThemePreference, type ThemePreference } from '../../../theme'
import { ActionLink, BlockButton, Choice, SquareAvatar, Text, UnderlineInput } from '../../../ui'
import { Feedback, SettingsCell, SettingsRow, SettingsScreen, Switch, type SettingsSection } from '../SettingsScreen'

type Section = 'account' | 'experience'

// Voz y factura no se guardan todavía en el backend: en mobile se suman cuando lo hagan
const SECTIONS: SettingsSection<Section>[] = [
  { id: 'account', label: 'Cuenta' },
  { id: 'experience', label: 'Experiencia' },
]

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Sistema' },
]

interface UserSettingsScreenProps {
  visible: boolean
  onClose: () => void
  onEditProfile: () => void
  /** CERRAR SESIÓN en el menú: abre la confirmación de la app. */
  onLogout: () => void
}

/**
 * Ajustes de usuario en mobile: CUENTA (datos de la cuenta, contraseña y autenticación de dos factores)
 * y EXPERIENCIA (el tema de la app, guardado en el dispositivo, y el interruptor de push, guardado en la
 * cuenta), con CERRAR SESIÓN en el menú.
 */
export function UserSettingsScreen({ visible, onClose, onEditProfile, onLogout }: UserSettingsScreenProps) {
  const styles = useStyles()
  const { userProfile } = useAuth()
  const sessionProfile = useSession(s => s.profile)
  const theme = useThemePreference()
  const push = usePushSettings()
  const [pushError, setPushError] = useState<string | null>(null)
  const [section, setSection] = useState<Section>('account')
  const [revealEmail, setRevealEmail] = useState(false)
  const name = userProfile?.display_name || userProfile?.username || ''
  const email = userProfile?.email ?? ''
  // "p****@discordia.lol": el correo se muestra entero solo a pedido
  const maskedEmail = email.replace(/^(.)[^@]*/, (_, first: string) => `${first}****`)

  // Estado de 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [setupData, setSetupData] = useState<{ secret: string; qrCode: string; otpauthUrl: string } | null>(null)
  const [setupCode, setSetupCode] = useState('')
  const [setupError, setSetupError] = useState<string | null>(null)
  const [isActivating, setIsActivating] = useState(false)
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [copiedCodes, setCopiedCodes] = useState(false)
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [disableError, setDisableError] = useState<string | null>(null)
  const [isDisabling, setIsDisabling] = useState(false)

  const effectiveUserId =
    (userProfile?.id && userProfile.id !== 'temp_id' ? userProfile.id : '') ||
    userProfile?.user_id ||
    sessionProfile?.id ||
    sessionProfile?.user_id ||
    (sessionProfile as unknown as { sub?: string })?.sub ||
    ''
  const isGoogleUser = Boolean(
    effectiveUserId.startsWith('google-oauth2|') ||
    (sessionProfile as unknown as { sub?: string })?.sub?.startsWith('google-oauth2|')
  )

  useEffect(() => {
    if (!visible) return
    let mounted = true
    getTwoFactorStatus()
      .then(res => {
        if (mounted) {
          setTwoFactorEnabled(res.enabled)
        }
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [visible])

  const handleStartSetup = async () => {
    setSetupError(null)
    setSetupCode('')
    setIsSettingUp(true)
    try {
      const res = await setupTwoFactor()
      setSetupData({
        secret: res.secret,
        qrCode: res.qr_code,
        otpauthUrl: res.otpauth_url,
      })
    } catch {
      setSetupError('No se pudo generar la configuración de 2FA.')
    }
  }

  const handleCancelSetup = () => {
    setIsSettingUp(false)
    setSetupData(null)
    setSetupCode('')
    setSetupError(null)
  }

  const handleConfirmSetup = async () => {
    setSetupError(null)
    if (!setupCode.trim()) {
      setSetupError('Ingresá el código de 6 dígitos.')
      return
    }
    setIsActivating(true)
    try {
      const res = await activateTwoFactor(setupCode.trim())
      setTwoFactorEnabled(true)
      setBackupCodes(res.recovery_codes)
      setShowBackupCodes(true)
      setIsSettingUp(false)
      setSetupData(null)
      setSetupCode('')
    } catch (err: unknown) {
      const eObj = err as { detail?: string; message?: string }
      setSetupError(eObj?.detail || eObj?.message || 'Código de verificación incorrecto o expirado.')
    } finally {
      setIsActivating(false)
    }
  }

  const handleStartDisable = () => {
    setShowDisableConfirm(true)
    setDisablePassword('')
    setDisableError(null)
  }

  const handleCancelDisable = () => {
    setShowDisableConfirm(false)
    setDisablePassword('')
    setDisableError(null)
  }

  const handleConfirmDisable = async () => {
    setDisableError(null)
    if (!disablePassword.trim()) {
      setDisableError(
        isGoogleUser
          ? 'Ingresá el código de verificación o de recuperación.'
          : 'Ingresá tu contraseña actual.'
      )
      return
    }
    setIsDisabling(true)
    try {
      await disableTwoFactor(disablePassword.trim())
      setTwoFactorEnabled(false)
      setShowDisableConfirm(false)
      setBackupCodes([])
      setShowBackupCodes(false)
      setDisablePassword('')
    } catch (err: unknown) {
      const eObj = err as { detail?: string; message?: string }
      setDisableError(
        eObj?.detail ||
        eObj?.message ||
        (isGoogleUser
          ? 'Código de verificación o de recuperación incorrecto.'
          : 'La contraseña ingresada es incorrecta.')
      )
    } finally {
      setIsDisabling(false)
    }
  }

  const handleRegenerateCodes = async () => {
    try {
      const res = await regenerateRecoveryCodes()
      setBackupCodes(res.recovery_codes)
      setShowBackupCodes(true)
    } catch {
      // Ignorar fallo de regeneración
    }
  }

  const handleCopyBackupCodes = async () => {
    if (backupCodes.length === 0) return
    await Clipboard.setStringAsync(backupCodes.join('\n'))
    setCopiedCodes(true)
    setTimeout(() => setCopiedCodes(false), 2500)
  }

  return (
    <SettingsScreen
      visible={visible}
      title="Ajustes de usuario"
      identity={
        <View style={styles.identity}>
          <SquareAvatar user={{ username: userProfile?.username ?? '', displayName: name, avatar: userProfile?.avatar_url }} size={40} />
          <View style={styles.flex}>
            <Text variant="bodySmall" bold numberOfLines={1}>
              {name}
            </Text>
            <ActionLink onPress={onEditProfile}>editar perfil</ActionLink>
          </View>
        </View>
      }
      sections={SECTIONS}
      active={section}
      onSelect={setSection}
      actions={[{ label: 'Cerrar sesión', onPress: onLogout }]}
      onClose={onClose}
    >
      {section === 'account' && (
        <>
          <SettingsCell title="Información de la cuenta" index={0}>
            <UnderlineInput label="nombre de usuario" value={userProfile?.username ?? ''} disabled />
            {!!email && (
              <View>
                <UnderlineInput label="correo electrónico" value={revealEmail ? email : maskedEmail} disabled />
                <ActionLink onPress={() => setRevealEmail(v => !v)} style={styles.reveal}>
                  {revealEmail ? 'ocultar' : 'mostrar'}
                </ActionLink>
              </View>
            )}
          </SettingsCell>

          <SettingsCell title="Contraseña y seguridad" soon index={1}>
            <UnderlineInput label="contraseña" value="••••••••••" disabled />
          </SettingsCell>

          <SettingsCell title="Autenticación de dos factores" index={2}>
            {isSettingUp && setupData ? (
              <View style={styles.tfaBlock}>
                <View style={styles.qrBox}>
                  <Image
                    source={{ uri: setupData.qrCode }}
                    style={styles.qrImage}
                    accessibilityLabel="Código QR para autenticación"
                  />
                  <Text variant="meta" tone="muted" style={styles.secretText}>
                    Clave manual: {setupData.secret}
                  </Text>
                </View>
                <UnderlineInput
                  label="código de 6 dígitos"
                  required
                  value={setupCode}
                  onChangeText={setSetupCode}
                  placeholder="ej: 123456"
                  maxLength={6}
                  keyboardType="numeric"
                  error={setupError ?? undefined}
                  disabled={isActivating}
                />
                <View style={styles.actionsRow}>
                  <BlockButton loading={isActivating} onPress={handleConfirmSetup}>
                    Confirmar y activar /
                  </BlockButton>
                  <ActionLink onPress={handleCancelSetup}>cancelar</ActionLink>
                </View>
              </View>
            ) : showDisableConfirm ? (
              <View style={styles.tfaBlock}>
                {isGoogleUser ? (
                  <>
                    <Text variant="meta" tone="muted">
                      / Al haber ingresado con Google tu cuenta no usa contraseña. Confirmá la desactivación con el código de tu app autenticadora o un código de recuperación.
                    </Text>
                    <UnderlineInput
                      label="código de verificación o recuperación"
                      required
                      value={disablePassword}
                      onChangeText={setDisablePassword}
                      placeholder="ej: 123456 o A1B2-C3D4"
                      autoCapitalize="none"
                      error={disableError ?? undefined}
                      disabled={isDisabling}
                    />
                  </>
                ) : (
                  <>
                    <Text variant="meta" tone="muted">
                      / Confirmá la desactivación con tu contraseña actual, tu código de 6 dígitos o un código de recuperación.
                    </Text>
                    <UnderlineInput
                      label="contraseña actual"
                      required
                      secret
                      value={disablePassword}
                      onChangeText={setDisablePassword}
                      placeholder="contraseña o código A1B2-C3D4"
                      autoCapitalize="none"
                      error={disableError ?? undefined}
                      disabled={isDisabling}
                    />
                  </>
                )}
                <View style={styles.actionsRow}>
                  <BlockButton tone="danger" loading={isDisabling} onPress={handleConfirmDisable}>
                    Confirmar desactivación /
                  </BlockButton>
                  <ActionLink onPress={handleCancelDisable}>cancelar</ActionLink>
                </View>
              </View>
            ) : twoFactorEnabled ? (
              <View style={styles.tfaBlock}>
                <SettingsRow
                  title="activada/"
                  description="Tu cuenta pide un código además de la contraseña."
                >
                  <ActionLink onPress={handleStartDisable}>desactivar 2fa</ActionLink>
                </SettingsRow>
                <SettingsRow
                  title="códigos de recuperación"
                  description="Códigos de un solo uso por si perdés tu app de autenticación."
                >
                  <ActionLink onPress={() => setShowBackupCodes(v => !v)}>
                    {showBackupCodes ? 'ocultar códigos' : 'mostrar códigos'}
                  </ActionLink>
                </SettingsRow>
                {showBackupCodes && (
                  <View style={styles.backupCodesBox}>
                    {backupCodes.length > 0 ? (
                      <>
                        <View style={styles.codesGrid}>
                          {backupCodes.map(code => (
                            <Text key={code} variant="bodySmall" bold style={styles.codeItem}>
                              {code}
                            </Text>
                          ))}
                        </View>
                        <View style={styles.codesActions}>
                          <ActionLink onPress={handleCopyBackupCodes}>
                            {copiedCodes ? 'copiados' : 'copiar todos'}
                          </ActionLink>
                          <ActionLink onPress={handleRegenerateCodes}>
                            regenerar lista
                          </ActionLink>
                        </View>
                      </>
                    ) : (
                      <View style={styles.codesActions}>
                        <ActionLink onPress={handleRegenerateCodes}>
                          regenerar lista
                        </ActionLink>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ) : (
              <SettingsRow
                title="desactivada/"
                description="Tu cuenta pide solo la contraseña al entrar."
              >
                <ActionLink onPress={handleStartSetup}>activar 2fa</ActionLink>
              </SettingsRow>
            )}
          </SettingsCell>
        </>
      )}

      {section === 'experience' && (
        <>
          <SettingsCell title="Tema" index={0}>
            <Choice label="Tema" options={THEME_OPTIONS} value={theme.preference} onChange={theme.setPreference} />
            <Text variant="meta" tone="muted">
              / Sistema sigue el modo claro u oscuro del teléfono. Se guarda en este dispositivo.
            </Text>
          </SettingsCell>

          <SettingsCell title="Notificaciones" index={1}>
            <SettingsRow
              title="Notificaciones push"
              description="Avisos con la app cerrada, en todos tus dispositivos. La bandeja avisa igual."
            >
              <Switch
                label="Notificaciones push"
                checked={push.pushEnabled}
                disabled={push.isLoading}
                onChange={next => {
                  setPushError(null)
                  push.setPushEnabled(next).catch(() => setPushError('No se pudo guardar. Probá de nuevo.'))
                }}
              />
            </SettingsRow>
            {pushError && <Feedback tone="error">{pushError}</Feedback>}
          </SettingsCell>
        </>
      )}
    </SettingsScreen>
  )
}

const useStyles = makeStyles(t => ({
  identity: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
  flex: { flex: 1, gap: 2 },
  reveal: { alignSelf: 'flex-end', marginTop: t.space[1] },
  tfaBlock: { gap: t.space[4] },
  qrBox: {
    alignItems: 'center',
    gap: t.space[3],
    padding: t.space[4],
    borderWidth: t.lines.hairline,
    borderColor: t.colors.lineStrong,
    backgroundColor: '#ffffff',
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  secretText: {
    textAlign: 'center',
    color: '#000000',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[4],
  },
  backupCodesBox: {
    gap: t.space[3],
    padding: t.space[4],
    borderWidth: t.lines.hairline,
    borderColor: t.colors.lineStrong,
  },
  codesGrid: {
    gap: t.space[2],
  },
  codeItem: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    letterSpacing: 1,
  },
  codesActions: {
    flexDirection: 'row',
    gap: t.space[4],
  },
}))
