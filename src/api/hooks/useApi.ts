import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { getMyProfile, upsertMyProfile, CreateProfileRequest } from '../users';
import { getServers, getServerMembers, createServer, CreateServerRequest, createChannel, CreateChannelRequest, editChannel, EditChannelRequest, deleteChannel, createCategory, CreateCategoryRequest, deleteCategory, reorderChannels, reorderCategories } from '../servers';
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
import type { Category, Role, Server } from '../../types';
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

// El autor de cada mensaje no se embebe acá: la UI lo resuelve por authorId contra el mapa de
// usuarios, que mantiene al día el perfil propio (p. ej. tras cambiar el nombre visible).
export function useChannelMessagesQuery(channelId: string | null, options?: GetMessagesOptions) {
  const status = useSession((s) => s.status);

  return useQuery({
    queryKey: ['messages', channelId, options],
    queryFn: async () => {
      if (!channelId) return [];
      return getMessages(channelId, options);
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

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serverId, payload }: { serverId: string; payload: CreateCategoryRequest }) =>
      createCategory(serverId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serverId, categoryId }: { serverId: string; categoryId: string }) =>
      deleteCategory(serverId, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}

/**
 * Reorden optimista: muestra el orden nuevo al instante, lo guarda en el backend y,
 * si falla (p. ej. 403 sin permisos), vuelve al orden anterior.
 */
function useReorderMutation(save: (serverId: string, categories: Category[]) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serverId, categories }: { serverId: string; categories: Category[] }) =>
      save(serverId, categories),
    onMutate: async ({ serverId, categories }) => {
      await queryClient.cancelQueries({ queryKey: ['servers'] });
      const previous = queryClient.getQueryData<Server[]>(['servers']);
      queryClient.setQueryData<Server[]>(['servers'], (old) =>
        old?.map((srv) =>
          srv.id === serverId
            ? { ...srv, categories, channels: categories.flatMap((c) => c.channels) }
            : srv
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['servers'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });
}

export function useReorderChannelsMutation() {
  return useReorderMutation(reorderChannels);
}

export function useReorderCategoriesMutation() {
  return useReorderMutation(reorderCategories);
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
