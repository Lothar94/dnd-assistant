import { describe, expect, it } from 'vitest';
import { bboxSchema, citationsSchema, messageRoleSchema } from '../src/index.js';

const uuid = '3f0c9a52-6f5b-4d0e-9f0a-0c9d6a1b2c3d';

describe('db contracts', () => {
  it('accepts valid citations and rejects page 0', () => {
    expect(citationsSchema.safeParse([{ documentId: uuid, page: 19, quote: 'x' }]).success).toBe(true);
    expect(citationsSchema.safeParse([{ documentId: uuid, page: 0 }]).success).toBe(false);
  });

  it('requires exactly four bbox coordinates', () => {
    expect(bboxSchema.safeParse([0, 0, 10, 10]).success).toBe(true);
    expect(bboxSchema.safeParse([0, 0, 10]).success).toBe(false);
  });

  it('rejects unknown roles', () => {
    expect(messageRoleSchema.safeParse('bot').success).toBe(false);
  });
});
