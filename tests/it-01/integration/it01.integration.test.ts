import { describe, test, expect, beforeEach, vi } from "vitest";
import { UserService } from "../../../src/domain/service/UserService";
import { UserSession } from "../../../src/domain/session/UserSession";



//MOCK FIREBASE
vi.mock("firebase/auth", () => ({
    getAuth: () => ({}),

    signInWithEmailAndPassword: vi.fn((auth, email, password) => {
        if (email === "al123456@uji.es" && password === "MiContrasena64") {
            return Promise.resolve({
                user: {
                    uid: "USER123",
                    email: "al123456@uji.es",
                    nickname: "Maria",
                    getIdToken: () => "TOKEN123",
                },
            });
        }
        return Promise.reject({ code: "auth/wrong-password" });
    }),


    createUserWithEmailAndPassword: vi.fn((auth, email) => {
        if (email === "al123456@uji.es") {
            return Promise.reject({ code: "auth/email-already-in-use" });
        }
        return Promise.resolve({
            user: { uid: "NEWUSER" }
        });
    }),

    sendPasswordResetEmail: vi.fn((auth, email) => {
        if (email === "noexiste919191@uji.es") {
            return Promise.reject({ code: "auth/user-not-found" });
        }
        return Promise.resolve();
    }),

    updateEmail: vi.fn(() => Promise.resolve()),
    updateProfile: vi.fn(() => Promise.resolve()),

    signOut: vi.fn(() => Promise.resolve()),

    deleteUser: vi.fn((user) => {
        if (!user) return Promise.reject({ code: "auth/requires-recent-login" });
        return Promise.resolve();
    }),
    GoogleAuthProvider: vi.fn(),

}));

// --------------------------------------------------------------------------------------
// MOCK DEL FIRESTORE
// --------------------------------------------------------------------------------------

vi.mock("firebase/firestore", () => ({
    getFirestore: () => ({}),

    doc: (...args) => args.join("/"),

    getDoc: vi.fn((ref) => {
        if (ref.includes("al123456@uji.es")) {
            return Promise.resolve({
                exists: () => true,
                data: () => ({
                    email: "al123456@uji.es",
                    nickname: "Maria",
                })
            });
        }
        return Promise.resolve({ exists: () => false });
    }),

    getDocs: vi.fn((query) => {
        if (JSON.stringify(query).includes("al123456@uji.es")) {
            return Promise.resolve({
                empty: false,
                docs: [{
                    id: "USER123",
                    data: () => ({
                        email: "al123456@uji.es",
                        nickname: "Maria",
                    })
                }]
            });
        }
        return Promise.resolve({ empty: true });
    }),

    query: (...args) => args,
    where: (...args) => args,

    setDoc: vi.fn(() => Promise.resolve()),
    updateDoc: vi.fn(() => Promise.resolve()),
    deleteDoc: vi.fn(() => Promise.resolve()),

    collection: vi.fn(),

    serverTimestamp: () => new Date(),
}));



// Mock de LocalStorage
beforeEach(() => {
    const store: Record<string, string> = {};

    global.localStorage = {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => (store[key] = value),
        removeItem: (key: string) => delete store[key],
        clear: () => Object.keys(store).forEach((k) => delete store[k]),
    } as any;
});

beforeEach(() => {
    userService.auth = { currentUser: null }; // Inicializamos auth
});


const BASE_USER = {
    email: "al123456@uji.es",
    nickname: "Maria",
    password: "MiContrasena64",
};

const userService = UserService.getInstance();



describe("H01: SignUp", () => {
    test("H01-E1 - válido: registra un nuevo usuario", async () => {
        const result = await userService.signUp(
            `test${Date.now()}@test.com`,
            BASE_USER.nickname,
            BASE_USER.password
        );

        expect(result).toBe("NEWUSER");
    });

    test("H01-E2 - inválido: email ya existe", async () => {
        await expect(
            userService.signUp(BASE_USER.email, "Juan", "HolaHOLA1234")//la contraseña tiene que cumplir con los requisitos de firebaseña, si no la ponemos bien, da otro error (InvalidPasswordException)
        ).rejects.toThrow("EmailAlreadyInUse");
    });

    test("H01-E3 - inválido: nickname inválido (ñ)", async () => {
        await expect(
            userService.signUp("nuevo@uji.es", "Begoña", "Clave123")
        ).rejects.toThrow("InvalidNicknameException");
    });

    test("H01-E4 - inválido: email incorrecto", async () => {
        await expect(
            userService.signUp("emailSINarroba", "Marco", "Clave123")
        ).rejects.toThrow("InvalidEmailException");
    });
});

describe("H02: LogIn", () => {
    test("H02-E1 - válido: inicia sesión", async () => {
        const session = await userService.logIn(BASE_USER.email, BASE_USER.password);
        expect(session).toBeInstanceOf(UserSession);
        expect(session.userId).toBe("USER123");
    });

    test("H02-E2 - inválido: contraseña incorrecta", async () => {
        await expect(
            userService.logIn(BASE_USER.email, "incorrecta")
        ).rejects.toThrow("InvalidCredentials");
    });

    test("H02-E2b - inválido: email no existe", async () => {
        await expect(
            userService.logIn("noexiste@uji.es", "Clave123")
        ).rejects.toThrow("InvalidCredentials");
    });
});


describe("H03: LogOut", () => {
    test("H03-E1 - válido: cierra sesión", async () => {
        await userService.logIn(BASE_USER.email, BASE_USER.password);
        await expect(userService.logOut()).resolves.toBeUndefined();
    });

    test("H03-E2 - inválido: no hay sesión", async () => {
        localStorage.clear();
        await expect(userService.logOut()).rejects.toThrow("RequiresRecentLogin");
    });
});



describe("H05: RecoverPassword", () => {
    test("H05-E1 - válido: envía email", async () => {
        await expect(userService.recoverPassword(BASE_USER.email)).resolves.toBeUndefined();
    });

    test("H05-E3 - inválido: usuario no encontrado", async () => {
        await expect(
            userService.recoverPassword("noexiste919191@uji.es")
        ).rejects.toThrow("UserNotFound");
    });
});


describe("H06: UpdateProfile", () => {
    test("H06-E1 - válido: cambia alias", async () => {
        await userService.logIn(BASE_USER.email, BASE_USER.password);
        const result = await userService.updateCurrentUserProfile(undefined, undefined, "Mario");
        expect(result.success).toBe(true);
    });

    test("H06-E2 - inválido: email incorrecto", async () => {
        await expect(
            userService.updateCurrentUserProfile("emailMAL")
        ).rejects.toThrow("InvalidEmailException");
    });
});


describe("H04: DeleteUser", () => {
   test("H04-E1 - válido: elimina usuario existente", async () => {
        // Mock del repo para devolver resolución correcta
        const mockRepo = {
            deleteUser: vi.fn().mockResolvedValue(true),
            getUserByEmail: vi.fn().mockResolvedValue({ id: "USER123", email: BASE_USER.email }),
        };

        const service = UserService.getInstance(undefined, mockRepo as any);

        const result = await service.deleteUser(BASE_USER.email);
        expect(result).toBe(true);
        expect(mockRepo.deleteUser).toHaveBeenCalledWith(BASE_USER.email);
    });

   test("H04-E3 - inválido: email no encontrado", async () => {
        const mockRepo = {
            deleteUser: vi.fn().mockRejectedValue(new Error("UserNotFound")),
            getUserByEmail: vi.fn().mockResolvedValue(null),
        };

        const service = UserService.getInstance(undefined, mockRepo as any);

        await expect(service.deleteUser("noexiste919191@uji.es"))
            .rejects.toThrow("UserNotFound");
        expect(mockRepo.deleteUser).toHaveBeenCalledWith("noexiste919191@uji.es");
    });
});
