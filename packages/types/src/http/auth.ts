// User auth API response types

export interface UserRegisterResponse {
  user: {
    id: number;
    email: string;
    username: string | null;
    name: string | null;
    image?: string | null;
  };
  accessToken: string;
  refreshToken: string;
}

export interface UserLoginResponse {
  user: {
    id: number;
    email: string;
    username: string | null;
    name: string | null;
    image?: string | null;
  };
  accessToken: string;
  refreshToken: string;
}

export interface UserGoogleResponse {
  user: {
    id: number;
    email: string;
    username: string | null;
    name: string | null;
    image: string | null;
  };
  accessToken: string;
  refreshToken: string;
}

export interface UserRefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface UserLogoutResponse {
  status: "success";
}

export interface UserMeResponse {
  id: number;
  email: string;
  username: string | null;
  name: string | null;
  image: string | null;
  role: string;
  onboardingRequired: boolean;
  hasPassword: boolean;
}
