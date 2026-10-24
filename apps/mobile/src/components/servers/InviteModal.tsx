import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { createInvite } from '@discordia/core'
import { useUI } from '../../providers/AppProviders'
import { makeStyles } from '../../theme'
import { ActionLink, Choice, Modal, ModalForm, Skeleton, Text } from '../../ui'
import type { Server } from '../../types'

interface InviteModalProps {
  visible: boolean
  server?: Server
  onClose: () => void
}

// Las mismas opciones que la web
const EXPIRATION_OPTIONS = [
  { value: '1800', label: '30 min' },
  { value: '3600', label: '1 h' },
  { value: '21600', label: '6 h' },
  { value: '43200', label: '12 h' },
  { value: '86400', label: '1 día' },
  { value: '604800', label: '7 días' },
  { value: '0', label: 'nunca' },
]

const MAX_USES_OPTIONS = [
  { value: '0', label: 'sin límite' },
  { value: '1', label: '1' },
  { value: '5', label: '5' },
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
]

type LinkState = { status: 'loading' } | { status: 'ready'; code: string } | { status: 'error' }

/**
 * Invitar al servidor, como en la web: el código se genera al abrir; cambiar el vencimiento o los usos
 * ofrece generar otro (así no quedan invitaciones de más: todavía no se pueden listar ni revocar).
 */
export default function InviteModal({ visible, server, onClose }: InviteModalProps) {
  const styles = useStyles()
  const { showToast } = useUI()
  const [expiration, setExpiration] = useState('604800')
  const [maxUses, setMaxUses] = useState('0')
  const [link, setLink] = useState<LinkState>({ status: 'loading' })
  const [generatedWith, setGeneratedWith] = useState({ expiration, maxUses })

  const generate = async () => {
    if (!server) return
    setLink({ status: 'loading' })
    try {
      const { code } = await createInvite(server.id, { maxUses: Number(maxUses), expiresInSeconds: Number(expiration) })
      setLink({ status: 'ready', code })
      setGeneratedWith({ expiration, maxUses })
    } catch {
      setLink({ status: 'error' })
    }
  }

  useEffect(() => {
    if (visible) generate()
    // Solo al abrir: después se genera a pedido
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const stale = link.status === 'ready' && (generatedWith.expiration !== expiration || generatedWith.maxUses !== maxUses)
  const expirationLabel = EXPIRATION_OPTIONS.find(o => o.value === generatedWith.expiration)?.label
  const usesLabel = MAX_USES_OPTIONS.find(o => o.value === generatedWith.maxUses)?.label

  const copy = async () => {
    if (link.status !== 'ready') return
    await Clipboard.setStringAsync(link.code)
    showToast('Código copiado', 'success')
  }

  if (!server) return null

  return (
    <Modal visible={visible} title="Invitar" description={`Compartí el código para que entren a ${server.name}.`} onClose={onClose}>
      <ModalForm>
        <View style={styles.code}>
          {link.status === 'loading' ? (
            <Skeleton lines={1} label="Generando la invitación" />
          ) : link.status === 'error' ? (
            <Text variant="bodySmall" bold accessibilityRole="alert">
              / No se pudo generar la invitación.
            </Text>
          ) : (
            <Text variant="heading" selectable accessibilityLabel={`Código de invitación ${link.code}`}>
              {link.code}
            </Text>
          )}
        </View>
        {link.status === 'ready' && (
          <Text variant="meta" tone="muted">
            / vence en {expirationLabel} · usos: {usesLabel}
          </Text>
        )}
        <View style={styles.links}>
          {link.status === 'ready' && !stale && <ActionLink onPress={copy}>copiar</ActionLink>}
          {(stale || link.status === 'error') && (
            <ActionLink onPress={generate}>{link.status === 'error' ? 'reintentar' : 'generar otro código'}</ActionLink>
          )}
        </View>
        <View style={styles.field}>
          <Text variant="label">Vence en /</Text>
          <Choice label="Vence en" options={EXPIRATION_OPTIONS} value={expiration} onChange={setExpiration} />
        </View>
        <View style={styles.field}>
          <Text variant="label">Usos máximos /</Text>
          <Choice label="Usos máximos" options={MAX_USES_OPTIONS} value={maxUses} onChange={setMaxUses} />
        </View>
      </ModalForm>
    </Modal>
  )
}

const useStyles = makeStyles(t => ({
  code: {
    minHeight: t.space[7],
    justifyContent: 'center',
    paddingHorizontal: t.space[5],
    borderTopWidth: t.lines.hairline,
    borderBottomWidth: t.lines.hairline,
    borderColor: t.colors.lineStrong,
  },
  links: { flexDirection: 'row', gap: t.space[5] },
  field: { gap: t.space[2] },
}))
