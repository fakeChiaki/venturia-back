import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CreatorOnlyGuard } from './creator-only.guard';
import { DeveloperOnlyGuard } from './developer-only.guard';
import { CompanyOnlyGuard } from './company-only.guard';
import { NaturalPersonSubtype } from '../../users/entities/natural-person-profile.entity';
import { UserType } from '../../users/entities/user.entity';

function ctx(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('Guards de rol', () => {
  describe('CreatorOnlyGuard', () => {
    const guard = new CreatorOnlyGuard();

    it('permite a un creador', () => {
      expect(guard.canActivate(ctx({ subtype: NaturalPersonSubtype.CREATOR }))).toBe(true);
    });
    it('rechaza a un developer', () => {
      expect(() => guard.canActivate(ctx({ subtype: NaturalPersonSubtype.DEVELOPER }))).toThrow(
        ForbiddenException,
      );
    });
    it('rechaza si no hay usuario', () => {
      expect(() => guard.canActivate(ctx(undefined))).toThrow(ForbiddenException);
    });
  });

  describe('DeveloperOnlyGuard', () => {
    const guard = new DeveloperOnlyGuard();

    it('permite a un developer', () => {
      expect(guard.canActivate(ctx({ subtype: NaturalPersonSubtype.DEVELOPER }))).toBe(true);
    });
    it('rechaza a un creador', () => {
      expect(() => guard.canActivate(ctx({ subtype: NaturalPersonSubtype.CREATOR }))).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('CompanyOnlyGuard', () => {
    const guard = new CompanyOnlyGuard();

    it('permite a una empresa', () => {
      expect(guard.canActivate(ctx({ type: UserType.COMPANY }))).toBe(true);
    });
    it('rechaza a una persona natural', () => {
      expect(() => guard.canActivate(ctx({ type: UserType.NATURAL_PERSON }))).toThrow(
        ForbiddenException,
      );
    });
  });
});
