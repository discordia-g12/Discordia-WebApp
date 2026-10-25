import React, { useState } from 'react';
import { User, Status } from '../../../types';
import { ProfileMode } from './shared';

/** Lo que recibe la pantalla del perfil propio. */
export interface OwnProfileViewProps {
  currentUser?: User;
  onBack?: () => void;
  onSave?: (updatedUser: User) => void;
}


/** Estado y handlers de OwnProfileView: viven en el componente y lo comparten todas sus pestañas. */
export function useOwnProfileState(props: OwnProfileViewProps) {
  const {
    currentUser: initialUserProp,
    onBack,
    onSave,
  } = props;
  const baseUser: User = initialUserProp || ({ id: '' } as any);

  const [mode, setMode] = useState<ProfileMode>('view');
  const [savedIndicator, setSavedIndicator] = useState(false);

  // Editable Form State
  const [displayName, setDisplayName] = useState(baseUser.displayName || '');
  const [bio, setBio] = useState(baseUser.bio || '');
  const [status, setStatus] = useState<Status>(baseUser.status || 'online');
  const [customStatus, setCustomStatus] = useState(baseUser.customStatus || '');
  const [bannerColor, setBannerColor] = useState(baseUser.bannerColor || '#5865f2');
  const [avatarUrl, setAvatarUrl] = useState<string>(
    baseUser.avatarUrl || baseUser.avatar || ''
  );
  const [defaultAvatar] = useState<string>(
    baseUser.avatarUrl || baseUser.avatar || ''
  );

  // Validation
  const isDisplayNameValid = displayName.trim().length >= 2 && displayName.trim().length <= 32;

  // Avatar file upload handler
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Avatar image size cannot exceed 5 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatarUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetAvatar = () => {
    setAvatarUrl(defaultAvatar);
  };

  // Discard changes
  const handleDiscard = () => {
    setDisplayName(baseUser.displayName || '');
    setBio(baseUser.bio || '');
    setStatus(baseUser.status || 'online');
    setCustomStatus(baseUser.customStatus || '');
    setBannerColor(baseUser.bannerColor || '#5865f2');
    setAvatarUrl(baseUser.avatarUrl || baseUser.avatar || defaultAvatar);
    setMode('view');
  };

  // Save changes
  const handleSave = () => {
    if (!isDisplayNameValid) return;

    setMode('saving');
    setTimeout(() => {
      const updated: User = {
        ...baseUser,
        displayName: displayName.trim(),
        bio: bio.trim(),
        status,
        customStatus: customStatus.trim(),
        bannerColor,
        avatar: avatarUrl,
        avatarUrl,
      };

      setMode('view');
      setSavedIndicator(true);
      onSave?.(updated);

      setTimeout(() => {
        setSavedIndicator(false);
      }, 2500);
    }, 750);
  };

  return {

    initialUserProp,
    onBack,
    onSave,
    baseUser,
    mode,
    setMode,
    savedIndicator,
    setSavedIndicator,
    displayName,
    setDisplayName,
    bio,
    setBio,
    status,
    setStatus,
    customStatus,
    setCustomStatus,
    bannerColor,
    setBannerColor,
    avatarUrl,
    setAvatarUrl,
    defaultAvatar,
    isDisplayNameValid,
    handleAvatarFileChange,
    handleResetAvatar,
    handleDiscard,
    handleSave,
  };
}

export type OwnProfileState = ReturnType<typeof useOwnProfileState>;
