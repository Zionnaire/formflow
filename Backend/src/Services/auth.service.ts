import bcrypt from 'bcryptjs';
import { UserModel, type IUser, type PrimaryProfile, type SecondaryProfile } from '../Models/User.model.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../Middlewares/jwt.js';
import { ApiError } from '../Utils/errors.js';
import { logger } from '../Middlewares/logger.js';

const BCRYPT_ROUNDS = 12;

export async function registerUser(
  email: string,
  password: string,
  fullName?: string,
): Promise<{ accessToken: string; refreshToken: string; user: IUser }> {
  const existing = await UserModel.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, 'Email already in use', 'CONFLICT');

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await UserModel.create({
    email: email.toLowerCase(),
    passwordHash,
    primaryProfile: fullName ? { fullName } : {},
  });

  logger.info({ userId: user._id.toString() }, 'User registered');

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ sub: user._id.toString(), email: user.email }),
    signRefreshToken(user._id.toString()),
  ]);

  return { accessToken, refreshToken, user };
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string; user: IUser }> {
  const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ sub: user._id.toString(), email: user.email }),
    signRefreshToken(user._id.toString()),
  ]);

  logger.info({ userId: user._id.toString() }, 'User login');
  return { accessToken, refreshToken, user };
}

export async function refreshAuthTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const { sub } = await verifyRefreshToken(refreshToken);
  const user = await UserModel.findById(sub);
  if (!user) throw new ApiError(401, 'User not found', 'TOKEN_INVALID');

  const [accessToken, newRefreshToken] = await Promise.all([
    signAccessToken({ sub: user._id.toString(), email: user.email }),
    signRefreshToken(user._id.toString()),
  ]);

  return { accessToken, refreshToken: newRefreshToken };
}

export async function getUserById(id: string): Promise<IUser | null> {
  return UserModel.findById(id);
}

export async function updateProfile(
  userId: string,
  patch: { primaryProfile?: Partial<PrimaryProfile>; secondaryProfiles?: SecondaryProfile[] },
): Promise<IUser> {
  const user = await UserModel.findById(userId);
  if (!user) throw new ApiError(404, 'User not found', 'NOT_FOUND');

  if (patch.primaryProfile) {
    Object.assign(user.primaryProfile, patch.primaryProfile);
  }
  if (patch.secondaryProfiles) {
    user.secondaryProfiles = patch.secondaryProfiles as IUser['secondaryProfiles'];
  }

  await user.save();
  logger.info({ userId }, 'Profile updated');
  return user;
}
