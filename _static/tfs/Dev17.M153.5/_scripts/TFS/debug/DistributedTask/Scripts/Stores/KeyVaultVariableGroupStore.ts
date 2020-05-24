// Copyright (c) Microsoft Corporation.  All rights reserved.
import Q = require("q");
import Store_Base = require("VSS/Flux/Store");
import Service = require("VSS/Service");
import PlatformContracts = require("VSS/Common/Contracts/Platform");
import VSSContext = require("VSS/Context");
import Library_Actions = require("DistributedTask/Scripts/Actions/LibraryActions");
import Constants = require("DistributedTask/Scripts/Constants");
import Events_Services = require("VSS/Events/Services");
import Resources = require("DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask");
import DTContracts = require("TFS/DistributedTask/Contracts");
import Utils_Url = require("VSS/Utils/Url");

import { LibraryStoreKeys } from "DistributedTask/Scripts/Constants";
import { VariableGroup, AzureKeyVaultVariable, VariableGroupType } from "DistributedTask/Scripts/DT.VariableGroup.Model";
import { TaskAgentHttpClient } from "TFS/DistributedTask/TaskAgentRestClient";
import ServiceEndpointContracts = require("TFS/ServiceEndpoint/Contracts");

import * as VSS from "VSS/VSS";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_Array from "VSS/Utils/Array";
import * as Async_ChooseKeyVaultSecretsDialog from "DistributedTask/Scripts/Components/ChooseKeyVaultSecretsDialog";

export interface VaultReference {
    id: string;
    name: string;
}

export interface IKeyVaultVariableGroupDetails {
    serviceEndpointId: string;
    vault: string;
    keyVaultsList: string[];
    keyVaultReferencesList: VaultReference[];
    spnHasRequiredKeyVaultPermissions: boolean;
    authInProgress: boolean;
    secrets: AzureKeyVaultVariable[];
    lastRefreshedOn: Date;
    formattedScript: string;
}

export class KeyVaultVariableGroupStore extends Store_Base.Store {
    constructor() {
        super();

        this._serviceEndpointsCache = {};
        this.loadVariableGroupDetails(null);
        Library_Actions.loadVariableGroup.addListener(this.loadVariableGroupDetails, this);
        Library_Actions.getVariableGroup.addListener(this.loadVariableGroupDetails, this);
        Library_Actions.cloneVariableGroup.addListener(this.loadVariableGroupDetails, this);
        Library_Actions.refreshKeyVaultVariableGroup.addListener(this.emitChanged, this);
        Library_Actions.updateServiceEndPointInVariableGroup.addListener(this.setServiceEndPointId, this);
        Library_Actions.refreshKeyVaultsList.addListener(this.refreshKeyVaultsListAndSpnPermissions, this);
        Library_Actions.updateKeyVaultNameInVariableGroup.addListener(this.setKeyVaultName, this);
        Library_Actions.updateKeyVaultAuthorizationState.addListener(this.setAuthorizationState, this);
    }

    /**
     * @brief returns the key for the store
     */
    public static getKey(): string {
        return LibraryStoreKeys.StoreKey_KeyVaultVariableGroupStore;
    }

    /**
     * @breif Initializes the store object
     */
    public initialize(): void {

    }

    /**
     * @brief Cleanup of store footprint
     */
    protected disposeInternal(): void {
        Library_Actions.loadVariableGroup.removeListener(this.loadVariableGroupDetails);
        Library_Actions.getVariableGroup.removeListener(this.loadVariableGroupDetails);
        Library_Actions.cloneVariableGroup.removeListener(this.loadVariableGroupDetails);
        Library_Actions.refreshKeyVaultVariableGroup.removeListener(this.emitChanged);
        Library_Actions.updateServiceEndPointInVariableGroup.removeListener(this.setServiceEndPointId);
        Library_Actions.refreshKeyVaultsList.removeListener(this.refreshKeyVaultsListAndSpnPermissions);
        Library_Actions.updateKeyVaultNameInVariableGroup.removeListener(this.setKeyVaultName);
    }

    private loadVariableGroupDetails(variableGroup: VariableGroup): void {
        if (!!variableGroup && VariableGroupType.isKeyVaultVariableGroupType(variableGroup.type) && !!variableGroup.providerData) {
            var azureKeyVaultProviderData: DTContracts.AzureKeyVaultVariableGroupProviderData = 
                variableGroup.providerData as DTContracts.AzureKeyVaultVariableGroupProviderData;

            this._keyVaultVariableGroupDetails = {
                serviceEndpointId: azureKeyVaultProviderData.serviceEndpointId,
                vault: azureKeyVaultProviderData.vault,
                keyVaultsList: [],
                keyVaultReferencesList: [],
                spnHasRequiredKeyVaultPermissions: true,
                authInProgress: false,
                lastRefreshedOn: azureKeyVaultProviderData.lastRefreshedOn,
                secrets: variableGroup.variables,
                formattedScript: Utils_String.empty
            };

            this.refreshKeyVaultsList();
            this.refreshSpnPermissions();
        } else {
            this._keyVaultVariableGroupDetails = {
                serviceEndpointId: Utils_String.empty,
                vault: Utils_String.empty,
                keyVaultsList: [],
                keyVaultReferencesList: [],
                spnHasRequiredKeyVaultPermissions: true,
                authInProgress: false,
                lastRefreshedOn: null,
                secrets: [],
                formattedScript: Utils_String.empty
            };
        }

        this._originalkeyVaultVariableGroupDetails = {
            serviceEndpointId: this._keyVaultVariableGroupDetails.serviceEndpointId,
            vault: this._keyVaultVariableGroupDetails.vault,
            keyVaultsList: Utils_Array.clone(this._keyVaultVariableGroupDetails.keyVaultsList),
            keyVaultReferencesList: Utils_Array.clone(this._keyVaultVariableGroupDetails.keyVaultReferencesList),
            spnHasRequiredKeyVaultPermissions: this._keyVaultVariableGroupDetails.spnHasRequiredKeyVaultPermissions,
            authInProgress: this._keyVaultVariableGroupDetails.authInProgress,
            secrets: Utils_Array.clone(this._keyVaultVariableGroupDetails.secrets),
            lastRefreshedOn: this._keyVaultVariableGroupDetails.lastRefreshedOn,
            formattedScript: this._keyVaultVariableGroupDetails.formattedScript
        };

        this.emitChanged();
    }

    private setServiceEndPointId(serviceEndPointId: string): void {
        Events_Services.getService().fire(Constants.LibraryActions.ClearErrorMessage, this);
        this._keyVaultVariableGroupDetails.serviceEndpointId = serviceEndPointId;
        this._keyVaultVariableGroupDetails.spnHasRequiredKeyVaultPermissions = true;
        this._keyVaultVariableGroupDetails.vault = Utils_String.empty;
        this._keyVaultVariableGroupDetails.secrets = [];
        this._keyVaultVariableGroupDetails.formattedScript = Utils_String.empty;
        this.emitChanged();
        
        this.refreshKeyVaultsList();
    }

    private setKeyVaultName(selectedKeyVaultName: string): void {
        Events_Services.getService().fire(Constants.LibraryActions.ClearErrorMessage, this);
        this._keyVaultVariableGroupDetails.vault = selectedKeyVaultName;

        if (!!this._originalkeyVaultVariableGroupDetails
            && !!this._originalkeyVaultVariableGroupDetails.vault
            && !!this._originalkeyVaultVariableGroupDetails.secrets
            && Utils_String.equals(this._originalkeyVaultVariableGroupDetails.vault, this._keyVaultVariableGroupDetails.vault, true)) {
            this._keyVaultVariableGroupDetails.secrets = Utils_Array.clone(this._originalkeyVaultVariableGroupDetails.secrets);
        }
        else {
            this._keyVaultVariableGroupDetails.secrets = [];
        }

        this._keyVaultVariableGroupDetails.spnHasRequiredKeyVaultPermissions = false;
        this.refreshSpnPermissions();
    }

    private setAuthorizationState(authInProgress: boolean): void {
        Events_Services.getService().fire(Constants.LibraryActions.ClearErrorMessage, this);
        this._keyVaultVariableGroupDetails.authInProgress = authInProgress;

        if (authInProgress) {
            this.emitChanged();
        }
        else {
            this.refreshSpnPermissions();
        }
    }

    private refreshKeyVaultsListAndSpnPermissions(): void {
        Events_Services.getService().fire(Constants.LibraryActions.ClearErrorMessage, this);
        this.refreshKeyVaultsList();
        this.refreshSpnPermissions();
    }

    private refreshKeyVaultsList(): void {
        let progressId = VSS.globalProgressIndicator.actionStarted("KeyVaultVariableGroup.getKeyVaults", true);
        this.getKeyVaultsList([], null).then((listKeyVaultsResult: VaultReference[]) => {
            let errorMessage = Utils_String.empty;

            this._keyVaultVariableGroupDetails.keyVaultReferencesList = listKeyVaultsResult;
            this._keyVaultVariableGroupDetails.keyVaultsList = this._keyVaultVariableGroupDetails.keyVaultReferencesList.map(v => v.name);
            if (!this._keyVaultVariableGroupDetails.keyVaultsList || this._keyVaultVariableGroupDetails.keyVaultsList.length === 0) {
                errorMessage = Resources.KeyVaultsNotFoundText;
            }

            VSS.globalProgressIndicator.actionCompleted(progressId);
            
            this.emitChanged();
            this.updateErrorMessageIfRequired(errorMessage);
        }, (err: any) => {
            VSS.globalProgressIndicator.actionCompleted(progressId);

            this._keyVaultVariableGroupDetails.keyVaultReferencesList = [];
            this._keyVaultVariableGroupDetails.keyVaultsList = [];
            this.emitChanged();

            this.updateErrorMessageIfRequired(err);
        });
    }

    private getKeyVaultsList(accumulatedResult: VaultReference[], skipToken: string): Q.Promise<VaultReference[]> {
        var defer = Q.defer<VaultReference[]>();
        
        if (!!this._keyVaultVariableGroupDetails.serviceEndpointId) {
            let projectId = VSSContext.getDefaultWebContext().project.id;
            let listVaultsRequest;
            if (skipToken) {
                let parameters = { "SkipToken": skipToken };
                listVaultsRequest = this.getServiceEndpointRequest("AzureKeyVaultListVaultsWithSkipToken", parameters);
            }
            else {
                listVaultsRequest = this.getServiceEndpointRequest("AzureKeyVaultListVaults", {});
            }

            this.getTaskHttpClient().executeServiceEndpointRequest(listVaultsRequest, projectId, this._keyVaultVariableGroupDetails.serviceEndpointId).then((endpointRequestResult: ServiceEndpointContracts.ServiceEndpointRequestResult) => {
                if (Utils_String.equals(endpointRequestResult.statusCode, "ok", true)) {
                    let parsedResult = JSON.parse(endpointRequestResult.result);
                    if (parsedResult && parsedResult.value) {
                        parsedResult.value.forEach(kv => 
                            {
                                let vaultReference: VaultReference = {
                                    id: kv.id,
                                    name: kv.name
                                };
                                accumulatedResult.push(vaultReference);
                            });
                    }
                    
                    if (parsedResult && parsedResult.nextLink) {
                        let queryParameters = Utils_Url.getQueryParameters(parsedResult.nextLink);
                        let nextSkipToken = encodeURIComponent(Async_ChooseKeyVaultSecretsDialog.KeyVaultSecretsTable.getPropertyValue(queryParameters, "$skiptoken"));

                        this.getKeyVaultsList(accumulatedResult, nextSkipToken).then((listKeyVaultsResult: VaultReference[]) => {
                            defer.resolve(listKeyVaultsResult);
                        }, (err: any) => {
                            defer.reject(err);
                        });
                    }
                    else {
                         defer.resolve(accumulatedResult);
                    }
                } else {
                    defer.reject(endpointRequestResult.errorMessage);
                }
            }, (err: any) => {
                defer.reject(err);
            });
        }
        else {
            defer.reject(Resources.KeyVaultsNotFoundText);
        }

        return defer.promise;
    }

    private refreshSpnPermissions(): void {
        if (!!this._keyVaultVariableGroupDetails.serviceEndpointId 
            && !!this._keyVaultVariableGroupDetails.vault) {
            let projectId = VSSContext.getDefaultWebContext().project.id;
            let parameters = { "KeyVaultName": this._keyVaultVariableGroupDetails.vault };
            let vaultListPermissionRequest = this.getServiceEndpointRequest("AzureKeyVaultListSecretsTestConnection", parameters);

            let progressId = VSS.globalProgressIndicator.actionStarted("KeyVaultVariableGroup.keyVaultTestConnection", true);
            this.getTaskHttpClient().executeServiceEndpointRequest(vaultListPermissionRequest, projectId, this._keyVaultVariableGroupDetails.serviceEndpointId).then((endpointRequestResult: ServiceEndpointContracts.ServiceEndpointRequestResult) => {
                let result: any = endpointRequestResult.result;
                if (Utils_String.equals(endpointRequestResult.statusCode, "forbidden", true)) {
                    this.setSpnHasRequiredKeyVaultPermissions(false);

                    VSS.globalProgressIndicator.actionCompleted(progressId);
                    this.emitChanged();
                } else {
                    let vaultGetPermissionRequest = this.getServiceEndpointRequest("AzureKeyVaultGetSecretTestConnection", parameters);

                    this.getTaskHttpClient().executeServiceEndpointRequest(vaultGetPermissionRequest, projectId, this._keyVaultVariableGroupDetails.serviceEndpointId).then((endpointRequestResult: ServiceEndpointContracts.ServiceEndpointRequestResult) => {
                        let result: any = endpointRequestResult.result;
                        if (Utils_String.equals(endpointRequestResult.statusCode, "forbidden", true)) {
                            this.setSpnHasRequiredKeyVaultPermissions(false);

                            VSS.globalProgressIndicator.actionCompleted(progressId);
                            this.emitChanged();
                        } else {
                            this.setSpnHasRequiredKeyVaultPermissions(true);
                            
                            VSS.globalProgressIndicator.actionCompleted(progressId);
                            this.emitChanged();
                        }
                    }, (err: any) => {
                        VSS.globalProgressIndicator.actionCompleted(progressId);
                        this.emitChanged();
                        
                        this.updateErrorMessageIfRequired(err);
                    });
                }
            }, (err: any) => {
                VSS.globalProgressIndicator.actionCompleted(progressId);
                this.emitChanged();

                this.updateErrorMessageIfRequired(err);
            });
        }
        else {
            this.emitChanged();
        }
    }

    private setSpnHasRequiredKeyVaultPermissions(value: boolean): void {
        this._keyVaultVariableGroupDetails.spnHasRequiredKeyVaultPermissions = value;

        this.refreshFormattedScript();
    }

    private refreshFormattedScript(): void {
        if (!!this._keyVaultVariableGroupDetails.serviceEndpointId 
            && !!this._keyVaultVariableGroupDetails.vault
            && !this._keyVaultVariableGroupDetails.spnHasRequiredKeyVaultPermissions) {

            if (this._serviceEndpointsCache.hasOwnProperty(this._keyVaultVariableGroupDetails.serviceEndpointId)) {
                this.populateFormattedScript(this._serviceEndpointsCache[this._keyVaultVariableGroupDetails.serviceEndpointId]);
            }
            else {
                let projectId = VSSContext.getDefaultWebContext().project.id;
                let progressId = VSS.globalProgressIndicator.actionStarted("KeyVaultVariableGroup.getSelectedEndpoint", true);
                this.getTaskHttpClient().getServiceEndpointDetails(projectId, this._keyVaultVariableGroupDetails.serviceEndpointId).then((endpoint: ServiceEndpointContracts.ServiceEndpoint) => {
                    VSS.globalProgressIndicator.actionCompleted(progressId);

                    this._serviceEndpointsCache[this._keyVaultVariableGroupDetails.serviceEndpointId] = endpoint;
                    this.populateFormattedScript(endpoint);

                }, (err: any) => {
                    VSS.globalProgressIndicator.actionCompleted(progressId);
                    this.emitChanged();

                    this.updateErrorMessageIfRequired(err);
                });
            }
        }
        else {
            this._keyVaultVariableGroupDetails.formattedScript = Utils_String.empty;
            this.emitChanged();
        }
    }

    private populateFormattedScript(endpoint: ServiceEndpointContracts.ServiceEndpoint): void {
        if (!!endpoint && !!endpoint.data && !!endpoint.authorization && !!endpoint.authorization.parameters) {
            let subscriptionId = Async_ChooseKeyVaultSecretsDialog.KeyVaultSecretsTable.getPropertyValue(endpoint.data, "subscriptionId");
            let servicePrincipalId = Async_ChooseKeyVaultSecretsDialog.KeyVaultSecretsTable.getPropertyValue(endpoint.authorization.parameters, "servicePrincipalId");

            if (!!subscriptionId && !!servicePrincipalId) {
                this._keyVaultVariableGroupDetails.formattedScript = Utils_String.format("$ErrorActionPreference=\"Stop\";Login-AzureRmAccount -SubscriptionId {0};$spn=(Get-AzureRmADServicePrincipal -SPN {1});$spnObjectId=$spn.Id;Set-AzureRmKeyVaultAccessPolicy -VaultName {2} -ObjectId $spnObjectId -PermissionsToSecrets get,list;",
                subscriptionId,
                servicePrincipalId,
                this._keyVaultVariableGroupDetails.vault);
            }
        }

        this.emitChanged();
    }

    private updateErrorMessageIfRequired(errorMessage: string): void {
        if (!!errorMessage) {
            Events_Services.getService().fire(Constants.LibraryActions.UpdateErrorMessage, this, errorMessage);
        }
    }

    private getServiceEndpointRequest(dataSourceName: string, parameters: { [key: string]: string }): ServiceEndpointContracts.ServiceEndpointRequest {

        let dataSourceDetails: ServiceEndpointContracts.DataSourceDetails = {
            dataSourceName: dataSourceName,
            dataSourceUrl: null,
            headers: null,
            resourceUrl: null,
            parameters: parameters,
            requestContent: null,
            requestVerb: null,
            resultSelector: null,
            initialContextTemplate: null
        };

        let serviceEndpointRequest: ServiceEndpointContracts.ServiceEndpointRequest = {
            serviceEndpointDetails: null,
            dataSourceDetails: dataSourceDetails,
            resultTransformationDetails: {
                "resultTemplate": null,
                "callbackContextTemplate": null,
                "callbackRequiredTemplate": null
            }
        };

        return serviceEndpointRequest;
    }
    
    public updateSecrets(selectedSecrets: AzureKeyVaultVariable[], removedSecrets: AzureKeyVaultVariable[]) {
        if (!!this._keyVaultVariableGroupDetails
            && !!this._keyVaultVariableGroupDetails.secrets) {
                selectedSecrets.forEach(s => {
                    var currentIndex = Utils_Array.findIndex(this._keyVaultVariableGroupDetails.secrets, a => Utils_String.localeIgnoreCaseComparer(a.name, s.name) === 0);
                    if (currentIndex >= 0) {
                        this._keyVaultVariableGroupDetails.secrets[currentIndex] = s;
                    }
                    else {
                        this._keyVaultVariableGroupDetails.secrets.push(s);
                    }
                });

                removedSecrets.forEach(s => {
                    var currentIndex = Utils_Array.findIndex(this._keyVaultVariableGroupDetails.secrets, a => Utils_String.localeIgnoreCaseComparer(a.name, s.name) === 0);
                    if (currentIndex >= 0) {
                        Utils_Array.removeAtIndex(this._keyVaultVariableGroupDetails.secrets, currentIndex);
                    }
                });

                this._keyVaultVariableGroupDetails.lastRefreshedOn = Utils_Date.getNowInUserTimeZone();
                this.emitChanged();
            }
    }

    public deleteSecret(index: number, secret: AzureKeyVaultVariable) {
        if (!!this._keyVaultVariableGroupDetails
            && !!this._keyVaultVariableGroupDetails.secrets
            && this._keyVaultVariableGroupDetails.secrets.length > index) {
                var removed = Utils_Array.removeAtIndex(this._keyVaultVariableGroupDetails.secrets, index);
                if (!removed) {
                    throw Resources.FailedToDeleteSecretText;
                }

                this.emitChanged();
            }
    }

    public getKeyVaultVariableGroupDetails(): IKeyVaultVariableGroupDetails {
        if (!this._keyVaultVariableGroupDetails)
        {
            return {
                serviceEndpointId: Utils_String.empty,
                vault: Utils_String.empty,
                keyVaultsList: [],
                keyVaultReferencesList: [],
                spnHasRequiredKeyVaultPermissions: true,
                authInProgress: false,
                secrets: [],
                lastRefreshedOn: null,
                formattedScript: Utils_String.empty
            }
        }
        
        return this._keyVaultVariableGroupDetails;
    }

    public isDirty(): boolean {

        if (!this._originalkeyVaultVariableGroupDetails || !this._keyVaultVariableGroupDetails) {
            return false;
        }

        var areSecretsEqual = Utils_Array.arrayEquals(this._originalkeyVaultVariableGroupDetails.secrets, this._keyVaultVariableGroupDetails.secrets, (s: AzureKeyVaultVariable, t: AzureKeyVaultVariable) => {
            return Utils_String.localeIgnoreCaseComparer(s.name, t.name) === 0;
        });
        
        if (!Utils_String.equals(this._originalkeyVaultVariableGroupDetails.serviceEndpointId, this._keyVaultVariableGroupDetails.serviceEndpointId, true)
            || !Utils_String.equals(this._originalkeyVaultVariableGroupDetails.vault, this._keyVaultVariableGroupDetails.vault, true)
            || !areSecretsEqual
            || Utils_Date.defaultComparer(this._originalkeyVaultVariableGroupDetails.lastRefreshedOn, this._keyVaultVariableGroupDetails.lastRefreshedOn) !== 0) {

            // Not comparing secrets since they are treated as dirty if lastRefreshedOn doesn't match
            return true;
        }

        return false;
    }

    public isValid(): boolean {

        if (!this.isDirty()) {
            return true;
        }

        var isValidKeyVaultName = true;
        if (!!this._keyVaultVariableGroupDetails.vault 
            && !!this._keyVaultVariableGroupDetails.keyVaultsList 
            && this._keyVaultVariableGroupDetails.keyVaultsList.length > 0
            && !Utils_Array.contains(this._keyVaultVariableGroupDetails.keyVaultsList, this._keyVaultVariableGroupDetails.vault)) {
            isValidKeyVaultName = false;
        }

        if (isValidKeyVaultName
            && !!this._keyVaultVariableGroupDetails
            && !!this._keyVaultVariableGroupDetails.serviceEndpointId
            && !!this._keyVaultVariableGroupDetails.vault
            && !!this._keyVaultVariableGroupDetails.secrets
            && this._keyVaultVariableGroupDetails.secrets.length > 0
            && !!this._keyVaultVariableGroupDetails.lastRefreshedOn) {

            return true;
        }

        return false;
    }

    public hasData(): boolean {
        if (!!this._keyVaultVariableGroupDetails.serviceEndpointId
            ||!!this._keyVaultVariableGroupDetails.vault
            || (!!this._keyVaultVariableGroupDetails.secrets && this._keyVaultVariableGroupDetails.secrets.length > 0)) {
            return true;
        }

        return false;
    }

    public getResourceGroup(vault: string): string {
        let resourceGroup: string = null;

        if (!!this._keyVaultVariableGroupDetails.keyVaultReferencesList) 
        {
            let matchingVaults = this._keyVaultVariableGroupDetails.keyVaultReferencesList.filter(v => Utils_String.equals(v.name, vault, true));

            if (matchingVaults.length === 1) {
                //id format: /subscriptions/{SubscriptionId}/resourceGroups/{ResourceGroup}/providers/Microsoft.KeyVault/vaults/{VaultName}
                let idparts = matchingVaults[0].id.split("/");
                if (idparts.length === 9) {
                    resourceGroup = idparts[4];
                }
            }
        }

        return resourceGroup;
    }
    
    private getTaskHttpClient(): TaskAgentHttpClient {
        if(!this._taskHttpClient)
        {
            var webContext: PlatformContracts.WebContext = VSSContext.getDefaultWebContext();
            var vssConnection: Service.VssConnection = new Service.VssConnection(webContext, PlatformContracts.ContextHostType.ProjectCollection);
            this._taskHttpClient = vssConnection.getHttpClient(TaskAgentHttpClient);
        }

        return this._taskHttpClient;
    }

    private _originalkeyVaultVariableGroupDetails: IKeyVaultVariableGroupDetails;
    private _keyVaultVariableGroupDetails: IKeyVaultVariableGroupDetails;
    private _taskHttpClient: TaskAgentHttpClient;
    private _serviceEndpointsCache: IDictionaryStringTo<ServiceEndpointContracts.ServiceEndpoint>;
}