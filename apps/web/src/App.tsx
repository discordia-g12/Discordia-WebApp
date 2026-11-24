import { useEffect } from 'react';
import { useSession, bootstrap } from './platform/auth/session';
import { AuthView } from './features/auth/AuthView';
import { DawnIntro } from './features/auth/DawnIntro';
import { useCurrentUserStore } from './features/profile/currentUserStore';
import { VoiceProvider } from './features/voice/VoiceProvider';
import { CallProvider } from './features/calls/CallProvider';
import { ChatConnectionProvider } from './features/chat/ChatConnectionProvider';
import { UsersProvider } from './app/UsersProvider';
import { useUIStore } from './app/uiStore';
import { useIsMobile } from './app/useIsMobile';
import { DesktopLayout } from './app/DesktopLayout';
import { MobileLayout } from './app/MobileLayout';
import { useEnsureChannelSelected } from './features/servers/useCurrentServer';
import { useInactivity } from './app/useInactivity';
import { usePushNavigation } from './features/notifications/usePushNavigation';

/**
 * Raíz de la web: arranca la sesión y, con sesión, monta lo que vive mientras dura (voz, chat en
 * tiempo real, perfiles) y el layout según el ancho de pantalla. El estado de la interfaz está en
 * useUIStore; los datos del servidor, en React Query.
 */
export default function App() {
  const { status, profile } = useSession();
  const syncFromProfile = useCurrentUserStore((s) => s.syncFromProfile);

  // Inicialización de sesión con protección contra StrictMode
  useEffect(() => {
    bootstrap();
  }, []);

  // Sincronizar usuario activo cuando se carga el perfil del backend
  useEffect(() => {
    if (profile) syncFromProfile(profile);
  }, [profile, syncFromProfile]);

  // Sin actividad, quien eligió "Conectado" se ve "Ausente"
  useInactivity(status === 'authenticated');

  // Parseo de link de invitación desde URL
  useEffect(() => {
    if (status !== 'authenticated') return;

    const path = window.location.pathname;
    if (path.startsWith('/invite/')) {
      useUIStore.getState().setActiveModal('join-server');
    }
  }, [status]);

  // Intro "amanecer": va encima mientras la sesión arranca, haya sesión o no. Está en el mismo lugar del
  // árbol en las dos ramas para que no se reinicie si la sesión se resuelve durante la intro.
  const intro = <DawnIntro />;

  // Si no está autenticado (bootstrapping, unauthenticated, needs_profile, suspended, error), renderizar AuthView
  if (status !== 'authenticated') {
    return (
      <>
        {intro}
        <AuthView />
      </>
    );
  }

  return (
    <>
      {intro}
      <VoiceProvider>
        <CallProvider>
          <ChatConnectionProvider>
            <UsersProvider>
              <AuthenticatedApp />
            </UsersProvider>
          </ChatConnectionProvider>
        </CallProvider>
      </VoiceProvider>
    </>
  );
}

function AuthenticatedApp() {
  const isMobile = useIsMobile();
  useEnsureChannelSelected();
  usePushNavigation();

  // Shell móvil para pantallas menores a 768px
  return isMobile ? <MobileLayout /> : <DesktopLayout />;
}
