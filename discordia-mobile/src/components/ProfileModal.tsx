import React, { useState } from 'react'
import { Modal, View, Text, StyleSheet, Pressable, Image, ActivityIndicator } from 'react-native'
import { X, Edit2, LogOut } from 'lucide-react-native'
import { colors, spacing, radii, typography } from '../theme'
import { useAuth } from '../providers/AppProviders'
import EditProfileModal from './EditProfileModal'

interface ProfileModalProps {
  visible: boolean
  onClose: () => void
}

export default function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const { userProfile, logout } = useAuth()
  const [isEditModalVisible, setIsEditModalVisible] = useState(false)

  if (!userProfile) return null

  const avatarSource = userProfile.avatar_url
    ? { uri: userProfile.avatar_url }
    : undefined

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Desconocida'
    const d = new Date(dateString)
    return d.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const handleLogout = () => {
    onClose()
    logout()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Perfil de Usuario</Text>
            <View style={styles.headerActions}>
              <Pressable
                style={styles.actionBtn}
                onPress={() => setIsEditModalVisible(true)}
              >
                <Edit2 color={colors.text} size={20} />
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={onClose}>
                <X color={colors.textMuted} size={24} />
              </Pressable>
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.avatarContainer}>
              {avatarSource ? (
                <Image source={avatarSource} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarPlaceholderText}>
                    {(userProfile.display_name || userProfile.username || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      userProfile.activity_status === 'online'
                        ? colors.online
                        : userProfile.activity_status === 'idle'
                        ? colors.idle
                        : userProfile.activity_status === 'dnd'
                        ? colors.danger
                        : colors.offline,
                  },
                ]}
              />
            </View>

            <Text style={styles.displayName}>
              {userProfile.display_name || userProfile.username}
            </Text>
            <Text style={styles.username}>@{userProfile.username}</Text>

            {!!userProfile.custom_status && (
              <View style={styles.statusBox}>
                <Text style={styles.statusText}>{userProfile.custom_status}</Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sobre mí</Text>
              <Text style={styles.sectionContent}>
                {userProfile.bio || 'Sin descripción.'}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Miembro desde</Text>
              <Text style={styles.sectionContent}>{formatDate(userProfile.created_at)}</Text>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Email</Text>
              <Text style={styles.sectionContent}>{userProfile.email || 'Oculto'}</Text>
            </View>
          </View>
          
          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut color={colors.danger} size={18} />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </Pressable>
        </View>
      </View>

      <EditProfileModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
      />
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    minHeight: '60%',
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.pageTitle,
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  statusBadge: {
    position: 'absolute',
    right: 0,
    bottom: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: colors.surface,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  username: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  statusBox: {
    backgroundColor: colors.elevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  statusText: {
    color: colors.text,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  section: {
    width: '100%',
    marginBottom: spacing.md,
    backgroundColor: colors.elevated,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  sectionContent: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logoutText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 16,
  }
})
