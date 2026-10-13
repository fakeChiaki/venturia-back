import { NaturalPersonSubtype } from '../../users/entities/natural-person-profile.entity';
import { AuthProvider, UserType } from '../../users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  type: UserType;
  provider: AuthProvider;
  subtype: NaturalPersonSubtype | null;
}

export interface JwtRefreshPayload {
  sub: string;
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
}

export interface TokensResponse {
  accessToken: string;
  refreshToken: string;
}
