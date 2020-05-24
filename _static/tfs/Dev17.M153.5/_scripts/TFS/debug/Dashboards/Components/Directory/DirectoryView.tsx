import * as React from "react";
import * as ReactDOM from "react-dom";

import { autobind, BaseComponent, css, IBaseProps } from "OfficeFabric/Utilities";
import { SelectionMode } from "OfficeFabric/Selection";

import { Hub } from "VSSUI/Hub";
import { HubHeader } from "VSSUI/HubHeader";
import { VssIconType } from "VSSUI/VssIcon";
import { FilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { IFilterState, FilterOperatorType, FILTER_CHANGE_EVENT } from "VSSUI/Utilities/Filter";
import { PivotBarItem, IPivotBarAction } from 'VSSUI/PivotBar';
import { PickListFilterBarItem, IPickListItem } from "VSSUI/PickList";
import { HubViewOptionKeys } from "VSSUI/Utilities/HubViewState";

import { IVssHubViewState } from "VSSPreview/Utilities/VssHubViewState";

import * as Utils_String from "VSS/Utils/String";
import Service = require("VSS/Service");
import Settings = require("VSS/Settings");
import Utils_Array = require("VSS/Utils/Array");

import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

import * as TFS_Dashboards_Resources from "Dashboards/Scripts/Resources/TFS.Resources.Dashboards";
import { IDashboardsHubContext, DashboardsHubContext, SharedContext } from "Dashboards/Components/DashboardsHubContext";
import { NavigationActionCreator } from "Dashboards/Components/NavigationActionCreator";
import * as CreateDashboardDialog from "Dashboards/Components/Shared/CreateDashboardDialog/CreateDashboardDialog";
import { DashboardsDirectoryActionCreator } from "Dashboards/Components/Directory/DashboardsDirectoryActionCreator";
import { UrlConstants, LocalStorageKey, DataConstants } from "Dashboards/Components/Constants";
import { MyDashboardsDirectoryViewComponent } from "Dashboards/Components/Directory/MyDashboardsDirectoryViewComponent";
import { AllDashboardsDirectoryViewComponent } from "Dashboards/Components/Directory/AllDashboardsDirectoryViewComponent";
import { CreatedDashboardItem } from "Dashboards/Components/Shared/CreateDashboardDialog/CreateDashboardDialogModels";
import { DashboardsDirectoryStore } from "Dashboards/Components/Directory/DashboardsDirectoryStore";
import {
    DashboardLoadingState,
    DashboardsDirectoryPivotState,
    FilteredPayload
} from "Dashboards/Components/Directory/Contracts";
import "VSS/LoaderPlugins/Css!Dashboards/Components/Directory/DirectoryView";
import { DashboardsPermissionsHelper } from "Dashboards/Components/Directory/DashboardsPermissionsHelper";

export interface DirectoryViewProps extends SharedContext, IBaseProps {
    hubViewState: IVssHubViewState;
    initialTeam: string;
}

export interface DirectoryViewState {
    /** track whether initial filtering applied */
    isInitialFilteringApplied: boolean;
    currentPivotState: DashboardsDirectoryPivotState;
}

/**
 * Component rendering the directory page and its pivots.
 */
export class DirectoryView extends BaseComponent<DirectoryViewProps, DirectoryViewState> {
    private readonly keywordFilter = "keyword";
    private readonly teamFilter = "team";

    private dashboardContext: IDashboardsHubContext;
    private navActionCreator: NavigationActionCreator;
    private directoryActionCreator: DashboardsDirectoryActionCreator;
    private dashboardDirectoryStore: DashboardsDirectoryStore;

    constructor(props: DirectoryViewProps) {
        super(props);

        this.dashboardContext = this.props.context;
        this.dashboardDirectoryStore = this.dashboardContext.stores.dashboardDirectoryStore;
        this.navActionCreator = this.dashboardContext.actionCreators.navigationActionCreator;
        this.directoryActionCreator = this.dashboardContext.actionCreators.dashboardsDirectoryActionCreator;

        this.state = {
            currentPivotState: {
                loadingState: DashboardLoadingState.Loading
            } as DashboardsDirectoryPivotState,
            isInitialFilteringApplied: false
        };
    }

    public componentDidMount(): void {
        super.componentDidMount();
        this.dashboardDirectoryStore.addChangedListener(this.dashboardDirectoryStoreListener);
        this.props.hubViewState.filter.subscribe(this.onFilterChanged, FILTER_CHANGE_EVENT);
        this.props.hubViewState.selectedPivot.subscribe(this.onPivotChanged);
    }

    public componentWillUnmount(): void {
        this.props.hubViewState.filter.unsubscribe(this.onFilterChanged, FILTER_CHANGE_EVENT);
        this.props.hubViewState.selectedPivot.unsubscribe(this.onPivotChanged);
        this.dashboardDirectoryStore.removeChangedListener(this.dashboardDirectoryStoreListener);
        super.componentWillUnmount();
    }

    public render(): JSX.Element {
        let pivotItems = [];

        let favoritesPermission = DashboardsPermissionsHelper.canUseFavoritesPermission();

        if (favoritesPermission) {
            pivotItems.push(
                <PivotBarItem
                    name={TFS_Dashboards_Resources.DirectoryViewMinePivotName}
                    itemKey={UrlConstants.MineView}
                    key={UrlConstants.MineView}
                    className='detailsListPadding dashboards-pivot-item absolute-fill'
                >
                    <MyDashboardsDirectoryViewComponent context={this.dashboardContext} initialFilter={this.getFilter()} />
                </PivotBarItem>
            );
        }

        pivotItems.push(
            <PivotBarItem
                name={TFS_Dashboards_Resources.DirectoryViewAllPivotName}
                itemKey={UrlConstants.AllView}
                key={UrlConstants.AllView}
                className='detailsListPadding dashboards-pivot-item absolute-fill'
            >
                <AllDashboardsDirectoryViewComponent context={this.dashboardContext} initialFilter={this.getFilter()} />
            </PivotBarItem>
        );

        let pickListItem = this.state.currentPivotState.loadingState === DashboardLoadingState.Loaded &&
            (this.state.currentPivotState.teamsForPicker.length > 0 || this.state.currentPivotState.items.length > 0) &&
            <PickListFilterBarItem
                filter={this.props.hubViewState.filter}
                filterItemKey={this.teamFilter}
                selectionMode={SelectionMode.multiple}
                getPickListItems={this.getTeamsToRender}
                getListItem={(item) => item as IPickListItem}
                placeholder={TFS_Dashboards_Resources.TeamFilterPlaceholder}
                showSelectAll={false}
                isSearchable={true}
                disabled={false}
                noItemsText={TFS_Dashboards_Resources.TeamFilterNoTeamsFound}
                searchTextPlaceholder={PresentationResources.FilterSearchPlaceholderText}
            />;

        let filterBar =
            <FilterBar>
                <KeywordFilterBarItem
                    filter={this.props.hubViewState.filter}
                    filterItemKey={this.keywordFilter}
                    placeholder={TFS_Dashboards_Resources.DirectoryView_SearchWatermark}
                />
                {pickListItem}
            </FilterBar>;

        return <Hub className='dashboards-directory-view'
            hubViewState={this.props.hubViewState}
            commands={this.getCommands()}>
            <HubHeader title={TFS_Dashboards_Resources.Dashboards_Title} />
            {filterBar}
            {pivotItems}
        </Hub>
    }

    @autobind
    private dashboardDirectoryStoreListener(): void {
        const state = this.dashboardDirectoryStore.getState(this.props.hubViewState.selectedPivot.value);
        this.setState({ currentPivotState: state });
        if (state.loadingState === DashboardLoadingState.Loaded) {
            const initialTeam = this.getInitialTeam(state);
            if (initialTeam && !this.state.isInitialFilteringApplied) {
                this._async.setTimeout(() => {
                    this.props.hubViewState.filter.setState({
                        [this.teamFilter]: { value: [initialTeam], operator: FilterOperatorType.or }
                    });
                    this.props.hubViewState.viewOptions.setViewOption(HubViewOptionKeys.showFilterBar, true);
                    this.navActionCreator.removeDefaultTeamForUrl();
                }, 100);
                this.setState({ isInitialFilteringApplied: true });
            }
            else if (this.getKeywordFilterValue()) {
                this.props.hubViewState.viewOptions.setViewOption(HubViewOptionKeys.showFilterBar, true);
            }
        }
    }

    @autobind
    private dashboardCreatedListener(dashboard: CreatedDashboardItem): void {
        this.navActionCreator.navigateToDashboard(dashboard.team, dashboard.id, { "isNew": "true" });
    }

    @autobind
    private onPivotChanged(newPivotKey: string): void {
        Service.getLocalService(Settings.LocalSettingsService).write(
            LocalStorageKey.RecentPivot,
            newPivotKey);
        this.directoryActionCreator.clearLocalDashboardCache();
    }

    @autobind
    private onFilterChanged(changedState: IFilterState): void {
        this.directoryActionCreator.filterView(this.getFilter());
    }

    @autobind
    private onNewDashboardClick(): void {
        CreateDashboardDialog.show({ allowTeamSelection: true, onDashboardCreated: this.dashboardCreatedListener });
    }

    @autobind
    private getSelectedItems(teamFilter: string): IPickListItem[] {
        if (!teamFilter) {
            return [];
        }

        return this.getTeamsToRender().filter(team => team.name === teamFilter ||
            team.key === teamFilter);
    }

    @autobind
    private getTeamsToRender(): IPickListItem[] {
        let options: IPickListItem[] = [];

        if (this.state.currentPivotState.teamsForPicker && this.state.currentPivotState.teamsForPicker.length > 0) {
            let teams = this.state.currentPivotState.teamsForPicker.map(item => {
                return {
                    key: item.teamId, name: item.teamName
                } as IPickListItem;
            });
            Utils_Array.removeWhere(teams, (item: IPickListItem) => { return item.key == null; });
            Utils_Array.unique(teams, this.compareKeys).forEach(item => options.push(item));
            options.sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.name, b.name));
        }

        return options;
    }

    private getInitialTeam(state: DashboardsDirectoryPivotState): IPickListItem {
        if (state.teamsForPicker && this.props.initialTeam) {
            const initialSelectedItem = Utils_Array.first(state.teamsForPicker,
                (teamScope) => {
                    return Utils_String.ignoreCaseComparer(teamScope.teamId, this.props.initialTeam) === 0 ||
                        Utils_String.localeIgnoreCaseComparer(teamScope.teamName, this.props.initialTeam) === 0
                });

            if (initialSelectedItem) {
                return {
                    key: initialSelectedItem.teamId,
                    name: initialSelectedItem.teamName
                }
            }
        }

        return null;
    }

    private getFilter(): FilteredPayload {
        let useInitialTeam = !this.state.isInitialFilteringApplied;
        let initialTeamId = useInitialTeam ? this.props.initialTeam : null;
        return {
            textFilter: this.getKeywordFilterValue(),
            teamsFilter: this.getTeamsFilterValue(),
            initialTeamId: initialTeamId
        };
    }

    private getKeywordFilterValue(): string {
        const filterState = this.props.hubViewState.filter.getFilterItemState(this.keywordFilter);
        return filterState ? filterState.value : Utils_String.empty;
    }

    private getTeamsFilterValue(): string[] {
        const filterState = this.props.hubViewState.filter.getFilterItemState(this.teamFilter);
        return filterState ? (filterState.value as IPickListItem[]).map((i) => i.key) : [];
    }

    private compareKeys(a: IPickListItem, b: IPickListItem): number {
        // locale compare is a slow operations, short circuit if the items are equal (we only need to compare the key)
        if (a.key === b.key) {
            return 0;
        }

        return a.key.localeCompare(b.key);
    }

    private getCommands(): IPivotBarAction[] {
        let commands: IPivotBarAction[] = [];
        if (!DashboardsPermissionsHelper.hideDisabledControls()){
            let newDashboardCommand = this.newDashboardCommand;
            commands.push(newDashboardCommand);
        }

        return commands;
    }

    private newDashboardCommand: IPivotBarAction =
        {
            key: 'new-dashboard',
            name: TFS_Dashboards_Resources.NewDashboardExperience_NewDashboard,
            important: true,
            iconProps: {
                iconName: 'CalculatorAddition',
                iconType: VssIconType.fabric
            },
            onClick: this.onNewDashboardClick
        };
}
