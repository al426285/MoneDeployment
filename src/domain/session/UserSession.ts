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
    static fromPlain(o: any): UserSession {
        return new UserSession(o?.userId ?? "", o?.tokenFirebase ?? "");
    }

    // Serialización/Deserialización en localStorage
    saveToCache(key = "userSession") {
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
        try { localStorage.removeItem(key); } catch {}
    }

    isActive(): boolean {
        return typeof this.userId === "string" && this.userId.length > 0 &&
               typeof this.tokenFirebase === "string" && this.tokenFirebase.length > 0;
    }
}