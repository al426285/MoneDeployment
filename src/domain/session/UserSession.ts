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
        return { userId: this.userId };
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
            const payload = { ...this.toPlain(), cachedAt: Date.now() };
            localStorage.setItem("user_session", JSON.stringify(payload));
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
            if (!data || typeof data !== "object") return null;

            const cachedAt = typeof data.cachedAt === "number" ? data.cachedAt : null;
            const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
            if (cachedAt == null) return null;
            if (Date.now() - cachedAt > SESSION_TTL_MS) {
                // expired
                try { localStorage.removeItem("user_session"); } catch {}
                return null;
            }

            const session = UserSession.fromPlain(data);
            if (!session.userId) return null;
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
