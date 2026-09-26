import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { getMyProfile, upsertMyProfile, CreateProfileRequest } from '../users';
import { getServers, getServerMembers, createServer, CreateServerRequest, createChannel, CreateChannelRequest, editChannel, EditChannelRequest, deleteChannel } from '../servers';
import {
  getRoles,
  getRoleMembers,
  assignRoleToMember,
  removeRoleFromMember,
  createRole,
  deleteRole,
  updateRolePermissions,
  updateRoleInfo,
  setDefaultRole,
  CreateRoleRequest,
  UpdateRoleInfoRequest,
} from '../roles';
import type { Role } from '../../types';
import { getMessages, sendMessage, GetMessagesOptions } from '../messages';
import { useSession } from '../../auth/session';

export function useMyProfileQuery() {
  const status = useSession((s) => s.status);
  return useQuery({
    queryKey: ['myProfile'],
    queryFn: getMyProfile,
    enabled: status === 'authenticated',
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useUpsertProfileMutation() {
  const queryClient = useQueryClient();
  const setStatus = useSession((s) => s.setStatus);

  return useMutation({
    mutationFn: (payload: CreateProfileRequest) => upsertMyProfile(payload),
    onSuccess: (profile) => {
      queryClient.setQueryData(['myProfile'], profile);
      setStatus('authenticated', { profile });
    },
  });
}

export function useServersQuery() {
  const status = useSession((s) => s.status);
  return useQuery({
    queryKey: ['servers'],
    queryFn: getServers,
    enabled: status === 'authenticated',
  });
}

export function useServerMembersQuery(serverId: string | null) {
  const status = useSession((s) => s.status);
  return useInfiniteQuery({
    queryKey: ['server-members', serverId],
    queryFn: ({ pageParam }) => getServerMembers(serverId as string, { offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.offset + lastPage.items.length;
      return loaded < lastPage.total ? loaded : undefined;
    },
    enabled: status === 'authenticated' && Boolean(serverId),
  });
}

export function useCreateServerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateServerRequest) => createServer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}

export function useChannelMessagesQuery(channelId: string | null, options?: GetMessagesOptions) {
  const status = useSession((s) => s.status);
  const profile = useSession((s) => s.profile);
  
  return useQuery({
    queryKey: ['messages', channelId, options],
    queryFn: async () => {
      if (!channelId) return [];
      const msgs = await getMessages(channelId, options);
      return msgs.map(msg => {
        if (msg.authorId === profile?.id && !msg.author) {
          msg.author = {
            id: profile.id,
            username: profile.email?.split('@')[0] || profile.username || 'User',
            displayName: profile.displayName || profile.display_name || 'User',
            avatar: profile.avatar || profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
            status: profile.status ||'online',
          };
        }
        return msg;
      });
    },
    enabled: status === 'authenticated' && Boolean(channelId),
  });
}

export function useSendMessageMutation(channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ content, clientMessageId }: { content: string; clientMessageId?: string }) =>
      sendMessage(channelId, content, clientMessageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });
}


export function useCreateChannelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serverId, payload }: { serverId: string; payload: CreateChannelRequest }) => createChannel(serverId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}

export function useEditChannelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serverId, channelId, payload }: { serverId: string; channelId: string; payload: EditChannelRequest }) => editChannel(serverId, channelId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}

export function useDeleteChannelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serverId, channelId }: { serverId: string; channelId: string }) => deleteChannel(serverId, channelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}

export function useRolesQuery(serverId: string | null) {
  const status = useSession((s) => s.status);
  return useQuery({
    queryKey: ['roles', serverId],
    queryFn: () => getRoles(serverId as string),
    enabled: status === 'authenticated' && Boolean(serverId),
  });
}

export function useRoleMembersQuery(serverId: string | null, roleId: string | null) {
  const status = useSession((s) => s.status);
  return useQuery({
    queryKey: ['role-members', serverId, roleId],
    queryFn: () => getRoleMembers(serverId as string, roleId as string),
    enabled: status === 'authenticated' && Boolean(serverId) && Boolean(roleId),
  });
}

export function useAssignRoleMutation(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, userId }: { roleId: string; userId: string }) =>
      assignRoleToMember(serverId, roleId, userId),
    onSuccess: (_data, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: ['server-members', serverId] });
      queryClient.invalidateQueries({ queryKey: ['role-members', serverId, roleId] });
    },
  });
}

export function useRemoveRoleMutation(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, userId }: { roleId: string; userId: string }) =>
      removeRoleFromMember(serverId, roleId, userId),
    onSuccess: (_data, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: ['server-members', serverId] });
      queryClient.invalidateQueries({ queryKey: ['role-members', serverId, roleId] });
    },
  });
}

export function useCreateRoleMutation(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRoleRequest) => createRole(serverId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
    },
  });
}

export function useUpdateRolePermissionsMutation(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: string[] }) =>
      updateRolePermissions(serverId, roleId, permissions),
    onSuccess: (updated) => {
      queryClient.setQueryData<Role[]>(['roles', serverId], (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r))
      );
    },
  });
}

export function useUpdateRoleInfoMutation(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, payload }: { roleId: string; payload: UpdateRoleInfoRequest }) =>
      updateRoleInfo(serverId, roleId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData<Role[]>(['roles', serverId], (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r))
      );
    },
  });
}

export function useSetDefaultRoleMutation(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) => setDefaultRole(serverId, roleId),
    // El backend también desmarca al rol por defecto anterior, así que se recarga toda la lista
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
    },
  });
}

export function useDeleteRoleMutation(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) => deleteRole(serverId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] });
    },
  });
}
