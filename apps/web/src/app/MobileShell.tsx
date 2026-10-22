import React from 'react';
import {
  Server,
  User,
  Modal,
  ConfirmAction,
} from '../types';
import { MobileScreen, BottomSheet, AddFriendSheetContent } from './mobile/shared';
import { useMobileShellState } from './mobile/useMobileShellState';
import { MobileChatScreen } from './mobile/MobileChatScreen';
import { MobileVoiceScreen } from './mobile/MobileVoiceScreen';
import { MobileHomeScreen } from './mobile/MobileHomeScreen';
import { ServerSheet } from './mobile/ServerSheet';
import { ProfileSheet } from './mobile/ProfileSheet';
import { MemberSheet } from './mobile/MemberSheet';
import styles from './MobileShell.module.css';

export interface MobileShellProps {
  initialScreen?: MobileScreen;
  servers?: Server[];
  currentUser?: User;
  onOpenModal?: (modal: Modal, extra?: unknown) => void;
  onConfirmAction?: (action: ConfirmAction, targetName?: string) => void;
}

export const MobileShell: React.FC<MobileShellProps> = (props) => {
  const s = useMobileShellState(props);
  const { screen, activeSheet, setActiveSheet } = s;

  return (
    <div className={styles.root}>
      {/* ====================================================================
          VISTA 1: CHAT A PANTALLA COMPLETA
          ==================================================================== */}
      {screen === 'chat' && <MobileChatScreen s={s} />}

      {/* ====================================================================
          VISTA 2: VOICE A PANTALLA COMPLETA
          ==================================================================== */}
      {screen === 'voice' && <MobileVoiceScreen s={s} />}

      {/* ====================================================================
          VISTAS 3 & 4: HOME Y CHANNELS (Con Rail Lateral y Header Superior)
          ==================================================================== */}
      {(screen === 'home' || screen === 'channels') && <MobileHomeScreen s={s} />}

      {/* ====================================================================
          BOTTOM SHEETS DESLIZABLES
          ==================================================================== */}

      {/* 1. SERVER SHEET */}
      <ServerSheet s={s} />

      {/* 2. PROFILE SHEET */}
      <ProfileSheet s={s} />

      {/* 3. MEMBER SHEET */}
      <MemberSheet s={s} />

      {/* 4. ADD FRIEND SHEET */}
      <BottomSheet
        isOpen={activeSheet === 'add-friend'}
        onClose={() => setActiveSheet('none')}
        title="Añadir Amigo"
      >
        <AddFriendSheetContent />
      </BottomSheet>
    </div>
  );
};
