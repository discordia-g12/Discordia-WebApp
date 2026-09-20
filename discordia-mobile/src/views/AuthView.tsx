import React, { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Eye, EyeOff } from 'lucide-react-native'
import { useAuth } from '../providers/AppProviders'
import { colors, radii, spacing, typography } from '../theme'

export default function AuthView() {
  const { login, register, authScreen, setAuthScreen, isLoading } = useAuth()

  // Campos Login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Campos Registro
  const [regUsername, setRegUsername] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false)

  // Campos Recuperación
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSubmitted, setForgotSubmitted] = useState(false)

  // Feedback de error
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const clearErrors = () => setErrorMessage(null)

  const handleLogin = async () => {
    clearErrors()
    if (!email.trim() || !password) {
      setErrorMessage('Por favor completá tu correo y contraseña.')
      return
    }
    try {
      await login(email.trim(), password)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al iniciar sesión.')
    }
  }

  const handleRegister = async () => {
    clearErrors()
    if (!regUsername.trim() || !regEmail.trim() || !regPassword || !regConfirmPassword) {
      setErrorMessage('Por favor completá todos los campos.')
      return
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.')
      return
    }
    const passLength = regPassword.length >= 8
    const passUpper = /[A-Z]/.test(regPassword)
    const passLower = /[a-z]/.test(regPassword)
    const passNumber = /[0-9]/.test(regPassword)

    if (!passLength || !passUpper || !passLower || !passNumber) {
      setErrorMessage(
        'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.'
      )
      return
    }
    try {
      await register(regUsername.trim(), regEmail.trim(), regPassword)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al crear la cuenta.')
    }
  }

  const handleForgot = () => {
    clearErrors()
    if (!forgotEmail.trim()) {
      setErrorMessage('Por favor ingresá tu correo electrónico.')
      return
    }
    setForgotSubmitted(true)
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {authScreen === 'register' ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Crear una cuenta</Text>
                <Text style={styles.cardSubtitle}>
                  ¡Comenzá a conversar y compartir con tu comunidad!
                </Text>

                {errorMessage && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                <Text style={styles.label}>Nombre de usuario</Text>
                <TextInput
                  style={styles.input}
                  placeholder="tu_usuario"
                  placeholderTextColor={colors.textDim}
                  autoCapitalize="none"
                  value={regUsername}
                  onChangeText={(val) => {
                    clearErrors()
                    setRegUsername(val)
                  }}
                  editable={!isLoading}
                />

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="vos@ejemplo.com"
                  placeholderTextColor={colors.textDim}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={regEmail}
                  onChangeText={(val) => {
                    clearErrors()
                    setRegEmail(val)
                  }}
                  editable={!isLoading}
                />

                <Text style={styles.label}>Contraseña</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textDim}
                    secureTextEntry={!showRegPassword}
                    value={regPassword}
                    onChangeText={(val) => {
                      clearErrors()
                      setRegPassword(val)
                    }}
                    editable={!isLoading}
                  />
                  <Pressable
                    style={styles.eyeButton}
                    onPress={() => setShowRegPassword((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={showRegPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showRegPassword ? (
                      <EyeOff size={18} color={colors.textDim} />
                    ) : (
                      <Eye size={18} color={colors.textDim} />
                    )}
                  </Pressable>
                </View>

                <Text style={styles.label}>Confirmar contraseña</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textDim}
                    secureTextEntry={!showRegConfirmPassword}
                    value={regConfirmPassword}
                    onChangeText={(val) => {
                      clearErrors()
                      setRegConfirmPassword(val)
                    }}
                    editable={!isLoading}
                  />
                  <Pressable
                    style={styles.eyeButton}
                    onPress={() => setShowRegConfirmPassword((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={showRegConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showRegConfirmPassword ? (
                      <EyeOff size={18} color={colors.textDim} />
                    ) : (
                      <Eye size={18} color={colors.textDim} />
                    )}
                  </Pressable>
                </View>

                <Pressable
                  style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                  onPress={handleRegister}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.accentFg} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Registrarse</Text>
                  )}
                </Pressable>

                <View style={styles.switchRow}>
                  <Text style={styles.registerText}>¿Ya tenés cuenta? </Text>
                  <Pressable
                    onPress={() => {
                      clearErrors()
                      setAuthScreen('login')
                    }}
                    disabled={isLoading}
                  >
                    <Text style={styles.registerLink}>Iniciar sesión</Text>
                  </Pressable>
                </View>
              </View>
            ) : authScreen === 'forgot' ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Recuperar contraseña</Text>
                <Text style={styles.cardSubtitle}>
                  Ingresá tu correo electrónico para recibir un enlace de restablecimiento.
                </Text>

                {errorMessage && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                {forgotSubmitted ? (
                  <View style={styles.successBox}>
                    <Text style={styles.successText}>
                      ¡Listo! Si el correo existe en nuestro sistema, recibirás un enlace en breve.
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="vos@ejemplo.com"
                      placeholderTextColor={colors.textDim}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={forgotEmail}
                      onChangeText={(val) => {
                        clearErrors()
                        setForgotEmail(val)
                      }}
                      editable={!isLoading}
                    />

                    <Pressable style={styles.primaryButton} onPress={handleForgot}>
                      <Text style={styles.primaryButtonText}>Enviar enlace</Text>
                    </Pressable>
                  </>
                )}

                <View style={styles.switchRow}>
                  <Text style={styles.registerText}>¿Te acordaste? </Text>
                  <Pressable
                    onPress={() => {
                      clearErrors()
                      setForgotSubmitted(false)
                      setAuthScreen('login')
                    }}
                  >
                    <Text style={styles.registerLink}>Iniciar sesión</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Bienvenido de nuevo</Text>
                <Text style={styles.cardSubtitle}>
                  ¡Nos alegra verte otra vez!
                </Text>

                {errorMessage && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="vos@ejemplo.com"
                  placeholderTextColor={colors.textDim}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(val) => {
                    clearErrors()
                    setEmail(val)
                  }}
                  editable={!isLoading}
                />

                <Text style={styles.label}>Contraseña</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textDim}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(val) => {
                      clearErrors()
                      setPassword(val)
                    }}
                    editable={!isLoading}
                  />
                  <Pressable
                    style={styles.eyeButton}
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={colors.textDim} />
                    ) : (
                      <Eye size={18} color={colors.textDim} />
                    )}
                  </Pressable>
                </View>

                <Pressable
                  style={styles.forgotLink}
                  onPress={() => {
                    clearErrors()
                    setAuthScreen('forgot')
                  }}
                  disabled={isLoading}
                >
                  <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                </Pressable>

                <Pressable
                  style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.accentFg} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
                  )}
                </Pressable>

                <View style={styles.switchRow}>
                  <Text style={styles.registerText}>¿No tenés cuenta? </Text>
                  <Pressable
                    onPress={() => {
                      clearErrors()
                      setAuthScreen('register')
                    }}
                    disabled={isLoading}
                  >
                    <Text style={styles.registerLink}>Registrate</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
    paddingVertical: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  errorBox: {
    backgroundColor: 'rgba(237, 66, 69, 0.15)',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  errorText: {
    ...typography.helperText,
    color: colors.danger,
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: 'rgba(61, 181, 122, 0.15)',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  successText: {
    ...typography.helperText,
    color: colors.success,
    textAlign: 'center',
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text,
    fontSize: 15,
  },
  eyeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotLink: { alignSelf: 'flex-end', marginTop: spacing.sm },
  forgotText: { ...typography.helperText, color: colors.accent },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: { ...typography.button, color: colors.accentFg },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  registerText: {
    ...typography.helperText,
    color: colors.textMuted,
    textAlign: 'center',
  },
  registerLink: {
    ...typography.helperText,
    color: colors.accent,
    fontWeight: '600',
  },
})
