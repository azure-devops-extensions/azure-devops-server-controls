import * as Q from "q";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { OAuthConfigurationActions } from "DistributedTask/Scripts/OAuthConfiguration/Actions/OAuthConfigurationActions";
import { OAuthConfigurationListActions } from "DistributedTask/Scripts/OAuthConfiguration/Actions/OAuthConfigurationListActions";
import { OAuthConfigurationSource } from "DistributedTask/Scripts/OAuthConfiguration/DT.OAuthConfigurationModel";
import { OAuthConfiguration, ServiceEndpointType } from "TFS/ServiceEndpoint/Contracts";
import {ActionCreatorKeys} from "DistributedTask/Scripts/OAuthConfiguration/Common/OAuthConfigurationConstants";
import * as Utils_String from "VSS/Utils/String";
import Events_Services = require("VSS/Events/Services");
import { OAuthConfigurationHubEvents } from "DistributedTask/Scripts/OAuthConfiguration/Common/OAuthConfigurationConstants";

export class OAuthConfigurationActionCreator extends ActionCreatorBase {

    public static getKey(): string {
        return ActionCreatorKeys.OAuthConfiguration;
    }

    public initialize(): void {
        this._actions = ActionsHubManager.GetActionsHub<OAuthConfigurationActions>(OAuthConfigurationActions);
        this._listActions = ActionsHubManager.GetActionsHub<OAuthConfigurationListActions>(OAuthConfigurationListActions);
        this._source = OAuthConfigurationSource.instance();
    }

    public getOAuthConfiguration(configurationId: string): IPromise<void> {
        let getOAuthConfigurationPromise = this._source.beginGetOAuthConfiguration(configurationId);
        let getOAuthSourceTypesPromise = this._source.beginGetOAuthSourceTypes();
        return Q.all([getOAuthConfigurationPromise, getOAuthSourceTypesPromise]).spread((oauthConfiguration: OAuthConfiguration, sourceTypes: ServiceEndpointType[]) => {
            this._actions.loadOAuthConfiguration.invoke({
                oauthConfiguration: oauthConfiguration,
                sourceTypes: sourceTypes 
            });
        }, (error: any) => {
            Events_Services.getService().fire(OAuthConfigurationHubEvents.UpdateErrorMessage, this, error);
        });
    }

    public newOAuthConfiguration(): IPromise<void> {
        return this._source.beginGetOAuthSourceTypes().then((sourceTypes: ServiceEndpointType[]) => {
            this._actions.newOAuthConfiguration.invoke(sourceTypes);
        }, (error: any) => {
            Events_Services.getService().fire(OAuthConfigurationHubEvents.UpdateErrorMessage, this, error);
        });
    }

    public createorUpdateOAuthConfiguration(configuration: OAuthConfiguration): IPromise<void> {
        let createOrUpdatePromise: IPromise<OAuthConfiguration>;
        if (Utils_String.ignoreCaseComparer(configuration.id, Utils_String.empty) === 0) {
            createOrUpdatePromise = this._source.beginCreateOAuthConfiguration(configuration);
        }
        else {
            configuration.clientId = null;
            configuration.url = null;
            configuration.clientSecret = null;
            createOrUpdatePromise = this._source.beginUpdateOAuthConfiguration(configuration);
        }

        let getOAuthSourceTypesPromise = this._source.beginGetOAuthSourceTypes();
        return Q.all([createOrUpdatePromise, getOAuthSourceTypesPromise]).spread((oauthConfiguration: OAuthConfiguration, sourceTypes: ServiceEndpointType[]) => {
            this._actions.loadOAuthConfiguration.invoke({
                oauthConfiguration: oauthConfiguration,
                sourceTypes: sourceTypes 
            });

            this._listActions.updateOAuthConfigurationList.invoke(oauthConfiguration);
        }, (error: any) => {
            Events_Services.getService().fire(OAuthConfigurationHubEvents.UpdateErrorMessage, this, error);
        });
    }

    public fireUpdateErrorMessageEvent(message: string, error: any): void {
        Events_Services.getService().fire(message, this, error);
    }

    private _actions: OAuthConfigurationActions;
    private _listActions: OAuthConfigurationListActions;
    private _source: OAuthConfigurationSource;
}