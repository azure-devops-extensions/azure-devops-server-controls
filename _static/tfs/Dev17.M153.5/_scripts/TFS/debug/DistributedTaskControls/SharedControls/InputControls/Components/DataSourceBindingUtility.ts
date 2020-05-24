import Q = require("q");

import { ConnectedServiceEndpointSource } from "DistributedTaskControls/Sources/ConnectedServiceEndpointSource";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { SearchableComboBoxSearchState } from "DistributedTaskControls/SharedControls/InputControls/Components/TaskSearchableComboBoxInputComponent";

import * as TaskUtils from "DistributedTasksCommon/TFS.Tasks.Utils";
import * as TaskVariables from "DistributedTasksCommon/TFS.Tasks.Common.Variables";

import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";
import * as ServiceEndpointContracts from "TFS/ServiceEndpoint/Contracts";

import * as Utils_String from "VSS/Utils/String";
import * as Context from "VSS/Context";

export interface IInternalServiceDetails {
    authKey: string;
    manageLink: string;
}

export class DataSourceBindingUtility {

    /**
     * Get the dependencies for the dataSourceBinding
     *  
     * dataSourceBinding:
     * 
     *  {
     *   "target": "WebSiteName",
     *   "endpointId": "$(ConnectedServiceName)",
     *   "dataSourceName": "AzureWebSiteNames",
     *   "parameters": {
     *       "WebSiteLocation": "$(WebSiteLocation)"
     *   }
     * 
     * return ["WebSiteLocation", "ConnectedServiceName"]
     * 
     * @static
     * @param {DataSourceBinding} dataSourceBinding
     * @param {IDictionaryStringTo<string>} [parametersToSend]
     * @returns {string[]}
     * 
     * @memberOf DataSourceBindingUtility
     */
    public static getDataSourceBindingDependency(dataSourceBinding: ServiceEndpointContracts.DataSourceBinding, parametersToSend?: IDictionaryStringTo<string>): string[] {

        let depends: string[] = [];
        let match: RegExpMatchArray | null;

        if (!dataSourceBinding) {
            return depends;
        }

        // Look in the parameters
        for (let key in dataSourceBinding.parameters) {
            if (dataSourceBinding.parameters.hasOwnProperty(key)) {
                match = dataSourceBinding.parameters[key].match(DataSourceBindingUtility._parameterRegex);

                if (!!match) {

                    // If parameter is of type ${var} OR $(var), push the var in the list of dependencies
                    let inputField: string = match[1] || match[2];
                    depends.push(inputField);
                } else {

                    // Else, update the parametersToSend map
                    if (parametersToSend) {
                        parametersToSend[key] = dataSourceBinding.parameters[key];
                    }
                }
            }
        }

        // Check the endpointId input for any dependency
        match = dataSourceBinding.endpointId.match(DataSourceBindingUtility._parameterRegex);

        if (!!match) {

            // Add the dependency present in endpointId
            let inputField: string = match[1] || match[2];
            depends.push(inputField);
        }

        // Check the endpointUrl for any dependencies
        if (!!dataSourceBinding.endpointUrl) {

            // endpointUrl may be of like $(endpoint.url)/$(endpoint.subscriptionId)/services/WebSpaces?properties=georegions
            // Get all the dependencies as an array and concat with the original array of dependencies
            depends = depends.concat(DataSourceBindingUtility._getSourceDefinitionDependency(dataSourceBinding.endpointUrl));
        }

        return depends;
    }

    /**
     * Get all the dependencies from the URL
     * 
     * URL may be of like $(endpoint.url)/$(endpoint.subscriptionId)/services/WebSpaces?properties=georegions
     * 
     * @private
     * @static
     * @param {string} url
     * @returns {string[]}
     * 
     * @memberOf DataSourceBindingUtility
     */
    private static _getSourceDefinitionDependency(url: string): string[] {

        let match: RegExpMatchArray | null;
        let depends: string[] = [];

        /* tslint:disable: no-conditional-assignment*/
        while ((match = DataSourceBindingUtility._parameterRegex_ig.exec(url)) !== null) {
            let inputField: string = match[1] || match[2];
            depends.push(inputField);
        }
        /* tslint:enable: no-conditional-assignment*/
        return depends;
    }

    /**
    * Get the input parameters for the dataSourceBinding if its not matching with the input name
    *  
    * dataSourceBinding:
    * 
    *  {
    *   "target": "WebSiteName",
    *   "endpointId": "$(ConnectedServiceName)",
    *   "dataSourceName": "AzureWebSiteNames",
    *   "parameters": {
    *       "WebSiteLocation": "$(WebSiteLocation)",
    *       "InputVariable": "$(WebSiteLocation)"
    *   }
    * 
    * returns { "InputVariable": "Location" }
    * 
    * @static
    * @param {inputsMap} inputsMap
    * @param {IDictionaryStringTo<string>} dataSourceBinding
    * @param {IDictionaryStringTo<string>} processParametersMap
    * @returns {{IDictionaryStringTo<string>}}
    * 
    * @memberOf DataSourceBindingUtility
    */
    private static _getUnmatchedDataSourceBindingInputParameters(inputsMap: IDictionaryStringTo<string>, processParametersMap: IDictionaryStringTo<string>, dataSourceBinding: DistributedTaskContracts.DataSourceBinding): IDictionaryStringTo<string> {
        let match: RegExpMatchArray | null;
        let processParameters: IDictionaryStringTo<string> = processParametersMap || {};
        let parameters: IDictionaryStringTo<string> = {};

        if (!dataSourceBinding) {
            return parameters;
        }

        for (let key in dataSourceBinding.parameters) {
            if (dataSourceBinding.parameters.hasOwnProperty(key)) {
                match = dataSourceBinding.parameters[key].match(DataSourceBindingUtility._parameterRegex);

                if (!!match) {

                    // If parameter is of type ${var} OR $(var) and does not match the parameter name, get the value of the variable and update the parameters dictionary
                    let inputField: string = match[1] || match[2];
                    if (!!inputsMap && inputsMap.hasOwnProperty(inputField) && inputField !== key) {

                        // Get the value of the dependency input
                        let dependencyValue = DataSourceBindingUtility._getResolvedValueOfInput(inputsMap[inputField], processParameters);
                        if (dependencyValue) {
                            parameters[key] = dependencyValue.trim();
                        }
                    }
                }
            }
        }

        return parameters;
    }

    /**
     *  inputsValueMap contains the key to value mapping for each input in the task, key is the input name and value is the input value
     *  Logic is once we get all the dependencies for a particular dataSourceBinding, try to resolve them 
     *  If all the dependencies are resolved, make the service call to get the options for the particular dataSource
     * 
     * @static
     * @param {IDictionaryStringTo<string>} inputsValueMap
     * @param {TaskSourceDefinition} sourceDefinition
     * @param {DataSourceBinding} dataSourceBinding
     * @returns {IPromise<string[]>}
     * 
     * @memberOf DataSourceBindingUtility
     */
    public static refreshDataSourceBindingPickList(
        inputsMap: IDictionaryStringTo<string>,
        processParametersMap: IDictionaryStringTo<string>,
        dataSourceBinding: DistributedTaskContracts.DataSourceBinding,
        makePagedCallsToDataSource: boolean,
        searchState?: SearchableComboBoxSearchState): IPromise<string[]> {

        let parameterToSend: IDictionaryStringTo<string> = {};
        let depends = DataSourceBindingUtility.getDataSourceBindingDependency(dataSourceBinding, parameterToSend);
        let shouldRefresh = true;
        let endpointPromise: Q.Deferred<string[]> = Q.defer<string[]>();

        // try to resolve all the dependencies
        depends.forEach((dependency: string) => {

            if (inputsMap.hasOwnProperty(dependency)) {

                // Get the value of the dependency input
                let dependencyValue = DataSourceBindingUtility._getResolvedValueOfInput(inputsMap[dependency], processParametersMap);

                if (dependencyValue) {
                    parameterToSend[dependency] = dependencyValue.trim();
                } else {

                    // If any of the dependency value is not set, no point in proceeding to get the options for the particular dataSource
                    shouldRefresh = false;
                }
            }

        });

        if (shouldRefresh) {
            let additionalParameters: IDictionaryStringTo<string> = DataSourceBindingUtility._getUnmatchedDataSourceBindingInputParameters(inputsMap, processParametersMap, dataSourceBinding);
            for (let key in additionalParameters) {
                parameterToSend[key] = additionalParameters[key];
            }

            let authKeyValue: string = DataSourceBindingUtility._getSourceTokenValue(inputsMap, processParametersMap, dataSourceBinding.endpointId);

            // No point in proceeding if there's no auth-key/connection id.
            if (!(authKeyValue === "")) {

                let dataSourceDetails: ServiceEndpointContracts.DataSourceDetails = {
                    dataSourceName: dataSourceBinding.dataSourceName,
                    dataSourceUrl: dataSourceBinding.endpointUrl,
                    resourceUrl: Utils_String.empty,
                    requestContent: Utils_String.empty,
                    requestVerb: Utils_String.empty,
                    parameters: parameterToSend,
                    resultSelector: dataSourceBinding.resultSelector,
                    headers: dataSourceBinding.headers,
                    initialContextTemplate: dataSourceBinding.initialContextTemplate
                };

                let resultTransformationDetails: ServiceEndpointContracts.ResultTransformationDetails = {
                    resultTemplate: dataSourceBinding.resultTemplate,
                    callbackContextTemplate: dataSourceBinding.callbackContextTemplate,
                    callbackRequiredTemplate: dataSourceBinding.callbackRequiredTemplate
                };

                let serviceEndpointRequest: ServiceEndpointContracts.ServiceEndpointRequest = {
                    serviceEndpointDetails: null,
                    dataSourceDetails: dataSourceDetails,
                    resultTransformationDetails: resultTransformationDetails,
                };

                let executeServiceEndpointRequestPromise: IPromise<ServiceEndpointContracts.ServiceEndpointRequestResult>;
                if (!makePagedCallsToDataSource) {
                    executeServiceEndpointRequestPromise = ConnectedServiceEndpointSource.instance().executeServiceEndpointRequest(serviceEndpointRequest, authKeyValue);
                    executeServiceEndpointRequestPromise.then((endpointRequestResult: ServiceEndpointContracts.ServiceEndpointRequestResult) => {
                        if (Utils_String.equals(endpointRequestResult.statusCode, "ok", true)) {
                            if (!!searchState) {
                                searchState.isMoreDataAvailable = endpointRequestResult.callbackRequired;
                            }
                            
                            endpointPromise.resolve(endpointRequestResult.result);
                        } else {
            
                            // We dont want to throw or show error message in the web for external service failures
                            endpointPromise.resolve(endpointRequestResult.result);
                        }
                    }, (error) => {
                        // we will fail for TFS/VSTS errors
                        endpointPromise.reject(error);
                    });
                }
                else {
                    let serviceEndpointResult: string[];
                    executeServiceEndpointRequestPromise = DataSourceBindingUtility.recursivelyExecuteServiceEndpointRequest(serviceEndpointRequest, authKeyValue, serviceEndpointResult);
                    executeServiceEndpointRequestPromise.then((endpointRequestResult: ServiceEndpointContracts.ServiceEndpointRequestResult) => {
                        let result: any = endpointRequestResult.result;
                        endpointPromise.resolve(result);
                    }, (error) => {
    
                        // we will fail for TFS/VSTS errors
                        endpointPromise.reject(error);
                    });
                }                
            }
        }
        else {
            endpointPromise.resolve([]);
        }

        return endpointPromise.promise;
    }

    public static prepareServiceEndpointExecution(
        inputsMap: IDictionaryStringTo<string>, 
        processParametersMap: IDictionaryStringTo<string>,
        dataSourceBinding: DistributedTaskContracts.DataSourceBinding,
        searchText: string): IPromise<string[]> {
            let parameterToSend: IDictionaryStringTo<string> = {};
            let depends = DataSourceBindingUtility.getDataSourceBindingDependency(dataSourceBinding, parameterToSend);
            let endpointPromise: Q.Deferred<string[]> = Q.defer<string[]>();
            let inputsMapCopy = jQuery.extend(true, {}, inputsMap);
            inputsMapCopy["name"] = searchText;
            // try to resolve all the dependencies
            depends.forEach((dependency: string) => {

                if (inputsMapCopy.hasOwnProperty(dependency)) {

                    // Get the value of the dependency input
                    let dependencyValue = DataSourceBindingUtility._getResolvedValueOfInput(inputsMapCopy[dependency], processParametersMap);

                    if (dependencyValue) {
                        parameterToSend[dependency] = dependencyValue.trim();
                    } else {

                        // If any of the dependency value is not set, no point in proceeding to get the options for the particular dataSource
                        endpointPromise.resolve([]);
                    }
                }
            });

            let additionalParameters: IDictionaryStringTo<string> = DataSourceBindingUtility._getUnmatchedDataSourceBindingInputParameters(inputsMapCopy, processParametersMap, dataSourceBinding);
            for (let key in additionalParameters) {
                parameterToSend[key] = additionalParameters[key];
            }

            let authKeyValue: string = DataSourceBindingUtility._getSourceTokenValue(inputsMap, processParametersMap, dataSourceBinding.endpointId);

            // No point in proceeding if there's no auth-key/connection id.
            if (!(authKeyValue === Utils_String.empty)) {

                let dataSourceDetails: ServiceEndpointContracts.DataSourceDetails = {
                    dataSourceName: dataSourceBinding.dataSourceName,
                    dataSourceUrl: dataSourceBinding.endpointUrl,
                    resourceUrl: Utils_String.empty,
                    requestContent: Utils_String.empty,
                    requestVerb: Utils_String.empty,
                    parameters: parameterToSend,
                    resultSelector: dataSourceBinding.resultSelector,
                    headers: dataSourceBinding.headers,
                    initialContextTemplate: dataSourceBinding.initialContextTemplate
                };

                let resultTransformationDetails: ServiceEndpointContracts.ResultTransformationDetails = {
                    resultTemplate: dataSourceBinding.resultTemplate,
                    callbackContextTemplate: dataSourceBinding.callbackContextTemplate,
                    callbackRequiredTemplate: dataSourceBinding.callbackRequiredTemplate
                };

                let serviceEndpointRequest: ServiceEndpointContracts.ServiceEndpointRequest = {
                    serviceEndpointDetails: null,
                    dataSourceDetails: dataSourceDetails,
                    resultTransformationDetails: resultTransformationDetails,
                };
                                
                let executeServiceEndpointRequestPromise = ConnectedServiceEndpointSource.instance().executeServiceEndpointRequest(serviceEndpointRequest, authKeyValue);

                executeServiceEndpointRequestPromise.then((endpointRequestResult: ServiceEndpointContracts.ServiceEndpointRequestResult) => {
                    if (Utils_String.equals(endpointRequestResult.statusCode, "ok", true)) {
                        endpointPromise.resolve(endpointRequestResult.result);
                    } else {
                        // We dont want to throw or show error message in the web for external service failures
                        endpointPromise.resolve(endpointRequestResult.result);
                    }
                }, (error) => {
                    // we will fail for TFS/VSTS errors
                    endpointPromise.reject(error);
                });
            }

            return endpointPromise.promise;
        }

    public static recursivelyExecuteServiceEndpointRequest(serviceEndpointRequest: ServiceEndpointContracts.ServiceEndpointRequest, authKeyValue: string, serviceEndpointResult: string[]): IPromise<ServiceEndpointContracts.ServiceEndpointRequestResult> {
        let endpointPromise: Q.Deferred<ServiceEndpointContracts.ServiceEndpointRequestResult> = Q.defer<ServiceEndpointContracts.ServiceEndpointRequestResult>();
        let executeServiceEndpointRequestPromise = ConnectedServiceEndpointSource.instance().executeServiceEndpointRequest(serviceEndpointRequest, authKeyValue);

        executeServiceEndpointRequestPromise.then((endpointRequestResult: ServiceEndpointContracts.ServiceEndpointRequestResult) => {
            serviceEndpointResult = this.updateResultSet(endpointRequestResult, serviceEndpointResult);

            if (endpointRequestResult.callbackRequired) {
                for (let key in endpointRequestResult.callbackContextParameters) {
                     serviceEndpointRequest.dataSourceDetails.parameters[key] = endpointRequestResult.callbackContextParameters[key];
                }
                serviceEndpointRequest.dataSourceDetails.parameters = Object.assign(serviceEndpointRequest.dataSourceDetails.parameters, endpointRequestResult.callbackContextParameters);
                this.recursivelyExecuteServiceEndpointRequest(serviceEndpointRequest, authKeyValue, serviceEndpointResult).then((output) => {
                    endpointPromise.resolve(output);
                }, (error) => {
                    endpointPromise.reject(error);
                });
            } else {
                if (Utils_String.equals(endpointRequestResult.statusCode, "ok", true)) {
                    endpointRequestResult.result = serviceEndpointResult;
                    endpointPromise.resolve(endpointRequestResult);
                } else {
    
                    // We dont want to throw or show error message in the web for external service failures
                    endpointPromise.resolve(endpointRequestResult);
                }
            }
        }, (error) => {

            // we will fail for TFS/VSTS errors
            endpointPromise.reject(error);
        });

        return endpointPromise.promise;
    }

    public static updateResultSet(endpointRequestResult: ServiceEndpointContracts.ServiceEndpointRequestResult, serviceEndpointResult: string[]): string[] {
        let result = endpointRequestResult.result as string[];
        if (result && result.length > 0) {
            if (serviceEndpointResult) {
                serviceEndpointResult = serviceEndpointResult.concat(endpointRequestResult.result);
            } else {
                serviceEndpointResult = endpointRequestResult.result;
            }
        }

        return serviceEndpointResult;
    }

    public static refreshSourceDefinitionPickList(inputsMap: IDictionaryStringTo<string>, processParametersMap: IDictionaryStringTo<string>, taskId: string, sourceDefinition: DistributedTaskContracts.TaskSourceDefinition): IPromise<string[]> {

        let promises: IPromise<string>[] = [];

        // endpoint url ex: /$(system.teamProject)/_apis/test/plans
        let url: string = sourceDefinition.endpoint;

        // replace values of reserved variable names like project. 
        url = DataSourceBindingUtility._expandImplicitVariables(url);

        // get list of all the dependencies in url 
        let depends = this._getSourceDefinitionDependency(url);

        // If all the dependencies in the url are resolved, just make the service call to get the values
        if (depends.length === 0) {
            return DataSourceBindingUtility._queryOnRefresh(inputsMap, processParametersMap, taskId, sourceDefinition, url);
        }
        else {

            depends.forEach((dependency: string) => {

                let expression: string = "\\{\\$" + dependency + "\\}|\\$\\(" + dependency + "\\)";
                let regex: RegExp = new RegExp(expression, "ig");

                // If the inputsValueMap has the dependency as key, i.e. input with the key exists 
                if (inputsMap.hasOwnProperty(dependency)) {

                    // get the value of the dependency input
                    let dependencyValue = DataSourceBindingUtility._getResolvedValueOfInput(inputsMap[dependency], processParametersMap);

                    // If the value for the input exists, update the value of the dependency in the url 
                    if (dependencyValue) {
                        url = url.replace(regex, dependencyValue.trim());
                        promises.push(<IPromise<string>>Q.resolve(url));
                    }

                } else {

                    let authKeyInputName: string = DataSourceBindingUtility._getAuthKeyInputName(dependency, sourceDefinition.authKey);

                    // If the inputsValueMap has the dependency as key, i.e. input with the key exists 
                    if (inputsMap.hasOwnProperty(authKeyInputName)) {

                        // Get the connectionId
                        let connectionId = DataSourceBindingUtility._getResolvedValueOfInput(inputsMap[authKeyInputName], processParametersMap);

                        if (!connectionId) {
                            return Q.resolve([]);
                        }

                        // Get the data for the service endpoint connection
                        promises.push(<IPromise<string>>ConnectedServiceEndpointSource.instance().getServiceEndpoint(connectionId).then((serviceEndpoint: DistributedTaskContracts.ServiceEndpoint) => {

                            if (!!serviceEndpoint) {

                                // find the key to lookup in data dictionary
                                let dataParameterName = dependency.split(".")[1];

                                if (!serviceEndpoint.data[dataParameterName]) {
                                    dataParameterName = dataParameterName[0].toLowerCase() + dataParameterName.substring(1);
                                }

                                let value = !!serviceEndpoint.data[dataParameterName] ? serviceEndpoint.data[dataParameterName] : Utils_String.empty;

                                if (Utils_String.ignoreCaseComparer(dataParameterName, "subscriptionId") === 0) {
                                    value = value.toLowerCase();
                                }

                                url = url.replace(regex, value.trim());
                                return url;
                            }

                        }, (error) => {
                            return Q.reject(error);
                        }));
                    }
                }
            });

            if (promises.length) {
                return Q.all(promises).then((values: string[]) => {
                    return DataSourceBindingUtility._queryOnRefresh(inputsMap, processParametersMap, taskId, sourceDefinition, url);
                }, (error) => {
                    return Q.reject(error);
                });
            }
            else {
                return Q.resolve([]);
            }
        }
    }

    /**
     * Get the input on which authKey is dependent
     * 
     * @private
     * @static
     * @param {string} dependency
     * @param {string} authKey
     * @returns {string}
     * 
     * @memberOf DataSourceBindingUtility
     */
    private static _getAuthKeyInputName(dependency: string, authKey: string): string {

        let authKeyInputName: string = "";
        let authKeyToken: string = dependency.split(".")[0];
        if (Utils_String.equals(authKeyToken, "authKey", true) || Utils_String.equals(authKeyToken, "endpoint", true)) {
            let authKeySourceValue = authKey || "";
            let authKeyMatch = authKeySourceValue.match(DataSourceBindingUtility._parameterRegex);

            if (authKeyMatch) {
                authKeyInputName = authKeyMatch[1] || authKeyMatch[2];
            }
        }

        return authKeyInputName;
    }


    /**
     * Get the list of options, as per the given URL and keySelector to parse the response
     * 
     * @private
     * @static
     * @param {ITaskMetaData} taskMetaData
     * @param {TaskSourceDefinition} sourceDefinition
     * @param {string} url
     * @returns {IPromise<string[]>}
     * 
     * @memberOf DataSourceBindingUtility
     */
    private static _queryOnRefresh(inputsMap: IDictionaryStringTo<string>, processParametersMap: IDictionaryStringTo<string>, taskId: string, sourceDefinition: DistributedTaskContracts.TaskSourceDefinition, url: string): IPromise<string[]> {

        let authKeyValue: string = DataSourceBindingUtility._getSourceTokenValue(inputsMap, processParametersMap, sourceDefinition.authKey);

        // No point in proceeding if there's no auth-key/connection id.
        if (!(authKeyValue === "")) {
            return ConnectedServiceEndpointSource.instance().queryEndpoint({
                url: url,
                selector: sourceDefinition.selector,
                connectionId: authKeyValue,
                scope: null,    // Set to null because it is implicitly project scoped.
                taskId: taskId,
                keySelector: sourceDefinition.keySelector
            });
        }
        else {
            return Q.resolve([]);
        }
    }

    /**
     * Update the value of ImplicitVariables like teamproject to it's value
     * 
     * Ex.: /$(system.teamProject)/_apis/test/configurations --> /project/_apis/test/configurations
     * 
     * @private
     * @static
     * @param {string} url
     * @returns {string}
     * 
     * @memberOf DataSourceBindingUtility
     */
    private static _expandImplicitVariables(url: string): string {

        // Currently there's only one variable we want to replace.
        let searchValue: string = "\\$\\(" + TaskVariables.ImplicitVariableNames.TeamProject + "\\)";

        // Get the project variable. project variable will contain the project name
        let projectVariable: TaskVariables.DefinitionVariable =
            TaskVariables.ImplicitVariables.GetImplicitVariables(Context.getDefaultWebContext()).filter(
                (value: TaskVariables.DefinitionVariable) => {
                    return Utils_String.localeIgnoreCaseComparer(value.name, TaskVariables.ImplicitVariableNames.TeamProject) === 0;
                })[0];

        // Regex to update the instances of project variable in the url         
        let regex: RegExp = new RegExp(searchValue, "ig");

        return url.replace(regex, projectVariable.value);
    }

    /**
     * Internal map only used for Internal services
     * 
     * @public
     * @static
     * @returns {IDictionaryStringTo<IInternalServiceDetails>}
     * 
     * @memberOf DataSourceBindingUtility
     */
    public static getInternalServiceDetailsMap(): IDictionaryStringTo<IInternalServiceDetails> {
        let internalServicePrefix: string = "tfs:";
        let internalServiceDetailsMap: IDictionaryStringTo<IInternalServiceDetails> = {};

        internalServiceDetailsMap["tfs:devtestlabs"] = {
            authKey: internalServicePrefix + "0000000e-0000-8888-8000-000000000000",
            manageLink: TaskUtils.ActionUrlResolver.getActionUrl(null, null, "machines")
        };

        internalServiceDetailsMap["tfs:teamfoundation"] = {
            authKey: internalServicePrefix + "00025394-6065-48CA-87D9-7F5672854EF7",
            manageLink: TaskUtils.ActionUrlResolver.getActionUrl(null, null, "testmanagement")
        };

        internalServiceDetailsMap["tfs:feed"] = {
            authKey: internalServicePrefix + "00000036-0000-8888-8000-000000000000",
            manageLink: null
        };

        internalServiceDetailsMap["tfs:governance"] = {
            authKey: internalServicePrefix + "00000049-0000-8888-8000-000000000000",
            manageLink: null
        };

        internalServiceDetailsMap["tfs:rm"] = {
            authKey: internalServicePrefix + "0000000D-0000-8888-8000-000000000000",
            manageLink: null
        };

        internalServiceDetailsMap["tfs:ems"] = {
            authKey: internalServicePrefix + "00000028-0000-8888-8000-000000000000",
            manageLink: null
        };

        return internalServiceDetailsMap;
    }


    /**
     * Get the sourceTokenValue
     *  
     * either connectedService with $(var) | {$var} exists -- authKey: endpointId
     * OR Internal services -- authKey as per internalServiceDetailsMap
     *  
     * @private
     * @static
     * @param {IDictionaryStringTo<string>} inputsValueMap
     * @param {string} token
     * @returns {string}
     * 
     * @memberOf DataSourceBindingUtility
     */
    private static _getSourceTokenValue(inputsValueMap: IDictionaryStringTo<string>, processParametersMap: IDictionaryStringTo<string>, token: string): string {
        token = token || "";
        let match = token.match(DataSourceBindingUtility._parameterRegex);
        let tokenValue: string = "";

        if (match) {
            tokenValue = match[1] || match[2];

            if (inputsValueMap.hasOwnProperty(tokenValue)) {
                tokenValue = DataSourceBindingUtility._getResolvedValueOfInput(inputsValueMap[tokenValue], processParametersMap);
            }
        } else {

            let internalServiceDetails = DataSourceBindingUtility.getInternalServiceDetailsMap()[token.toLowerCase()];
            if (internalServiceDetails) {
                tokenValue = internalServiceDetails.authKey;
            }
        }

        // If the user has started typing a variable, we should not treat it as an enpoint
        if (!Utils_String.startsWith(tokenValue, "$(") && Utils_String.ignoreCaseComparer(tokenValue, "$") !== 0) {
            return tokenValue;
        }
        else {
            return Utils_String.empty;
        }
    }

    /**
     * Creates a map of dependency To Targets
     * 
     * @static
     * @param {IDictionaryStringTo<string>} inputsValueMap
     * @param {ServiceEndpointContracts.DataSourceBinding[]} dataSourceBindings
     * @param {DistributedTaskContracts.TaskSourceDefinition[]} sourceDefinitions
     * @returns {IDictionaryStringTo<string[]>}
     * 
     * @memberOf DataSourceBindingUtility
     */
    public static getDependencyToTargetsMap(inputsValueMap: IDictionaryStringTo<string>, dataSourceBindings: ServiceEndpointContracts.DataSourceBinding[], sourceDefinitions: DistributedTaskContracts.TaskSourceDefinition[]): IDictionaryStringTo<string[]> {

        let depencyToTargetMap: IDictionaryStringTo<string[]> = {};

        if (!!dataSourceBindings) {

            dataSourceBindings.forEach((dataSourceBinding: ServiceEndpointContracts.DataSourceBinding) => {

                let depends = DataSourceBindingUtility.getDataSourceBindingDependency(dataSourceBinding);
                depends.forEach((dependency: string) => {

                    if (inputsValueMap.hasOwnProperty(dependency)) {

                        if (!depencyToTargetMap.hasOwnProperty(dependency)) {
                            depencyToTargetMap[dependency] = [];
                        }

                        depencyToTargetMap[dependency].push(dataSourceBinding.target);
                    }
                });
            });
        }

        if (!!sourceDefinitions) {

            sourceDefinitions.forEach((sourceDefinition: DistributedTaskContracts.TaskSourceDefinition) => {

                let depends = DataSourceBindingUtility._getSourceDefinitionDependency(DataSourceBindingUtility._expandImplicitVariables(sourceDefinition.endpoint));

                depends.forEach((dependency: string) => {

                    if (inputsValueMap.hasOwnProperty(dependency)) {

                        if (!depencyToTargetMap.hasOwnProperty(dependency)) {
                            depencyToTargetMap[dependency] = [];
                        }

                        depencyToTargetMap[dependency].push(sourceDefinition.target);
                    }
                    else {

                        let authKeyInputName = DataSourceBindingUtility._getAuthKeyInputName(dependency, sourceDefinition.authKey);
                        if (inputsValueMap.hasOwnProperty(authKeyInputName)) {

                            if (!depencyToTargetMap.hasOwnProperty(authKeyInputName)) {
                                depencyToTargetMap[authKeyInputName] = [];
                            }

                            depencyToTargetMap[authKeyInputName].push(sourceDefinition.target);
                        }
                    }
                });

            });

        }

        return depencyToTargetMap;
    }

    /**
     * Creates a map of dependency To Targets
     * 
     * @static
     * @param {string[]} inputNameList
     * @param {IDictionaryStringTo<string>} inputsValueMap
     * @param {DistributedTaskContracts.DataSourceBinding[]} dataSourceBindings
     * @param {DistributedTaskContracts.TaskSourceDefinition[]} sourceDefinitions
     * @returns {IDictionaryStringTo<string[]>}
     * 
     * @memberOf DataSourceBindingUtility
     *
     * Logic here is to create a map of [inputName --> dependent's names] list for each InputName in the {inputNameList} and return the map.
    */
    public static getInputNameToDependentParentNamesMap(inputNameList: string[], inputsValueMap: IDictionaryStringTo<string>, dataSourceBindings: ServiceEndpointContracts.DataSourceBinding[], sourceDefinitions: DistributedTaskContracts.TaskSourceDefinition[]): IDictionaryStringTo<string[]> {
        let inputNameToDependentsMap: IDictionaryStringTo<string[]> = {};
        let dependencyInputToDependentsArray = DataSourceBindingUtility.getDependencyToTargetsMap(inputsValueMap, dataSourceBindings, sourceDefinitions);

        if (inputNameList && inputNameList.length > 0) {
            inputNameList.forEach((inputName: string) => {

                if (!inputNameToDependentsMap[inputName]) {
                    inputNameToDependentsMap[inputName] = [];
                }

                if (dependencyInputToDependentsArray && Object.keys(dependencyInputToDependentsArray).length > 0) {
                    Object.keys(dependencyInputToDependentsArray).forEach((key: string) => {

                        if (dependencyInputToDependentsArray[key] && dependencyInputToDependentsArray[key].length > 0) {
                            dependencyInputToDependentsArray[key].forEach((dependentInputName: string) => {

                                if (Utils_String.ignoreCaseComparer(dependentInputName, inputName) === 0) {
                                    inputNameToDependentsMap[inputName].push(key);
                                }
                            });
                        }
                    });
                }
            });
        }
        return inputNameToDependentsMap;
    }

    private static _getResolvedValueOfInput(input: string, processParametersMap: IDictionaryStringTo<string>) {
        let resolvedValue = DtcUtils.resolveTaskInputValueByProcessParameters(input, processParametersMap);
        return resolvedValue && resolvedValue.resolvedValue;
    }

    // Support both {$var} and $(var)
    private static _parameterRegex: RegExp = /\{\$(.*?)\}|\$\((.*?)\)/;
    private static _parameterRegex_ig: RegExp = /\{\$(.*?)\}|\$\((.*?)\)/ig;
}