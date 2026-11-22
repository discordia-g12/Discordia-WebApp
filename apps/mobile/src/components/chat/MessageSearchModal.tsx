import React, { useMemo } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import {
  MESSAGE_SEARCH_MAX_LENGTH,
  formatMessageTime,
  mentionsToText,
  useChannelMessageSearch,
  useMessageSearch,
  useRolesQuery,
  useServerMembersQuery,
  type Message,
  type Role,
} from '@discordia/core'
import { makeStyles } from '../../theme'
import { ActionLink, EmptyState, Modal, ModalActions, ModalForm, Skeleton, SquareAvatar, Text, UnderlineInput } from '../../ui'
import { useUserDisplay } from '../../hooks/useUserProfiles'
import type { Channel } from '../../types'

interface MessageSearchModalProps {
  visible: boolean
  serverId: string
  serverName: string
  /** Canales del servidor, para mostrar en cuál está cada resultado. */
  channels: Channel[]
  onClose: () => void
  /** Se eligió un resultado: abrir su canal. */
  onOpenMessage: (message: Message) => void
}

/**
 * Búsqueda de mensajes del servidor (ADR-04 de Chat-Engine), como la de la web: texto, autor entre los
 * miembros y resultados del más nuevo al más viejo. La lógica es la de useMessageSearch de core.
 */
export default function MessageSearchModal({ visible, serverId, serverName, channels, onClose, onOpenMessage }: MessageSearchModalProps) {
  const search = useMessageSearch(visible ? serverId : null)
  const { data: membersData } = useServerMembersQuery(visible ? serverId : null)
  const { data: roles } = useRolesQuery(visible ? serverId : null)
  const memberIds = useMemo(() => membersData?.pages.flatMap(p => p.items.map(m => m.userId)) ?? [], [membersData])

  return (
    <SearchDialog
      visible={visible}
      search={search}
      description={`en ${serverName}`}
      scopeHint="en los canales que podés ver"
      authorIds={memberIds}
      channels={channels}
      roles={roles ?? []}
      onClose={onClose}
      onOpenMessage={onOpenMessage}
    />
  )
}

interface DmMessageSearchModalProps {
  visible: boolean
  /** `dm-…` de la conversación abierta. */
  conversationId: string
  currentUserId: string
  otherUserId: string
  otherName: string
  onClose: () => void
  /** Se eligió un resultado: ir a ese mensaje en el chat (el mismo salto de los fijados). */
  onOpenMessage: (message: Message) => void
}

/** Búsqueda dentro del DM abierto: el filtro por autor son los dos participantes. */
export function DmMessageSearchModal({ visible, conversationId, currentUserId, otherUserId, otherName, onClose, onOpenMessage }: DmMessageSearchModalProps) {
  const search = useChannelMessageSearch(visible ? conversationId : null)
  // Chat-Engine toma el id de quien busca como su id canónico, el que guardan sus mensajes del DM
  const authorIds = useMemo(() => [currentUserId, otherUserId], [currentUserId, otherUserId])

  return (
    <SearchDialog
      visible={visible}
      search={search}
      description={`en tu conversación con ${otherName}`}
      scopeHint="en esta conversación"
      authorIds={authorIds}
      roles={[]}
      onClose={onClose}
      onOpenMessage={onOpenMessage}
    />
  )
}

interface SearchDialogProps {
  visible: boolean
  search: ReturnType<typeof useMessageSearch>
  /** Bajada del título: dónde se busca. */
  description: string
  /** Final del estado vacío: "en los canales que podés ver", "en esta conversación". */
  scopeHint: string
  /** Opciones del filtro por autor. */
  authorIds: string[]
  /** Canales del servidor, para mostrar en cuál está cada resultado. Sin esto (DM) no se muestra el canal. */
  channels?: Channel[]
  roles: Role[]
  onClose: () => void
  onOpenMessage: (message: Message) => void
}

/** Formulario (texto y autor), resultados del más nuevo al más viejo y "cargar más", en servidor o DM. */
function SearchDialog({ visible, search, description, scopeHint, authorIds, channels, roles, onClose, onOpenMessage }: SearchDialogProps) {
  const styles = useStyles()

  // Nombre y avatar de autores posibles, de los resultados y de los mencionados (los que la app no conoce se
  // piden al backend)
  const describeUser = useUserDisplay([
    ...authorIds,
    ...search.messages.flatMap(m => [m.authorId, ...(m.mentions?.users ?? [])]),
  ])
  const authors = useMemo(
    () =>
      authorIds
        .map(id => ({ id, name: describeUser(id).name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [authorIds, describeUser],
  )

  const channelName = (id: string) => channels?.find(ch => ch.id === id)?.name ?? 'canal'
  const names = {
    user: (id: string) => describeUser(id).name,
    role: (id: string) => roles.find(r => r.id === id)?.name ?? 'rol-eliminado',
  }

  const close = () => {
    search.clear()
    onClose()
  }

  const submitted = search.submitted
  const emptyHint = submitted
    ? [
        submitted.query ? `ningún mensaje contiene "${submitted.query}"` : 'no hay mensajes',
        submitted.authorId ? `de ${describeUser(submitted.authorId).name}` : null,
        scopeHint,
      ]
        .filter(Boolean)
        .join(' ')
    : undefined

  return (
    <Modal visible={visible} title="Buscar mensajes" description={description} onClose={close}>
      <ModalForm>
        <UnderlineInput
          label="texto"
          value={search.query}
          onChangeText={search.setQuery}
          placeholder="qué querés encontrar"
          maxLength={MESSAGE_SEARCH_MAX_LENGTH}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={search.submit}
        />

        <View style={styles.authorField}>
          <Text variant="meta" bold>
            autor
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {[{ id: null, name: 'cualquiera' }, ...authors].map(author => {
              const active = search.authorId === author.id
              return (
                <Pressable
                  key={author.id ?? 'any'}
                  onPress={() => search.setAuthorId(author.id)}
                  style={[styles.chip, active && styles.chipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={author.id ? `Mensajes de ${author.name}` : 'De cualquier autor'}
                >
                  <Text variant="meta" bold={active} style={active ? styles.chipTextActive : styles.chipText}>
                    {author.name}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </View>

        <ModalActions
          submitLabel="Buscar"
          onSubmit={search.submit}
          onCancel={submitted ? search.clear : undefined}
          loading={search.isLoading}
          disabled={!search.canSubmit}
        />
      </ModalForm>

      <View style={styles.results} accessibilityLiveRegion="polite">
        {!submitted ? null : search.isLoading ? (
          <Skeleton lines={4} label="Buscando mensajes" />
        ) : search.error ? (
          <View style={styles.errorBox}>
            <EmptyState title="no se pudo buscar" hint={search.errorMessage ?? undefined} />
            <ActionLink onPress={() => search.refetch()}>reintentar</ActionLink>
          </View>
        ) : search.isEmpty ? (
          <EmptyState title="sin resultados" hint={emptyHint} />
        ) : (
          <>
            {search.messages.map(message => {
              const author = describeUser(message.authorId)
              return (
                <Pressable
                  key={message.id}
                  style={styles.result}
                  onPress={() => {
                    // En iOS un modal no se presenta encima de otro: se cierra antes de abrir el canal
                    close()
                    onOpenMessage(message)
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    channels
                      ? `Ir al mensaje de ${author.name} en •${channelName(message.channelId)}`
                      : `Ir al mensaje de ${author.name}`
                  }
                >
                  <SquareAvatar user={{ displayName: author.name, username: message.authorId, avatar: author.avatar }} size="sm" />
                  <View style={styles.resultBody}>
                    <Text variant="meta" tone="muted" numberOfLines={1}>
                      <Text variant="meta" bold>
                        {author.name}
                      </Text>
                      {`${channels ? `  •${channelName(message.channelId)}` : ''}  ${formatMessageTime(message.timestamp)}`}
                    </Text>
                    <Text variant="bodySmall" numberOfLines={3}>
                      {message.content
                        ? mentionsToText(message.content, names)
                        : message.attachments?.length
                          ? `/ ${message.attachments.length} adjunto(s)`
                          : ''}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
            {search.hasNextPage && (
              <ActionLink onPress={() => search.loadMore()} disabled={search.isFetchingNextPage}>
                {search.isFetchingNextPage ? 'cargando resultados…' : 'cargar más resultados /'}
              </ActionLink>
            )}
          </>
        )}
      </View>
    </Modal>
  )
}

const useStyles = makeStyles(t => ({
  authorField: { gap: t.space[2] },
  chips: { gap: t.space[2], paddingVertical: t.space[1] },
  chip: {
    paddingVertical: t.space[1],
    paddingHorizontal: t.space[3],
    borderWidth: t.lines.hairline,
    borderColor: t.colors.lineStrong,
  },
  chipActive: { backgroundColor: t.colors.inverseBackground, borderColor: t.colors.inverseBackground },
  chipText: { color: t.colors.textMuted },
  chipTextActive: { color: t.colors.inverseText },
  results: { gap: t.space[2], marginTop: t.space[5] },
  result: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.space[3],
    paddingVertical: t.space[3],
    borderBottomWidth: t.lines.hairline,
    borderBottomColor: t.colors.line,
  },
  resultBody: { flex: 1, gap: t.space[1] },
  errorBox: { gap: t.space[2] },
}))
