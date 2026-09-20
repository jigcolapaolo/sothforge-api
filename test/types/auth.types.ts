export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
};

export type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};
