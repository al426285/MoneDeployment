import { UserService } from "../../../src/domain/service/UserService";
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, test, vi } from 'vitest';
import { UserSession } from "../../../src/domain/session/UserSession";
import { UserRepositoryFirebase } from "../../../src/data/repository/UserRepositoryFirebase";
import { getAuth, signInWithEmailAndPassword, deleteUser as firebaseDeleteUser } from "firebase/auth";

const BASE_USER = {
  email: "al123456@uji.es",
  nickname: "Maria",
  password: "MiContrasena64",
};

const emailtest=`testuser${Date.now()}@test.com`;
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

const userService = UserService.getInstance();

//Probar a meter las cosas en el beforeach

//jest no tiene localStorage, lo creamos mockeado
beforeEach(() => {
  const store: Record<string, string> = {};

  global.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => store[key] = value,
    removeItem: (key: string) => delete store[key],
    clear: () => Object.keys(store).forEach(key => delete store[key]),
    key: (index: number) => Object.keys(store)[index] || null,
    length: 0
  } as any;
});

beforeAll(() => {
userService.signUp(BASE_USER.email, BASE_USER.nickname, BASE_USER.password);
});


describe("Tests aceptación primera iteración {h01}: SignUp", () => {
  test("H01-E1- Válido; Debe registrar un nuevo usuario en Firebase", async () => {
    const result = await userService.signUp(emailtest, BASE_USER.nickname, BASE_USER.password)
    expect(typeof result).toBe("string");
    expect((result).length).toBeGreaterThan(0);

  });

  test("H01-E2- Inválido; Debe lanzar error, usuario ya existente --> EmailAlreadyInUse", async () => {
    await expect(
      userService.signUp(BASE_USER.email, "Juan", "juanElMasGuapo72")
    ).rejects.toThrow("EmailAlreadyInUse");
  });

  test("H01-E3- Inválido(nickname inválido, la ñ);  --> InvalidNicknameException", async () => {
    await expect(
      userService.signUp("al789456@uji.es", "Begoña", "juanElMasGuapo72")
    ).rejects.toThrow("InvalidNicknameException");
  });

  test("H01-E4- Inválido(Correo electrónico inválido) --> InvalidEmailException", async () => {
    await expect(
      userService.signUp("al789456atujidotes", "Marco", "juanElMasGuapo72")
    ).rejects.toThrow("InvalidEmailException");
  });

});


describe("Tests aceptación primera iteración {h02}: LogIn", () => {
  test("H02-E1 - Válido: inicia sesión correctamente", async () => {
    const session = await userService.logIn(BASE_USER.email, BASE_USER.password);
        await sleep(500);
    expect(session).toBeInstanceOf(UserSession);
    expect(session.userId).toBeTruthy();
  });

  test("H02-E2 - Inválido: contraseña incorrecta, no inicia sesión", async () => {
    await expect(userService.logIn(BASE_USER.email, "micontraseña"))
      .rejects.toThrow("InvalidCredentials");
  });

  test("H02-E2b - Inválido: correo no registrado", async () => {
    await expect(userService.logIn("al987654@uji.es", "Codigo1Secreto2"))
      .rejects.toThrow("InvalidCredentials");
  });
});


describe("Tests aceptación primera iteración {h03}: LogOut", () => {
  test("H03-E1 - Válido: cierra la sesión abierta", async () => {
    await userService.logIn(BASE_USER.email, BASE_USER.password);
    //ya existe la sesion del test anterior, no hya que hacerlo ahora
    await sleep(500);
    await expect(userService.logOut()).resolves.toBeUndefined();

  });


  test("H03-E2 - Inválido: sesión no abierta", async () => {
    await expect(userService.logOut())
      .rejects.toThrow("RequiresRecentLogin");
  });
});



describe("Tests aceptación primera iteración {h05}: RecoverPassword", () => {
  test("H05-E1 - Válido: cambia la contraseña correctamente", async () => {

    await expect(userService.recoverPassword(emailtest)).resolves.toBeUndefined();

  });

  test("H05-E3 - Inválido: correo no registrado", async () => {
    await expect(userService.recoverPassword("noexiste919191@uji.es"))
      .rejects.toThrow("UserNotFound");
  });
});



describe("Tests aceptación primera iteración {h06}: UpdateProfile", () => {

  test(
    "H06-E1 - Válido: el usuario cambia su alias correctamente",
    async () => {
      await userService.logIn(BASE_USER.email, BASE_USER.password);
      
      await sleep(500);

      const result = await userService.updateCurrentUserProfile(undefined, undefined, "Mario");
      expect(result && result.success).toBe(true);
    },
    15000 // 15 segundos
  );

  test("H06-E2 - Inválido: el usuario introduce un correo inválido", async () => {
    await expect(userService.updateCurrentUserProfile("yo"))
      .rejects.toThrow("InvalidEmailException");
  });
});



describe("Tests aceptación primera iteración {h04}: DeleteUser", () => {
  test(
    "H04-E1 - Válido: elimina la cuenta con sesión abierta",
    async () => {
      // Sesión iniciada
      await userService.logIn(BASE_USER.email, BASE_USER.password);
      
      await sleep(500);

      const result = await userService.deleteUser(BASE_USER.email);
      expect(result).toBe(true);
    },
    15000 // 15 segundos en vez de 5
  );
  test("H04-E3 - Inválido: correo no encontrado", async () => {
    await expect(userService.deleteUser("cuentainexistente919191@uji.es"))
      .rejects.toThrow("UserNotFound");//cambiar el email en la documentación
  });
});


