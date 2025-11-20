export class UserSession {
    userId: string;
    tokenFirebase: string;

    constructor(userId = "", tokenFirebase = "") {
        this.userId = userId;
        this.tokenFirebase = tokenFirebase;
    }

    // Convierte a objeto plano (útil para JSON)
    toPlain() {
        return { userId: this.userId, tokenFirebase: this.tokenFirebase };
    }

    // Crea instancia desde objeto plano
    static fromPlain(o: unknown): UserSession {
        if (o && typeof o === "object") {
            const obj = o as Record<string, unknown>;
            const userId = typeof obj.userId === "string" ? obj.userId : "";
            const tokenFirebase = typeof obj.tokenFirebase === "string" ? obj.tokenFirebase : "";
            return new UserSession(userId, tokenFirebase);
        }
        return new UserSession();
    }

    // Serialización/Deserialización en localStorage
    saveToCache(key = "userSession") {// asociar el contenido de dentro del metodo a la key "userSession"
        try {
            localStorage.setItem(key, JSON.stringify(this.toPlain()));
        } catch {
            // manejar storage no disponible
        }
    }

    static loadFromCache(key = "userSession"): UserSession | null {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return UserSession.fromPlain(parsed);
        } catch {
            return null;
        }
    }

    static clearCache(key = "userSession") {
        try { localStorage.removeItem(key); } 
        catch {
            // manejar storage no disponible
        }
    }

    isSessionActive(): boolean {
        return typeof this.userId === "string" && this.userId.length > 0 &&
               typeof this.tokenFirebase === "string" && this.tokenFirebase.length > 0;
    }
}