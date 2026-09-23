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

