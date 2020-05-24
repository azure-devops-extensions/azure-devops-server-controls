import * as Q from "q";

import * as Actions from "DistributedTaskControls/Actions/TaskExtensionItemListActions";
import { MessageHandlerActions, IAddMessagePayload } from "DistributedTaskControls/Actions/MessageHandlerActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";
import { ExtensionUtils } from "DistributedTaskControls/Common/ExtensionUtils";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { IMarketplaceData } from "DistributedTaskControls/Common/MarketplaceLinkHelper";
import { IExtensionDefinitionItem, IRequestedExtension } from "DistributedTaskControls/Common/Types";
import { LoadableComponentActionsHub } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponentActionsHub";
import { ExtensionDefinitionSource } from "DistributedTaskControls/Sources/ExtensionDefinitionSource";

import { RequestedExtension, InstalledExtension } from "VSS/Contributions/Contracts";
import { PublishedExtension  } from "VSS/Gallery/Contracts";
import * as Utils_String from "VSS/Utils/String";
import { IdentityRef } from "VSS/WebApi/Contracts";

/**
 * @brief Action creator for Extension actions
 */
export class TaskExtensionItemListActionsCreator extends ActionCreatorBase {

    /**
     * @returns Returns unique key for this creator
     */
    public static getKey(): string {
        return ActionCreatorKeys.ExtensionActionsCreator;
    }

    /**
     * @brief Initializes the actions
     */
    public initialize(instanceId: string) {
        this._instanceId = instanceId.concat(ExtensionUtils.extensionsIdentifierText);

        this._installedExtensionsIdentifierArray = [];
        this._requestedExtensionsData = [];
        
        this._actions = ActionsHubManager.GetActionsHub<Actions.TaskExtensionItemListActions>(Actions.TaskExtensionItemListActions);
        this._loadableComponentActionsHub = ActionsHubManager.GetActionsHub<LoadableComponentActionsHub>(LoadableComponentActionsHub, this._instanceId);
    }

    /*
    * Update  Marketplace extensions irrespective of EMS calls status.
    * Don't update extensions if call to Marketplace fails.
    */
    public getExtensions(forceRefresh: boolean = false): IPromise<void> { 
        let source = ExtensionDefinitionSource.instance();
        this._loadableComponentActionsHub.showLoadingExperience.invoke({});
        let startTime: number = Date.now();
        
        // Update extensions when extensions and its url are available.
        return Q.all([source.getMarketplaceData(), source.getExtensionsList(forceRefresh)]).spread<any>((marketplaceData: IMarketplaceData, extensionsList: PublishedExtension[]) => {    
            // Making the filter empty while component is mounting except in case of refresh
            this._clearFilter(forceRefresh);

           this.updateExtensions(forceRefresh, marketplaceData, extensionsList, startTime);
        }, (error) => {
            // Making the filter empty while component is mounting except in case of refresh
            this._clearFilter(forceRefresh);            

            // Don't update the extensions with empty list if extension fetching from marketplace fails. Use the stale data.
            this._actions.updateExtensionItemList.invoke({
                isExtensionFetched: false
            });

            this._loadableComponentActionsHub.hideLoadingExperience.invoke({});
            this._publishMarketplaceExtensionFailedTelemetry();
        });
    }    
    
    public filterExtensionItemList(filter: string): void {
        this._actions.filterExtensionItemList.invoke(filter);
    }

    public updateExtensions(forceRefresh: boolean, marketplaceData: IMarketplaceData, extensionsList: PublishedExtension[], startTime: number): IPromise<any> {
        let source = ExtensionDefinitionSource.instance();
        let installedExtensionsPromise: Q.Promise<any[]> = source.getInstalledExtensionsList(forceRefresh) as Q.Promise<InstalledExtension[]>;
        let requestedExtensionsPromise: Q.Promise<any[]> = source.getRequestedExtensionsList(forceRefresh) as Q.Promise<RequestedExtension[]>;

        return Q.allSettled([installedExtensionsPromise, requestedExtensionsPromise]).then((promiseStates: Q.PromiseState<any>[]) => {
            if (promiseStates[0].state === "fulfilled") {
                let installedExtensions: InstalledExtension[] = promiseStates[0].value;
                this._installedExtensionsIdentifierArray = installedExtensions.map((installedExtension) => ExtensionUtils.createExtensionIdentifier(installedExtension.publisherId, installedExtension.extensionId));                    
            }
            else {
                this._publishEMSExtensionFailedTelemetry("Installed");
            }

            if (promiseStates[1].state === "fulfilled") {
                let requestedExtensions: RequestedExtension[] = promiseStates[1].value;                   
                this._requestedExtensionsData = requestedExtensions.map((requestedExtension) => this._getRequestedExtensionData(requestedExtension));                    
            }
            else {
                this._publishEMSExtensionFailedTelemetry("Requested");
            }

            // Mapping extension definitions to extension definition items. 
            this._extensionItems = extensionsList.map((extension: PublishedExtension) => 
            ExtensionUtils.mapExtensionDefinitionToIExtensionDefinitionItem(extension, this._installedExtensionsIdentifierArray, this._requestedExtensionsData, marketplaceData));
    
            // Update extensions item list with new extensions list.
            this._actions.updateExtensionItemList.invoke({
                extensionItems: this._extensionItems,
                isExtensionFetched: true
            });

            this._loadableComponentActionsHub.hideLoadingExperience.invoke({});
            this._publishMarketplaceExtensionResolvedTelemetry(startTime);            
        });
    }

    private _getRequestedExtensionData(requestedExtension: RequestedExtension): IRequestedExtension{
        return ({
            id: ExtensionUtils.createExtensionIdentifier(requestedExtension.publisherName, requestedExtension.extensionName),
            requestedBy: this._getExtensionRequestedByArray(requestedExtension.extensionRequests)
        });
    }

    private _getExtensionRequestedByArray(requests: ExtensionRequest[]): IdentityRef[] {
        return requests.map((request) => { return request.requestedBy; });
    }

    private _publishMarketplaceExtensionResolvedTelemetry(startTime: number): void {
        Telemetry.instance().publishEvent(Feature.MarketplaceExtensionLoad, {} , null, false, startTime);
    }

    private _publishMarketplaceExtensionFailedTelemetry(): void {
        Telemetry.instance().publishEvent(Feature.MarketplaceExtensionFailed);
    }

    private _publishEMSExtensionFailedTelemetry(extensionStatus: string): void {
        let eventProperties: IDictionaryStringTo<any> = {};
        
        eventProperties[Properties.extensionStatus] = extensionStatus;

        Telemetry.instance().publishEvent(Feature.EMSExtensionFailed, eventProperties);
    }

    private _clearFilter(forceRefresh: boolean): void {
        if (!forceRefresh) {
            this.filterExtensionItemList(Utils_String.empty);
        }
    }

    private _actions: Actions.TaskExtensionItemListActions;
    private _loadableComponentActionsHub: LoadableComponentActionsHub;    
    private _instanceId: string;
    private _extensionItems: IExtensionDefinitionItem[];
    private _installedExtensionsIdentifierArray: string[];
    private _requestedExtensionsData: IRequestedExtension[];
}