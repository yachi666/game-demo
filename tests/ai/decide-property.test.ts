import { describe, expect, it } from 'vitest';

import { shouldAiBuyProperty } from '../../assets/scripts/ai/decide-property';

describe('shouldAiBuyProperty', () => {
  it('buys only when reserve cash remains after purchase', () => {
    expect(shouldAiBuyProperty(400, 140, 150)).toBe(true);
    expect(shouldAiBuyProperty(260, 140, 150)).toBe(false);
  });
});
