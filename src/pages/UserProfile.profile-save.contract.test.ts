import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/pages/UserProfile.tsx'), 'utf8');

describe('profile save frame entitlement contract', () => {
  it('only validates frame ownership after an explicit frame change', () => {
    expect(source).toContain('const initialEditFrameIdRef = React.useRef');
    expect(source).toContain('const frameSelectionChanged = editFrameId !== initialEditFrameIdRef.current;');
    expect(source).toContain('if (frameSelectionChanged && editFrameId !== previousFrameId)');
  });

  it('captures the frame value when opening the comprehensive editor', () => {
    expect(source).toContain('initialEditFrameIdRef.current = editFrameId;');
    expect(source).toContain('initialEditFrameIdRef.current = editFrameId;\n                        setIsEditing(true);');
  });
});
