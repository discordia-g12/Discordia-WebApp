import { useState, type ComponentType } from 'react';
import { ConfirmDialog } from '@web/ui';
import { logout } from './auth/session';
import type { StaffUser } from './auth/driver';
import { BackofficeLayout } from './layout/BackofficeLayout';
import { SECTIONS, useSection, type SectionId } from './routes';
import { CasesSection } from './sections/CasesSection';
import { MetricsSection } from './sections/MetricsSection';
import { ObservabilitySection } from './sections/ObservabilitySection';
import { ServersSection } from './sections/ServersSection';
import { StatusSection } from './sections/StatusSection';
import { UsersSection } from './sections/UsersSection';

const SECTION_CONTENT: Record<SectionId, ComponentType> = {
  usuarios: UsersSection,
  servidores: ServersSection,
  expedientes: CasesSection,
  metricas: MetricsSection,
  estado: StatusSection,
  observabilidad: ObservabilitySection,
};

/** El backoffice con sesión de staff: la sección sale de la URL. Salir pide confirmación, como en la web. */
export function Backoffice({ user }: { user: StaffUser }) {
  const [section, setSection] = useSection();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const Content = SECTION_CONTENT[section];

  return (
    <>
      <BackofficeLayout user={user} sections={SECTIONS} active={section} onSelect={setSection} onLogout={() => setConfirmingLogout(true)}>
        <Content />
      </BackofficeLayout>
      {confirmingLogout && (
        <ConfirmDialog action="logout" targetName={user.name} onConfirm={logout} onCancel={() => setConfirmingLogout(false)} />
      )}
    </>
  );
}
