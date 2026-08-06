import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserProfileStats, saveUserProfile } from '../lib/db';
import { UserStats } from '../types';

export function useUserProfile(userId: string) {
  const queryClient = useQueryClient();

  const { data: profileStats, isLoading, error, refetch } = useQuery<UserStats>({
    queryKey: ['userProfile', userId],
    queryFn: () => getUserProfileStats(userId),
    enabled: !!userId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // Background updates every 10 seconds
  });

  const saveProfileMutation = useMutation({
    mutationFn: (data: {
      name: string;
      photoURL?: string;
      email?: string;
      bio?: string;
      location?: string;
      badgeSymbol?: string;
      badgeColor?: string;
      customId?: string;
      isStartupSync?: boolean;
    }) => saveUserProfile(
      userId,
      data.name,
      data.photoURL,
      data.email,
      data.bio,
      data.location,
      data.badgeSymbol,
      data.badgeColor,
      data.customId
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
    },
  });

  return {
    profileStats,
    isLoadingProfile: isLoading,
    profileError: error,
    refetchProfile: refetch,
    saveUserProfile: saveProfileMutation.mutateAsync,
    isSavingProfile: saveProfileMutation.isPending,
  };
}
