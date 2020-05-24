/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { AppContext } from "DistributedTaskControls/Common/AppContext";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { Actions as ItemSelectorActions } from "DistributedTaskControls/Actions/ItemSelectorActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { ImportExportFileUtils } from "DistributedTaskControls/Common/ImportExportFileUtils";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { FileUploadDialog, FileInputResult, FileInputContentType } from "DistributedTaskControls/SharedControls/InputControls/Components/FileUploadDialog";

import { autobind, css } from "OfficeFabric/Utilities";
import { MessageBarType } from "OfficeFabric/MessageBar";

import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";
import { SecurityUtils } from "PipelineWorkflow/Scripts/Editor/Common/SecurityUtils";
import { FoldersStore } from "PipelineWorkflow/Scripts/Definitions/Stores/FoldersStore";
import { CommonDefinitionsStore } from "PipelineWorkflow/Scripts/Definitions/Stores/CommonDefinitionsStore";
import { ContributionIds } from "PipelineWorkflow/Scripts/Common/Constants";
import { ActiveReleasesActionCreator } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesActionCreator";
import { ActiveReleasesFilterStore } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesFilterStore";
import {
    DefinitionsHubKeys,
    MessageBarParentKeyConstants,
    SessionStorageKeys,
    AllDefinitionsContentKeys,
    ActiveDefinitionsContentKeys,
    Links,
    DefinitionsHubViewOptionKeys
} from "PipelineWorkflow/Scripts/Definitions/Constants";
import { AllDefinitionsContent, IDefinitionEntry, IDashboardEntry } from "PipelineWorkflow/Scripts/Definitions/AllDefinitionsContent";
import { ContributionTelemetryUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ContributionTelemetryUtils";
import { ActiveDefinitionsActionsCreator } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionsActionsCreator";
import { ActiveDefinitionsContent } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionsContent";
import { ActiveDefinitionsStore } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionsStore";
import { ActiveReleasesActionsHub } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesActionsHub";
import { DefinitionsActionsCreator } from "PipelineWorkflow/Scripts/Definitions/DefinitionsActionsCreator";
import { DeleteDefinitionDialog } from "PipelineWorkflow/Scripts/Definitions/DeleteDefinitionDialog";
import { FolderDialog } from "PipelineWorkflow/Scripts/Definitions/FolderDialog/FolderDialog";
import { DefinitionsSource } from "PipelineWorkflow/Scripts/Definitions/DefinitionsSource";
import { ReleasesHubServiceDataHelper, IActiveDefinitionReference } from "PipelineWorkflow/Scripts/Definitions/ReleasesHubServiceData";
import { DefinitionsHubStore, IDefinitionsHubStoreState } from "PipelineWorkflow/Scripts/Definitions/Stores/DefinitionsHubStore";
import { DefinitionsUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/DefinitionsUtils";
import { ShowAllReleasesSetting } from "PipelineWorkflow/Scripts/Definitions/Utils/ShowAllReleasesSetting";
import { PerfTelemetryManager, DefinitionsHubTelemetry, Source } from "PipelineWorkflow/Scripts/Definitions/Utils/TelemetryUtils";
import { ResourcePathUtils } from "PipelineWorkflow/Scripts/Shared/Utils/ResourcePathUtils";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { UIUtils } from "PipelineWorkflow/Scripts/Shared/Utils/UIUtils";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { IWidgetData, WidgetUtils, ReleaseManagementWidgetTypes } from "PipelineWorkflow/Scripts/Widgets/Common/WidgetsHelper";
import { ReleaseSignalRManager } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseSignalRManager";

import * as UserDialog from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Controls.UserDialog";
import * as Manager from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Manager";

import { showAddToDashboard, PushToDashboardProps } from "TFSUI/Dashboards/AddToDashboard";
import { WidgetDataForPinning } from "TFSUI/Dashboards/AddToDashboardContracts";
import { PinArgs } from "TFSUI/Dashboards/AddToDashboard";

import * as VssContext from "VSS/Context";
import { getService as getEventService } from "VSS/Events/Services";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";
import { HubEventNames } from "VSS/Navigation/HubsService";

import { IVssHubViewState, VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { ContributablePivotBarActionProvider } from "VSSPreview/Providers/ContributablePivotBarActionProvider";
import { FilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { Hub } from "VSSUI/Components/Hub/Hub";
import { IVssIconProps } from "VSSUI/VssIcon";
import { IFilterBarProps } from "VSSUI/FilterBar";
import { HubHeader } from "VSSUI/Components/HubHeader/HubHeader";
import { PivotBarItem } from "VSSUI/Components/PivotBar/PivotBarItem";
import { IPivotBarAction, IPivotBarViewAction, PivotBarViewActionType, IChoiceGroupViewActionProps } from "VSSUI/Components/PivotBar";
import { VssIconType } from "VSSUI/Components/VssIcon/VssIcon.Props";
import { IFilterState, FILTER_CHANGE_EVENT } from "VSSUI/Utilities/Filter";
import { IViewOptionsValues, VIEW_OPTIONS_CHANGE_EVENT, } from "VSSUI/Utilities/ViewOptions";
import { ZeroData, ZeroDataActionType } from "VSSUI/ZeroData";
import { ContributedItemArray } from "VSSUI/Utilities/ItemContribution";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Definitions/AllDefinitionsContent";

import * as CreateReleasePanelHelper_TypeOnly from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleasePanelHelper";
import * as CreateReleaseDialog_TypeOnly from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/ReleaseDialog";
import * as ReleaseReportingPanel_TypeOnly from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingPanel";

export interface IDefinitionsHubProps extends IProps {
    hasAnyDefinition: boolean;
}

export interface IDefinitionsHubState extends IDefinitionsHubStoreState {
    enableSearch: boolean;
    activeReleasesFilterApplied: boolean;
}

export class DefinitionsHub extends Component<IDefinitionsHubProps, IDefinitionsHubState>{

    private _hubViewState: IVssHubViewState;
    private _definitionsActionsCreator: DefinitionsActionsCreator;
    private _foldersStore: FoldersStore;
    private _definitionsHubStore: DefinitionsHubStore;
    private _activeDefinitionsStore: ActiveDefinitionsStore;
    private _activeReleasesFilterStore: ActiveReleasesFilterStore;
    private _allDefinitionsContentRef: AllDefinitionsContent;
    private _messageHandlerActionsCreator: MessageHandlerActionsCreator;
    private _activeDefinitionsActionsCreator: ActiveDefinitionsActionsCreator;
    private _itemSelectorActions: ItemSelectorActions;
    private _activeReleasesActionCreator: ActiveReleasesActionCreator;
    private _activeReleasesActionsHub: ActiveReleasesActionsHub;

    constructor(props: IDefinitionsHubProps) {
        super(props);

        this._definitionsActionsCreator = ActionCreatorManager.GetActionCreator<DefinitionsActionsCreator>(DefinitionsActionsCreator);
        this._messageHandlerActionsCreator = ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);
        this._activeDefinitionsActionsCreator = ActionCreatorManager.GetActionCreator<ActiveDefinitionsActionsCreator>(ActiveDefinitionsActionsCreator);
        this._activeReleasesActionCreator = ActionCreatorManager.GetActionCreator<ActiveReleasesActionCreator>(ActiveReleasesActionCreator);
        this._itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions);
        this._activeReleasesActionsHub = ActionsHubManager.GetActionsHub<ActiveReleasesActionsHub>(ActiveReleasesActionsHub);
        this._foldersStore = StoreManager.GetStore<FoldersStore>(FoldersStore);
        this._commonDefinitionsStore = StoreManager.GetStore<CommonDefinitionsStore>(CommonDefinitionsStore);
        this._definitionsHubStore = StoreManager.GetStore<DefinitionsHubStore>(DefinitionsHubStore);
        this._activeDefinitionsStore = StoreManager.GetStore<ActiveDefinitionsStore>(ActiveDefinitionsStore);
        this._activeReleasesFilterStore = StoreManager.GetStore<ActiveReleasesFilterStore>(ActiveReleasesFilterStore);

        this._hubViewState = new VssHubViewState();
        this._hubViewState.filter.subscribe(this._onSearchTextChanged, FILTER_CHANGE_EVENT);
        this._hubViewState.selectedPivot.subscribe(this._onPivotChanged);

        this._hubViewState.viewOptions.setViewOption(ActiveDefinitionsContentKeys.ActiveReleasesAllReleasesActionKey, DefinitionsHubViewOptionKeys.AllReleases);
        this._hubViewState.viewOptions.subscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);

        this._setupCleanupOnHubChange();
    }

    public render(): JSX.Element {
        let hubHeaderIconProps: IVssIconProps = {
            iconType: VssIconType.bowtie,
            iconName: "bowtie-rocket"
        };

        if (!this.props.hasAnyDefinition) {
            return this._getZeroDayView();
        }

        return (
            <Hub
                className={"release-definitions"}
                hubViewState={this._hubViewState}
                commands={this._getCommandBarItems()}
                onRenderFilterBar={this._onRenderFilterBar}
                showFilterBarInline={true}>

                <HubHeader
                    iconProps={hubHeaderIconProps}
                    title={Resources.ReleaseDefinitionsTitle}>
                </HubHeader>
                {
                    this._getPivotBarItems()
                }

            </Hub>
        );
    }

    public componentWillMount(): void {
        this._definitionsActionsCreator.updateToolbarPermissions();
        this._setState();
    }

    public componentDidMount(): void {
        this._definitionsHubStore.addChangedListener(this._onStoreUpdate);
        this._activeReleasesFilterStore.addListener(ActiveReleasesFilterStore.FilterUpdatedEvent, this._onStoreUpdate);
        this._activeReleasesFilterStore.addListener(ActiveReleasesFilterStore.FilterResetEvent, this._onStoreUpdate);
    }

    public componentWillUnmount() {
        this._hubViewState.filter.unsubscribe(this._onSearchTextChanged, FILTER_CHANGE_EVENT);
        this._hubViewState.selectedPivot.unsubscribe(this._onPivotChanged);

        this._hubViewState.viewOptions.unsubscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);

        this._definitionsHubStore.removeChangedListener(this._onStoreUpdate);
        this._activeReleasesFilterStore.removeListener(ActiveReleasesFilterStore.FilterUpdatedEvent, this._onStoreUpdate);
        this._activeReleasesFilterStore.removeListener(ActiveReleasesFilterStore.FilterResetEvent, this._onStoreUpdate);
    }

    private _getPivotBarItems(): JSX.Element[] {
        let pivotBarItems: JSX.Element[] = [];

        pivotBarItems.push(this._getActiveDefinitionsPivotBarItem());

        pivotBarItems.push(this._getAllDefinitionsPivotBarItem());

        return pivotBarItems;
    }

    private _getActiveDefinitionsPivotBarItem(): JSX.Element {
        return (
            <PivotBarItem
                className={"mine-pivot-item"}
                key={DefinitionsHubKeys.MinePivotItemKey}
                itemKey={DefinitionsHubKeys.MinePivotItemKey}
                name={Resources.ActiveDefinitionsTabTitle}
                viewActions={this._getViewActions()}
                commands={this._getActiveDefinitionsContributedCommandItems()}>

                <ActiveDefinitionsContent
                    showActiveReleasesFilterBar={this.state.showActiveReleasesFilterBar}
                    ref={this._resolveRef("_activeDefinitionsContentRef")} />

            </PivotBarItem>
        );
    }

    private _getAllDefinitionsPivotBarItem(): JSX.Element {
        return (
            <PivotBarItem
                key={DefinitionsHubKeys.AllDefinitionsPivotItemKey}
                itemKey={DefinitionsHubKeys.AllDefinitionsPivotItemKey}
                name={Resources.AllDefinitionsTabTitle}
                className={"all-definitions-pivot-item absolute-fill"}
                commands={this._getAllDefinitionsContributedCommandItems()}>

                <AllDefinitionsContent ref={this._resolveRef("_allDefinitionsContentRef")} />

            </PivotBarItem>
        );
    }

    private _getActiveDefinitionsContributedCommandItems(): ContributedItemArray<IPivotBarAction, IPivotBarAction> {
        if (!this._contributedPivotCommandItemProviders) {
            const provider = new ContributablePivotBarActionProvider(
                [ContributionIds.AllDefinitionsContextMenuContributionId],
                (contribution: Contribution) => {
                    if (contribution) {
                        ContributionTelemetryUtils.publishExtensionInvokedTelemetry(ContributionIds.AllDefinitionsContextMenuContributionId, contribution.id);
                    }

                    if (this.state && this.state.selectedDefinition) {
                        return {
                            definition: {
                                id: this.state.selectedDefinition.id,
                                name: this.state.selectedDefinition.name,
                                path: this.state.selectedDefinition.path
                            }
                        };
                    }

                    return null;
                });

            this._contributedPivotCommandItemProviders = new ContributedItemArray<IPivotBarAction, IPivotBarAction>(provider, (item: IPivotBarAction) => {
                return JQueryWrapper.extend(item, { important: false });
            });
        }

        return this._contributedPivotCommandItemProviders;
    }

    private _getAllDefinitionsContributedCommandItems(): ContributedItemArray<IPivotBarAction, IPivotBarAction> {
        if (!this._contributedPivotCommandItemProviders) {
            const provider = new ContributablePivotBarActionProvider(
                [ContributionIds.AllDefinitionsToolbarMenuContributionId],
                (contribution: Contribution) => {
                    if (contribution) {
                        ContributionTelemetryUtils.publishExtensionInvokedTelemetry(ContributionIds.AllDefinitionsToolbarMenuContributionId, contribution.id);
                    }

                    let activeDefinition = this._getActiveDefinition();
                    if (activeDefinition) {
                        return {
                            definition: {
                                id: activeDefinition.id,
                                name: activeDefinition.name,
                                path: activeDefinition.path
                            }
                        };
                    }

                    return null;
                });

            this._contributedPivotCommandItemProviders = new ContributedItemArray<IPivotBarAction, IPivotBarAction>(provider, (item: IPivotBarAction) => {
                return JQueryWrapper.extend(item, { important: false });
            });
        }

        return this._contributedPivotCommandItemProviders;
    }

    @autobind
    private _onRenderFilterBar(): React.ReactElement<IFilterBarProps> {
        if (this.state.enableSearch) {
            return (
                <FilterBar>
                    <KeywordFilterBarItem filterItemKey={DefinitionsHubKeys.AllDefinitionsSearchKey} placeholder={Resources.DefinitionFilterBarItemPlaceholderText} />
                </FilterBar>
            );
        }

        return null;
    }

    @autobind
    private _onActiveReleasesFilterCommandClick(): void {
        let currState: boolean = this.state.showActiveReleasesFilterBar;
        DefinitionsHubTelemetry.ActiveDefinitionsFilterToggled(!currState);
        this._activeDefinitionsActionsCreator.toggleActiveReleasesFilterBar(!currState);
    }

    private _getViewActions(): IPivotBarViewAction[] {
        const viewActions: IPivotBarViewAction[] = [];
        const isCurrentlyDeployedEnabled = this._hubViewState.viewOptions.getViewOption(ActiveDefinitionsContentKeys.ActiveReleasesAllReleasesActionKey) === DefinitionsHubViewOptionKeys.CurrentlyDeployed;
        const currentlyDeployedDropdownChildItems: IPivotBarViewAction[] = [
            {
                key: DefinitionsHubViewOptionKeys.CurrentlyDeployed,
                name: Resources.CurrentlyDeployed,
                important: true,
                iconProps: { iconName: "Cloudy" },
                ariaLabel: Resources.CurrentlyDeployedToggleOnAriaLabel,
                title: Resources.CurrentlyDeployedToggleOnAriaLabel,
                onClick: () => {
                    if (!isCurrentlyDeployedEnabled) {
                        this._hubViewState.viewOptions.setViewOption(ActiveDefinitionsContentKeys.ActiveReleasesAllReleasesActionKey, DefinitionsHubViewOptionKeys.CurrentlyDeployed);
                    }
                }
            },
            {
                key: DefinitionsHubViewOptionKeys.AllReleases,
                name: Resources.AllReleases,
                important: true,
                iconProps: { className: "bowtie-view-list", iconType: VssIconType.bowtie },
                ariaLabel: Resources.CurrentlyDeployedToggleOffAriaLabel,
                title: Resources.CurrentlyDeployedToggleOffAriaLabel,
                onClick: () => {
                    if (isCurrentlyDeployedEnabled) {
                        this._hubViewState.viewOptions.setViewOption(ActiveDefinitionsContentKeys.ActiveReleasesAllReleasesActionKey, DefinitionsHubViewOptionKeys.AllReleases);
                    }
                }
            }
        ];

        viewActions.push({
            key: ActiveDefinitionsContentKeys.ActiveReleasesAllReleasesActionKey,
            important: true,
            iconProps: isCurrentlyDeployedEnabled ? { iconName: "Cloudy" } : { className: "bowtie-view-list", iconType: VssIconType.bowtie },
            name: isCurrentlyDeployedEnabled ? Resources.CurrentlyDeployed : Resources.AllReleases,
            children: currentlyDeployedDropdownChildItems,
        });

        // Do not show Analytics menu for anonymous users
        if (PermissionHelper.canViewAnalytics() && FeatureFlagUtils.isDevOpsReportingEnabled()) {
            viewActions.push(
                {
                    key: "release-analysis-icon",
                    actionType: PivotBarViewActionType.Command,
                    ariaLabel: Resources.ActiveReleasesAnalyticsTitle,
                    title: Resources.ActiveReleasesAnalyticsTitle,
                    iconProps: { iconName: "chart-column", iconType: VssIconType.bowtie },
                    important: true,
                    onClick: this._showAnalysisPanel
                }
            );
        }

        const filterIconName: string = this.state.activeReleasesFilterApplied ? "FilterSolid" : "Filter";
        viewActions.push(
            {
                key: ActiveDefinitionsContentKeys.ActiveReleasesFilterKey,
                actionType: PivotBarViewActionType.Command,
                ariaLabel: Resources.ActiveReleasesFilterTitle,
                title: Resources.ActiveReleasesFilterTitle,
                iconProps: {
                    iconType: VssIconType.fabric,
                    iconName: filterIconName
                },
                disabled: isCurrentlyDeployedEnabled,
                important: true,
                onClick: this._onActiveReleasesFilterCommandClick
            }
        );

        return viewActions;
    }

    @autobind
    private _showAnalysisPanel(): void {
        let definitionName: string = this.state.selectedDefinition.name;
        let definitionId: number = this.state.selectedDefinition.id;
        DefinitionsHubTelemetry.ActiveDefinitionsShowAnalysisClicked();
        VSS.using(["PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingPanel"],
            (ReleaseReportingPanel: typeof ReleaseReportingPanel_TypeOnly) => {
                let releaseAnalysisPanelInstanceId = DtcUtils.getUniqueInstanceId();
                const panelContainer = document.createElement("div");
                document.body.appendChild(panelContainer);

                let component = React.createElement(
                    ReleaseReportingPanel.ReleaseReportingPanel,
                    {
                        definitionId: definitionId,
                        definitionName: definitionName,
                        hasCloseButton: true,
                        instanceId: releaseAnalysisPanelInstanceId,
                    });
                ReactDOM.render(component, panelContainer);
            });
    }

    private _getZeroDayView(): JSX.Element {

        const secondaryText = (
            <div className="zero-day-secondary-text">
                {Resources.NewHubZeroDaySecondaryText}
            </div>
        );

        const resourcePath = ReleasesHubServiceDataHelper.getResourcePath();

        // In IE, zoom on img zooms the image, but doesn't take care of realigning. Therefore for IE, we would like to keep zoom as 1.
        // For firefox, img zoom doesn't work, unless addons are installed. -moz-transform with scale(2) works, but doesn't realign other items
        const userAgent = navigator.userAgent.toLowerCase();
        const isIE = /(msie [\d.]+|trident\/[\d.]+)/.test(userAgent);

        return (
            <div className={css("release-zero-day-container", isIE ? "browser-ie" : "")}>
                <ZeroData
                    imagePath={ResourcePathUtils.getResourcePath("zerodata-release-management-new.png", resourcePath)}
                    imageAltText={""}
                    primaryText={Resources.NewHubZeroDayPrimaryText}
                    secondaryText={secondaryText}
					actionText={Resources.NewHubZeroDayCreateDefinitionButtonText}
					actionType={ZeroDataActionType.ctaButton}
                    onActionClick={this._navigateToCreateReleaseDefinition}
                />
            </div>);
    }

    private _setupCleanupOnHubChange(): void {
        getEventService().attachEvent(HubEventNames.PreXHRNavigate, this._hubChangeHandler);
    }

    private _hubChangeHandler = (sender: any, event: any) => {
        ReleaseSignalRManager.dispose();
        ActionCreatorManager.dispose();
        StoreManager.dispose();
        PerfTelemetryManager.dispose();

        getEventService().detachEvent(HubEventNames.PreXHRNavigate, this._hubChangeHandler);
    }

    private _getCommandBarItems(): IPivotBarAction[] {
        if (Utils_String.equals(this._hubViewState.selectedPivot.value, DefinitionsHubKeys.AllDefinitionsPivotItemKey)) {
            return this._getAllDefinitionsCommandBarItems();
        }
        else {
            return this._getActiveDefinitionsCommandBarItems();
        }
    }

    private _getAllDefinitionsCommandBarItems(): IPivotBarAction[] {
        let items: IPivotBarAction[] = [];
        let childItems: IPivotBarAction[] = [];

        if (Manager.FeaturesManager.areBasicLicenseReleaseManagementFeaturesEnabled()) {
            childItems.push({
                name: Resources.CreateDefinitionContextualMenuOptionText,
                key: "new-rd",
                important: true,
                iconProps: {
                    iconType: VssIconType.fabric,
                    iconName: "Add"
                },
                onClick: this._navigateToCreateReleaseDefinition,
                disabled: !this.state.canCreateReleaseDefinition
            });
            childItems.push({
                name: Resources.ImportRdMenuItemText,
                key: "import-rd",
                iconProps: {
                    iconName: "Upload",
                    iconType: VssIconType.fabric
                },
                important: true,
                onClick: this._showImportDefinitionDialog,
                title: UIUtils.getAccessDeniedTooltipText(!this.state.canCreateReleaseDefinition, Resources.ImportRdMenuItemText)
            });
            childItems.push({
                name: Resources.CreateFolderText,
                key: "new-folder",
                important: true,
                iconProps: {
                    iconType: VssIconType.fabric,
                    iconName: "Add"
                },
                onClick: this._showCreateFolderDialog,
                disabled: !this.state.canCreateReleaseDefinition
            });

            if (FeatureFlagUtils.isYamlHubEnabled()) {
                childItems.push({
                    name: "New Yaml Pipeline",
                    key: "new-yaml-pipeline",
                    important: true,
                    iconProps: {
                        iconType: VssIconType.fabric,
                        iconName: "Add"
                    },
                    onClick: this._navigateToCreateYamlPipeline,
                    disabled: !this.state.canCreateReleaseDefinition
                });
            }

            if (this.state.canCreateReleaseDefinition) {
                items.push({
                    name: Resources.NewReleaseDefinitionTabTitle,
                    key: "new-rd-folder-tab-key",
                    important: true,
                    children: childItems,
                    iconProps: {
                        iconType: VssIconType.fabric,
                        iconName: "Add"
                    },
                    title: UIUtils.getAccessDeniedTooltipText(!this.state.canCreateReleaseDefinition, Resources.NewReleaseDefinitionTabTitle)
                });
            }

            if (this.state.canManagePermissions) {
                items.push({
                    name: Resources.RdSecurityTabTitle,
                    key: "Security",
                    important: true,
                    iconProps: {
                        className: "bowtie-icon bowtie-shield"
                    },
                    onClick: this._showSecurityDialog,
                    title: UIUtils.getAccessDeniedTooltipText(!this.state.canManagePermissions, Resources.RdSecurityTabTitle)
                });
            }
        }

        return items;
    }

    private _getActiveDefinitionsCommandBarItems(): IPivotBarAction[] {
        let items: IPivotBarAction[] = [];
        let childItems: IPivotBarAction[] = [];
        if (Manager.FeaturesManager.areBasicLicenseReleaseManagementFeaturesEnabled()) {
            childItems.push({
                name: Resources.CreateDefinitionCommandBarMenuOptionText,
                key: "new-rd",
                important: true,
                iconProps: {
                    iconType: VssIconType.fabric,
                    iconName: "Add"
                },
                onClick: this._navigateToCreateReleaseDefinition,
            });
            childItems.push({
                name: Resources.ImportRdCommandBarMenuItemText,
                key: "import-rd",
                iconProps: {
                    iconName: "Upload",
                    iconType: VssIconType.fabric
                },
                important: true,
                onClick: this._showImportDefinitionDialog,
            });

            if (FeatureFlagUtils.isYamlHubEnabled()) {
                childItems.push({
                    name: "New Yaml Pipeline",
                    key: "new-yaml-pipeline",
                    important: true,
                    iconProps: {
                        iconType: VssIconType.fabric,
                        iconName: "Add"
                    },
                    onClick: this._navigateToCreateYamlPipeline,
                    disabled: !this.state.canCreateReleaseDefinition
                });
            }

            if (this.state.canCreateReleaseDefinition) {
                items.push({
                    name: Resources.NewReleaseDefinitionTabTitle,
                    key: "new-rd-import-rd-tab-key",
                    important: true,
                    children: childItems,
                    iconProps: {
                        iconType: VssIconType.fabric,
                        iconName: "Add"
                    },
                    title: UIUtils.getAccessDeniedTooltipText(!this.state.canCreateReleaseDefinition, Resources.NewReleaseDefinitionTabTitle)
                });
            }

            if (this.state.canExportReleaseDefinition) {
                // Using exportReleaseDefinition permission for the time being as it represents the same permission override

                const commandName = this.state.canEditDefinition ? Resources.EditRdCommandBarMenuText : Resources.ViewRdCommandBarItemText;

                const iconProps: IVssIconProps = this.state.canEditDefinition
                    ? { className: "bowtie-icon bowtie-edit" }
                    : { iconName: "EntryView", iconType: VssIconType.fabric };

                items.push({
                    name: commandName,
                    key: "edit-rd-command-bar-item",
                    important: true,
                    iconProps: iconProps,
                    disabled: !this.state.selectedDefinition,
                    onClick: (e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => { this._handleEditDefinition(e); },
                    title: UIUtils.getAccessDeniedTooltipText(!this.state.selectedDefinition || !this.state.canViewReleaseDefinition, commandName)
                });
            }

            if (this.state.canCreateReleaseForSelectedDefinition) {
                items.push({
                    name: Resources.CreateReleaseMenuOptionText,
                    key: "create-release-command-bar-item",
                    important: true,
                    iconProps: {
                        className: "bowtie-icon bowtie-build-queue-new"
                    },
                    disabled: !this.state.selectedDefinition,
                    onClick: () => { this._createRelease(); },
                    title: UIUtils.getAccessDeniedTooltipText(!this.state.selectedDefinition || !this.state.canCreateReleaseForSelectedDefinition, Resources.CreateReleaseMenuOptionText)
                });

                items.push({
                    name: Resources.CreateDraftReleaseMenuOptionText,
                    key: "create-draft-release-command-bar-item",
                    iconProps: {
                        className: "bowtie-icon bowtie-draft"
                    },
                    disabled: !this.state.selectedDefinition,
                    onClick: () => { this._definitionsActionsCreator.createDraftRelease(this.state.selectedDefinition.id, Source.ActiveDefinitionsCommandBar); },
                    title: UIUtils.getAccessDeniedTooltipText(!this.state.selectedDefinition || !this.state.canCreateReleaseForSelectedDefinition, Resources.CreateDraftReleaseMenuOptionText)
                });
            }

            if (this.state.canDeleteReleaseDefinition) {
                items.push({
                    name: Resources.DeleteRdCommandBarMenuOptionText,
                    key: "delete-definition-command-bar-item",
                    iconProps: {
                        className: "bowtie-icon bowtie-trash"
                    },
                    disabled: !this.state.selectedDefinition,
                    onClick: () => {
                        this._showDeleteDefinitionDialog(this.state.selectedDefinition.name, this.state.selectedDefinition.id);
                    },
                    title: UIUtils.getAccessDeniedTooltipText(!this.state.selectedDefinition || !this.state.canDeleteReleaseDefinition, Resources.DeleteRdCommandBarMenuOptionText)
                });
            }

            if (this.state.canEditDefinition) {
                items.push({
                    name: Resources.CloneText,
                    key: "clone-definition-command-bar-item",
                    iconProps: {
                        className: "bowtie-icon bowtie-clone"
                    },
                    disabled: !this.state.selectedDefinition,
                    onClick: () => { DefinitionsUtils.handleCloneDefinition(this.state.selectedDefinition.id, Source.ActiveDefinitionsCommandBar); },
                    title: UIUtils.getAccessDeniedTooltipText(!this.state.selectedDefinition || !this.state.canEditDefinition, Resources.CloneText)
                });
            }

            if (this.state.canExportReleaseDefinition) {
                items.push({
                    name: Resources.ExportRdContextualMenuText,
                    key: "export-definition-command-bar-item",
                    iconProps: {
                        className: "bowtie-icon bowtie-transfer-download"
                    },
                    disabled: !this.state.selectedDefinition,
                    onClick: () => { this._definitionsActionsCreator.exportDefinition(this.state.selectedDefinition.id, Source.ActiveDefinitionsCommandBar); },
                    title: UIUtils.getAccessDeniedTooltipText(!this.state.selectedDefinition || !this.state.canExportReleaseDefinition, Resources.ExportRdContextualMenuText)
                });
            }

            if (this.state.canExportReleaseDefinition) {
                items.push({
                    key: "environment-summary-command-bar-item",
                    name: Resources.EnvironmentSummary,
                    iconProps: {
                        className: "bowtie-icon bowtie-format-list-unordered"
                    },
                    children: this._createEnvironmentSummarySubmenu(),
                    disabled: !this.state.selectedDefinition
                });
            }

            if (items.length > 0) {
                items.push({
                    name: "-",
                    key: "divider_1_active_rd_menu",

                });
            }

            // Permissions are checked on a per-dashboard basis on the server-side during the createWidget API call, so we are not performing explicit permission checks client-side
            // Do not show dashboard menu item for anonymous user
            if (PermissionHelper.canAddDefinitionToDashboard() && this.state.selectedDefinition) {
                const definition: IActiveDefinitionReference = this.state.selectedDefinition;
                const webContext = VssContext.getDefaultWebContext();
                const widgetType = ReleaseManagementWidgetTypes.RELEASE_DEFINITION_SUMMARY_WIDGET;
                let data = JSON.stringify({
                    releaseDefinitionId: definition.id,
                });

                items.push({
                    name: Resources.AddToDashboardContextualMenuText,
                    key: "add-to-dashboard-command-bar-item",
                    iconProps: {
                        className: "bowtie-icon bowtie-math-plus"
                    },
                    disabled: !this.state.selectedDefinition,
                    title: UIUtils.getAccessDeniedTooltipText(!this.state.selectedDefinition, Resources.AddToDashboardContextualMenuText),
                    onClick: () => {
                        let widgetData: WidgetDataForPinning = {
                            name: definition.name,
                            contributionId: widgetType,
                            settings: data,
                            settingsVersion: null,
                            size: WidgetUtils.getSizeForWidgetType(widgetType)
                        };

                        let addToDashboardProps: PushToDashboardProps = {
                            projectId: webContext.project.id,
                            widgetData: widgetData,
                            actionCallback: (args: PinArgs) => { this._addToDashboardCallback(args); }
                        };

                        showAddToDashboard(addToDashboardProps);
                    },
                });
            }

            if (this.state.canManageDefinitionPermissions) {
                items.push({
                    name: Resources.SecurityText,
                    key: "security-command-bar-item",
                    iconProps: {
                        className: "bowtie-icon bowtie-shield"
                    },
                    disabled: !this.state.selectedDefinition,
                    onClick: () => { this._handleDefinitionSecurity(); },
                    title: UIUtils.getAccessDeniedTooltipText(!this.state.selectedDefinition || !this.state.canManageDefinitionPermissions, Resources.SecurityText)
                });
            }
        }

        return items;
    }

    private _addToDashboardCallback = (args: PinArgs): void => {
        const isVerticalNavigationOn: boolean = FeatureFlagUtils.isVerticalNavigationOn();
        if (isVerticalNavigationOn) {
            this._activeDefinitionsActionsCreator.setAddToDashboardMessageState(args);
        }
        else {
            const rdName: string = this.state.selectedDefinition.name;
            const outcome: boolean = args && args.response && args.response.outcome === 0;
            const dashboardName: string = args && args.commandArgs && args.commandArgs.dashboardName;
            if (outcome) {
                this._messageHandlerActionsCreator.addMessage(MessageBarParentKeyConstants.DefinitionsHubSuccessMessageBarKey, Utils_String.localeFormat(Resources.AddToDashboard_SuccessMessage, rdName, dashboardName), MessageBarType.success);
            }
            else {
                this._messageHandlerActionsCreator.addMessage(MessageBarParentKeyConstants.DefinitionsHubErrorMessageBarKey, Utils_String.localeFormat(Resources.AddToDashboard_FailureMessage, rdName, dashboardName), MessageBarType.error);
            }
        }
    }

    private _createRelease(): void {
        const definition = this.state.selectedDefinition;
        DefinitionsHubTelemetry.CreateReleaseClicked(Source.ActiveDefinitionsCommandBar);
        if (FeatureFlagUtils.isNewCreateReleaseWorkflowEnabled()) {
            DefinitionsUtils.createRelease(definition.name, definition.id, this._onCreateRelease);
        } else {
            this._showCreateReleaseDialog(definition.name, definition.id);
        }
    }

    private _showCreateReleaseDialog(definitionName: string, definitionId: number): void {
        VSS.using(["PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleasePanelHelper"],
            (CreateReleasePanelHelper: typeof CreateReleasePanelHelper_TypeOnly) => {
                let releaseDialogInstanceId = DtcUtils.getUniqueInstanceId();
                let createReleasePanelHelper = new CreateReleasePanelHelper.CreateReleasePanelHelper<PipelineTypes.PipelineDefinition, PipelineTypes.PipelineDefinitionEnvironment>({ definitionId: definitionId });
                createReleasePanelHelper.initializeCreateReleaseStore(releaseDialogInstanceId);
                let releaseDialogStore = createReleasePanelHelper.getCreateReleaseStore();
                let releaseDialogActionCreator = createReleasePanelHelper.getCreateReleaseActionCreator();

                const dialogContainer = document.createElement("div");
                VSS.using(["PipelineWorkflow/Scripts/SharedComponents/CreateRelease/ReleaseDialog"],
                    (CreateReleaseDialog: typeof CreateReleaseDialog_TypeOnly) => {
                        ReactDOM.render(
                            <CreateReleaseDialog.CreateReleaseDialog
                                instanceId={releaseDialogInstanceId}
                                releaseDialogStore={releaseDialogStore}
                                releaseDialogActionCreator={releaseDialogActionCreator}
                                showDialog={true}
                                definitionId={definitionId}
                                definitionName={definitionName || Utils_String.empty}
                                onQueueRelease={(release: PipelineTypes.PipelineRelease, projectName?: string) => {
                                    this._onCreateRelease(release, projectName);
                                    ReactDOM.unmountComponentAtNode(dialogContainer);
                                }}
                                onCloseDialog={() => { ReactDOM.unmountComponentAtNode(dialogContainer); }} />,
                            dialogContainer);
                    });
            });
    }

    private _onCreateRelease = (release: PipelineTypes.PipelineRelease, projectName?: string) => {
        this._definitionsActionsCreator.updateDefinitionLastReleaseReference(release.releaseDefinition.id);
        this._messageHandlerActionsCreator.addMessage(MessageBarParentKeyConstants.DefinitionsHubSuccessMessageBarKey, this._getReleaseCreatedMessageBarContent(release), MessageBarType.success);
    }

    private _showDeleteDefinitionDialog(definitionName: string, definitionId: number): void {
        DefinitionsHubTelemetry.DeleteDefinitionClicked(Source.ActiveDefinitionsCommandBar);

        const dialogContainer = document.createElement("div");

        ReactDOM.render(
            <DeleteDefinitionDialog
                definitionName={definitionName}
                onOkButtonClick={(comment: string, forceDelete: boolean) => {
                    this._onDeleteDefinition(definitionId, definitionName, comment, forceDelete);
                    ReactDOM.unmountComponentAtNode(dialogContainer);
                }}
                onCancelButtonClick={() => {
                    ReactDOM.unmountComponentAtNode(dialogContainer);
                }}
            />,
            dialogContainer);
    }

    private _onDeleteDefinition = (definitionId: number, definitionName: string, comment: string, forceDelete: boolean): void => {
        this._activeDefinitionsActionsCreator.deleteDefinition(definitionId, definitionName, comment, forceDelete);
        const showSearchResults = this._activeDefinitionsStore.shouldShowSearchResults();
        let definitionToSelect;
        if (!showSearchResults) {
            // On deleting selected RD, select the first item in the updated list
            definitionToSelect = this._activeDefinitionsStore.getItemToSelectAfterDeleteRD(definitionId);
            if (definitionToSelect) {
                this._itemSelectorActions.selectItem.invoke({ data: definitionToSelect });
            }
            else {
                // If no items are left in left pane to select then clear out releases panel
                this._activeReleasesActionsHub.clearReleases.invoke({});
            }
        }
        else {
            // For search view, when selected RD is deleted, show the SelectDefinitionPanelItem
            const itemToSelect = this._activeDefinitionsStore.getSelectDefinitionPanelItem();
            this._itemSelectorActions.selectItem.invoke({ data: itemToSelect });
        }
    }

    private _handleDefinitionSecurity(): void {
        const definition: IActiveDefinitionReference = this.state.selectedDefinition;
        DefinitionsHubTelemetry.DefinitionLevelSecurityChangedFromDefinitionsMenu(definition.path);
        SecurityUtils.openDefinitionSecurityDialog(definition.id, definition.name, definition.path);
    }

    private _getReleaseCreatedMessageBarContent = (pipelineRelease: PipelineTypes.PipelineRelease): JSX.Element => {
        return (<span>
            {Resources.ReleaseCreatedTextPrefix}
            <SafeLink
                href={DefinitionsUtils.getReleaseUrl(pipelineRelease)}
                onClick={(e) => this._onReleaseNameClick(e, pipelineRelease)}
                allowRelative={true}
                target="_blank">
                {pipelineRelease.name}
            </SafeLink>
            {Resources.ReleaseCreatedTextSuffix}
        </span>);
    }

    private _onReleaseNameClick(event: React.SyntheticEvent<HTMLElement>, release: PipelineTypes.PipelineRelease): void {
        DefinitionsUtils.onReleaseNameClick(event, release);
    }

    private _onSearchTextChanged = (filterState: IFilterState): void => {
        if (filterState && filterState[DefinitionsHubKeys.AllDefinitionsSearchKey]) {
            let searchText: string = filterState[DefinitionsHubKeys.AllDefinitionsSearchKey].value;
            this._definitionsActionsCreator.searchReleaseDefinitions(searchText);
        }
    }

    private _handleEditDefinition = (event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
        const openInNewWindow: boolean = event && event.ctrlKey;
        DefinitionsUtils.handleEditDefinition(this.state.selectedDefinition.id, Source.ActiveDefinitionsCommandBar, openInNewWindow);
    }

    private _onPivotChanged = (newPivotKey: string) => {
        const storeState = this._definitionsHubStore.getHubStoreState();
        const activeReleasesFilterApplied = this._activeReleasesFilterStore ? this._activeReleasesFilterStore.isAnyFilterApplied() : false;

        this.setState({
            enableSearch: !!Utils_String.equals(newPivotKey, DefinitionsHubKeys.AllDefinitionsPivotItemKey),
            selectedDefinition: storeState ? storeState.selectedDefinition : null,
            canEditDefinition: storeState ? storeState.canEditDefinition : null,
            canCreateReleaseForSelectedDefinition: storeState ? storeState.canCreateReleaseForSelectedDefinition : null,
            canManagePermissions: storeState ? storeState.canManagePermissions : null,
            canCreateReleaseDefinition: storeState ? storeState.canCreateReleaseDefinition : null,
            canDeleteReleaseDefinition: storeState ? storeState.canDeleteReleaseDefinition : null,
            canExportReleaseDefinition: storeState ? storeState.canExportReleaseDefinition : null,
            canManageDefinitionPermissions: storeState ? storeState.canManageDefinitionPermissions : null,
            canViewReleaseDefinition: storeState ? storeState.canViewReleaseDefinition : null,
            dashboardEntries: storeState ? storeState.dashboardEntries : null,
            showActiveReleasesFilterBar: storeState ? storeState.showActiveReleasesFilterBar : false,
            activeReleasesFilterApplied: activeReleasesFilterApplied
        });
    }

    private _onViewOptionsChanged = (viewOptionsValues: IViewOptionsValues) => {
        const showCurrentlyDeployed = this._hubViewState.viewOptions.getViewOption(ActiveDefinitionsContentKeys.ActiveReleasesAllReleasesActionKey) === DefinitionsHubViewOptionKeys.CurrentlyDeployed;
        DefinitionsHubTelemetry.CurrentlyDeployedToggled(showCurrentlyDeployed);

        const selectedDefinitionId = this.state && this.state.selectedDefinition && this.state.selectedDefinition.id;
        if (selectedDefinitionId > 0) {
            ShowAllReleasesSetting.setValue(selectedDefinitionId, !showCurrentlyDeployed);
        }

        this._activeReleasesActionCreator.setCurrentlyDeployedState(showCurrentlyDeployed);
    }

    private _onStoreUpdate = () => {
        this._setState();
    }

    private _setState = () => {
        const storeState = this._definitionsHubStore.getHubStoreState();
        const activeReleasesFilterApplied = this._activeReleasesFilterStore ? this._activeReleasesFilterStore.isAnyFilterApplied() : false;
        const selectedDefinitionId = storeState && storeState.selectedDefinition && storeState.selectedDefinition.id;
        let isCurrentlyDeployedOn: boolean = this._activeReleasesFilterStore.isCurrentlyDeployedFilterOn(selectedDefinitionId);

        this._setViewOptions(isCurrentlyDeployedOn);

        this.setState({
            enableSearch: Utils_String.equals(this._hubViewState.selectedPivot.value, DefinitionsHubKeys.AllDefinitionsPivotItemKey),
            selectedDefinition: storeState ? storeState.selectedDefinition : null,
            canEditDefinition: storeState ? storeState.canEditDefinition : null,
            canCreateReleaseForSelectedDefinition: storeState ? storeState.canCreateReleaseForSelectedDefinition : null,
            canManagePermissions: storeState ? storeState.canManagePermissions : null,
            canCreateReleaseDefinition: storeState ? storeState.canCreateReleaseDefinition : null,
            canDeleteReleaseDefinition: storeState ? storeState.canDeleteReleaseDefinition : null,
            canExportReleaseDefinition: storeState ? storeState.canExportReleaseDefinition : null,
            canManageDefinitionPermissions: storeState ? storeState.canManageDefinitionPermissions : null,
            canViewReleaseDefinition: storeState ? storeState.canViewReleaseDefinition : null,
            dashboardEntries: storeState ? storeState.dashboardEntries : null,
            showActiveReleasesFilterBar: !isCurrentlyDeployedOn && (storeState ? storeState.showActiveReleasesFilterBar : false),
            activeReleasesFilterApplied: activeReleasesFilterApplied
        });
    }

    private _setViewOptions(isCurrentlyDeployedOn: boolean): void {
        const viewOptions: IViewOptionsValues = this._hubViewState.viewOptions.getViewOptions();

        const selectedKey = isCurrentlyDeployedOn ? DefinitionsHubViewOptionKeys.CurrentlyDeployed : DefinitionsHubViewOptionKeys.AllReleases;
        viewOptions[ActiveDefinitionsContentKeys.ActiveReleasesAllReleasesActionKey] = selectedKey;

        this._hubViewState.viewOptions.setViewOptions(viewOptions, true /* supress onViewOptionsChanged callback at this time */);
    }

    private _showCreateFolderDialog = (): void => {
        DefinitionsHubTelemetry.newFolderClickedFromCommandBar();
        let parentFolderPath = this._getActiveFolderPath();
        FolderDialog.showCreateFolderDialog(parentFolderPath);
    }

    private _navigateToCreateReleaseDefinition = (): void => {
        let source = Source.ZeroDayHeroButton;
        if (this.props.hasAnyDefinition) {
            if (this._hubViewState.selectedPivot.value === DefinitionsHubKeys.AllDefinitionsPivotItemKey) {
                source = Source.AllDefinitionsCommandBar;
            }
            else {
                source = Source.ActiveDefinitionsCommandBar;
            }
        }

        DefinitionsHubTelemetry.newReleaseDefinitionClickedFromCommandBar(source);
        let path = this._getActiveFolderPath();

        DefinitionsUtils.navigateToCreateDefinition(path);
    }

    private _navigateToCreateYamlPipeline = (): void => {
        DefinitionsUtils.navigateToCreateYaml();
    }

    private _showImportDefinitionDialog = () => {
        let source: string = Source.ActiveDefinitionsCommandBar;
        if (this._hubViewState.selectedPivot.value === DefinitionsHubKeys.AllDefinitionsPivotItemKey) {
            source = Source.AllDefinitionsCommandBar;
        }

        DefinitionsHubTelemetry.importRDClicked(source);
        let folderPath = this._getActiveFolderPath();

        const maxFileSize = 25 * 1024 * 1024;
        const timeOut = 3 * 60 * 1000; /*Wait for 3 mins*/
        const importDialogContainer = document.createElement("div");
        ReactDOM.render(<FileUploadDialog
            resultContentType={FileInputContentType.RawText}
            maxFileSize={maxFileSize}
            title={Resources.DefinitionImportDialogTitle}
            onOkClick={(file: FileInputResult) => {
                try {
                    ImportExportFileUtils.saveFileContentToSessionStorageWithTimeout(
                        SessionStorageKeys.ImportReleaseDefinitionStorageSessionKey,
                        file.content,
                        timeOut);

                    DefinitionsHubTelemetry.importRDSucceeded();
                    DefinitionsUtils.navigateToImportDefinition(folderPath);
                }
                catch (ex) {
                    DefinitionsHubTelemetry.importRDFailed();
                    UserDialog.DialogUtils.alert(Resources.DefinitionImportInvalidJson, () => { }, Resources.DefinitionImportInvalidJsonAlertTitle);
                    console.error(ex);
                }
            }}
            onDialogClose={() => {
                ReactDOM.unmountComponentAtNode(importDialogContainer);
            }}
        />, importDialogContainer);
    }

    private _showSecurityDialog = (): void => {
        let activeDefinition = this._getActiveDefinition();

        if (activeDefinition) {
            let folderPath = this._foldersStore.getFolderPath(activeDefinition.folderId);
            DefinitionsHubTelemetry.DefinitionLevelSecurityChangedFromCommandBar(folderPath);

            SecurityUtils.openDefinitionSecurityDialog(activeDefinition.id, activeDefinition.name, folderPath);
        }
        else {
            let path = this._getActiveFolderPath();
            DefinitionsHubTelemetry.FolderLevelSecurityChangedFromCommandbar(path);
            SecurityUtils.openFolderSecurityDialog(path);
        }
    }

    private _createDashboardSubmenu(): IPivotBarAction[] {
        const definition: IActiveDefinitionReference = this.state.selectedDefinition;
        const webContext = VssContext.getDefaultWebContext();
        if (!definition || !webContext.team) {
            return [];
        }
        let items: IPivotBarAction[] = [];
        const widgetType = ReleaseManagementWidgetTypes.RELEASE_DEFINITION_SUMMARY_WIDGET;
        let data = JSON.stringify({
            releaseDefinitionId: definition.id,
        });

        if (this.state.dashboardEntries) {
            this.state.dashboardEntries.forEach((dashboardEntry: IDashboardEntry) => {
                let widgetData: IWidgetData = {
                    name: definition.name,
                    contributionId: widgetType,
                    size: WidgetUtils.getSizeForWidgetType(widgetType),
                    projectId: webContext.project.id,
                    groupId: webContext.team.id,
                    dashboardId: dashboardEntry.id,
                    data: data
                };

                items.push(this._createSubMenuItem(dashboardEntry, widgetData));
            });
            return items;
        }
    }

    private _createEnvironmentSummarySubmenu(): IPivotBarAction[] {
        const definition: IActiveDefinitionReference = this.state.selectedDefinition;
        if (!definition) {
            return [];
        }

        let items: IPivotBarAction[] = [];

        if (definition.environments) {
            definition.environments.forEach(environment => {
                items.push(
                    {
                        key: "environment-summary-env-" + environment.definitionEnvironmentId,
                        name: environment.definitionEnvironmentName,
                        iconProps: {
                            className: "bowtie-icon bowtie-environment"
                        },
                        onClick: (event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
                            let url: string = DefinitionsUtils.getEnvironmentSummaryUrl(definition.id, environment.definitionEnvironmentId);

                            if (event.ctrlKey || event.shiftKey || event.nativeEvent.which === 2) {
                                let newWindow = window.open();
                                newWindow.opener = null;
                                newWindow.location.href = url;
                            }
                            else {
                                DefinitionsUtils.navigateToEnvironmentSummary(url);
                            }
                        }
                    }
                );
            });
        }

        return items;
    }

    private _shouldDisableAddToDashboard(): boolean {
        if (!this.state.dashboardEntries || this.state.dashboardEntries.length === 0 || !VssContext.getDefaultWebContext().team) {
            return true;
        }

        let editableDashboard = this.state.dashboardEntries.find((dashboard: IDashboardEntry) => { return dashboard.canEdit; });
        return !editableDashboard;
    }

    private _createSubMenuItem(dashboardEntry: IDashboardEntry, widgetData: IWidgetData): IPivotBarAction {

        let subMenuItem: IPivotBarAction = {
            key: AllDefinitionsContentKeys.PinToDashboardSubMenuKey + dashboardEntry.id,
            name: dashboardEntry.name,
            title: dashboardEntry.name,
            onClick: () => {
                this._definitionsActionsCreator.pinWidgetToDashboard(widgetData, Source.ActiveDefinitionsCommandBar);
            },
            disabled: !dashboardEntry.canEdit
        };

        return subMenuItem;
    }

    private _getActiveDefinition(): IDefinitionEntry {
        // if (this._hubViewState.selectedPivot && this._hubViewState.selectedPivot.value) {
        //     switch (this._hubViewState.selectedPivot.value) {
        //         case DefinitionsHubKeys.AllDefinitionsPivotItemKey:
        if (this._allDefinitionsContentRef) {
            return this._allDefinitionsContentRef.getActiveDefinition();
        }
        //        case DefinitionsHubKeys.MinePivotItemKey:
        // todo:nidhi/sandeep in mine page
        // if (this._activeDefinitionsContentRef) {
        //     return this._activeDefinitionsContentRef.getActiveDefinition();
        // }
        //    }
        //}

        return null;
    }

    private _getActiveFolderPath(): string {
        // if (this._hubViewState.selectedPivot && this._hubViewState.selectedPivot.value) {
        //     switch (this._hubViewState.selectedPivot.value) {
        //         case DefinitionsHubKeys.AllDefinitionsPivotItemKey:
        if (this._allDefinitionsContentRef) {
            return this._allDefinitionsContentRef.getActiveFolderPath();
        }
        //        case DefinitionsHubKeys.MinePivotItemKey:
        // todo:nidhi/sandeep in mine page
        // if (this._activeDefinitionsContentRef) {
        //     return this._activeDefinitionsContentRef.getActiveFolderPath();
        // }
        //    }
        //}

        return AllDefinitionsContentKeys.PathSeparator;
    }

    private _commonDefinitionsStore: CommonDefinitionsStore;
    private _contributedPivotCommandItemProviders: ContributedItemArray<IPivotBarAction, IPivotBarAction>;
}

SDK_Shim.registerContent("releaseManagement.releasesHub", (context) => {
    PerfTelemetryManager.initialize();
    DefinitionsHubTelemetry.initialize();

    AppContext.instance().PageContext = context.options._pageContext;

    ReleasesHubServiceDataHelper.initialize();

    // On fast hub switching, we dont need to make a fresh data provider call, hence resetting the boolean in definitionsSource accordingly
    DefinitionsSource.instance().resetFetchCachedActiveDefinitionsData();

    ReactDOM.render(<DefinitionsHub hasAnyDefinition={ReleasesHubServiceDataHelper.areAnyReleaseDefinitionsPresent()} />, context.$container[0]);
});