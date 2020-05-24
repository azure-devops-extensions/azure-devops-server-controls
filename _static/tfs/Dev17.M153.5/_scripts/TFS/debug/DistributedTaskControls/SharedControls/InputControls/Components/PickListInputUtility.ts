import * as Q from "q";

import { DataSourceBindingUtility, IInternalServiceDetails } from "DistributedTaskControls/SharedControls/InputControls/Components/DataSourceBindingUtility";
import { UrlUtilities } from "DistributedTaskControls/Common/UrlUtilities";
import * as Common from "DistributedTaskControls/Common/Common";

import { TaskSourceDefinition, TaskInputDefinition } from "TFS/DistributedTask/Contracts";
import { DataSourceBinding } from "TFS/ServiceEndpoint/Contracts";
import { SearchableComboBoxSearchState } from "DistributedTaskControls/SharedControls/InputControls/Components/TaskSearchableComboBoxInputComponent";

import * as Diag from "VSS/Diag";

export interface IPickListOptions {
    sourceDefintion: TaskSourceDefinition;
    dataSourceBinding: DataSourceBinding;
    enableRefresh: boolean;
    manageLink: string;
    enableManage: boolean;
}

export interface IPickListRefreshOptions {
    dataSourceBindings: DataSourceBinding[];
    sourceDefinitions: TaskSourceDefinition[];
    taskDefinitionId: string;
    taskInputToValueMap: IDictionaryStringTo<string>;
    processParametersToValueMap: IDictionaryStringTo<string>;
}

export interface IJsonData {
    error: boolean;
    jsonObject: any;
}

export class PickListInputUtility {

    public static getPickListOptions(inputDefinition: TaskInputDefinition, dataSourceBindings: DataSourceBinding[], sourceDefinitions: TaskSourceDefinition[]): IPickListOptions {

        let pickListOptions: IPickListOptions = {
            sourceDefintion: null,
            dataSourceBinding: null,
            enableRefresh: false,
            manageLink: null,
            enableManage: false
        };

        if (!!dataSourceBindings) {

            // check if the input is dataSourceBound
            dataSourceBindings.forEach((dataSourceBinding: DataSourceBinding) => {

                if (inputDefinition.name === dataSourceBinding.target) {

                    let internalServiceDetails = DataSourceBindingUtility.getInternalServiceDetailsMap()[dataSourceBinding.endpointId.toLowerCase()];

                    PickListInputUtility._updatePickListOptions(inputDefinition, internalServiceDetails, pickListOptions);

                    pickListOptions.dataSourceBinding = dataSourceBinding;
                    pickListOptions.enableRefresh = true;
                }
            });
        }

        if (!!sourceDefinitions) {

            // check if the input is sourceBound
            sourceDefinitions.forEach((sourceDefinition: TaskSourceDefinition) => {

                if (inputDefinition.name === sourceDefinition.target) {

                    let internalServiceDetails = DataSourceBindingUtility.getInternalServiceDetailsMap()[sourceDefinition.authKey.toLowerCase()];

                    PickListInputUtility._updatePickListOptions(inputDefinition, internalServiceDetails, pickListOptions);

                    let hasManageLink = internalServiceDetails && internalServiceDetails.manageLink;
                    if (hasManageLink) {
                        pickListOptions.enableRefresh = true;
                    }

                    pickListOptions.sourceDefintion = sourceDefinition;
                }
            });
        }

        if (inputDefinition && inputDefinition.properties) {
            let enableManageProperty = inputDefinition.properties[Common.INPUT_TYPE_PROPERTY_ENABLE_MANAGE];
            if (enableManageProperty && enableManageProperty.toLowerCase() === "true") {
                pickListOptions.enableManage = true;
                let manageLinkProperty = inputDefinition.properties[Common.INPUT_TYPE_PROPERTY_MANAGE_LINK];

                if (manageLinkProperty) {
                    pickListOptions.manageLink = manageLinkProperty;
                }
            }
        }

        return pickListOptions;
    }

    public static onRefresh(inputDefinition: TaskInputDefinition, refreshOptions: IPickListRefreshOptions): IPromise<IDictionaryStringTo<string>> {

        const pickListOptions = PickListInputUtility.getPickListOptions(inputDefinition, refreshOptions.dataSourceBindings, refreshOptions.sourceDefinitions);

        if (!!pickListOptions.sourceDefintion) {

            const taskDefinitionId = refreshOptions.taskDefinitionId;
            if (!taskDefinitionId) {
                Diag.logWarning("[PickListInputComponent._onRefresh]: No taskDefinitionId found for input: " + inputDefinition.name);
                return Q.resolve({});
            }

            return DataSourceBindingUtility.refreshSourceDefinitionPickList(refreshOptions.taskInputToValueMap, refreshOptions.processParametersToValueMap, taskDefinitionId,
                pickListOptions.sourceDefintion).then((options: string[]) => {

                    const optionsMap: IDictionaryStringTo<string> = {};
                    if (options) {
                        options.forEach((option: string) => {
                            let key = option;
                            let value = option;

                            if (!PickListInputUtility.isEmpty(pickListOptions.sourceDefintion.keySelector)) {

                                const keyValueArray = PickListInputUtility.extractKeyAndValue(value);
                                if (keyValueArray.length >= 2) {
                                    key = keyValueArray[0];
                                    value = keyValueArray[1];
                                }
                            }
                            optionsMap[key] = value;
                        });
                    }

                    return Q.resolve(optionsMap);
                }, (error) => {
                    return Q.reject(error);
                });
        } else if (!!pickListOptions.dataSourceBinding) {
            return DataSourceBindingUtility.refreshDataSourceBindingPickList(refreshOptions.taskInputToValueMap, refreshOptions.processParametersToValueMap,
                pickListOptions.dataSourceBinding, true, null).then((options: string[]) => {

                    const optionsMap: IDictionaryStringTo<string> = {};
                    if (options) {
                        options.forEach((option: string) => {
                            let key = option;
                            let value = option;

                            if (!PickListInputUtility.isEmpty(pickListOptions.dataSourceBinding.resultTemplate)) {

                                try {
                                    const parsedData = JSON.parse(option);
                                    key = parsedData.Value.toString();
                                    value = parsedData.DisplayValue.toString();
                                } catch (e) {
                                    Diag.logWarning("[PickListInputComponent._onRefresh]: json parse failed. Option: " + option);
                                }
                            }
                            optionsMap[key] = value;
                        });
                    }
                    return Q.resolve(optionsMap);
                }, (error) => {
                    return Q.reject(error);
                });
        } else {
            return Q.resolve({});
        }
    }

    public static onSearch(inputDefinition: TaskInputDefinition, refreshOptions: IPickListRefreshOptions, searchText: string): IPromise<IDictionaryStringTo<string>> {
        const pickListOptions = PickListInputUtility.getPickListOptions(inputDefinition, refreshOptions.dataSourceBindings, refreshOptions.sourceDefinitions);
        let q = Q.defer<IDictionaryStringTo<string>>();
        DataSourceBindingUtility.prepareServiceEndpointExecution(refreshOptions.taskInputToValueMap, refreshOptions.processParametersToValueMap,
            pickListOptions.dataSourceBinding, searchText).then((options: string[]) => {
                let result: IDictionaryStringTo<string> = {};
                if (options) {
                    options.forEach(element => {
                        let key = element;
                        let value = element;
                        try {
                            let parsedData = JSON.parse(element);
                            key = parsedData.Value.toString();
                            value = parsedData.DisplayValue.toString();
                        } catch (e) {
                            Diag.logWarning("[SearchableComboboxInputComponent._onRefresh]: json parse failed. Option: " + element);
                        }
                        
                        result[key] = value;
                    });
                }
                
                q.resolve(result);
            }, (error) => {
                q.reject(error);
            });

            return q.promise;
    }

    public static searchableComboboxOnRefresh(inputDefinition: TaskInputDefinition, refreshOptions: IPickListRefreshOptions, searchState: SearchableComboBoxSearchState): IPromise<IDictionaryStringTo<string>> {
        const pickListOptions = PickListInputUtility.getPickListOptions(inputDefinition, refreshOptions.dataSourceBindings, refreshOptions.sourceDefinitions);
        let q = Q.defer<IDictionaryStringTo<string>>();
        if (!!pickListOptions.dataSourceBinding) {
            DataSourceBindingUtility.refreshDataSourceBindingPickList(refreshOptions.taskInputToValueMap, refreshOptions.processParametersToValueMap,
                pickListOptions.dataSourceBinding, false, searchState).then((options: string[]) => {

                    const optionsMap: IDictionaryStringTo<string> = {};
                    if (options) {
                        options.forEach((option: string) => {
                            let key = option;
                            let value = option;

                            if (!PickListInputUtility.isEmpty(pickListOptions.dataSourceBinding.resultTemplate)) {
                                try {
                                    const parsedData = JSON.parse(option);
                                    key = parsedData.Value.toString();
                                    value = parsedData.DisplayValue.toString();
                                } catch (e) {
                                    Diag.logWarning("[PickListInputComponent._onRefresh]: json parse failed. Option: " + option);
                                }
                            }
                            
                            optionsMap[key] = value;
                        });
                    }
                    
                    q.resolve(optionsMap);
                }, (error) => {
                    q.reject(error);
                });
        } else {
            return Q.resolve({});
        }

        return q.promise;
    }

    public static getDependentInputsToValueMap(inputDefinition: TaskInputDefinition, dataSourceBindings: DataSourceBinding[], sourceDefinitions: TaskSourceDefinition[], taskInputToValueMap: IDictionaryStringTo<string>): IDictionaryStringTo<string> {
        // returns the dependent input to value map of the data source 
        let pickListOptions: IPickListOptions = this.getPickListOptions(inputDefinition, dataSourceBindings, sourceDefinitions);
        let dependentInputsToValueMap: IDictionaryStringTo<string> = {};

        if (!!pickListOptions.dataSourceBinding) {
            let dependentInputs = DataSourceBindingUtility.getDataSourceBindingDependency(pickListOptions.dataSourceBinding);
            dependentInputs.forEach((dependency: string) => {
                dependentInputsToValueMap[dependency] = taskInputToValueMap[dependency];
            });
        }

        return dependentInputsToValueMap;
    }

    public static areDataSourceDependentValuesMapEqual(dependentInputsToValueMap1: IDictionaryStringTo<string>, dependentInputsToValueMap2: IDictionaryStringTo<string>): boolean {
        if (Object.keys(dependentInputsToValueMap1).length !== Object.keys(dependentInputsToValueMap2).length) {
            return false;
        }

        for (let dependency in dependentInputsToValueMap1) {
            if (dependentInputsToValueMap1.hasOwnProperty(dependency)) {
                if (dependentInputsToValueMap1[dependency] !== dependentInputsToValueMap2[dependency]) {
                    return false;
                }
            }
        }

        return true;
    }

    public static enableRefresh(inputDefinition: TaskInputDefinition, dataSourceBindings: DataSourceBinding[], sourceDefinitions: TaskSourceDefinition[]) {
        let pickListOptions = PickListInputUtility.getPickListOptions(inputDefinition, dataSourceBindings, sourceDefinitions);
        return pickListOptions.enableRefresh;
    }

    public static enableManageLink(inputDefinition: TaskInputDefinition, dataSourceBindings: DataSourceBinding[], sourceDefinitions: TaskSourceDefinition[]) {
        let pickListOptions = PickListInputUtility.getPickListOptions(inputDefinition, dataSourceBindings, sourceDefinitions);
        return pickListOptions.enableManage;
    }

    public static onManageLink(inputDefinition: TaskInputDefinition, dataSourceBindings: DataSourceBinding[], sourceDefinitions: TaskSourceDefinition[]) {
        let pickListOptions = PickListInputUtility.getPickListOptions(inputDefinition, dataSourceBindings, sourceDefinitions);
        UrlUtilities.openInNewWindow(pickListOptions.manageLink, true);
    }

    public static extractKeyAndValue(keyValueStr: string) {
        let kvArray = new Array<string>();
        let index = PickListInputUtility._getDelimiterIndex(keyValueStr);
        if (index === -1) {
            kvArray.push(keyValueStr);
            kvArray.push(keyValueStr);
        } else {
            let key = keyValueStr.substr(0, index + 1);
            let valIndex = index + PickListInputUtility._delimStr.length + 1;
            let value = keyValueStr.substr(valIndex, keyValueStr.length - valIndex);

            kvArray.push(PickListInputUtility._unescapeDelimiter(key));
            kvArray.push(PickListInputUtility._unescapeDelimiter(value));
        }
        return kvArray;
    }

    public static isEmpty(str: string): boolean {
        return (!str || 0 === str.length);
    }

    public static tryParseJSON(jsonString: string): IJsonData {
        try {
            let output = JSON.parse(jsonString);
            if (output && typeof output === "object" && output !== null) {
                return { error: false, jsonObject: output };
            } else {
                return { error: true, jsonObject: null };
            }
        }
        catch (e) {
            return { error: true, jsonObject: null };
        }
    }

    public static findIds(selectedValues: string[], data: Object[]): number[] {
        let ids: number[] = [];

        for (let i = 0, len = selectedValues.length; i < len; i++) {
            let struct = selectedValues[i].split("\\") || [];
            let finalId = PickListInputUtility.getIdsFromNestedObject(data, struct, 0);

            if (finalId !== -1) {
                ids.push(finalId);
            }
        }

        return ids;
    }

    public static getIdsFromNestedObject(childrenArray: any[], struct: Array<string>, index: number): number {
        if (childrenArray && childrenArray.length > 0) {
            for (let j = 0, len = childrenArray.length; j < len; j++) {
                if (childrenArray[j].text === struct[index]) {
                    if (index === struct.length - 1) {
                        return childrenArray[j].id;
                    }
                    else {
                        return PickListInputUtility.getIdsFromNestedObject(childrenArray[j].children, struct, index + 1);
                    }
                }
            }
        }
        return -1;
    }

    public static findItems(keys: string[], data: Object[]): string[] {
        let items: string[] = [];
        if (keys && keys.length > 0) {
            for (let i = 0, len = keys.length; i < len; i++) {
                let finalItemPath = PickListInputUtility.getItemNamesFromNestedObject(data, keys[i]);

                if (finalItemPath) {
                    items.push(finalItemPath);
                }
            }
        }
        return items;
    }

    public static getItemNamesFromNestedObject(childrenArray: any[], itemId: string): string {
        if (childrenArray && childrenArray.length > 0) {
            for (let j = 0, len = childrenArray.length; j < len; j++) {
                if (childrenArray[j].id === parseInt(itemId, 10)) {
                    return childrenArray[j].text;
                }
            }

            for (let j = 0, len = childrenArray.length; j < len; j++) {
                if (childrenArray[j].children && childrenArray[j].children.length > 0) {
                    let name = PickListInputUtility.getItemNamesFromNestedObject(childrenArray[j].children, itemId);
                    if (name) {
                        return childrenArray[j].text + "\\" + name;
                    }
                }
            }
        }
        return null;
    }

    private static _getDelimiterIndex(keyValueStr: string): number {
        let re = new RegExp(PickListInputUtility._delimRegex, "g");
        return keyValueStr.search(re);
    }

    private static _unescapeDelimiter(input: string): string {
        let re = new RegExp(PickListInputUtility._unescapeRegex, "g");
        return input.replace(re, PickListInputUtility._delimStr);
    }

    private static _updatePickListOptions(inputDefinition: TaskInputDefinition, internalServiceDetails: IInternalServiceDetails, pickListOptions: IPickListOptions) {

        let hasManageLink = internalServiceDetails && internalServiceDetails.manageLink;
        let disableManageLink = inputDefinition.properties && inputDefinition.properties["DisableManageLink"] && inputDefinition.properties["DisableManageLink"].toLowerCase() === "true";

        pickListOptions.enableManage = (hasManageLink && !disableManageLink) ? true : false;

        if (pickListOptions.enableManage) {
            pickListOptions.manageLink = internalServiceDetails.manageLink;
        }

    }

    public static getMultiSelectType(properties: IDictionaryStringTo<string>): string {
        let multiSelectType: string;
        if (properties) {
            if (properties[Common.INPUT_TYPE_PROPERTY_MULTI_SELECT]
                && properties[Common.INPUT_TYPE_PROPERTY_MULTI_SELECT].toLowerCase() === Common.BOOLEAN_TRUE) {
                multiSelectType = Common.PICKLIST_MULTI_SELECT_TREE_TYPE;
            } else if (properties[Common.INPUT_TYPE_PROPERTY_MULTI_SELECT_FLATLIST]
                && properties[Common.INPUT_TYPE_PROPERTY_MULTI_SELECT_FLATLIST].toLowerCase() === Common.BOOLEAN_TRUE) {
                multiSelectType = Common.PICKLIST_MULTI_SELECT_FLAT_LIST_TYPE;
            }
        }
        return multiSelectType;

    }

    private static _delimStr: string = "|";
    private static _delimRegex: string = "[^\\\\]\\|"; // '[^\\]\|'
    private static _unescapeRegex: string = "\\\\\\|"; // '\\\|'
}