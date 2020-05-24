import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");

import Manager = require("DistributedTask/Scripts/DT.Manager");

export class ServiceContext {

    public webContext(): Contracts_Platform.WebContext {
        if (!this._webContext) {
            this._webContext = Context.getDefaultWebContext();
        }

        return this._webContext;
    }

    public variableGroupManager(): Manager.VariableGroupManager {
        if (!this._variableGroupManager) {
            this._variableGroupManager = new Manager.VariableGroupManager();
        }

        return this._variableGroupManager;
    }

    public secureFileManager(): Manager.SecureFileManager {
        if (!this._secureFileManager) {
            this._secureFileManager = new Manager.SecureFileManager();
        }

        return this._secureFileManager;
    }

    public oauthConfigurationManager(): Manager.OAuthConfigurationManager {
        if (!this._oauthConfigurationManager) {
            this._oauthConfigurationManager = new Manager.OAuthConfigurationManager();
        }

        return this._oauthConfigurationManager;
    }

    private _webContext: Contracts_Platform.WebContext;

    private _variableGroupManager: Manager.VariableGroupManager;

    private _secureFileManager: Manager.SecureFileManager;

    private _oauthConfigurationManager: Manager.OAuthConfigurationManager;
}

// Global singleton
export var serviceContext: ServiceContext = new ServiceContext();