import React, { useEffect, useRef } from 'react'
import { Animated, KeyboardAvoidingView, Pressable, ScrollView, View, type TextInputInstance } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  PASSWORD_RESET_SENT_MESSAGE,
  logout,
  retryBootstrap,
  sanitizeUsername,
  useAuthForms,
  useSession,
  type AuthField,
  type AuthForms,
  type SessionStatus,
} from '@discordia/core'
import { makeStyles } from '../theme'
import { Background, BlockButton, DisplayText, Text, UnderlineInput, keyboardAvoidingBehavior, useRise } from '../ui'

/**
 * Acceso del rediseño (PDF, págs. 3 a 5), igual que la web: el formulario de campos subrayados arriba y,
 * al pie, las palabras gigantes que navegan (INICIAR SESIÓN / REGISTRARSE) o titulan el estado (CUENTA
 * SUSPENDIDA, ...). La lógica es useAuthForms de core, la misma que usa la web.
 *
 * La sesión de mobile vive en memoria: al abrir la app no hay una guardada, así que mientras arranca ya se
 * ve el login (se puede completar, pero no enviar hasta que la sesión resuelve).
 *
 * Movimiento: los elementos del formulario suben uno tras otro (también al cambiar de vista) y después
 * las palabras del pie; al pasar de login a registro, las letras de la palabra activa suben.
 */
export default function AuthView() {
  const styles = useStyles()
  const forms = useAuthForms()
  const status = useSession(s => s.status)
  const view: AuthViewName = status === 'unauthenticated' || status === 'bootstrapping' ? forms.activeTab : status

  return (
    <View style={styles.screen}>
      <Background gradient="backgroundGlow" drift />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={keyboardAvoidingBehavior}>
          <ScrollView contentContainerStyle={styles.column} keyboardShouldPersistTaps="handled">
            {/* El panel se vuelve a montar al cambiar de vista: sus elementos entran escalonados */}
            <View key={view} style={styles.panel}>
              {renderPanel(view, forms)}
            </View>
            <Heading view={view} forms={forms} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

type AuthViewName = Exclude<SessionStatus, 'bootstrapping'> | AuthForms['activeTab']

function renderPanel(view: AuthViewName, forms: AuthForms): React.ReactNode {
  switch (view) {
    case 'login':
      return <LoginForm forms={forms} />
    case 'register':
      return <RegisterForm forms={forms} />
    case 'forgot':
      return <ForgotForm forms={forms} />
    case 'error':
      return <ErrorPanel />
    case 'suspended':
      return <SuspendedPanel />
    case 'email_unverified':
      return <EmailUnverifiedPanel forms={forms} />
    case 'needs_profile':
      return <NeedsProfileForm forms={forms} />
    default:
      return null
  }
}

// ==========================================
// Palabras gigantes del pie
// ==========================================

function Heading({ view, forms }: { view: AuthViewName; forms: AuthForms }) {
  // Login y registro comparten encabezado: las palabras no se vuelven a montar, se intercambian
  if (view === 'login' || view === 'register') {
    return (
      <View accessibilityLabel="Acceso">
        <Rise index={3}>
          <DisplayText active={view === 'login'} onPress={() => forms.switchTab('login')} testID="tab-login">
            Iniciar sesión
          </DisplayText>
        </Rise>
        <Rise index={4}>
          <DisplayText active={view === 'register'} onPress={() => forms.switchTab('register')} testID="tab-register">
            Registrarse
          </DisplayText>
        </Rise>
      </View>
    )
  }

  const title = HEADINGS[view]
  if (!title) return null
  return (
    <View key={view}>
      <Rise index={3}>
        <DisplayText active>{title}</DisplayText>
      </Rise>
    </View>
  )
}

/** Título de cada estado. */
const HEADINGS: Partial<Record<AuthViewName, string>> = {
  forgot: 'Recuperar contraseña',
  error: 'Algo falló',
  suspended: 'Cuenta suspendida',
  email_unverified: 'Verificá tu email',
  needs_profile: 'Elegí tu usuario',
}

// ==========================================
// Formularios
// ==========================================

/** Un elemento del formulario que entra subiendo, después de los anteriores. */
function Rise({ index, children }: { index: number; children: React.ReactNode }) {
  const enter = useRise({ delay: Math.min(index, 6) * 60 })
  return <Animated.View style={enter}>{children}</Animated.View>
}

/** Los hijos del formulario, cada uno con su entrada escalonada. */
function Form({ children }: { children: React.ReactNode }) {
  const styles = useStyles()
  return (
    <View style={styles.form}>
      {React.Children.toArray(children)
        .filter(Boolean)
        .map((child, i) => (
          <Rise key={i} index={i}>
            {child}
          </Rise>
        ))}
    </View>
  )
}

/** Lleva el foco al campo con error para que se lea y se pueda corregir enseguida. */
function useFocusOnError(error: string | null, field: AuthField | null) {
  const refs = useRef<Partial<Record<AuthField, TextInputInstance | null>>>({})
  useEffect(() => {
    if (error && field) refs.current[field]?.focus()
  }, [error, field])
  return (name: AuthField) => (el: TextInputInstance | null) => {
    refs.current[name] = el
  }
}

/**
 * Error que no es de un campo (credenciales, servidor): texto en negrita con barra inicial, sobre la
 * acción. Se monta solo si hay error (en el escalonado del formulario, uno vacío sumaría un hueco).
 */
function FormError({ children }: { children: string }) {
  return (
    <Text variant="bodySmall" bold accessibilityRole="alert" accessibilityLiveRegion="assertive">
      / {children}
    </Text>
  )
}

const fieldError = (forms: AuthForms, field: AuthField) =>
  forms.errorField === field ? (forms.formError ?? undefined) : undefined

const generalError = (forms: AuthForms) => (forms.errorField ? null : forms.formError)

/** Mientras la sesión arranca el formulario ya se ve y se puede completar, pero no enviar. */
const useSessionStarting = () => useSession(s => s.status === 'bootstrapping')

function LoginForm({ forms }: { forms: AuthForms }) {
  const styles = useStyles()
  const { login, isSubmitting } = forms
  const starting = useSessionStarting()
  const passwordRef = useRef<TextInputInstance>(null)
  const submit = () => forms.handleLoginSubmit()
  return (
    <Form>
      <UnderlineInput
        size="large"
        label="correo electrónico"
        required
        value={login.email}
        onChangeText={login.setEmail}
        placeholder="ejemplo@discordia.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        disabled={isSubmitting}
      />
      <View style={styles.fieldWithLink}>
        <UnderlineInput
          ref={passwordRef}
          size="large"
          label="contraseña"
          required
          secret
          value={login.password}
          onChangeText={login.setPassword}
          placeholder="tu contraseña"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => !starting && submit()}
          disabled={isSubmitting}
        />
        <Pressable
          onPress={() => forms.openForgot(login.email.trim())}
          disabled={isSubmitting}
          accessibilityRole="link"
          hitSlop={8}
          testID="link-forgot-password"
        >
          <Text variant="bodySmall" tone={isSubmitting ? 'muted' : 'default'}>
            ¿Olvidaste tu contraseña?
          </Text>
        </Pressable>
      </View>
      {generalError(forms) ? <FormError>{generalError(forms)!}</FormError> : null}
      <BlockButton size="large" loading={isSubmitting} disabled={starting} onPress={submit} testID="btn-submit-login">
        Iniciar sesión
      </BlockButton>
    </Form>
  )
}

function RegisterForm({ forms }: { forms: AuthForms }) {
  const styles = useStyles()
  const { register, isSubmitting } = forms
  const starting = useSessionStarting()
  const fieldRef = useFocusOnError(forms.formError, forms.errorField)
  const rules = [
    { met: register.passwordRules.length, label: 'mínimo 8 caracteres' },
    { met: register.passwordRules.upper && register.passwordRules.lower, label: 'mayúsculas y minúsculas' },
    { met: register.passwordRules.number, label: 'al menos un número' },
  ]

  return (
    <Form>
      <UnderlineInput
        size="large"
        ref={fieldRef('username')}
        label="nombre de usuario"
        required
        value={register.username}
        onChangeText={value => register.setUsername(sanitizeUsername(value))}
        placeholder="ej: alexr"
        hint="Tu nombre de usuario es único en Discordia (mínimo 3 caracteres alfanuméricos)."
        error={fieldError(forms, 'username')}
        autoCapitalize="none"
        autoComplete="username"
        maxLength={32}
        disabled={isSubmitting}
      />
      <UnderlineInput
        size="large"
        ref={fieldRef('email')}
        label="correo electrónico"
        required
        value={register.email}
        onChangeText={register.setEmail}
        placeholder="ejemplo@discordia.com"
        error={fieldError(forms, 'email')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        disabled={isSubmitting}
      />
      <View>
        <UnderlineInput
          size="large"
          ref={fieldRef('password')}
          label="contraseña"
          required
          secret
          value={register.password}
          onChangeText={register.setPassword}
          placeholder="mínimo 8 caracteres"
          error={fieldError(forms, 'password')}
          autoComplete="new-password"
          textContentType="newPassword"
          disabled={isSubmitting}
        />
        {/* Requisitos (CA 4): se marcan a medida que se cumplen */}
        <View style={styles.rules} accessibilityLabel="Requisitos de la contraseña">
          {rules.map(rule => (
            <Text
              key={rule.label}
              variant="bodySmall"
              tone={rule.met ? 'default' : 'muted'}
              accessibilityLabel={`${rule.label}: ${rule.met ? 'cumplido' : 'pendiente'}`}
            >
              {rule.met ? '✓' : '/'} {rule.label}
            </Text>
          ))}
        </View>
      </View>
      <UnderlineInput
        size="large"
        ref={fieldRef('confirm')}
        label="confirmar contraseña"
        required
        secret
        value={register.confirmPassword}
        onChangeText={register.setConfirmPassword}
        placeholder="repite tu contraseña"
        error={fieldError(forms, 'confirm')}
        autoComplete="new-password"
        textContentType="newPassword"
        disabled={isSubmitting}
      />
      {generalError(forms) ? <FormError>{generalError(forms)!}</FormError> : null}
      <BlockButton
        size="large"
        loading={isSubmitting}
        disabled={starting}
        onPress={() => forms.handleRegisterSubmit()}
        testID="btn-submit-register"
      >
        Crear cuenta
      </BlockButton>
    </Form>
  )
}

function ForgotForm({ forms }: { forms: AuthForms }) {
  const styles = useStyles()
  const { forgot, isSubmitting } = forms
  const fieldRef = useFocusOnError(forms.formError, forms.errorField)

  if (forgot.sent) {
    return (
      <Form>
        <Text accessibilityLiveRegion="polite">{PASSWORD_RESET_SENT_MESSAGE}</Text>
        <Text variant="bodySmall" tone="muted" style={styles.note}>
          / ¿No lo encontrás? Revisá la carpeta de spam o correo no deseado.
        </Text>
        <BlockButton size="large" onPress={forms.backToLoginTab}>
          Volver a iniciar sesión
        </BlockButton>
      </Form>
    )
  }

  return (
    <Form>
      <Text>Ingresá tu correo y te enviamos un enlace para elegir una contraseña nueva.</Text>
      <UnderlineInput
        size="large"
        ref={fieldRef('email')}
        label="correo electrónico"
        required
        value={forgot.email}
        onChangeText={forgot.setEmail}
        placeholder="ejemplo@discordia.com"
        error={fieldError(forms, 'email')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        disabled={isSubmitting}
      />
      {generalError(forms) ? <FormError>{generalError(forms)!}</FormError> : null}
      <Actions>
        <BlockButton size="large" loading={isSubmitting} onPress={() => forms.handleForgotSubmit()}>
          Enviar enlace
        </BlockButton>
        <SecondaryButton onPress={forms.backToLoginTab} disabled={isSubmitting}>
          Volver
        </SecondaryButton>
      </Actions>
    </Form>
  )
}

function NeedsProfileForm({ forms }: { forms: AuthForms }) {
  const { conflict } = forms
  const fieldRef = useFocusOnError(conflict.error, forms.errorField)
  const usernameError = forms.errorField === 'username' ? (conflict.error ?? undefined) : undefined

  return (
    <Form>
      <Text>Tu cuenta fue autenticada, pero el nombre de usuario ya está en uso. Elegí uno disponible.</Text>
      <UnderlineInput
        size="large"
        ref={fieldRef('username')}
        label="nombre de usuario"
        required
        value={conflict.username}
        onChangeText={value => conflict.setUsername(sanitizeUsername(value))}
        placeholder="ej: alexr_2026"
        error={usernameError}
        autoCapitalize="none"
        disabled={conflict.isSubmitting}
        autoFocus
      />
      <UnderlineInput
        size="large"
        label="nombre público (opcional)"
        value={conflict.displayName}
        onChangeText={conflict.setDisplayName}
        placeholder="ej: Alex Rivera"
        disabled={conflict.isSubmitting}
      />
      {!usernameError && conflict.error ? <FormError>{conflict.error}</FormError> : null}
      <BlockButton size="large" loading={conflict.isSubmitting} onPress={() => forms.handleConflictSubmit()}>
        Entrar a Discordia
      </BlockButton>
    </Form>
  )
}

/** El bloque negro y, al lado, la acción secundaria. */
function Actions({ children }: { children: React.ReactNode }) {
  const styles = useStyles()
  return <View style={styles.actions}>{children}</View>
}

/** Acción secundaria junto al bloque negro: mismo texto en mayúsculas, sin fondo (VOLVER). */
function SecondaryButton({ children, onPress, disabled = false }: { children: string; onPress: () => void; disabled?: boolean }) {
  const styles = useStyles()
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={children} style={styles.secondary}>
      {({ pressed }) => (
        <Text tone={disabled ? 'muted' : 'default'} style={[styles.secondaryText, pressed && styles.underline]}>
          {children.toUpperCase()}
        </Text>
      )}
    </Pressable>
  )
}

// ==========================================
// Estados de la sesión
// ==========================================

function ErrorPanel() {
  const styles = useStyles()
  const error = useSession(s => s.error)
  return (
    <Form>
      {error?.title ? <Text bold>{error.title}</Text> : null}
      <Text>{error?.message || 'Ocurrió un error al procesar tu cuenta.'}</Text>
      {error?.detail ? (
        <Text variant="bodySmall" tone="muted" style={styles.note}>
          / {error.detail}
        </Text>
      ) : null}
      <BlockButton size="large" onPress={() => retryBootstrap()}>
        Reintentar
      </BlockButton>
    </Form>
  )
}

function SuspendedPanel() {
  return (
    <Form>
      <Text>Tu cuenta ha sido suspendida temporal o permanentemente por el equipo de moderación.</Text>
      <BlockButton size="large" onPress={() => logout()}>
        Cerrar sesión
      </BlockButton>
    </Form>
  )
}

function EmailUnverifiedPanel({ forms }: { forms: AuthForms }) {
  const styles = useStyles()
  const pendingEmail = useSession(s => s.pendingEmail)
  return (
    <Form>
      <Text>
        {pendingEmail ? (
          <>
            Te enviamos un enlace de verificación a <Text bold>{pendingEmail}</Text>.
          </>
        ) : (
          'Te enviamos un enlace de verificación a tu casilla de correo.'
        )}{' '}
        Abrilo para activar tu cuenta y después volvé a iniciar sesión.
      </Text>
      <Text variant="bodySmall" tone="muted" style={styles.note}>
        / ¿No lo encontrás? Revisá la carpeta de spam o correo no deseado.
      </Text>
      <Actions>
        <BlockButton size="large" onPress={forms.handleVerifiedRetry}>
          Ya lo verifiqué
        </BlockButton>
        <SecondaryButton onPress={forms.handleUseOtherAccount}>Usar otra cuenta</SecondaryButton>
      </Actions>
    </Form>
  )
}

const useStyles = makeStyles(t => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  flex: { flex: 1 },
  // El formulario arriba y las palabras al pie, pegadas al borde de abajo como en el PDF
  column: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    gap: t.space[7],
    paddingTop: t.space[8],
    paddingHorizontal: t.space[5],
    paddingBottom: t.space[1],
  },
  panel: { width: '100%', maxWidth: 480 },
  form: { gap: t.space[6] },
  fieldWithLink: { gap: t.space[2] },
  rules: { marginTop: t.space[2] },
  note: { marginTop: -t.space[4] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: t.space[6], rowGap: t.space[3] },
  secondary: { paddingVertical: t.space[4] },
  secondaryText: { letterSpacing: 0.3 },
  underline: { textDecorationLine: 'underline' },
}))
