import React, { useState } from 'react';
import { imageFileError } from '@discordia/core';
import { User, Status } from '../../../types';
import { ProfileMode } from './shared';

/** Lo que recibe la pantalla del perfil propio. */
export interface OwnProfileViewProps {
  currentUser?: User;
  onBack?: () => void;
  /**
   * Guarda el perfil; `avatarFile` llega solo si se eligió un avatar nuevo. Si devuelve (o resuelve)
   * false, el formulario queda como estaba para reintentar.
   */
  onSave?: (updatedUser: User, avatarFile?: File) => boolean | void | Promise<boolean | void>;
}


/** Estado y handlers de OwnProfileView: viven en el componente y lo comparten todas sus pestañas. */
export function useOwnProfileState(props: OwnProfileViewProps) {
  const {
    currentUser: initialUserProp,
    onBack,
    onSave,
  } = props;
  const baseUser: User = initialUserProp || ({ id: '' } as User);

  const [mode, setMode] = useState<ProfileMode>('view');
  const [savedIndicator, setSavedIndicator] = useState(false);

  // Editable Form State
  const [displayName, setDisplayName] = useState(baseUser.displayName || '');
  const [bio, setBio] = useState(baseUser.bio || '');
  const [status, setStatus] = useState<Status>(baseUser.status || 'online');
  const [customStatus, setCustomStatus] = useState(baseUser.customStatus || '');
  const [bannerColor, setBannerColor] = useState(baseUser.bannerColor || '#5865f2');

  // Avatar: el guardado viene del usuario; el elegido se sube recién al guardar y mientras tanto se
  // muestra su vista previa local
  const defaultAvatar = baseUser.avatarUrl || baseUser.avatar || '';
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarUrl = avatarPreview ?? defaultAvatar;

  // Validation
  const isDisplayNameValid = displayName.trim().length >= 2 && displayName.trim().length <= 32;

  const clearNewAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarError(null);
  };

  // Avatar file upload handler
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Permite volver a elegir el mismo archivo después de restablecer
    e.target.value = '';
    if (!file) return;

    const error = imageFileError(file);
    if (error) {
      setAvatarError(error);
      return;
    }

    setAvatarError(null);
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setAvatarPreview(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetAvatar = clearNewAvatar;

  // Discard changes
  const handleDiscard = () => {
    setDisplayName(baseUser.displayName || '');
    setBio(baseUser.bio || '');
    setStatus(baseUser.status || 'online');
    setCustomStatus(baseUser.customStatus || '');
    setBannerColor(baseUser.bannerColor || '#5865f2');
    clearNewAvatar();
    setMode('view');
  };

  // Save changes
  const handleSave = async () => {
    if (!isDisplayNameValid || mode === 'saving') return;

    setMode('saving');
    const updated: User = {
      ...baseUser,
      displayName: displayName.trim(),
      bio: bio.trim(),
      status,
      customStatus: customStatus.trim(),
      bannerColor,
    };

    const result = await (avatarFile ? onSave?.(updated, avatarFile) : onSave?.(updated));
    setMode('view');
    if (result === false) return;

    // Guardado: el avatar nuevo ya es el del usuario (llega con currentUser)
    clearNewAvatar();
    setSavedIndicator(true);
    setTimeout(() => {
      setSavedIndicator(false);
    }, 2500);
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
    avatarFile,
    avatarError,
    defaultAvatar,
    isDisplayNameValid,
    handleAvatarFileChange,
    handleResetAvatar,
    handleDiscard,
    handleSave,
  };
}

export type OwnProfileState = ReturnType<typeof useOwnProfileState>;
