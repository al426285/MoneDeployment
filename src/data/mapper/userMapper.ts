import { User } from "../../domain/model/User";

export function toFirestoreUser(user: User) {
  return {
    name: user.getNickname,
    email: user.getEmail(),
    password: user.getPassword(),
  };
}

export function toDomainUser(data: any): User {
  return new User(
    data.name,
    data.email,
    data.password,
  );
}
