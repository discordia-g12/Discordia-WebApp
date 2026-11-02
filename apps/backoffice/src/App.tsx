import { useEffect } from 'react';
import { startSession, useBackofficeSession } from './auth/session';
import { Backoffice } from './Backoffice';
import { AccessScreen } from './screens/AccessScreen';

/** Raíz del backoffice: arranca la sesión y muestra el backoffice solo al staff. */
export default function App() {
  const status = useBackofficeSession((s) => s.status);
  const user = useBackofficeSession((s) => s.user);

  useEffect(() => {
    void startSession();
  }, []);

  if (status === 'ready' && user) return <Backoffice user={user} />;
  return <AccessScreen />;
}
