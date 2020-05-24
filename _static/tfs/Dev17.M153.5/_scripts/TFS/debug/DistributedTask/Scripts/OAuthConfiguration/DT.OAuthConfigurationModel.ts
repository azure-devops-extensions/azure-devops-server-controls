import Q = require("q");
import { Singleton } from "DistributedTaskControls/Common/Factory";
import Contracts = require("TFS/ServiceEndpoint/Contracts");
import Context = require("DistributedTask/Scripts/DT.Context");
import * as Utils_String from "VSS/Utils/String";
import * as Resources from "DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask";

export class OAuthConfigurationSource extends Singleton {

    public beginGetOAuthConfigurations(): IPromise<Contracts.OAuthConfiguration[]> {
        let dataDeferred: Q.Deferred<Contracts.OAuthConfiguration[]> = Q.defer<Contracts.OAuthConfiguration[]>();
        Context.serviceContext.oauthConfigurationManager().beginGetOAuthConfigurations()
            .then((configurations: Contracts.OAuthConfiguration[]) => {
                dataDeferred.resolve(configurations);
            }, (error) => {
                dataDeferred.reject(error);
            });

        return dataDeferred.promise;
    }

    public beginDeleteOAuthConfiguration(configurationId: string): IPromise<Contracts.OAuthConfiguration> {
        return Context.serviceContext.oauthConfigurationManager().beginDeleteOAuthConfiguration(configurationId);
    }

    public beginGetOAuthConfiguration(configurationId: string): IPromise<Contracts.OAuthConfiguration> {
        if (!Utils_String.isGuid(configurationId)) {
            return Q.reject(new Error(Utils_String.localeFormat(Resources.InvalidOAuthConfigurationId)));
        }

        if (!this._configurationsCache[configurationId]) {
            this._configurationsCache[configurationId] = Context.serviceContext.oauthConfigurationManager().beginGetOAuthConfiguration(configurationId).then((configuration: Contracts.OAuthConfiguration) => {
                if (configuration == null) {
                    throw new Error(Utils_String.localeFormat(Resources.OAuthConfigurationDoesNotExist, configurationId));
                }
                else {
                    return configuration;
                }
            });
        }
        
        return this._configurationsCache[configurationId];
    }

    public beginCreateOAuthConfiguration(configuration: Contracts.OAuthConfiguration): IPromise<Contracts.OAuthConfiguration> {
        return Context.serviceContext.oauthConfigurationManager().beginCreateOAuthConfiguration(OAuthConfigurationSource.toOAuthConfigurationParams(configuration));
    }

    public beginUpdateOAuthConfiguration(configuration: Contracts.OAuthConfiguration): IPromise<Contracts.OAuthConfiguration> {
        this._configurationsCache[configuration.id] = Context.serviceContext.oauthConfigurationManager().beginUpdateOAuthConfiguration(OAuthConfigurationSource.toOAuthConfigurationParams(configuration), configuration.id);
        return this._configurationsCache[configuration.id];
    }

    public beginGetOAuthSourceTypes(): IPromise<Contracts.ServiceEndpointType[]> {
        return Context.serviceContext.oauthConfigurationManager().beginGetOAuthSourceTypes();
    }

    private static toOAuthConfigurationParams(configuration: Contracts.OAuthConfiguration): Contracts.OAuthConfigurationParams {
        return {
            clientId: configuration.clientId,
            clientSecret: configuration.clientSecret,
            endpointType: configuration.endpointType,
            name: configuration.name,
            url: configuration.url
        };
    }

    public static instance(): OAuthConfigurationSource {
        return super.getInstance<OAuthConfigurationSource>(OAuthConfigurationSource);
    }

    private _configurationsCache: { [configurationId: string]: IPromise<Contracts.OAuthConfiguration>; } = {};
}