import React, { useState } from 'react'
import { View } from 'react-native'
import { useBlocksQuery, useFriendRequestsQuery, useFriendsQuery } from '@discordia/core'
import { makeStyles } from '../../theme'
import { Tabs } from '../../ui'
import type { Message } from '../../types'
import { Screen } from '../shell/ShellScreen'
import { AddFriendForm } from './AddFriendForm'
import { BlockedList } from './BlockedList'
import DmChatScreen from './DmChatScreen'
import { DmList } from './DmList'
import { FriendsList } from './FriendsList'
import { PendingRequests } from './PendingRequests'

type Section = 'chats' | 'all' | 'pending' | 'blocked' | 'add'

interface FriendsTabProps {
  /** El usuario del chat abierto; null: las listas. */
  openUserId: string | null
  inboxConnected: boolean
  onOpenChat: (userId: string) => void
  onCloseChat: () => void
  onOpenProfile: (userId: string) => void
  onLongPressMessage?: (message: Message) => void
}

/** Pestaña Amigos: la lista de chats y, en sus secciones, Todos, Pendiente, Bloqueado y Añadir. O un chat abierto. */
export default function FriendsTab({ openUserId, inboxConnected, onOpenChat, onCloseChat, onOpenProfile, onLongPressMessage }: FriendsTabProps) {
  const styles = useStyles()
  // Acá y no en cada lista: al volver de un chat, se sigue en la misma sección
  const [section, setSection] = useState<Section>('chats')
  const { data: friends } = useFriendsQuery()
  const { data: requests } = useFriendRequestsQuery()
  const { data: blocks } = useBlocksQuery()

  if (openUserId) {
    return (
      <DmChatScreen
        key={openUserId}
        userId={openUserId}
        inboxConnected={inboxConnected}
        onBack={onCloseChat}
        onOpenProfile={onOpenProfile}
        onLongPressMessage={onLongPressMessage}
      />
    )
  }

  const pendingCount = requests ? requests.incoming.length + requests.outgoing.length : undefined
  const listProps = { onOpenChat, onOpenProfile }

  return (
    <Screen title="Amigos" scroll={false}>
      <View style={styles.tabs}>
        <Tabs<Section>
          label="Secciones de Amigos"
          value={section}
          onChange={setSection}
          items={[
            { value: 'chats', label: 'Chats' },
            { value: 'all', label: 'Todos', count: friends?.length },
            { value: 'pending', label: 'Pendiente', count: pendingCount },
            { value: 'blocked', label: 'Bloqueado', count: blocks?.length },
            { value: 'add', label: 'Añadir' },
          ]}
        />
      </View>
      {section === 'chats' && <DmList {...listProps} />}
      {section === 'all' && <FriendsList {...listProps} />}
      {section === 'pending' && <PendingRequests {...listProps} />}
      {section === 'blocked' && <BlockedList onOpenProfile={onOpenProfile} />}
      {section === 'add' && <AddFriendForm />}
    </Screen>
  )
}

const useStyles = makeStyles(t => ({
  tabs: {
    paddingTop: t.space[2],
    paddingHorizontal: t.space[4],
    borderBottomWidth: t.lines.hairline,
    borderBottomColor: t.colors.line,
  },
}))
