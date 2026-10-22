import { useEffect } from 'react';
import { useSession, bootstrap } from './platform/auth/session';
import { AuthView } from './features/auth/AuthView';
import { useCurrentUserStore } from './features/profile/currentUserStore';
import { VoiceProvider } from './features/voice/VoiceProvider';
import { ChatConnectionProvider } from './features/chat/ChatConnectionProvider';
import { UsersProvider, useUsers } from './app/UsersProvider';
import { useUIStore } from './app/uiStore';
import { useIsMobile } from './app/useIsMobile';
import { DesktopLayout } from './app/DesktopLayout';
import { MobileLayout } from './app/MobileLayout';

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

  // Parseo de link de invitación desde URL
  useEffect(() => {
    if (status !== 'authenticated') return;

    const path = window.location.pathname;
    if (path.startsWith('/invite/')) {
      useUIStore.getState().setActiveModal('join-server');
    }
  }, [status]);

  // Si no está autenticado (bootstrapping, unauthenticated, needs_profile, suspended, error), renderizar AuthView
  if (status !== 'authenticated') {
    return <AuthView />;
  }

  return (
    <VoiceProvider>
      <ChatConnectionProvider>
        <UsersProvider>
          <AuthenticatedApp />
        </UsersProvider>
      </ChatConnectionProvider>
    </VoiceProvider>
  );
}

function AuthenticatedApp() {
  const isMobile = useIsMobile();
  const { usersMap } = useUsers();

  // Llamada entrante simulada para testing
  useEffect(() => {
    const timer = setTimeout(() => {
      // Simular llamada de Sofia después de 12 segundos
      if (usersMap['u1']) {
        useUIStore.getState().setIncomingCaller(usersMap['u1']);
      }
    }, 12000);
    return () => clearTimeout(timer);
  }, []);

  // Shell móvil para pantallas menores a 768px
  return isMobile ? <MobileLayout /> : <DesktopLayout />;
}
