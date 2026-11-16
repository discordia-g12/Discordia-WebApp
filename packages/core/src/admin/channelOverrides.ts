import { useState } from 'react';
import { errorMessageFor } from '../api/errors';
import {
  useChannelRoleOverridesQuery,
  useDeleteChannelRoleOverrideMutation,
  useSetChannelRoleOverrideMutation,
} from '../hooks/useApi';
import type { Channel, Role } from '../types';
import { CHANNEL_OVERRIDE_PERMISSIONS, overrideStateOf, sameOverride, withOverrideState, type OverrideState } from './permissions';

const NO_OVERRIDE = { allow: [] as string[], deny: [] as string[] };

/** Opciones de cada permiso, en el orden en que se muestran. */
export const OVERRIDE_CHOICES: { value: OverrideState; label: string }[] = [
  { value: 'deny', label: 'denegar' },
  { value: 'inherit', label: 'heredar' },
  { value: 'allow', label: 'permitir' },
];

const OVERRIDE_ERRORS = {
  400: 'Ese permiso no se puede cambiar en un canal.',
  403: 'No tenés permisos para cambiar los permisos de los canales.',
  404: 'El canal o el rol ya no existen.',
};

/** El rol por defecto ya se llama @everyone: no se le agrega otra @. */
export function roleMention(role: Pick<Role, 'name'>): string {
  return role.name.startsWith('@') ? role.name : `@${role.name}`;
}

/**
 * Excepciones de permisos de un rol en los canales (#18), para los ajustes de web y mobile: el canal
 * elegido, un borrador de lo permitido y lo negado (se guarda con handleSave) y quitar la excepción. Vale
 * solo en ese canal: los permisos generales del rol no cambian. Montarlo con key={role.id} para que al
 * cambiar de rol se descarte el borrador.
 */
export function useChannelOverridesAdmin(serverId: string, role: Role, channels: Channel[]) {
  const [channelId, setChannelId] = useState(channels[0]?.id ?? '');
  const channel = channels.find((ch) => ch.id === channelId);
  const overridesQuery = useChannelRoleOverridesQuery(serverId || null, channel?.id ?? null);
  const setOverride = useSetChannelRoleOverrideMutation(serverId);
  const deleteOverride = useDeleteChannelRoleOverrideMutation(serverId);

  const saved = overridesQuery.data?.find((o) => o.roleId === role.id);
  const savedValue = saved ? { allow: saved.allow, deny: saved.deny } : NO_OVERRIDE;
  const [draft, setDraft] = useState<{ allow: string[]; deny: string[] } | null>(null);
  const current = draft ?? savedValue;
  const dirty = draft !== null && !sameOverride(draft, savedValue);
  const busy = setOverride.isPending || deleteOverride.isPending;
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const clearMessages = () => {
    setError(null);
    setNotice(null);
  };

  const selectChannel = (id: string) => {
    setChannelId(id);
    setDraft(null);
    clearMessages();
  };

  const stateOf = (permission: string) => overrideStateOf(current, permission);

  const setState = (permission: string, state: OverrideState) => {
    if (busy) return;
    setDraft(withOverrideState(current, permission, state));
  };

  const handleSave = async () => {
    if (!channel) return;
    clearMessages();
    const empty = current.allow.length === 0 && current.deny.length === 0;
    try {
      // Sin nada permitido ni negado no hay excepción: se borra si había
      if (empty && saved) {
        await deleteOverride.mutateAsync({ channelId: channel.id, roleId: role.id });
      } else if (!empty) {
        await setOverride.mutateAsync({ channelId: channel.id, roleId: role.id, ...current });
      }
      setDraft(null);
      setNotice(`Se guardaron los permisos de ${roleMention(role)} en •${channel.name}.`);
    } catch (err) {
      setError(errorMessageFor(err, OVERRIDE_ERRORS, 'No se pudieron guardar los permisos del canal.'));
    }
  };

  const handleRemove = async () => {
    if (!channel) return;
    clearMessages();
    try {
      await deleteOverride.mutateAsync({ channelId: channel.id, roleId: role.id });
      setDraft(null);
      setNotice(`${roleMention(role)} vuelve a tener sus permisos generales en •${channel.name}.`);
    } catch (err) {
      setError(errorMessageFor(err, OVERRIDE_ERRORS, 'No se pudo quitar la excepción.'));
    }
  };

  return {
    channelId,
    channel,
    selectChannel,
    /** Permisos que se pueden cambiar en el canal elegido (dependen de si es de texto o de voz). */
    permissions: channel ? CHANNEL_OVERRIDE_PERMISSIONS[channel.type] : [],
    overridesQuery,
    hasOverride: Boolean(saved),
    stateOf,
    setState,
    dirty,
    busy,
    error,
    notice,
    discard: () => setDraft(null),
    handleSave,
    handleRemove,
  };
}

export type ChannelOverridesAdminState = ReturnType<typeof useChannelOverridesAdmin>;
