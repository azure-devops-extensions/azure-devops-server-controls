import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Component } from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { IErrorState } from "DistributedTaskControls/Common/Types";
import { UrlUtilities } from "DistributedTaskControls/Common/UrlUtilities";
import { ConfirmationDialog } from "DistributedTaskControls/Components/ConfirmationDialog";
import { DialogWithMultiLineTextInput } from "DistributedTaskControls/Components/DialogWithMultiLineTextInput";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { CommonConstants, ContributionIds, PerfScenarios } from "PipelineWorkflow/Scripts/Common/Constants";
import { ReleaseProgressContentKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ProgressHubViewStore, IProgressHubViewState } from "PipelineWorkflow/Scripts/ReleaseProgress/ProgressHubViewStore";
import { IDeploymentActionsProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/Types";
import { EnvironmentActionsHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/EnvironmentActionsHelper";
import { ReleaseEnvironmentActionsStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentActionsStore";
import { ReleaseActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseActionCreator";
import { ReleaseUrlUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ReleaseUrlUtils";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import { IExtensionContext } from "ReleaseManagement/Core/ExtensionContracts";

import * as VssContext from "VSS/Context";
import * as Performance from "VSS/Performance";
import * as VSS_Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import { format, localeFormat } from "VSS/Utils/String";
import { getDefaultPageTitle } from "VSS/Navigation/Services";

import { ContributablePivotItemProvider } from "VSSPreview/Providers/ContributablePivotItemProvider";
import { Hub } from "VSSUI/Hub";
import { HubHeader } from "VSSUI/HubHeader";
import { PivotBarItem, IPivotBarAction } from "VSSUI/PivotBar";
import { IHubViewState, HubViewState, IHubViewStateOptions } from "VSSUI/Utilities/HubViewState";
import { IVssIconProps } from "VSSUI/VssIcon";

export interface IProgressHubProps extends Base.IProps {
    releaseId: number;
    defaultPivot?: string;
}

export abstract class ProgressHub<P extends IProgressHubProps, S extends IProgressHubViewState> extends Component<P, S> {

    constructor(props) {
        super(props);
        this.viewStore = StoreManager.GetStore<ProgressHubViewStore>(ProgressHubViewStore);
        this.releaseActionsCreator = ActionCreatorManager.GetActionCreator<ReleaseActionCreator>(ReleaseActionCreator);
        let viewState: IProgressHubViewState = this.viewStore.getState();
        this.state = {
            ...this.viewStore.getState()
        } as Readonly<S>;

        if (this.props.defaultPivot) {
            const hubState: IHubViewStateOptions = {
                defaultPivot: this.props.defaultPivot
            };
            this._hubViewState = new HubViewState(hubState);
        } else {
            this._hubViewState = new HubViewState();
        }

        this._hubViewState.selectedPivot.subscribe(this._handleSelectedPivotChange);
        this.viewStore.addChangedListener(this._handleStoreChange);
    }

    public render(): JSX.Element {
        return (
            <Hub
                className="progress-hub"
                pivotHeaderAriaLabel={Resources.NavigationCommandHubLabel}
                hubViewState={this._hubViewState}
                pivotProviders={this._getPivotProviders()}
                showPivots={this._showPivots ? this._showPivots() : undefined}
                commands={this._getHubCommandItems()} >

                {this._getHubHeader()}
                {this._getPivotBarItems()}
                {this._getConfirmationDialogs()}
            </Hub>
        );
    }

    public componentWillMount() {
    }

    public componentDidMount() {
        this._setWindowTitle();
    }

    public componentWillUnmount() {
        this._hubViewState.selectedPivot.unsubscribe(this._handleSelectedPivotChange);
        this.viewStore.removeChangedListener(this._handleStoreChange);
        if (this._selectedEnvironmentActionsStore) {
            this._selectedEnvironmentActionsStore.removeChangedListener(this._onEnvironmentActionsChange);
        }
        super.componentWillUnmount();
    }

    private _handleSelectedPivotChange = (pivot: string) => {
        this.forceUpdate();
        this._onSelectedPivotChange(pivot);
    }

    protected _getHubHeader(): JSX.Element {
        return (
            <HubHeader />
        );
    }

    protected _getHubCommandItems(): IPivotBarAction[] {
        return [];
    }

    /**
     * This function is common for Release and env progress hub and returns the indicator of whether the variables tab is in error
     */
    protected _getVariableErrorIconProps() {
        return (
            (!this.state.isVariableTabValid) ?
                {
                    iconName: "Error",
                    className: "pivot-error-class"
                }
                : undefined
        );
    }

    protected _getPivotItemAriaLabel(pivotName: string, iconProp: IVssIconProps): string {
        let pivotItemLabel: string = null;
        if (iconProp && iconProp.iconName === "Error") {                       
            pivotItemLabel = localeFormat(DTCResources.PivotError, pivotName);
        }
        return pivotItemLabel;
    }


    protected _getSelectedPivot(): string {
        if (this._hubViewState && this._hubViewState.selectedPivot) {
            return this._hubViewState.selectedPivot.value;
        }

        return null;
    }

    protected _getRefreshReleaseCommandButton(): IPivotBarAction {
        let refreshPivotBarAction: IPivotBarAction = {
            key: ReleaseProgressContentKeys.RefreshReleaseActionKey,
            name: Resources.RefreshText,
            onClick: this._onRefreshReleaseClick,
            important: true,
            disabled: this.state.isEditMode,
            iconProps: { className: "bowtie-icon bowtie-navigate-refresh" }
        };

        return refreshPivotBarAction;
    }

    protected _getOpenInOldReleaseCommandButton(): IPivotBarAction[] {
        let openInOldReleaseView: IPivotBarAction[] = [];

        const oldHubEnabledOrShowButtonForNewHub = FeatureFlagUtils.isShowViewInOldReleaseViewNewHubEnabled() || FeatureFlagUtils.isOldReleasesHubEnabled();

        if (FeatureFlagUtils.isShowViewInOldReleaseViewEnabled()
            && oldHubEnabledOrShowButtonForNewHub
            && PermissionHelper.canNavigateToOldReleaseUI()) {
            openInOldReleaseView = [{
                key: ReleaseProgressContentKeys.OpenOldReleaseViewActionKey,
                name: Resources.ReleaseOldView,
                onClick: this._onOpenInOldReleaseView,
                important: true,
                disabled: false,
                iconProps: { className: "bowtie-icon bowtie-arrow-open" }
            }];
        }
        return openInOldReleaseView;
    }

    protected _getEditSaveCommandButtons(): IPivotBarAction[] {

        let commands: IPivotBarAction[] = [];

        if (this.state.showEditRelease) {

            if (!this.state.isEditMode) {

                let editPivotBarAction: IPivotBarAction = {
                    key: ReleaseProgressContentKeys.EditReleaseActionKey,
                    name: Resources.EditReleaseText,
                    title: this.state.isEditDisabled ? Resources.EditReleaseDisabledMessage : null,
                    onClick: this._onEditReleaseClick,
                    important: true,
                    disabled: this.state.isEditDisabled,
                    iconProps: { className: "bowtie-icon bowtie-edit" }
                };

                commands.push(editPivotBarAction);
            }
            else {

                let savePivotBarAction: IPivotBarAction = {
                    key: ReleaseProgressContentKeys.SaveReleaseActionKey,
                    name: Resources.SaveButtonText,
                    onClick: this._onSaveReleaseClick,
                    important: true,
                    disabled: !this.state.isDirty || !this.state.isValid,
                    iconProps: { className: "bowtie-icon bowtie-save" }
                };


                let discardPivotBarAction: IPivotBarAction = {
                    key: ReleaseProgressContentKeys.DiscardReleaseActionKey,
                    name: Resources.DiscardButtonText,
                    onClick: this._onDiscardReleaseClick,
                    important: true,
                    iconProps: { className: "bowtie-icon bowtie-status-no-fill" }
                };

                commands.push(savePivotBarAction);
                commands.push(discardPivotBarAction);
            }
        }

        return commands;
    }

    protected _publishVariablesTabClickedTelemetry = (progressView: string): void => {

        let eventProperties: IDictionaryStringTo<any> = {};

        eventProperties[Properties.progressView] = progressView;
        eventProperties[Properties.isEditMode] = this.viewStore.getState().isEditMode;

        Telemetry.instance().publishEvent(Feature.VariablesTabClick, eventProperties);
    }

    protected _onSelectedEnvironmentChange(selectedId: number): void {
        let actions;

        if (selectedId && EnvironmentActionsHelper.isEnvironment(selectedId)) {
            if (this._selectedEnvironmentActionsStore) {
                this._selectedEnvironmentActionsStore.removeChangedListener(this._onEnvironmentActionsChange);
            }
            this._selectedEnvironmentActionsStore = StoreManager.GetStore<ReleaseEnvironmentActionsStore>(
                ReleaseEnvironmentActionsStore,
                selectedId.toString()
            );
            this._selectedEnvironmentActionsStore.addChangedListener(this._onEnvironmentActionsChange);
            this._onEnvironmentActionsChange();
        }
        this.setState({
            selectedEnvironmentKey: selectedId
        });
    }

    private _onEnvironmentActionsChange = () => {
        if (this._selectedEnvironmentActionsStore) {
            const actions = this._selectedEnvironmentActionsStore.getActions();
            if (this._actionsProvider && actions) {
                for (let action of actions) {
                    action.onExecute = this._actionsProvider.getActionHandler(action);
                }
            }
            
            this.setState({
                actions: actions
            });
        }
    }

    private _onRefreshReleaseClick = () => {
        let eventProperties: IDictionaryStringTo<any> = this._getRefreshReleaseProperties();
        const feature: string = Feature.ReleaseProgressViewUserRefresh ? Feature.ReleaseProgressViewUserRefresh : "releaseProgressViewUserRefresh";
        Telemetry.instance().publishEvent(feature, eventProperties);

        this.releaseActionsCreator.hardRefreshRelease(this.viewStore.getReleaseId());
    }

    private _onEditReleaseClick = () => {
        this.releaseActionsCreator.editRelease(this.viewStore.getReleaseId());
    }

    private _onSaveReleaseClick = () => {
        this.releaseActionsCreator.toggleSaveDialogState({
            showDialog: true,
            isInProgress: false
        });
    }

    private _onDiscardReleaseClick = () => {
        if (this.state.isDirty) {
            this.releaseActionsCreator.toggleDiscardDialogState({
                showDialog: true,
                isInProgress: false
            });
        }
        else {
            //Discard without comfirmation since user has not changed anything
            this._discardChanges();
        }
    }

    private _onOpenInOldReleaseView = (): void => {

        const oldViewUrl: string = FeatureFlagUtils.isOldReleasesHubEnabled() ?
            ReleaseUrlUtils.getOldReleaseViewUrl(this.viewStore.getReleaseId()) :
            ReleaseUrlUtils.getCompatOldReleaseViewUrl(this.viewStore.getReleaseId());
        
        UrlUtilities.openInNewWindow(oldViewUrl, true);
        Telemetry.instance().publishEvent(Feature.OldReleaseView);
    }

    protected _getRefreshReleaseProperties(): IDictionaryStringTo<any> {

        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.ReleaseDefinitionId] = this.viewStore.getReleaseDefinitionId();
        eventProperties[Properties.ReleaseId] = this.viewStore.getReleaseId();
        eventProperties[Properties.EnvironmentId] = 0;
        eventProperties[Properties.selectedTab] = this._getSelectedPivot();
        return eventProperties;
    }

    protected _getConfirmationDialogs(): JSX.Element[] {
        let saveButtontext: string = this.state.isSaveInProgress ? Resources.SavingReleaseText : Resources.SaveButtonText;
        let discardButtonText: string = this.state.isDiscardInProgress ? Resources.DiscardingReleaseText : Resources.Discard;
        return (
            [<ConfirmationDialog
                key={Resources.ConfirmDiscardTitle}
                title={Resources.ConfirmDiscardTitle}
                okDisabled={this.state.isDiscardInProgress}
                subText={Resources.ConfirmDiscardReleaseText}
                onConfirm={this._discardChanges}
                showDialog={this.state.showDiscardDialog}
                onCancel={this._onDiscardDialogCancel}
                okButtonText={discardButtonText}
                skipCloseOnOkClick={true} />,

            <DialogWithMultiLineTextInput
                key={DTCResources.SaveButtonText}
                okButtonText={saveButtontext}
                okDisabled={this.state.isSaveInProgress}
                okButtonAriaLabel={saveButtontext}
                cancelButtonAriaLabel={DTCResources.CancelButtonText}
                cancelButtonText={DTCResources.CancelButtonText}
                titleText={DTCResources.SaveButtonText}
                multiLineInputLabel={DTCResources.CommentText}
                showDialog={this.state.showSaveDialog}
                onOkButtonClick={this._onConfirmSaveClick}
                onCancelButtonClick={this._hideSaveDialog}
                subText={Resources.SaveReleaseMessage}>
            </DialogWithMultiLineTextInput>]
        );
    }

    protected _publishActionTelemetry(action: string) {
        let feature: string = action;
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.ReleaseDefinitionId] = this.viewStore.getReleaseDefinitionId();
        eventProperties[Properties.ReleaseId] = this.viewStore.getReleaseId();

        Telemetry.instance().publishEvent(feature, eventProperties);
    }

    private _discardChanges = (): void => {
        let releaseId: number = this.viewStore.getReleaseId();
        this.releaseActionsCreator.discardRelease(releaseId);
        this.releaseActionsCreator.refreshRelease(releaseId);
    }

    private _onDiscardDialogCancel = (): void => {
        this.releaseActionsCreator.toggleDiscardDialogState({
            showDialog: false,
            isInProgress: false
        });
    }

    private _hideSaveDialog = () => {
        this.releaseActionsCreator.toggleSaveDialogState({
            isInProgress: false,
            showDialog: false
        });
    }

    private _setWindowTitle(): void {
        const releaseName = this.viewStore.getReleaseName();
        const releaseDefinitionName = this.viewStore.getReleaseDefinitionName();
        document.title = getDefaultPageTitle(format(Resources.WindowTitleFormat, releaseDefinitionName, releaseName));
    }

    private _handleStoreChange = () => {
        this._setState();
    }

    private _setState(): void {
        this.setState(this.viewStore.getState());
    }

    private _onConfirmSaveClick = (comment: string) => {
        const saveReleaseScenario = Performance.getScenarioManager().startScenario(CommonConstants.FeatureArea, PerfScenarios.SaveRelease);
        this.releaseActionsCreator.saveRelease(this.viewStore.getUpdatedRelease(), comment, this.viewStore.isVariableStoreDirty()).then(() => {
            saveReleaseScenario.end();
        }, (error) => {
            saveReleaseScenario.end();
        });
    }


    protected abstract _getPivotProviders(): ContributablePivotItemProvider<IExtensionContext>[];
    protected abstract _getPivotBarItems(): JSX.Element[];
    protected abstract _onSelectedPivotChange(pivot: string);

    protected release: RMContracts.Release;
    protected viewStore: ProgressHubViewStore;
    protected _selectedEnvironmentActionsStore: ReleaseEnvironmentActionsStore;
    protected _actionsProvider: IDeploymentActionsProvider;
    protected releaseActionsCreator: ReleaseActionCreator;
    protected _showPivots: () => boolean;
    private _hubViewState: IHubViewState;
}