import React, { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../providers/AppProviders'
import { colors, radii, spacing, typography } from '../theme'

// Login no funcional: no valida contra ningún backend, solo simula el
// login llamando a login() del AuthProvider cuando se toca "Iniciar sesión".
export default function AuthView() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.logo}>Discordia</Text>
          <Text style={styles.tagline}>Comunidad, en tiempo real.</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bienvenido de nuevo</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="vos@ejemplo.com"
              placeholderTextColor={colors.textDim}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textDim}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Pressable style={styles.forgotLink}>
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </Pressable>

            <Pressable style={styles.primaryButton} onPress={login}>
              <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Continuar con Google</Text>
            </Pressable>
          </View>

          <Pressable>
            <Text style={styles.registerText}>
              ¿No tenés cuenta? <Text style={styles.registerLink}>Registrate</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  logo: { ...typography.pageTitle, fontSize: 32, color: colors.text, textAlign: 'center' },
  tagline: {
    ...typography.helperText,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardTitle: {
    ...typography.sectionTitle,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.helperText,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text,
    fontSize: 15,
  },
  forgotLink: { alignSelf: 'flex-end', marginTop: spacing.sm },
  forgotText: { ...typography.helperText, color: colors.accent },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  primaryButtonText: { ...typography.button, color: colors.accentFg },
  secondaryButton: {
    backgroundColor: colors.elevated,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  secondaryButtonText: { ...typography.button, color: colors.text },
  registerText: {
    ...typography.helperText,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  registerLink: { color: colors.accent, fontWeight: '600' },
})
