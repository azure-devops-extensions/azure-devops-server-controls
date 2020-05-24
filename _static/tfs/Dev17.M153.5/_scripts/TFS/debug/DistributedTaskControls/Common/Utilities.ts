
import { AppCapability, AppContext } from "DistributedTaskControls/Common/AppContext";
import * as Common from "DistributedTaskControls/Common/Common";
import { CommaSeparator, CONTROL_OPTIONS_GROUP, DemandCondition, ProcessParameterConstants, TaskConditions, TaskControlOptionsConstants as Constants } from "DistributedTaskControls/Common/Common";
import { Item } from "DistributedTaskControls/Common/Item";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import * as RegexConstants from "DistributedTaskControls/Common/RegexConstants";
import { InputControlShortKeys } from "DistributedTaskControls/Common/ShortKeys";
import { ItemListShortKeys } from "DistributedTaskControls/Common/ShortKeys";
import { BranchFilterType, IInsertListItemData, IResolvedTaskInputValue, ITaskDefinitionItem } from "DistributedTaskControls/Common/Types";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { IDuration, TimeConstants, TimeUnits } from "DistributedTaskControls/SharedControls/InputControls/Components/DurationInputComponent";
import { IDemandData } from "DistributedTaskControls/Stores/DemandsStore";
import { IDeploymentGroupDemandData } from "DistributedTaskControls/Stores/DeploymentGroupDemandsStore";

import * as TaskTypes from "DistributedTasksCommon/TFS.Tasks.Types";
import * as TaskUtils from "DistributedTasksCommon/TFS.Tasks.Utils";
import * as TaskModels from "DistributedTasksCommon/TFS.Tasks.Models";

import { TaskDefinition } from "TFS/DistributedTask/Contracts";
import { DataSourceBindingBase as DataSourceBinding, ProcessParameters, TaskInputDefinitionBase as TaskInputDefinition, TaskSourceDefinitionBase as TaskSourceDefinition } from "TFS/DistributedTaskCommon/Contracts";

import * as PlatformContracts from "VSS/Common/Contracts/Platform";
import * as Context from "VSS/Context";
import * as VssContext from "VSS/Context";
import * as KeyboardShortcuts_LAZY_LOAD from "VSS/Controls/KeyboardShortcuts";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureManagementService } from "VSS/FeatureManagement/Services";
import { HubsService } from "VSS/Navigation/HubsService";
import * as Navigation_Service from "VSS/Navigation/Services";
import { getService, getLocalService } from "VSS/Service";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";
import { Positioning } from "VSS/Utils/UI";
import * as VSS from "VSS/VSS";
import * as WebApi_Contracts from "VSS/WebApi/Contracts";

/**
 * @brief Set of Utility methods that can be used across DTC related code
 */
export class DtcUtils {
    /**
     * @brief Returns the IdentityRef object of the currently logged in user
     */
    public static getCurrentUser(): WebApi_Contracts.IdentityRef {
        let webContext: WebContext = VssContext.getDefaultWebContext();

        if (!webContext) {
            return null;
        }

        let currentUser: WebApi_Contracts.IdentityRef = <WebApi_Contracts.IdentityRef>{
            displayName: webContext.user.name,
            id: webContext.user.id,
            isAadIdentity: webContext.host.isAADAccount,
            isContainer: false,
            uniqueName: webContext.user.uniqueName,
            url: webContext.host.uri
        };

        return currentUser;
    }

    /**
     * @brief Returns task instance for the specified task definition
     * @param taskDefinition
     */
    public static getTaskFromTaskDefinition(taskDefinition: ITaskDefinitionItem): TaskTypes.ITask {

        let continueOnError = false;
        let alwaysRun = false;
        let versionSpec: string = TaskUtils.getMajorVersionSpec(taskDefinition.version);

        if (taskDefinition.definitionType === TaskTypes.DefinitionType.metaTask) {
            continueOnError = true;
            alwaysRun = true;

            // get task group demands
            if (AppContext.instance().isCapabilitySupported(AppCapability.ShowTaskGroupDemands)) {
                TaskModels.TaskDefinitionCache.getTaskDefinitionCache().cacheMetaTaskDemandsFromServer(taskDefinition.id, versionSpec);
            }
        }

        let taskDefinitionReference = <TaskTypes.TaskDefinitionReference>{
            id: taskDefinition.id,
            versionSpec: versionSpec,
            definitionType: taskDefinition.definitionType
        };

        return <TaskTypes.ITask>{
            displayName: "",
            refName: null,
            enabled: true,
            continueOnError: continueOnError,
            timeoutInMinutes: 0,
            alwaysRun: alwaysRun,
            inputs: <IDictionaryStringTo<string>>DtcUtils.convertTaskDefinitionInputsToTaskInstanceInputs(taskDefinition.inputs),
            task: taskDefinitionReference
        };
    }

    public static convertTaskDefinitionInputsToTaskInstanceInputs(inputs: TaskInputDefinition[]) {
        let obj = {};
        for (let input of inputs) {
            if (input.defaultValue !== undefined) {
                obj[input.name] = input.defaultValue;
            }
        }
        return obj;
    }

    /**
     * @brief returns the type of the input 
     * @param input
     */
    public static getTaskInputType(input: TaskInputDefinition): string {
        let inputType = input.type.split(":")[0];

        if (inputType) {
            inputType = inputType.toLowerCase();
        }

        return inputType;
    }

    public static getUniqueInstanceId(): string {
        return Utils_String.format(DtcUtils._formatString, "object-instance-id", Utils_String.generateUID());
    }

    public static createInputDefinitionCopy(inputDefn: TaskInputDefinition): TaskInputDefinition {
        if (!!inputDefn) {
            return {
                name: inputDefn.name,
                defaultValue: inputDefn.defaultValue,
                groupName: inputDefn.groupName,
                helpMarkDown: inputDefn.helpMarkDown,
                label: inputDefn.label,
                required: inputDefn.required,
                type: inputDefn.type,
                visibleRule: inputDefn.visibleRule,
                options: JQueryWrapper.extend({}, inputDefn.options),
                properties: JQueryWrapper.extend({}, inputDefn.properties)

            } as TaskInputDefinition;
        }
        return inputDefn;
    }

    // generates the new unique name based on format. It can be used in scenarios 
    // like new unique environment name generation, connected service name etc.
    public static getDefaultName(format: string, existingNames: string[]): string {
        let count: number = 1;
        let foundName: boolean = false;
        let newconnectionName: string;
        existingNames = existingNames || [];

        do {
            newconnectionName = Utils_String.format(format, count);
            foundName = Utils_Array.arrayContains(newconnectionName, existingNames, (s1: string, s2: string) => {
                return Utils_String.equals(s1, s2, true);
            });
            count++;
        } while (foundName);

        return newconnectionName;
    }

    public static createSourceDefinitionCopy(sourceDefn: TaskSourceDefinition): TaskSourceDefinition {
        if (!!sourceDefn) {
            return {
                authKey: sourceDefn.authKey,
                endpoint: sourceDefn.endpoint,
                keySelector: sourceDefn.keySelector,
                selector: sourceDefn.selector,
                target: sourceDefn.target
            } as TaskSourceDefinition;
        }
        return sourceDefn;
    }

    public static createDataSourceBindingCopy(dataBind: DataSourceBinding): DataSourceBinding {
        if (!!dataBind) {
            return {
                dataSourceName: dataBind.dataSourceName,
                endpointId: dataBind.endpointId,
                endpointUrl: dataBind.endpointUrl,
                resultSelector: dataBind.resultSelector,
                resultTemplate: dataBind.resultTemplate,
                target: dataBind.target,
                parameters: JQueryWrapper.extend({}, dataBind.parameters)
            } as DataSourceBinding;
        }
        return dataBind;
    }

    public static containsProcessParameter(data: string): boolean {
        return DtcUtils.oldProcParamRegex.test(data) || DtcUtils.newProcParamRegex.test(data);
    }

    public static resolveTaskInputValueByProcessParameters(origtaskInputValue: string, processParameterToValueMap: IDictionaryStringTo<string>): IResolvedTaskInputValue {
        let testedValue: IResolvedTaskInputValue =
            DtcUtils._resolveTaskInputValueByProcessParameters(origtaskInputValue, processParameterToValueMap, DtcUtils.oldProcParamRegex);
        if (testedValue.isResolved) {
            return testedValue;
        }

        return DtcUtils._resolveTaskInputValueByProcessParameters(origtaskInputValue, processParameterToValueMap, DtcUtils.newProcParamRegex);
    }

    public static getProcParamNameFromVariableName(variableName: string): string {
        let procParamAsVariableRegex: RegExp = new RegExp("(^\\s*)(" + ProcessParameterConstants.NewProcessParameterPrefix + ")(\\.)(.*)(\\s*$)", "i");

        /*
           Looking for string that
           Starts with some zero or more whitespaces, then prefix 'parameters', then '.'
           then variable name.

           So if variable like: parameters.param1
           return param1
        */
        let regxMatches: RegExpExecArray = procParamAsVariableRegex.exec(variableName);

        // regMatches array will contain 6 entries where first wil be complete string and rest individual matches. Index 4th will be process parameter name.
        if (!!regxMatches && regxMatches.length === 6) {
            let procParam: string = regxMatches[4] ? regxMatches[4].trim() : Utils_String.empty;
            return procParam;
        }

        // If nothing matches then return back same string.
        return variableName;
    }

    public static getProcParamNameFromProcessParameter(originalProcParam: string): string {
        let procParamValue: string = originalProcParam ? originalProcParam.trim() : Utils_String.empty;
        let regExp = DtcUtils.newProcParamRegex;
        let procParam: string = null;
        /*
          Looking for string that
          Starts with '$(' then some zero or more whitespaces, then prefix 'procparam' or 'parameters'(depending upon regexp passed), then '.'
          then variable name and then ends with ')'
   
          So task value should be like: $(  procparam.param1 ) or $(  parameters.param1 )
       */

        let regxMatches: RegExpExecArray = regExp.exec(procParamValue);

        // regMatches array will contain 7 entries where first wil be complete string and rest individual matches. Index 5th will be process parameter name.
        if (!!regxMatches && regxMatches.length === 7) {
            procParam = regxMatches[5] ? regxMatches[5].trim() : Utils_String.empty;
        }
        return procParam;
    }

    public static convertSerializedDemandToDemandData(serializedDemands: any[]): IDemandData[] {
        let demands: IDemandData[] = [];
        if (serializedDemands && serializedDemands.length > 0) {
            serializedDemands.forEach((serializedDemand: any, index: number) => {
                let demand: IDemandData = { name: Utils_String.empty, condition: Utils_String.empty, value: Utils_String.empty };

                if (AppContext.instance().isCapabilitySupported(AppCapability.GreaterThanConditionInDemand)) {
                    if (RegexConstants.DemandEqualsRegEx.test(serializedDemand)) {
                        demand.condition = DemandCondition.Equals;

                        const tokens = serializedDemand.split(RegexConstants.DemandEqualsRegEx);
                        if (tokens) {
                            demand.name = tokens[0] == null ? Utils_String.empty : tokens[0];
                            demand.value = tokens[1] == null ? Utils_String.empty : tokens[1];
                        }
                    }
                    else {
                        demand.name = serializedDemand;
                        demand.condition = DemandCondition.Exists;
                    }
                }
                else {
                    let match: RegExpExecArray = DtcUtils._demandRegex.exec(serializedDemand);
                    if (match) {
                        demand.name = (!match[1]) ? Utils_String.empty : match[1];
                        demand.value = (!match[4]) ? Utils_String.empty : match[4];
                        if (Utils_String.equals(DemandCondition.Equals, match[3])) {
                            demand.condition = DemandCondition.Equals;
                        }
                        else {
                            demand.condition = DemandCondition.Exists;
                        }
                    }
                }
                demands.push(demand);
            });
        }

        return demands;
    }

    public static convertSerializedDemandToDeploymentGroupDemandData(serializedDemands: any[]): IDeploymentGroupDemandData[] {
        let deploymentGroupDemands: IDeploymentGroupDemandData[] = [];
        DtcUtils.convertSerializedDemandToDemandData(serializedDemands).forEach((demand: IDemandData) => {
            if (demand) {
                deploymentGroupDemands.push({
                    name: demand.name,
                    value: (demand.condition === DemandCondition.Exists) ? demand.condition : demand.value,
                    machinesMissingDemand: []
                });
            }
        });
        return deploymentGroupDemands;
    }

    public static convertDemandDataToSerializedDemand(demands: IDemandData[]): string[] {
        let demandSerialized: string[] = [];
        if (demands && demands.length > 0) {
            demands.forEach((demand: IDemandData) => {
                switch (demand.condition) {
                    case DemandCondition.Exists:
                        demandSerialized.push(demand.name.trim());
                        break;
                    case DemandCondition.Equals:
                        demandSerialized.push(Utils_String.localeFormat(DtcUtils._formatEqualsString, demand.name.trim(), demand.value.trim()));
                        break;
                    default:
                        break;
                }
            });
        }
        return demandSerialized;
    }

	/*
	Tags filter compare for machines
	*/
    public static isQualifiedMachine(machineTags: string[], selectedTags: string[]): boolean {
        if (!machineTags) {
            return !(selectedTags && selectedTags.length > 0);
        }
        let isSuperset = selectedTags.every((tag) => {
            if (Utils_Array.contains(machineTags, tag, Utils_String.localeIgnoreCaseComparer)) {
                return true;
            }
            return false;
        });

        return isSuperset;
    }

    /*
        Remove an item from item array and return the removed item and next item.
    */
    public static removeItemFromList(items: Item[], itemId: string): { items: Item[], removedItem: Item, nextItem: Item } {
        let filteredItems = { items: null, removedItem: null, nextItem: null };

        filteredItems.items = items.filter((item: Item, index: number) => {
            if (Utils_String.equals(item.getKey(), itemId)) {
                filteredItems.removedItem = item;

                // If last item in the list select the one previous else select the next item
                let nextItemIndex = (index === items.length - 1) ? index - 1 : index + 1;
                if (nextItemIndex >= 0) {
                    filteredItems.nextItem = items[nextItemIndex];
                }

                return false;
            }
            return true;
        });

        return filteredItems;
    }

    public static scrollElementToView(element: HTMLElement, scrollBehavior?: Positioning.VerticalScrollBehavior, onScrollCompleted?: () => void): void {
        if (window.requestAnimationFrame) {
            window.requestAnimationFrame(() => {
                if (element) {
                    Positioning.scrollIntoViewVertical($(element), scrollBehavior || Positioning.VerticalScrollBehavior.Default);
                    if (onScrollCompleted) {
                        onScrollCompleted();
                    }
                }
            });
        }
    }

    public static isNumberInRange(value: number, lowerLimit: number, upperLimit: number, checkIfPositive?: boolean): boolean {

        if (value === null || value === undefined) {
            return false;
        }

        if (checkIfPositive && !Utils_Number.isPositiveNumber(value)) {
            return false;
        }

        return Utils_Number.defaultComparer(value, lowerLimit) >= 0 && Utils_Number.defaultComparer(value, upperLimit) <= 0;
    }

    // This method will be deprecated. Please use isValidNonNegativeIntegerInRange instead.
    public static isValidNonNegativeNumberInRange(value: string, lowerLimit: number = 0, upperLimit: number): Common.InputState {

        if (value === null || value === undefined) {
            return Common.InputState.Invalid_NonPositiveNumber;
        }

        let convertedValue: number = parseInt(value, 10);

        let validNonNegativeNumber = (convertedValue.toString() === value) && (this.isNumberInRange(convertedValue, lowerLimit, upperLimit));

        return validNonNegativeNumber ? Common.InputState.Valid : Common.InputState.Invalid_NonPositiveNumber;
    }

    // This method will be deprecated. Please use isValidInteger instead.
    public static isValidNumber(value: string): boolean {
        if (!value) {
            return false;
        }

        let convertedValue: number = parseInt(value, 10);

        let validNumber: boolean = convertedValue.toString() === value;
        return validNumber;
    }

    public static isValidNonNegativeIntegerInRange(value: string, lowerLimit: number = 0, upperLimit: number, matchExact: boolean = false): Common.InputState {

        let convertedValue: number = this.getInteger(value);

        if (isNaN(convertedValue) || (matchExact && (convertedValue.toString() !== value))) {
            return Common.InputState.Invalid_NonPositiveNumber;
        }

        let validNonNegativeNumber = this.isNumberInRange(convertedValue, lowerLimit, upperLimit);

        return validNonNegativeNumber ? Common.InputState.Valid : Common.InputState.Invalid_NonPositiveNumber;
    }

    // checkIfPositive: flag to set negative integers as invalid
    // matchExact: flag to skip trailing zeros and decimals. will perform exact string match of the converted number and incoming string.
    public static isValidInteger(value: string, checkIfPositive?: boolean, matchExact?: boolean): boolean {

        let convertedValue: number = this.getInteger(value);

        if (isNaN(convertedValue)) {
            return false;
        }

        if (checkIfPositive && !Utils_Number.isPositiveNumber(value)) {
            return false;
        }

        if (matchExact && (convertedValue.toString() !== value)) {
            return false;
        }

        return true;
    }

    // returns true if the arguments are
    // both valid integers and equal or
    // both not valid integers,
    // false otherwise
    public static areIntegersEqual(value1: string, value2: string): boolean {
        let returnValue = false;
        let intValue1 = this.getInteger(value1);
        let intValue2 = this.getInteger(value2);

        return (isNaN(intValue1) && isNaN(intValue2)) || (intValue1 === intValue2);
    }

    public static getInteger(value: string): number {
        value = value ? value.trim() : null;

        if (!value || !this.validIntegerRegex.test(value)) {
            return NaN;
        }

        return parseInt(value, 10);
    }

    public static isValueInVariableFormat(value: string): boolean {

        if (value === null || value === undefined) {
            return false;
        }

        return value.match(this._variableFormatRegex) === null ? false : true;
    }

    public static getValueForCaseInsensitiveKey(properties: IDictionaryStringTo<string>, lookupKey: string): string {
        let keys = Object.keys(properties);

        keys.forEach((key: string) => {
            if (Utils_String.ignoreCaseComparer(key, lookupKey) === 0) {
                lookupKey = key;
                return false;
            }
        });

        return properties[lookupKey];
    }

    public static getUrlForExtension(contributionId: string, action?: any, queryParameters?: any, resolveContributionId?: boolean) {
        let pageContext = Context.getPageContext();

        let collectionUri: string = pageContext.webContext.collection.uri;
        let projectName: string = pageContext.webContext.project.name;
        let teamName = "";
        if (pageContext.navigation.topMostLevel === PlatformContracts.NavigationContextLevels.Team) {
            teamName = Context.getPageContext().webContext.team.name;
        }

        let baseUri = collectionUri + projectName + (!!teamName ? "/" + teamName : "");

        return this._getExtensionActionUrlFragment(baseUri, contributionId, action, queryParameters, resolveContributionId).replace("#", "?");
    }

    public static fixEmptyAndRecurringStringValuesInArray(values: string[]): string[] {
        // Ensure array
        values = values || [];

        // Skip recurring and empty values
        let map: IDictionaryStringTo<boolean> = {};
        let resultValues: string[] = [];
        values.forEach((value: string, index: number) => {
            let trimmedValue = value.trim();
            if (!!trimmedValue) {
                let valueLower = trimmedValue.toLowerCase();
                if (!map[valueLower]) {
                    map[valueLower] = true;
                    resultValues.push(trimmedValue);
                }
            }
        });

        return resultValues;
    }

    public static fixEmptyAndRecurringValuesInDelimitedString(values: string): string {
        let valuesArray = values.split(CommaSeparator);
        return (this.fixEmptyAndRecurringStringValuesInArray(valuesArray) || []).join(CommaSeparator);
    }

    public static isURLType(path): boolean {
        return this._absolutePathRegex.test(path);
    }

    public static getBoolValue(value: string): boolean {
        return (Utils_String.ignoreCaseComparer(value, "true") === 0) ? true : false;
    }

	/**
     * @brief returns all selected task keys in order of tasks in tasks list
     * @param selectedTaskKeys : keys in order in which tasks were selected
	 * @param taskListKeys : keys in order tasks are displayed in task list
     */
    public static getTaskInOrder(selectedTaskKeys: string[], taskListKeys: string[]): string[] {
        let keys: string[] = [];

        if (!taskListKeys) {
            return keys;
        }

        // Ordering task keys in selectedTaskKeys as in order of taskListKeys
        taskListKeys.forEach((taskKey) => {
            if (Utils_Array.contains(selectedTaskKeys, taskKey)) {
                keys.push(taskKey);
            }
        });

        return keys;
    }

    /**
     * @brief For given list of run types for a task, this methods return if the provided task group type supports it 
     */
    public static isTaskSupportedForTaskGroup(taskGroupType: TaskTypes.TaskGroupType, taskRunsOn: string[]): boolean {
        // logic taken from TFS.Tasks.TasksEditor.ts
        switch (taskGroupType) {
            case TaskTypes.TaskGroupType.RunOnAgent:
                return this._canTaskRunOnAgent(taskRunsOn);
            case TaskTypes.TaskGroupType.RunOnServer:
                return this.canTaskRunOnServer(taskRunsOn);
            case TaskTypes.TaskGroupType.RunOnMachineGroup:
                return this._canTaskRunOnMachineGroup(taskRunsOn);
            case TaskTypes.TaskGroupType.RunOnAny:
                return true;
            case TaskTypes.TaskGroupType.RunsOnServerGate:
                return this._canTaskRunOnServerGate(taskRunsOn);
        }

        return false;
    }

    public static getRefFriendlyName(refName: string) {
        if (refName) {
            if (refName && refName.indexOf(DtcUtils._headsRef) === 0) {
                return refName.substring(DtcUtils._headsRef.length);
            }
        }
        return refName;
    }

    public static getFullRefNameFromBranch(branch: string): string {
        return this._getFullRefName(branch, BranchFilterType.BranchName);
    }

    public static getFullRefNameFromTag(tag: string): string {
        return this._getFullRefName(tag, BranchFilterType.TagName);
    }

    public static isNullOrWhiteSpace(value: string): boolean {
        return !value || value.trim().length === 0;
    }

    public static isValidStringLength(value: string, maxLength: number): boolean {
        return !(this.isNullOrWhiteSpace(value) || (value.length > maxLength));
    }

    public static checkValidStringLengthErrorMessage(value: string, maxLength: number, outOfRangeErrorMessage: string): string {
        if (this.isNullOrWhiteSpace(value)) {
            return Resources.RequiredInputErrorMessage;
        }
        else if (value.length > maxLength) {
            return outOfRangeErrorMessage;
        }
        else {
            return Utils_String.empty;
        }
    }

    public static getRunThisTaskInputDefinition(): TaskInputDefinition {

        let runThisTask = <TaskInputDefinition>{
            defaultValue: Utils_String.empty,
            groupName: CONTROL_OPTIONS_GROUP,
            helpMarkDown: Resources.ConditionSelectorTooltip,
            label: Resources.ConditionSelectorLabelText,
            name: Constants.ControlOptionsInputName_ConditionSelector,
            options: {},
            properties: {},
            required: false,
            type: Common.INPUT_TYPE_PICK_LIST,
            visibleRule: undefined
        };

        runThisTask.options[TaskConditions.Succeeded] = Resources.ConditionSelector_AllSucceeded;
        runThisTask.options[TaskConditions.SucceededOrFailed] = AppContext.instance().isCapabilitySupported(AppCapability.Build) ?
            Resources.ConditionSelector_SucceededOrFailedInBuild : Resources.ConditionSelector_SucceededOrFailedInRelease;
        runThisTask.options[TaskConditions.Always] = AppContext.instance().isCapabilitySupported(AppCapability.Build) ?
            Resources.ConditionSelector_RunAlwaysInBuild : Resources.ConditionSelector_RunAlwaysInRelease;
        runThisTask.options[TaskConditions.Failed] = Resources.ConditionSelector_Failed;
        runThisTask.options[TaskConditions.Custom] = Resources.ConditionSelector_CustomCondition;

        return runThisTask;
    }

    public static getCustomConditionInputDefinition(): TaskInputDefinition {
        return <TaskInputDefinition>{
            defaultValue: Utils_String.empty,
            groupName: CONTROL_OPTIONS_GROUP,
            helpMarkDown: Resources.ConditionSelectorCustomConditionTooltip,
            label: Resources.ConditionSelectorCustomInputLabel,
            name: Constants.ControlOptionsInputName_ConditionEditor,
            options: {},
            properties: {},
            required: false,
            type: Common.INPUT_TYPE_STRING,
            visibleRule: Utils_String.format("{0} = {1}", Constants.ControlOptionsInputName_ConditionSelector, TaskConditions.Custom),
            validation: {} // by not sending any expression to validate, we are declaring that validation has to be performed, where input value acts as expression to validate
        };
    }

    public static getTaskConditionOptions(): string[] {
        return [
            TaskConditions.Succeeded,
            TaskConditions.SucceededOrFailed,
            TaskConditions.Always,
            TaskConditions.Failed,
            TaskConditions.Custom
        ];
    }

    public static canTaskRunOnServer(taskRunsOn: string[]): boolean {
        return (
            !!taskRunsOn
            && Utils_Array.contains<string>(taskRunsOn, TaskTypes.TaskRunsOnConstants.RunsOnServer, Utils_String.localeIgnoreCaseComparer)
        );
    }

    public static isFeatureFlagEnabled(featureFlag: string): boolean {
        return !!featureFlag && FeatureAvailabilityService.isFeatureEnabled(featureFlag, false);
    }

    public static isFeatureStateEnabled(featureId: string): boolean {
        return !!featureId && getService(FeatureManagementService).isFeatureEnabled(featureId);
    }

    public static registertShortcuts() {
        VSS.using(["VSS/Controls/KeyboardShortcuts"], (KeyboardShortcutsModule: typeof KeyboardShortcuts_LAZY_LOAD) => {
            let keyboardShortcutManager = KeyboardShortcutsModule.ShortcutManager.getInstance();

            // we are handling key inputs ourselves so registering shortcuts with dummy actions for display in shortcut dialog
            keyboardShortcutManager.registerShortcut(
                Resources.EditorShortKeyGroup,
                InputControlShortKeys.HelpShortKey,
                {
                    description: Resources.HelpShortKey,
                    action: () => { },
                    element: document.body,
                    allowPropagation: true // allowing propagation since these are dummy actions
                });

            if (AppContext.instance().isCapabilitySupported(AppCapability.LinkProcessParameters)) {
                keyboardShortcutManager.registerShortcut(
                    Resources.EditorShortKeyGroup,
                    InputControlShortKeys.LinkShortKey,
                    {
                        description: Resources.TaskInputLinkShortKey,
                        action: () => { },
                        element: document.body,
                        allowPropagation: true // allowing propagation since these are dummy actions
                    });
            }

            keyboardShortcutManager.registerShortcut(
                Resources.EditorShortKeyGroup,
                ItemListShortKeys.MoveSelectedItemUp,
                {
                    description: AppContext.instance().isCapabilitySupported(AppCapability.MultiplePhases) ? Resources.ShiftTaskOrPhaseUpShortKey : Resources.ShiftTaskUpShortKey,
                    action: () => { },
                    element: document.body,
                    allowPropagation: true // allowing propagation since these are dummy actions
                });

            keyboardShortcutManager.registerShortcut(
                Resources.EditorShortKeyGroup,
                ItemListShortKeys.MoveSelectedItemDown,
                {
                    description: AppContext.instance().isCapabilitySupported(AppCapability.MultiplePhases) ? Resources.ShiftTaskOrPhaseDownShortKey : Resources.ShiftTaskDownShortKey,
                    action: () => { },
                    element: document.body,
                    allowPropagation: true // allowing propagation since these are dummy actions
                });
        });
    }

    public static unregisterShortcuts() {
        VSS.using(["VSS/Controls/KeyboardShortcuts"], (KeyboardShortcutsModule: typeof KeyboardShortcuts_LAZY_LOAD) => {
            let keyboardShortcutManager = KeyboardShortcutsModule.ShortcutManager.getInstance();
            keyboardShortcutManager.unRegisterShortcut(Resources.EditorShortKeyGroup, InputControlShortKeys.HelpShortKey);
            if (AppContext.instance().isCapabilitySupported(AppCapability.LinkProcessParameters)) {
                keyboardShortcutManager.unRegisterShortcut(Resources.EditorShortKeyGroup, InputControlShortKeys.LinkShortKey);
            }
            keyboardShortcutManager.unRegisterShortcut(Resources.EditorShortKeyGroup, ItemListShortKeys.MoveSelectedItemUp);
            keyboardShortcutManager.unRegisterShortcut(Resources.EditorShortKeyGroup, ItemListShortKeys.MoveSelectedItemDown);
        });
    }

    public static prefetchModulesInAsyncMode(modules: string[]) {
        VSS.using(modules, () => { });
    }

    public static insertItemInList(insertTaskItemData: IInsertListItemData, itemList: Item[]): Item[] {
        if (insertTaskItemData && insertTaskItemData.sourceItem && insertTaskItemData.sourceItem.data) {
            let targetIndex = 0;
            if (insertTaskItemData.targetItem && insertTaskItemData.targetItem.data) {
                targetIndex = Utils_Array.findIndex(itemList, (item: Item) => {
                    return (item && item.getKey() === insertTaskItemData.targetItem.data.getKey());
                });
                if (!insertTaskItemData.shouldInsertBefore) {
                    targetIndex = targetIndex + 1;
                }
            }
            itemList.splice(targetIndex, 0, (insertTaskItemData.sourceItem.data as Item));
            return itemList;
        }
        return null;
    }

    public static removeInvalidRefNameCharacters(originalRefName: string): string {
        let validRefName: string = Utils_String.empty;
        if (originalRefName) {
            for (let index = 0; index < originalRefName.length; index++) {
                let c = originalRefName.charAt(index);
                if ((c >= "a" && c <= "z") ||
                    (c >= "A" && c <= "Z") ||
                    (c >= "0" && c <= "9") ||
                    (c === "_")) {
                    validRefName = validRefName + c;
                }
            }
        }

        return validRefName;
    }

    public static isValidRefName(originalRefName: string): boolean {
        if (originalRefName) {
            for (let index = 0; index < originalRefName.length; index++) {
                let c = originalRefName.charAt(index);
                if (!((c >= "a" && c <= "z") ||
                    (c >= "A" && c <= "Z") ||
                    (c >= "0" && c <= "9") ||
                    (c === "_"))) {
                    return false;
                }
            }
        }
        else {
            return false;
        }

        return true;
    }

    public static isSimplePicklistValueInvalidOption(properties: IDictionaryStringTo<string>, options: IDictionaryStringTo<string>, value: string): boolean {
        // for non editable simple picklist input, set value as invalid if selected value is not present in options
        if (!(properties
            && (
                (properties[Common.INPUT_TYPE_PROPERTY_MULTI_SELECT] && properties[Common.INPUT_TYPE_PROPERTY_MULTI_SELECT].toLowerCase() === Common.BOOLEAN_TRUE)
                || (properties[Common.INPUT_TYPE_PROPERTY_MULTI_SELECT_FLATLIST]
                    && properties[Common.INPUT_TYPE_PROPERTY_MULTI_SELECT_FLATLIST].toLowerCase() === Common.BOOLEAN_TRUE)
                || (properties[Common.INPUT_TYPE_PROPERTY_EDITABLE_OPTIONS] && properties[Common.INPUT_TYPE_PROPERTY_EDITABLE_OPTIONS].toLowerCase() === Common.BOOLEAN_TRUE)
            ))) {
            if (!DtcUtils.isValuePresentInOptions(options, value)) {
                return true;
            }
        }
        return false;
    }

    public static isValuePresentInOptions(options: IDictionaryStringTo<string>, value: string): boolean {
        // check for presence of supplied value in option keys as well as values
        if (!options) {
            return false;
        }

        value = value || Utils_String.empty;
        let isValuePresent = false;
        for (let key in options) {
            if (options.hasOwnProperty(key)) {
                if (Utils_String.localeIgnoreCaseComparer(key, value) === 0) {
                    isValuePresent = true;
                    break;
                }

                if (Utils_String.localeIgnoreCaseComparer(options[key], value) === 0) {
                    isValuePresent = true;
                    break;
                }
            }
        }

        return isValuePresent;
    }

    // This func resolves a proc param name to its value by parsing through all inputs
    public static resolveProcessParameterEndpoint(processParameters: ProcessParameters, procParamToResolve: string): string {
        let resolvedValue: string = null;

        if (processParameters && processParameters.inputs && processParameters.inputs.length > 0) {
            let matchedProcParam = Utils_Array.first(processParameters.inputs, (input: TaskInputDefinition) => {
                return (Utils_String.ignoreCaseComparer(input.name, procParamToResolve) === 0);
            });
            if (matchedProcParam) {
                resolvedValue = matchedProcParam.defaultValue;
            }
        }

        return resolvedValue;
    }

    // Converts timeoutInMinutes to IDuration object
    // maxDurationUnit, helps in converting to specific max duration unit, like days or hours or minutes.
    //  example, for 24-hours input, default output is 1-Day, if maxDurationUnit is Hours then output is 24-Hours
    //          if maxDurationUnit is Minutes, then output is 1440-Minutes
    public static convertMinutesToDuration(timeoutInMinutes: number, maxDurationUnit?: TimeUnits): IDuration {
        let duration: IDuration;
        maxDurationUnit = (maxDurationUnit === undefined
            || maxDurationUnit === null
            || maxDurationUnit > TimeUnits.Days)
            ? TimeUnits.Days : maxDurationUnit;
        if (maxDurationUnit < TimeUnits.Minutes) {
            maxDurationUnit = TimeUnits.Minutes;
        }

        if (timeoutInMinutes !== null && timeoutInMinutes !== undefined) {
            if (timeoutInMinutes % TimeConstants.MinutesInDay === 0 && maxDurationUnit >= TimeUnits.Days) {
                duration = { value: (timeoutInMinutes / TimeConstants.MinutesInDay).toString(), unit: TimeUnits.Days };
            }
            else if (timeoutInMinutes % TimeConstants.MinutesInHour === 0 && maxDurationUnit >= TimeUnits.Hours) {
                duration = { value: (timeoutInMinutes / TimeConstants.MinutesInHour).toString(), unit: TimeUnits.Hours };
            }
            else {
                duration = { value: timeoutInMinutes.toString(), unit: TimeUnits.Minutes };
            }
            return duration;
        }
    }

    /**
    * use convertMinutesToDuration
    * @deprecated
    * TODO --madhuv-- remove in M127
    */
    public static convertToDuration(timeoutInMinutes: number): IDuration {
        return DtcUtils.convertMinutesToDuration(timeoutInMinutes);
    }

    // Converts IDuration object to timeoutInMinutes
    public static convertToTimeoutInMinutes(duration: IDuration): string {
        if (!!duration && !!duration.value && duration.unit !== null && duration.unit !== undefined) {
            if (DtcUtils.isValidInteger(duration.value)) {
                const durationValue: number = DtcUtils.getInteger(duration.value);
                switch (duration.unit) {
                    case TimeUnits.Days:
                        return (durationValue * TimeConstants.MinutesInDay).toString();
                    case TimeUnits.Hours:
                        return (durationValue * TimeConstants.MinutesInHour).toString();
                    case TimeUnits.Minutes:
                        return durationValue.toString();
                    default:
                        return durationValue.toString();
                }
            }
            return duration.value;
        }
    }

    public static getDurationDiffInMinutes(endDuration: IDuration, startDuration: IDuration): number {
        let end = DtcUtils.convertDurationToNumberInMinutes(endDuration);
        let start = DtcUtils.convertDurationToNumberInMinutes(startDuration);

        if (isNaN(end) || isNaN(start)) {
            return NaN;
        }

        return end - start;
    }

    public static convertDurationToNumberInMinutes(duration: IDuration): number {
        return DtcUtils.getInteger(DtcUtils.convertToTimeoutInMinutes(duration));
    }

    // Converts minutes (if valid, otherwise default value) to IDuration object
    public static convertMinutesToValidDuration(
        valueInMinutes: number,
        minValueInMinutes: number,
        maxValueInMinutes: number,
        defaultValue: number = 0,
        defaultValueUnit: TimeUnits = TimeUnits.Minutes,
        maxDurationUnit?: TimeUnits): IDuration {

        defaultValue = (defaultValue === undefined || defaultValue === null) ? 0 : defaultValue;
        defaultValueUnit = (defaultValueUnit === undefined || defaultValueUnit === null) ? TimeUnits.Minutes : defaultValueUnit;
        let duration: IDuration = { value: defaultValue.toString(), unit: defaultValueUnit };

        if (valueInMinutes !== undefined
            && valueInMinutes !== null
            && DtcUtils.isNumberInRange(valueInMinutes, minValueInMinutes, maxValueInMinutes)) {
            if (valueInMinutes === 0) {
                duration = { value: valueInMinutes.toString(), unit: defaultValueUnit };
            }
            else {
                duration = DtcUtils.convertMinutesToDuration(valueInMinutes, maxDurationUnit);
            }
        }

        return duration;
    }

    public static isDurationInMinutesRange(duration: IDuration, minValueInMinutes: number, maxValueInMinutes: number): boolean {
        return DtcUtils.isNumberInRange(DtcUtils.convertDurationToNumberInMinutes(duration), minValueInMinutes, maxValueInMinutes);
    }

    /**   
    * use isDurationInMinutesRange
    * @deprecated
    * TODO --madhuv-- remove in M127
    */
    public static isDurationInRange(duration: IDuration, minValueInMinutes: number, maxValueInMinutes: number): boolean {
        return DtcUtils.isDurationInMinutesRange(duration, minValueInMinutes, maxValueInMinutes);
    }

    public static isRetryableError(statusCode: number): boolean {
        return !!statusCode && (statusCode === 502 || statusCode === 503 || statusCode === 504);
    }

    public static isTaskInputSearchable(input: TaskInputDefinition): boolean {
        let inputProperties = input.properties;
        const key = Common.Properties.IsSearchable;
        return !!inputProperties && !!inputProperties[key];
    }

    private static _resolveTaskInputValueByProcessParameters(origtaskInputValue: string, processParameterToValueMap: IDictionaryStringTo<string>, regExp: RegExp): IResolvedTaskInputValue {
        let taskInputValue: string = origtaskInputValue ? origtaskInputValue.toString().trim() : Utils_String.empty;
        let resolvedValue: IResolvedTaskInputValue = { actualValue: origtaskInputValue, resolvedValue: origtaskInputValue, isResolved: false };
        /*
           Looking for string that
           Starts with '$(' then some zero or more whitespaces, then prefix 'procparam' or 'parameters'(depending upon regexp passed), then '.'
           then variable name and then ends with ')'
    
           So task value should be like: $(  procparam.param1 ) or $(  parameters.param1 )
        */
       
        let regxMatches: RegExpExecArray = regExp.exec(taskInputValue);

        // regMatches array will contain 7 entries where first wil be complete string and rest individual matches. Index 5th will be process parameter name.
        if (!!regxMatches && regxMatches.length === 7) {
            let procParam: string = regxMatches[5] ? regxMatches[5].trim() : Utils_String.empty;

            if (procParam) {
                let procParamNameKey = procParam.toLowerCase();
                if (processParameterToValueMap.hasOwnProperty(procParamNameKey)) {
                    resolvedValue.isResolved = true;
                    resolvedValue.resolvedValue = processParameterToValueMap[procParamNameKey];
                    resolvedValue.boundProcessParameterName = procParam;
                }
            }
        }

        return resolvedValue;
    }

    private static _canTaskRunOnAgent(taskRunsOn: string[]): boolean {
        return (
            !taskRunsOn
            || taskRunsOn.length === 0
            || Utils_Array.contains<string>(taskRunsOn, TaskTypes.TaskRunsOnConstants.RunsOnAgent, Utils_String.localeIgnoreCaseComparer)
        );
    }

    private static _canTaskRunOnMachineGroup(taskRunsOn: string[]): boolean {
        return (
            !!taskRunsOn
            && (Utils_Array.contains<string>(taskRunsOn, TaskTypes.TaskRunsOnConstants.RunsOnMachineGroup, Utils_String.localeIgnoreCaseComparer)
                || Utils_Array.contains<string>(taskRunsOn, TaskTypes.TaskRunsOnConstants.RunsOnDeploymentGroup, Utils_String.localeIgnoreCaseComparer))
        );
    }

    private static _canTaskRunOnServerGate(taskRunsOn: string[]): boolean {
        return !!taskRunsOn && Utils_Array.contains<string>(taskRunsOn, TaskTypes.TaskRunsOnConstants.RunsOnServerGate, Utils_String.localeIgnoreCaseComparer);
    }

    private static _getExtensionActionUrlFragment(baseUri: string, contributionId: string, action: any, queryParameters?: any, resolveContributionId?: boolean): string {
        let fragementActionLink = Navigation_Service.getHistoryService().getFragmentActionLink(action, queryParameters);

        if (resolveContributionId) {
            const hub = getLocalService(HubsService).getHubById(contributionId);
            if (!!hub && !!hub.uri) {
                return hub.uri + fragementActionLink;
            }
        }
        return baseUri + this._getExtensionUrl(contributionId) + fragementActionLink;
    }

    private static _getExtensionUrl(contributionId: string): string {
        return `/_apps/hub/${contributionId}`;
    }

    private static _getFullRefName(value: string, type: BranchFilterType): string {
        let trimmedValue = this._getTrimmedValue(value);
        let fullRefName = trimmedValue;

        // If any branch/tags starts with refs and ends with * then use as it as, this will
        // allow to let user save something like "refs/pull/*" or "refs/tags/*"
        // and in all other case prepend refs/heads or refs/tags as per branch filter type
        if (trimmedValue.indexOf("refs/") !== 0 || trimmedValue.indexOf("*") < 0) {
            if (type === BranchFilterType.TagName) {
                fullRefName = this._getFullRefNameFromTag(trimmedValue);
            }
            else if (type === BranchFilterType.BranchName) {
                fullRefName = this._getFullRefNameFromBranch(trimmedValue);
            }
        }

        return fullRefName;
    }

    private static _getTrimmedValue(value: string): string {
        let trimmedValue = value || Utils_String.empty;
        trimmedValue = trimmedValue.trim();

        return trimmedValue;
    }

    private static _getFullRefNameFromBranch(branchName: string): string {
        return this._headsRef + branchName;
    }

    private static _getFullRefNameFromTag(tagName: string): string {
        return this._tagsRef + tagName;
    }

    private static _absolutePathRegex: RegExp = /^(?:\/|[A-Za-z]+:\/\/)/;
    private static _demandRegex: RegExp = /^([^\s]+)(\s+\-([^\s]+)\s+(.*))?/;
    private static _variableFormatRegex: RegExp = new RegExp("(^\\$\\()(\\s*)(.+)(\\)$)");
    public static oldProcParamRegex: RegExp = new RegExp("(^\\$\\()(\\s*)(" + ProcessParameterConstants.OldProcessParameterPrefix + ")(\\.)(.*)(\\)$)", "i");
    public static newProcParamRegex: RegExp = new RegExp("(^\\$\\()(\\s*)(" + ProcessParameterConstants.NewProcessParameterPrefix + ")(\\.)(.*)(\\)$)", "i");
    public static validIntegerRegex: RegExp = /^(\+|\-)?\d+(\.[0]*)?$/;
    private static _formatString: string = "{0}-{1}";
    private static _formatEqualsString: string = "{0} -equals {1}";
    private static _headsRef: string = "refs/heads/";
    private static _tagsRef: string = "refs/tags/";
}
