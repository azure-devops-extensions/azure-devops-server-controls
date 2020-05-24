
import * as Q from "q";

import * as TaskUtils from "DistributedTasksCommon/TFS.Tasks.Utils";
import { ConnectedServiceMetadata } from "DistributedTasksCommon/TFS.Tasks.Types";
import { ServiceEndpointType as EndpointType } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Common";

import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { UrlUtilities } from "DistributedTaskControls/Common/UrlUtilities";
import { IInputControlStateBase } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { IInputDefinitionBase } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { ConnectedServiceEndpointSource } from "DistributedTaskControls/Sources/ConnectedServiceEndpointSource";
import * as Common from "DistributedTaskControls/Common/Common";

import { FilterHelper } from "DistributedTaskControls/Components/Task/FilterHelper";
import { ServiceEndpoint, ServiceEndpointType, ServiceEndpointAuthenticationScheme } from "TFS/ServiceEndpoint/Contracts";

import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";
import * as VSS from "VSS/VSS";
import * as Diag from "VSS/Diag";
import * as Context from "VSS/Context";

export interface IConnectedServiceInputStateBase extends IInputControlStateBase<string> {
    optionsMap: IDictionaryStringTo<string>;
    showNewConnectionControl?: boolean;
    addServiceConnectionDetails?: IAddServiceConnectionDetails;
    showLoadingIcon?: boolean;
}

export interface IAddServiceConnectionDetails {
    showAddServiceEndpointLink: boolean;
    endpointType?: ServiceEndpointType;
}

export class ConnectedServiceComponentUtilityConstants {
    public static Subscription: string = "Subscription";
    public static EndpointFilterRule: string = "EndpointFilterRule";
    public static AzureRMEndpointDefaultFilterRule: string = "ScopeLevel != ManagementGroup";
}

const urlParamter_resourceId: string = "?resourceId=";

export class ConnectedServiceComponentUtility {

    /**
     * Validates the currentValue for the connected service input agaist deletion of service endpoints
     * Update the currentValue to outputValue accordingly and also send the [Id] -> [Name] dictionary for serviceendpoints which 
     * user has access and explicit append of any which is already present in the currentValue
     * 
     * @static
     * @param {string} currentValue 
     * @param {boolean} useConnectedService
     * @param {IDictionaryStringTo<string>} properties 
     * @param {string} connectedServiceType 
     * @param {string} authSchemes 
     * @returns {IPromise<IConnectedServiceInputStateBase>} 
     * 
     * @memberof ConnectedServiceComponentUtility
     */
    public static getConnectedServiceOptions(currentValue: string, useConnectedService: boolean, connectedServiceType: string, authSchemes: string, properties?: IDictionaryStringTo<string>): IPromise<IConnectedServiceInputStateBase> {

        let deferred = Q.defer<IConnectedServiceInputStateBase>();

        let endpointFilterRule = (!!properties) ? properties[ConnectedServiceComponentUtilityConstants.EndpointFilterRule] : null;

        if (Utils_String.equals(connectedServiceType, EndpointType.AzureRM, true) && !endpointFilterRule) {
            endpointFilterRule = ConnectedServiceComponentUtilityConstants.AzureRMEndpointDefaultFilterRule;
        }

        // Get the authSchemes which can be used to pass on auth to external site by VSTS 
        let splittedAuthSchemes: string[];
        if (authSchemes) {
            splittedAuthSchemes = authSchemes.split(",");
        }

        // Resultant value for the connected service after validations
        let outputValue: string = currentValue;

        // Environment [Id] -> [Name] map
        let environmentsMap: IDictionaryStringTo<string> = {};

        let connectionPromise: IPromise<ServiceEndpoint[] | ConnectedServiceMetadata[]> = useConnectedService ?

            // Note: if isTaskNewType is true, we use Distributed Task to get connectedservices/ serviceendpoints
            ConnectedServiceEndpointSource.instance().getServiceEndpoints(connectedServiceType, splittedAuthSchemes) :

            // ConnectedServiceMetadata, old one
            ConnectedServiceEndpointSource.instance().beginGetSubscriptionNames();


        // Get all the endpoints of type connectedServiceType for which user has access
        connectionPromise.then((services: ServiceEndpoint[] | ConnectedServiceMetadata[]) => {

            let data: IDictionaryStringTo<string> = useConnectedService ?
                ConnectedServiceComponentUtility._getMapForServiceEndPoints(<ServiceEndpoint[]> services, endpointFilterRule) :
                ConnectedServiceComponentUtility._getMapForServiceMetaData(<ConnectedServiceMetadata[]>services);

            let serviceEndpointValues: string[] = currentValue.split(Common.CommaSeparator);
            let missingEndpoints: string[] = [];
            let resolvedValues: string[] = [];

            serviceEndpointValues.forEach((value: string) => {

                // If value is not found in endpoints(user has access) and is neither is variable/process parameter, add to missingEndpoints
                if (value && !data[value] &&
                    !TaskUtils.VariableExtractor.containsVariable(value) &&
                    !DtcUtils.containsProcessParameter(value)) {
                    missingEndpoints.push(value);
                }

                // If value is valid, add it to resolved values
                else {
                    resolvedValues.push(value);
                }
            });

            // If the current saved endpoint is not in the list, it may be because user doesn't have access to it
            // we need to do a get to fetch the name in that case, this will make the definition valid and editable for this user
            if (missingEndpoints.length > 0) {

                // Setting type and authSchemes to undefined to keep the previous behavior untouched (get all the missing endpoints without filter)
                ConnectedServiceEndpointSource.instance().getServiceEndpoints(undefined, undefined, missingEndpoints).then((services: ServiceEndpoint[]) => {

                    services.forEach((service: ServiceEndpoint) => {

                        // Fix the data for the missing endpoints
                        if (service) {
                            let serviceId = service.id;
                            data[serviceId] = service.name;
                            resolvedValues.push(serviceId);
                        }
                    });

                    environmentsMap = data;
                    outputValue = resolvedValues.join(Common.CommaSeparator);

                    deferred.resolve({
                        optionsMap: environmentsMap,
                        value: outputValue
                    });

                }, (reason) => {
                    deferred.reject(reason);
                    Diag.logError(reason);
                    VSS.handleError({ name: Utils_String.empty, message: reason });
                });
            }
            else {

                // everything fine, just return the data as is
                environmentsMap = data;

                deferred.resolve({
                    optionsMap: environmentsMap,
                    value: outputValue
                });
            }
        }, (error) => {
            deferred.reject(error);
            Diag.logError(error);
            VSS.handleError(error);
        });

        return deferred.promise;
    }

    /**
     * Get the sorted array of values in a dictionary
     * 
     * @static
     * 
     * @memberof ConnectedServiceComponentUtility
     */
    public static getSourceFromMap = (map: IDictionaryStringTo<string>) => {
        let source = [];

        for (let key in map) {
            if (map.hasOwnProperty(key)) {
                source.push(map[key]);
            }
        }

        return source.sort(Utils_String.ignoreCaseComparer);
    }

    /**
     * Get the key corresponding to value in the dictionary, return empty string if value is not found in dictionary
     * Ignore check for variables or process parameters
     * 
     * @static
     * 
     * @memberof ConnectedServiceComponentUtility
     */
    public static getKeyFromValue = (map: IDictionaryStringTo<string>, valueToLookUp: string) => {

        // If valueToLookUp is variable or process parameters, just return valueToLookUp
        if (TaskUtils.VariableExtractor.containsVariable(valueToLookUp) ||
            DtcUtils.containsProcessParameter(valueToLookUp)) {
            return valueToLookUp;
        }

        let keyFound = Utils_String.empty;

        for (let key in map) {
            if (map[key] === valueToLookUp) {
                keyFound = key;
                break;
            }
        }

        return keyFound;
    }

    /**
     * Get the value corresponding to a key, return empty string if the key is not found in dictionary
     * Ignore check for variables or process parameters
     * 
     * @static
     * 
     * @memberof ConnectedServiceComponentUtility
     */
    public static getValueFromKey = (map: IDictionaryStringTo<string>, keyToLookUp: string) => {

        // If valueToLookUp is variable or process parameters, just return valueToLookUp
        if (TaskUtils.VariableExtractor.containsVariable(keyToLookUp) ||
            DtcUtils.containsProcessParameter(keyToLookUp)) {
            return keyToLookUp;
        }

        let valueFound = Utils_String.empty;

        for (let key in map) {
            if (key === keyToLookUp) {
                valueFound = map[keyToLookUp];
                break;
            }
        }

        return valueFound;
    }

    /**
     * Get the connected service type for the inputDefintion
     * 
     * @static
     * @param {IInputDefinitionBase} inputDefinition 
     * @returns {string} 
     * 
     * @memberof ConnectedServiceComponentUtility
     */
    public static getConnectedServiceType(inputDefinition: IInputDefinitionBase): string {
        return inputDefinition.type.split(":")[1] || Utils_String.empty;
    }

    /**
     * Get the connected service auth schemes for the inputDefinition
     * 
     * @static
     * @param {IInputDefinitionBase} inputDefinition 
     * @returns {string} 
     * 
     * @memberof ConnectedServiceComponentUtility
     */
    public static getConnectedServiceAuthSchemes(inputDefinition: IInputDefinitionBase): string {
        return inputDefinition.type.split(":")[2] || Utils_String.empty;
    }

    /**
     * Opens the link to manage the service connection with given resourceId
     * 
     * @static
     * @param {string} resourceId 
     * 
     * @memberof ConnectedServiceComponentUtility
     */
    public static openManageLink(resourceId: string): void {

        let actionUrl: string = TaskUtils.ActionUrlResolver.getActionUrl(null, null, "services", { "area": "admin" });

        if (!!resourceId && actionUrl) {
            actionUrl = actionUrl.concat(urlParamter_resourceId, resourceId);
        }

        UrlUtilities.openInNewWindow(actionUrl, true);
    }

    /**
     * Show/Hide add serviceendpoint Link
     * Add inline service connection is not supported for endpoint type { Generic, ExternalGit, GitHub, SSH, Subversion and (AzureRM + Hosted) }
     * For AzureRM + Hosted , AzureRMInput takes care of showing Add in case of No subscriptions
     * 
     * @static
     * @param {string} connectedServiceType 
     * @param {string} authSchemes 
     * @returns {IPromise<IAddServiceConnectionDetails>} 
     * 
     * @memberof ConnectedServiceComponentUtility
     */
    public static showAddServiceEndpointLink(connectedServiceType: string, authSchemes: string): IPromise<IAddServiceConnectionDetails> {

        if (Utils_String.equals(connectedServiceType, EndpointType.GitHub, true)) {
            return Q.resolve({
                showAddServiceEndpointLink: true
            } as IAddServiceConnectionDetails);
        }
        // Check for connectedServiceType to now show Add serviceendpoint for following types
        else if (ConnectedServiceComponentUtility._isAddServiceConnectionNotSupported(connectedServiceType)) {

            return this._hideAddServiceEndpointLink();
        }
        else {

            let splittedAuthSchemes: string[];
            if (authSchemes) {
                splittedAuthSchemes = authSchemes.split(",");
            }

            // Check if endpoint of type connectedServiceType is supported
            return ConnectedServiceEndpointSource.instance().getServiceEndpointTypes(connectedServiceType).then((endpointTypes: ServiceEndpointType[]) => {

                // If endpoint type supported at server
                if (!!endpointTypes && endpointTypes.length >= 1) {
                    let endpointType = endpointTypes[0];

                    // Check If endpointtype supports any of the auth asked by the task author
                    if (splittedAuthSchemes && endpointType.authenticationSchemes) {
                        endpointType.authenticationSchemes = endpointType.authenticationSchemes.filter((value: ServiceEndpointAuthenticationScheme) => {
                            return Utils_Array.contains(splittedAuthSchemes, value.scheme, Utils_String.localeIgnoreCaseComparer);
                        });
                    }

                    // If requested auth supported, then support add
                    if (!!endpointType.authenticationSchemes && endpointType.authenticationSchemes.length >= 1) {

                        let details: IAddServiceConnectionDetails = {
                            showAddServiceEndpointLink: true,
                            endpointType: endpointType
                        };
                        return Q.resolve(details);
                    }
                    else {

                        // If requested auth not supported, then don't support add
                        return this._hideAddServiceEndpointLink();
                    }
                }

                // If endpoint type not supported at server
                else {

                    return this._hideAddServiceEndpointLink();
                }
            }, (error) => {

                // Logging the error
                Diag.logError(error);

                // If case of error, don't show the add link
                return this._hideAddServiceEndpointLink();
            });
        }
    }

    /**
     * Get the [Id] -> [Name] map for the serviceEndPoints
     * 
     * @private
     * @static
     * @param {ServiceEndpoint[]} serviceEndPoints 
     * @returns {IDictionaryStringTo<string>} 
     * 
     * @memberof ConnectedServiceComponentUtility
     */
    private static _getMapForServiceEndPoints(serviceEndPoints: ServiceEndpoint[], filterRule: string): IDictionaryStringTo<string> {
        let data: IDictionaryStringTo<string> = {};

        const filteredServiceEndpoints = FilterHelper.getFilteredObjects(filterRule, serviceEndPoints);

        for (const endpoint of filteredServiceEndpoints) {
            data[endpoint.id] =  endpoint.name;
        }

        return data;
    }


    /**
     * Get the [Id] -> [Name] map for the connectedServiceMetadata
     * Before ConnectedServiceKind, using beginGetSubscriptionNames, ConnectedServiceWebApiData's "id" would be the NAME and "name" would be FRIENDLYNAME
     * 
     * @private
     * @static
     * @param {ConnectedServiceMetadata[]} connectedServiceMetaDatas 
     * @returns {IDictionaryStringTo<string>} 
     * 
     * @memberof ConnectedServiceComponentUtility
     */
    private static _getMapForServiceMetaData(connectedServiceMetaDatas: ConnectedServiceMetadata[]): IDictionaryStringTo<string> {
        let data: IDictionaryStringTo<string> = {};

        connectedServiceMetaDatas.forEach((connectedServiceMetaData: ConnectedServiceMetadata) => {
            data[connectedServiceMetaData.name] = connectedServiceMetaData.friendlyName;
        });

        return data;
    }

    /**
     * Check if the connectedServiceType supports inline addtion of service connection or not
     * 
     * @private
     * @static
     * @param {string} connectedServiceType 
     * @returns {boolean} 
     * 
     * @memberof ConnectedServiceComponentUtility
     */
    private static _isAddServiceConnectionNotSupported(connectedServiceType: string): boolean {

        return Utils_String.equals(connectedServiceType, EndpointType.Generic, true)
            || Utils_String.equals(connectedServiceType, EndpointType.ExternalGit, true)
            || Utils_String.equals(connectedServiceType, EndpointType.SSH, true)
            || Utils_String.equals(connectedServiceType, EndpointType.Subversion, true)
            || (Context.getPageContext().webAccessConfiguration.isHosted && Utils_String.equals(connectedServiceType, EndpointType.AzureRM, true));
    }

    /**
     * Promise to hide the addServiceConnection Link
     * 
     * @private
     * @static
     * @returns {IPromise<IAddServiceConnectionDetails>} 
     * 
     * @memberof ConnectedServiceComponentUtility
     */
    private static _hideAddServiceEndpointLink(): IPromise<IAddServiceConnectionDetails> {
        return Q.resolve({
            showAddServiceEndpointLink: false
        } as IAddServiceConnectionDetails);
    }
}