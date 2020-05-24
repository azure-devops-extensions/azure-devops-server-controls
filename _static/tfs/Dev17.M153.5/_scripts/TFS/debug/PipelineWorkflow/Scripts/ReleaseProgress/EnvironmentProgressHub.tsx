import * as React from "react";

import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { SettingsManager } from "DistributedTaskControls/Common/SettingsManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { IStatus } from "DistributedTaskUI/Logs/Logs.Types";
import { UrlUtilities } from "DistributedTaskControls/Common/UrlUtilities";
import { Properties } from "DistributedTaskControls/Common/Telemetry";
import { VariablesTabSharedView } from "DistributedTaskControls/SharedViews/ContainerTabs/VariablesTab/VariablesTabSharedView";

import { css } from "OfficeFabric/Utilities";

import { ContributionIds } from "PipelineWorkflow/Scripts/Common/Constants";
import { NavigationStateUtils } from "PipelineWorkflow/Scripts/Common/NavigationStateUtils";
import { ProgressHubDeploymentActionsProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/ProgressHubDeploymentActionsProvider";
import { EnvironmentActionsHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/EnvironmentActionsHelper";
import { DeploymentCancel } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeploymentCancel";
import {
    BreadcrumbItem,
    ReleaseProgressNavigateStateActions,
    ReleaseSummaryEnvironmentTabsPivotItemKeys,
    ReleaseSettingsConstants
} from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ContainerTabWithMessage } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/ContainerTabWithMessage";
import { LogsTab } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTab";
import { LogsTabViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabViewStore";
import { TaskTab } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/TaskTab/TaskTab";
import { IProgressHubProps, ProgressHub } from "PipelineWorkflow/Scripts/ReleaseProgress/ProgressHub";
import { IProgressHubViewState } from "PipelineWorkflow/Scripts/ReleaseProgress/ProgressHubViewStore";
import { ReleaseDeploymentAttemptHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import {
    ReleaseEnvironmentStatusIndicator,
    ReleaseEnvironmentAction
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import {
    IReleaseHubDataProvider,
    ReleaseHubDataProvider,
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseHubDataProvider";
import { ReleaseStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import { ReleaseEnvironmentStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentStore";
import { ReleaseEnvironmentListStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironmentList/ReleaseEnvironmentListStore";
import { ContributionTelemetryUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ContributionTelemetryUtils";
import { ReleaseBreadcrumbUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ReleaseBreadcrumbUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { VariablesTabItemsUtils } from "PipelineWorkflow/Scripts/Shared/ContainerTabs/VariablesTab/VariablesTab";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { ReleaseEnvironmentStatusHelper } from "PipelineWorkflow/Scripts/Shared/Utils/ReleaseEnvironmentStatusHelper";
import { UIUtils } from "PipelineWorkflow/Scripts/Shared/Utils/UIUtils";

import * as RMContracts from "ReleaseManagement/Core/Contracts";
import { IReleaseEnvironmentExtensionContext } from "ReleaseManagement/Core/ExtensionContracts";

import * as NavigationService from "VSS/Navigation/Services";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_HTML from "VSS/Utils/Html";
import { ContributablePivotItemProvider } from "VSSPreview/Providers/ContributablePivotItemProvider";
import { IHeaderItemPicker, IHubBreadcrumbItem } from "VSSUI/Components/HubHeader/HubBreadcrumb.Props";
import { HubHeader, IHubHeaderProps } from "VSSUI/HubHeader";
import { IPivotBarAction, PivotBarItem } from "VSSUI/PivotBar";
import { ContributedItemArray } from "VSSUI/Utilities/ItemContribution";
import { ObservableValue } from "VSS/Core/Observable";
import { StatusSize, Statuses, Status, IStatusProps } from "VSSUI/Status";
import { TooltipHost } from "VSSUI/Tooltip";
import { VssIconType, IVssIconProps } from "VSSUI/VssIcon";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/EnvironmentProgressHub";

export interface IEnvironmentProgressHubProps extends IProgressHubProps {
    environmentId: number;
}

export class EnvironmentProgressHub extends ProgressHub<IEnvironmentProgressHubProps, IProgressHubViewState> {

    private _hubDataProvider: IReleaseHubDataProvider;

    constructor(props: IEnvironmentProgressHubProps) {
        super(props);
        this._releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        this._releaseEnvironmentStore = StoreManager.GetStore<ReleaseEnvironmentStore>(ReleaseEnvironmentStore, this.props.environmentId.toString());
        this._releaseEnvironmentStore.addChangedListener(this._handleEnvironmentStoreChange);
        this._hubDataProvider = new ReleaseHubDataProvider(this._getSelectedItem);
        this._actionsProvider = new ProgressHubDeploymentActionsProvider();
    }

    public componentWillMount() {
        super.componentWillMount();
        this._onSelectedEnvironmentChange(this.props.environmentId);
    }

    public componentWillUnmount() {
        this._releaseEnvironmentStore.removeChangedListener(this._handleEnvironmentStoreChange);
        super.componentWillUnmount();
    }

    public componentDidMount() {
        ContributionTelemetryUtils.publishReleaseProgressContributionTelemetry(ContributionIds.ReleaseEnvironmentPivotContributionId);
        super.componentDidMount();
    }

    protected _getPivotProviders(): ContributablePivotItemProvider<IReleaseEnvironmentExtensionContext>[] {
        if (!this._contributedPivotItemProviders) {
            this._contributedPivotItemProviders = [
                this._hubDataProvider.getReleaseEnvironmentContextPivotItemProvider(ContributionIds.ReleaseEnvironmentPivotContributionId)
            ];
        }
        return this._contributedPivotItemProviders;
    }

    protected _getPivotBarItems(): JSX.Element[] {
        let pivotItems: JSX.Element[] = [];
        const canViewReleaseTaskEditor = PermissionHelper.hasViewReleaseTaskEditorPermission();

        let isEnvironmentWorkflowValid: boolean = this._releaseEnvironmentStore.isEnvironmentWorkflowValid();
        pivotItems.push(this._getPipeLineItem());

        if (canViewReleaseTaskEditor) {
            pivotItems.push(this._getTaskItem(isEnvironmentWorkflowValid));
        }

        pivotItems.push(this._getVariablesItem());

        pivotItems.push(this._getLogsItem());
        return pivotItems;
    }

    protected _getHubHeader(): JSX.Element {
        const hubHeaderProps: IHubHeaderProps = ReleaseBreadcrumbUtils.getHubHeaderProperties(this._getHeaderItemPicker(),
            this._getBreadcrumbItems(this.props.releaseId));
        return (<HubHeader {...hubHeaderProps}>
            {this._getEnvironmentBadge()}
        </HubHeader>);
    }

    protected _getConfirmationDialogs(): JSX.Element[] {
        let dialogs = [];
        dialogs = super._getConfirmationDialogs();
        dialogs = dialogs.concat(
            <DeploymentCancel
                onDeploymentCancelCompleted={null}
                instanceId={this.state.selectedEnvironmentKey.toString()}
                key={this.state.selectedEnvironmentKey.toString()} />
        );
        return dialogs;
    }

    protected _getRefreshReleaseProperties(): IDictionaryStringTo<any> {
        let eventProperties: IDictionaryStringTo<any> = super._getRefreshReleaseProperties();
        eventProperties[Properties.EnvironmentId] = this.props.environmentId;
        return eventProperties;
    }

    private _handleEnvironmentStoreChange = (): void => {
        this.setState(this.viewStore.getState());
    }

    private _getEnvironmentBadge(): JSX.Element {
        const environment = this._getSelectedItem();
        const status = this._getEnvironmentStatus(environment);

        return (status && status.statusProps) ?
            <Status
                {...status.statusProps}
                size={StatusSize.l}
                text={status.status}
                className="cd-environment-status-badge"
            /> : null;
    }

    private _getReleaseEnvironmentContributedCommandItems(): ContributedItemArray<IPivotBarAction, IPivotBarAction> {
        const provider = this._hubDataProvider.getReleaseEnvironmentContextPivotActionProvider(ContributionIds.ReleaseEnvironmentEditorToolbarMenuContributionId);

        return new ContributedItemArray<IPivotBarAction, IPivotBarAction>(provider, (item: IPivotBarAction) => {
            return JQueryWrapper.extend(item, { important: true });
        });
    }

    protected _onSelectedPivotChange(pivot: string): void {

        const releaseId = NavigationStateUtils.getReleaseId();
        const environmentId = NavigationStateUtils.getEnvironmentId();
        switch (pivot) {
            case ReleaseSummaryEnvironmentTabsPivotItemKeys.c_pipeLineItemKey:
                NavigationService.getHistoryService().addHistoryPoint(
                    ReleaseProgressNavigateStateActions.ReleasePipelineProgress,
                    { releaseId: releaseId }, null, false, false);
                break;

            case ReleaseSummaryEnvironmentTabsPivotItemKeys.c_taskPivotItemKey:
                NavigationService.getHistoryService().addHistoryPoint(
                    ReleaseProgressNavigateStateActions.ReleaseTaskEditor,
                    { releaseId: releaseId, environmentId: environmentId }, null, false, false);
                break;

            case ReleaseSummaryEnvironmentTabsPivotItemKeys.c_logsPivotItemKey:
                NavigationService.getHistoryService().addHistoryPoint(
                    ReleaseProgressNavigateStateActions.ReleaseEnvironmentLogs,
                    { releaseId: releaseId, environmentId: environmentId }, null, false, false);
                break;
            case ReleaseSummaryEnvironmentTabsPivotItemKeys.c_variablePivotItemKey:
                NavigationService.getHistoryService().addHistoryPoint(
                    ReleaseProgressNavigateStateActions.ReleaseEnvironmentVariables,
                    { releaseId: releaseId, environmentId: environmentId }, null, false, false);
                break;
            default:
                // This assumes that unknown pivot is an extension.
                NavigationService.getHistoryService().addHistoryPoint(
                    ReleaseProgressNavigateStateActions.ReleaseEnvironmentExtension,
                    { releaseId: releaseId, environmentId: environmentId, extensionId: pivot }, null, false, false);
                break;
        }
    }


    protected _getHubCommandItems(): IPivotBarAction[] {
        let commands: IPivotBarAction[] = [];

        if (!this.state.isEditMode) {
            let environmentActionsHelper = new EnvironmentActionsHelper();
            commands = commands.concat(environmentActionsHelper.getActions(
                this.state.selectedEnvironmentKey ? this.state.selectedEnvironmentKey.toString() : Utils_String.empty,
                this.state.actions,
                this.props.instanceId,
                false,
                this.state.isDeployPermissible,
                false));
        }

        if (!this.state.isEditMode) {
            commands.push(this._getRefreshReleaseCommandButton());
        }

        const selectedPivot: string = this._getSelectedPivot();
        if (selectedPivot === ReleaseSummaryEnvironmentTabsPivotItemKeys.c_logsPivotItemKey) {
            let downloadAllLogs: IPivotBarAction = {
                key: EnvironmentProgressHub._downloadAllLogsKey,
                name: Resources.DownloadAllLogsText,
                onClick: this._onDownloadAllLogsClick,
                important: true,
                disabled: this._isDownloadLogsDisabled(),
                iconProps: { className: "bowtie-icon bowtie-transfer-download" }
            };
            commands.push(downloadAllLogs);
        }

        commands = commands.concat(this._getOpenInOldReleaseCommandButton(), ...this._getEditSaveCommandButtons());
        return commands;
    }

    private _onDownloadAllLogsClick = () => {
        const downloadAllLogsUrl: string = this._releaseStore.getLogsContainerUrl();
        if (downloadAllLogsUrl && downloadAllLogsUrl.length > 0) {
            UrlUtilities.openInNewWindow(downloadAllLogsUrl, true);
        }
    }

    private _isDownloadLogsDisabled(): boolean {
        let isDisabled: boolean = this.viewStore.hasReleaseNotStarted();
        const environment = this._getSelectedItem();
        if (environment && !isDisabled) {
            const attempts = environment.deploySteps;
            const latestAttempt = ReleaseDeploymentAttemptHelper.getLatestDeploymentAttempt(attempts);
            const state: RMContracts.DeploymentStatus = latestAttempt ? latestAttempt.status : RMContracts.DeploymentStatus.NotDeployed;
            if (state === RMContracts.DeploymentStatus.NotDeployed || state === RMContracts.DeploymentStatus.Undefined) {
                isDisabled = true;
            }
        }
        return isDisabled;
    }

    private _getTaskItem(isEnvironmentWorkflowValid: boolean): JSX.Element {
        let iconProp: IVssIconProps = this._getTaskTabIconProp(isEnvironmentWorkflowValid);
        let pivotItemLabel: string = this._getPivotItemAriaLabel(Resources.TasksTabItemTitle, iconProp);
        return (
            <PivotBarItem
                className="customPadding"
                name={Resources.TasksTabItemTitle}
                ariaLabel={pivotItemLabel}
                key={ReleaseSummaryEnvironmentTabsPivotItemKeys.c_taskPivotItemKey}
                itemKey={ReleaseSummaryEnvironmentTabsPivotItemKeys.c_taskPivotItemKey}
                commands={this._getReleaseEnvironmentContributedCommandItems()}
                iconProps={iconProp}>

                <ContainerTabWithMessage
                    isEditMode={this.state.isEditMode}
                    infoMessage={this.state.showinfoMessage ? Utils_HTML.HtmlNormalizer.normalize(Utils_String.format(Resources.EditReleaseInfoBar)) : null}
                    onDismiss={this._onDismiss}
                    errorMessage={this.state.error && this.state.error.errorMessage}
                    errorStatusCode={this.state.error && this.state.error.errorStatusCode}>

                    <TaskTab instanceId={this.props.instanceId} />

                </ContainerTabWithMessage>

            </PivotBarItem>
        );
    }

    private _getVariablesItem(): JSX.Element {
        let iconProps = this._getVariableErrorIconProps();
        let pivotItemLabel: string = this._getPivotItemAriaLabel(Resources.VariablesTabItemTitle, iconProps);
        return (
            <PivotBarItem
                className="customPadding variables-pivot-container"
                name={Resources.VariablesTabItemTitle}
                ariaLabel={pivotItemLabel}
                iconProps={iconProps}
                key={ReleaseSummaryEnvironmentTabsPivotItemKeys.c_variablePivotItemKey}
                itemKey={ReleaseSummaryEnvironmentTabsPivotItemKeys.c_variablePivotItemKey} >

                <ContainerTabWithMessage
                    isEditMode={this.state.isEditMode}
                    infoMessage={this.state.showinfoMessage ? Utils_HTML.HtmlNormalizer.normalize(Utils_String.format(Resources.EditReleaseInfoBar)) : null}
                    onDismiss={this._onDismiss}
                    errorMessage={this.state.error && this.state.error.errorMessage}
                    errorStatusCode={this.state.error && this.state.error.errorStatusCode}>

                    <VariablesTabSharedView
                        leftFooter={VariablesTabItemsUtils.getPreDefinedLinkComponent()}
                        defaultItems={VariablesTabItemsUtils.getVariablesTabItems(this.props.environmentId, !this.state.hasVariableGroups, false)}
                        onPublishTelemetry={this._publishEnvironmentVariablesTabClickedTelemetry} />

                </ContainerTabWithMessage>

            </PivotBarItem>
        );
    }

    private _onDismiss = (): void => {
        SettingsManager.instance().setSetting<boolean>(ReleaseSettingsConstants.PathPrefix + ReleaseSettingsConstants.IsEditReleaseInfoBarDismissedKey, true);
        this._setInfoMessageState();
    }

    private _setInfoMessageState(): void {
        this.setState({
            showinfoMessage: !SettingsManager.instance().getSetting<boolean>(ReleaseSettingsConstants.PathPrefix + ReleaseSettingsConstants.IsEditReleaseInfoBarDismissedKey)
        });
    }

    private _getLogsItem(): JSX.Element {
        return (
            <PivotBarItem
                className="customPadding"
                name={Resources.LogsTabItemTitle}
                key={ReleaseSummaryEnvironmentTabsPivotItemKeys.c_logsPivotItemKey}
                itemKey={ReleaseSummaryEnvironmentTabsPivotItemKeys.c_logsPivotItemKey}>

                <ContainerTabWithMessage
                    isEditMode={this.state.isEditMode}
                    errorMessage={this.state.error && this.state.error.errorMessage}
                    errorStatusCode={this.state.error && this.state.error.errorStatusCode}>

                    <LogsTab
                        key={this.props.instanceId}
                        store={StoreManager.GetStore<LogsTabViewStore>(LogsTabViewStore, this.props.instanceId)}
                        instanceId={this.props.instanceId}
                        releaseId={this.props.releaseId}
                        isEditMode={this.state.isEditMode}
                    />

                </ContainerTabWithMessage>

            </PivotBarItem>
        );
    }

    private _getPipeLineItem(): JSX.Element {
        let iconClassName: IVssIconProps = this._getPipelineItemIcon();
        let pivotItemLabel: string = this._getPivotItemAriaLabel(Resources.CanvasTabTitle, iconClassName);

        return (
            <PivotBarItem
                className="customPadding"
                name={Resources.CanvasTabTitle}
                ariaLabel={pivotItemLabel}
                key={ReleaseSummaryEnvironmentTabsPivotItemKeys.c_pipeLineItemKey}
                itemKey={ReleaseSummaryEnvironmentTabsPivotItemKeys.c_pipeLineItemKey}
                iconProps={this._getPipelineItemIcon()}>
            </PivotBarItem>
        );
    }

    private _getPipelineItemIcon(): IVssIconProps {
        let iconProp: IVssIconProps = { iconName: "Back", iconType: VssIconType.fabric };

        if (this.state.isEditMode) {
            let releaseEnvironmentListStore = StoreManager.GetStore<ReleaseEnvironmentListStore>(ReleaseEnvironmentListStore);

            let areAllOtherEnvironmentsValid: boolean = true;
            let releaseEnvironmentList = releaseEnvironmentListStore.getDataStoreList();
            releaseEnvironmentList.forEach((releaseEnvironment) => {
                if (releaseEnvironment.getEnvironment().id !== this.props.environmentId && !releaseEnvironment.isValid()) {
                    areAllOtherEnvironmentsValid = false;
                    return;
                }
            });

            if (!areAllOtherEnvironmentsValid || !this._releaseEnvironmentStore.areApprovalsValid()) {
                iconProp = {
                    iconName: "Error",
                    className: "environment-hub-error-icon"
                };
            }
        }
        return iconProp;
    }

    private _getTaskTabIconProp(isEnvironmentWorkflowValid: boolean): IVssIconProps {
        let iconProp: IVssIconProps;
        if (this.state.isEditMode && !isEnvironmentWorkflowValid) {
            iconProp = {
                iconName: "Error",
                className: "environment-hub-error-icon"
            };
        }
        return iconProp;
    }

    private _getHeaderItemPicker(): IHeaderItemPicker {
        return {
            isDropdownVisible: new ObservableValue<boolean>(true),
            selectedItem: this._getSelectedItem(),
            getItems: () => this._getItems(),
            getListItem: (item: RMContracts.ReleaseEnvironment) => ({ name: item.name, key: item.id.toString() }),
            onSelectedItemChanged: this._onSelectedItemChanged,
            dropdownIndicators: [{
                getItemIndicator: ((environment: RMContracts.ReleaseEnvironment) => {
                    let status: IStatus;
                    if (!this.state.isEditMode) {
                        status = this._getEnvironmentStatus(environment);
                    }
                    else {
                        let releaseEnvironmentStore: ReleaseEnvironmentStore = StoreManager.GetStore<ReleaseEnvironmentStore>(ReleaseEnvironmentStore, environment.id.toString());
                        if (releaseEnvironmentStore && !releaseEnvironmentStore.isEnvironmentWorkflowValid()) {
                            status = {
                                status: Resources.ErrorText,
                                statusProps: Statuses.Warning
                            } as IStatus;
                        }
                    }

                    if (status && status.statusProps) {
                        return {
                            onRender: () => {
                                return (
                                    <TooltipHost hostClassName="vss-ItemIndicator" content={status.status}>
                                        <Status {...status.statusProps} className="environment-breadcrumb-status-icon" size={StatusSize.s} />
                                    </TooltipHost>
                                );
                            }
                        };
                    }
                })
            }]
        };
    }

    private _getEnvironmentStatus(environment: RMContracts.ReleaseEnvironment): IStatus {
        let status: IStatus = null;

        if (environment) {
            let releaseEnvironmentStore: ReleaseEnvironmentStore = StoreManager.GetStore<ReleaseEnvironmentStore>(ReleaseEnvironmentStore, environment.id.toString());
            const statusInfo = releaseEnvironmentStore.getStatusInfo();
            const statusIndicator = statusInfo.statusIndicator || ReleaseEnvironmentStatusIndicator.Pending;
            let statusProps = ReleaseEnvironmentStatusHelper.getStatusIconProps(statusIndicator);
            status = {
                statusProps: statusProps,
                status: statusInfo.statusText
            } as IStatus;
        }

        return status;
    }

    private _getSelectedItem = (): RMContracts.ReleaseEnvironment => {
        let selectedEnvironment: RMContracts.ReleaseEnvironment;
        let release: RMContracts.Release = this.state.release;
        if (release && release.environments) {
            // By default select first environment
            selectedEnvironment = release.environments[0];
            release.environments.some((environment) => {
                if (environment.id === this.props.environmentId) {
                    let updatedEnvironment = this._releaseEnvironmentStore && this._releaseEnvironmentStore.getEnvironment();
                    selectedEnvironment = updatedEnvironment || environment;
                    return true;
                }
            });
        }

        return selectedEnvironment;
    }

    private _getItems(): RMContracts.ReleaseEnvironment[] {
        let environments: RMContracts.ReleaseEnvironment[] = [];
        let release: RMContracts.Release = this.viewStore.getRelease();
        if (release && release.environments) {
            environments = release.environments;
        }
        return environments;
    }

    private _getBreadcrumbItems(releaseId: number): IHubBreadcrumbItem[] {
        const breadcrumbItems: IHubBreadcrumbItem[] = ReleaseBreadcrumbUtils.getBreadcrumbItems(this.viewStore.getRelease(), true);
        return breadcrumbItems;
    }

    private _onSelectedItemChanged = (selectedItem: RMContracts.ReleaseEnvironment) => {
        this._navigateToEnvironment(selectedItem.id);
    }

    protected _publishEnvironmentVariablesTabClickedTelemetry = (): void => {
        this._publishVariablesTabClickedTelemetry(UIUtils.EnvironmentProgressView);
    }

    protected _onSelectedEnvironmentChange(selectedId: number): void {
        super._onSelectedEnvironmentChange(selectedId);
        const isDeployPermissible = this._selectedEnvironmentActionsStore.isActionPermissible([ReleaseEnvironmentAction.Deploy, ReleaseEnvironmentAction.Redeploy]);
        this.setState({
            isDeployPermissible: isDeployPermissible
        });

    }

    private _navigateToEnvironment = (environmentId: number) => {
        this._onSelectedEnvironmentChange(environmentId);

        const action = NavigationStateUtils.getAction();
        NavigationService.getHistoryService().addHistoryPoint(action || ReleaseProgressNavigateStateActions.ReleaseEnvironmentLogs, { environmentId: environmentId }, null, false, true);
        ReleaseBreadcrumbUtils.publishBreadcrumbTelemetry(BreadcrumbItem.environmentPicker);
    }

    private _contributedPivotItemProviders: ContributablePivotItemProvider<IReleaseEnvironmentExtensionContext>[];
    private static _downloadAllLogsKey = "download-all-logs";
    private _releaseEnvironmentStore: ReleaseEnvironmentStore;
    private _releaseStore: ReleaseStore;
}
