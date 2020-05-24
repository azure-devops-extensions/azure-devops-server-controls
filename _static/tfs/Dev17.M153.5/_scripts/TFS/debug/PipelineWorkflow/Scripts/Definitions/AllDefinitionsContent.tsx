/// <reference types="react" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";
import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ConfirmationDialog } from "DistributedTaskControls/Components/ConfirmationDialog";
import { Component as MessageBar } from "DistributedTaskControls/Components/InformationBar";
import { FolderDetailsList, IProps as IFolderComponentProps } from "DistributedTaskControls/SharedControls/Folders/FolderDetailsList";
import { IFolderItem, IChildItem } from "DistributedTaskControls/SharedControls/Folders/Types";
import { FolderUtils as DtcFolderUtils } from "DistributedTaskControls/SharedControls/Folders/FolderUtils";
import { LoadableComponent } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponent";
import { ILoadableComponentState, LoadableComponentStore } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponentStore";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { UrlUtilities } from "DistributedTaskControls/Common/UrlUtilities";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";

import { FavoriteStar } from "Favorites/Controls/FavoriteStar";
import { canUseFavorites } from "Favorites/FavoritesService";

import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { IColumn, IDetailsRowProps, DetailsRow, ColumnActionsMode } from "OfficeFabric/DetailsList";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { css } from "OfficeFabric/Utilities";
import { Image, ImageFit } from "OfficeFabric/Image";
import { TooltipHost } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";

import { SecurityUtils } from "PipelineWorkflow/Scripts/Editor/Common/SecurityUtils";
import { AllDefinitionsContentKeys, MessageBarParentKeyConstants, DefinitionsHubKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import * as Constants from "PipelineWorkflow/Scripts/Common/Constants";
import { DefinitionsUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/DefinitionsUtils";
import { FavoritesActionsCreator } from "PipelineWorkflow/Scripts/Definitions/Favorites/FavoritesActionsCreator";
import { FolderUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/FolderUtils";
import { FolderDialog } from "PipelineWorkflow/Scripts/Definitions/FolderDialog/FolderDialog";
import { DefinitionsHubTelemetry, PerfTelemetryManager, PerfScenarios, Source } from "PipelineWorkflow/Scripts/Definitions/Utils/TelemetryUtils";
import { DefinitionsActionsCreator } from "PipelineWorkflow/Scripts/Definitions/DefinitionsActionsCreator";
import { DeleteDefinitionDialog } from "PipelineWorkflow/Scripts/Definitions/DeleteDefinitionDialog";
import { FolderDialogActionsCreator } from "PipelineWorkflow/Scripts/Definitions/FolderDialog/FolderDialogActionsCreator";
import { ReleasesHubServiceDataHelper } from "PipelineWorkflow/Scripts/Definitions/ReleasesHubServiceData";
import { DefinitionsStore } from "PipelineWorkflow/Scripts/Definitions/Stores/DefinitionsStore";
import { DefinitionsViewStore } from "PipelineWorkflow/Scripts/Definitions/Stores/DefinitionsViewStore";
import { FolderPickerStore } from "PipelineWorkflow/Scripts/Definitions/FolderPicker/FolderPickerStore";
import { FolderDialogStore } from "PipelineWorkflow/Scripts/Definitions/FolderDialog/FolderDialogStore";
import { IWidgetData, WidgetUtils, ReleaseManagementWidgetTypes } from "PipelineWorkflow/Scripts/Widgets/Common/WidgetsHelper";

import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { CreateReleaseStore, ICreateReleaseStoreArgs } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseStore";
import { ReleaseReportingStore, IReleaseReportingStoreArgs } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingStore";
import { ReleaseReportingDialog } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingDialog";
import { CreateReleaseActionsCreator } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseActionsCreator";
import { ReleaseReportingActionsCreator } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingActionsCreator";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";

import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { IdentityHelper } from "PipelineWorkflow/Scripts/Shared/Utils/IdentityHelper";
import { ResourcePathUtils } from "PipelineWorkflow/Scripts/Shared/Utils/ResourcePathUtils";
import { UIUtils } from "PipelineWorkflow/Scripts/Shared/Utils/UIUtils";

import * as Manager from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Manager";
import * as RMUtilsCore from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core";

import { showAddToDashboard, PushToDashboardProps } from "TFSUI/Dashboards/AddToDashboard";
import { WidgetDataForPinning } from "TFSUI/Dashboards/AddToDashboardContracts";
import { PinArgs } from "TFSUI/Dashboards/AddToDashboard";
import { AddToDashboardMessage } from "TFSUI/Dashboards/AddToDashboardMessage";
import * as DashboardContracts from "TFS/Dashboards/Contracts";

import * as VSSContext from "VSS/Context";
import * as Performance from "VSS/Performance";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";
import * as VSS from "VSS/VSS";
import * as Contribution_Controls from "VSS/Contributions/Controls";
import * as Service from "VSS/Service";
import { HubsService } from "VSS/Navigation/HubsService";
import { getHistoryService, getDefaultPageTitleFormatString } from "VSS/Navigation/Services";
import { ZeroData } from "VSSUI/ZeroData";

import { VssIconType, IVssIconProps } from "VSSUI/Components/VssIcon";
import { IVssContextualMenuItemProvider } from "VSSUI/VssContextualMenu";
import { ContributableMenuItemProvider } from "VSSPreview/Providers/ContributableMenuItemProvider";

import * as CreateReleasePanelHelper_TypeOnly from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleasePanelHelper";
import * as CreateReleaseDialog_TypeOnly from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/ReleaseDialog";
import * as ReleaseReportingPanelHelper_TypeOnly from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingPanelHelper";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Definitions/AllDefinitionsContent";

export interface IDefinitionEntry extends IChildItem {
    lastRelease: PipelineTypes.PipelineReference;
    lastReleaseCreatedOn: string;
    isFavorite: boolean;
    favoriteId: string;
    path: string;
    canEditReleaseDefinition: boolean;
    canViewReleaseDefinition: boolean;
    canExportReleaseDefinition: boolean;
    canCreateRelease: boolean;
    canDeleteReleaseDefinition: boolean;
    canManagePermissions: boolean;
}

export interface ISearchResultDefinitionEntry extends IDefinitionEntry {
}

export interface IFolderEntry extends IFolderItem {
    canEdit?: boolean;
    canDelete?: boolean;
    canManagePermissions?: boolean;
}

export interface IActiveEntry {
    item: IFolderEntry | IDefinitionEntry;
    isFolder: boolean;
}

export interface IDashboardEntry extends DashboardContracts.DashboardGroupEntry {
    canEdit?: boolean;
}

export interface IAddToDashboardState {
    // Id of the dashboard to pin to.
    dashboardId: string;

    // Name of the dashboard to pin to.
    dashboardName: string;

    // Id of the target dashboard's group/team.
    groupId: string;

    // Name of the widget to be pinned.
    widgetName: string;

    // Type of the message to display - success or error.
    messageType: MessageBarType;
}

export interface IAllDefinitionsState {
    folders: IFolderEntry[];
    definitions: IDefinitionEntry[];
    searchResultDefinitions: ISearchResultDefinitionEntry[];
    showSearchResults: boolean;
    searchResultsLoading: boolean;
    isLoadingDefinitions: boolean;
    dashboardEntries: IDashboardEntry[];
    isNoResultsImageLoaded: boolean;
    addToDashboardState?: IAddToDashboardState;
}

export class AllDefinitionsContent extends Component<IProps, IAllDefinitionsState>{

    constructor(props: IProps) {
        super(props);
        PerfTelemetryManager.instance.startTTIScenario(PerfScenarios.AllDefinitions);
        this._isLoadingMoreDefinitions = false;
        this._rowViewStore = StoreManager.GetStore<DefinitionsViewStore>(DefinitionsViewStore);
        this._definitionsStore = StoreManager.GetStore<DefinitionsStore>(DefinitionsStore);
        this._folderPickerstore = StoreManager.GetStore<FolderPickerStore>(FolderPickerStore); // hack for making folder picker work with menu actions items for the first time
        this._folderDialogstore = StoreManager.GetStore<FolderDialogStore>(FolderDialogStore); // hack for making folder dialog work with menu actions items for the first time
        this._definitionsActionsCreator = ActionCreatorManager.GetActionCreator<DefinitionsActionsCreator>(DefinitionsActionsCreator, AllDefinitionsContentKeys.DefinitionsActionsInstanceId);
        this._folderDialogActionsCreator = ActionCreatorManager.GetActionCreator<FolderDialogActionsCreator>(FolderDialogActionsCreator);
        this._messageHandlerActionsCreator = ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);
        this._favoritesActionCreator = ActionCreatorManager.GetActionCreator<FavoritesActionsCreator>(FavoritesActionsCreator);
    }

    public render(): JSX.Element {
        let content: JSX.Element = null;

        const resourcePath = ReleasesHubServiceDataHelper.getResourcePath();

        // showSearchResults can be changed to an enum (like mine,all,searchresults ...etc) to support mine tab ...etc
        if (this.state.showSearchResults) {
            if ((this.state.searchResultDefinitions.length > 0 || this.state.searchResultsLoading)) {
                content = this._getSearchResultsContent();
            }
            else if (this.state.searchResultDefinitions.length === 0 && !this.state.searchResultsLoading) {
                const secondaryText = (
                    <div className={"no-results-message"}>
                        {Resources.NoItemsMatchYourFilterText}
                    </div>
                );
                content = (<div className={"no-results-container"}>
                    <ZeroData
                        secondaryText={secondaryText}
                        imageAltText={""}
                        imagePath={ResourcePathUtils.getResourcePath("zerodata-release-management-new.png", resourcePath)}
                    />
                </div>);
            }
        }
        else {
            if (this.state.definitions.length > 0 || this.state.folders.length > 1) {
                content = this._getAllDefinitionsContent();
            }
            else {
                // place holder for getting started experience
                content = (<div />);
            }
        }

        return (
            <div className={"all-definitions-details-list"}
                ref={this._resolveRef("_detailsListContainerRef")}
                onScroll={this._handleScrollEvent}>
                <MessageBar parentKey={MessageBarParentKeyConstants.DefinitionsHubSuccessMessageBarKey} />
                <MessageBar parentKey={MessageBarParentKeyConstants.DefinitionsHubErrorMessageBarKey} />
                {this._renderAddToDashboardMessage()}
                {
                    this.state.isLoadingDefinitions &&
                    <Spinner className={"all-definitions-loading-spinner"} key={"Spinner"} size={SpinnerSize.large} label={Resources.Loading} ariaLabel={Resources.Loading} />
                }
                {
                    this.state.showSearchResults && this.state.searchResultsLoading &&
                    <Spinner className={"all-definitions-loading-spinner"} key={"Spinner"} size={SpinnerSize.large} label={Resources.Searching} ariaLabel={Resources.Searching} />
                }
                {
                    !this.state.isLoadingDefinitions && !this.state.searchResultsLoading &&
                    content
                }
            </div>
        );
    }

    public componentWillMount(): void {
        // Clear the messages on tab change
        this._messageHandlerActionsCreator.dismissMessage(MessageBarParentKeyConstants.DefinitionsHubSuccessMessageBarKey);
        this._messageHandlerActionsCreator.dismissMessage(MessageBarParentKeyConstants.DefinitionsHubErrorMessageBarKey);
        this._definitionsActionsCreator.setAddToDashboardMessageState(null);
        this._loadableComponentStore = StoreManager.GetStore<LoadableComponentStore>(LoadableComponentStore, AllDefinitionsContentKeys.DefinitionsActionsInstanceId);
        this._definitionsActionsCreator.fetchAllDefinitionsInitialData();

        const currentUrlState = getHistoryService().getCurrentState();
        getHistoryService().replaceHistoryPoint(
            null,
            { view: DefinitionsHubKeys.AllDefinitionsPivotItemKey },
            Utils_String.format(getDefaultPageTitleFormatString(), Resources.ReleaseDefinitionsTitle),
            false,
            false);

        this.setState(this._rowViewStore.getState());
    }

    public componentDidMount(): void {
        this._rowViewStore.addChangedListener(this._onStoreUpdate);
        this._loadableComponentStore.addChangedListener(this._updateLoadingMoreDefinitions);
    }

    public componentWillUnmount() {
        this._rowViewStore.removeChangedListener(this._onStoreUpdate);
        this._loadableComponentStore.removeChangedListener(this._updateLoadingMoreDefinitions);
    }

    public componentDidUpdate(prevProps, prevState: IAllDefinitionsState): void {
        // We might need to fetch more definitions on first load itself such as in the case when the page is zoomed in
        if (!this._interactiveScrollEventInvoked && this.state.definitions && prevState.definitions) {
            let currentDefinitionRows: IDefinitionEntry[] = this.state.definitions.filter((row) => (row.folderId === 1));
            let previousDefinitionRows: IDefinitionEntry[] = prevState.definitions.filter((row) => (row.folderId === 1));
            if (currentDefinitionRows.length !== previousDefinitionRows.length) {
                setTimeout(() => {
                    this._fetchMoreRootFolderReleasesDefinitionsIfNeeded();
                }, 100);
            }
        }
    }

    public getActiveDefinition(): IDefinitionEntry {
        if (this._activeItem && !this._activeItem.isFolder) {
            let activeDefinition = (this._activeItem.item as IDefinitionEntry);
            return activeDefinition;
        }

        return null;
    }

    public getActiveFolderPath(): string {
        if (this._activeItem && this._activeItem.isFolder) {
            return (this._activeItem.item as IFolderEntry).path;
        }

        return AllDefinitionsContentKeys.PathSeparator;
    }

    private _getAllDefinitionsContent(): JSX.Element {
        let props: IFolderComponentProps<IFolderEntry, IDefinitionEntry> = {
            showRootFolder: true,
            rootFolderName: Resources.AllDefinitionsText,
            folders: this.state.folders,
            childItems: this.state.definitions,
            columns: this._getAllDefinitionsDetailsListColumns(),
            actionsColumnKey: AllDefinitionsContentKeys.DefinitionsFavoritesColumnHeaderKey,
            childItemIcon: "bowtie-deploy",
            classNameForDetailsList: "all-definitions-details-list-content",
            classNameForDetailsRow: "all-definitions-details-row",
            onGetFolderMenuItems: this._getFolderMenuItems,
            onGetChildMenuItems: this._getDefinitionMenuItems,
            onGetFolderMenuItemProviders: this._getFolderMenuItemProviders,
            onGetChildMenuItemProviders: this._getDefinitionMenuItemProviders,
            onRenderChildItemColumn: this._onRenderDefinitionColumn,
            onActiveItemChanged: this.onActiveItemChanged,
            onFetchChildItems: (itemRow: IFolderEntry) => { this._definitionsActionsCreator.fetchFolderReleaseDefinitions(itemRow.id, itemRow.path); }
        };

        return (<div className={"folder-details-list"}>
            <FolderDetailsList {...props} />

            <div ref={this._resolveRef("_loadableComponentRef")} >
                <LoadableComponent className={"load-more-definitions-spinner"} instanceId={AllDefinitionsContentKeys.DefinitionsActionsInstanceId} size={SpinnerSize.large} ariaLabel={Resources.Loading} label={Resources.Loading} wait={10} />
            </div>
        </div>);
    }

    private _getSearchResultsContent(): JSX.Element {
        let props: IFolderComponentProps<IFolderEntry, ISearchResultDefinitionEntry> = {
            showRootFolder: false,
            rootFolderName: Utils_String.empty,
            folders: [],
            childItems: this.state.searchResultDefinitions,
            columns: this._getSearchResultsDetailsListColumns(),
            childItemIcon: "bowtie-deploy",
            classNameForDetailsList: "all-definitions-details-list-content",
            classNameForDetailsRow: "all-definitions-details-row",
            onGetFolderMenuItems: this._getFolderMenuItems,
            onGetChildMenuItems: this._getDefinitionMenuItems,
            onRenderChildItemColumn: this._onRenderDefinitionColumn,
            onActiveItemChanged: this.onActiveItemChanged,
            onFetchChildItems: null,
            actionsColumnKey: AllDefinitionsContentKeys.DefinitionsFavoritesColumnHeaderKey
        };

        return (<FolderDetailsList {...props} />);
    }

    private _getAllDefinitionsDetailsListColumns(): IColumn[] {
        let columns: IColumn[] = [
            {
                key: AllDefinitionsContentKeys.DefinitionsFavoritesColumnHeaderKey,
                fieldName: AllDefinitionsContentKeys.DefinitionsFavoritesColumnHeaderKey,
                name: Utils_String.empty,
                minWidth: 50,
                isResizable: true,
                maxWidth: 100,
                columnActionsMode: ColumnActionsMode.disabled

            },
            {
                key: AllDefinitionsContentKeys.DefinitionsLatestReleaseColumnHeaderKey,
                fieldName: AllDefinitionsContentKeys.DefinitionsLatestReleaseColumnHeaderKey,
                name: Resources.LatestReleaseColumnHeader,
                minWidth: 300,
                isResizable: true,
                maxWidth: 680,
                columnActionsMode: ColumnActionsMode.disabled
            }
        ];

        return columns;
    }

    private _getSearchResultsDetailsListColumns(): IColumn[] {
        let columns = this._getAllDefinitionsDetailsListColumns();

        columns.push({
            key: AllDefinitionsContentKeys.DefinitionsPathColumnHeaderKey,
            fieldName: AllDefinitionsContentKeys.DefinitionsPathColumnHeaderKey,
            name: Resources.DefinitionsPathColumnHeader,
            minWidth: 300,
            isResizable: true,
            maxWidth: 680,
            columnActionsMode: ColumnActionsMode.disabled
        });

        return columns;
    }

    private _onRenderDefinitionColumn = (itemRow: IDefinitionEntry | ISearchResultDefinitionEntry, index: number, column?: IColumn): JSX.Element => {
        if (column) {
            switch (column.fieldName) {
                case AllDefinitionsContentKeys.DefinitionsLatestReleaseColumnHeaderKey:
                    if (itemRow.lastRelease) {
                        return (<span className="last-triggered-by">
                            <TooltipHost content={itemRow.lastRelease.createdBy.displayName} directionalHint={DirectionalHint.rightCenter}>
                                <img src={IdentityHelper.getIdentityAvatarUrl(itemRow.lastRelease.createdBy)} className="release-identity-image" alt="" role="presentation" />
                            </TooltipHost>
                            <div className="release-createdon-name">{itemRow.lastRelease.createdBy.displayName}</div>
                            <div className="release-createdon-time">{itemRow.lastReleaseCreatedOn}</div>
                        </span>);
                    }
                    else {
                        return (<span className="no-release-text">{Resources.NoReleaseText}</span>);
                    }

                case AllDefinitionsContentKeys.DefinitionsPathColumnHeaderKey:
                    return (<span>{(itemRow as ISearchResultDefinitionEntry).path}</span>);

                case AllDefinitionsContentKeys.DefinitionsFavoritesColumnHeaderKey:
                    if (canUseFavorites()) {
                        return (<FavoriteStar
                            isFavorite={itemRow.isFavorite}
                            isDeleted={false}
                            className={"all-definitions-favorite-star"}
                            onToggle={() => {
                                if (itemRow.isFavorite) {
                                    DefinitionsHubTelemetry.DefinitionUnFavorited(Source.AllDefinitionsCommandBar);
                                    this._favoritesActionCreator.removeFavorite(itemRow.favoriteId, itemRow.id);
                                }
                                else {
                                    DefinitionsHubTelemetry.DefinitionFavorited(Source.AllDefinitionsCommandBar);
                                    this._favoritesActionCreator.addFavorite(itemRow.id, itemRow.name);
                                }
                            }}
                        />);
                    }
            }
        }
        else {
            return null;
        }
    }

    private onActiveItemChanged = (itemRow: IDefinitionEntry | IFolderEntry, isFolder: boolean): void => {
        this._activeItem = { item: itemRow, isFolder: isFolder };
    }

    private _onStoreUpdate = () => {
        this.setState(this._rowViewStore.getState());
    }

    private _updateLoadingMoreDefinitions = () => {
        this._isLoadingMoreDefinitions = this._loadableComponentStore.getState().isLoading;

        if (this._isLoadingMoreDefinitions) {
            Utils_Core.delay(this, 300, () => {
                if (this._isLoadingMoreDefinitions && this._loadableComponentRef) {
                    this._loadableComponentRef.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
                }
            });
        }
    }

    private _getFolderMenuItems = (itemRow: IFolderEntry): IContextualMenuItem[] => {
        let menuItems: IContextualMenuItem[] = [];
        if (Manager.FeaturesManager.areBasicLicenseReleaseManagementFeaturesEnabled()) {
            if (itemRow.canEdit) {
                menuItems.push(
                    {
                        key: AllDefinitionsContentKeys.CreateDefinitionMenuOptionKey,
                        name: Resources.CreateDefinitionContextualMenuOptionText,
                        iconProps: {
                            className: "bowtie-icon bowtie-math-plus"
                        },
                        onClick: (e: React.MouseEvent<HTMLElement>) => { this._handleCreateDefinition(e, itemRow.id, itemRow.path); },
                        title: UIUtils.getAccessDeniedTooltipText(!itemRow.canEdit, Resources.CreateDefinitionContextualMenuOptionText)
                    },
                    {
                        key: AllDefinitionsContentKeys.CreateFolderMenuOptionKey,
                        name: Resources.CreateFolderContextualMenuOptionText,
                        onClick: (e: React.MouseEvent<HTMLElement>) => { this._handleCreateFolder(e, itemRow.id, itemRow.path); },
                        title: UIUtils.getAccessDeniedTooltipText(!itemRow.canEdit, Resources.CreateFolderContextualMenuOptionText)
                    },
                    {
                        key: AllDefinitionsContentKeys.MenuDividerKey_1,
                        name: "-",
                    }
                );
            }

            if (!FolderUtils.isRootPath(itemRow.path)) {
                if (itemRow.canEdit) {
                    menuItems.push({
                        key: AllDefinitionsContentKeys.RenameFolderMenuOptionKey,
                        name: Resources.RenameFolderContextualMenuText,
                        iconProps: {
                            className: "bowtie-icon bowtie-edit-rename"
                        },
                        onClick: (e: React.MouseEvent<HTMLElement>) => { this._handleRenameFolder(e, itemRow.id, itemRow.path); },
                        title: UIUtils.getAccessDeniedTooltipText(!itemRow.canEdit, Resources.RenameFolderContextualMenuText)
                    });
                }

                if (itemRow.canDelete) {
                    menuItems.push({
                        key: AllDefinitionsContentKeys.DeleteFolderMenuOptionKey,
                        name: Resources.DeleteRdContextualMenuText,
                        iconProps: {
                            className: "bowtie-icon bowtie-trash"
                        },
                        onClick: (e: React.MouseEvent<HTMLElement>) => { this._handleDeleteFolder(e, itemRow.path); },
                        title: UIUtils.getAccessDeniedTooltipText(!itemRow.canDelete, Resources.DeleteRdContextualMenuText)
                    });
                }

                if (itemRow.canEdit || itemRow.canDelete) {
                    menuItems.push({
                        key: AllDefinitionsContentKeys.MenuDividerKey_1,
                        name: "-",
                    });
                }
            }

            if (itemRow.canManagePermissions) {
                menuItems.push({
                    key: AllDefinitionsContentKeys.SecurityMenuOptionKey,
                    name: Resources.SecurityText,
                    iconProps: {
                        className: "bowtie-icon bowtie-shield"
                    },
                    onClick: (e: React.MouseEvent<HTMLElement>) => { this._handleFolderSecurity(e, itemRow.path); },
                    title: UIUtils.getAccessDeniedTooltipText(!itemRow.canManagePermissions, Resources.SecurityText)
                });
            }
        }

        return menuItems;
    }

    private _getDefinitionMenuItems = (itemRow: IDefinitionEntry): IContextualMenuItem[] => {
        let definitionMenuItems: any[] = [];
        if (Manager.FeaturesManager.areBasicLicenseReleaseManagementFeaturesEnabled()) {
            if (itemRow.canCreateRelease) {
                definitionMenuItems.push(
                    {
                        key: AllDefinitionsContentKeys.CreateReleaseMenuOptionKey,
                        name: Resources.CreateReleaseMenuOptionText,
                        iconProps: {
                            className: "bowtie-icon bowtie-build-queue-new"
                        },
                        onClick: () => { this._createRelease(itemRow.name, itemRow.id); },
                        title: UIUtils.getAccessDeniedTooltipText(!itemRow.canCreateRelease, Resources.CreateReleaseMenuOptionText)
                    },
                    {
                        key: AllDefinitionsContentKeys.DraftReleaseMenuOptionKey,
                        name: Resources.CreateDraftReleaseMenuOptionText,
                        iconProps: {
                            className: "bowtie-icon bowtie-draft"
                        },
                        onClick: () => { this._definitionsActionsCreator.createDraftRelease(itemRow.id, Source.AllDefinitionsDefinitionMenu); },
                        title: UIUtils.getAccessDeniedTooltipText(!itemRow.canCreateRelease, Resources.CreateDraftReleaseMenuOptionText)
                    },
                    {
                        key: AllDefinitionsContentKeys.MenuDividerKey_1,
                        name: "-",
                    }
                );
            }

            if (itemRow.canExportReleaseDefinition) {
                // Using exportReleaseDefinition permission for the time being as it represents the same permission override

                const commandName = itemRow.canEditReleaseDefinition ? Resources.EditRdContextualMenuText : Resources.ViewRdContextualMenuText;

                const iconProps: IVssIconProps = itemRow.canEditReleaseDefinition
                    ? { className: "bowtie-icon bowtie-edit" }
                    : { iconName: "EntryView", iconType: VssIconType.fabric };

                definitionMenuItems.push(
                    {
                        key: AllDefinitionsContentKeys.EditMenuOptionKey,
                        name: commandName,
                        iconProps: iconProps,
                        onClick: (e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => { this._handleEditDefinition(e, itemRow.id); },
                        title: UIUtils.getAccessDeniedTooltipText(!itemRow.canViewReleaseDefinition, commandName)
                    }
                );
            }

            if (itemRow.canEditReleaseDefinition) {
                definitionMenuItems.push(
                    {
                        key: AllDefinitionsContentKeys.RenameDefinitionMenuOptionKey,
                        name: Resources.RenameDefinitionContextualMenuText,
                        iconProps: {
                            className: "bowtie-icon bowtie-edit-rename"
                        },
                        onClick: (e: React.MouseEvent<HTMLElement>) => { this._handleRenameDefinition(e, itemRow); },
                        title: UIUtils.getAccessDeniedTooltipText(!itemRow.canEditReleaseDefinition, Resources.RenameDefinitionContextualMenuText)
                    }
                );
            }

            if (itemRow.canDeleteReleaseDefinition) {
                definitionMenuItems.push(
                    {
                        key: AllDefinitionsContentKeys.DeleteRdMenuOptionKey,
                        name: Resources.DeleteRdContextualMenuText,
                        iconProps: {
                            className: "bowtie-icon bowtie-trash"
                        },
                        onClick: () => {
                            this._showDeleteDefinitionDialog(itemRow.name, itemRow.id);
                        },
                        title: UIUtils.getAccessDeniedTooltipText(!itemRow.canDeleteReleaseDefinition, Resources.DeleteRdContextualMenuText)
                    }
                );
            }

            if (itemRow.canEditReleaseDefinition) {
                definitionMenuItems.push(
                    {
                        key: AllDefinitionsContentKeys.CloneMenuOptionKey,
                        name: Resources.CloneText,
                        iconProps: {
                            className: "bowtie-icon bowtie-clone",
                        },
                        onClick: () => { DefinitionsUtils.handleCloneDefinition(itemRow.id, Source.AllDefinitionsDefinitionMenu); },
                        title: UIUtils.getAccessDeniedTooltipText(!itemRow.canEditReleaseDefinition, Resources.CloneText)
                    },
                );
            }

            if (itemRow.canExportReleaseDefinition) {
                definitionMenuItems.push(
                    {
                        key: AllDefinitionsContentKeys.ExportMenuOptionKey,
                        name: Resources.ExportRdContextualMenuText,
                        iconProps: {
                            className: "bowtie-icon bowtie-transfer-download"
                        },
                        onClick: () => { this._definitionsActionsCreator.exportDefinition(itemRow.id, Source.AllDefinitionsDefinitionMenu); },
                        title: UIUtils.getAccessDeniedTooltipText(!itemRow.canExportReleaseDefinition, Resources.ExportRdContextualMenuText)
                    }
                );
            }

            if (itemRow.canViewReleaseDefinition || itemRow.canEditReleaseDefinition || itemRow.canDeleteReleaseDefinition || itemRow.canExportReleaseDefinition) {
                definitionMenuItems.push(
                    {
                        key: AllDefinitionsContentKeys.MenuDividerKey_2,
                        name: "-",
                    }
                );
            }

            // Permissions are checked on a per-dashboard basis on the server-side during the createWidget API call, so we are not performing explicit permission checks client-side
            // Do not show dashboard menu item for anonymous user
            if (PermissionHelper.canAddDefinitionToDashboard) {
                const webContext = VSSContext.getDefaultWebContext();
                const widgetType = ReleaseManagementWidgetTypes.RELEASE_DEFINITION_SUMMARY_WIDGET;
                let data = JSON.stringify({
                    releaseDefinitionId: itemRow.id,
                });
                definitionMenuItems.push(
                    {
                        key: AllDefinitionsContentKeys.AddToDashboardMenuOptionKey,
                        name: Resources.AddToDashboardContextualMenuText,
                        iconProps: {
                            className: "bowtie-icon bowtie-math-plus"
                        },
                        title: UIUtils.getAccessDeniedTooltipText(this._shouldDisableAddToDashboard(), Resources.AddToDashboardContextualMenuText),
                        onClick: () => {
                            let widgetData: WidgetDataForPinning = {
                                name: itemRow.name,
                                contributionId: widgetType,
                                settings: data,
                                settingsVersion: null,
                                size: WidgetUtils.getSizeForWidgetType(widgetType)
                            };

                            let addToDashboardProps: PushToDashboardProps = {
                                projectId: webContext.project.id,
                                widgetData: widgetData,
                                actionCallback: (args: PinArgs) => { this._addToDashboardCallback(args, itemRow.name); }
                            };

                            showAddToDashboard(addToDashboardProps);
                        },
                    },
                    {
                        key: AllDefinitionsContentKeys.MenuDividerKey_3,
                        name: "-",
                    }
                );
            }

            if (itemRow.canEditReleaseDefinition) {
                definitionMenuItems.push(
                    {
                        key: AllDefinitionsContentKeys.MoveMenuOptionKey,
                        name: Resources.MoveRdContextualMenuText,
                        iconProps: {
                            className: "bowtie-icon bowtie-folder",
                        },
                        onClick: (e: React.MouseEvent<HTMLElement>) => { this._handleMoveDefinition(e, itemRow); },
                        title: UIUtils.getAccessDeniedTooltipText(!itemRow.canEditReleaseDefinition, Resources.MoveRdContextualMenuText)
                    },
                );
            }

            if (itemRow.canManagePermissions) {
                definitionMenuItems.push(
                    {
                        key: AllDefinitionsContentKeys.SecurityMenuOptionKey,
                        name: Resources.SecurityText,
                        iconProps: {
                            className: "bowtie-icon bowtie-shield"
                        },
                        onClick: () => { this._handleDefinitionSecurity(itemRow.id, itemRow.folderId, itemRow.name); },
                        title: UIUtils.getAccessDeniedTooltipText(!itemRow.canManagePermissions, Resources.SecurityText)
                    }
                );
            }
        }

        return definitionMenuItems;
    }

    private _addToDashboardCallback = (args: PinArgs, rdName: string): void => {
        const isVerticalNavigationOn: boolean = FeatureFlagUtils.isVerticalNavigationOn();
        if (isVerticalNavigationOn) {
            this._definitionsActionsCreator.setAddToDashboardMessageState(args);
        }
        else {
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

    /** Renders a message bar indicating success/failure of add to dashboard operation after it is performed */
    private _renderAddToDashboardMessage(): JSX.Element {
        return this.state.addToDashboardState &&
            <AddToDashboardMessage
                cssClass={"all-definitions-dashboard-message"}
                dashboardName={this.state.addToDashboardState.dashboardName}
                dashboardId={this.state.addToDashboardState.dashboardId}
                groupId={this.state.addToDashboardState.groupId}
                currentDashboardId={"-1"} // currentDashboardId has no context for Releases hub
                widgetName={this.state.addToDashboardState.widgetName}
                messageBarType={this.state.addToDashboardState.messageType}
                onDismiss={() => { this._definitionsActionsCreator.setAddToDashboardMessageState(null); }}
            />;
    }

    private _getFolderMenuItemProviders = (itemRow: IFolderEntry): IVssContextualMenuItemProvider[] => {
        return [];
    }

    private _getDefinitionMenuItemProviders = (itemRow: IDefinitionEntry): IVssContextualMenuItemProvider[] => {
        return [new ContributableMenuItemProvider([Constants.ContributionIds.AllDefinitionsContextMenuContributionId], {
            definition: this._definitionsStore.getDefinitionById(itemRow.id)
        })];
    }

    private _handleScrollEvent = (): void => {
        this._interactiveScrollEventInvoked = true;
        this._fetchMoreRootFolderReleasesDefinitionsIfNeeded();
    }

    private _fetchMoreRootFolderReleasesDefinitionsIfNeeded(): void {
        if (this._detailsListContainerRef && !this._isLoadingMoreDefinitions && !this.state.isLoadingDefinitions && !this.state.showSearchResults) {
            // adding margin of 40 pixels to handle zoom-in and zoom-out scenarios
            let scrollPositionFromBottom = this._detailsListContainerRef.clientHeight + this._detailsListContainerRef.scrollTop - this._detailsListContainerRef.scrollHeight;
            if (scrollPositionFromBottom >= -20 && scrollPositionFromBottom <= 20) {
                this._definitionsActionsCreator.fetchMoreRootFolderReleaseDefinitions();
            }
        }
    }

    private _handleEditDefinition = (event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, definitionId: number) => {
        const openInNewWindow: boolean = event && event.ctrlKey;
        DefinitionsUtils.handleEditDefinition(definitionId, Source.ActiveDefinitionsCommandBar, openInNewWindow);
    }

    private _handleDeleteFolder = (e: React.MouseEvent<HTMLElement>, folderPath: string): void => {
        DefinitionsHubTelemetry.DeleteFolderClicked();

        const dialogContainer = document.createElement("div");
        ReactDOM.render(
            <ConfirmationDialog
                title={Resources.DeleteFolderDialogTitle}
                subText={Utils_String.localeFormat(Resources.DeleteFolderConfirmationMessage, folderPath)}
                onConfirm={() => this._onDeleteFolder(folderPath)}
                showDialog={true}
                onCancel={() => { ReactDOM.unmountComponentAtNode(dialogContainer); }}
                focusCancelButton={true} />,
            dialogContainer);
    }

    private _onDeleteFolder(folderPath: string) {
        PerfTelemetryManager.instance.startScenario(PerfScenarios.DeleteFolder);
        this._definitionsActionsCreator.deleteFolder(folderPath);
    }

    private _handleMoveDefinition = (e: React.MouseEvent<HTMLElement>, definition: IDefinitionEntry): void => {
        DefinitionsHubTelemetry.MoveRDClicked();

        let parentFolderPath = this._rowViewStore.getFolderPath(definition.folderId);
        FolderDialog.showMoveDefinitionDialog(definition, parentFolderPath);
    }

    private _handleCreateDefinition = (e: React.MouseEvent<HTMLElement>, folderId: number, folderPath: string): void => {
        DefinitionsHubTelemetry.newReleaseDefinitionClickedFromFolderMenu();
        DefinitionsUtils.navigateToCreateDefinition(folderPath);
    }

    private _handleCreateFolder = (e: React.MouseEvent<HTMLElement>, folderId: number, folderPath: string): void => {
        DefinitionsHubTelemetry.newFolderClickedFromFolderMenu();

        FolderDialog.showCreateFolderDialog(folderPath);
    }

    private _handleRenameFolder = (e: React.MouseEvent<HTMLElement>, folderId: number, folderPath: string): void => {
        DefinitionsHubTelemetry.RenameFolderClicked();

        FolderDialog.showRenameFolderDialog(FolderUtils.getFolderName(folderPath), DtcFolderUtils.getParentFolderPath(folderPath));
    }

    private _handleRenameDefinition = (e: React.MouseEvent<HTMLElement>, definition: IDefinitionEntry): void => {
        DefinitionsHubTelemetry.RenameDefinitionClicked();

        let parentFolderPath = this._rowViewStore.getFolderPath(definition.folderId);
        FolderDialog.showRenameDefinitionDialog(definition, parentFolderPath);
    }

    private _handleFolderSecurity = (e: React.MouseEvent<HTMLElement>, folderPath: string): void => {
        DefinitionsHubTelemetry.FolderLevelSecurityChangedFromFolderMenu(folderPath);
        SecurityUtils.openFolderSecurityDialog(folderPath);
    }

    private _handleDefinitionSecurity(definitionId: number, folderId: number, definitionName: string): void {
        let folderPath = this._rowViewStore.getFolderPath(folderId);
        DefinitionsHubTelemetry.DefinitionLevelSecurityChangedFromDefinitionsMenu(folderPath);
        SecurityUtils.openDefinitionSecurityDialog(definitionId, definitionName, folderPath);
    }

    private _showDeleteDefinitionDialog(definitionName: string, definitionId: number): void {
        DefinitionsHubTelemetry.DeleteDefinitionClicked(Source.AllDefinitionsDefinitionMenu);

        const dialogContainer = document.createElement("div");
        ReactDOM.render(
            <DeleteDefinitionDialog
                definitionName={definitionName}
                onOkButtonClick={(comment: string, forceDelete: boolean) => {
                    this._definitionsActionsCreator.deleteDefinition(definitionId, definitionName, comment, forceDelete);
                    ReactDOM.unmountComponentAtNode(dialogContainer);
                }}
                onCancelButtonClick={() => {
                    ReactDOM.unmountComponentAtNode(dialogContainer);
                }}
            />,
            dialogContainer);
    }

    private _createRelease(definitionName: string, definitionId: number): void {
        DefinitionsHubTelemetry.CreateReleaseClicked(Source.AllDefinitionsDefinitionMenu);
        if (FeatureFlagUtils.isNewCreateReleaseWorkflowEnabled()) {
            DefinitionsUtils.createRelease(definitionName, definitionId, this._onCreateRelease);
        } else {
            this._showCreateReleaseDialog(definitionName, definitionId);
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

    private _showAnalysisDialog(definitionName: string, definitionId: number): void {
        VSS.using(["PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingPanelHelper"],
            (ReleaseReportingPanelHelper: typeof ReleaseReportingPanelHelper_TypeOnly) => {
                let releaseReportingDialogInstanceId = DtcUtils.getUniqueInstanceId();
                let releaseReportingPanelHelper = new ReleaseReportingPanelHelper.ReleaseReportingPanelHelper({ definitionId: definitionId });
                releaseReportingPanelHelper.InitializeReportingStore(releaseReportingDialogInstanceId);
                let releaseReportingDialogStore = releaseReportingPanelHelper.getReportingStore();

                const dialogContainer = document.createElement("div");
                ReactDOM.render(
                    <ReleaseReportingDialog
                        instanceId={releaseReportingDialogInstanceId}
                        releaseReportingDialogStore={releaseReportingDialogStore}
                        releaseReportingActionsCreator={this._releaseReportingActionsCreator}
                        showDialog={true}
                        definitionId={definitionId}
                        definitionName={definitionName || Utils_String.empty}
                        onCloseDialog={() => { ReactDOM.unmountComponentAtNode(dialogContainer); }} />,
                    dialogContainer);
            });
    }

    private _getReleaseCreatedMessageBarContent = (pipelineRelease: PipelineTypes.PipelineRelease): JSX.Element => {
        return (<span>
            {Resources.ReleaseCreatedTextPrefix}
            <SafeLink href={DefinitionsUtils.getReleaseUrl(pipelineRelease)} target="_blank">{pipelineRelease.name}</SafeLink>
            {Resources.ReleaseCreatedTextSuffix}
        </span>);
    }

    private _onCreateRelease = (release: PipelineTypes.PipelineRelease, projectName?: string) => {
        this._definitionsActionsCreator.updateDefinitionLastReleaseReference(release.releaseDefinition.id);

        this._messageHandlerActionsCreator.addMessage(MessageBarParentKeyConstants.DefinitionsHubSuccessMessageBarKey, this._getReleaseCreatedMessageBarContent(release), MessageBarType.success);
    }

    private _createDashboardSubmenu(definitionName: string, definitionId: number): IContextualMenuItem[] {
        const webContext = VSSContext.getDefaultWebContext();
        let items: IContextualMenuItem[] = [];
        const widgetType = ReleaseManagementWidgetTypes.RELEASE_DEFINITION_SUMMARY_WIDGET;
        let data = JSON.stringify({
            releaseDefinitionId: definitionId,
        });

        if (this.state.dashboardEntries) {
            this.state.dashboardEntries.forEach((dashboardEntry: IDashboardEntry) => {
                let widgetData: IWidgetData = {
                    name: definitionName,
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

    private _shouldDisableAddToDashboard(): boolean {
        if (!this.state.dashboardEntries || this.state.dashboardEntries.length === 0 || !VSSContext.getDefaultWebContext().team) {
            return true;
        }

        let editableDashboard = this.state.dashboardEntries.find((dashboard: IDashboardEntry) => { return dashboard.canEdit; });
        return !editableDashboard;
    }

    private _createSubMenuItem(dashboardEntry: IDashboardEntry, widgetData: IWidgetData): IContextualMenuItem {

        let subMenuItem: IContextualMenuItem = {
            key: AllDefinitionsContentKeys.PinToDashboardSubMenuKey + dashboardEntry.id,
            name: dashboardEntry.name,
            title: dashboardEntry.name,
            onClick: () => {
                this._definitionsActionsCreator.pinWidgetToDashboard(widgetData, Source.AllDefinitionsDefinitionMenu);
            },
            disabled: !dashboardEntry.canEdit
        };

        return subMenuItem;
    }

    private _onNoResultsImageLoad = () => {
        this._definitionsActionsCreator.updateNoResultsImageLoadingStatus(true);
    }

    private _isLoadingMoreDefinitions: boolean;

    private _activeItem: IActiveEntry;
    private _rowViewStore: DefinitionsViewStore;
    private _folderPickerstore: FolderPickerStore;
    private _folderDialogstore: FolderDialogStore;
    private _loadableComponentStore: LoadableComponentStore;
    private _definitionsActionsCreator: DefinitionsActionsCreator;
    private _folderDialogActionsCreator: FolderDialogActionsCreator;
    private _releaseReportingActionsCreator: ReleaseReportingActionsCreator;
    private _detailsListContainerRef: HTMLDivElement;
    private _loadableComponentRef: HTMLDivElement;
    private _messageHandlerActionsCreator: MessageHandlerActionsCreator;
    private _definitionsStore: DefinitionsStore;
    private _favoritesActionCreator: FavoritesActionsCreator;

    // once user has scrolled down/up, we don’t need to automatically load more RDs. Hence not un-setting this value anywhere in the code
    private _interactiveScrollEventInvoked: boolean = false;
}