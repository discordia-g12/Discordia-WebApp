import React, { useRef, useState, type ComponentRef } from 'react'
import { Pressable, ScrollView, Text as RNText, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { EMOJI_CATEGORIES, QUICK_EMOJIS } from '@discordia/core'
import { makeStyles } from '../../theme'
import { ActionLink, Modal, ModalForm, Text } from '../../ui'
import type { Message } from '../../types'
import { useUI } from '../../providers/AppProviders'

interface MessageActionsModalProps {
  visible: boolean
  message: Message | null
  isAuthor: boolean
  canManageMessages?: boolean
  canAddReactions?: boolean
  onToggleReaction?: (messageId: string, emoji: string) => void
  onEdit: () => void
  onReply?: () => void
  onDelete?: () => void
  onClose: () => void
}

/** Menú contextual de acciones sobre un mensaje (mantener presionado en mobile). */
export default function MessageActionsModal({
  visible,
  message,
  isAuthor,
  canManageMessages = false,
  canAddReactions = true,
  onToggleReaction,
  onEdit,
  onReply,
  onDelete,
  onClose,
}: MessageActionsModalProps) {
  const styles = useStyles()
  const { showToast } = useUI()
  const [showPicker, setShowPicker] = useState(false)
  const scrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null)
  const categoryOffsets = useRef<Record<string, number>>({})

  const isPickerOpen = visible && showPicker
  const handleClose = () => {
    setShowPicker(false)
    onClose()
  }

  const handleJumpToCategory = (catId: string) => {
    const y = categoryOffsets.current[catId]
    if (typeof y === 'number') {
      scrollRef.current?.scrollTo({ y, animated: true })
    }
  }

  if (!message) return null

  const canDelete = Boolean(onDelete && (isAuthor || canManageMessages))

  const handleCopy = async () => {
    if (message.content) {
      await Clipboard.setStringAsync(message.content)
      showToast('Texto copiado al portapapeles', 'info')
    }
    handleClose()
  }

  return (
    <Modal
      visible={visible}
      title={isPickerOpen ? 'Emojis' : 'Mensaje'}
      onClose={handleClose}
      scrollRef={scrollRef}
      pinnedHeader={
        isPickerOpen ? (
          <View style={styles.pinnedHeader}>
            <View style={styles.pickerHeader}>
              <ActionLink size="bodySmall" onPress={() => setShowPicker(false)}>
                ← volver a acciones
              </ActionLink>
            </View>
            <View style={styles.categoryNav}>
              {EMOJI_CATEGORIES.map(cat => (
                <Pressable
                  key={cat.id}
                  style={styles.categoryNavButton}
                  onPress={() => handleJumpToCategory(cat.id)}
                  accessibilityRole="button"
                  accessibilityLabel={cat.name}
                >
                  <RNText style={styles.categoryNavIcon}>{cat.icon}</RNText>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null
      }
    >
      <ModalForm>
        {isPickerOpen ? (
          <View style={styles.pickerContent}>
            {EMOJI_CATEGORIES.map(cat => (
              <View
                key={cat.id}
                style={styles.categoryBlock}
                onLayout={e => {
                  categoryOffsets.current[cat.id] = e.nativeEvent.layout.y
                }}
              >
                  <Text variant="meta" tone="muted" style={styles.categoryTitle}>
                    {cat.name}
                  </Text>
                  {cat.isPlaceholder ? (
                    <Text variant="meta" tone="muted" style={styles.placeholderText}>
                      {cat.description}
                    </Text>
                  ) : (
                    <View style={styles.emojiGrid}>
                      {cat.emojis.map(emoji => (
                        <Pressable
                          key={emoji}
                          style={styles.gridEmojiButton}
                          onPress={() => {
                            onToggleReaction?.(message.id, emoji)
                            handleClose()
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={emoji}
                        >
                          <RNText style={styles.gridEmojiText}>{emoji}</RNText>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
        ) : (
          <>
            {canAddReactions && (
              <View style={styles.quickEmojisRow}>
                {QUICK_EMOJIS.map(emoji => (
                  <Pressable
                    key={emoji}
                    style={styles.quickEmojiButton}
                    onPress={() => {
                      onToggleReaction?.(message.id, emoji)
                      handleClose()
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Reaccionar con ${emoji}`}
                  >
                    <RNText style={styles.quickEmojiText}>{emoji}</RNText>
                  </Pressable>
                ))}
                <Pressable
                  style={styles.quickEmojiMore}
                  onPress={() => setShowPicker(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Más reacciones"
                >
                  <Text style={styles.quickEmojiMoreText}>+</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.preview}>
              <Text variant="bodySmall" tone="muted" numberOfLines={3} style={styles.content}>
                “{message.content}”
              </Text>
            </View>

            <View style={styles.actionsList}>
              {canAddReactions && (
                <ActionLink size="bodySmall" onPress={() => setShowPicker(true)}>
                  reaccionar con emoji
                </ActionLink>
              )}

              {!!message.content && (
                <ActionLink size="bodySmall" onPress={handleCopy}>
                  copiar texto
                </ActionLink>
              )}

              {onReply && (
                <ActionLink
                  size="bodySmall"
                  onPress={() => {
                    onReply()
                    handleClose()
                  }}
                >
                  responder
                </ActionLink>
              )}

              {isAuthor && (
                <ActionLink
                  size="bodySmall"
                  onPress={() => {
                    handleClose()
                    onEdit()
                  }}
                >
                  editar mensaje
                </ActionLink>
              )}

              {canDelete && (
                <ActionLink
                  size="bodySmall"
                  style={styles.deleteLink}
                  onPress={() => {
                    handleClose()
                    onDelete?.()
                  }}
                >
                  eliminar mensaje
                </ActionLink>
              )}
            </View>
          </>
        )}
      </ModalForm>
    </Modal>
  )
}

const useStyles = makeStyles(t => ({
  quickEmojisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: t.space[2],
    paddingHorizontal: t.space[3],
    borderWidth: t.lines.hairline,
    borderColor: t.colors.line,
    backgroundColor: t.colors.background,
    marginBottom: t.space[2],
  },
  quickEmojiButton: {
    padding: t.space[1],
  },
  quickEmojiText: {
    fontSize: 24,
    lineHeight: 32,
    textAlign: 'center',
    includeFontPadding: false,
  },
  quickEmojiMore: {
    width: 28,
    height: 28,
    borderWidth: t.lines.hairline,
    borderColor: t.colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickEmojiMoreText: {
    fontSize: 16,
    color: t.colors.textMuted,
  },
  pinnedHeader: {
    paddingHorizontal: t.space[5],
    paddingTop: t.space[3],
    paddingBottom: t.space[2],
    borderBottomWidth: t.lines.hairline,
    borderBottomColor: t.colors.lineStrong,
    backgroundColor: t.colors.background,
  },
  pickerHeader: {
    marginBottom: t.space[2],
  },
  categoryNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[2],
  },
  categoryNavButton: {
    width: 36,
    height: 36,
    borderWidth: t.lines.hairline,
    borderColor: t.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryNavIcon: {
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    includeFontPadding: false,
  },
  pickerContent: {
    gap: t.space[2],
  },
  categoryBlock: {
    marginBottom: t.space[3],
  },
  categoryTitle: {
    marginBottom: t.space[1],
    letterSpacing: 0.5,
  },
  placeholderText: {
    fontStyle: 'italic',
    paddingVertical: t.space[1],
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridEmojiButton: {
    width: '12.5%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridEmojiText: {
    fontSize: 24,
    lineHeight: 32,
    textAlign: 'center',
    includeFontPadding: false,
  },
  preview: {
    padding: t.space[3],
    borderWidth: t.lines.hairline,
    borderColor: t.colors.line,
    backgroundColor: t.colors.background,
  },
  content: {
    fontStyle: 'italic',
  },
  actionsList: {
    gap: t.space[4],
    paddingTop: t.space[2],
  },
  deleteLink: {
    color: t.colors.danger,
  },
}))
