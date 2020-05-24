/// <reference types="react" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { UrlUtilities } from "DistributedTaskControls/Common/UrlUtilities";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { DialogWithMultiLineTextInput } from "DistributedTaskControls/Components/DialogWithMultiLineTextInput";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { SaveStatusStore } from "DistributedTaskControls/Stores/SaveStatusStore";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";

import { CommandBar } from "OfficeFabric/CommandBar";
import { IContextualMenuItem, IContextualMenuProps } from "OfficeFabric/ContextualMenu";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { css } from "OfficeFabric/Utilities";

import { CommonConstants, HelpConstants, PerfScenarios } from "PipelineWorkflow/Scripts/Common/Constants";
import { DialogStore } from "PipelineWorkflow/Scripts/Common/Stores/DialogStore";
import { DialogActionsCreator } from "PipelineWorkflow/Scripts/Common/Actions/DialogActionsCreator";
import { AllDefinitionsContentKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { DefinitionsActionsCreator } from "PipelineWorkflow/Scripts/Definitions/DefinitionsActionsCreator";
import { FolderPicker, IFolderPickerState } from "PipelineWorkflow/Scripts/Definitions/FolderPicker/FolderPicker";
import { FolderPickerStore } from "PipelineWorkflow/Scripts/Definitions/FolderPicker/FolderPickerStore";
import { FolderPickerActionsCreator } from "PipelineWorkflow/Scripts/Definitions/FolderPicker/FolderPickerActionsCreator";
import { FoldersStore } from "PipelineWorkflow/Scripts/Definitions/Stores/FoldersStore";
import { ErrorMessageParentKeyConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { CreateReleaseDialog } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/ReleaseDialog";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { PermissionTelemetryHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionTelemetryHelper";
import { PermissionService } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionService";
import {
    PipelineDefinition,
    PipelineDefinitionEnvironment,
    PipelineRelease,
    PipelineExtensionAreas,
    PipelineDefinitionDesignerActions,
    PipelineReleaseEditorActions
} from "PipelineWorkflow/Scripts/Common/Types";
import { DefinitionActionsCreator } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionActionsCreator";
import { DefinitionStore } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionStore";
import { ReleaseUrlUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ReleaseUrlUtils";
import { CreateReleaseStore } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseStore";
import { CreateReleasePanelHelper, ICreateReleaseOptions } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleasePanelHelper";
import { CreateReleaseActionsCreator } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseActionsCreator";
import { SecurityUtils } from "PipelineWorkflow/Scripts/Editor/Common/SecurityUtils";
import { DefinitionUtils } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import SecurityDialog_TypeOnly = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.SecurityDialog");
import { ReleaseManagementSecurityPermissions } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";

import * as VssContext from "VSS/Context";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";
import * as KeyboardShortcuts_LAZY_LOAD from "VSS/Controls/KeyboardShortcuts";
import * as Utils_Core from "VSS/Utils/Core";
import * as Contribution_Controls from "VSS/Contributions/Controls";

import * as Performance from "VSS/Performance";
import { BaseContributableMenuItemProvider, IContributableContextualMenuItem } from "VSSPreview/Providers/ContributableMenuItemProvider";
import { IVssContextualMenuItem } from "VSSUI/VssContextualMenu";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/ToolBar/ToolBarControllerView";

export interface IToolBarProps extends Base.IProps {
    definitionStore: DefinitionStore;
}

export interface IToolBarState extends Base.IState {
    isSaveEnabled: boolean;
    isCreateReleaseEnabled: boolean;
    showCreateReleaseDialog: boolean;
    showSaveDialog: boolean;
    isSaveDialogOkDisabled: boolean;
    showFolderPickerInSaveDialog: boolean;
    isOldEditorButtonEnabled: boolean;
    isViewReleasesEnabled: boolean;
    contributedButtons: IContextualMenuItem[];
}

export class TitleBarButtonKeys {
    public static saveButtonKey: string = "save-button";
    public static createReleaseDropdownMenuOptionKey: string = "create-release-dropdown-menu-option";
    public static createDraftReleaseDropdownMenuOptionKey: string = "create-draft-release-dropdown-menu-option";
    public static createReleaseButtonKey: string = "create-release-button";
    public static viewReleasesButtonKey: string = "view-releases-button";
    public static helpButtonKey: string = "help-button";
    public static securityButtonKey: string = "security-button";
    public static editInOldEditorKey: string = "edit-old-editor-button";
}

export class Toolbar extends Base.Component<IToolBarProps, IToolBarState> {
    constructor(props: IToolBarProps) {
        super(props);

        this.state = this._getInitialState();

        this._definitionStore = this.props.definitionStore;
        this._definitionActionsCreator = ActionCreatorManager.GetActionCreator<DefinitionActionsCreator>(DefinitionActionsCreator);

        this._createReleaseDialogStore = StoreManager.GetStore<DialogStore>(DialogStore, this._createReleaseDialogInstanceId);
        this._createReleaseDialogActionsCreator = ActionCreatorManager.GetActionCreator<DialogActionsCreator>(DialogActionsCreator, this._createReleaseDialogInstanceId);

        this._definitionsActionsCreator = ActionCreatorManager.GetActionCreator<DefinitionsActionsCreator>(DefinitionsActionsCreator);
        this._foldersStore = StoreManager.GetStore<FoldersStore>(FoldersStore);
        this._folderPickerStore = StoreManager.GetStore<FolderPickerStore>(FolderPickerStore);
        this._folderPickerActionsCreator = ActionCreatorManager.GetActionCreator<FolderPickerActionsCreator>(FolderPickerActionsCreator);

        this._saveStatusStore = StoreManager.GetStore<SaveStatusStore>(SaveStatusStore);
        this._messageHandlerActionsCreator = ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);
    }

    public componentWillMount(): void {

        this._registerShortcuts();

        this._definitionStore.addChangedListener(this._onChange);
        this._createReleaseDialogStore.addChangedListener(this._onChange);
        this._saveStatusStore.addChangedListener(this._onSaveStatusStoreChange);

        this._definitionsActionsCreator.fetchFolders();
    }

    public componentDidMount(): void {
        this._isMounted = true;
        this._folderPickerStore.addChangedListener(this._onFolderPickerStoreUpdate);

        this._menuContributionProvider = new BaseContributableMenuItemProvider(["ms.vss-releaseManagement-web.release-definition-editor-toolbar-menu"], () => this._getContributionContext(), null, null, {
            overrideMenuItemProps: (item: IContributableContextualMenuItem, contribution: Contribution) => {
                item["rank"] = contribution.properties["rank"];
                item["disabled"] = contribution.properties["disabled"];
            }
        });
        this._menuContributionProvider.loadItems((items: IVssContextualMenuItem[]) => {
            this._updateContribution(items);
        });

    }

    public componentWillUnmount(): void {

        this._isMounted = false;
        this._unregisterShortcuts();

        this._definitionStore.removeChangedListener(this._onChange);
        this._createReleaseDialogStore.removeChangedListener(this._onChange);
        this._saveStatusStore.removeChangedListener(this._onSaveStatusStoreChange);
        ActionCreatorManager.DeleteActionCreator<DialogActionsCreator>(DialogActionsCreator, this._createReleaseDialogInstanceId);
        this._folderPickerStore.removeChangedListener(this._onFolderPickerStoreUpdate);
    }

    public render(): JSX.Element {
        //Fetch all buttons/containers
        this._buttonsList = this._getButtons();

        let visibleButtons: IContextualMenuItem[] = this._getVisibleButtons();
        let overflowButtons: IContextualMenuItem[] = this._getHiddenButtons();

        let definition: PipelineDefinition = this._definitionStore.getDefinition();
        let definitionName: string = !!definition ? definition.name : Utils_String.empty;

        let cdTitleBarControlCss: string = this._isEditInOldEditorVisible() ? "cd-title-bar-controls-width" : "cd-title-bar-controls-width-reduced";

        return (
            <div className={css("cd-title-bar-controls", cdTitleBarControlCss)} role="region" aria-label={Resources.ARIALabelEditorToolbar}>

                <CommandBar
                    isSearchBoxVisible={false}
                    elipisisAriaLabel={DTCResources.CommandBarEllipsesAriaLabel}
                    items={visibleButtons}
                    overflowItems={overflowButtons}
                    className="cd-command-bar" />

                {
                    this.state.showCreateReleaseDialog &&
                    (<CreateReleaseDialog
                        instanceId={this._releaseDialogInstanceId}
                        releaseDialogStore={this._createReleaseStore}
                        releaseDialogActionCreator={this._createReleaseActionCreator}
                        showDialog={this.state.showCreateReleaseDialog}
                        definitionId={definition.id}
                        definitionName={definitionName || Utils_String.empty}
                        onQueueRelease={this._onCreateRelease}
                        onCloseDialog={this._onCloseReleaseDialog} />)
                }
                {
                    this.state.showSaveDialog &&
                    <DialogWithMultiLineTextInput
                        okButtonText={DTCResources.OK}
                        okButtonAriaLabel={DTCResources.OK}
                        cancelButtonAriaLabel={DTCResources.CancelButtonText}
                        cancelButtonText={DTCResources.CancelButtonText}
                        titleText={DTCResources.SaveButtonText}
                        multiLineInputLabel={DTCResources.CommentText}
                        showDialog={this.state.showSaveDialog}
                        onOkButtonClick={(text: string) => { this._onSaveClick(text); }}
                        onCancelButtonClick={this._hideSaveDialog}
                        okDisabled={this.state.isSaveDialogOkDisabled}
                        footerInfoMessage={this._getFooterInfoMessage(definition)}
                    >
                        {
                            FeatureFlagUtils.isNewReleasesHubEnabled() &&
                            this.state.showFolderPickerInSaveDialog &&
                            <FolderPicker isReadOnly={false}
                                setInitialFocusOnTextField={true}
                                inputClassName={"save-rd-dialog-folderpicker-input"} />
                        }
                    </DialogWithMultiLineTextInput>
                }
            </div>
        );
    }

    private _getContributionContext() {
        return {
            definition: this._definitionStore.getUpdatedDefinition(),
            isUpdated: this._definitionStore.isDirty(),
            isValid: this._definitionStore.isValid()
        };
    }

    private _updateContribution(items: IVssContextualMenuItem[]): void {
        if (this._isMounted) {
            let contributedButtons: IContextualMenuItem[] = [];
            items.forEach((item) => {
                contributedButtons.push({
                    name: item.name,
                    key: item.key,
                    iconProps: item.iconProps,
                    onClick: item.onClick,
                    rank: item.rank,
                    disabled: item.disabled
                });
            });
            this.setState({ ...this.state, contributedButtons: contributedButtons });
        }
    }

    /**
     * Get the footer info message to be shown in the edit definition case where previous saved rank of environments
     * got updated while doing edit defintion. Expectation is that this info should come only once for edit defintion 
     * unless user explictely go and change order other than new editor.
     * @param definition
     */
    private _getFooterInfoMessage(definition: PipelineDefinition): string {

        // check only for edit definition case, in that case definition id would be greater than 0
        if (definition && definition.id > 0 && !DefinitionUtils.isV2EnvironmentRankLogicApplied(definition)) {
            const oldRankMap = this._definitionActionsCreator.getOriginalEnvironmentIdsRankMapForEditDefinition();

            // compare with oldRank map with the current rank, if any environment has different rank then show the info message
            // If RD is in correct rank state and new environment will get added while in edit mode, we don't need to show any
            // warning in the save dialog for this case.
            const rankUpdated = this._isEnvironmentRankUpdateInEditDefinition(definition, oldRankMap);
            if (rankUpdated) {
                Telemetry.instance().publishEvent(Feature.EnvironmentRankUpdated);
                return Resources.EnvironmentRankWarning;
            }
        }
    }

    private _isEnvironmentRankUpdateInEditDefinition(definition: PipelineDefinition, environmentIdsRankMap: IDictionaryNumberTo<number>): boolean {
        let rankUpdated: boolean = false;
        if (definition.environments) {
            definition.environments.some((environment) => {
                const rank = environmentIdsRankMap[environment.id];
                if (rank && rank !== environment.rank) {
                    rankUpdated = true;
                    return true;
                }
            });
        }

        return rankUpdated;
    }

    private _getButtons(): IDictionaryStringTo<IContextualMenuItem> {
        let buttons: IDictionaryStringTo<IContextualMenuItem> = {};

        // Save button
        buttons[TitleBarButtonKeys.saveButtonKey] = {
            name: DTCResources.SaveButtonText,
            key: TitleBarButtonKeys.saveButtonKey,
            icon: "Save",
            className: "title-bar-button save",
            disabled: !this.state.isSaveEnabled,
            onClick: (event: React.MouseEvent<HTMLButtonElement>) => this._showSaveDialog(),
            rank: 10
        };

        // Create release button
        buttons[TitleBarButtonKeys.createReleaseButtonKey] = {
            name: Resources.ReleaseText,
            key: TitleBarButtonKeys.createReleaseButtonKey,
            icon: "Add",
            className: "title-bar-button create-release",
            subMenuProps: this._getCreateReleaseDropdownOptions(),
            disabled: !this.state.isCreateReleaseEnabled,
            rank: 20
        };

        // View release button
        buttons[TitleBarButtonKeys.viewReleasesButtonKey] = {
            name: Resources.ViewReleasesText,
            key: TitleBarButtonKeys.viewReleasesButtonKey,
            icon: "BulletedList",
            className: "title-bar-button view-releases",
            onClick: (e) => this._onViewReleasesClick(e),
            disabled: !this.state.isViewReleasesEnabled,
            rank: 30
        };

        // Help button
        buttons[TitleBarButtonKeys.helpButtonKey] = {
            name: DTCResources.HelpButtonText,
            key: TitleBarButtonKeys.helpButtonKey,
            icon: "Help",
            className: "title-bar-button help",
            onClick: this._onHelpClick,
        };

        // Security Button
        buttons[TitleBarButtonKeys.securityButtonKey] = {
            name: Resources.SecurityText,
            disabled: !this._isExistingDefinition(),
            key: TitleBarButtonKeys.securityButtonKey,
            icon: "Permissions",
            className: "title-bar-button security",
            onClick: this._handleSecurity,
        };

        buttons[TitleBarButtonKeys.editInOldEditorKey] = {
            name: Resources.EditInOldEditorText,
            key: TitleBarButtonKeys.editInOldEditorKey,
            icon: "Edit",
            className: "title-bar-button edit-old-editor",
            onClick: this._onEditInOldEditorClick,
            disabled: !this.state.isOldEditorButtonEnabled,
            rank: 40
        };

        return buttons;
    }

    private _getInitialState(): IToolBarState {
        return {
            isCreateReleaseEnabled: false,
            isSaveEnabled: false,
            showCreateReleaseDialog: false,
            showSaveDialog: false,
            showFolderPickerInSaveDialog: false,
            isOldEditorButtonEnabled: false,
            isViewReleasesEnabled: false,
            isSaveDialogOkDisabled: this._isSaveDialogOkDisabled(),
            contributedButtons: []
        };
    }

    private _onFolderPickerStoreUpdate = () => {
        this.setState({ isSaveDialogOkDisabled: this._isSaveDialogOkDisabled() });
    }

    private _showSaveDialog(): void {
        const definitionId = this._definitionStore.getDefinitionId();
        const path = this._definitionStore.getPath();

        let showFolderPickerInSaveDialog = (definitionId === 0);
        if (showFolderPickerInSaveDialog) {
            this._folderPickerActionsCreator.setFolderPathForPicker(path);
        }

        this.setState({
            showSaveDialog: true,
            showFolderPickerInSaveDialog: showFolderPickerInSaveDialog
        });
    }

    private _hideSaveDialog = () => {
        this.setState({ showSaveDialog: false });
    }

    private _getVisibleButtons(): IContextualMenuItem[] {
        let visibleContextualItems: IContextualMenuItem[] = [];
        this.state.contributedButtons.forEach((item) => {
            if (item.rank) {
                visibleContextualItems.push(item);
            }
        });

        // Save button
        visibleContextualItems.push(this._buttonsList[TitleBarButtonKeys.saveButtonKey]);

        //Create release button
        visibleContextualItems.push(this._buttonsList[TitleBarButtonKeys.createReleaseButtonKey]);

        // View releases button
        visibleContextualItems.push(this._buttonsList[TitleBarButtonKeys.viewReleasesButtonKey]);

        if (this._isEditInOldEditorVisible()) {
            visibleContextualItems.push(this._buttonsList[TitleBarButtonKeys.editInOldEditorKey]);
        }

        return visibleContextualItems.sort((a: IContextualMenuItem, b: IContextualMenuItem) => { return a.rank - b.rank; });
    }

    private _getHiddenButtons(): IContextualMenuItem[] {
        let hiddenContextualItems: IContextualMenuItem[] = [];

        // Help button
        hiddenContextualItems.push(this._buttonsList[TitleBarButtonKeys.helpButtonKey]);

        // Security button
        hiddenContextualItems.push(this._buttonsList[TitleBarButtonKeys.securityButtonKey]);

        this.state.contributedButtons.forEach((item) => {
            if (!item.rank) {
                hiddenContextualItems.push(item);
            }
        });

        return hiddenContextualItems;
    }

    private _getCreateReleaseDropdownOptions(): IContextualMenuProps {
        let dropdownItems: IContextualMenuItem[] = [
            {
                key: TitleBarButtonKeys.createReleaseDropdownMenuOptionKey,
                name: Resources.CreateReleaseMenuOptionText,
                icon: "Add",
                onClick: this._onCreateReleaseClick,
            },
            {
                key: TitleBarButtonKeys.createDraftReleaseDropdownMenuOptionKey,
                name: Resources.CreateDraftReleaseMenuOptionText,
                icon: "Add",
                onClick: this._onCreateDraftReleaseClick,
            }
        ];
        let subMenuPropsForSaveButton: IContextualMenuProps = {
            items: dropdownItems,
        };
        return subMenuPropsForSaveButton;
    }

    private _onChange = () => {
        let isNewDefinition: boolean = this._isExistingDefinition();

        let isSaveEnabled: boolean = this._definitionStore.isDirty()
            && this._definitionStore.isValid()
            && !this._saveStatusStore.isSaveInProgress()
            && !this._definitionStore.isCreateReleaseInProgress();

        let isCreateReleaseEnabled: boolean = !this._definitionStore.isDirty()
            && this._definitionStore.isValid()
            && isNewDefinition
            && !this._saveStatusStore.isSaveInProgress()
            && !this._definitionStore.isCreateReleaseInProgress();

        let isOldEditorButtonEnabled: boolean = isNewDefinition;
        this.setState(
            {
                isSaveEnabled: isSaveEnabled,
                isCreateReleaseEnabled: isCreateReleaseEnabled,
                showCreateReleaseDialog: this._createReleaseDialogStore.getState().showDialog,
                showSaveDialog: false,
                isOldEditorButtonEnabled: isOldEditorButtonEnabled,
                isViewReleasesEnabled: isNewDefinition
            }
        );

        if (this._menuContributionProvider) {
            this._menuContributionProvider.refresh();
        }
    }

    private _onSaveStatusStoreChange = () => {
        let isSaveInProgress: boolean = this._saveStatusStore.isSaveInProgress();
        if (isSaveInProgress) {
            this.setState({...this.state, isSaveEnabled: false, isCreateReleaseEnabled: false, showSaveDialog: false});
        }
        else {
            this._onChange();
        }
    }

    private _isExistingDefinition(): boolean {
        let definitionId = this._definitionStore.getDefinitionId();
        if (definitionId) {
            return (definitionId > 0);
        }

        return false;
    }

    private _onSaveClick = (comment: string) => {
        Performance.getScenarioManager().startScenario(CommonConstants.FeatureArea, PerfScenarios.SaveDefinition);
        let definition: PipelineDefinition = this._definitionStore.getUpdatedDefinition();
        definition.comment = comment;

        if (this.state.showFolderPickerInSaveDialog) {
            let folderPickerState = this._getFolderPickerState();
            definition.path = folderPickerState && folderPickerState.path ? folderPickerState.path : AllDefinitionsContentKeys.PathSeparator;
        }

        this._definitionActionsCreator.saveDefinition(definition).then(() => {
            Performance.getScenarioManager().endScenario(CommonConstants.FeatureArea, PerfScenarios.SaveDefinition);
        }, (error) => {
            Performance.getScenarioManager().abortScenario(CommonConstants.FeatureArea, PerfScenarios.SaveDefinition);
        });
    }

    private _isSaveDialogOkDisabled = (): boolean => {
        // Do not check for folder picker error if the new releases hub is not enabled
        if (!FeatureFlagUtils.isNewReleasesHubEnabled()) {
            return false;
        }

        let folderPickerState = this._getFolderPickerState();
        if (folderPickerState && folderPickerState.error) {
            return true;
        }

        return false;
    }

    private _getFolderPickerState = (): IFolderPickerState => {
        return this._folderPickerStore ? this._folderPickerStore.getFolderPickerState() : null;
    }

    private _onCreateReleaseClick = () => {
        const folderPath = this._definitionStore.getPath();
        const definitionId = this._definitionStore.getDefinitionId();
        const securityToken = SecurityUtils.createDefinitionSecurityToken(folderPath, definitionId);
        PermissionService.instance().hasPermission(securityToken, ReleaseManagementSecurityPermissions.QueueReleases).then((hasPermission) => {
            if (hasPermission) {
                this._createRelease(definitionId);
            }
            else {
                PermissionTelemetryHelper.publishPermissionIndicator(
                    securityToken,
                    ReleaseManagementSecurityPermissions.QueueReleases,
                    null,
                    true);

                this._messageHandlerActionsCreator.addMessage(ErrorMessageParentKeyConstants.MainParentKey, Resources.QueueReleasePermissionMessage, MessageBarType.warning);
            }
        }, (error) => {
            this._createRelease(definitionId);
        });

        this._publishCommandBarTelemetry(TitleBarButtonKeys.createReleaseDropdownMenuOptionKey);
    }

    private _createRelease(definitionId: number): void {
        if (FeatureFlagUtils.isNewCreateReleaseWorkflowEnabled()) {
            Performance.getScenarioManager().startScenario(CommonConstants.FeatureArea, PerfScenarios.CreateReleaseDialog);
            let releaseData: ICreateReleaseOptions = { definitionId: definitionId, onQueueRelease: this._onCreateRelease };
            let createReleasePanelHelper = new CreateReleasePanelHelper<PipelineDefinition, PipelineDefinitionEnvironment>(releaseData);
            createReleasePanelHelper.openCreateReleasePanel();
        } else {
            this._showReleaseDialog(definitionId);
        }
    }

    private _showReleaseDialog(definitionId: number): void {
        this._releaseDialogInstanceId = DtcUtils.getUniqueInstanceId();
        let createReleasePanelHelper = new CreateReleasePanelHelper<PipelineDefinition, PipelineDefinitionEnvironment>({ onQueueRelease: this._onCreateRelease, definitionId: definitionId });
        createReleasePanelHelper.initializeCreateReleaseStore(this._releaseDialogInstanceId);
        this._createReleaseStore = createReleasePanelHelper.getCreateReleaseStore();
        this._createReleaseActionCreator = createReleasePanelHelper.getCreateReleaseActionCreator();
        this._createReleaseDialogActionsCreator.showDialog();
    }

    private _onCreateDraftReleaseClick = () => {
        const folderPath = this._definitionStore.getPath();
        const definitionId = this._definitionStore.getDefinitionId();
        const securityToken = SecurityUtils.createDefinitionSecurityToken(folderPath, definitionId);
        PermissionService.instance().hasPermission(securityToken, ReleaseManagementSecurityPermissions.QueueReleases).then((hasPermssion) => {
            if (hasPermssion) {
                this._definitionActionsCreator.createDraftRelease(definitionId);
            }
            else {
                this._messageHandlerActionsCreator.addMessage(ErrorMessageParentKeyConstants.MainParentKey, Resources.QueueReleasePermissionMessage, MessageBarType.warning);
            }
        }, (error) => {
            this._definitionActionsCreator.createDraftRelease(definitionId);
        });

        this._publishCommandBarTelemetry(TitleBarButtonKeys.createDraftReleaseDropdownMenuOptionKey);
    }

    private _onHelpClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
        UrlUtilities.openInNewWindow(HelpConstants.DeployHelpLink);

        this._publishCommandBarTelemetry(TitleBarButtonKeys.helpButtonKey);
    }

    private _handleSecurity = (): void => {
        let definitionName: string = this._definitionStore.getDefinitionName();
        const definitionPath: string = this._definitionStore.getPath();
        const definitionId: number = this._definitionStore.getDefinitionId();
        let securityToken = SecurityUtils.createDefinitionSecurityToken(definitionPath, definitionId);

        let parameters = {
            resourceName: definitionName,
            token: securityToken,
            projectId: VssContext.getDefaultWebContext().project.id,
            permissionSet: CommonConstants.SecurityNameSpaceIdForReleaseManagement,
        };

        VSS.using(["ReleasePipeline/Scripts/TFS.ReleaseManagement.SecurityDialog"], (SecurityDialog: typeof SecurityDialog_TypeOnly) => {

            return SecurityDialog.SecurityHelper.showSecurityDialog(parameters);
        });

        this._publishCommandBarTelemetry(TitleBarButtonKeys.securityButtonKey);
    }

    private _onViewReleasesClick = (ev: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
        let viewReleasesUrl: string;
        const definitionId = this._definitionStore.getDefinitionId();
        if (FeatureFlagUtils.isNewReleasesHubEnabled()) {
            viewReleasesUrl = DtcUtils.getUrlForExtension(
                PipelineExtensionAreas.ReleaseExplorer2,
                PipelineDefinitionDesignerActions.viewReleasesAction,
                { definitionId: definitionId },
                true
            );
        }
        else {
            viewReleasesUrl = DtcUtils.getUrlForExtension(
                PipelineExtensionAreas.ReleaseExplorer,
                PipelineDefinitionDesignerActions.viewReleasesAction,
                { definitionId: definitionId },
                true
            );
        }

        UrlUtilities.navigateTo(viewReleasesUrl, true, ev);

        this._publishCommandBarTelemetry(TitleBarButtonKeys.viewReleasesButtonKey);
    }

    private _onEditInOldEditorClick = () => {
        this._openUrl(PipelineDefinitionDesignerActions.environmentsEditorAction, false, { forceOpenOldEditor: true });

        this._publishCommandBarTelemetry(TitleBarButtonKeys.editInOldEditorKey);
    }

    private _openUrl(actionName: string, openInNewTab: boolean = false, additionalParameters = {}) {
        let definitionId: number = this._definitionStore.getDefinitionId();
        let queryParameters = JQueryWrapper.extend({ definitionId: definitionId }, additionalParameters);

        let url = DtcUtils.getUrlForExtension(
            PipelineExtensionAreas.ReleaseExplorer,
            actionName,
            queryParameters
        );

        if (openInNewTab) {
            UrlUtilities.openInNewWindow(url);
        }
        else {
            UrlUtilities.navigateTo(url);
        }
    }

    private _getPipelineReleaseUrl(
        pipelineRelease: PipelineRelease,
        pipelineReleaseDefaultTab: string = PipelineReleaseEditorActions.summaryAction): string {

        if (pipelineRelease != null) {
            let pipelineReleaseUrl: string = DtcUtils.getUrlForExtension(
                PipelineExtensionAreas.ReleaseExplorer,
                pipelineReleaseDefaultTab,
                {
                    releaseId: pipelineRelease.id,
                    definitionId: pipelineRelease.releaseDefinition.id
                });

            return pipelineReleaseUrl;
        }
    }

    private _getReleaseCreatedMessageBarContent = (pipelineRelease: PipelineRelease): JSX.Element => {
        let url: string = Utils_String.empty;

        if (FeatureFlagUtils.isNewReleaseViewEnabled()) {
            url = ReleaseUrlUtils.getReleaseProgressUrl(pipelineRelease.id);
        }
        else {
            url = this._getPipelineReleaseUrl(pipelineRelease);
        }

        return (<span>
            {Resources.ReleaseCreatedTextPrefix}
            <SafeLink href={url} target="_blank" allowRelative={true} onClick={(e) => { this._onReleaseLinkClick(e, url); }}>{pipelineRelease.name}</SafeLink>
            {Resources.ReleaseCreatedTextSuffix}
        </span>);
    }

    private _onReleaseLinkClick(event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, path: string): void {
        UrlUtilities.navigateTo(path, true, event);
    }

    private _onCreateRelease = (pipelineRelease: PipelineRelease, projectName?: string) => {
        this._messageHandlerActionsCreator.addMessage(ErrorMessageParentKeyConstants.MainParentKey, this._getReleaseCreatedMessageBarContent(pipelineRelease), MessageBarType.success);
        this._createReleaseDialogActionsCreator.closeDialog();
    }

    private _onCloseReleaseDialog = () => {
        this._createReleaseDialogActionsCreator.closeDialog();
    }

    private _publishCommandBarTelemetry(actionName: string) {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.ActionName] = actionName;

        Telemetry.instance().publishEvent(Feature.CommandBar, eventProperties);
    }

    private _registerShortcuts() {
        VSS.using(["VSS/Controls/KeyboardShortcuts"], (KeyboardShortcutsModule: typeof KeyboardShortcuts_LAZY_LOAD) => {
            let keyboardShortcutManager = KeyboardShortcutsModule.ShortcutManager.getInstance();

            keyboardShortcutManager.registerShortcut(
                DTCResources.EditorShortKeyGroup,
                KeyboardShortcutsModule.ShortcutKeys.CONTROL + "+s",
                {
                    description: Resources.KeyboardShortcutSaveReleaseDefinitionDescription,
                    action: () => {
                        if (this.state.isSaveEnabled) {
                            this._showSaveDialog();
                        }
                    },
                    element: document.body
                });

            DtcUtils.registertShortcuts();
        });
    }

    private _unregisterShortcuts() {
        VSS.using(["VSS/Controls/KeyboardShortcuts"], (KeyboardShortcutsModule: typeof KeyboardShortcuts_LAZY_LOAD) => {

            let keyboardShortcutManager = KeyboardShortcutsModule.ShortcutManager.getInstance();
            keyboardShortcutManager.unRegisterShortcut(DTCResources.EditorShortKeyGroup, KeyboardShortcutsModule.ShortcutKeys.CONTROL + "+s");
            DtcUtils.unregisterShortcuts();
        });
    }

    private _isEditInOldEditorVisible(): boolean {
        // Edit in old editor only for hosted scenario when FF is enabled
        return FeatureFlagUtils.isShowEditInOldEditorEnabled() && VssContext.getPageContext().webAccessConfiguration.isHosted;
    }

    private _definitionStore: DefinitionStore;
    private _saveStatusStore: SaveStatusStore;
    private _definitionActionsCreator: DefinitionActionsCreator;
    private _buttonsList: IDictionaryStringTo<IContextualMenuItem>;
    private _createReleaseDialogStore: DialogStore;
    private _createReleaseDialogInstanceId: string = "CD_Toolbar_CreateReleaseDialog";
    private _createReleaseDialogActionsCreator: DialogActionsCreator;
    private _messageHandlerActionsCreator: MessageHandlerActionsCreator;

    private _releaseDialogInstanceId: string;
    private _createReleaseStore: CreateReleaseStore<PipelineDefinition, PipelineDefinitionEnvironment>;
    private _createReleaseActionCreator: CreateReleaseActionsCreator<PipelineDefinition, PipelineDefinitionEnvironment>;

    private _definitionsActionsCreator: DefinitionsActionsCreator;
    private _foldersStore: FoldersStore;
    private _folderPickerStore: FolderPickerStore;
    private _folderPickerActionsCreator: FolderPickerActionsCreator;

    private _isMounted: boolean;
    private _menuContributionProvider: BaseContributableMenuItemProvider<IContextualMenuItem>;
}
