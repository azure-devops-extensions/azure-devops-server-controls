import { OAuthConfigurationListActions, ILoadOAuthConfigurationListPayload } from "DistributedTask/Scripts/OAuthConfiguration/Actions/OAuthConfigurationListActions";
import { OAuthConfigurationActions, ILoadOAuthConfigurationPayload } from "DistributedTask/Scripts/OAuthConfiguration/Actions/OAuthConfigurationActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import Contracts = require("TFS/ServiceEndpoint/Contracts");
import { StoreKeys } from "DistributedTask/Scripts/OAuthConfiguration/Common/OAuthConfigurationConstants";

export interface IOAuthConfigurationListStoreData {
    oauthConfigurationList: Contracts.OAuthConfiguration[];
    sourceTypesMap: {
        [key: string]: Contracts.ServiceEndpointType
    };
    dataLoaded: boolean;
}

export class OAuthConfigurationListStore extends StoreCommonBase.StoreBase {

    public static getKey(): string {
        return StoreKeys.OAuthConfigurationList;
    }

    public initialize(): void {
        super.initialize();
        this._oauthConfigurationListActions = ActionsHubManager.GetActionsHub<OAuthConfigurationListActions>(OAuthConfigurationListActions);
        this._oauthConfigurationListActions.getOAuthConfigurations.addListener(this.onOAuthConfigurationListLoad);
        this._oauthConfigurationListActions.deleteOAuthConfiguration.addListener(this.onOAuthConfigurationDelete);
        this._oauthConfigurationListActions.updateOAuthConfigurationList.addListener(this.onOAuthConfigurationUpdated);
        this._oauthConfigurationListData = { oauthConfigurationList: [], sourceTypesMap: {}, dataLoaded: false};
    }

    protected disposeInternal(): void {
        this._oauthConfigurationListActions.getOAuthConfigurations.removeListener(this.onOAuthConfigurationListLoad);
        this._oauthConfigurationListActions.deleteOAuthConfiguration.removeListener(this.onOAuthConfigurationDelete);
        this._oauthConfigurationListActions.updateOAuthConfigurationList.removeListener(this.onOAuthConfigurationUpdated);
    }

    public getOAuthConfigurationListData(): Contracts.OAuthConfiguration[] {
        return this._oauthConfigurationListData.oauthConfigurationList;
    }

    public getOAuthConfigurationIsLoaded(): boolean {
        return this._oauthConfigurationListData.dataLoaded;
    }

    public getSourceType(sourceTypeName: string): Contracts.ServiceEndpointType {
        return this._oauthConfigurationListData.sourceTypesMap[sourceTypeName];
    }

    protected onOAuthConfigurationListLoad = (oauthConfigurationListPayload: ILoadOAuthConfigurationListPayload): void => {
        this._oauthConfigurationListData.oauthConfigurationList = oauthConfigurationListPayload.oauthConfigurations;

        this._oauthConfigurationListData.dataLoaded = true;
        let sourceTypes = oauthConfigurationListPayload.sourceTypes || [];
        if (sourceTypes.length > 0) {
            sourceTypes.forEach((sourceType: Contracts.ServiceEndpointType) => {
                this._oauthConfigurationListData.sourceTypesMap[sourceType.name] = sourceType;
            });
        }

        this.emitChanged();
    }

    protected onOAuthConfigurationDelete = (configurationId: string): void => {
        if (!this._oauthConfigurationListData.oauthConfigurationList) {
            this._oauthConfigurationListData.oauthConfigurationList = [];
        }
        this._oauthConfigurationListData.oauthConfigurationList = this._oauthConfigurationListData.oauthConfigurationList.filter(config => config.id !== configurationId);

        this.emitChanged();
    }

    protected onOAuthConfigurationUpdated = (configuration: Contracts.OAuthConfiguration): void => {
        if (this._oauthConfigurationListData.oauthConfigurationList) {
            let updatedConfig = this._oauthConfigurationListData.oauthConfigurationList.findIndex(config => config.id == configuration.id);
            if (updatedConfig < 0) {
                this._oauthConfigurationListData.oauthConfigurationList.push(configuration);
            } else {
                this._oauthConfigurationListData.oauthConfigurationList[updatedConfig] = configuration;
            }
        }
    }

    protected _oauthConfigurationListData: IOAuthConfigurationListStoreData;
    private _oauthConfigurationListActions: OAuthConfigurationListActions;
}