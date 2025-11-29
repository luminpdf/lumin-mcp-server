"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EnvManager {
    env;
    constructor() {
        this.env = this.loadEnv();
    }
    loadEnv() {
        return {
            common: {
                env: process.env.LUMIN_ENV ?? 'production',
                baseUrl: process.env.LUMIN_BASE_URL,
                apiUrl: process.env.LUMIN_API_URL,
                authUrl: process.env.LUMIN_AUTH_URL,
            },
            ory: {
                hydra: {
                    adminUrl: process.env.LUMIN_ORY_HYDRA_ADMIN_URL,
                },
                pat: process.env.LUMIN_ORY_PAT,
            },
            local: {
                apiKey: process.env.LUMIN_API_KEY,
            },
        };
    }
}
exports.default = new EnvManager();
