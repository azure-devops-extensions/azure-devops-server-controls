/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Feature, Source, Telemetry } from "DistributedTaskControls/Common/Telemetry";
import * as YamlUtilities from "DistributedTaskControls/Common/YamlHelper";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { FlatViewDropdown } from "DistributedTaskControls/Components/FlatViewDropdown";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { Component as MarkdownRenderer } from "DistributedTaskControls/Components/MarkdownRenderer";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { TaskActionCreator } from "DistributedTaskControls/Components/Task/TaskActionsCreator";
import { TaskStore } from "DistributedTaskControls/Components/Task/TaskStore";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";
import { ProcessManagementStore } from "DistributedTaskControls/ProcessManagement/ProcessManagementStore";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { IOptions, Store as ItemSelectionStore } from "DistributedTaskControls/Stores/ItemSelectionStore";
import { IDefinitionVariable, IDefinitionVariableReference } from "DistributedTaskControls/Variables/Common/Types";
import { ProcessVariablesStore } from "DistributedTaskControls/Variables/ProcessVariables/DataStore";

import { CommandButton } from "OfficeFabric/Button";
import { Label } from "OfficeFabric/Label";
import { css } from "OfficeFabric/Utilities";

import * as VssContext from "VSS/Context";
import * as Diag from "VSS/Diag";
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/Task/TaskDetailsHeader";

export interface IHeaderProps extends ComponentBase.IProps {
    controllerInstanceId: string;
    taskType: string;
    taskDescription: string;
    taskHelpMarkDown: string;
    taskReleaseNotes: string;
    taskVersionDisplaySpec: string;
    taskId: string;
    taskVersions: string[];
    onLinkSettingClicked: () => void;
    processParametersNotSupported?: boolean;
}

export interface IHeaderState extends ComponentBase.IState {
    isTaskDisabled: boolean;
    displayName: string;
    version: string;
    isOnLatestMajorVersion: boolean;
    isPreview: boolean;
    isMultipleTasksSelected: boolean;
}

export class TaskDetailsHeader extends ComponentBase.Component<IHeaderProps, IHeaderState>{

    public componentWillMount(): void {
        this._domId = Utils_String.generateUID();

        this._store = StoreManager.GetStore<TaskStore>(TaskStore, this.props.controllerInstanceId);
        this._actionCreator = ActionCreatorManager.GetActionCreator<TaskActionCreator>(TaskActionCreator, this.props.controllerInstanceId);

        const processInstanceId = this._store.getTaskContext().processInstanceId;
        this._processManagementStore = StoreManager.GetStore<ProcessManagementStore>(ProcessManagementStore, processInstanceId);

        this._itemSelectionStore = StoreManager.CreateStore<ItemSelectionStore, IOptions>(
            ItemSelectionStore, processInstanceId,
            {
                defaultSelection: []
            });

        this._setState();
    }

    public componentDidMount(): void {
        this._store.addChangedListener(this._setState);
        this._processManagementStore.addChangedListener(this._setState);
        this._itemSelectionStore.addChangedListener(this._setState);
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._setState);
        this._processManagementStore.removeChangedListener(this._setState);
        this._itemSelectionStore.removeChangedListener(this._setState);
    }

    public render(): JSX.Element {
        let calloutContent: ICalloutContentProps = {
            calloutDescription: this.props.taskDescription,
            calloutMarkdown: this.props.taskHelpMarkDown,
            calloutAdditionalContent: (() => { return this._getWhatsNewContent(this.props.taskVersionDisplaySpec, this.props.taskReleaseNotes); })
        };

        let latestVersionFlagCalloutContent: ICalloutContentProps = {
            calloutAdditionalContent: (() => {
                return this._getWhatsNewContent(this._store.getLatestMajorTaskVersionDisplaySpec(),
                    this._store.getLatestMajorTaskVersionReleaseNotes(), Resources.Task_VersionSelectorHelp);
            })
        };

        let taskName = this.props.taskType;
        if (!!this.state.isTaskDisabled) {
            taskName = Utils_String.format("{0} ({1})", taskName, Resources.DisabledText);
        }

        if (this.state.isPreview) {
            taskName = Utils_String.format("{0} ({1})", taskName, Resources.PreviewText);
        }

        return (
            <div className="task-details-header">
                <div className="heading-row">
                    <div className="task-type-label-container">
                        <TooltipIfOverflow tooltip={taskName} targetElementClassName="task-type-label">
                            <label className="task-type-label" aria-disabled={this.state.isTaskDisabled}>
                                {taskName}
                            </label>
                        </TooltipIfOverflow>
                    </div>
                    <InfoButton cssClass="task-type-info"
                        calloutContent={calloutContent}
                        iconStyle="task-type-info-icon"
                        isIconFocusable={true}
                        iconAriaLabel={Utils_String.format(Resources.InfoCalloutAriaLabel, taskName)} />

                    <div className="float-right">
                        {/*Link settings button*/}
                        {this._isLinkSettingsVisible() &&
                            <CommandButton
                                className={css("remove-linkSettings-button", "fabric-style-overrides", "linkSettings-button")}
                                ariaLabel={Resources.LinkSettings}
                                iconProps={{ iconName: "Link" }}
                                ariaDescription={Resources.LinkSettingsDescription}
                                onClick={this._onLinkSettingClicked}>
                                {Resources.LinkSettings}
                            </CommandButton>
                        }

                        {/*View as YAML button*/}
                        {this._isYAMLFeatureVisible() &&
                            <CommandButton
                                className={css("remove-linkSettings-button", "fabric-style-overrides", "linkSettings-button")}
                                ariaLabel={Resources.MenuViewAsYaml}
                                iconProps={{ iconName: "Paste" }}
                                disabled={!this._store.isValid()}
                                ariaDescription={Resources.ViewAsYamlDescription}
                                onClick={this._onViewYAMLClicked} >
                                {Resources.MenuViewAsYaml}
                            </CommandButton>
                        }

                        {/*Remove task button*/}
                        {this._store.canShowLinkOptions() && this._processManagementStore.canEditTasks() &&
                            <CommandButton
                                className={css("remove-linkSettings-button", "fabric-style-overrides", "remove-task-button")}
                                ariaDescription={Resources.RemoveTaskDescription}
                                ariaLabel={Resources.RemoveText}
                                iconProps={{ iconName: "Cancel" }}
                                onClick={this._onRemove}>
                                {Resources.RemoveText}
                            </CommandButton>
                        }
                    </div>

                    {this._isVersionsSettingsVisible() &&
                        <span className="task-version-span">
                            {!this.state.isOnLatestMajorVersion &&
                                <InfoButton
                                    calloutContent={latestVersionFlagCalloutContent}
                                    cssClass="task-version-upsell"
                                    iconName="Flag"
                                    iconStyle="task-version-upsell-icon"
                                    isIconFocusable={true}
                                    iconAriaLabel={Resources.NewerVersionAvailableFlagAriaLabel} />
                            }
                            <Label className="task-version-dropdown-label">{Resources.Task_VersionSelectorLabel}</Label>
                            <span className="task-version-dropdown">
                                <FlatViewDropdown
                                    conditions={this.props.taskVersions}
                                    selectedCondition={this.state.version}
                                    rowSelected={true}
                                    onValueChanged={this._onVersionChanged}
                                    ariaDescription={Resources.SelectVersionDescription}
                                    ariaLabel={Resources.Task_VersionSelectorLabel}
                                    isDisabled={!this._processManagementStore.canEditTasks()} />
                            </span>
                        </span>
                    }
                </div>
                <div className="task-name">
                    <StringInputComponent
                        label={Resources.DisplayNameText}
                        value={this.state.displayName}
                        onValueChanged={this._onNameChanged}
                        required={true}
                        getErrorMessage={this._onGetErrorMessage}
                        deferredValidationTime={500}
                        disabled={!this._processManagementStore.canEditTaskInputs()} />
                </div>
            </div>
        );
    }

    private _isYAMLFeatureVisible(): boolean {
        // if YAML FF is removed, then also we need to honor the option provided, so doing check here
        // rather in the isYamlFeatureEnabled() function
        return this._store.canShowYAMLFeature() && YamlUtilities.isYamlFeatureEnabled() && !this.state.isMultipleTasksSelected;
    }

    private _isVersionsSettingsVisible(): boolean {
        // not showing versions option if versions option is false or task definition is not valid
        return this._store.canShowVersions() && this._store.isTaskDefinitionValid();
    }

    private _isLinkSettingsVisible(): boolean {
        // not showing button if link option is false or process param not supported
        // or if it is a Task Group or if task does not exist
        return this._store.canShowLinkOptions()
            && !this._store.isMetaTask()
            && this._store.isTaskDefinitionValid()
            && !this.props.processParametersNotSupported
            && this._processManagementStore.canEditProcess();
    }

    private _getTaskDisplayNameElementId(): string {
        return "task-display-name-" + this._domId;
    }

    private _onNameChanged = (newName: string) => {
        this._actionCreator.renameTask(newName);
    }

    private _onGetErrorMessage = (newName: string): string => {
         if (!(newName && newName.trim())) {
             this._actionCreator.renameTask(newName);
             return Resources.RequiredInputErrorMessage;
         }
         return Utils_String.empty;
    }

    private _onVersionChanged = (version: string) => {
        let versionSpec = this._store.getTaskVersionSpec(version);
        this._actionCreator.updateTaskDefinition(this._store.getTaskInstanceId(), versionSpec);
    }

    private _onRemove = (event) => {
        if (!!this._store.getTaskContext().onRemoveDelegate) {
            this._store.getTaskContext().onRemoveDelegate(this.props.controllerInstanceId);
            announce(Resources.TaskRemoved, true);
            Telemetry.instance().publishEvent(Feature.RemoveTask, {}, Source.CommandButton);
        } else {
            Diag.logError("[TaskDetailsHeader._onRemove]: onRemoveDelegate has not been initialized.");
        }
    }

    private _onLinkSettingClicked = (event) => {
        if (!!this.props.onLinkSettingClicked) {
            this.props.onLinkSettingClicked();
        } else {
            Diag.logError("[TaskDetailsHeader._onLinkSettingClicked]: onLinkSettingClicked method has not been initialized.");
        }
    }

    private _onViewYAMLClicked = (event) => {
        let inputs = this._store.getInputToValueMap();
        let taskDefinition = this._store.getTaskDefinition();
        let taskRefName = this._store.getTaskRefName();
        let taskVersion = this._store.getTaskVersion();
        let enabled = !this._store.isDisabled();
        const taskInstance = this._store.getTaskInstance();
        const continueOnError = taskInstance.continueOnError;
        const condition = taskInstance.condition;
        const timeout = this._store.getTaskTimeoutInMinutes();
        const taskDisplayName = this._store.getTaskDisplayName();
        let taskInputsStates: IDictionaryStringTo<boolean> = {};
        Object.keys(inputs).forEach((key) => {
            taskInputsStates[key] = this._store.getTaskInputState(key).isHidden();
        });
        const processParameters = this._store.getProcessParameterToValueMap();
        const processVariablesStore = StoreManager.GetStore<ProcessVariablesStore>(ProcessVariablesStore);
        const variables = processVariablesStore.getVariableList();
        const environmentVariables = taskInstance.environment;
        let variablesLookup: IDictionaryStringTo<IDefinitionVariable> = {};
        variables.forEach((variable: IDefinitionVariableReference) => {
            variablesLookup[variable.name] = variable.variable;
        });
        YamlUtilities.handleViewTaskAsYaml(inputs, taskDefinition, taskRefName, taskDisplayName, taskVersion, enabled, continueOnError, condition, timeout, taskInputsStates, variablesLookup, processParameters, environmentVariables);
    }

    private _setState = () => {
        const selectedTasks = this._itemSelectionStore.getState().selectedItems;
        this.setState({
            isTaskDisabled: this._store.isDisabled(),
            displayName: this._store.getTaskDisplayName(),
            version: this._store.getTaskVersionDisplaySpec(),
            isOnLatestMajorVersion: this._store.isTaskOnLatestMajorVersion(),
            isPreview: this._store.isPreview(),
            isMultipleTasksSelected: selectedTasks && selectedTasks.length > 1
        });
    }

    private _getWhatsNewContent(taskVersionDisplaySpec: string, taskReleaseNotes: string, heading?: string): JSX.Element {
        let additionalContent: JSX.Element = (
            <div>
                {heading && (<div>{heading}</div>)}
                {heading && taskReleaseNotes && (<br />)}
                {taskReleaseNotes && (
                    <div>
                        <div className="version-info-whats-new"> {Utils_String.format(Resources.WhatsNewInVersionText, taskVersionDisplaySpec)} </div >
                        <MarkdownRenderer markdown={taskReleaseNotes} />
                    </div>
                )}
                {this.props.taskId && this._getTaskGroupLink(this.props.taskId, this.props.taskType)}
            </div>
        );

        return additionalContent;
    }

    private _getTaskGroupLink = (id: string, name: string): JSX.Element => {

        let webContext = VssContext.getDefaultWebContext();
        let taskGroupUrl = Utils_String.format(TaskDetailsHeader._taskGroupUrl, webContext.collection.uri + webContext.project.name, id);

        return (<p>
                    <span className="callout-taskgroup-link">
                        {Resources.View}
                        <SafeLink href={taskGroupUrl} target="_blank">{name}</SafeLink>
                    </span>
                </p>);
    }

    private _domId: string;
    private _store: TaskStore;
    private _itemSelectionStore: ItemSelectionStore;
    private _actionCreator: TaskActionCreator;
    private _processManagementStore: ProcessManagementStore;
    private static _taskGroupUrl = "{0}/_taskgroups?_a=properties&taskGroupId={1}";
}
