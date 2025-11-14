import {UserService} from "../../../src/domain/service/UserService";
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach,test } from 'vitest';

let userService;
beforeAll(async () => {
    userService = UserService.getInstance();
});
describe("HU06 - Actualización de datos personales", () => {
  beforeEach(async () => {
    // Estado inicial: un usuario registrado y con sesión abierta
    await userService.signUp("al123456@uji.es", "Maria", "MiContrasena64");
    await userService.logIn("al123456@uji.es", "MiContrasena64");
  });

  test("E1 - Válido: el usuario cambia su alias correctamente", async () => {
    const result = await userService.updateUserProfile("al123456@uji.es", { nickname: "Mario" });
    expect(result).toBe(true);

  });

  test("E2 - Inválido: el usuario introduce un correo inválido", async () => {
    await expect(updateUserProfile("al123456@uji.es", { email: "yo" }))
      .rejects.toThrow("InvalidDataException");
  });
});
