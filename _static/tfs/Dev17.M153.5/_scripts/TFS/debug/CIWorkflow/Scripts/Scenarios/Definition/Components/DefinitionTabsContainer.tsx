/// <reference types="react" />

import * as React from "react";

import { BuildSecurity, BuildPermissions } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import { BuildLinks } from "Build.Common/Scripts/Linking";
import { getDefinitionSecurityToken } from "Build.Common/Scripts/Security";

import { DefaultPath } from "CIWorkflow/Scripts/Common/PathUtils";
import { IDefinitionInfo, DefinitionUtils } from "CIWorkflow/Scripts/Common/DefinitionUtils";
import { SecurityUtils } from "CIWorkflow/Scripts/Common/SecurityUtils";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { BuildDefinitionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActionsCreator";
import { TabKeyConstants } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import * as HistoryTabAsync from "CIWorkflow/Scripts/Scenarios/Definition/Components/HistoryTab";
import { Component as SaveDefinitionDialog } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SaveDefinitionDialog";
import * as TriggersTabAsync from "CIWorkflow/Scripts/Scenarios/Definition/Components/Triggers";
import { YamlProcessItemOverview } from "CIWorkflow/Scripts/Scenarios/Definition/Components/YamlProcessItemOverview";
import * as OptionsTabAsync from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/OptionsTabControllerView";
import * as RetentionTabAsync from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/RetentionTabControllerView";
import { TasksTabControllerView } from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/TasksTabControllerView";
import * as VariablesTabAsync from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/VariablesTabControllerView";
import { Store } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Base";
import { BuildDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/BuildDefinitionStore";
import { CoreDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/CoreDefinitionStore";
import { SaveDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SaveDefinitionStore";
import { QueueBuildDialog, QueueDialogSource, getRuntimeVariables } from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/QueueBuildDialog";
import { YamlStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/YamlStore";
import { YamlDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/YamlDefinitionStore";
import { Utilities } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/Utilities";
import { IPermissionsStore, getPermissionsStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Permissions";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { HelpLinks } from "DistributedTaskControls/Common/Common";
import { UrlUtilities } from "DistributedTaskControls/Common/UrlUtilities";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { ConfirmationDialog } from "DistributedTaskControls/Components/ConfirmationDialog";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { ContainerTabPanel } from "DistributedTaskControls/SharedControls/TabPanel/ContainerTabPanel";
import { AgentsSource } from "DistributedTaskControls/Sources/AgentsSource";
import { VariableList } from "DistributedTaskControls/Variables/Common/Types";

import { TaskAgentQueue } from "TFS/DistributedTask/Contracts";

import { HubHeader } from "VSSUI/HubHeader";
import { VssIconType } from "VSSUI/Components/VssIcon/VssIcon.Props";

import { getDefaultWebContext } from "VSS/Context";
import { PermissionEvaluation } from "VSS/Security/Contracts";

import {
    IVssHubViewState,
    VssHubViewState
} from "VSSPreview/Utilities/VssHubViewState";

import { BuildDefinition, DefinitionQuality } from "TFS/Build/Contracts";

import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

import { IPivotBarAction, PivotBarItem } from 'VSSUI/PivotBar';
import { Hub } from "VSSUI/Hub";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/DefinitionTabsContainer";

const VariableTabItem = getAsyncLoadedComponent(
    ["CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/VariablesTabControllerView"],
    (m: typeof VariablesTabAsync) => m.VariablesTabControllerView,
    () => <LoadingComponent className="tab-loading-component" />);

const TriggersTabItem = getAsyncLoadedComponent(
    ["CIWorkflow/Scripts/Scenarios/Definition/Components/Triggers"],
    (m: typeof TriggersTabAsync) => m.TriggersTab,
    () => <LoadingComponent className="tab-loading-component" />);

const HistoryTabItem = getAsyncLoadedComponent(
    ["CIWorkflow/Scripts/Scenarios/Definition/Components/HistoryTab"],
    (m: typeof HistoryTabAsync) => m.HistoryTab,
    () => <LoadingComponent className="tab-loading-component" />);

const OptionsTabItem = getAsyncLoadedComponent(
    ["CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/OptionsTabControllerView"],
    (m: typeof OptionsTabAsync) => m.OptionsTabControllerView,
    () => <LoadingComponent className="tab-loading-component" />);

const RetentionTabItem = getAsyncLoadedComponent(
    ["CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/RetentionTabControllerView"],
    (m: typeof RetentionTabAsync) => m.RetentionTabControllerView,
    () => <LoadingComponent className="tab-loading-component" />);

export interface IDefinitionTabsContainerState extends Base.IState {
    selectedTabItemKey: string;
    tabIsValidFlags: IDictionaryStringTo<boolean>;
    tabKeys: string[];
    buildDefinition: BuildDefinition;
    showSaveDefinitionDialog: boolean;
    isYaml: boolean;
    isSaveEnabled: boolean;
    isSaveAsDraftButtonEnabled: boolean;
    isDiscardButtonEnabled: boolean;
    showDiscardConfirmationDialog: boolean;
    showDraftReplacementConfirmationDialog: boolean;
    isSummaryButtonEnabled: boolean;
    isBuildQueueButtonEnabled: boolean;
    isPublishButtonEnabled: boolean;
    isSetSecurityEnabled: boolean;
    isReadOnly: boolean;
    hideFolderPicker: boolean;
}

export interface IDefinitionTabsContainerProps extends Base.IProps {
    quality?: DefinitionQuality;
}

export enum DialogBoxTypes {
    Save = 0,
    SaveDraft,
    PublishDraft
}

export const colonStringConst: string = " : ";

export class TitleBarButtonKeys {
    public static saveButtonKey: string = "save-button";
    public static saveAndQueueDropdownKey: string = "save-and-queue-dropdown";
    public static saveAndQueueButtonKey: string = "save-and-queue-button";
    public static saveAsDraftButtonKey: string = "save-as-draft-button";
    public static saveDraftAndQueueDropdownKey: string = "save-draft-and-queue-dropdown";
    public static saveDraftAndQueueButtonKey: string = "save-draft-and-queue-button";
    public static saveDraftButtonKey: string = "save-draft-button";
    public static publishDraftButtonKey: string = "publish-draft-button";
    public static queueButtonKey: string = "queue-button";
    public static protectButtonKey: string = "protect-button";
    public static helpButtonKey: string = "help-button";
    public static undoButtonKey: string = "undo-button";
    public static summaryButtonKey: string = "summary-button";
}

export class DefinitionTabsContainer extends Base.Component<IDefinitionTabsContainerProps, IDefinitionTabsContainerState> {
    private _buildDefinitionStore: BuildDefinitionStore;
    private _coreDefinitionStore: CoreDefinitionStore;
    private _saveDefinitionStore: SaveDefinitionStore;
    private _yamlStore: YamlStore;
    private _hubViewState: IVssHubViewState;
    private _showDiscardConfirmationDialog: boolean;
    private _showDraftReplacementConfirmationDialog: boolean;
    private _permissionsStore: IPermissionsStore;

    constructor(props: IDefinitionTabsContainerProps) {
        super(props);
        this._buildDefinitionStore = StoreManager.GetStore<BuildDefinitionStore>(BuildDefinitionStore);
        this._yamlStore = StoreManager.GetStore<YamlStore>(YamlStore);
        this._coreDefinitionStore = StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore);
        this._saveDefinitionStore = StoreManager.GetStore<SaveDefinitionStore>(SaveDefinitionStore);
        this._permissionsStore = getPermissionsStore();

        this._hubViewState = new VssHubViewState({
            defaultPivot: TabKeyConstants.Tasks
        });
    }

    public componentWillMount(): void {
        this.setState(this._getState());
        this._buildDefinitionStore.getStoreList().forEach((store: Store) => {
            store.addChangedListener(this._onChange);
        });

        this._saveDefinitionStore.addChangedListener(this._onChange);
        this._yamlStore.addChangedListener(this._isYamlStateChanged);

        this._permissionsStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        this._buildDefinitionStore.getStoreList().forEach((store: Store) => {
            store.removeChangedListener(this._onChange);
        });

        this._saveDefinitionStore.removeChangedListener(this._onChange);
        this._yamlStore.removeChangedListener(this._isYamlStateChanged);

        this._permissionsStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        const buildDefinition = this.state.buildDefinition;
        const saveDefinitionDialogElement: JSX.Element = this._getSaveDialog(DefinitionUtils.isDraftDefinition(this.props.quality));

        return <Hub
            className="ci-view-hub-content"
            hubViewState={this._hubViewState}
            commands={this._getHubCommands()}>

            <HubHeader />

            {saveDefinitionDialogElement}

            <ConfirmationDialog
                title={Resources.ConfirmDiscardDialogText}
                subText={Resources.ConfirmDiscardText}
                onConfirm={this._discardChanges}
                showDialog={this.state.showDiscardConfirmationDialog}
                onCancel={this._onConfirmDialogCancel}
            />

            <ConfirmationDialog
                title={Resources.ConfirmSave}
                subText={Resources.DraftConfirmationSubText}
                onConfirm={this._replaceDraft}
                showDialog={this.state.showDraftReplacementConfirmationDialog}
                onCancel={this._onConfirmDialogCancel}
            />
            {this._getPivotItems()}
        </Hub>;
    }

    private _onDialogPublishClick = (comment: string, saveLocation: string) => {
        let fullComment: string = Resources.DraftPublished;

        // This will make the comment in the format {Draft Published : <Your comment from comment box>
        if (comment !== "") {
            fullComment += colonStringConst + comment;
        }

        const buildDefinition = this._buildDefinitionStore.getBuildDefinition();

        // Calling the Publish logic
        ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator).publishDraft(buildDefinition, fullComment);
        // Closing the dialog box
        ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator).closeSaveDialog();

        Telemetry.instance().publishEvent(Feature.PublishDraftBuildDefinition, { "buildDefinitionId": buildDefinition.id });
    }

    private _onSaveAsDraftClick = (): void => {
        const buildDefinition: BuildDefinition = this._setBuildDefinitionSaveData("");

        const info: IDefinitionInfo = { id: buildDefinition.id, rev: buildDefinition.revision };
        // Checking if any Draft info exists for this Parent Id
        if (buildDefinition.drafts && buildDefinition.drafts.length > 0) {
            // Already a Draft exists, Confirm first and then replace it
            this._showDraftReplacementConfirmationDialog = true;
            this._onChange();
        }
        else {
            ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator)
                .saveBuildDefinitionAsDraft(buildDefinition, info).then((draftInfo: IDefinitionInfo) => {
                    Telemetry.instance().publishEvent(Feature.SaveAsDraftBuildDefinition, { "buildDefinitionId": buildDefinition.id });
                });
        }
    }

    private _getSaveDialog(isDraft: boolean): JSX.Element {
        let dialogOnSave: (comment: string, saveLocation: string) => void = this._onDialogSaveClick;

        // Setting these as null so that default values are picked up in the SaveDefinitionDialogBox component
        let dialogTitleText: string = null;
        let dialogOkButtonText: string = null;

        // Setting the dialog type as Save by default
        let dialogType = DialogBoxTypes.Save;

        const saveLocation: string = this._buildDefinitionStore.getBuildDefinition().path;

        // Checking if Save/Save Draft scenario
        if (isDraft) {
            if (this.state.isSaveEnabled) {
                dialogType = DialogBoxTypes.SaveDraft;
            }
            else {
                dialogType = DialogBoxTypes.PublishDraft;
            }
        }

        // Setting props, to be used in Save Dialog box differently for different dialog types
        switch (dialogType) {
            case DialogBoxTypes.Save:
                // Not setting title and ok button text to use the default values for Save Dialog
                dialogOnSave = this._onDialogSaveClick;
                break;
            case DialogBoxTypes.SaveDraft:
                // Not setting the ok button text for Save draft Dialog
                dialogTitleText = Resources.SaveDraft;
                dialogOnSave = this._onDialogSaveClick;
                break;
            case DialogBoxTypes.PublishDraft:
                dialogTitleText = Resources.PublishDraft;
                dialogOnSave = this._onDialogPublishClick;
                dialogOkButtonText = Resources.Publish;
                break;
        }

        return (
            <SaveDefinitionDialog
                showDialog={this.state.showSaveDefinitionDialog}
                onCloseDialog={this._onCloseSaveDialog}
                onSave={dialogOnSave}
                hideFolderPicker={this.state.hideFolderPicker}
                path={saveLocation}
                titleText={dialogTitleText}
                okButtonText={dialogOkButtonText} />
        );
    }

    private _onDialogSaveClick = (comment: string, saveLocation: string) => {
        const buildDefinition: BuildDefinition = this._setBuildDefinitionSaveData(comment, saveLocation);
        this._saveBuildDefinition(buildDefinition);
        ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator).closeSaveDialog();
    }

    private _getState(): IDefinitionTabsContainerState {
        const coreDefinitionState = this._coreDefinitionStore.getState();
        const saveDialogState = this._saveDefinitionStore.getState().showDialog;
        const isExistingDefinition: boolean = coreDefinitionState.id > 0;
        const isDraft: boolean = this.props && DefinitionUtils.isDraftDefinition(this.props.quality);

        const projectId = getDefaultWebContext().project.id;
        let token: string = projectId;
        if (isExistingDefinition || (coreDefinitionState.folderPath && coreDefinitionState.folderPath !== DefaultPath)) {
            token = getDefinitionSecurityToken(projectId, coreDefinitionState.folderPath, coreDefinitionState.id);
        }

        const isReadOnly = !this._permissionsStore.hasPermission(token, BuildPermissions.EditBuildDefinition);
        const isYaml = this._yamlStore.getState().isYaml;

        return {
            selectedTabItemKey: TabKeyConstants.Tasks,
            tabIsValidFlags: this._getTabIsValidFlags(),
            tabKeys: this._getTabKeys(this.props.quality, isYaml),
            buildDefinition: this._buildDefinitionStore.getBuildDefinition(),
            showSaveDefinitionDialog: saveDialogState,
            hideFolderPicker: isExistingDefinition,
            isYaml: isYaml,
            isSaveEnabled: !isReadOnly && this._buildDefinitionStore.isDirty() && this._buildDefinitionStore.isValid(),
            isSaveAsDraftButtonEnabled: !isReadOnly && isExistingDefinition && !isDraft && this._buildDefinitionStore.isDirty() && this._buildDefinitionStore.isValid(),
            isDiscardButtonEnabled: this._buildDefinitionStore.isDirty() && isExistingDefinition,
            isBuildQueueButtonEnabled: this._buildDefinitionStore.isValid() && !this._buildDefinitionStore.isDirty() && isExistingDefinition,
            isPublishButtonEnabled: !isReadOnly && isDraft && this._buildDefinitionStore.isValid() && !this._buildDefinitionStore.isDirty(),
            isSummaryButtonEnabled: isExistingDefinition,
            isSetSecurityEnabled: isExistingDefinition,
            isReadOnly: isReadOnly,
            showDiscardConfirmationDialog: this._showDiscardConfirmationDialog,
            showDraftReplacementConfirmationDialog: this._showDraftReplacementConfirmationDialog,
        };
    }

    private _getHubCommands(): IPivotBarAction[] {
        const saveAndQueueActionName = !DefinitionUtils.isDraftDefinition(this.props.quality) ? Resources.SaveAndQueueBuild : Resources.SaveDraftAndQueueBuild;
        const saveAndQueueActionKey = !DefinitionUtils.isDraftDefinition(this.props.quality) ? TitleBarButtonKeys.saveAndQueueButtonKey : TitleBarButtonKeys.saveDraftAndQueueButtonKey;
        const saveActionName = !DefinitionUtils.isDraftDefinition(this.props.quality) ? DTCResources.SaveButtonText : Resources.SaveDraft;
        const saveActionKey = !DefinitionUtils.isDraftDefinition(this.props.quality) ? TitleBarButtonKeys.saveButtonKey : TitleBarButtonKeys.saveDraftButtonKey;
        let saveActionChildren: IPivotBarAction[] = [];

        // Save & queue dropdown container button
        saveActionChildren.push({
            name: saveAndQueueActionName,
            key: saveAndQueueActionKey,
            important: true,
            // Checking state of Save button, Save & queue button (isSaveEnabled) and save as draft button and then defining state of Dropdown
            disabled: !this.state.isSaveEnabled && !this.state.isSaveAsDraftButtonEnabled,
            onClick: (event: React.MouseEvent<HTMLButtonElement>) => this._onSaveAndQueueClick(event),
            iconProps: {
                iconType: VssIconType.fabric,
                iconName: "Save"
            }
        });

        // Save button
        saveActionChildren.push({
            name: saveActionName,
            key: saveActionKey,
            important: false,
            disabled: !this.state.isSaveEnabled,
            onClick: this._onSaveClick,
            iconProps: {
                iconType: VssIconType.fabric,
                iconName: "Save"
            }
        });


        if (!DefinitionUtils.isDraftDefinition(this.props.quality)) {
            // Save as draft button
            saveActionChildren.push({
                name: Resources.SaveAsDraft,
                key: TitleBarButtonKeys.saveAsDraftButtonKey,
                important: false,
                disabled: !this.state.isSaveAsDraftButtonEnabled,
                onClick: this._onSaveAsDraftClick,
                iconProps: {
                    iconType: VssIconType.fabric,
                    iconName: "Save"
                }
            });
        }

        let summaryButton: IPivotBarAction = {
            name: Resources.SummaryButtonText,
            key: TitleBarButtonKeys.summaryButtonKey,
            important: true,
            disabled: !this.state.isSummaryButtonEnabled,
            target: "_blank",
            iconProps: {
                iconType: VssIconType.fabric,
                iconName: "BulletedList"
            }
        };

        let newCommandChildItems: IPivotBarAction[] = [
            // Save & queue dropdown container button
            {
                name: saveAndQueueActionName,
                key: TitleBarButtonKeys.saveAndQueueDropdownKey,
                important: true,
                // Checking state of Save button, Save & queue button (isSaveEnabled) and save as draft button and then defining state of Dropdown
                disabled: !this.state.isSaveEnabled && !this.state.isSaveAsDraftButtonEnabled,
                children: saveActionChildren,
                iconProps: {
                    iconType: VssIconType.fabric,
                    iconName: "Save"
                }
            },
            // Undo button
            {
                name: Resources.DiscardChangesText,
                key: TitleBarButtonKeys.undoButtonKey,
                important: true,
                disabled: !this.state.isDiscardButtonEnabled,
                onClick: this._onDiscardClick,
                iconProps: {
                    iconType: VssIconType.fabric,
                    iconName: "Undo"
                }
            },
            // Summary button
            summaryButton,
            // Queue button
            {
                name: Resources.QueueButtonText,
                key: TitleBarButtonKeys.queueButtonKey,
                important: true,
                disabled: !this.state.isBuildQueueButtonEnabled,
                onClick: () => this._handleSaveAndQueueBuild(QueueDialogSource.QueueButton),
                iconProps: {
                    iconType: VssIconType.fabric,
                    iconName: "Play"
                }
            },
            // Help button
            {
                name: DTCResources.HelpButtonText,
                key: TitleBarButtonKeys.helpButtonKey,
                important: false,
                disabled: false,
                onClick: this._onHelpClick,
                iconProps: {
                    iconType: VssIconType.fabric,
                    iconName: "Help"
                }
            },
            // Security button
            {
                name: Resources.SecurityText,
                key: TitleBarButtonKeys.protectButtonKey,
                important: false,
                disabled: !this.state.isSetSecurityEnabled,
                onClick: this._handleSecurity,
                iconProps: {
                    iconType: VssIconType.fabric,
                    iconName: "Permissions"
                }
            }
        ];

        if (DefinitionUtils.isDraftDefinition(this.props.quality)) {
            // Publish button
            newCommandChildItems.push({
                name: Resources.PublishDraft,
                key: TitleBarButtonKeys.publishDraftButtonKey,
                important: true,
                disabled: !this.state.isPublishButtonEnabled,
                onClick: this._onPublishDraftClick,
                iconProps: {
                    iconType: VssIconType.fabric,
                    iconName: "Save"
                }
            });
        }

        // add href prop only in case the button is enabled
        // otherwise it will always be enabled regardless of the disabled property
        if (this.state.isSummaryButtonEnabled) {
            summaryButton["href"] = this._getSummaryLink();
        }
        else {
            summaryButton["onClick"] = () => { /**/ };
        }
        return newCommandChildItems;
    }

    private _saveBuildDefinition(buildDefinition: BuildDefinition): IPromise<void> {
        const cloneId: number = this._buildDefinitionStore.getCloneId();
        const cloneRevision: number = this._buildDefinitionStore.getCloneRevision();
        if (this._buildDefinitionStore.isProcessParameterStoreDirty()) {
            Telemetry.instance().publishEvent(Feature.SaveBuildDefinitionWithDirtyProcessParameters, { "buildDefinitionId": buildDefinition.id });
        }
        return ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator).saveBuildDefinition(buildDefinition, cloneId, cloneRevision);
    }

    private _onCloseSaveDialog = () => {
        ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator).closeSaveDialog();
    }

    private _setBuildDefinitionSaveData(comment: string, saveLocation?: string): BuildDefinition {
        const buildDefinition = this._buildDefinitionStore.getBuildDefinition();
        buildDefinition.comment = comment;
        if (saveLocation) {
            buildDefinition.path = saveLocation;
        }
        else if (!buildDefinition.path) {
            buildDefinition.path = DefaultPath;
        }

        return buildDefinition;
    }

    private _onDiscardClick = () => {
        this._showDiscardConfirmationDialog = true;
        this._onChange();
    }

    private _onConfirmDialogCancel = () => {
        this._showDiscardConfirmationDialog = false;
        this._showDraftReplacementConfirmationDialog = false;
        this._onChange();
    }

    private _onPublishDraftClick(event: React.MouseEvent<HTMLButtonElement>) {
        ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator).showSaveDialog();
    }

    private _discardChanges = () => {
        const buildDefinitionId: number = this._getCurrentBuildDefinitionId();
        ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator).discardBuildDefinitionChanges(buildDefinitionId);
        this._publishCommandBarTelemetry(Feature.CommandBar, TitleBarButtonKeys.undoButtonKey);
    }

    private _replaceDraft = () => {
        const buildDefinition = this._buildDefinitionStore.getBuildDefinition();
        if (buildDefinition.drafts && buildDefinition.drafts.length > 0) {
            const draft = buildDefinition.drafts[buildDefinition.drafts.length - 1];
            const draftInfo = {
                id: draft.id,
                rev: draft.revision,
            } as IDefinitionInfo;
            // Sending the Draft info instead of parent definition here, so that update happens to the existing draft and no new draft is created.
            ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator)
                .saveBuildDefinitionAsDraft(buildDefinition, draftInfo, true);
        }
    }

    private _getCurrentBuildDefinitionId(): number {
        let buildDefinitionId: number = -1;
        const buildDefinition: BuildDefinition = this._buildDefinitionStore.getBuildDefinition();
        if (buildDefinition) {
            buildDefinitionId = buildDefinition.id;
        }
        return buildDefinitionId;
    }

    private _onHelpClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
        UrlUtilities.openInNewWindow(HelpLinks.BuildReleaseHelpLink);
        this._publishCommandBarTelemetry(Feature.CommandBar, TitleBarButtonKeys.helpButtonKey);
    }

    private _onSaveAndQueueClick(event: React.MouseEvent<HTMLButtonElement>) {
        this._handleSaveAndQueueBuild(QueueDialogSource.SaveAndQueueButton);
    }

    private _handleSecurity = () => {
        const buildDefinition = this._buildDefinitionStore.getBuildDefinition();
        SecurityUtils.showBuildDefinitionSecurityDialog({
            name: buildDefinition.name,
            id: buildDefinition.id,
            path: buildDefinition.path
        });

        this._publishCommandBarTelemetry(Feature.CommandBar, TitleBarButtonKeys.protectButtonKey);
    }

    private _getSummaryLink(): string {
        const buildDefinitionId: number = this._getCurrentBuildDefinitionId();
        return BuildLinks.getDefinitionLink(buildDefinitionId);
    }

    private _onSaveClick() {
        ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator).showSaveDialog();
    }

    private _publishCommandBarTelemetry(feature: string, actionName: string) {
        const eventProperties: IDictionaryStringTo<{}> = {};
        const isDraftDefinition = this.props && DefinitionUtils.isDraftDefinition(this.props.quality);
        eventProperties[Properties.ActionName] = actionName;
        eventProperties[Properties.DraftDefinition] = isDraftDefinition;

        Telemetry.instance().publishEvent(feature, eventProperties);
    }

    private _handleSaveAndQueueBuild = (source: QueueDialogSource) => {
        const name = this._coreDefinitionStore.getState().name;
        const id = this._coreDefinitionStore.getState().id;
        const buildDefinition = this._buildDefinitionStore.getBuildDefinition();
        const isNewBuildDefinition = id <= 0;
        const runtimeVariables: VariableList = getRuntimeVariables(buildDefinition.variables);
        const demands = buildDefinition.demands;
        const taskListStoreInstanceId = this._buildDefinitionStore.getPhaseInstanceIds()[0];
        const enableSave = source === QueueDialogSource.SaveAndQueueButton;
        const queueStatus = this._coreDefinitionStore.getState().queueStatus;

        AgentsSource.instance().getTaskAgentQueues().then((queues: TaskAgentQueue[]) => {
            const definition = this._buildDefinitionStore.getBuildDefinition();
            QueueBuildDialog.open({
                agentQueues: queues,
                defaultAgentQueue: Utilities.convertFromBuildQueue(this._buildDefinitionStore.getDefaultTaskAgentQueue()),
                definitionName: name,
                definitionId: id,
                processType: definition.process.type,
                enableSaveBeforeQueue: enableSave,
                definition: enableSave ? buildDefinition : null,
                cloneId: enableSave ? this._buildDefinitionStore.getCloneId() : null,
                cloneRevision: enableSave ? this._buildDefinitionStore.getCloneRevision() : null,
                onBuildSaved: enableSave ? (bd: BuildDefinition) => { this._onSaveBuildDefinition(isNewBuildDefinition, bd); } : null,
                defaultSourceBranch: definition.repository ? definition.repository.defaultBranch : "",
                repository: definition.repository,
                runTimeVariables: runtimeVariables,
                serializedDemands: demands,
                queueDialogSource: source,
                taskListStoreInstanceId: taskListStoreInstanceId,
                definitionQueueStatus: queueStatus
            });
        });
    }

    private _onSaveBuildDefinition(isNewBuildDefinition: boolean, buildDefinition: BuildDefinition): IPromise<void> {
        return ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator)
            .refreshBuildDefinitionOnSave(buildDefinition, isNewBuildDefinition);
    }

    private _isYamlStateChanged = () => {
        this.setState({
            isYaml: this._yamlStore.getState().isYaml
        } as IDefinitionTabsContainerState);
    }

    private _getPivotItems(): JSX.Element[] {
        let pivotItems: JSX.Element[] = [];
        const buildDefinition = this.state.buildDefinition;
        const tabKeys = this.state.tabKeys || [];
        const yamlDefinitionStore = StoreManager.GetStore<YamlDefinitionStore>(YamlDefinitionStore);
        for (let tabKey of tabKeys) {

            const errorIcon: string =
                (!this.state.tabIsValidFlags[tabKey])
                    ? "bowtie-icon bowtie-status-error-outline"
                    : undefined;
            const iconProps = (!this.state.tabIsValidFlags[tabKey]) ? { iconName: "error", iconType: VssIconType.fabric, className: "ci-pivot-bar-error-icon" } : undefined;

            switch (tabKey) {
                case TabKeyConstants.Tasks:
                    let isYaml = this.state.isYaml;
                    let details = <YamlProcessItemOverview />;

                    // show the yaml simplified view only if FF is enabled
                    if (!yamlDefinitionStore.getState().isYamlEditorEnabled || !isYaml) {
                        details = <TasksTabControllerView
                            key={tabKey}
                            tabKey={tabKey}
                            title={this.state.isYaml ? Resources.YamlText : Resources.TasksTabItemTitle}
                            icon={errorIcon}
                            definition={buildDefinition}
                            isReadOnly={this.state.isReadOnly} />;
                    }
                    pivotItems.push(
                        <PivotBarItem
                            itemKey={tabKey}
                            name={this.state.isYaml ? Resources.YamlText : Resources.TasksTabItemTitle}
                            iconProps={iconProps}
                            className='absolute-fill'>
                            {details}
                        </PivotBarItem>);
                    break;

                case TabKeyConstants.Variables:
                    pivotItems.push(
                        <PivotBarItem
                            itemKey={tabKey}
                            name={DTCResources.VariablesText}
                            iconProps={iconProps}
                            className='absolute-fill'>
                            <VariableTabItem
                                key={tabKey}
                                tabKey={tabKey}
                                cssClass="definition-tab-container"
                                title={DTCResources.VariablesText}
                                icon={errorIcon}
                            />
                        </PivotBarItem>);
                    break;

                case TabKeyConstants.Triggers:
                    pivotItems.push(
                        <PivotBarItem
                            itemKey={tabKey}
                            name={Resources.TriggersText}
                            iconProps={iconProps}
                            className='absolute-fill'>
                            <TriggersTabItem
                                key={tabKey}
                                tabKey={tabKey}
                                title={Resources.TriggersText}
                                icon={errorIcon}
                                isReadOnly={this.state.isReadOnly}
                            />
                        </PivotBarItem>);
                    break;

                case TabKeyConstants.Options:
                    pivotItems.push(
                        <PivotBarItem
                            itemKey={tabKey}
                            name={Resources.OptionsTabItemTitle}
                            iconProps={iconProps}
                            className='absolute-fill'>
                            <OptionsTabItem
                                key={tabKey}
                                tabKey={tabKey}
                                title={Resources.OptionsTabItemTitle}
                                icon={errorIcon}
                                quality={this.props.quality}
                                isReadOnly={this.state.isReadOnly}
                            />
                        </PivotBarItem>);
                    break;

                case TabKeyConstants.Retention:
                    pivotItems.push(
                        <PivotBarItem
                            itemKey={tabKey}
                            name={Resources.RetentionTabItemTitle}
                            iconProps={iconProps}
                            className='absolute-fill'>
                            <RetentionTabItem
                                key={tabKey}
                                tabKey={tabKey}
                                title={Resources.RetentionTabItemTitle}
                                icon={errorIcon}
                                isReadOnly={this.state.isReadOnly}
                            />
                        </PivotBarItem>);
                    break;

                case TabKeyConstants.History:
                    pivotItems.push(
                        <PivotBarItem
                            itemKey={tabKey}
                            name={Resources.HistoryText}
                            iconProps={iconProps}
                            className='absolute-fill'>
                            <HistoryTabItem
                                key={tabKey}
                                tabKey={tabKey}
                                title={Resources.HistoryText}
                                icon={errorIcon}
                                definitionId={buildDefinition ? buildDefinition.id : null}
                                currentRevision={buildDefinition ? buildDefinition.revision : null}
                            />
                        </PivotBarItem>);
                    break;
            }
        }

        return pivotItems;
    }

    private _getTabKeys(quality: DefinitionQuality, isYaml: boolean): string[] {
        let tabKeys = [];
        const isDraftDefinition = DefinitionUtils.isDraftDefinition(quality);

        tabKeys.push(TabKeyConstants.Tasks);
        tabKeys.push(TabKeyConstants.Variables);

        if (!isDraftDefinition) {
            tabKeys.push(TabKeyConstants.Triggers);
        }

        if (!isYaml) {
            tabKeys.push(TabKeyConstants.Options);
        }

        if (!isDraftDefinition && !isYaml) {
            tabKeys.push(TabKeyConstants.Retention);
        }

        tabKeys.push(TabKeyConstants.History);

        return tabKeys;
    }

    private _getTabIsValidFlags(): IDictionaryStringTo<boolean> {
        let tabIsValidFlags: IDictionaryStringTo<boolean> = {};
        const tabKeys = this.state.tabKeys || [];

        for (let tabKey of tabKeys) {
            tabIsValidFlags[tabKey] = this._buildDefinitionStore.getTabIsValid(tabKey);
        }

        return tabIsValidFlags;
    }

    private _onChange = () => {
        const buildDefinition = this._buildDefinitionStore.getBuildDefinition();
        const id = buildDefinition ? buildDefinition.id : null;
        const revision = buildDefinition ? buildDefinition.revision : null;
        this.setState(this._getState());
    }

    private _handleTabClick = (key: string) => {
        this.setState({
            selectedTabItemKey: key
        } as IDefinitionTabsContainerState);
    }
}
