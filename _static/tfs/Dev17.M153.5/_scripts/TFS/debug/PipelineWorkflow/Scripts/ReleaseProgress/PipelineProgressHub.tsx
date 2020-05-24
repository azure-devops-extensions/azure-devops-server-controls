import * as React from "react";
import * as Q from "q";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { SettingsManager } from "DistributedTaskControls/Common/SettingsManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import { VariablesTabSharedView } from "DistributedTaskControls/SharedViews/ContainerTabs/VariablesTab/VariablesTabSharedView";
import { Store as ItemSelectionStore, IOptions } from "DistributedTaskControls/Stores/ItemSelectionStore";
import { Feature } from "DistributedTaskControls/Common/Telemetry";

import { Callout, DirectionalHint } from "OfficeFabric/Callout";
import { Link } from "OfficeFabric/Link";
import { TooltipHost } from "VSSUI/Tooltip";
import { SpinnerSize } from "OfficeFabric/Spinner";
import { AnimationClassNames } from "OfficeFabric/Styling";
import { Async } from "OfficeFabric/Utilities";

import { ContributionIds, NavigationConstants } from "PipelineWorkflow/Scripts/Common/Constants";
import { NavigationStateUtils } from "PipelineWorkflow/Scripts/Common/NavigationStateUtils";
import { CanvasDeploymentActionsProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/CanvasDeploymentActionsProvider";
import { EnvironmentActionsHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/EnvironmentActionsHelper";
import { ReleaseEnvironmentActionsStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentActionsStore";
import {
    BreadcrumbItem,
    CanvasSelectorConstants,
    ReleaseProgressNavigateStateActions,
    ReleaseSettingsConstants,
    ReleaseSummaryPivotItemKeys
} from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseCanvasTab } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/CanvasTab/ReleaseCanvasTab";
import { ContainerTabWithMessage } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/ContainerTabWithMessage";
import { DeploymentAttemptActions } from "PipelineWorkflow/Scripts/ReleaseProgress/DeploymentAttempt/DeploymentAttemptActions";
import { HistoryTab } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/HistoryTab/HistoryTab";
import { ReleaseProgressHelpDialog } from "PipelineWorkflow/Scripts/ReleaseProgress/Help/ReleaseProgressHelpDialog";
import { IProgressHubProps, ProgressHub } from "PipelineWorkflow/Scripts/ReleaseProgress/ProgressHub";
import { IProgressHubViewState, ProgressHubViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ProgressHubViewStore";
import { ReleaseActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseActionCreator";
import { ReleaseStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import { ContributionTelemetryUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ContributionTelemetryUtils";
import { ReleaseBreadcrumbUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ReleaseBreadcrumbUtils";
import { ReleaseUrlUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ReleaseUrlUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { VariablesTabItemsUtils } from "PipelineWorkflow/Scripts/Shared/ContainerTabs/VariablesTab/VariablesTab";
import { renderAbandonReleaseDialog } from "PipelineWorkflow/Scripts/SharedComponents/Dialogs/AbandonReleaseDialog";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";

import { UIUtils } from "PipelineWorkflow/Scripts/Shared/Utils/UIUtils";
import { DefinitionsUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/DefinitionsUtils";
import { Source } from "PipelineWorkflow/Scripts/Definitions/Utils/TelemetryUtils";
import * as RMContracts from "ReleaseManagement/Core/Contracts";
import { IReleaseExtensionContext } from "ReleaseManagement/Core/ExtensionContracts";

import { Contribution } from "VSS/Contributions/Contracts";
import { HubsService } from "VSS/Navigation/HubsService";
import * as NavigationService from "VSS/Navigation/Services";
import * as Service from "VSS/Service";
import { getService as getUserClaimsService, UserClaims } from "VSS/User/Services";
import { delay } from "VSS/Utils/Core";
import { HtmlNormalizer } from "VSS/Utils/Html";
import * as Utils_String from "VSS/Utils/String";

import { ContributablePivotBarActionProvider } from "VSSPreview/Providers/ContributablePivotBarActionProvider";
import { ContributablePivotItemProvider } from "VSSPreview/Providers/ContributablePivotItemProvider";

import { IHeaderItemPicker } from "VSSUI/Components/HubHeader/HubBreadcrumb.Props";
import { HubHeader, IHubHeaderProps } from "VSSUI/HubHeader";
import { IPivotBarAction, PivotBarItem } from "VSSUI/PivotBar";
import { ContributedItemArray } from "VSSUI/Utilities/ItemContribution";
import { ObservableValue } from "VSS/Core/Observable";
import { Status, Statuses, StatusSize } from "VSSUI/Status";
import { VssIconType, IVssIconProps } from "VSSUI/VssIcon";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/PipelineProgressHub";

export interface IPipelineProgressHubState extends IProgressHubViewState {
    showHelpDialog?: boolean;
    isHelpCalloutVisible?: boolean;
    isAllTabsSeen?: boolean;
}

export class PipelineProgressHub extends ProgressHub<IProgressHubProps, IPipelineProgressHubState> {

    constructor(props) {
        super(props);
        this._releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        this._actionsProvider = new CanvasDeploymentActionsProvider();
    }

    public componentWillMount() {
        super.componentWillMount();

        this._isFirstRun = false;

        if (FeatureFlagUtils.isReleaseProgressFirstRunHelpLinkEnabled() && PermissionHelper.canShowFirstRunExperience()) {
            this._isFirstRun = !SettingsManager.instance().getSetting<boolean>(ReleaseSettingsConstants.PathPrefix + ReleaseSettingsConstants.IsFRECompletedKey);
        }

        this.setState({
            showHelpDialog: this._isFirstRun,
            isHelpCalloutVisible: false
        });
    }

    public componentDidMount() {
        ContributionTelemetryUtils.publishReleaseProgressContributionTelemetry(ContributionIds.ReleaseEditorToolbarMenuContributionId);
        this._resetSelectedAttemptForAllEnvironments();
        this._setSelectedEnvironment();
        this._setMultipleActionsPermissibility();
        super.componentDidMount();
    }

    public componentWillUnmount() {
        if (this._itemSelectionStore) {
            this._itemSelectionStore.removeChangedListener(this._onSelectedItemChange);
        }

        if (this._allEnvironmentsActionsStores) {
            for (let actionsStore of this._allEnvironmentsActionsStores) {
                actionsStore.removeChangedListener(this._onEnvironmentsStateChange);
            }

            this._releaseStore.removeChangedListener(this._onReleaseStateChange);
        }

        if (this._async) {
            this._async.dispose();
        }

        super.componentWillUnmount();
    }

    private _resetSelectedAttemptForAllEnvironments() {
        let deploymentAttemptListActions = ActionsHubManager.GetAllActionsHub<DeploymentAttemptActions>(DeploymentAttemptActions);
        for (const action of deploymentAttemptListActions) {
            action.resetSelectedAttempt.invoke({});
        }
    }

    private _setSelectedEnvironment() {
        const selectedPivot: string = this._getSelectedPivot();

        //this will be done only once, either on the first load, or on the tab switch to the pipeline tab
        if (selectedPivot === PipelineProgressHub.c_pipelinePivotItemKey && !this._itemSelectionStore) {
            this._itemSelectionStore = StoreManager.GetStore<ItemSelectionStore>(ItemSelectionStore, CanvasSelectorConstants.ReleaseCanvasSelectorInstance);
            this._itemSelectionStore.addChangedListener(this._onSelectedItemChange);
            this._onSelectedItemChange();
        }
    }

    private _setMultipleActionsPermissibility() {
        const selectedPivot: string = this._getSelectedPivot();

        if (selectedPivot === PipelineProgressHub.c_pipelinePivotItemKey && !this._allEnvironmentsActionsStores) {
            let isDeployPossible = false;
            this._allEnvironmentsActionsStores = [];

            //we need to iterate because unselected environments can be deployed, and it needs to change with any environment state change.
            //it has been optimized to prevent reloading if the disabled state has not changed.
            for (let environment of this._releaseStore.getRelease().environments) {
                let actionsStore = StoreManager.GetStore<ReleaseEnvironmentActionsStore>(
                    ReleaseEnvironmentActionsStore,
                    environment.id.toString()
                );
                actionsStore.addChangedListener(this._onEnvironmentsStateChange);
                this._allEnvironmentsActionsStores.push(actionsStore);
            }
            this._onEnvironmentsStateChange();

            this._releaseStore.addChangedListener(this._onReleaseStateChange);
            this._onReleaseStateChange();
        }
    }

    private _onEnvironmentsStateChange = () => {
        let isDeployPermissible = EnvironmentActionsHelper.isDeployActionPresent();
        let isApprovePermissible = EnvironmentActionsHelper.isApproveActionPresent();

        if (isDeployPermissible !== this.state.isDeployPermissible || isApprovePermissible !== this.state.isApprovePermissible) {
            this.setState({
                isDeployPermissible: isDeployPermissible,
                isApprovePermissible: isApprovePermissible
            });
        }
    }

    private _onReleaseStateChange = () => {
        let isManageReleasePermissible = this._releaseStore.hasManageReleasePermission();
        if (isManageReleasePermissible !== this.state.isManageReleasePermissible) {
            this.setState({
                isManageReleasePermissible: isManageReleasePermissible
            });
        }
    }


    private _onSelectedItemChange = () => {
        const selectedItem = this._itemSelectionStore.getSelectedItem();
        let selectedId;
        let actions;
        if (selectedItem && selectedItem.getInstanceId) {
            const instanceId = selectedItem.getInstanceId();
            selectedId = parseInt(instanceId);
            this._onSelectedEnvironmentChange(selectedId);
        }
    }


    protected _getPivotProviders(): ContributablePivotItemProvider<IReleaseExtensionContext>[] {
        if (!this._contributedPivotItemProviders) {
            this._contributedPivotItemProviders = [];
            this._contributedPivotItemProviders.push(new ContributablePivotItemProvider<IReleaseExtensionContext>(
                [ContributionIds.ReleasePivotContributionId],
                this._getExtensionContext,
                {
                    loadingComponent: () => <LoadingComponent className="cd-contributed-pivot-loading-component" ariaLabel={Resources.Loading} size={SpinnerSize.large} />
                }
            ));
        }
        return this._contributedPivotItemProviders;
    }

    protected _getPivotBarItems(): JSX.Element[] {
        let pivotItems: JSX.Element[] = [];
        pivotItems.push(this._getPipelineItem());

        pivotItems.push(this._getVariablesItem());

        const canViewReleaseHistory = PermissionHelper.hasViewReleaseHistoryPermission();
        if (canViewReleaseHistory) {
            pivotItems.push(this._getHistoryItem());
        }

        return pivotItems;
    }

    protected _getHubHeader(): JSX.Element {
        const hubHeaderProps: IHubHeaderProps = ReleaseBreadcrumbUtils.getHubHeaderProperties(this._getHeaderItemPicker(),
            ReleaseBreadcrumbUtils.getBreadcrumbItems(this.viewStore.getRelease()));
        return (
            <HubHeader {...hubHeaderProps}>
                {this._getReleaseBadge()}
                {FeatureFlagUtils.isReleaseProgressFirstRunHelpLinkEnabled() && this._getHelpLink()}
            </HubHeader>
        );
    }

    private _getHelpLink = (): JSX.Element => {
        return (
            <div className="release-progress-help-button-container" ref={this._resolveRef("_helpLinkReference")}>
                {
                    this._getHelpLinkComponent()
                }
                {
                    this.state.isHelpCalloutVisible &&
                    <Callout
                        className={AnimationClassNames.fadeIn500}
                        target={this._helpLinkReference}
                        onDismiss={this._onHelpCalloutDismiss}>
                        {
                            this._getHelpCalloutContent()
                        }
                    </Callout>
                }
                {
                    this.state.showHelpDialog && <ReleaseProgressHelpDialog onClose={this._toggleHelpDialog} />
                }
            </div>
        );
    }

    private _getHelpLinkComponent = (): JSX.Element => {
        return <Link onClick={this._onHelpLinkClick} aria-label={Resources.FirstRunGuideForReleaseProgressHelpText}>
            <span className="release-progress-help-icon bowtie-icon bowtie-status-help-outline"></span>
            <span>{Resources.Help}</span>
        </Link>;
    }

    private _onHelpLinkClick = (): void => {
        if (this._isFirstRun) {
            if (PermissionHelper.canShowFirstRunExperience()) {
                this._isFirstRun = !SettingsManager.instance().getSetting<boolean>(ReleaseSettingsConstants.PathPrefix + ReleaseSettingsConstants.IsFRECompletedKey);
            }
        }
        this._toggleHelpDialog();
    }

    private _getHelpCalloutContent = (): JSX.Element => {

        let whatsNewText = `<strong>${Resources.WhatsNew}</strong>`;
        let secondaryTextHTML = Utils_String.format(Resources.ReleaseHelpCalloutSecondaryText, whatsNewText);

        return (
            <div className="release-progress-help-button-tooltip-content">
                <div className="primary-text">
                    {
                        this.state.isAllTabsSeen ? Resources.ReleaseHelpCalloutCompletePrimaryText : Resources.ReleaseHelpCalloutIncompletePrimaryText
                    }
                </div>
                {
                    /* tslint:disable:react-no-dangerous-html */
                    <div className="secondary-text" dangerouslySetInnerHTML={{ __html: HtmlNormalizer.sanitize(secondaryTextHTML) }}>
                    </div>
                    /* tslint:enable:react-no-dangerous-html */
                }

            </div>
        );
    }

    private _onHelpCalloutDismiss = (): void => {
        this.setState({
            isHelpCalloutVisible: false
        });
    }

    private _getReleaseBadge(): JSX.Element {
        const release = this._getSelectedItem();

        if (release && release.status === RMContracts.ReleaseStatus.Abandoned) {
            return <Status
                {...Statuses.Canceled}
                size={StatusSize.l}
                text={Resources.AbandonedText}
                className="cd-release-status-abandoned-badge"
            />;
        }

        return null;
    }


    protected _getHubCommandItems(): IPivotBarAction[] {
        let commands: IPivotBarAction[] = [];

        const selectedPivot: string = this._getSelectedPivot();
        if (selectedPivot === PipelineProgressHub.c_pipelinePivotItemKey && !this.state.isEditMode) {
            let environmentActionsHelper = new EnvironmentActionsHelper();
            commands = commands.concat(environmentActionsHelper.getActions(
                this.state.selectedEnvironmentKey ? this.state.selectedEnvironmentKey.toString() : Utils_String.empty,
                this.state.actions,
                this.props.instanceId,
                true,
                this.state.isDeployPermissible,
                this.state.isApprovePermissible));
        }

        if (!this.state.isEditMode) {
            commands.push(this._getRefreshReleaseCommandButton());
        }

        commands = commands.concat(this._getOpenInOldReleaseCommandButton(),
            this._getEditSaveCommandButtons(),
            this._getViewPipelineButton(),
            this._getAbandonCommandButton());
        return commands;
    }

    private _getViewPipelineButton(): IPivotBarAction[] {
        let viewPipelineCommand: IPivotBarAction[] = [];

        const pipelineFolderPath = this._releaseStore.getReleaseDefinitionFolderPath();
        const pipelineId = this._releaseStore.getReleaseDefinitionId();
        const canEditPipeline = PermissionHelper.hasEditDefinitionPermission(pipelineFolderPath, pipelineId);
        const canViewPipeline = PermissionHelper.hasViewDefinitionPermission(pipelineFolderPath, pipelineId);

        if (canViewPipeline) {
            const commandName = canEditPipeline ? Resources.EditRdCommandBarMenuText : Resources.ViewRdCommandBarItemText;
            const iconProps: IVssIconProps = canEditPipeline
                ? { className: "bowtie-icon bowtie-edit" }
                : { iconName: "EntryView", iconType: VssIconType.fabric };

            viewPipelineCommand = [{
                key: "edit-view-pipeline-action",
                name: commandName,
                iconProps: iconProps,
                disabled: false,
                important: false,
                onClick: this._onViewPipeline
            }];
        }

        return viewPipelineCommand;
    }


    private _getAbandonCommandButton(): IPivotBarAction[] {
        let abandonCommand: IPivotBarAction[] = [];
        if (!this.state.isEditMode && this._releaseStore.canAbandonRelease()) {
            abandonCommand = [{
                key: "abandon-action",
                name: Resources.AbandonText,
                iconProps: { iconName: "Blocked" },
                important: false,
                disabled: !this.state.isManageReleasePermissible,
                onClick: this._onAbandon
            }];
        }
        return abandonCommand;
    }

    private _getReleasePipelineContributedCommandItems(): ContributedItemArray<IPivotBarAction, IPivotBarAction> {
        if (!this._contributedPivotCommandItemProviders) {
            const provider = new ContributablePivotBarActionProvider(
                [ContributionIds.ReleaseEditorToolbarMenuContributionId],
                (contribution: Contribution) => {
                    if (contribution) {
                        ContributionTelemetryUtils.publishExtensionInvokedTelemetry(ContributionIds.ReleaseEditorToolbarMenuContributionId, contribution.id);
                    }
                    return this.viewStore.getReleaseId();
                });

            this._contributedPivotCommandItemProviders = new ContributedItemArray<IPivotBarAction, IPivotBarAction>(provider, (item: IPivotBarAction) => {
                return JQueryWrapper.extend(item, { important: false });
            });
        }

        return this._contributedPivotCommandItemProviders;
    }

    protected _onSelectedPivotChange(pivot: string): void {
        const releaseId = NavigationStateUtils.getReleaseId();
        switch (pivot) {
            case ReleaseSummaryPivotItemKeys.c_historyPivotItemKey:
                NavigationService.getHistoryService().addHistoryPoint(
                    ReleaseProgressNavigateStateActions.ReleaseHistory,
                    { releaseId: releaseId }, null, false, false);
                break;

            case ReleaseSummaryPivotItemKeys.c_variablePivotItemKey:
                NavigationService.getHistoryService().addHistoryPoint(
                    ReleaseProgressNavigateStateActions.ReleaseVariables,
                    { releaseId: releaseId }, null, false, false);
                break;

            case ReleaseSummaryPivotItemKeys.c_pipelinePivotItemKey:
            default:
                NavigationService.getHistoryService().addHistoryPoint(
                    ReleaseProgressNavigateStateActions.ReleasePipelineProgress,
                    { releaseId: releaseId }, null, false, false);
                this._setSelectedEnvironment();
                break;
        }
    }

    private _getExtensionContext = (): IReleaseExtensionContext => {
        const context: IReleaseExtensionContext = {
            release: this.viewStore.getRelease()
        };
        return context;
    }

    private _getPipelineItem(): JSX.Element {
        let iconProps: IVssIconProps;
        if (this.state.isEditMode && !this.state.areEnvironmentsValid) {
            iconProps = {
                iconName: "Error",
                className: "pipeline-tab-error-icon"
            };
        }
        let pivotItemLabel: string = this._getPivotItemAriaLabel(Resources.CanvasTabTitle, iconProps);
        return (
            <PivotBarItem
                className="customPadding"
                name={Resources.CanvasTabTitle}
                key={PipelineProgressHub.c_pipelinePivotItemKey}
                ariaLabel={pivotItemLabel}
                itemKey={PipelineProgressHub.c_pipelinePivotItemKey}
                commands={!this.state.isEditMode && this._getReleasePipelineContributedCommandItems()}
                iconProps={iconProps}>
                <ContainerTabWithMessage
                    isEditMode={this.state.isEditMode}
                    errorMessage={this.state.error && this.state.error.errorMessage}
                    errorStatusCode={this.state.error && this.state.error.errorStatusCode}>

                    <ReleaseCanvasTab
                        instanceId={this.props.instanceId}
                        isEditMode={this.state.isEditMode} />

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
                iconProps={iconProps}
                ariaLabel={pivotItemLabel}
                key={PipelineProgressHub.c_variablePivotItemKey}
                itemKey={PipelineProgressHub.c_variablePivotItemKey} >

                <ContainerTabWithMessage
                    isEditMode={this.state.isEditMode}
                    errorMessage={this.state.error && this.state.error.errorMessage}
                    errorStatusCode={this.state.error && this.state.error.errorStatusCode}>

                    <VariablesTabSharedView
                        leftFooter={VariablesTabItemsUtils.getPreDefinedLinkComponent()}
                        defaultItems={VariablesTabItemsUtils.getVariablesTabItems(null, !this.state.hasVariableGroups, false)}
                        onPublishTelemetry={this._publishPipelineVariablesTabClickedTelemetry} />

                </ContainerTabWithMessage>

            </PivotBarItem>
        );
    }

    private _getHistoryItem(): JSX.Element {
        return (
            <PivotBarItem
                className="customPadding"
                name={Resources.HistoryTabItemTitle}
                key={PipelineProgressHub.c_historyPivotItemKey}
                itemKey={PipelineProgressHub.c_historyPivotItemKey}>
                <HistoryTab releaseId={this.props.releaseId} />
            </PivotBarItem>
        );
    }

    private _getHeaderItemPicker(): IHeaderItemPicker {
        return {
            isDropdownVisible: new ObservableValue<boolean>(true),
            selectedItem: this._getSelectedItem(),
            getItems: this._getItems,
            getListItem: (item: RMContracts.Release) => ({ name: item.name, key: item.id.toString() }),
            onSelectedItemChanged: this._onSelectedReleaseChanged,
            noItemsText: <LoadingComponent label={Resources.Loading} />
        };
    }

    private _getSelectedItem(): RMContracts.Release {
        return this.viewStore.getRelease();
    }

    private _getItems = (): Promise<RMContracts.Release[]> => {
        let siblingReleasesPromise = this._releaseStore.getSiblingReleases() ;

        // Fallback mechanism for the case where fetching of sibling releases failed with some reasons, so retrying
        // here again with service call, at least we are expecting one release to come as we are sitting inside a release
        if (Q.isRejected(siblingReleasesPromise as any)) {
            const actionCreator = ActionCreatorManager.GetActionCreator<ReleaseActionCreator>(ReleaseActionCreator);
            actionCreator.fetchSiblingReleases(this.viewStore.getRelease());
            siblingReleasesPromise = this._releaseStore.getSiblingReleases();
        }

        return siblingReleasesPromise;
    }

    private _onViewPipeline = (event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>): void => {
        const openInNewWindow: boolean = event && event.ctrlKey;
        const definitionId = this._releaseStore.getReleaseDefinitionId();
        DefinitionsUtils.handleEditDefinition(definitionId, Source.ReleaseProgressCommandBar, openInNewWindow);
    }

    private _onAbandon = (): void => {
        this._publishActionTelemetry(Feature.ReleaseAbandon);
        let releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);
        let release = releaseStore.getRelease();

        const actionCreator = ActionCreatorManager.GetActionCreator<ReleaseActionCreator>(ReleaseActionCreator);
        renderAbandonReleaseDialog(release, (release) => { actionCreator.updateExistingRelease(release); });
    }

    private _onSelectedReleaseChanged = (selectedItem: RMContracts.Release) => {
        // Navigate to release causes all controls in the current view to unmount causing the component
        // that is raising this event also to become stale. Prevent this by queuing navigate release 
        // instead of doing it synchronously. 
        delay(this, PipelineProgressHub.c_delayInMsBeforeNavigationToReleasePage, () => {
            this._navigateToReleasePage(selectedItem.id);
        });
    }

    private _navigateToReleasePage = (releaseId: number) => {
        // Doing Fast Hub switching through navigateToHub so that new release data get loaded
        Service.getLocalService(HubsService).navigateToHub(NavigationConstants.ReleaseProgressHubId,
            ReleaseUrlUtils.getReleaseProgressUrl(releaseId));

        ReleaseBreadcrumbUtils.publishBreadcrumbTelemetry(BreadcrumbItem.releasePicker);
    }

    private _toggleHelpDialog = (isAllTabsSeen?: boolean): void => {
        const showHelpCallout = this._isFirstRun && this.state.showHelpDialog;

        this.setState({
            showHelpDialog: !this.state.showHelpDialog,
            isHelpCalloutVisible: showHelpCallout,
            isAllTabsSeen: isAllTabsSeen
        }, () => {
            if (showHelpCallout) {
                this._async.setTimeout(() => {
                    if (this.state.isHelpCalloutVisible) {
                        this.setState({ isHelpCalloutVisible: false });
                    }
                }, 3500);
            }
        });
    }

    protected _publishPipelineVariablesTabClickedTelemetry = (): void => {
        this._publishVariablesTabClickedTelemetry(UIUtils.PipelineProgressView);
    }

    private _contributedPivotItemProviders: ContributablePivotItemProvider<IReleaseExtensionContext>[];
    private _contributedPivotCommandItemProviders: ContributedItemArray<IPivotBarAction, IPivotBarAction>;
    private static readonly c_pipelinePivotItemKey = "pipeline";
    private static readonly c_historyPivotItemKey = "history";
    private static readonly c_variablePivotItemKey = "variable";

    public static readonly c_delayInMsBeforeNavigationToReleasePage = 10;
    private _itemSelectionStore: ItemSelectionStore;
    private _releaseStore: ReleaseStore;

    private _allEnvironmentsActionsStores: ReleaseEnvironmentActionsStore[];
    private _helpLinkReference: HTMLElement;
    private _isFirstRun: boolean;
    private _async: Async = new Async();
}

