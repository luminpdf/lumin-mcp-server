"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@ory/client");
const env_1 = require("../env");
class OAuthService {
    hydraAdmin;
    constructor() {
        const config = new client_1.Configuration({
            basePath: env_1.envManager.env.ory.hydra.adminUrl,
            baseOptions: {
                headers: {
                    Authorization: `Bearer ${env_1.envManager.env.ory.pat}`,
                },
            },
        });
        this.hydraAdmin = new client_1.OAuth2Api(config);
    }
    async createClient(oAuth2Client) {
        const { data } = await this.hydraAdmin.createOAuth2Client({
            oAuth2Client
        });
        return data;
    }
}
exports.default = new OAuthService();
