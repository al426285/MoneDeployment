import {UserService} from "../../../src/domain/service/UserService";
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach,test } from 'vitest';

let userService;
beforeAll(async () => {
    // minimal localStorage polyfill for Node/Vitest env
    if (typeof globalThis.localStorage === 'undefined' || globalThis.localStorage === null) {
      globalThis.localStorage = (() => {
        let store = {};
        return {
          getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
          setItem(key, value) { store[key] = String(value); },
          removeItem(key) { delete store[key]; },
          clear() { store = {}; }
        };
      })();
    }

    userService = UserService.getInstance();
    let session = null;
    try {
      session = await userService.logIn("al123456@uji.es", "MiContrasena64");
    } catch (err) {
      await userService.signUp("al123456@uji.es", "Maria", "MiContrasena64");
      session = await userService.logIn("al123456@uji.es", "MiContrasena64");
    }
});
describe("HU06 - Actualización de datos personales", () => {
  beforeEach(async () => {
    // Estado inicial: un usuario registrado y con sesión abierta
   // await userService.signUp("al123456@uji.es", "Maria", "MiContrasena64");
    //await userService.logIn("al123456@uji.es", "MiContrasena64");
  });

  test("E1 - Válido: el usuario cambia su alias correctamente", async () => {
    const result = await userService.updateCurrentUserProfile(undefined, undefined, "Mario");
    expect(result && result.success).toBe(true);

  });

  test("E2 - Inválido: el usuario introduce un correo inválido", async () => {
    await expect(userService.updateCurrentUserProfile("yo"))
      .rejects.toThrow("InvalidEmailException");
  });
});
