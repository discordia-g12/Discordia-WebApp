import React from 'react'
import { View } from 'react-native'
import {
  notificationLevelLabel,
  useNotificationPreference,
  type NotificationLevel,
  type NotificationPreferenceTarget,
} from '@discordia/core'
import { useUI } from '../../providers/AppProviders'
import { makeStyles } from '../../theme'
import { Choice, Modal, Skeleton, Text } from '../../ui'
import { fromLevelChoice, toLevelChoice, type NotificationLevelChoice } from '../../utils/notifications'

interface NotificationLevelModalProps {
  /** null: cerrado. */
  target: NotificationPreferenceTarget | null
  /** "el servidor Equipo", "#general", "Ana": va en la bajada. */
  name: string
  onClose: () => void
}

const LEVELS: NotificationLevel[] = ['all', 'mentions', 'none']

/**
 * Qué avisos llegan de un servidor, canal o DM (ADR 0017): Todos / Solo menciones / Nada / Heredar. Se guarda
 * al elegir (optimista); si falla vuelve a lo de antes y avisa.
 */
export function NotificationLevelModal({ target, name, onClose }: NotificationLevelModalProps) {
  return (
    <Modal visible={!!target} title="Notificaciones" description={name} onClose={onClose}>
      {target && <LevelPicker target={target} />}
    </Modal>
  )
}

function LevelPicker({ target }: { target: NotificationPreferenceTarget }) {
  const styles = useStyles()
  const { showToast } = useUI()
  const pref = useNotificationPreference(target)
  const inherited = pref.inherited.level

  if (pref.isLoading) return <Skeleton lines={2} label="Cargando preferencias" />

  const choose = (choice: NotificationLevelChoice) => {
    pref.setLevel(fromLevelChoice(choice)).catch(() => showToast('No se pudo guardar la preferencia', 'error'))
  }

  return (
    <View style={styles.body}>
      <Choice
        label="Nivel de notificaciones"
        value={toLevelChoice(pref.level)}
        onChange={choose}
        options={[
          ...LEVELS.map(level => ({ value: level, label: notificationLevelLabel(level), disabled: pref.isSaving })),
          { value: 'inherit' as const, label: `Heredar (${notificationLevelLabel(inherited)})`, disabled: pref.isSaving },
        ]}
      />
      {(pref.muted || pref.effective.muted) && (
        <Text variant="meta" tone="muted">
          silenciado: no llegan avisos aunque elijas un nivel
        </Text>
      )}
    </View>
  )
}

const useStyles = makeStyles(t => ({
  body: { gap: t.space[3] },
}))
