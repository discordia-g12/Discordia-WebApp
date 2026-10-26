import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import { joinServerViaInvite } from '@discordia/core'
import { useData, useUI } from '../../providers/AppProviders'
import { makeStyles } from '../../theme'
import { ActionLink, Modal, ModalActions, ModalForm, Text, UnderlineInput } from '../../ui'
import type { Server } from '../../types'

interface CreateServerModalProps {
  visible: boolean
  onClose: () => void
  onSuccess?: (server: Server) => void
  /** join: abre directo en "unirse con una invitación". */
  initialMode?: 'create' | 'join'
}

/** Crear un servidor (solo el nombre) o unirse a uno con el código de una invitación. */
export default function CreateServerModal({ visible, onClose, onSuccess, initialMode = 'create' }: CreateServerModalProps) {
  const styles = useStyles()
  const { createServer, refreshServers } = useData()
  const { selectServer, selectChannel, showToast } = useUI()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(initialMode === 'join')
  const [inviteCode, setInviteCode] = useState('')

  useEffect(() => {
    if (visible) setIsJoining(initialMode === 'join')
  }, [visible, initialMode])

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('El nombre del servidor no puede estar vacío.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const server = await createServer(trimmed)
      setName('')
      onClose()
      selectServer(server.id)
      if (server.channels && server.channels.length > 0) selectChannel(server.channels[0].id)
      showToast(`Servidor ${server.name} creado`, 'success')
      onSuccess?.(server)
    } catch (err) {
      setError((err instanceof Error && err.message) || 'Error al crear el servidor. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    const trimmed = inviteCode.trim()
    if (!trimmed) {
      setError('El código no puede estar vacío.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await joinServerViaInvite(trimmed)
      await refreshServers()
      setInviteCode('')
      onClose()
      selectServer(res.server_id)
      showToast('Te uniste al servidor', 'success')
    } catch (err) {
      // El modal sigue abierto: el error queda en el campo
      setError((err instanceof Error && err.message) || 'Código inválido o expirado.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    setError(null)
    setName('')
    setInviteCode('')
    onClose()
  }

  const switchMode = (join: boolean) => {
    setError(null)
    setIsJoining(join)
  }

  return (
    <Modal
      visible={visible}
      title={isJoining ? 'Unirse' : 'Crear servidor'}
      description={
        isJoining
          ? 'Ingresá el código de invitación para entrar a una comunidad.'
          : 'Tu servidor es donde se juntan tus amigos. Dale un nombre para empezar.'
      }
      onClose={handleClose}
    >
      <ModalForm>
        {isJoining ? (
          <UnderlineInput
            key="join"
            label="código de invitación"
            required
            value={inviteCode}
            onChangeText={t => {
              setInviteCode(t)
              if (error) setError(null)
            }}
            placeholder="ej: xyz123"
            autoCapitalize="none"
            autoFocus
            error={error ?? undefined}
            disabled={loading}
            returnKeyType="go"
            onSubmitEditing={handleJoin}
          />
        ) : (
          <>
            <UnderlineInput
              key="create"
              label="nombre del servidor"
              required
              value={name}
              onChangeText={t => {
                setName(t)
                if (error) setError(null)
              }}
              placeholder="ej: Torton"
              maxLength={100}
              autoFocus
              error={error ?? undefined}
              disabled={loading}
              returnKeyType="go"
              onSubmitEditing={handleCreate}
            />
            {/* Server-Roles recibe el ícono y lo descarta: no se ofrece hasta que se guarde */}
            <Text variant="meta" tone="muted">
              / ícono del servidor: próximamente
            </Text>
          </>
        )}
        <ModalActions
          submitLabel={isJoining ? 'Unirse' : 'Crear'}
          onSubmit={isJoining ? handleJoin : handleCreate}
          onCancel={handleClose}
          loading={loading}
          disabled={isJoining ? !inviteCode.trim() : !name.trim()}
        />
        <View style={styles.switch}>
          {isJoining ? (
            <ActionLink onPress={() => switchMode(false)}>crear un servidor nuevo</ActionLink>
          ) : (
            <ActionLink onPress={() => switchMode(true)}>unirme con una invitación</ActionLink>
          )}
        </View>
      </ModalForm>
    </Modal>
  )
}

const useStyles = makeStyles(t => ({
  switch: { paddingTop: t.space[2], borderTopWidth: t.lines.hairline, borderTopColor: t.colors.line },
}))
