import * as React from "react";

import { autobind, BaseComponent, css, IBaseProps } from "OfficeFabric/Utilities";
import { Label } from "OfficeFabric/Label";
import {
    ColumnActionsMode,
    SelectionMode,
    ConstrainMode,
    CheckboxVisibility,
    DetailsListLayoutMode,
    IColumn,
    DetailsRow,
    IDetailsRowProps
} from "OfficeFabric/DetailsList";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { Link } from "OfficeFabric/Link";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import { StarView } from "Favorites/Controls/StarView";
import { FavoriteCreateParameters } from "Favorites/Contracts";
import { FavoriteStorageScopes } from "Favorites/Constants";

import { getPageContext } from "VSS/Context";
import * as Utils_String from "VSS/Utils/String";
import * as VSS_Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import { VssDetailsList } from "VSSUI/VssDetailsList";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";

import { FavoriteTypes } from "TfsCommon/Scripts/Favorites/Constants";
import * as TFS_Core_Contracts from "TFS/Core/Contracts";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { DirectoryViewColumnKey, DataConstants, UrlConstants, ContributionIds } from "Dashboards/Components/Constants";
import { TabLoadingSpinner } from "Dashboards/Components/TabLoadingSpinner";
import { IDashboardsHubContext, SharedContext } from "Dashboards/Components/DashboardsHubContext";
import * as TFS_Dashboards_Resources from "Dashboards/Scripts/Resources/TFS.Resources.Dashboards";
import { DashboardsDirectoryStore } from "Dashboards/Components/Directory/DashboardsDirectoryStore";
import { DashboardsDirectoryActionCreator } from "Dashboards/Components/Directory/DashboardsDirectoryActionCreator";
import * as DeleteDashboardDialog from "Dashboards/Components/Directory/DeleteDashboardDialog";
import * as ManageDashboardDialog from "Dashboards/Components/Shared/ManageDashboardDialog/ManageDashboardDialog";
import {
    MessageLevel,
    DashboardLoadingState,
    DashboardsDirectoryPivotState,
    IDirectoryRow,
    IGroupRow,
    IDashboardRow,
    FilteredPayload
} from "Dashboards/Components/Directory/Contracts";
import { DashboardItem, TeamScope } from "Dashboards/Components/Shared/Contracts";
import * as DashboardsSecurityDialog from "Dashboards/Components/Directory/DashboardsSecurityDialog";
import { DashboardsPermissionsHelper } from "Dashboards/Components/Directory/DashboardsPermissionsHelper";
import { DirectoryZeroData } from "Dashboards/Components/Directory/DirectoryZeroData";
import { HubsService } from "VSS/Navigation/HubsService";
import * as Service from "VSS/Service";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { TeamPanelIconButton } from "Presentation/Scripts/TFS/TeamPanel/TeamPanelIconButton";
import * as UserPermissionsHelper from "Dashboards/Scripts/Common.UserPermissionsHelper";

export interface DirectoryViewComponentBaseProps extends SharedContext, IBaseProps {
    initialFilter: FilteredPayload;
}

export abstract class DirectoryViewComponentBase extends BaseComponent<DirectoryViewComponentBaseProps, DashboardsDirectoryPivotState> {
    protected dashboardContext: IDashboardsHubContext;
    protected dashboardDirectoryStore: DashboardsDirectoryStore;
    protected dashboardDirectoryActionCreator: DashboardsDirectoryActionCreator;

    protected columns: IColumn[];

    protected static Css_dashboard_directory_rowItem = "dashboards-directory-rowitem";

    constructor(props: any) {
        super(props);
        this.dashboardContext = this.props.context;
        this.dashboardDirectoryStore = this.dashboardContext.stores.dashboardDirectoryStore;
        this.dashboardDirectoryActionCreator = this.dashboardContext.actionCreators.dashboardsDirectoryActionCreator;
    }

    protected abstract getState(): DashboardsDirectoryPivotState;
    protected abstract getPivotName(): string;

    protected abstract getComponentClassName(): string;
    protected abstract getListClassName(): string;

    protected abstract onColumnClick(event?: React.MouseEvent<HTMLElement>, column?: IColumn): void;
    protected abstract getColumns(): IColumn[];
    protected abstract getColumnActionsMode(): ColumnActionsMode;

    protected abstract processKeyDown(e: React.KeyboardEvent<HTMLDivElement>, directoryRow: IDirectoryRow): any;

    public componentDidMount(): void {
        super.componentDidMount();
        const contextData = TfsContext.getDefault().contextData;
        this.dashboardContext.favoriteContext.actionsCreator.initializeStore(
            [FavoriteTypes.DASHBOARD],
            { id: contextData.project.id, name: contextData.project.name, type: FavoriteStorageScopes.Project },
            undefined,
            true);
        this.setWindowTitle();
        this.dashboardDirectoryStore.addChangedListener(this.dashboardDirectoryStoreListener);
    }

    public componentWillUnmount(): void {
        this.dashboardDirectoryStore.removeChangedListener(this.dashboardDirectoryStoreListener);
        super.componentWillUnmount();
    }

    public render(): JSX.Element {
        if (this.state.loadingState === DashboardLoadingState.Loading) {
            return <TabLoadingSpinner />
        }

        if (this.state.loadingState === DashboardLoadingState.Loaded &&
            this.state.messageOptions &&
            this.state.messageOptions.messageLevel === MessageLevel.Critical) {
            return <MessageBar
                isMultiline={true}
                messageBarType={MessageBarType.error}>
                {this.state.messageOptions.message}
            </MessageBar>
        }

        const columns = this.getColumns();
        const hasDashboards = this.state.items.length > 0;
        const noFilterResults = !hasDashboards && this.state.searchOptions.isSearching ? <Label className="no-results-label">{TFS_Dashboards_Resources.NoResultsFound}</Label> : null;
        const emptyProject = this.state.unfilteredDashboardCount == 0;

        let zeroDataDisplay: JSX.Element = DirectoryZeroData.renderZeroDataElement();

        let directoryList: JSX.Element = <VssDetailsList
            getKey={(item: IDirectoryRow) => {
                let directoryRow: IDirectoryRow;
                let key: string;
                if (item.isGroupRow) {
                    const groupRow = item.directoryRow as IGroupRow;
                    key = groupRow.teamId;
                }
                else {
                    const dashboardRow = item.directoryRow as IDashboardRow;
                    key = `${dashboardRow.teamScope.teamId}.${dashboardRow.dashboard.id}.${item.isParentGroupFavorite}`;
                }
                return key;
            }}
            setKey={this.getListClassName()}
            className={this.getListClassName()}
            items={this.state.items}
            columns={columns}
            actionsColumnKey={DirectoryViewColumnKey.Name}
            allocateSpaceForActionsButtonWhileHidden={true}
            shouldDisplayActions={(row: IDirectoryRow) => {

                if (DashboardsPermissionsHelper.hideDisabledControls()){
                    return false;
                }

                if (row.isGroupRow) {
                    return false;
                }

                const dashboardRow = row.directoryRow as IDashboardRow;
                if (dashboardRow.teamScope.teamId === DataConstants.SentinelTeam) {
                    return false;
                }

                return true;
            }}
            getMenuItems={(item) => this.getMenuItems(item)}
            onRenderItemColumn={this.onRenderItemColumn}
            onRenderRow={this.onRenderRow}
            selectionMode={SelectionMode.single}
            constrainMode={ConstrainMode.unconstrained}
            checkboxVisibility={CheckboxVisibility.hidden}
            layoutMode={DetailsListLayoutMode.justified}
            initialFocusedIndex={document.activeElement === document.body ? 0 : -1}
        />;

        return (
            <div className={this.getComponentClassName()}>
                {this.state.messageOptions && this.state.messageOptions.message &&
                    <MessageBar
                        isMultiline={true}
                        messageBarType={MessageBarType.error}
                        onDismiss={() => {
                            this.dashboardDirectoryActionCreator.clearMessageForPivot(this.getPivotName())
                        }}>
                        {this.state.messageOptions.message}
                    </MessageBar>
                }
                {directoryList}
                {emptyProject ? zeroDataDisplay : noFilterResults}
            </div>
        );
    }

    protected onGroupHeaderToggle(group: IGroupRow): void {
        if (group.isCollapsed) {
            this.dashboardDirectoryActionCreator.expandGroupInPivot(this.getPivotName(), group.teamId);
        }
        else {
            this.dashboardDirectoryActionCreator.collapseGroupInPivot(this.getPivotName(), group.teamId);
        }
    }

    protected generateDirectoryColumns(): IColumn[] {
        const columnActionMode = this.getColumnActionsMode();

        let columnHeaders: IColumn[] = [];
        columnHeaders.push({
            key: DirectoryViewColumnKey.Name,
            fieldName: DirectoryViewColumnKey.Name,
            name: TFS_Dashboards_Resources.MyDashboards_NameColumn,
            minWidth: 400,
            maxWidth: 600,
            isResizable: true,
            headerClassName: "dashboards-name-header",
            className: "dashboards-name-cell",
            columnActionsMode: columnActionMode,
            onColumnClick: this.onClickingColumn,
            isSorted: Utils_String.equals(this.state.sortOptions.sortColumn, DirectoryViewColumnKey.Name),
            isSortedDescending: this.state.sortOptions.isSortedDescending
        } as IColumn
        );
        columnHeaders.push({
            key: DirectoryViewColumnKey.Team,
            fieldName: DirectoryViewColumnKey.Team,
            name: TFS_Dashboards_Resources.MyDashboards_TeamColumn,
            minWidth: 400,
            maxWidth: 600,
            isResizable: true,
            headerClassName: "dashboards-team-header",
            className: "dashboards-team-cell",
            columnActionsMode: columnActionMode,
            onColumnClick: this.onClickingColumn,
            isSorted: Utils_String.equals(this.state.sortOptions.sortColumn, DirectoryViewColumnKey.Team),
            isSortedDescending: this.state.sortOptions.isSortedDescending
        } as IColumn
        );
        
        columnHeaders.push(
            {
                key: DirectoryViewColumnKey.Description,
                fieldName: DirectoryViewColumnKey.Description,
                name: TFS_Dashboards_Resources.MyDashboards_DescriptionColumn,
                minWidth: 400,
                maxWidth: 1000,
                isResizable: true,
                headerClassName: "dashboards-description-header",
                className: "dashboards-description-cell",
                columnActionsMode: columnActionMode,
                onColumnClick: this.onClickingColumn,
                isSorted: Utils_String.equals(this.state.sortOptions.sortColumn, DirectoryViewColumnKey.Description),
                isSortedDescending: this.state.sortOptions.isSortedDescending
            } as IColumn
        );

        return columnHeaders;
    }

    private getNameColumn(item: IDirectoryRow): JSX.Element {
        if (!item.isGroupRow) {
            let dashboardRow = item.directoryRow as IDashboardRow;
            if (dashboardRow.teamScope.teamName !== DataConstants.SentinelTeam) {
                return this.getFlatColumn(dashboardRow);
            }
        }
        else {
            let groupRow = item.directoryRow as IGroupRow;
            var groupIcon = !groupRow.isFavorite ?
                <VssIcon
                    className={"team-icon"}
                    iconName={"bowtie-users"}
                    iconType={VssIconType.bowtie} /> : null;

            return (
                <div className="my-dashboards-list-header"
                    onClick={() => this.onGroupHeaderToggle(groupRow)}>
                    <VssIcon
                        iconName={"chevron-right"}
                        iconType={VssIconType.bowtie}
                        className={groupRow.isCollapsed ? '' : 'expanded'}
                    />
                    {groupIcon}
                    <span className={css(
                        "my-dashboards-list-header-name",
                        groupRow.isFavorite ? "favorite-group" : null)} > {groupRow.title}</span>
                </div>
            );
        }
    }

    private getTeamColumn(item: IDirectoryRow): JSX.Element {
        if (item.isGroupRow) {
            return null;
        }

        let dashboardRow = item.directoryRow as IDashboardRow;
        if (dashboardRow.teamScope.teamId === DataConstants.SentinelTeam) {
            return;
        }
        let context = TfsContext.getDefault().contextData;

        let teamIcon = UserPermissionsHelper.canSeeActions() ? 
        <TeamPanelIconButton
            projectName={context.project.name}
            projectId={context.project.id}
            teamId={dashboardRow.teamScope.teamId}
            teamName={dashboardRow.teamScope.teamName} />
        : <VssIcon
            className={"team-icon"}
            iconName={"bowtie-users"}
            iconType={VssIconType.bowtie} />;

        return <div className={css("dashboard-team-name", DirectoryViewComponentBase.Css_dashboard_directory_rowItem)}>
            { teamIcon }
            <TooltipHost
                content={dashboardRow.teamScope.teamName}
                overflowMode={TooltipOverflowMode.Parent}
                hostClassName="flex-tooltip-host">
                <span className={"dashboard-team-title"}>{dashboardRow.teamScope.teamName}</span>
            </TooltipHost>
        </div>
    }

    private getDescriptionColumn(item: IDirectoryRow): JSX.Element {
        if (item.isGroupRow) {
            return null;
        }

        let dashboardRow = item.directoryRow as IDashboardRow;

        return <div className={css("dashboard-team-description", DirectoryViewComponentBase.Css_dashboard_directory_rowItem)}>
            <TooltipHost
                content={dashboardRow.dashboard.description}
                overflowMode={TooltipOverflowMode.Parent}
                hostClassName="flex-tooltip-host">
                <span className={"dashboard-team-description-title"}>{dashboardRow.dashboard.description}</span>
            </TooltipHost>
        </div>
    }

    private getFavoriteForItem(item: DashboardItem): FavoriteCreateParameters {
        return {
            artifactId: item.dashboard.id,
            artifactType: FavoriteTypes.DASHBOARD,
            artifactName: item.dashboard.name,
            artifactScope: {
                id: TfsContext.getDefault().contextData.project.id,
                type: FavoriteStorageScopes.Project,
                name: TfsContext.getDefault().contextData.project.name
            },
            owner: undefined
        } as FavoriteCreateParameters;
    }


    private getEmptyFavoriteRow(): JSX.Element {
        return <FormatComponent
            elementType="div"
            className="empty-dashboard-item"
            format={TFS_Dashboards_Resources.MyEmptyMessage}>
            <VssIcon iconName={"bowtie-favorite"} iconType={VssIconType.bowtie} />
        </FormatComponent>;
    }

    private getFlatColumn(item: IDashboardRow): JSX.Element {
        const favorite = this.getFavoriteForItem(item);
        const url = this.getUrlForDashboardItem(item);
        const props = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessDashboardsUseFpsNavigation, false)
            ? { onClick: () => { Service.getLocalService(HubsService).navigateToHub(ContributionIds.DashboardHubId, url)} }
            : { href : this.getUrlForDashboardItem(item) };
        return <div className={css("dashboard-name", DirectoryViewComponentBase.Css_dashboard_directory_rowItem)}>
            <div className={"dashboard-row-title"}>
                <TooltipHost
                    content={item.dashboard.name}
                    overflowMode={TooltipOverflowMode.Parent}
                    hostClassName="flex-tooltip-host">
                    <VssIcon
                        iconName={"bowtie-dashboard"}
                        iconType={VssIconType.bowtie}
                        className={"dashboard-icon"}
                    />
                    <Link
                        className={"dashboard-name-title"}
                        { ...props }
                        // Use browser's native context menu for title link to allow actions like "open in new tab"
                        onContextMenu={e => e.stopPropagation()}>
                        <span>{item.dashboard.name}</span>
                    </Link>
                </TooltipHost>
            </div>
            <div className={css("dashboard-star", item.isFavorite ? "favorited" : Utils_String.empty)}>
                <StarView
                    artifact={favorite}
                    actionsCreator={this.dashboardContext.favoriteContext.actionsCreator}
                    store={this.dashboardContext.favoriteContext.store}
                    dataProvider={this.dashboardContext.favoriteContext.dataProvider}
                />
            </div>
        </div>
    }

    private getUrlForDashboardItem(item: DashboardItem): string {
        return this.dashboardContext.actionCreators.navigationActionCreator.getUrlForDashboard(
            item.teamScope.teamName ? item.teamScope.teamName : item.teamScope.teamId,
            item.dashboard.id);
    }

    private getTeamContext(teamScope: TeamScope): TFS_Core_Contracts.TeamContext {
        let context = TfsContext.getDefault().contextData;
        return {
            projectId: context.project.id,
            project: context.project.name,
            team: teamScope.teamName,
            teamId: teamScope.teamId
        }
    }

    private setWindowTitle(): void {
        var titleFormat = getPageContext().webAccessConfiguration.isHosted ? VSS_Resources_Platform.PageTitleWithContent_Hosted : VSS_Resources_Platform.PageTitleWithContent;
        document.title = Utils_String.format(titleFormat, TFS_Dashboards_Resources.Dashboards_Title);
    }

    @autobind
    private onRenderRow(props: IDetailsRowProps): JSX.Element {
        const row = props.item as IDirectoryRow;
        if (!row.isGroupRow && !this.state.searchOptions.isSearching) {
            const dashboardRow = row.directoryRow as IDashboardRow;
            if (dashboardRow.teamScope.teamId === DataConstants.SentinelTeam) {
                return this.getEmptyFavoriteRow();
            }
        }

        return (
            <div onKeyDown={(e) => { this.processKeyDown(e, props.item) }}>
                <DetailsRow
                    {...props}
                />
            </div>);
    }

    @autobind
    private onRenderItemColumn(item?: IDirectoryRow, index?: number, column?: IColumn): JSX.Element {
        if (!item || !column) {
            return null;
        }

        switch (column.fieldName) {
            case DirectoryViewColumnKey.Name:
                return this.getNameColumn(item);
            case DirectoryViewColumnKey.Team:
                return this.getTeamColumn(item);
            case DirectoryViewColumnKey.Description:
                return this.getDescriptionColumn(item);
            default:
                return null;
        }
    }

    @autobind
    private onClickingColumn(event?: React.MouseEvent<HTMLElement>, column?: IColumn): void {
        this.onColumnClick(event, column);
    }

    @autobind
    private dashboardDirectoryStoreListener(): void {
        this.setState(this.getState());
    }

    @autobind
    private getMenuItems(row: IDirectoryRow): IContextualMenuItem[] {
        const items: IContextualMenuItem[] = [];
        items.push(
            {
                key: "dashboard-permissions",
                name: TFS_Dashboards_Resources.DashboardContextMenu_Security,
                title: TFS_Dashboards_Resources.DashboardContextMenu_Security,
                iconProps: { className: "bowtie-icon bowtie-security" },
                className: "security-dashboard",
                onClick: () => { this.openSecurityDialog(row) },
            },
            {
                key: "delete",
                name: TFS_Dashboards_Resources.DashboardContextMenu_Delete,
                title: TFS_Dashboards_Resources.DashboardContextMenu_Delete,
                iconProps: { className: "bowtie-icon bowtie-edit-delete" },
                className: "delete-dashboard",
                onClick: () => { this.deleteDialog(row) },
            }
        );
        return items;
    }

    @autobind
    private manageDialog(row: IDirectoryRow): void {
        const dashboardRow = row.directoryRow as IDashboardRow;

        ManageDashboardDialog.show({
            dashboard: dashboardRow.dashboard,
            team: dashboardRow.teamScope,
            onSave: () => this.updateDashboard({
                dashboard: dashboardRow.dashboard,
                teamScope: dashboardRow.teamScope
            })
        });
    }

    @autobind
    private updateDashboard(dashboardItem: DashboardItem): void {
        this.dashboardDirectoryActionCreator.updateDashboard(
            this.getPivotName(),
            dashboardItem);
    }

    @autobind
    private deleteDashboard(dashboardItem: DashboardItem): void {
        this.dashboardDirectoryActionCreator.deleteDashboard(
            this.getPivotName(),
            dashboardItem.dashboard.id,
            this.getTeamContext(dashboardItem.teamScope));
    }

    @autobind
    private deleteDialog(row: IDirectoryRow): void {
        const dashboardRow = row.directoryRow as IDashboardRow;
        DeleteDashboardDialog.show({
            onDeleteConfirmed: () => this.deleteDashboard({
                dashboard: dashboardRow.dashboard,
                teamScope: dashboardRow.teamScope
            })
        });
    }

    @autobind
    private openSecurityDialog(row: IDirectoryRow): void {
        const dashboardRow = row.directoryRow as IDashboardRow;
        const dashboardItem = { dashboard: dashboardRow.dashboard, teamScope: dashboardRow.teamScope };
        DashboardsSecurityDialog.show(dashboardItem);
    }
}