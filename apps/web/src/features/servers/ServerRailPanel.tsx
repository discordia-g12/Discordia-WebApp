import { useUIStore } from '../../app/uiStore';
import { isNewUi } from '../../ui/flag';
import { ServerRail } from './ServerRail';
import { LegacyServerRail } from './legacy/LegacyServerRail';
import { selectServer } from './serverActions';
import { useCurrentServer } from './useCurrentServer';

/** Rail de servidores conectado a la selección y a los modales de crear / unirse. */
export function ServerRailPanel() {
  const { servers, isLoadingServers } = useCurrentServer();
  const selectedServerId = useUIStore((s) => s.selectedServerId);
  const setActiveModal = useUIStore((s) => s.setActiveModal);
  const Rail = isNewUi() ? ServerRail : LegacyServerRail;

  return (
    <Rail
      servers={servers}
      selectedServerId={selectedServerId}
      onSelectServer={(serverId) => selectServer(serverId, servers)}
      onAddServer={() => setActiveModal('create-server')}
      onDiscoverServers={() => setActiveModal('join-server')}
      homeBadgeCount={0}
      isLoading={isLoadingServers}
    />
  );
}
