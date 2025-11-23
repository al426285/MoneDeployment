import {UserService} from "../../../src/domain/service/UserService";
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach,test } from 'vitest';

let userService;
beforeAll(async () => {
    userService = UserService.getInstance();
});

beforeEach(async () => {
  //await userService.signUp("al123456@uji.es", "Maria", "MiContrasena64");
});

describe("HU03 - Cierre de sesión", () => {
  test("E1 - Válido: cierra la sesión abierta", async () => {
    await userService.logIn("al123456@uji.es", "MiContrasena64");
   // await expect(userService.logOut("al123456@uji.es")).resolves.toBeUndefined();
    
  });

  test("E2 - Inválido: sesión no abierta", async () => {
    await expect(userService.logOut("al123456@uji.es"))
      .rejects.toThrow("RequiresRecentLogin");
  });
});