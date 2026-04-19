import type { TUserProfile } from '../../auth/model/auth.types';

type TOwnershipMeta = {
  isMine?: boolean;
  ownerId?: string;
  userId?: string;
  seller?: {
    id?: string;
  };
};

type TCanManageOptions = {
  assumeOwnOnMyAdsRoute?: boolean;
};

export const canManageAd = (
  ad: TOwnershipMeta | null | undefined,
  user: TUserProfile | null,
  options?: TCanManageOptions,
) => {
  if (!ad || !user) {
    return false;
  }

  if (ad.isMine === true) {
    return true;
  }

  if (ad.ownerId && ad.ownerId === user.id) {
    return true;
  }

  if (ad.userId && ad.userId === user.id) {
    return true;
  }

  if (ad.seller?.id && ad.seller.id === user.id) {
    return true;
  }

  // TODO: when backend consistently returns ownerId/isMine for all ad payloads, remove route fallback.
  return Boolean(options?.assumeOwnOnMyAdsRoute);
};
