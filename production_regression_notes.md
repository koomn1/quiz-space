# Production regression notes

The GitHub Actions run `31534150412` for commit `0aac1a4` completed successfully. The frontend build, GitHub Pages deployment, and AI Worker deployment all passed. GitHub reported only the existing Node.js 20 deprecation annotation for action metadata.

The published app at `https://koomn1.github.io/quiz-space/` opened in the persisted user session as Youssef Badawy. The onboarding/migration screen completed and the home dashboard loaded. The dashboard rendered the compressed Motivation Hub assets, including the Lucky Wheel, streak, mystery box, brain challenge, referral, weekly achievement, happy hour, group challenge, leaderboard, and AI quiz cards. The visible interface was readable in the current light appearance.

Cosmo Chat loaded an existing Arabic conversation titled `اشرح قانون نيوتن الثاني في سطرين`. The saved response was visible, included `F = m × a`, and the optional suggestions area was present, confirming that the non-blocking response/suggestions flow did not block the page.

The homepage navigation menu successfully opened. The first attempted click on the classroom item used a stale element index and navigated to Cosmo Chat instead; this is a browser snapshot/indexing issue, not a confirmed application defect. The next test will reopen the menu from the current page and use a fresh snapshot/DOM mapping to select `الفصول الدراسية`.

## Newly reproduced regression

On 2026-08-11, the live classroom creation form accepted the test name `اختبار Nemotron Regression` but failed on submit with the exact database error: `null value in column "code" of relation "classrooms" violates not-null constraint`. The existing classroom `عنبه • V77ZT0` remained visible, so no new test classroom was created. This is a confirmed production defect in the classroom creation insert payload or database default, and it must be fixed before final verification.
