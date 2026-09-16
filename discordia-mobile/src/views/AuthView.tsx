import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { 
  Lock, Mail, User as UserIcon, ArrowLeft, CheckCircle2, 
  AlertCircle, Sparkles 
} from 'lucide-react-native';

import { USERS, CURRENT_USER_ID } from '../data/mock';

type AuthScreen = 'login' | 'register' | 'forgot' | '2fa';

export default function AuthView({ initialScreen = 'login', onSuccess, onCancel }: any) {
  const [screen, setScreen] = useState<AuthScreen>(initialScreen);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState('alex.rivera@discordia.gg');
  const [loginPassword, setLoginPassword] = useState('SuperSecret2026!');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleNavigate = (newScreen: AuthScreen) => {
    clearMessages();
    setScreen(newScreen);
  };

  const handleLoginSubmit = () => {
    clearMessages();
    if (!loginEmail || !loginPassword) {
      setErrorMessage('Por favor, completa todos los campos.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const foundUser = Object.values(USERS).find(
        (u) => u.email?.toLowerCase() === loginEmail.toLowerCase()
      ) || USERS[CURRENT_USER_ID];

      if (foundUser?.twoFactorEnabled) {
        setScreen('2fa');
      } else {
        onSuccess?.(foundUser);
      }
    }, 900);
  };

  const handleRegisterSubmit = () => {
    clearMessages();
    if (!registerUsername.trim() || !registerEmail.trim() || registerPassword.length < 8) {
      setErrorMessage('Verifica tus datos. La contraseña debe tener 8 caracteres.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMessage('¡Cuenta creada con éxito! Bienvenido a Discordia.');
      setTimeout(() => onSuccess?.(USERS[CURRENT_USER_ID]), 700);
    }, 1200);
  };

  const handle2FASubmit = () => {
    clearMessages();
    if (twoFactorCode.length !== 6) {
      setErrorMessage('Ingresa los 6 dígitos de tu aplicación autenticadora.');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSuccess?.(USERS[CURRENT_USER_ID]);
    }, 1000);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {onCancel && (
          <TouchableOpacity style={styles.backButton} onPress={onCancel}>
            <ArrowLeft color="#dbdee1" size={20} />
          </TouchableOpacity>
        )}

        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Sparkles size={30} color="#ffffff" />
            </View>
            <Text style={styles.title}>
              {screen === 'login' && '¡Hola de nuevo!'}
              {screen === 'register' && 'Crear una cuenta'}
              {screen === 'forgot' && 'Recuperar contraseña'}
              {screen === '2fa' && 'Autenticación 2FA'}
            </Text>
            <Text style={styles.subtitle}>
              {screen === 'login' && '¡Nos alegra verte por aquí!'}
              {screen === 'register' && 'Únete a la comunidad de Discordia hoy.'}
              {screen === 'forgot' && 'Ingresa tu email para recibir un enlace.'}
              {screen === '2fa' && 'Ingresa el código de 6 dígitos de tu app.'}
            </Text>
          </View>

          {errorMessage && (
            <View style={styles.errorBox}>
              <AlertCircle size={18} color="#fa777c" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {successMessage && (
            <View style={styles.successBox}>
              <CheckCircle2 size={18} color="#2dc770" />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          {/* VISTA: LOGIN */}
          {screen === 'login' && (
            <View>
              <Text style={styles.label}>CORREO ELECTRÓNICO *</Text>
              <View style={styles.inputWrapper}>
                <Mail size={20} color="#949ba4" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#949ba4"
                />
              </View>

              <Text style={styles.label}>CONTRASEÑA *</Text>
              <View style={styles.inputWrapper}>
                <Lock size={20} color="#949ba4" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  secureTextEntry
                  placeholderTextColor="#949ba4"
                />
              </View>

              <TouchableOpacity onPress={() => handleNavigate('forgot')}>
                <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.primaryButton} onPress={handleLoginSubmit} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Iniciar Sesión</Text>}
              </TouchableOpacity>

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>¿Necesitas una cuenta? </Text>
                <TouchableOpacity onPress={() => handleNavigate('register')}>
                  <Text style={styles.linkText}>Regístrate</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* VISTA: REGISTRO */}
          {screen === 'register' && (
            <View>
              <Text style={styles.label}>NOMBRE DE USUARIO *</Text>
              <View style={styles.inputWrapper}>
                <UserIcon size={20} color="#949ba4" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={registerUsername}
                  onChangeText={setRegisterUsername}
                  placeholder="Ej: alexr"
                  placeholderTextColor="#949ba4"
                />
              </View>

              <Text style={styles.label}>CORREO ELECTRÓNICO *</Text>
              <View style={styles.inputWrapper}>
                <Mail size={20} color="#949ba4" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={registerEmail}
                  onChangeText={setRegisterEmail}
                  keyboardType="email-address"
                  placeholderTextColor="#949ba4"
                />
              </View>

              <Text style={styles.label}>CONTRASEÑA *</Text>
              <View style={styles.inputWrapper}>
                <Lock size={20} color="#949ba4" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={registerPassword}
                  onChangeText={setRegisterPassword}
                  secureTextEntry
                  placeholderTextColor="#949ba4"
                />
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleRegisterSubmit} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continuar</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={{ marginTop: 15 }} onPress={() => handleNavigate('login')}>
                <Text style={styles.linkText}>¿Ya tienes una cuenta?</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* VISTA: 2FA */}
          {screen === '2fa' && (
            <View>
              <Text style={styles.label}>CÓDIGO DE 6 DÍGITOS *</Text>
              <TextInput
                style={[styles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 8, marginBottom: 20 }]}
                value={twoFactorCode}
                onChangeText={setTwoFactorCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                placeholderTextColor="#4e5058"
              />

              <TouchableOpacity style={styles.primaryButton} onPress={handle2FASubmit} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verificar Código</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity style={{ marginTop: 15 }} onPress={() => handleNavigate('login')}>
                <Text style={styles.linkText}>Volver al login</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1f22' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(43, 45, 49, 0.7)', borderRadius: 8 },
  card: { backgroundColor: '#313338', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 10 },
  header: { alignItems: 'center', marginBottom: 24 },
  iconContainer: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#5865f2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f2f3f5', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#949ba4', textAlign: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(218, 55, 60, 0.15)', borderColor: '#da373c', borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 20 },
  errorText: { color: '#fa777c', marginLeft: 8, fontSize: 13, flex: 1 },
  successBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(35, 165, 90, 0.15)', borderColor: '#23a55a', borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 20 },
  successText: { color: '#2dc770', marginLeft: 8, fontSize: 13, flex: 1 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#b5bac1', marginBottom: 8, marginTop: 15 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1f22', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#1e1f22' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 48, color: '#dbdee1', fontSize: 15 },
  linkText: { color: '#00a8fc', fontSize: 13, fontWeight: '600' },
  primaryButton: { backgroundColor: '#5865f2', borderRadius: 8, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  footerRow: { flexDirection: 'row', marginTop: 15 },
  footerText: { color: '#949ba4', fontSize: 13 }
});