//import { type User } from "../../../src/domain/model/User.ts";
import { UserService } from "../../../src/domain/service/UserService.ts";
import { describe, expect, beforeAll, test, afterAll } from "vitest";
import {} from "module";
import{ getAuth, signInWithEmailAndPassword, deleteUser} from "firebase/auth";

let email: string;
let password: string;
let nickname: string;
const userService = UserService.getInstance();

const createdCredentials: { email: string; password: string }[] = [];

beforeAll(async () => {
  email = "al123456@uji.es";
  password = "MiContrasena64";
  nickname = "Maria";
  //userService.signUp("al123456@uji.es", "Maria", "MiContrasena64");
});

afterAll(async () => {
  for (const cred of createdCredentials) {
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, cred.email, cred.password);
      const u = auth.currentUser;
      if (u) {
        await deleteUser(u);
      }
    } catch (e) {
      console.error("Error deleting user:", e);
    }
  }
});

describe("HU-01. Pruebas de aceptación del registro de usuario", () => {
  test("E1- Válido; Debe registrar un nuevo usuario en Firebase", async () => {
    const result = await userService.signUp(email, nickname, password)
    expect(typeof result).toBe("string");
    expect((result as string).length).toBeGreaterThan(0);
  });

  test("E2- Inválido; Debe lanzar error, usuario ya existente --> EmailAlreadyInUse", async () => {
    await expect(
      userService.signUp(email, "Juan", "juanElMasGuapo72")
    ).rejects.toThrow("EmailAlreadyInUse");
  });

  test("E3- Inválido(nickname inválido, la ñ);  --> InvalidNicknameException", async () => {
    await expect(
      userService.signUp("al789456@uji.es", "Begoña", "juanElMasGuapo72")
    ).rejects.toThrow("InvalidNicknameException");
  });

  test("E4- Inválido(Correo electrónico inválido) --> InvalidEmailException", async () => {
    await expect(
      userService.signUp("al789456atujidotes", "Marco", "juanElMasGuapo72")
    ).rejects.toThrow("InvalidEmailException");
  });
})
;