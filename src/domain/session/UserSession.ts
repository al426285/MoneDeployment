export class UserSession {
    userId: string;
    tokenFirebase: string;

    constructor(userId = "", tokenFirebase = "") {
        this.userId = userId;
        this.tokenFirebase = tokenFirebase;
    }

    /** Sesión válida */
    isLoggedIn(): boolean {
        return Boolean(this.userId && this.tokenFirebase);
    }

    toPlain() {
        return { userId: this.userId, tokenFirebase: this.tokenFirebase };
    }

    static fromPlain(o: any): UserSession {
        if (!o || typeof o !== "object") return new UserSession();
        return new UserSession(
            typeof o.userId === "string" ? o.userId : "",
            typeof o.tokenFirebase === "string" ? o.tokenFirebase : ""
        );
    }

    saveToCache() {
        try {
            localStorage.setItem("user_session", JSON.stringify(this.toPlain()));
        } catch { /* ignore */ }
    }

    static saveProfileToCache(profile: { userId: string; email?: string; nickname?: string; cachedAt?: number }) {
        try {
            const clean = {
                userId: profile.userId ?? "",
                email: profile.email ?? "",
                nickname: profile.nickname ?? "",
                cachedAt: profile.cachedAt ?? Date.now(),
            };
            localStorage.setItem("user_profile", JSON.stringify(clean));
        } catch { /* ignore */ }
    }

    static loadProfileFromCache(): { userId: string; email: string; nickname: string; cachedAt: number } | null {
        try {
            const raw = localStorage.getItem("user_profile");
            if (!raw) return null;
            const data = JSON.parse(raw);

            if (!data || typeof data !== "object") return null;

            return {
                userId: data.userId ?? "",
                email: data.email ?? "",
                nickname: data.nickname ?? "",
                cachedAt: data.cachedAt ?? Date.now(),
            };
        } catch {
            return null;
        }
    }

    static loadFromCache(): UserSession | null {
        try {
            const raw = localStorage.getItem("user_session");
            if (!raw) return null;

            const data = JSON.parse(raw);
            const session = UserSession.fromPlain(data);

            // Si está corrupta → descartar
            if (!session.isLoggedIn()) return null;

            return session;
        } catch {
            return null;
        }
    }

    static clear() {
        try {
            localStorage.removeItem("user_session");
            localStorage.removeItem("user_profile");
        } catch { /* ignore */ }
    }
}
