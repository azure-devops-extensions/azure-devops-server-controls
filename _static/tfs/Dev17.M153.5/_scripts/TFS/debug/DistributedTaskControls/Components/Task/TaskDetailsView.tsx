/// <reference types="react" />

import * as React from "react";

import * as ReactDOM from "react-dom";

import { ProcessParameterActionsCreator } from "DistributedTaskControls/Actions/ProcessParameterActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { AppCapability, AppContext } from "DistributedTaskControls/Common/AppContext";
import * as Common from "DistributedTaskControls/Common/Common";
import { CONTROL_OPTIONS_GROUP, TaskControlOptionsConstants as Constants } from "DistributedTaskControls/Common/Common";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import * as DtcBoolean from "DistributedTaskControls/Common/Primitives";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { TaskActionCreator } from "DistributedTaskControls/Components/Task/TaskActionsCreator";
import { TaskDetailsHeader } from "DistributedTaskControls/Components/Task/TaskDetailsHeader";
import { TaskDetailsEnvironmentVariables } from "DistributedTaskControls/Components/Task/TaskDetailsEnvironmentVariables";
import { TaskDetailsOutputGroup } from "DistributedTaskControls/Components/Task/TaskDetailsOutputGroup";
import { IInputActionDelegateProps } from "DistributedTaskControls/Components/Task/TaskInput";
import { TaskInputGroup } from "DistributedTaskControls/Components/Task/TaskInputGroup";
import { TaskStore } from "DistributedTaskControls/Components/Task/TaskStore";
import { TaskStoreUtility } from "DistributedTaskControls/Components/Task/TaskStoreUtility";
import { ProcessParametersLinkSettingsView } from "DistributedTaskControls/ControllerViews/ProcessParametersLinkSettingsView";
import { ProcessManagementCapabilities } from "DistributedTaskControls/ProcessManagement/Types";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { PickListInputUtility } from "DistributedTaskControls/SharedControls/InputControls/Components/PickListInputUtility";
import { ProcessParameterStore } from "DistributedTaskControls/Stores/ProcessParameterStore";

import { ITask } from "DistributedTasksCommon/TFS.Tasks.Types";
import * as TaskTypes from "DistributedTasksCommon/TFS.Tasks.Types";
import * as TaskUtils from "DistributedTasksCommon/TFS.Tasks.Utils";

import { TaskDefinition, TaskGroupDefinition } from "TFS/DistributedTask/Contracts";
import { TaskInputDefinitionBase as TaskInputDefinition } from "TFS/DistributedTaskCommon/Contracts";

import * as Diag from "VSS/Diag";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/Task/TaskDetailsView";

/**
 * @brief Properties for Task details controller view
 */
export interface ITaskDetailsViewProps extends ComponentBase.IProps {
    controllerInstanceId: string;
    taskInstance: ITask;
    processParametersNotSupported?: boolean;
    processInstanceId?: string;
}

export interface ITaskDetailsViewState {
    taskInputPerGroup: IDictionaryStringTo<TaskInputDefinition[]>;
}

/**
 * @brief Controller view for Task details section
 */
export class ControllerView extends ComponentBase.Component<ITaskDetailsViewProps, ITaskDetailsViewState> {

    public componentWillMount(): void {
        // When we render a new task, clear out any text selection so that the newly selected task will be in a "clean" state
        // Otherwise we can get some weird behaviors due to the DOM content swapping out while text is selected.
        const selection: Selection = document.getSelection() || window.getSelection();
        if (selection) {
            // Not all browsers (IE) support empty()
            if (selection.empty) {
                selection.empty();
            } else if (selection.removeAllRanges) {
                selection.removeAllRanges();
            }
        }

        this._procParamActioncreator = ActionCreatorManager.GetActionCreator<ProcessParameterActionsCreator>(ProcessParameterActionsCreator, this.props.processInstanceId);
        this._procParamStore = StoreManager.GetStore<ProcessParameterStore>(ProcessParameterStore, this.props.processInstanceId);
        this._actionCreator = ActionCreatorManager.GetActionCreator<TaskActionCreator>(TaskActionCreator, this.props.controllerInstanceId);
        this._store = StoreManager.GetStore<TaskStore>(TaskStore, this.props.controllerInstanceId);
        this._taskDefinition = this._store.getTaskDefinition();

        if (!this.state.taskInputPerGroup) {
            this.setState(this._getState());
        }
    }

    public componentDidMount(): void {
        this._store.addChangedListener(this._onStoreChanged);
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoreChanged);
    }

    public render(): JSX.Element {
        let elementName: string = Utils_String.format("{0} {1}", "dtc-task-details-view constrained-width", this.props.controllerInstanceId);

        let environmentVariablesGroupElement: JSX.Element = null;
        if (this._taskDefinition.showEnvironmentVariables) {
            environmentVariablesGroupElement =
                <TaskDetailsEnvironmentVariables
                    controllerInstanceId={this.props.controllerInstanceId}
                    isSectionAutoCollapsed={true}/>;
        }

        let outputVariableGroupElement: JSX.Element = null;
        if (FeatureAvailabilityService.isFeatureEnabled(Common.FeatureFlag_TaskShowOutputVariables, false)
            && this._store.canShowOutputVariables()) {
            outputVariableGroupElement =
                <TaskDetailsOutputGroup
                    controllerInstanceId={this.props.controllerInstanceId}
                    refName={this.props.taskInstance.refName}
                    taskDefinition={this._taskDefinition}
                    isSectionAutoCollapsed={true}
                />;
        }

        let taskMajorVersionSpec = TaskUtils.getMajorVersionSpec(this._taskDefinition.version);
        let taskVersionDisplaySpec = TaskUtils.isPreview(this._taskDefinition) ?
            Utils_String.format(Resources.Task_PreviewMajorVersionSpecFormat, taskMajorVersionSpec)
            : taskMajorVersionSpec;

        return (
            <div className={elementName} ref={(elem) => { this._elementInstance = elem; }}>

                <TaskDetailsHeader
                    controllerInstanceId={this.props.controllerInstanceId}
                    taskType={this._taskDefinition.friendlyName}
                    taskDescription={this._taskDefinition.description}
                    taskHelpMarkDown={this._taskDefinition.helpMarkDown}
                    taskReleaseNotes={this._taskDefinition.releaseNotes}
                    taskVersionDisplaySpec={taskVersionDisplaySpec}
                    taskVersions={this._store.getTaskVersionDisplaySpecs()}
                    onLinkSettingClicked={this._handleLinkSettingClicked}
                    processParametersNotSupported={this.props.processParametersNotSupported}
                    taskId={(this.props.taskInstance &&
                        this.props.taskInstance.task &&
                        (this.props.taskInstance.task.definitionType === TaskTypes.DefinitionType.metaTask)) ? this.props.taskInstance.task.id : ""} />

                <div className="task-details-body">
                    {
                        this._getGroupedInputList()
                    }
                </div>
                {environmentVariablesGroupElement}
                {outputVariableGroupElement}
            </div>
        );
    }

    public getInputActionDelegates(): IInputActionDelegateProps {
        return {
            linkToProcParam: this._handleLinkToProcessParameter,
            unlinkFromProcParam: this._handleUnlinkFromProcessParameter,
            additionalContent: this._getAdditionalContentForInputCallout
        } as IInputActionDelegateProps;
    }

    /**
     * @brief Returns the list of Input Groups.
     * @details The list is prepared in the following order: [Unparented Inputs, Grouped Inputs, Control Option Inputs]
     * @returns
     */
    private _getGroupedInputList(): JSX.Element[] {
        let inputGroups: JSX.Element[] = [];
        let controlOptionsGroupDefinition: TaskGroupDefinition = {
            displayName: Resources.ControlOptionsText,
            isExpanded: false,
            name: this._controlOptionsGroupName,
            tags: [],
            visibleRule: Utils_String.empty
        };

        // This sequence has to be maintained
        // 1. UnParented Inputs
        // 2. Grouped Inputs
        // 3. Control option Inputs

        inputGroups = this._getUpdatedGroupList(this._unparentedInputsGroupName, null, inputGroups);
        this._taskDefinition.groups.forEach((group: TaskGroupDefinition) => {
            inputGroups = this._getUpdatedGroupList(group.name, group, inputGroups);
        });

        if (this._store.canShowControlOptions()) {
            inputGroups = this._getUpdatedGroupList(this._controlOptionsGroupName, controlOptionsGroupDefinition, inputGroups);
        }

        return inputGroups;
    }

    /**
     * @brief Returns an Input Group based on group name
     * @param {string} groupName
     * @param {TaskGroupDefinition} groupDefinition
     * @param {JSX.Element[]} groupList
     * @returns
     */
    private _getUpdatedGroupList(groupName: string, groupDefinition: TaskGroupDefinition, groupList: JSX.Element[]): JSX.Element[] {
        let inputsPerGroup: TaskInputDefinition[] = this.state.taskInputPerGroup[groupName];
        let groupKey = groupName;

        let isVisible = true;

        if (groupDefinition && !!groupDefinition.visibleRule) {
            isVisible = this._store.isGroupOrInputVisible(groupDefinition.visibleRule);
        }

        // Check if the task section needs to be initially collapsed 
        const isSectionAutoCollapsed = TaskStoreUtility.isTaskSectionInitiallyCollapsed(groupDefinition);

        // Task major version is added to group key, to force refresh in case of version change.
        if (this._taskDefinition.version) {
            groupKey += this._taskDefinition.version.major;
        }

        // Before adding to the group list check whether group with that groupName exists or not.
        if (inputsPerGroup && isVisible) {
            groupList.push(<TaskInputGroup
                key={groupKey}
                controllerInstanceId={this.props.controllerInstanceId}
                groupDefinition={groupDefinition}
                inputs={inputsPerGroup}
                isSectionAutoCollapsed={isSectionAutoCollapsed}
                inputActionDelegates={this.getInputActionDelegates()}
                controllerStore={this._store}
                controllerActions={this._actionCreator}
                requiredEditCapability={ProcessManagementCapabilities.EditTaskInputs} />);
        }

        return groupList;
    }

    private _segregateTaskInputs(): IDictionaryStringTo<TaskInputDefinition[]> {
        let inputs: TaskInputDefinition[] = [];
        let taskInputPerGroup = {};

        inputs = inputs.concat(this._taskDefinition.inputs, this._getControlOptionsInputs());

        inputs.forEach((input: TaskInputDefinition) => {
            let groupName: string = (!!input.groupName) ? input.groupName : this._unparentedInputsGroupName;

            if (!taskInputPerGroup[groupName]) {
                taskInputPerGroup[groupName] = [];
            }

            taskInputPerGroup[groupName].push(input);
        });

        return taskInputPerGroup;
    }

    private _getControlOptionsInputs(): TaskInputDefinition[] {
        let controlOptions: TaskInputDefinition[] = [];
        let isMetatask: boolean = this._store.isMetaTask();
        let taskContext = this._store.getTaskContext();

        let enabled = {
            defaultValue: this.props.taskInstance.enabled.toString(),
            groupName: this._controlOptionsGroupName,
            helpMarkDown: isMetatask ? Resources.MetataskControlOptionsTooltipText : Utils_String.empty,
            label: Resources.Task_TaskEnabledText,
            name: Constants.ControlOptionsInputName_Enabled,
            options: {},
            properties: {},
            required: false,
            type: "boolean",
            visibleRule: Utils_String.empty
        } as TaskInputDefinition;

        let continueOnError = {
            defaultValue: this.props.taskInstance.continueOnError.toString(),
            groupName: this._controlOptionsGroupName,
            helpMarkDown: isMetatask ? Resources.MetataskControlOptionsTooltipText : Utils_String.empty,
            label: Resources.ContinueOnErrorText,
            name: Constants.ControlOptionsInputName_ContinueOnError,
            options: {},
            properties: {},
            required: false,
            type: "boolean",
            visibleRule: isMetatask.toString()
        } as TaskInputDefinition;

        let alwaysRun = {
            defaultValue: this.props.taskInstance.alwaysRun.toString(),
            groupName: this._controlOptionsGroupName,
            helpMarkDown: isMetatask ? Resources.MetataskControlOptionsTooltipText : Utils_String.empty,
            label: Resources.AlwaysRunText,
            name: Constants.ControlOptionsInputName_AlwaysRun,
            options: {},
            properties: {},
            required: false,
            type: "boolean",
            visibleRule: isMetatask.toString()
        } as TaskInputDefinition;

        let defaultTimeoutValue = this.props.taskInstance.timeoutInMinutes ? this.props.taskInstance.timeoutInMinutes.toString() : Utils_String.empty;
        if (this.props.taskInstance.overrideInputs
            && this.props.taskInstance.overrideInputs.hasOwnProperty(Common.TaskControlOptionsOverridInputConstants.TimeoutInMinutes)) {
            defaultTimeoutValue = this.props.taskInstance.overrideInputs[Common.TaskControlOptionsOverridInputConstants.TimeoutInMinutes];
        }

        let timeoutProperties: { [key: string]: string } = { isNonNegativeNumber: DtcBoolean.Boolean.trueString };
        if (AppContext.instance().isCapabilitySupported(AppCapability.VariablesForTasktimeout)) {
            timeoutProperties = { isVariableOrNonNegativeNumber: DtcBoolean.Boolean.trueString };
        }

        let timeOut = {
            defaultValue: defaultTimeoutValue,
            groupName: this._controlOptionsGroupName,
            helpMarkDown: Resources.TaskTimeoutTooltip,
            label: Resources.TimeoutInMinutes,
            name: Constants.ControlOptionsInputName_TimeOut,
            options: {},
            properties: timeoutProperties,
            required: true,
            type: "string",
            visibleRule: isMetatask.toString()
        } as TaskInputDefinition;

        controlOptions.push(enabled);

        // Control options for non-meta task
        if (!isMetatask) {

            if (!taskContext.donotShowContinueOnError) {
                controlOptions.push(continueOnError);
            }
            
            let isServerTask = DtcUtils.canTaskRunOnServer(this._taskDefinition.runsOn);
            let showTaskCondition = !isServerTask;

            if (showTaskCondition) {

                if (!taskContext.donotShowTimeout) {
                    controlOptions.push(timeOut);
                }

                let runThisTask = DtcUtils.getRunThisTaskInputDefinition();
                runThisTask.defaultValue = this.props.taskInstance.condition;

                let customCondition = DtcUtils.getCustomConditionInputDefinition();

                controlOptions.push(runThisTask);
                controlOptions.push(customCondition);
            }
            else {
                if (!taskContext.donotShowAlwaysRun) {
                    controlOptions.push(alwaysRun);
                }

                if (!taskContext.donotShowTimeout) {
                    controlOptions.push(timeOut);
                }
            }
        }

        return controlOptions;
    }

    private _getProcessParameterNameToInputMap(defnToFilterBy: TaskInputDefinition): IDictionaryStringTo<TaskInputDefinition> {
        let filteredParamsMap: IDictionaryStringTo<TaskInputDefinition> = {};

        let paramsInputs = this._procParamStore.getProcessParameters().inputs;

        if (paramsInputs && paramsInputs.length > 0) {

            paramsInputs.forEach((inputDefn: TaskInputDefinition) => {

                let shouldFilter = Utils_String.equals(inputDefn.type, defnToFilterBy.type, true);

                let inputType = DtcUtils.getTaskInputType(defnToFilterBy);

                // Validate options for radio and picklist.
                switch (inputType) {
                    case Common.INPUT_TYPE_RADIO:
                    case Common.INPUT_TYPE_PICK_LIST:
                        shouldFilter = shouldFilter && this._compareInputOptions(inputDefn.options, defnToFilterBy.options);
                        break;
                    default:
                        break;
                }

                if (shouldFilter) {
                    filteredParamsMap[Utils_String.format(Common.ProcessParameterConstants.NewProcessParameterVariableNameFormat, inputDefn.name)] = inputDefn;
                }

                Diag.logInfo(Utils_String.format("[TaskDetailsView]: DefnTofilterBy: {0}, Defn: {1}, shouldFilter: {2}", defnToFilterBy.name, inputDefn.name, shouldFilter));
            });
        }

        return filteredParamsMap;
    }

    private _compareInputOptions(options1: IDictionaryStringTo<string>, options2: IDictionaryStringTo<string>): boolean {
        if (!options1 && !options2) {
            return true;
        }

        if (options1 && options2 && Object.keys(options1).length === Object.keys(options2).length) {
            for (let key in options1) {
                if (!options2.hasOwnProperty(key) || !Utils_String.equals(options1[key], options2[key], true)) {
                    return false;
                }
            }
            return true;
        }

        return false;
    }

    private _handleLinkSettingClicked = () => {
        this._renderCreateLinkUnlinkProcessParametersView();
    }

    private _handleLinkToProcessParameter = (inputDefn: TaskInputDefinition) => {
        this._renderCreateLinkUnlinkProcessParametersView(inputDefn);
    }

    private _setProcParamDialogContainer(): void {
        if (!this._createAndLinkDialogContainer) {
            this._createAndLinkDialogContainer = document.createElement("div");
            this._elementInstance.appendChild(this._createAndLinkDialogContainer);
        }
    }

    private _renderCreateLinkUnlinkProcessParametersView(selectedInputDef: TaskInputDefinition = null) {
        this._setProcParamDialogContainer();

        //Render the new Controller view
        ReactDOM.render(React.createElement(ProcessParametersLinkSettingsView, {
            controllerInstanceId: this.props.controllerInstanceId,
            processInstanceId: this.props.processInstanceId,
            inputsList: this._taskDefinition.inputs,
            selectedInputDefinition: selectedInputDef,
            inputNameToValueMapping: this._store.getTaskInstance().inputs,
            inputNameToProcParam: this._store.getInputNameToProcessParameterNameMap(),
            dataSourceBindings: this._store.getDataSourceBindings(),
            sourceDefinitions: this._store.getSourceDefinitions(),
            onDialogClose: this._onDialogClose,
            linkToProcessParameter: this._linkToProcesParameter,
            unlinkFromProcessParameter: this._unLinkfromProcesParameter
        }), this._createAndLinkDialogContainer);
    }

    private _linkToProcesParameter = (inputName: string, processParameterName: string) => {
        this._actionCreator.linkToProcessParameter(inputName, processParameterName);
    }

    private _unLinkfromProcesParameter = (inputName: string) => {
        this._actionCreator.unlinkFromProcessParameter(inputName);
    }

    private _handleUnlinkFromProcessParameter = (inputDefn: TaskInputDefinition) => {
        let inputNameToProcessParameterNameMap = this._store.getInputNameToProcessParameterNameMap();
        const procParamName: string = (inputNameToProcessParameterNameMap && inputNameToProcessParameterNameMap[inputDefn.name])
            ? inputNameToProcessParameterNameMap[inputDefn.name]
            : null;

        //Checking if the map contains valid proc param name, then only raising actions for both proc param store and task store
        if (procParamName) {
            this._procParamActioncreator.unlinkProcessParameter(procParamName);
            this._actionCreator.unlinkFromProcessParameter(inputDefn.name);
        }
    }

    private _getAdditionalContentForInputCallout = (inputDefn: TaskInputDefinition): JSX.Element => {
        let procParamName = this._store.getProcessParameterName(inputDefn.name);
        let procParamDefn = this._procParamStore.getInputDefinition(procParamName);
        let procParamDisplayName = procParamDefn ? procParamDefn.label : Utils_String.empty;

        return (
            <div className="callout-additionalContent">
                <table>
                    <tbody>
                        <tr>
                            <td className="callout-additionalContent-icon">
                                <span className="bowtie-icon bowtie-link" />
                            </td>
                            <td>
                                {Utils_String.format(Resources.TaskInputLinkToProcessParameterCalloutText, procParamDisplayName,
                                    Utils_String.format(Common.ProcessParameterConstants.NewProcessParameterVariableNameFormat, procParamName))}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }

    private _onDialogSubmit = (oldInputDefn: TaskInputDefinition, newInputDefn: TaskInputDefinition) => {

        let options = PickListInputUtility.getPickListOptions(newInputDefn, this._store.getDataSourceBindings(), this._store.getSourceDefinitions());

        // Creating process parameter
        this._procParamActioncreator.createProcessParameter({
            input: newInputDefn,
            sourceDefinition: options.sourceDefintion,
            dataSourceBinding: options.dataSourceBinding
        });

        // Linking task input value with process parameter
        this._actionCreator.linkToProcessParameter(oldInputDefn.name, newInputDefn.name);
    }

    private _onDialogClose = () => {
        ReactDOM.unmountComponentAtNode(this._createAndLinkDialogContainer);
    }

    private _onStoreChanged = () => {
        let taskDefinition = this._store.getTaskDefinition();

        // Only trigger re-render if the task definition version has changed or if the visibility is changed
        if (!this._taskDefinition || !TaskStoreUtility.areVersionsEqual(taskDefinition.version, this._taskDefinition.version) || this._store.isVisibilityChanged()) {

            this._taskDefinition = taskDefinition;
            this.setState(this._getState());
        }
    }

    private _onContributionStoreChanged = () => {
        this.setState(this._getState());
    }

    private _getState(): ITaskDetailsViewState {
        return {
            taskInputPerGroup: this._segregateTaskInputs()
        };
    }

    private _procParamActioncreator: ProcessParameterActionsCreator;
    private _procParamStore: ProcessParameterStore;
    private _actionCreator: TaskActionCreator;
    private _store: TaskStore;
    private _controlOptionsGroupName: string = CONTROL_OPTIONS_GROUP;
    private _unparentedInputsGroupName: string = "unparented";
    private _taskDefinition: TaskDefinition;
    private _elementInstance: HTMLElement;
    private _createAndLinkDialogContainer: HTMLElement;
}
