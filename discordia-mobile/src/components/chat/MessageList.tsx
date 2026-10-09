import React, { useEffect, useRef } from 'react'
import { FlatList, Keyboard, Platform } from 'react-native'
import { spacing } from '../../theme'
import type { Message } from '../../types'
import type { UserDisplay } from '../../hooks/useUserProfiles'
import MessageItem from './MessageItem'

interface MessageListProps {
    messages: Message[]
    describeUser: (userId: string) => UserDisplay
}

// Lista de mensajes
export default function MessageList({ messages, describeUser }: MessageListProps) {
    const listRef = useRef<FlatList<Message>>(null)

    // Al abrirse el teclado, volver a mostrar el ultimo mensaje
    useEffect(() => {
        const eventName = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
        const sub = Keyboard.addListener(eventName, () => {
            setTimeout(() => {
                listRef.current?.scrollToEnd({ animated: true })
            }, 100)
        })
        return () => sub.remove()
    }, [])

    return (
        <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => <MessageItem message={item} author={describeUser(item.userId)} />}
        />
    )
}