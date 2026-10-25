import React, { useState } from 'react'
import { View } from 'react-native'
import { useAuth } from '../../../providers/AppProviders'
import { makeStyles, useThemePreference, type ThemePreference } from '../../../theme'
import { ActionLink, Choice, SquareAvatar, Text, UnderlineInput } from '../../../ui'
import { SettingsCell, SettingsRow, SettingsScreen, Switch, type SettingsSection } from '../SettingsScreen'

type Section = 'account' | 'experience'

// Notificaciones, voz y factura no se guardan todavía en el backend: en mobile se suman cuando lo hagan
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
 * Ajustes de usuario, como los de la web (paso 9a) en pantalla chica: CUENTA (los datos de la cuenta;
 * contraseña y dos factores, "próximamente") y EXPERIENCIA (el tema de la app, guardado en el dispositivo),
 * con CERRAR SESIÓN en el menú.
 */
export function UserSettingsScreen({ visible, onClose, onEditProfile, onLogout }: UserSettingsScreenProps) {
  const styles = useStyles()
  const { userProfile } = useAuth()
  const theme = useThemePreference()
  const [section, setSection] = useState<Section>('account')
  const [revealEmail, setRevealEmail] = useState(false)
  const name = userProfile?.display_name || userProfile?.username || ''
  const email = userProfile?.email ?? ''
  // "p****@discordia.lol": el correo se muestra entero solo a pedido
  const maskedEmail = email.replace(/^(.)[^@]*/, (_, first: string) => `${first}****`)

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
            <SettingsRow title="autenticación en dos pasos" description="Un código además de la contraseña.">
              <Switch label="Autenticación en dos pasos" checked={false} onChange={() => {}} disabled />
            </SettingsRow>
          </SettingsCell>
        </>
      )}

      {section === 'experience' && (
        <SettingsCell title="Tema" index={0}>
          <Choice label="Tema" options={THEME_OPTIONS} value={theme.preference} onChange={theme.setPreference} />
          <Text variant="meta" tone="muted">
            / Sistema sigue el modo claro u oscuro del teléfono. Se guarda en este dispositivo.
          </Text>
        </SettingsCell>
      )}
    </SettingsScreen>
  )
}

const useStyles = makeStyles(t => ({
  identity: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
  flex: { flex: 1, gap: 2 },
  reveal: { alignSelf: 'flex-end', marginTop: t.space[1] },
}))
