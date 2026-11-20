import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { AvatarCustomizerModal } from './AvatarCustomizerModal';

describe('AvatarCustomizerModal Component', () => {
  it('does not render when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <AvatarCustomizerModal
        isOpen={false}
        onClose={vi.fn()}
        userId="user-123"
        userCoins={250}
        lang="ar"
      />
    );
    expect(html).toBe('');
  });

  it('renders modal dialog with data-testid="avatar-customizer-modal" when isOpen is true', () => {
    const html = renderToStaticMarkup(
      <AvatarCustomizerModal
        isOpen={true}
        onClose={vi.fn()}
        userId="user-123"
        userCoins={250}
        lang="ar"
      />
    );

    expect(html).toContain('data-testid="avatar-customizer-modal"');
    expect(html).toContain('data-testid="coins-balance-indicator"');
    expect(html).toContain('data-testid="avatar-live-preview-section"');
  });

  it('displays user coin balance in the header indicator', () => {
    const html = renderToStaticMarkup(
      <AvatarCustomizerModal
        isOpen={true}
        onClose={vi.fn()}
        userId="user-123"
        userCoins={450}
        lang="ar"
      />
    );

    expect(html).toContain('450');
    expect(html).toContain('رصيد العملات');
  });

  it('renders all 6 luxury avatar frames in the catalog grid with Arabic and English names', () => {
    const html = renderToStaticMarkup(
      <AvatarCustomizerModal
        isOpen={true}
        onClose={vi.fn()}
        userId="user-123"
        userCoins={300}
        lang="ar"
      />
    );

    expect(html).toContain('حجر السج البترولي');
    expect(html).toContain('Petrol Obsidian');
    expect(html).toContain('تيل نيون مشع');
    expect(html).toContain('Bright Teal Neon');
    expect(html).toContain('لهب المرجان');
    expect(html).toContain('Coral Flame');
    expect(html).toContain('كوزمو الذهبي');
    expect(html).toContain('Golden Cosmo');
    expect(html).toContain('ألماس سماوي');
    expect(html).toContain('Diamond Celestial');
    expect(html).toContain('عاجي رملي');
    expect(html).toContain('Sand Ivory');

    // Verify card test IDs
    expect(html).toContain('data-testid="avatar-frame-card-frame-petrol-obsidian"');
    expect(html).toContain('data-testid="avatar-frame-card-frame-coral-flame"');
    expect(html).toContain('data-testid="avatar-frame-card-frame-diamond-celestial"');
  });

  it('renders close button in Arabic and English', () => {
    const htmlAr = renderToStaticMarkup(
      <AvatarCustomizerModal
        isOpen={true}
        onClose={vi.fn()}
        userId="user-123"
        userCoins={100}
        lang="ar"
      />
    );
    expect(htmlAr).toContain('إغلاق');

    const htmlEn = renderToStaticMarkup(
      <AvatarCustomizerModal
        isOpen={true}
        onClose={vi.fn()}
        userId="user-123"
        userCoins={100}
        lang="en"
      />
    );
    expect(htmlEn).toContain('Close');
  });
});
