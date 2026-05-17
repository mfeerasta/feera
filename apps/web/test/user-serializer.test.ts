import { describe, expect, it } from 'vitest';
import {
  canSeeGender,
  maskUserForViewer,
  maskUsersForViewer,
  type MaskableUser,
  type Viewer,
} from '../src/lib/api/user-serializer';

const OWNER = 'u-owner';
const FRIEND = 'u-friend';
const STRANGER = 'u-stranger';

function userWith(visibility: MaskableUser['genderVisibility']): MaskableUser {
  return { id: OWNER, gender: 'f', genderVisibility: visibility };
}

function viewer(id: string | null, friends: string[] = []): Viewer {
  return { userId: id, friendUserIds: new Set(friends) };
}

describe('canSeeGender', () => {
  describe('owner always sees self', () => {
    for (const vis of ['public', 'friends', 'private'] as const) {
      it(`owner sees their own gender when visibility=${vis}`, () => {
        expect(canSeeGender(userWith(vis), viewer(OWNER))).toBe(true);
      });
    }
  });

  describe('public visibility', () => {
    it('lets signed-in strangers see gender', () => {
      expect(canSeeGender(userWith('public'), viewer(STRANGER))).toBe(true);
    });
    it('lets anonymous viewers see gender (used by club listings)', () => {
      expect(canSeeGender(userWith('public'), viewer(null))).toBe(true);
    });
  });

  describe('friends visibility', () => {
    it('blocks strangers', () => {
      expect(canSeeGender(userWith('friends'), viewer(STRANGER))).toBe(false);
    });
    it('blocks anonymous viewers', () => {
      expect(canSeeGender(userWith('friends'), viewer(null))).toBe(false);
    });
    it('allows accepted friends', () => {
      const v = viewer(FRIEND, [OWNER]);
      expect(canSeeGender(userWith('friends'), v)).toBe(true);
    });
    it('does not leak when friend set is undefined', () => {
      expect(canSeeGender(userWith('friends'), { userId: FRIEND })).toBe(false);
    });
  });

  describe('private visibility', () => {
    it('blocks accepted friends', () => {
      const v = viewer(FRIEND, [OWNER]);
      expect(canSeeGender(userWith('private'), v)).toBe(false);
    });
    it('blocks strangers', () => {
      expect(canSeeGender(userWith('private'), viewer(STRANGER))).toBe(false);
    });
    it('blocks anonymous', () => {
      expect(canSeeGender(userWith('private'), viewer(null))).toBe(false);
    });
  });

  describe('admin bypass', () => {
    it('admin sees private gender', () => {
      expect(canSeeGender(userWith('private'), { userId: STRANGER, isAdmin: true })).toBe(true);
    });
  });
});

describe('maskUserForViewer', () => {
  it('blanks gender when not visible', () => {
    const masked = maskUserForViewer(userWith('private'), viewer(STRANGER));
    expect(masked.gender).toBeNull();
  });
  it('keeps gender when visible', () => {
    const masked = maskUserForViewer(userWith('public'), viewer(STRANGER));
    expect(masked.gender).toBe('f');
  });
  it('does not mutate input', () => {
    const original = userWith('private');
    maskUserForViewer(original, viewer(STRANGER));
    expect(original.gender).toBe('f');
  });
  it('preserves non-gender fields', () => {
    type Ext = MaskableUser & { displayName: string };
    const u: Ext = { ...userWith('private'), displayName: 'Aisha' };
    const masked = maskUserForViewer(u, viewer(STRANGER));
    expect(masked.displayName).toBe('Aisha');
    expect(masked.gender).toBeNull();
  });
});

describe('maskUsersForViewer', () => {
  it('masks each user independently', () => {
    const a: MaskableUser = { id: 'a', gender: 'f', genderVisibility: 'public' };
    const b: MaskableUser = { id: 'b', gender: 'm', genderVisibility: 'private' };
    const v: Viewer = { userId: STRANGER };
    const masked = maskUsersForViewer([a, b], v);
    expect(masked[0]?.gender).toBe('f');
    expect(masked[1]?.gender).toBeNull();
  });
});
