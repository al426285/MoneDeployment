import { UserRepositoryFirebase } from "../../../src/data/repository/UserRepositoryFirebase";
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
beforeEach(async () => {
//await userService.signUp("al123456@uji.es", "Maria", "MiContrasena64");
});

describe("HU05 - Recuperación de contraseña", () => {
  test("E1 - Válido: cambia la contraseña correctamente", async () => {
    const user = new UserRepositoryFirebase();
     const existing = await user.getUserByEmail("al123456@uji.es");
     expect(existing).not.toBeNull();
     
     await expect(userService.recoverPassword("al123456@uji.es")).resolves.toBeUndefined();

  });

  test("E3 - Inválido: correo no registrado", async () => {
    await expect(userService.recoverPassword("123456al@uji.es"))
      .rejects.toThrow("UserNotFound");
  });
});