export interface AuthProvider {
  signUp(email: string, password: string): Promise<string>;
  logIn(email: string, password: string): Promise<string>;
  logOut(): Promise<void>;
  refreshToken(token: string): Promise<string>;
}
