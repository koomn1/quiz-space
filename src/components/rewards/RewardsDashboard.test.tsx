import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import RewardsDashboard from './RewardsDashboard';
import PointsBalanceCard from './PointsBalanceCard';
import LevelProgressRail from './LevelProgressRail';
import DailyGiftMysteryBox from './DailyGiftMysteryBox';
import DailyChallengesList from './DailyChallengesList';
import WeeklyTasksBoard from './WeeklyTasksBoard';
import BadgesTrophyHall from './BadgesTrophyHall';
import VipLeaderboardPodium from './VipLeaderboardPodium';
import RewardLedgerSheet from './RewardLedgerSheet';
import RewardsSection from '../RewardsSection';
import { RewardBadge, RewardChallenge, RewardsSummary, WeeklyTask, WeeklyVipLeaderboardEntry } from '../../types';

describe('RewardsDashboard & 6 Core Pillars', () => {
  const mockSummary: RewardsSummary = {
    points: 1250,
    coins: 450,
    level: 5,
    dailyStreak: 3,
    vipTier: 'silver',
    currentLevel: { level: 5, name: 'Scholar', nameAr: 'عالم ناشئ', minPoints: 1000 },
    nextLevel: { level: 6, name: 'Expert', nameAr: 'خبير معرفي', minPoints: 2000 },
    currentVip: { id: 'silver', name: 'Silver', nameAr: 'فضي', minPoints: 1000, pointsMultiplier: 1.25, dailyCoinBonus: 10, challengeSlots: 3, color: '#C0C0C0', sortOrder: 2 },
    nextVip: { id: 'gold', name: 'Gold', nameAr: 'ذهبي', minPoints: 3000, pointsMultiplier: 1.5, dailyCoinBonus: 25, challengeSlots: 4, color: '#FFD700', sortOrder: 3 },
    badges: [
      {
        id: 'b1',
        name: 'First Quiz',
        nameAr: 'أول كويز',
        description: 'Complete your first quiz',
        descriptionAr: 'أكمل اختبارك الأول',
        icon: 'trophy',
        sortOrder: 1,
        earnedAt: '2026-11-20T08:00:00Z',
        rarity: 'common',
      },
      {
        id: 'b2',
        name: 'Streak Master',
        nameAr: 'بطل السلسلة',
        description: 'Reach 3 days streak',
        descriptionAr: 'حقق حضوراً لثلاثة أيام متتالية',
        icon: 'flame',
        sortOrder: 2,
        rarity: 'rare',
      },
      {
        id: 'b3',
        name: 'Cosmic Legend',
        nameAr: 'أسطورة كونية',
        description: 'Achieve legendary status',
        descriptionAr: 'حقق أعلى رتبة',
        icon: 'sparkles',
        sortOrder: 3,
        rarity: 'legendary',
      },
    ],
    recentEntries: [],
    dailyChallenges: [
      {
        id: 'c1',
        name: 'Daily Quiz Master',
        nameAr: 'سيد الاختبارات اليومي',
        description: 'Complete 2 quizzes',
        descriptionAr: 'أكمل اختبارين',
        eventType: 'quiz_completion',
        target: 2,
        progress: 1,
        pointsReward: 100,
        coinsReward: 30,
        icon: 'target',
        sortOrder: 1,
        isActive: true,
        claimed: false,
      },
    ],
  };

  it('renders all 6 reward pillars with brand tokens and test IDs in dashboard', () => {
    const html = renderToStaticMarkup(
      <RewardsDashboard userId="test-user" lang="ar" initialSummary={mockSummary} />
    );

    // Main container
    expect(html).toContain('data-testid="rewards-dashboard"');

    // Pillar 1: Points & Coins Balance Card with Arcade trigger
    expect(html).toContain('data-testid="points-balance-card"');
    expect(html).toContain('data-testid="arcade-hub-trigger"');

    // Pillar 2: Level Progress Rail
    expect(html).toContain('data-testid="level-progress-rail"');

    // Pillar 3: Daily Gift Mystery Box
    expect(html).toContain('data-testid="daily-gift-box"');

    // Pillar 4: Daily Challenges & Weekly Tasks
    expect(html).toContain('data-testid="daily-challenges-list"');
    expect(html).toContain('data-testid="weekly-tasks-board"');

    // Pillar 5: Badges Trophy Hall
    expect(html).toContain('data-testid="badges-trophy-hall"');

    // Pillar 6: VIP Leaderboard Podium
    expect(html).toContain('data-testid="vip-leaderboard-podium"');

    // Brand colors check
    expect(html).toContain('#007472'); // Petrol
    expect(html).toContain('#2AC3BB'); // Bright Teal
    expect(html).toContain('#EE8361'); // Coral
    expect(html).toContain('#FCF6EE'); // Ivory
    expect(html).toContain('#072424'); // Surface

    // Mascot Guide presence
    expect(html).toContain('data-testid="cosmo-dialogue-bubble"');
  });

  describe('Pillar 1: PointsBalanceCard', () => {
    it('displays XP points, coins, and action buttons', () => {
      const html = renderToStaticMarkup(
        <PointsBalanceCard
          points={1250}
          coins={450}
          onOpenLedger={() => {}}
          onOpenArcade={() => {}}
          onOpenStore={() => {}}
          lang="ar"
        />
      );

      expect(html).toContain('data-testid="points-balance-card"');
      expect(html).toContain('data-testid="arcade-hub-trigger"');
      expect(html).toContain('1,250');
      expect(html).toContain('450');
      expect(html).toContain('سجل العمليات');
      expect(html).toContain('أركيد الألعاب والألغاز');
      expect(html).toContain('متجر الإطارات');
    });
  });

  describe('Pillar 2: LevelProgressRail', () => {
    it('displays level, progress bar, and VIP tier details', () => {
      const html = renderToStaticMarkup(
        <LevelProgressRail
          level={5}
          points={1250}
          currentLevel={mockSummary.currentLevel}
          nextLevel={mockSummary.nextLevel}
          vipTier="silver"
          currentVip={mockSummary.currentVip}
          nextVip={mockSummary.nextVip}
          lang="ar"
        />
      );

      expect(html).toContain('data-testid="level-progress-rail"');
      expect(html).toContain('5');
      expect(html).toContain('عالم ناشئ');
      expect(html).toContain('VIP TIER');
      expect(html).toContain('فضي');
      expect(html).toContain('1.3x'); // 1.25 rounded to 1.3 in toFixed(1)
      expect(html).toContain('750'); // 2000 - 1250
    });
  });

  describe('Pillar 3: DailyGiftMysteryBox', () => {
    it('renders 3D mystery chest, streak loop and claim button', () => {
      const html = renderToStaticMarkup(
        <DailyGiftMysteryBox
          dailyStreak={3}
          claimed={false}
          canClaim={true}
          lang="ar"
        />
      );

      expect(html).toContain('data-testid="daily-gift-box"');
      expect(html).toContain('صندوق الهدايا والمفاجآت');
      expect(html).toContain('3 أيام متتالية');
      expect(html).toContain('افتح الصندوق الآن');
    });

    it('renders claimed state correctly', () => {
      const html = renderToStaticMarkup(
        <DailyGiftMysteryBox
          dailyStreak={3}
          claimed={true}
          canClaim={false}
          lang="ar"
        />
      );

      expect(html).toContain('تم استلام هدية اليوم');
    });
  });

  describe('Pillar 4: DailyChallengesList & WeeklyTasksBoard', () => {
    it('renders daily challenge cards with progress and reward badges', () => {
      const challenges: RewardChallenge[] = [
        {
          id: 'test-c1',
          name: 'Solve 3 Quizzes',
          nameAr: 'حل 3 اختبارات',
          description: 'Pass 3 quizzes today',
          descriptionAr: 'انجح في 3 اختبارات اليوم',
          eventType: 'quiz_completion',
          target: 3,
          progress: 2,
          pointsReward: 150,
          coinsReward: 50,
          icon: 'target',
          sortOrder: 1,
          isActive: true,
          claimed: false,
        },
      ];

      const html = renderToStaticMarkup(
        <DailyChallengesList challenges={challenges} onClaim={() => {}} lang="ar" />
      );

      expect(html).toContain('data-testid="daily-challenges-list"');
      expect(html).toContain('حل 3 اختبارات');
      expect(html).toContain('2/3');
      expect(html).toContain('+150 XP');
      expect(html).toContain('+50');
    });

    it('renders weekly task cards with milestone rewards', () => {
      const tasks: WeeklyTask[] = [
        {
          id: 'w1',
          name: 'Weekly Champion',
          nameAr: 'بطل الأسبوع',
          description: 'Score 500 XP this week',
          descriptionAr: 'اجمع 500 نقطة هذا الأسبوع',
          eventType: 'weekly_xp',
          target: 500,
          progress: 500,
          pointsReward: 300,
          coinsReward: 100,
          icon: 'trophy',
          sortOrder: 1,
        },
      ];

      const html = renderToStaticMarkup(
        <WeeklyTasksBoard tasks={tasks} onClaimTask={() => {}} lang="ar" />
      );

      expect(html).toContain('data-testid="weekly-tasks-board"');
      expect(html).toContain('بطل الأسبوع');
      expect(html).toContain('500/500');
      expect(html).toContain('+300 XP');
      expect(html).toContain('اجمع المكافأة الآن');
    });
  });

  describe('Pillar 5: BadgesTrophyHall', () => {
    it('renders badges with rarity styling and filter tabs', () => {
      const badges: RewardBadge[] = [
        {
          id: 'b-legendary',
          name: 'Legendary Pioneer',
          nameAr: 'رائد أسطوري',
          description: 'A true legend',
          descriptionAr: 'أسطورة حقيقية',
          icon: 'award',
          sortOrder: 1,
          earnedAt: '2026-11-20T09:00:00Z',
          rarity: 'legendary',
        },
      ];

      const html = renderToStaticMarkup(<BadgesTrophyHall badges={badges} lang="ar" />);

      expect(html).toContain('data-testid="badges-trophy-hall"');
      expect(html).toContain('رائد أسطوري');
      expect(html).toContain('legendary');
      expect(html).toContain('الكل');
      expect(html).toContain('مكتملة');
      expect(html).toContain('قيد التقدم');
    });
  });

  describe('Pillar 6: VipLeaderboardPodium', () => {
    it('renders top 3 podium pillars and ranks', () => {
      const entries: WeeklyVipLeaderboardEntry[] = [
        {
          leaderboardRank: 1,
          userId: 'u1',
          displayName: 'Player One',
          vipTier: 'platinum',
          weeklyPoints: 2400,
          isMe: false,
        },
        {
          leaderboardRank: 2,
          userId: 'u2',
          displayName: 'Player Two',
          vipTier: 'gold',
          weeklyPoints: 1800,
          isMe: false,
        },
        {
          leaderboardRank: 3,
          userId: 'u3',
          displayName: 'Player Three',
          vipTier: 'silver',
          weeklyPoints: 1200,
          isMe: true,
        },
      ];

      const html = renderToStaticMarkup(<VipLeaderboardPodium entries={entries} lang="ar" />);

      expect(html).toContain('data-testid="vip-leaderboard-podium"');
      expect(html).toContain('Player One');
      expect(html).toContain('Player Two');
      expect(html).toContain('Player Three');
      expect(html).toContain('2,400 XP');
    });
  });

  describe('RewardLedgerSheet', () => {
    it('renders slide-over sheet with transactions when open', () => {
      const html = renderToStaticMarkup(
        <RewardLedgerSheet
          isOpen={true}
          onClose={() => {}}
          entries={[
            {
              id: 'led-1',
              points: 50,
              coins: 15,
              eventType: 'quiz_completion',
              eventKey: 'quiz_123',
              createdAt: '2026-11-20T09:00:00Z',
            },
          ]}
          offset={0}
          hasMore={false}
          lang="ar"
        />
      );

      expect(html).toContain('data-testid="reward-ledger-sheet"');
      expect(html).toContain('سجل العمليات والمكافآت');
      expect(html).toContain('إكمال اختبار');
      expect(html).toContain('+50 XP');
    });
  });

  describe('RewardsSection backwards compatibility', () => {
    it('renders RewardsDashboard seamlessly via RewardsSection', () => {
      const html = renderToStaticMarkup(<RewardsSection userId="compat-user" lang="ar" />);
      expect(html).toContain('data-testid="rewards-dashboard"');
      expect(html).toContain('data-testid="points-balance-card"');
    });
  });
});
