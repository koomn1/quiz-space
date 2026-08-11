

## Current production findings

The published landing page was opened at `https://koomn1.github.io/quiz-space/?v=f9206a7#/dashboard/landing?tab=landing` while signed in as Youssef Badawy. The Motivation Hub loaded and displayed all ten feature cards with WebP images: Lucky Wheel, Daily Streak, Mystery Box, Brain Challenge, Referral, Weekly Achievement, Happy Hour, Group Challenge, Leaderboard, and Daily AI Quiz.

The visible controls included `🎡 دوّر!`, the Mystery Box state button, the Brain Challenge answer input and submit button, and the referral copy button. The Lucky Wheel image rotated when the feature was previously tested, but the UI has no fixed pointer/marker showing the selected stopping position. The remaining feature cards are rendered as plain `div` cards without click handlers, so they do not open details or provide a response when clicked. The code confirms that only Lucky Spin, Mystery Box, Brain Challenge, and Referral have event handlers; Streak, Weekly Achievement, Happy Hour, Group Challenge, Leaderboard, and AI Quiz are display-only.

The requested fix is to add a fixed wheel pointer and make all feature cards keyboard/mouse interactive without interfering with their existing action buttons. The implementation has begun in `src/components/MotivationHub.tsx` by adding active-feature state and keyboard-accessible open helpers, plus handlers on Lucky Spin, Daily Streak, Mystery Box, and Brain Challenge cards.
