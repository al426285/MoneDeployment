import { User } from "../../../src/domain/model/User.ts";
import { UserService } from "../../../src/domain/service/UserService.ts";
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach,test } from 'vitest';
import {  } from "module";

let email: string;
let password: string;
let nickname: string;
const userService= UserService.getInstance();

beforeAll(async () => {
  email = `test${Date.now()}@gmail.com`;
  password = "123456";
  nickname = "TestUser";
});


describe("HU-01. Pruebas de aceptación del registro de usuario", () => {
  test("E1- Válido; Debe registrar un nuevo usuario en Firebase", async () => {
    const result = await userService.signUp(email, nickname, password);
    expect(result).toBe(true);
    const users = await userService.getRegisteredUsers();
    expect(users.some(u => u.email === email)).toBe(true);
  });

  test("E2- Inválido; Debe lanzar error, usuario ya existente --> InvalidUserException", async () => {
    //const result = await signUp(email, password);
    //expect(result.user).toThrow("InvalidUserException");
    await expect( userService.signUp(email, "Juan", "juanElMasGuapo72"))
      .rejects.toThrow("InvalidUserException");
  });

  test("E3- Inválido(nickname inválido);  --> InvalidDataException", async () => {
    await expect( userService.signUp("al789456@uji.es", "", "juanElMasGuapo72"))
      .rejects.toThrow("InvalidDataException");
  });

  test("E4- Inválido(Correo electrónico inválido) --> InvalidDataException", async () => {
    await expect( userService.signUp("al789456atujidotes", "Marco", "juanElMasGuapo72"))
      .rejects.toThrow("InvalidDataException");
  });

});
