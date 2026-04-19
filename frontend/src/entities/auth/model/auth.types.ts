export type TUserProfile = {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  city?: string;
};

export type TAuthResponse = {
  accessToken: string;
  user: TUserProfile;
};

export type TLoginPayload = {
  email: string;
  password: string;
};

export type TRegisterPayload = {
  email: string;
  password: string;
  fullName: string;
};
