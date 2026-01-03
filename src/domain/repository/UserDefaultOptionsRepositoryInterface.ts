import type { UserDefaultOptions } from "../model/UserDefaultOptions";

export interface UserDefaultOptionsRepositoryInterface {
    getDefaultOptions(userId: string): Promise<Partial<UserDefaultOptions> | null>;
    saveDefaultOptions(userId: string, options: UserDefaultOptions): Promise<void>;
}
