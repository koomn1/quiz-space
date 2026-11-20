import React from 'react';
import RewardsDashboard from './rewards/RewardsDashboard';

export interface RewardsSectionProps {
  userId: string;
  lang: 'ar' | 'en';
}

export default function RewardsSection({ userId, lang }: RewardsSectionProps) {
  return <RewardsDashboard userId={userId} lang={lang} />;
}
