import {UserService} from "../../../src/domain/service/UserService";
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach,test } from 'vitest';
import {UserSession} from "../../../src/domain/session/UserSession";

let userService;
beforeAll(async () => {
    userService = UserService.getInstance();
});
beforeEach(async () => {
//  await userService.signUp("al123456@uji.es", "Maria", "MiContrasena64");
});

describe("HU02 - Inicio de sesión", () => {
  test("E1 - Válido: inicia sesión correctamente", async () => {
    const result = await userService.logIn("al123456@uji.es", "MiContrasena64");
    expect(result.sessionOpen).toBe(typeof UserSession);
    userService.logOut();
  });

  test("E2 - Inválido: contraseña incorrecta", async () => {
    await expect(userService.logIn("al123456@uji.es", "micontraseña"))
      .rejects.toThrow("InvalidCredentials");
  });

  test("E2b - Inválido: correo no registrado", async () => {
    await expect(userService.logIn("al987654@uji.es", "Codigo1Secreto2"))
      .rejects.toThrow("UserNotFound");
  });
});