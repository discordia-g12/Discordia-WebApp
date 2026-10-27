import React from 'react'
import { Animated, Pressable, View } from 'react-native'
import { ArrowDown, ArrowUp, Plus } from 'lucide-react-native'
import { isLocalCategoryId } from '@discordia/core'
import { makeStyles, useTheme } from '../../theme'
import { SectionLabel, useRise } from '../../ui'
import type { Category, Channel } from '../../types'
import ChannelRow from './ChannelRow'
import VoiceChannelParticipants, { type VoiceChannelParticipant } from './VoiceChannelParticipants'

interface CategorySectionProps {
  category: Category
  collapsed: boolean
  selectedChannelId: string | null
  onToggle: (categoryId: string) => void
  /** Sin permiso para gestionar canales, no se pasa y no aparece el +. */
  onAddChannel?: (categoryId: string) => void
  onSelectChannel: (channel: Channel) => void
  onLongPressChannel: (channel: Channel) => void
  /** Participantes conectados a cada canal de voz, por channelId. */
  voiceParticipants?: Record<string, VoiceChannelParticipant[]>
  currentUserId?: string
  onLongPressVoiceParticipant?: (participant: VoiceChannelParticipant) => void
  /** Modo ordenar: muestra flechas para subir/bajar canales y la categoría. */
  reorderMode?: boolean
  onShiftChannel?: (channelId: string, direction: -1 | 1) => void
  onShiftCategory?: (categoryId: string, direction: -1 | 1) => void
}

// Flechas de subir/bajar del modo ordenar
function ShiftButtons({ label, onShift }: { label: string; onShift: (direction: -1 | 1) => void }) {
  const styles = useStyles()
  const { colors } = useTheme()
  return (
    <View style={styles.shiftButtons}>
      <Pressable style={styles.iconButton} onPress={() => onShift(-1)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Subir ${label}`}>
        <ArrowUp color={colors.text} size={16} strokeWidth={1.5} />
      </Pressable>
      <Pressable style={styles.iconButton} onPress={() => onShift(1)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Bajar ${label}`}>
        <ArrowDown color={colors.text} size={16} strokeWidth={1.5} />
      </Pressable>
    </View>
  )
}

/** Un canal que entra bajando, escalonado, al abrir la categoría. */
function Cascade({ index, animate, children }: { index: number; animate: boolean; children: React.ReactNode }) {
  const enter = useRise({ delay: index * 40, offset: -6, name: 'base', enabled: animate })
  return <Animated.View style={enter}>{children}</Animated.View>
}

/** Categoría ("CANAL DE TEXTO /") colapsable, con sus canales y quién está en los de voz. */
export default function CategorySection({
  category,
  collapsed,
  selectedChannelId,
  onToggle,
  onAddChannel,
  onSelectChannel,
  onLongPressChannel,
  voiceParticipants = {},
  currentUserId,
  onLongPressVoiceParticipant,
  reorderMode = false,
  onShiftChannel,
  onShiftCategory,
}: CategorySectionProps) {
  const styles = useStyles()
  const { colors } = useTheme()
  // Los canales bajan escalonados al abrir la categoría, no al montarse la lista
  const opened = React.useRef(false)
  React.useEffect(() => {
    if (collapsed) opened.current = true
  }, [collapsed])

  // La sección general es local: no se reordena, siempre va primero
  const canShiftCategory = reorderMode && !!onShiftCategory && !isLocalCategoryId(category.id)
  const trailing = canShiftCategory ? (
    <ShiftButtons label={`la categoría ${category.name}`} onShift={direction => onShiftCategory!(category.id, direction)} />
  ) : !reorderMode && onAddChannel ? (
    <Pressable
      style={styles.iconButton}
      onPress={() => onAddChannel(category.id)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Crear canal en ${category.name}`}
    >
      <Plus color={colors.text} size={14} strokeWidth={1.5} />
    </Pressable>
  ) : null

  return (
    <View style={styles.section}>
      <SectionLabel collapsible open={!collapsed} onToggle={() => onToggle(category.id)} trailing={trailing}>
        {category.name.toUpperCase()}
      </SectionLabel>
      {!collapsed && (
        <View style={styles.channels}>
          {category.channels.map((ch, i) => (
            <Cascade key={ch.id} index={i} animate={opened.current}>
              <View style={styles.channelRow}>
                <View style={styles.channelMain}>
                  <ChannelRow
                    channel={ch}
                    active={selectedChannelId === ch.id}
                    onPress={onSelectChannel}
                    onLongPress={onLongPressChannel}
                  />
                </View>
                {reorderMode && onShiftChannel && (
                  <ShiftButtons label={`el canal ${ch.name}`} onShift={direction => onShiftChannel(ch.id, direction)} />
                )}
              </View>
              {ch.type === 'voice' && (
                <VoiceChannelParticipants
                  participants={voiceParticipants[ch.id] ?? []}
                  currentUserId={currentUserId}
                  onLongPressParticipant={onLongPressVoiceParticipant}
                />
              )}
            </Cascade>
          ))}
        </View>
      )}
    </View>
  )
}

const useStyles = makeStyles(t => ({
  section: { paddingTop: t.space[5] },
  channels: { paddingTop: t.space[1] },
  channelRow: { flexDirection: 'row', alignItems: 'center' },
  channelMain: { flex: 1 },
  shiftButtons: { flexDirection: 'row', alignItems: 'center', paddingRight: t.space[3] },
  iconButton: { padding: t.space[1] },
}))
