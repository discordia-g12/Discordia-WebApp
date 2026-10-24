import React, { useState } from 'react'
import { Platform, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { makeStyles, useThemePreference } from '../theme'
import {
  ActionLink,
  Background,
  BlockButton,
  Choice,
  DisplayText,
  EmptyState,
  SectionLabel,
  ServerStrip,
  Skeleton,
  SquareAvatar,
  Tabs,
  Text,
  Toast,
  UnderlineInput,
} from '../ui'
import { CallBar } from '../components/shell/CallBar'
import VoiceScreen from '../components/voice/VoiceScreen'

/**
 * Catálogo para revisar los componentes del rediseño, como /?catalogo de la web: solo en desarrollo y en
 * Expo web (`npm run web -w @discordia/mobile`, con ?catalogo en la URL). No entra a la app.
 */
export function isCatalogRequested(): boolean {
  return __DEV__ && Platform.OS === 'web' && typeof window !== 'undefined' && window.location.search.includes('catalogo')
}

const PARTICIPANTS = [
  { id: 'a', name: 'Pilar', isLocal: true, isSpeaking: true, isMuted: false },
  { id: 'b', name: 'Lbars', isLocal: false, isSpeaking: false, isMuted: true },
  { id: 'c', name: 'Iñaki Ibarrolaza', isLocal: false, isSpeaking: false, isMuted: false, isLocallyMuted: true },
]

export function Catalog() {
  const styles = useStyles()
  const { preference, setPreference } = useThemePreference()
  const [tab, setTab] = useState<'a' | 'b' | 'c'>('a')
  const [open, setOpen] = useState(true)
  const [nav, setNav] = useState(true)

  return (
    <View style={styles.root}>
      <Background />
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <Choice
            label="Tema"
            options={[
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Oscuro' },
              { value: 'system', label: 'Sistema' },
            ]}
            value={preference}
            onChange={setPreference}
          />
          <DisplayText variant="watermark">Torton</DisplayText>
          <DisplayText variant="watermark">Los Pibes del Laboratorio de Software</DisplayText>
          <View>
            <DisplayText active={nav} onPress={() => setNav(true)}>
              Iniciar sesión
            </DisplayText>
            <DisplayText active={!nav} onPress={() => setNav(false)}>
              Registrarse
            </DisplayText>
          </View>
          <SectionLabel collapsible open={open} onToggle={() => setOpen(o => !o)}>
            CANAL DE TEXTO
          </SectionLabel>
          <Tabs
            label="Amigos"
            items={[
              { value: 'a', label: 'Disponible', count: 0 },
              { value: 'b', label: 'Todos' },
              { value: 'c', label: 'Pendiente' },
            ]}
            value={tab}
            onChange={setTab}
          />
          <UnderlineInput label="nombre de usuario" placeholder="ej: alexr" hint="Único en Discordia." />
          <UnderlineInput label="contraseña" secret error="La contraseña debe tener al menos 8 caracteres." />
          <View style={styles.row}>
            <BlockButton>Guardar</BlockButton>
            <BlockButton tone="danger">Eliminar</BlockButton>
            <BlockButton loading>Enviando</BlockButton>
          </View>
          <View style={styles.row}>
            <ActionLink>editar</ActionLink>
            <ActionLink disabled>próximamente</ActionLink>
          </View>
          <View style={styles.row}>
            <SquareAvatar user={{ username: 'pilar', displayName: 'Pilar Montilla' }} status="online" />
            <SquareAvatar user={{ username: 'lbars' }} size="lg" status="offline" />
            <ServerStrip server={{ name: 'Torton' }} active />
            <ServerStrip server={{ name: 'Diseño' }} unread />
          </View>
          <Toast message="Mensaje enviado" />
          <Toast message="No se pudo enviar el mensaje" tone="error" action={{ label: 'reintentar', onPress: () => {} }} />
          <EmptyState title="por ahora todo está tranquilo" hint="cuando un amigo empiece una actividad aparecerá aquí" />
          <Skeleton lines={4} />
          <Text variant="label">Llamada /</Text>
          <View style={styles.voice}>
            <VoiceScreen channelName="meet core" serverName="Torton" connectionState="connected" participants={PARTICIPANTS} onInvite={() => {}} />
          </View>
          <CallBar
            channelName="meet core"
            serverName="Torton"
            connectionState="reconnecting"
            isMuted={false}
            isDeafened
            onOpen={() => {}}
            onToggleMute={() => {}}
            onToggleDeafen={() => {}}
            onDisconnect={() => {}}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const useStyles = makeStyles(t => ({
  root: { flex: 1 },
  content: { gap: t.space[6], padding: t.space[4], paddingBottom: t.space[9] },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.space[4] },
  voice: { height: 520, borderTopWidth: t.lines.hairline, borderTopColor: t.colors.lineStrong },
}))
