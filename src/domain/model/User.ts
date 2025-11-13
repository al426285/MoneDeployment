export class User {
    private email: string
    private nickname: string
    private password: string
   

  constructor(email: string, nickname: string, password: string) {
    this.email = email;
    this.nickname = nickname;
    this.password = password;
  }
  constructorEmpty() {
    this.email = "";
    this.nickname = "";
    this.password = "";
  }

  // Setters and Getters
  setEmail( email: string) {
    this.email = email;
  }
  setNickname(nickname: string) {
    this.nickname = nickname;
  }
    setPassword( password: string) {
    this.password = password;
  }

  getEmail(): string {
    return this.email;
  }
  getNickname(): string {
    return this.nickname;
  }
  getPassword(): string {
    return this.password;
  }
 

  updateProfile(nickname?: string, email?: string, password?: string ) {//? pueden no ponerse
    if (nickname) {
      this.nickname = nickname;
    }
    if (email) {
      this.email = email;
    }
    if (password) {
      this.password = password;
    }
   
  }
}
