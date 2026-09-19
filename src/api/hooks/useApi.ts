import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyProfile, upsertMyProfile, CreateProfileRequest } from '../users';
import { getServers, createServer, CreateServerRequest } from '../servers';
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
  return useQuery({
    queryKey: ['messages', channelId, options],
    queryFn: () => (channelId ? getMessages(channelId, options) : Promise.resolve([])),
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

