import * as Q from "q";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import Events_Services = require("VSS/Events/Services");
import { OAuthConfigurationListActions } from "DistributedTask/Scripts/OAuthConfiguration/Actions/OAuthConfigurationListActions";
import Model = require("DistributedTask/Scripts/OAuthConfiguration/DT.OAuthConfigurationModel");
import Contracts = require("TFS/ServiceEndpoint/Contracts");
import { ActionCreatorKeys, OAuthConfigurationHubEvents } from "DistributedTask/Scripts/OAuthConfiguration/Common/OAuthConfigurationConstants";
import { PerfTelemetryManager, TelemetryScenarios } from "DistributedTask/Scripts/Utils/TelemetryUtils";

export class OAuthConfigurationListActionCreator extends ActionCreatorBase {

    public static getKey(): string {
        return ActionCreatorKeys.OAuthConfigurationList;
    }

    public initialize(): void {
        this._actions = ActionsHubManager.GetActionsHub<OAuthConfigurationListActions>(OAuthConfigurationListActions);
        this._source = Model.OAuthConfigurationSource.instance();
    }

    public loadOAuthConfigurationList(): IPromise<void> {
        let getOAuthConfigurationsPromise = this._source.beginGetOAuthConfigurations();
        let getOAuthSourceTypesPromise = this._source.beginGetOAuthSourceTypes();
        return Q.all([getOAuthConfigurationsPromise, getOAuthSourceTypesPromise]).spread((oauthConfigurations: Contracts.OAuthConfiguration[], sourceTypes: Contracts.ServiceEndpointType[]) => {
            this._actions.getOAuthConfigurations.invoke({
                oauthConfigurations: oauthConfigurations,
                sourceTypes: sourceTypes 
            });
            PerfTelemetryManager.instance.endScenario(TelemetryScenarios.OAuthLanding);
        }, (error: any) => {
            Events_Services.getService().fire(OAuthConfigurationHubEvents.UpdateErrorMessage, this, error);
            PerfTelemetryManager.instance.abortScenario(TelemetryScenarios.OAuthLanding);
        });
    }

    public deleteOAuthConfiguration(configurationId: string): IPromise<void> {
        let deletePromise = this._source.beginDeleteOAuthConfiguration(configurationId);
        return deletePromise.then(() => {
            this._actions.deleteOAuthConfiguration.invoke(configurationId);
        }, (error: any) => {
            Events_Services.getService().fire(OAuthConfigurationHubEvents.UpdateErrorMessage, this, error);
        });
    }

    private _actions: OAuthConfigurationListActions;
    private _source: Model.OAuthConfigurationSource;
}