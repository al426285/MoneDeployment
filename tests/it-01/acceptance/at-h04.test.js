import {UserService} from "../src/domain/service/UserService.ts";
let userService;
beforeAll(async () => {
  userService = UserService.getInstance();
});

describe("HU04 - Eliminación de cuenta", () => {
  test("E1 - Válido: elimina la cuenta con sesión abierta", async () => {
    await loginUser("al123456@uji.es", "MiContrasena64");
    const result = await userService.deleteUser("al123456@uji.es");
    expect(result).toBe(true);
    const users = await getRegisteredUsers();
    expect(users.some(u => u.email === "al123456@uji.es")).toBe(false);
  });

  test("E3 - Inválido: correo no encontrado", async () => {
    await expect(userService.deleteUser("al654321@uji.es"))
      .rejects.toThrow("EmailNotFoundException");
  });
});
