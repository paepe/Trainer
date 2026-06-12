import React from 'react';
import type { Profile } from '../types/auth';

export interface PersistedAvatarUser {
  id?:         string | null;
  name?:       string;
  email?:      string;
  phone?:      string;
  dob?:        string;
  location?:   string;
  gender?:     string;
  avatar_url?: string | null;
}

export type SaveUserFn = (data: Partial<Profile> & { email?: string }) => Promise<{ error: unknown }>;

export interface UsePersistedAvatarResult {
  avatarUrl: string | null;
  persist:   (publicUrl: string) => Promise<void>;
}

/**
 * Local display state + persistence for the user's profile avatar
 * (`profiles.avatar_url`). `updateProfile` (useAuth) does a partial PATCH,
 * so only `avatar_url` strictly needs to be sent — the personal fields are
 * included here just to keep local state in sync with what's displayed.
 */
export function usePersistedAvatar(
  user:     PersistedAvatarUser | undefined,
  saveUser: SaveUserFn | undefined,
): UsePersistedAvatarResult {
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(user?.avatar_url ?? null);

  const persist = React.useCallback(async (publicUrl: string) => {
    setAvatarUrl(publicUrl);
    await saveUser?.({
      name:     user?.name ?? '',
      email:    user?.email ?? '',
      phone:    user?.phone ?? '',
      dob:      user?.dob ?? '',
      location: user?.location ?? '',
      ...(user?.gender ? { gender: user.gender as Profile['gender'] } : {}),
      avatar_url: publicUrl.split('?')[0] as string,
    });
  }, [user, saveUser]);

  return { avatarUrl, persist };
}
