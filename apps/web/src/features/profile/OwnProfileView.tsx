import React from 'react';
import { User } from '../../types';
import { useOwnProfileState } from './own-profile/useOwnProfileState';
import { ProfileTopBar } from './own-profile/ProfileTopBar';
import { ProfilePreviewCard } from './own-profile/ProfilePreviewCard';
import { ProfileDetailsForm } from './own-profile/ProfileDetailsForm';
import styles from './OwnProfileView.module.css';

export interface OwnProfileViewProps {
  currentUser?: User;
  onBack?: () => void;
  onSave?: (updatedUser: User) => void;
}

export const OwnProfileView: React.FC<OwnProfileViewProps> = (props) => {
  const s = useOwnProfileState(props);

  return (
    <div className={styles.root}>
      {/* Top Navigation Bar */}
      <ProfileTopBar s={s} />

      {/* Main Two-Column Layout */}
      <div className={styles.mainTwoColumnLayout}>
        {/* Left Column: Live Profile Card Preview */}
        <ProfilePreviewCard s={s} />

        {/* Right Column: Edit / View Form Details */}
        <ProfileDetailsForm s={s} />
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default OwnProfileView;
