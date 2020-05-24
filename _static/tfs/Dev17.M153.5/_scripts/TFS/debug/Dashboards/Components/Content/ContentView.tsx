import * as React from "react";

import { autobind, BaseComponent, IBaseProps } from "OfficeFabric/Utilities";
import { PrimaryButton } from 'OfficeFabric/Button';
import { MessageBarType } from "OfficeFabric/MessageBar";

import { FavoriteStorageScopes } from "Favorites/Constants";
import { Favorite } from "Favorites/Contracts";
import { ArtifactPickerProvider, IArtifactPickerProvider, IArtifactPickerProviderOptions } from "Favorites/Controls/ArtifactPickerProvider";

import { IPickListAction, IPickListGroup } from "VSSUI/Components/PickList/PickList.Props";
import { ObservableValue } from "VSS/Core/Observable";
import { urlHelper } from "VSS/Locations";
import { getService as getActionService } from "VSS/Events/Action";
import { getDefaultWebContext } from "VSS/Context";
import { Hub, IHub } from "VSSUI/Hub";
import { HubHeader } from "VSSUI/HubHeader";
import { IVssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import {
	PivotBarItem,
	PivotBarViewActionType,
	IPivotBarAction,
	IPivotBarViewAction,
	PivotBarFocusItem,
	ITextViewActionProps } from 'VSSUI/PivotBar';
import { IVssIconProps, VssIconType } from "VSSUI/VssIcon";
import * as Service from "VSS/Service";
import * as Events_Action from "VSS/Events/Action";
import * as Utils_String from "VSS/Utils/String";
import { ZeroData, ZeroDataActionType, IZeroDataProps } from "VSSUI/ZeroData";

import { FavoriteTypes } from "TfsCommon/Scripts/Favorites/Constants";

import * as Dashboards_RestClient from "TFS/Dashboards/RestClient";
import { NavigationActionCreator } from "Dashboards/Components/NavigationActionCreator";
import { Events } from "TFS/Dashboards/Events";
import { Dashboard } from "TFS/Dashboards/Contracts";

import { DashboardRefreshManager } from "Dashboards/Components/Content/DashboardRefreshManager";
import { DashboardEvents } from "Dashboards/Scripts/DashboardEvents";
import { RefreshTimerEvents, getDashboardTeamContext } from "Dashboards/Scripts/Common";
import * as TFS_Dashboards_Resources from "Dashboards/Scripts/Resources/TFS.Resources.Dashboards";
import * as UserPermissionsHelper from "Dashboards/Scripts/Common.UserPermissionsHelper";
import { PinArgs } from "Dashboards/Scripts/Pinning.PushToDashboardInternal";
import { UrlConstants, ContributionIds } from "Dashboards/Components/Constants";
import { IDashboardsHubContext, SharedContext, DashboardsHubContext } from "Dashboards/Components/DashboardsHubContext";
import { AdminViewComponent } from "Dashboards/Components/Content/AdminView";
import { BaseViewComponent } from "Dashboards/Components/Content/BaseView";
import { AddToDashboardMessage } from "TFSUI/Dashboards/AddToDashboardMessage";
import { DashboardPageExtension } from "Dashboards/Scripts/Common";
import * as CreateDashboardDialog from "Dashboards/Components/Shared/CreateDashboardDialog/CreateDashboardDialog";
import { CreatedDashboardItem } from "Dashboards/Components/Shared/CreateDashboardDialog/CreateDashboardDialogModels";
import { DashboardItem } from "Dashboards/Components/Shared/Contracts";
import * as PageDataHelper from "Dashboards/Scripts/Common.PageHelpers";
import { WebApiTeam, TeamContext } from "TFS/Core/Contracts";
import { DashboardsPermissionsHelper } from "Dashboards/Components/Directory/DashboardsPermissionsHelper";
import { HubsService } from "VSS/Navigation/HubsService";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { TeamPanelIconButton } from "Presentation/Scripts/TFS/TeamPanel/TeamPanelIconButton";
import { BladeLevelConstants } from "Dashboards/Scripts/BladeConstants";

import "VSS/LoaderPlugins/Css!new-dashboard-experience";
import "VSS/LoaderPlugins/Css!Site";

export interface PickerDashboardItem extends DashboardItem {
    groupId?: string;
}

export interface ContentViewProps extends SharedContext, IBaseProps {
    hubViewState: IVssHubViewState;
    currentDashboard: Dashboard;
}

export interface AddToDashboardState {
    // Id of the dashboard to pin to.
    dashboardId: string;

    // Name of the dashboard to pin to.
    dashboardName: string;

    // Id of the group that owns the dashboard.
    groupId: string;

    // Name of the widget to be pinned.
    widgetName: string;

    // Type of the message to display - success or error.
    messageType: MessageBarType;
}

export interface ContentViewState {
    currentDashboard: Dashboard;
    inEditMode: boolean;
    isBladeOpen: boolean;
    artifactPicker?: IArtifactPickerProvider<PickerDashboardItem>;
    bladeLevel: BladeLevelConstants;
    addToDashboardState?: AddToDashboardState;
}

/**
 * The core view that renders individual dashboards.
 */
export class ContentView extends BaseComponent<ContentViewProps, ContentViewState> {
    private readonly dashboardContext: IDashboardsHubContext;
    private readonly navigateActionCreator: NavigationActionCreator;
    private readonly viewActionText: ObservableValue<string>;
    private readonly favoriteItemPropertyTeamNameKey = "TeamName";
    private readonly favoriteItemPropertyTeamIdKey = "TeamId";
    private readonly bowtieIconColor: string = "#333333"; // $secondary-dark-2

    private refreshManager: DashboardRefreshManager;
    private hub: IHub;

    private dashboardsPromise: PromiseLike<PickerDashboardItem[]>;

    constructor(props: ContentViewProps) {
        super(props);

        const teamContext = getDashboardTeamContext();

        this.dashboardContext = this.props.context;
        this.navigateActionCreator = this.dashboardContext.actionCreators.navigationActionCreator;

        this.viewActionText = new ObservableValue('');

        this.state = {
            inEditMode: false,
            currentDashboard: this.props.currentDashboard,
            artifactPicker: this.getArtifactPicker({
                dashboard: this.props.currentDashboard,
                groupId: teamContext.id,
                teamScope: {
                    teamId: teamContext.id,
                    teamName: teamContext.name
                }
            })
        } as ContentViewState;

        this._async.setInterval(this.updateViewText, 60 * 1000);
    }

    public componentDidMount(): void {
        super.componentDidMount();

        Events_Action.getService().registerActionWorker(
            DashboardEvents.DashboardUpdated,
            this.onDashboardUpdated);

        Events_Action.getService().registerActionWorker(
            RefreshTimerEvents.ResetTimer,
            this.onTimerReset);

        Events_Action.getService().registerActionWorker(
            RefreshTimerEvents.StartTimer,
            this.onTimerStart);

        Events_Action.getService().registerActionWorker(
            RefreshTimerEvents.StopTimer,
            this.onTimerStop);

        Events_Action.getService().registerActionWorker(
            RefreshTimerEvents.OnRefresh,
            this.onRefresh);

        Events_Action.getService().registerActionWorker(
            DashboardEvents.RequestEditModeToggle,
            this.requestEditModeToggle);

        Events_Action.getService().registerActionWorker(
            DashboardEvents.HeaderUpdate,
            this.onRequestHeaderUpdate);
    }

    public componentWillUnmount(): void {
        Events_Action.getService().unregisterActionWorker(
            DashboardEvents.DashboardUpdated,
            this.onDashboardUpdated);

        Events_Action.getService().unregisterActionWorker(
            RefreshTimerEvents.ResetTimer,
            this.onTimerReset);

        Events_Action.getService().unregisterActionWorker(
            RefreshTimerEvents.StartTimer,
            this.onTimerStart);

        Events_Action.getService().unregisterActionWorker(
            RefreshTimerEvents.StopTimer,
            this.onTimerStop);

        Events_Action.getService().unregisterActionWorker(
            DashboardEvents.RequestEditModeToggle,
            this.requestEditModeToggle);

        Events_Action.getService().unregisterActionWorker(
            RefreshTimerEvents.OnRefresh,
            this.onRefresh);

        Events_Action.getService().unregisterActionWorker(
            DashboardEvents.HeaderUpdate,
            this.onRequestHeaderUpdate);

        if (this.state.artifactPicker) {
            this.state.artifactPicker.dispose();
        }

        if (this.refreshManager) {
            this.refreshManager = null;
        }

        super.componentWillUnmount();
    }

    public render(): JSX.Element {
        this.setupRefreshTimer();
        const webContext = getDefaultWebContext();
        const teamContext = getDashboardTeamContext();

        const teamPanelIcon = teamContext && UserPermissionsHelper.canSeeActions() ?
        <TeamPanelIconButton
            projectName={webContext.project.name}
            projectId={webContext.project.id}
            teamId={teamContext.id}
            teamName={teamContext.name} />
        : null;

        return (
            <div className='dashboard-landing hub-view'>
                <div className='hub-content'>
                    <div id='container-without-scroll'>
                        {this.renderAddToDashboardMessage()}
                        <div id='container-with-scroll'>
                            <div className='team-dashboard-view'>
                                <Hub
                                    className='team-dashboard-hub'
                                    pivotBarContentClassName='hub-without-scroll'
                                    pivotBarClassName='hub-padding'
                                    componentRef={(hub => { this.hub = hub; })}
                                    hubViewState={this.props.hubViewState}
                                    commands={this.getCommands()}
                                    viewActions={this.mainViewActions()}
                                    hideHeader={this.state.inEditMode || this.state.isBladeOpen}>
                                    <HubHeader
                                        breadcrumbItems={[]}
                                        iconProps={this.bowtieDashboardIconProps}
                                        headerItemPicker={this.state.artifactPicker}
                                        pickListClassName={"dashboard-picker"}>
                                        { teamPanelIcon }
                                    </HubHeader>
                                    <PivotBarItem
                                        name='dashboard-content-item'
                                        className={`dashboard-content-item customPadding absolute-fill ${this.state.isBladeOpen ? 'blade-open' : ''}`}
                                        itemKey={UrlConstants.DashboardView}>
                                        <div className="left">
                                            <div id='curtain'></div>
                                            {
                                                this.state.inEditMode || this.state.isBladeOpen ?
                                                    <div className="edit-mode-banner">
                                                        {
                                                            this.state.inEditMode && this.state.bladeLevel === BladeLevelConstants.CatalogBladeLevel ?
                                                                <div className="items">
                                                                    <span>{TFS_Dashboards_Resources.EditModeBannerText}</span>
                                                                    <PrimaryButton
                                                                        onClick={this.onDoneEditingClick}
                                                                        className="edit-banner-button">{TFS_Dashboards_Resources.EditModeBannerButtonText}
                                                                    </PrimaryButton>
                                                                </div>: null
                                                        }
                                                    </div>: null
                                            }
                                            <div className='dashboard-hub-content'>
                                                { this.renderDashboardHubContent() }
                                            </div>
                                        </div>
                                        <div className="right">
                                            <nav id='blade-menu' style={{ display: "none" }}></nav>
                                        </div>
                                    </PivotBarItem>
                                </Hub>
                            </div>
                        </div>
                    </div>
                </div>
            </div>);
    }

    private renderDashboardHubContent(): JSX.Element {
        const showEmptyDashboardExperience = !this.state.inEditMode
            && !this.state.isBladeOpen
            && (!this.state.currentDashboard.widgets || this.state.currentDashboard.widgets.length === 0);

        const zeroDataProps: IZeroDataProps = {
            primaryText: TFS_Dashboards_Resources.DashboardZeroData_NoWidgets_PrimaryText,
            secondaryText: TFS_Dashboards_Resources.DashboardZeroData_NoWidgets_SecondaryText,
            imagePath: urlHelper.getVersionedContentUrl("Dashboards/zerodata-no-dashboard.svg"),
            imageAltText: Utils_String.empty
        };

        // Show "Add a widget" button if the user can edit the dashboard and the dashboard isn't embedded
        if (UserPermissionsHelper.CanEditDashboard() && !PageDataHelper.isEmbeddedPage()) {
            zeroDataProps.actionText = TFS_Dashboards_Resources.AddWidgetButtonText;
            zeroDataProps.actionType = ZeroDataActionType.ctaButton;
            zeroDataProps.onActionClick = this.onEditDashboardClick;
        }

        return (<>
            { showEmptyDashboardExperience ? <ZeroData {...zeroDataProps} /> : null }
            {
                // Even if the empty dashboard experience is shown we render the view component, albeit hidden,
                // because they're legacy components that operate outside the React render loop and need to register
                // listeners on the page.
                UserPermissionsHelper.CanEditDashboard() ?
                    <AdminViewComponent
                        containerStyle={{ display: !showEmptyDashboardExperience }}
                        onBladeToggled={(isOpen, bladeLevel) => { this.setState({ isBladeOpen: isOpen, bladeLevel: bladeLevel }); }}
                        onWidgetCopiedToDashboard={this.setAddToDashboardMessageState}
                    /> :
                    <BaseViewComponent
                        containerStyle={{ display: !showEmptyDashboardExperience }}
                        onWidgetCopiedToDashboard={this.setAddToDashboardMessageState}
                    />
            }
        </>);
}

/** Renders a message bar indicating success/failure of add to dashboard operation after it is performed */
    private renderAddToDashboardMessage(): JSX.Element {
        return this.state.addToDashboardState &&
            <AddToDashboardMessage
                dashboardName={this.state.addToDashboardState.dashboardName}
                dashboardId={this.state.addToDashboardState.dashboardId}
                currentDashboardId={this.state.currentDashboard.id}
                groupId={this.state.addToDashboardState.groupId}
                widgetName={this.state.addToDashboardState.widgetName}
                messageBarType={this.state.addToDashboardState.messageType}
                onDismiss={() => { this.setState({ addToDashboardState: undefined }) }}
            />;
    }

    @autobind
    private setAddToDashboardMessageState(args: PinArgs): void {
        this.setState({
            addToDashboardState: {
                dashboardName: args.commandArgs.dashboardName,
                dashboardId: args.commandArgs.dashboardId,
                groupId: args.commandArgs.groupId,
                widgetName: args.commandArgs.widgetData.name,
                messageType: (args.response && args.response.outcome === 0) ? MessageBarType.success : MessageBarType.error
            }
        });
    }

    private mainViewActions(): IPivotBarViewAction[] {
        let viewActions: IPivotBarViewAction[] = [];

        if (this.isRefreshEnabled()) {
            viewActions.push({
                actionType: PivotBarViewActionType.Text,
                key: 'dashboard-refresh-text',
                important: true,
                actionProps: { text: this.viewActionText } as ITextViewActionProps
            });
        }

        if (UserPermissionsHelper.CanEditDashboard()) {
            viewActions.push({
                actionType: PivotBarViewActionType.Command,
                key: 'dashboard-settings',
                title: TFS_Dashboards_Resources.NewDashboardsExperience_ManageDashboards_Tooltip,
                important: true,
                iconProps: this.settingsIconProps,
                onClick: this.onManageDashboardsClick,
            });
        }

        return viewActions;
    };

    private getCommands(): IPivotBarAction[] {
        let commands: IPivotBarAction[] = [];
        let editPermission = UserPermissionsHelper.CanEditDashboard();
        if (this.state.inEditMode) {
            //When in edit mode, these commands are always available. You must be a user with edit perms, to be in this state.
            commands.push(this.doneEditingCommand);
            commands.push(this.addWidgetCommand);
        } else {
            if (editPermission){
                let editCommand = this.editDashboardCommand;
                editCommand.title = editPermission ? undefined : TFS_Dashboards_Resources.DashboardsCommandBar_DisabledEditTooltip;
                commands.push(editCommand);
            }
        }
        commands.push(this.refreshCommand);

        return commands;
    }

    private getArtifactPicker(dashboardItem: PickerDashboardItem): IArtifactPickerProvider<PickerDashboardItem> {
        const webContext = getDefaultWebContext();

        let props: IArtifactPickerProviderOptions<PickerDashboardItem> = {
            favoritesContext: {
                artifactTypes: [FavoriteTypes.DASHBOARD],
                artifactScope: {
                    id: webContext.project.id,
                    name: webContext.project.name,
                    type: FavoriteStorageScopes.Project
                }
            },
            selectedArtifact: dashboardItem,
            artifactComparer: (item1, item2) => {
                return Utils_String.localeIgnoreCaseComparer(this.getArtifactName(item1), this.getArtifactName(item2));
            },
            getSearchResults: (searchText) => {
                return this.getDashboardArtifacts().then((items) => {
                    return items.filter(item => Utils_String.caseInsensitiveContains(this.getArtifactName(item), searchText));
                });
            },
            searchNoResultsText: TFS_Dashboards_Resources.SearchNoResultsText,
            searchTextPlaceholder: TFS_Dashboards_Resources.SearchTextPlaceholder,
            browseAllText: TFS_Dashboards_Resources.BrowseAllDashboardsText,
            loadingText: TFS_Dashboards_Resources.LoadingDashboardsText,
            searchResultsLoadingText: TFS_Dashboards_Resources.SearchResultsLoadingText,
            onBrowseAllClick: () => {
                this.navigateActionCreator.navigateToDirectoryFromDashboard();
            },
            otherActions: this.getOtherActionsForPicker(),
            getArtifacts: () =>  this.getDashboardArtifacts(),
            getArtifactId: (dashboardItem) => {
                return dashboardItem.dashboard.id;
            },
            getArtifactName: (dashboardItem) => {
                return this.getArtifactName(dashboardItem);
            },
            getFavoriteFromArtifact: dashboardItem => this.getFavoriteForDashboard(dashboardItem),
            getArtifactFromFavorite: favoriteItem => this.getDashboardForFavorite(favoriteItem),
            getArtifactIcon: () => { return this.bowtieDashboardIconProps; },
            getArtifactHref: (dashboardItem) => {
                // Generate link to dashboard using team name or team ID (in case we can't resolve team ID to a team name e.g. for public projects)
                return this.navigateActionCreator.getUrlForDashboard(dashboardItem.teamScope.teamName || dashboardItem.teamScope.teamId, dashboardItem.dashboard.id);
            },
            onArtifactClicked: (dashboardItem) => {
                if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessDashboardsUseFpsNavigation, false)) {
                    const url = this.navigateActionCreator.getUrlForDashboard(dashboardItem.teamScope.teamName || dashboardItem.teamScope.teamId, dashboardItem.dashboard.id);
                    Service.getLocalService(HubsService).navigateToHub(ContributionIds.DashboardHubId, url);
                    return true; // return true so the href value is ignored.
                }
                return false;
            },
            groups: this.getGroups(),
            favoriteGroupHeader: TFS_Dashboards_Resources.FavoriteGroupHeader,
            defaultGroupHeader: TFS_Dashboards_Resources.DefaultGroupHeader,
            getArtifactListGroupId: (dashboardItem) => {
                return dashboardItem.groupId;
            }
        };

        return new ArtifactPickerProvider(props);
    }

    private getGroups(): PromiseLike<IPickListGroup[]> {
        let groups: IPickListGroup[] = [];
        const teamMemberships = DashboardPageExtension.getTeamsMembersOf();
        return teamMemberships.then((teams) => {
            teams.forEach(m => {
                groups.push({
                    key: m.id,
                    name: m.name
                });
            });

            return groups.sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.name, b.name));
        });
    }

    private getArtifactName(dashboardItem: PickerDashboardItem): string {
        return (dashboardItem.teamScope.teamName != null) ?
            (dashboardItem.teamScope.teamName + " " + dashboardItem.dashboard.name) :
            dashboardItem.dashboard.name;
    }

    private getDashboardArtifacts(): PromiseLike<PickerDashboardItem[]> {
        if (!this.dashboardsPromise) {
            this.dashboardsPromise = DashboardPageExtension.getTeamsMembersOf()
                .then(teamMemberships => {
                    const webContext = getDefaultWebContext();
                    const client = Dashboards_RestClient.getClient();
                    const dashboardItems: DashboardItem[] = [];
                    const dashboardItemsPromises: PromiseLike<void>[] = [];
                    for (const teamMembership of teamMemberships) {
                        const teamContext: TeamContext = {
                            projectId: webContext.project.id,
                            project: webContext.project.name,
                            teamId: teamMembership.id,
                            team: teamMembership.name
                        };

                        dashboardItemsPromises.push(
                            client.getDashboards(teamContext)
                                .then(dashboardGroup => {
                                    dashboardItems.push(
                                        ...dashboardGroup.dashboardEntries.map(
                                            dashboard => this.createPickerDashboardItem(dashboard, teamMembership))
                                    );
                                })
                        );
                    }

                    return Promise.all(dashboardItemsPromises)
                        .then(() => dashboardItems);
                });
        }

        return this.dashboardsPromise;
    }

    private createPickerDashboardItem(dashboard: Dashboard, teamMembership: WebApiTeam): PickerDashboardItem {
        return {
            teamScope: { teamId: teamMembership.id, teamName: teamMembership.name },
            groupId: teamMembership.id,
            dashboard: dashboard
        };
    }

    private getFavoriteForDashboard(dashboardItem: PickerDashboardItem):Favorite {
        let webContext = getDefaultWebContext();
        return {
            artifactId: dashboardItem.dashboard.id,
            artifactName: dashboardItem.dashboard.name,
            artifactType: FavoriteTypes.DASHBOARD,
            artifactScope: {
                id: webContext.project.id,
                name: webContext.project.name,
                type: FavoriteStorageScopes.Project
            },
            artifactProperties: {
                [this.favoriteItemPropertyTeamIdKey]: dashboardItem.teamScope.teamId,
                [this.favoriteItemPropertyTeamNameKey]: dashboardItem.teamScope.teamName
            },
            artifactIsDeleted: false,
            creationDate: undefined,
            id: undefined,
            owner: undefined,
            url: undefined,
            _links: undefined
        };
    }

    private getDashboardForFavorite(favoriteItem: Favorite): PickerDashboardItem {
        const teamId = (favoriteItem.artifactProperties || {})[this.favoriteItemPropertyTeamIdKey];
        return {
            teamScope: {
                teamId,
                teamName: (favoriteItem.artifactProperties || {})[this.favoriteItemPropertyTeamNameKey]
            },
            groupId: teamId,
            dashboard: {
                id: favoriteItem.artifactId,
                name: favoriteItem.artifactName,
                ownerId: (favoriteItem.artifactProperties || {})[this.favoriteItemPropertyTeamIdKey],
                eTag: undefined,
                _links: undefined,
                url: undefined,
                description: undefined,
                position: undefined,
                refreshInterval: undefined,
                widgets: undefined
            }
        };
    }

    @autobind
    private onRequestHeaderUpdate(actionArgs: any, next: any): void {
        this.forceUpdate();
        next(actionArgs);
    }

    @autobind
    private onDashboardUpdated(actionArgs: any, next: any): void {
        const teamContext = getDashboardTeamContext();
        let artifactPicker: IArtifactPickerProvider<PickerDashboardItem>;

        if (actionArgs.dashboard.id !== this.state.currentDashboard.id) {
            artifactPicker = this.getArtifactPicker({
                dashboard: actionArgs.dashboard,
                groupId: teamContext.id,
                teamScope: {
                    teamId: teamContext.id,
                    teamName: teamContext.name
                }
            });
        }
        else {
            artifactPicker = this.state.artifactPicker;
        }

        this.setState({
            currentDashboard: actionArgs.dashboard as Dashboard,
            artifactPicker: artifactPicker
        });
        next(actionArgs);
    }

    @autobind
    private onRefreshClick(): void {
        getActionService().performAction(RefreshTimerEvents.OnRefresh);
        getActionService().performAction(Events.OnViewChange);
        this.onTimerReset();
        this.setState({ inEditMode: false });
    }

    @autobind
    private onEditDashboardClick(): void {
        getActionService().performAction(DashboardEvents.ToggleEditMode, { isEditing: true });
        this.onTimerStop();
        this.setState({ inEditMode: true });
        this.hub.focus(PivotBarFocusItem.commands);
    }

    @autobind
    private onDoneEditingClick(): void {
        getActionService().performAction(DashboardEvents.ToggleEditMode, { isEditing: false });
        this.onTimerStart({ refreshTime: this.state.currentDashboard.refreshInterval });
        this.setState({ inEditMode: false });
        this.hub.focus(PivotBarFocusItem.commands);
    }

    @autobind
    private onAddWidgetClick(): void {
        getActionService().performAction(DashboardEvents.AddWidgetButtonClicked);
        this.onTimerStop();
        this.setState({ inEditMode: true });
    }

    @autobind
    private onManageDashboardsClick(): void {
        getActionService().performAction(DashboardEvents.ManageDashboardsButtonClicked);
        this.onTimerStop();
        this.setState({ inEditMode: false });
    }

    @autobind
    private onTimerReset(actionArgs?: any, next?: any): void {
        if (this.refreshManager) {
            this.refreshManager.resetRefreshCountdown();
        }
        if (next) {
            next(actionArgs);
        }
    }

    @autobind
    private onTimerStop(actionArgs?: any, next?: any): void {
        if (this.refreshManager) {
            this.refreshManager.stopRefreshCountdown();
        }
        if (next) {
            next(actionArgs);
        }
    }

    @autobind
    private onTimerStart(actionArgs: any, next?: any): void {
        if (this.refreshManager) {
            this.refreshManager.setAndStartRefreshTimer(actionArgs.refreshTime);
        }
        if (next) {
            next(actionArgs);
        }
    }

    @autobind
    private requestEditModeToggle(actionArgs?: any, next?: any): void {
        if (actionArgs.isEditing) {
            this.onEditDashboardClick();
        }
        else {
            this.onDoneEditingClick();
        }

        next(actionArgs);
    }

    @autobind
    private updateViewText(): void {
        if (this.refreshManager) {
            this.viewActionText.value = this.refreshManager.getTimeLabelText();
        }
    }

    @autobind
    private onRefresh(actionArgs: any, next: any): void {
        if (this.refreshManager) {
            this.refreshManager.resetRefreshCountdown();
            this.viewActionText.value = this.refreshManager.getTimeLabelText();
        }

        next(actionArgs);
    }

    @autobind
    private dashboardCreatedListener(dashboard: CreatedDashboardItem): void {
        this.navigateActionCreator.navigateToDashboard(dashboard.team, dashboard.id, { "isNew": "true" });
    }

    @autobind
    private onNewDashboardClick(): void {
        CreateDashboardDialog.show({ allowTeamSelection: true, onDashboardCreated: this.dashboardCreatedListener });
    }

    private setupRefreshTimer(): void {
        if (this.isRefreshEnabled()) {
            if (!this.refreshManager) {
                this.refreshManager = DashboardRefreshManager.getInstance();
                this.refreshManager.setAndStartRefreshTimer(this.state.currentDashboard.refreshInterval);
                this.updateViewText();
            }
        }
        else {
            this.refreshManager = null;
        }
    }

    private isRefreshEnabled(): boolean {
        return this.state.currentDashboard.refreshInterval > 0 &&
            DashboardsPermissionsHelper.canAutoRefreshDashboard();
    }


    private getOtherActionsForPicker(): IPickListAction[] {
        let commands: IPickListAction[] = [];

        if (!DashboardsPermissionsHelper.hideDisabledControls()){
            let createCommand = this.newDashboardCommand;
            commands.push(createCommand);
        }

        return commands;
    }

    private newDashboardCommand: IPickListAction =
    {
        name: TFS_Dashboards_Resources.NewDashboardExperience_NewDashboard,
        iconProps: {
            iconName: 'CalculatorAddition',
            iconType: VssIconType.fabric
        },
        onClick: this.onNewDashboardClick
    };

    private bowtieDashboardIconProps: IVssIconProps = {
        iconName: 'bowtie-dashboard',
        iconType: VssIconType.bowtie,
        styles: { root: { color: this.bowtieIconColor } }
    };

    private addIconProps: IVssIconProps = {
        iconName: 'math-plus',
        iconType: VssIconType.bowtie
    };

    private checkmarkIconProps: IVssIconProps = {
        iconName: 'bowtie-check',
        iconType: VssIconType.bowtie
    };

    private editIconProps: IVssIconProps = {
        iconName: 'edit',
        iconType: VssIconType.bowtie
    };

    private refreshIconProps: IVssIconProps = {
        iconName: 'bowtie-navigate-refresh',
        iconType: VssIconType.bowtie
    };

    private settingsIconProps: IVssIconProps = {
        iconName: 'bowtie-settings-gear-outline',
        iconType: VssIconType.bowtie
    };

    private refreshCommand: IPivotBarAction =
    {
        key: 'refresh-dashboard',
        name: TFS_Dashboards_Resources.NewDashboardExperience_RefreshDashboard,
        important: true,
        iconProps: this.refreshIconProps,
        onClick: this.onRefreshClick,
        ariaLabel: TFS_Dashboards_Resources.NewDashboardExperience_RefreshDashboardLabel
    };

    private editDashboardCommand: IPivotBarAction =
    {
        key: 'edit-dashboard',
        name: TFS_Dashboards_Resources.NewDashboardExperience_EditDashboard,
        important: true,
        iconProps: this.editIconProps,
        onClick: this.onEditDashboardClick,
        ariaLabel: TFS_Dashboards_Resources.NewDashboardExperience_EditDashboardLabel
    };

    private doneEditingCommand: IPivotBarAction =
    {
        key: 'done-editing',
        name: TFS_Dashboards_Resources.NewDashboardExperience_DoneEditingDashboard,
        important: true,
        iconProps: this.checkmarkIconProps,
        onClick: this.onDoneEditingClick
    };

    private addWidgetCommand: IPivotBarAction =
    {
        key: 'add-widget',
        name: TFS_Dashboards_Resources.NewDashboardExperience_AddWidget,
        important: true,
        iconProps: this.addIconProps,
        onClick: this.onAddWidgetClick
    };
}