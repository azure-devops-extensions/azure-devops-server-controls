import * as Q from "q";

import * as TaskUtils from "DistributedTasksCommon/TFS.Tasks.Utils";
import TaskResources = require("DistributedTasksCommon/Resources/TFS.Resources.DistributedTasksLibrary");
import { ServiceEndpointType } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Common";
import * as AzureRMEndpointsManageDialog_NO_REQUIRE from "DistributedTasksCommon/ServiceEndpoints/AzureRMEndpointsManageDialog";
import * as RegexConstants from "DistributedTaskControls/Common/RegexConstants";

import { ConnectedServiceEndpointSource } from "DistributedTaskControls/Sources/ConnectedServiceEndpointSource";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { FilterHelper } from "DistributedTaskControls/Components/Task/FilterHelper";

import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";
import * as ServiceEndpointContracts from "TFS/ServiceEndpoint/Contracts";

import GroupedComboBox = require("VSSPreview/Controls/GroupedComboBox");

import * as Diag from "VSS/Diag";
import * as VSS from "VSS/VSS";
import * as Utils_String from "VSS/Utils/String";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

export class AzureRmComponentUtilityConstants {
    public static Subscription: string = "Subscription";
    public static EndpointFilterRule: string = "EndpointFilterRule";
    public static AzureRMEndpointDefaultFilterRule: string = "ScopeLevel != ManagementGroup";
}

export interface IAzureResourceManagerComponentOptions {
    azureSubscriptions: IDictionaryStringTo<DistributedTaskContracts.AzureSubscription>;
    endpoints: IDictionaryStringTo<ServiceEndpointContracts.ServiceEndpoint>;
    options: GroupedComboBox.IGroupedDataItem<string>[];
    value: string;
    showAddServiceEndpointLink: boolean;
}

export class AzureResourceManagerComponentUtility {

    /**
     * Get the options required for the connected service of type AzureRM
     * :: List of endpoints of type AzureRM, List of Azure Subscriptions,
     * Options to the control and Value
     * 
     * @static
     * @param {string} currentValue
     * @param {string} authSchemes
     * @param {IDictionaryStringTo<string>} properties
     * @returns {IPromise<IAzureRMComponentOptions>}
     * 
     * @memberOf AzureResourceManagerComponentUtility
     */
    public static getConnectedServiceAzureRMOptions(currentValue: string, authSchemes: string, forceRefreshAzureSubscriptions: boolean, forceRefreshServiceEndpoints: boolean, properties?: IDictionaryStringTo<string>): IPromise<IAzureResourceManagerComponentOptions> {

        let showAddServiceEndpointLink: boolean = false;
        let deferred = Q.defer<IAzureResourceManagerComponentOptions>();

        let endpointFilterRule = (!!properties) ? properties[AzureRmComponentUtilityConstants.EndpointFilterRule] : null;
        if (!endpointFilterRule) {
            endpointFilterRule = AzureRmComponentUtilityConstants.AzureRMEndpointDefaultFilterRule;
        }

        let outputValue: string = currentValue;

        let splittedAuthSchemes: string[];
        if (authSchemes) {
            splittedAuthSchemes = authSchemes.split(",");
        }

        // Get the list of existing serviceEndpoints
        let serviceEndPointsPromise = AzureResourceManagerComponentUtility._getARMServiceEndPoints(splittedAuthSchemes, forceRefreshServiceEndpoints);

        // Get the list of existing azure subscriptions
        let azuresubscriptionPromise = AzureResourceManagerComponentUtility._getAzureSubscriptions(forceRefreshAzureSubscriptions);

        Q.spread<ServiceEndpointContracts.ServiceEndpoint[] | DistributedTaskContracts.AzureSubscriptionQueryResult, void>([serviceEndPointsPromise, azuresubscriptionPromise],
            (serviceEndpoints: ServiceEndpointContracts.ServiceEndpoint[], azureSubscriptions: DistributedTaskContracts.AzureSubscriptionQueryResult) => {

                let azureSubscriptionsText: string[] = [];
                let endpointsText: string[] = [];
                let subscriptions: IDictionaryStringTo<DistributedTaskContracts.AzureSubscription> = {};
                let endpoints: IDictionaryStringTo<ServiceEndpointContracts.ServiceEndpoint> = {};

                if (serviceEndpoints) {
                    let filteredServiceEndpoints = FilterHelper.getFilteredObjects(endpointFilterRule, serviceEndpoints);

                    filteredServiceEndpoints.forEach((endpoint: ServiceEndpointContracts.ServiceEndpoint) => {
                        endpointsText.push(endpoint.id);
                        endpoints[endpoint.id] = endpoint;
                    });
                }

                // If no azure subscriptions exists, we need to show the Add service endpoint link
                if (!azureSubscriptions.value || azureSubscriptions.value.length === 0) {
                    showAddServiceEndpointLink = true;
                }

                if (azureSubscriptions.errorMessage) {
                    Diag.logError(azureSubscriptions.errorMessage);
                }
                else if (azureSubscriptions.value) {

                    azureSubscriptions.value.forEach((subscription: DistributedTaskContracts.AzureSubscription) => {
                        //  Now we show all subscriptions irrespective of whether there is an endpoint already configured for it.
                        subscriptions[subscription.subscriptionId] = subscription;
                        azureSubscriptionsText.push(subscription.subscriptionId);
                    });
                }

                // Options to be used for GroupedComboBox
                let options: GroupedComboBox.IGroupedDataItem<string>[] = [];
                options.push({ title: TaskResources.AzureRMAvailableServiceConnections, items: endpointsText });
                options.push({ title: TaskResources.AzureRMAvailableAzureSubscriptions, items: azureSubscriptionsText });

                // If the current saved endpoint is not in the list, it may be because user doesn't have access to it
                // we need to do a get to fetch the name in that case, this will make the definition valid and editable for this user
                if (currentValue && !endpoints[currentValue] && !(TaskUtils.VariableExtractor.containsVariable(currentValue) ||
                    DtcUtils.containsProcessParameter(currentValue))) {

                    ConnectedServiceEndpointSource.instance().getServiceEndpoint(currentValue).then((endpoint: ServiceEndpointContracts.ServiceEndpoint) => {

                        if (endpoint) {

                            let endpointId = endpoint.id;
                            outputValue = endpointId;
                            endpoints[endpointId] = endpoint;
                        }
                        else {

                            // Set empty because the endpoint is probably deleted
                            outputValue = Utils_String.empty;
                        }

                        deferred.resolve({
                            azureSubscriptions: subscriptions,
                            endpoints: endpoints,
                            value: outputValue,
                            options: options,
                            showAddServiceEndpointLink: showAddServiceEndpointLink
                        });

                    }, (reason) => {

                        // ToDo(bhbhati): Take care of error scenario

                        Diag.logError(reason);
                        VSS.handleError({ name: Utils_String.empty, message: reason });
                    });
                } else {

                    deferred.resolve({
                        azureSubscriptions: subscriptions,
                        endpoints: endpoints,
                        value: outputValue,
                        options: options,
                        showAddServiceEndpointLink: showAddServiceEndpointLink
                    });
                }
            },
            (error) => {

                // ToDo(bhbhati): Take care of error scenario

                Diag.logError(error);
                VSS.handleError(error);
            });

        return deferred.promise;
    }

    /**
     * Create a new AzureRM ServiceEndpoint using the azure subscription
     * 
     * @static
     * @param {DistributedTaskContracts.AzureSubscription} subscription
     * @param {(endpoint: ServiceEndpointContracts.ServiceEndpoint) => void} endpointCreatedSuccessCallback
     * @param {boolean} authorizeEndpointForAllPipelines
     * @returns {IPromise<ServiceEndpointContracts.ServiceEndpoint>}
     * 
     * @memberOf AzureResourceManagerComponentUtility
     */
    public static createServiceEndpoint(subscription: DistributedTaskContracts.AzureSubscription, endpointCreatedSuccessCallback: (endpoint: ServiceEndpointContracts.ServiceEndpoint) => void, authorizeEndpointForAllPipelines: boolean = false): IPromise<ServiceEndpointContracts.ServiceEndpoint> {

        let defer = Q.defer<ServiceEndpointContracts.ServiceEndpoint>();

        VSS.using(["DistributedTasksCommon/ServiceEndpoints/AzureRMEndpointsManageDialog"], (AzureRMEndpointsManageDialog: typeof AzureRMEndpointsManageDialog_NO_REQUIRE) => {

            let azureEndpointDialogModel = new AzureRMEndpointsManageDialog.AddAzureRmEndpointsModel(endpointCreatedSuccessCallback);
            azureEndpointDialogModel.name(Utils_String.localeFormat(TaskResources.AzureSubscriptionDisplayName, subscription.displayName, subscription.subscriptionId));
            azureEndpointDialogModel.subscriptionId(subscription.subscriptionId);
            azureEndpointDialogModel.subscriptionName(subscription.displayName);
            azureEndpointDialogModel.tenantId(subscription.subscriptionTenantId);

            azureEndpointDialogModel.createServiceEndpoint(authorizeEndpointForAllPipelines).then((provisionEndpointResponse) => {
                defer.resolve(provisionEndpointResponse);
            }, (error) => {
                defer.reject(error);
            });
        });

        return defer.promise;
    }

    /**
     * Get the subscriptionId from the displayName
     * Ex. displayName: Subscriptio1(GUID) => GUID
     * 
     * @static
     * @param {string} displayName
     * @returns {string}
     * 
     * @memberOf AzureResourceManagerComponentUtility
     */
    public static getSubscriptionIdFromDisplayName(displayName: string): string {
        let result: RegExpMatchArray = displayName.match(RegexConstants.FindSubscriptionIdRegEx);
        return (result && result[1]) ? result[1] : Utils_String.empty;
    }

    /**
     * Get the subscription from subscriptionsMap based on the displayName of the option
     * 
     * @static
     * @param {IDictionaryStringTo<DistributedTaskContracts.AzureSubscription>} subscriptions
     * @param {string} displayName
     * @returns {DistributedTaskContracts.AzureSubscription}
     * 
     * @memberOf AzureResourceManagerComponentUtility
     */
    public static getSubscriptionByName(subscriptions: IDictionaryStringTo<DistributedTaskContracts.AzureSubscription>, displayName: string): DistributedTaskContracts.AzureSubscription {
        let subscriptionId = AzureResourceManagerComponentUtility.getSubscriptionIdFromDisplayName(displayName);
        return subscriptions && subscriptions[subscriptionId] ? subscriptions[subscriptionId] : null;
    }


    /**
     * Get the endpoint from endpointsMap based on the displayName name of the option
     * 
     * @static
     * @param {IDictionaryStringTo<ServiceEndpointContracts.ServiceEndpoint>} endpoints
     * @param {string} displayName
     * @returns {ServiceEndpointContracts.ServiceEndpoint}
     * 
     * @memberOf AzureResourceManagerComponentUtility
     */
    public static getEndpointByName(endpoints: IDictionaryStringTo<ServiceEndpointContracts.ServiceEndpoint>, displayName: string): ServiceEndpointContracts.ServiceEndpoint {
        let endpoint: ServiceEndpointContracts.ServiceEndpoint = null;
        for (let key in endpoints) {
            if (Utils_String.localeIgnoreCaseComparer(endpoints[key].name, displayName) === 0) {
                endpoint = endpoints[key];
                break;
            }
        }
        return endpoint;
    }

    /**
     * Gets the displayName name for options, option can be either subscription or endpoint
     * 
     * @static
     * @param {IDictionaryStringTo<DistributedTaskContracts.AzureSubscription>} subscriptions
     * @param {IDictionaryStringTo<ServiceEndpointContracts.ServiceEndpoint>} endpoints
     * @param {string} key
     * @returns {string}
     * 
     * @memberOf AzureResourceManagerComponentUtility
     */
    public static getDisplayText(subscriptions: IDictionaryStringTo<DistributedTaskContracts.AzureSubscription>, endpoints: IDictionaryStringTo<ServiceEndpointContracts.ServiceEndpoint>, key: string): string {
        let displayName: string = Utils_String.empty;

        // format the displayName to be like Ex. SubscriptionName (GUID) 
        if (subscriptions && subscriptions[key]) {
            displayName = Utils_String.localeFormat(TaskResources.AzureSubscriptionDisplayName, subscriptions[key].displayName, subscriptions[key].subscriptionId);
        }
        else if (endpoints && endpoints[key]) {
            displayName = endpoints[key].name;
        }
        return displayName;
    }

    public static getEndpointAuthorizationScope(endpointId: string, endpointAuthorizationScope?: string): IPromise<string> {
        if (!endpointId) {
            return Q(Utils_String.empty);
        }

        if (!!this._endpointToScopeMap[endpointId.toLocaleLowerCase()]) {
            return Q(this._endpointToScopeMap[endpointId.toLocaleLowerCase()]);
        }

        if (endpointAuthorizationScope !== null && endpointAuthorizationScope !== undefined) {
            // an empty string is a valid value for scope
            this._endpointToScopeMap[endpointId.toLocaleLowerCase()] = endpointAuthorizationScope;
            return Q(endpointAuthorizationScope);
        }

        let authorizationScope = Utils_String.empty;

        return ConnectedServiceEndpointSource.instance().getServiceEndpoint(endpointId).then((endpoint: ServiceEndpointContracts.ServiceEndpoint) => {

            authorizationScope = this.getEndpointAuthorizationScopeFromEndpoint(endpoint);
            this._endpointToScopeMap[endpoint.id.toLocaleLowerCase()] = authorizationScope;
            return Q(authorizationScope);

        }, (error) => {
            Diag.logError(error);
            return Q(authorizationScope);
        });
    }

    public static getEndpointAuthorizationScopeFromEndpoint(endpoint: ServiceEndpointContracts.ServiceEndpoint): string {
        let authScope = Utils_String.empty;

        if (endpoint && endpoint.authorization && endpoint.authorization.parameters) {
            authScope = endpoint.authorization.parameters[AzureResourceManagerComponentUtility.scope] || endpoint.authorization.parameters[AzureResourceManagerComponentUtility.Scope] || Utils_String.empty;
        }

        return authScope;
    }

    public static getUserFriendlyAuthorizationScope(authorizationScope: string): string {
        // authorizationScope will be of the form: /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/{resourceProvider}/{resourceType}/{resourceName}
        // output should be - Scoped to resource 'abc' in resource group 'xyz' or Scoped to resource group 'xyz'
        let userFriendlyScope = authorizationScope;

        if (!!authorizationScope) {
            let authorizationScopeSplit = authorizationScope.split("/");

            if (Utils_String.equals(authorizationScopeSplit[1], "subscriptions", true)) {
                if (!!authorizationScopeSplit[7]) {
                    userFriendlyScope = Utils_String.localeFormat(Resources.ARMEndpointScopeResource, authorizationScopeSplit[7], authorizationScopeSplit[4]);
                }
                else if (!!authorizationScopeSplit[4]) {
                    userFriendlyScope = Utils_String.localeFormat(Resources.ARMEndpointScopeResourceGroup, authorizationScopeSplit[4]);
                }
            }
        }

        return userFriendlyScope;
    }

    private static _getAzureSubscriptions(forceRefresh?: boolean): IPromise<DistributedTaskContracts.AzureSubscriptionQueryResult> {

        if (!AzureResourceManagerComponentUtility._azureSubscriptions || forceRefresh) {
            AzureResourceManagerComponentUtility._azureSubscriptions = ConnectedServiceEndpointSource.instance().beginGetAzureSubscriptions();
        }

        return AzureResourceManagerComponentUtility._azureSubscriptions;
    }

    private static _getARMServiceEndPoints(authSchemes: string[], forceRefresh?: boolean): IPromise<ServiceEndpointContracts.ServiceEndpoint[]> {

        if (!AzureResourceManagerComponentUtility._armEndPoints || forceRefresh) {
            // clear out the endpointToScopeMap for forced refresh of service endpoints
            this._endpointToScopeMap = {};
            AzureResourceManagerComponentUtility._armEndPoints = ConnectedServiceEndpointSource.instance().getServiceEndpoints(ServiceEndpointType.AzureRM, authSchemes);
        }

        return AzureResourceManagerComponentUtility._armEndPoints;
    }

    private static _azureSubscriptions: IPromise<DistributedTaskContracts.AzureSubscriptionQueryResult>;
    private static _armEndPoints: IPromise<ServiceEndpointContracts.ServiceEndpoint[]>;
    private static _endpointToScopeMap: IDictionaryStringTo<string> = {};

    private static readonly scope: string = "scope";
    private static readonly Scope: string = "Scope";
}