import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const resolverSource = readFileSync(resolve(process.cwd(), 'src/components/QuizResolver.tsx'), 'utf8');

describe('QuizResolver Cosmo entitlement contract', () => {
  it('uses a paid entitlement instead of a visual-only plan check', () => {
    expect(resolverSource).toContain('const hasCosmoAccess = Boolean(isPremium) || userPlan === \'Silver\' || userPlan === \'Gold\' || userPlan === \'Diamond\';');
    expect(resolverSource).toContain('if (!hasCosmoAccess)');
    expect(resolverSource).toContain('شرح كوزمو للمشتركين فقط');
    expect(resolverSource).toContain('Cosmo explanations are available to paid members only');
  });

  it('keeps the base explanation available while protecting the AI add-on', () => {
    expect(resolverSource).toContain('currentQuestion.explanation ||');
    expect(resolverSource).toContain('{!hasCosmoAccess ? (');
    expect(resolverSource).toContain('handleFetchAiFlashcardExplanation(currentQuestion.id, currentQuestion)');
    expect(resolverSource).toContain("userPlan !== 'Gold' && userPlan !== 'Diamond'");
  });

  it('keeps the next action close and reachable on short mobile viewports', () => {
    expect(resolverSource).toContain('space-y-4 pb-8');
    expect(resolverSource).toContain('space-y-5 sm:space-y-10');
    expect(resolverSource).toContain('min-h-12 items-center');
    expect(resolverSource).toContain('sticky bottom-2');
  });
});
