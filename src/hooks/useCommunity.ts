import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getCommunityPosts, createCommunityPost, likeCommunityPost, deleteCommunityPost,
  getDirectMessages, sendDirectMessage, markMessagesAsRead,
  getNotifications, createNotification
} from '../lib/db';

export function useCommunity(userId?: string) {
  const queryClient = useQueryClient();

  // 1. Fetch community posts
  const { data: posts = [], refetch: refetchPosts } = useQuery<any[]>({
    queryKey: ['communityPosts'],
    queryFn: getCommunityPosts,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Poll posts every 5 seconds for live conversation
  });

  // 2. Fetch direct messages
  const { data: messages = [], refetch: refetchMessages } = useQuery<any[]>({
    queryKey: ['directMessages', userId],
    queryFn: () => getDirectMessages(userId || ''),
    enabled: !!userId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 4000, // Message polling every 4 seconds
  });

  // 3. Fetch general notifications
  const { data: systemNotifications = [], refetch: refetchNotifications } = useQuery<any[]>({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 8000, // Poll alerts every 8 seconds
  });

  // Mutations for Community Posts
  const createPostMutation = useMutation({
    mutationFn: (data: { text: string; authorId: string; authorName: string; authorBadgeSymbol?: string; authorBadgeColor?: string }) => 
      createCommunityPost(data.text, data.authorId, data.authorName, data.authorBadgeSymbol, data.authorBadgeColor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
    }
  });

  const likePostMutation = useMutation({
    mutationFn: (data: { postId: string; userId: string }) => likeCommunityPost(data.postId, data.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
    }
  });

  const deletePostMutation = useMutation({
    mutationFn: deleteCommunityPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
    }
  });

  // Mutations for Direct Messages
  const sendMessageMutation = useMutation({
    mutationFn: (data: { senderId: string; senderName: string; receiverId: string; receiverName: string; text: string }) =>
      sendDirectMessage(data.senderId, data.senderName, data.receiverId, data.receiverName, data.text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directMessages', userId] });
    }
  });

  const readMessagesMutation = useMutation({
    mutationFn: (data: { contactId: string }) => markMessagesAsRead(userId || '', data.contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directMessages', userId] });
    }
  });

  // Mutations for Notifications
  const createNotificationMutation = useMutation({
    mutationFn: (data: { title: string; body: string; senderName?: string; type?: string }) =>
      createNotification(data.title, data.body, data.senderName, data.type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  return {
    posts,
    refetchPosts,
    createPost: createPostMutation.mutateAsync,
    isCreatingPost: createPostMutation.isPending,
    likePost: likePostMutation.mutateAsync,
    deletePost: deletePostMutation.mutateAsync,

    messages,
    refetchMessages,
    sendMessage: sendMessageMutation.mutateAsync,
    isSendingMessage: sendMessageMutation.isPending,
    markMessagesAsRead: readMessagesMutation.mutateAsync,

    systemNotifications,
    refetchNotifications,
    createNotification: createNotificationMutation.mutateAsync
  };
}
