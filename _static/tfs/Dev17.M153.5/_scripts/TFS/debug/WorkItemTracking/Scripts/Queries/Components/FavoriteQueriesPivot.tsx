import { CheckboxVisibility, ColumnActionsMode, ConstrainMode, DetailsListLayoutMode, IColumn, SelectionMode } from "OfficeFabric/DetailsList";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { CollapseAllVisibility, IGroup, IGroupDividerProps } from "OfficeFabric/components/GroupedList/index";
import { GenericFilterZeroData } from "Presentation/Scripts/TFS/Components/GenericFilterZeroData";
import { KeyboardAccesibleComponent, KeyboardAccesibleComponentProps } from "Presentation/Scripts/TFS/Components/KeyboardAccessible";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import "VSS/LoaderPlugins/Css!Queries/Components/FavoriteQueriesPivot";
import { getDirectoryName } from "VSS/Utils/File";
import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";
import { VssDetailsList } from "VSSUI/VssDetailsList";
import { WITPerformanceScenario } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { NameColumn } from "WorkItemTracking/Scripts/Queries/Components/NameColumn";
import { IQueriesPivotProps, IQueriesPivotState, QueriesPivot } from "WorkItemTracking/Scripts/Queries/Components/QueriesPivot";
import { QueryModifiedByCell } from "WorkItemTracking/Scripts/Queries/Components/QueryModifiedByCell";
import { QueryPathCell } from "WorkItemTracking/Scripts/Queries/Components/QueryPathCell";
import { TabLoading } from "WorkItemTracking/Scripts/Queries/Components/TabLoading";
import { ChevronIconState, QueryItemFavoriteConstants, QueriesHubConstants } from "WorkItemTracking/Scripts/Queries/Models/Constants";
import { ActiveQueryView, QueriesColumnKey, QueryFavorite, QueryLoadingState, FavoriteQueryItem } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { QueryUtilities } from "WorkItemTracking/Scripts/Queries/QueryUtilities";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import * as React from "react";
import { QueriesConstants } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";

export class FavoriteQueriesPivot extends QueriesPivot<IQueriesPivotProps, IQueriesPivotState> {
    protected SCENARIO_NAME: string = WITPerformanceScenario.QUERIESHUB_QUERIESVIEW_OPENFAVORITESPIVOT;

    public componentWillMount() {
        super.componentWillMount();
        this.context.actionsCreator.removeUnfavoritedItems(this.context.stores.queryFavoriteGroupStore.getAll());
    }

    public render(): JSX.Element {
        let pivotElement: JSX.Element = undefined;
        if (this.state.loadingState === QueryLoadingState.Loading) {
            pivotElement = <TabLoading />;
        } else {
            pivotElement = this._renderView();
        }

        return pivotElement;
    }

    private _renderView(): JSX.Element {
        const items = this.state.items;
        const hasQueries = items.length > 0;
        const noFilterResults = !hasQueries && this.state.isSearching ? <GenericFilterZeroData artifactName={Resources.Items} /> : null;
        return <main aria-label={Resources.Queries} role="treegrid">
            <VssDetailsList
                setKey={"favorite-queries"} // setKey is required to keep focus on the selected item when the row is re-rendered
                layoutMode={DetailsListLayoutMode.justified}
                constrainMode={ConstrainMode.unconstrained}
                columns={this.getColumns()}
                className="favorite-queries"
                items={items}
                checkboxVisibility={CheckboxVisibility.hidden}
                selectionMode={SelectionMode.single}
                actionsColumnKey={QueriesColumnKey.Title}
                allocateSpaceForActionsButtonWhileHidden={true}
                shouldDisplayActions={this.shouldDisplayActions}
                getMenuItems={this.getMenuItems}
                getMenuItemProviders={this.getMenuItemProviders}
                onRenderItemColumn={this.onRenderItemColumn}
                onRenderRow={this.onRenderRow}
                groups={this.state.groups}
                groupProps={{
                    onRenderHeader: this._onRenderGroupHeader,
                    collapseAllVisibility: CollapseAllVisibility.hidden
                }}
                initialFocusedIndex={document.activeElement === document.body ? 0 : -1}
                minimumPixelsForDrag={0}
                getKey={(item: FavoriteQueryItem) => item.id}
            />
            {noFilterResults}
        </main>;
    }

    private _onRenderGroupHeader = (props: IGroupDividerProps): JSX.Element => {
        const { key, name, count, isCollapsed } = props.group;

        const favoriteGroup = this.context.stores.queryFavoriteGroupStore.get(key);
        const isLoadingFavoriteGroup = key === QueryItemFavoriteConstants.TeamFavoriteLoadingGroupKey;
        const isLastVisitedGroup = key === QueriesConstants.LastVisitedQueryGroupKey;
        const groupHeaderTitle = favoriteGroup.isEmpty || isLoadingFavoriteGroup || isLastVisitedGroup ? name : `${name} (${count})`;
        const ariaLabel = Utils_String.format(Resources.QueryFavoriteItemAriaLabel, groupHeaderTitle);
        return (
            <KeyboardAccesibleComponent className="queries-favorites-list-header"
                ariaLabel={ariaLabel}
                ariaExpanded={!isCollapsed}
                onClick={() => this._onGroupExpandStateChange(props)}
                ref={elem => { this._groupHeaders[QueryUtilities.getEmptyQueryItemId(key)] = elem; }}
                onKeyDown={(event: React.KeyboardEvent<HTMLElement>, componentProps: KeyboardAccesibleComponentProps) => {
                    if (event.keyCode === KeyCode.ENTER
                        || event.keyCode === KeyCode.SPACE
                        || event.keyCode === KeyCode.LEFT && !isCollapsed
                        || event.keyCode === KeyCode.RIGHT && isCollapsed) {
                        componentProps.onClick(event);
                        event.preventDefault();
                        event.stopPropagation();
                    }
                }} >
                {isLoadingFavoriteGroup ?
                    <span style={{ marginRight: 2 }}>
                        <Spinner size={SpinnerSize.small} className="query-favorite-spinner" />
                    </span> :
                    !isLastVisitedGroup && <span>
                        <div className={QueryUtilities.getChevronIconClassName(isCollapsed ? ChevronIconState.Collapsed : ChevronIconState.Expanded)} />
                    </span>

                }
                <span className="queries-favorite-list-header-name">{groupHeaderTitle}</span>
            </KeyboardAccesibleComponent>
        );
    }

    private _onGroupExpandStateChange = (props: IGroupDividerProps): void => {
        const isLastVisitedGroup = props.group.key === QueriesConstants.LastVisitedQueryGroupKey;

        if (isLastVisitedGroup) {
            return;
        }
        if (props.group.isCollapsed) {
            this.context.actionsCreator.expandQueryFavoriteGroup(props.group.key);
        } else {
            this.context.actionsCreator.collapseQueryFavoriteGroup(props.group.key);
        }
    }

    private _getGroups(items: QueryFavorite[]): IGroup[] {
        const groupMap: IDictionaryStringTo<IGroup> = {};
        let i = 0;

        for (const item of items) {
            const key = item.parentId || QueriesConstants.MyFavoritesGroupKey;
            const isLastVisitedGroup = Utils_String.equals(item.parentId, QueriesConstants.LastVisitedQueryGroupKey, true);
            const name = isLastVisitedGroup ? item.parentName : Utils_String.format(Resources.QueryTeamFavoriteLabel, item.parentName);

            if (!groupMap[key]) {
                groupMap[key] = {
                    key: key,
                    name: name,
                    startIndex: i++,
                    count: 1,
                    isCollapsed: !this.context.stores.queryFavoriteGroupStore.get(key).isExpanded
                };
            } else {
                i++;
                groupMap[key].count++;
            }
        }

        return Object.keys(groupMap).map(key => groupMap[key]);
    }

    protected initialize(): void {
        this.context.actionsCreator.setActiveQueryView(ActiveQueryView.Mine);
        this.context.actionsCreator.initializeFavorites();
    }

    protected getStateFromStore(): IQueriesPivotState {
        let favorites: QueryFavorite[] = [];

        for (const group of this.context.stores.queryFavoriteGroupStore.getFiltered()) {
            favorites = favorites.concat(group.favorites);
        }

        const favoriteItems = QueryUtilities.sortFavorites(favorites);
        const favoriteQueryItems = QueryUtilities.getQueryItemsFromFavorites(favoriteItems, this.context.stores.queryHierarchyItemStore);
        const isDataReady = this.context.stores.queryFavoriteGroupStore.isLoaded()
            && this.context.stores.queryHierarchyItemStore.isLoaded();

        return {
            items: favoriteQueryItems,
            loadingState: isDataReady ? QueryLoadingState.Loaded : QueryLoadingState.Loading,
            groups: this._getGroups(favoriteItems),
            isSearching: this.context.stores.queryFavoriteGroupStore.isFiltering()
        };
    }

    /**
     * Override the based function to use item index as row id.
     *
     * Default row id is query item guid but this pivot view uses grouped DetailsList:
     * - Items order are guarenteed to match groups
     * - The same query item can show up multiple times in different groups
     */
    protected _getRowId(queryItem: FavoriteQueryItem): string {
        if (queryItem && queryItem.itemIndex >= 0) {
            return `${queryItem.itemIndex}`;
        }

        return null;
    }

    protected onRenderItemColumn = (item?: FavoriteQueryItem, index?: number, column?: IColumn): JSX.Element => {
        if (!item) {
            return <div></div>;
        }

        switch (column.fieldName) {
            case QueriesColumnKey.Title:
                return <NameColumn key={item.id} queryItem={item} ignoreDepth={true} onRenderEmptyQueryItem={this._onRenderEmptyContent} pivot={QueriesHubConstants.MinePageAction} />;
            case QueriesColumnKey.Folder:
                return <QueryPathCell path={getDirectoryName(item.path)} />;
            case QueriesColumnKey.LastModifiedBy:
                if (item.lastModifiedBy) {
                    return <QueryModifiedByCell
                        modifiedBy={item.lastModifiedBy}
                        modifiedDate={item.lastModifiedDate}
                        tfsContext={TfsContext.getDefault()}
                    />;
                }
                break;
            default:
                return <div></div>;
        }
    }

    private _onRenderEmptyContent = (queryItem: FavoriteQueryItem): JSX.Element => {
        const isMyFavoriteEmptyItem = queryItem.id.indexOf(QueriesConstants.MyFavoritesGroupKey) !== -1;
        const isFavoriteLoadingEmptyItem = queryItem.id.indexOf(QueryItemFavoriteConstants.TeamFavoriteLoadingGroupKey) !== -1;
        const emptyContentColumnClassName = "empty-query-item query-name-ellipsis-empty";

        if (isFavoriteLoadingEmptyItem) {
            return null; // Dont render anything since it is a temporary loading experience for team favorites
        } else if (isMyFavoriteEmptyItem) {
            return <div className={emptyContentColumnClassName}>
                <span>{`${Resources.EmptyMyFavoriteGroupTextPrefix}`}</span>
                <span className="bowtie-icon bowtie-favorite" />
                <span>{Resources.EmptyMyFavoriteGroupTextSuffix}</span>
            </div>;
        } else {
            // '\u00A0' is &nbsp;
            return <div className={emptyContentColumnClassName}>
                <span>{Resources.EmptyTeamFavoriteGroupTextPrefix + '\u00A0'}</span>
                <span>{Resources.EmptyTeamFavoriteGroupTextLink}</span>
                <span>{Resources.EmptyTeamFavoriteGroupTextSuffix}</span>
            </div>;
        }
    }

    protected getColumns(): IColumn[] {
        return [
            {
                fieldName: QueriesColumnKey.Title,
                key: QueriesColumnKey.Title,
                name: Resources.QueryColumnTitle,
                minWidth: 300,
                maxWidth: 500,
                headerClassName: "query-column-header query-name",
                className: "query-column-cell query-name",
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled
            },
            {
                fieldName: QueriesColumnKey.Folder,
                key: QueriesColumnKey.Folder,
                name: Resources.QueryColumnFolder,
                minWidth: 300,
                maxWidth: 500,
                headerClassName: "query-column-header query-path",
                className: "query-column-cell query-path",
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled
            },
            {
                fieldName: QueriesColumnKey.LastModifiedBy,
                key: QueriesColumnKey.LastModifiedBy,
                name: Resources.QueryColumnLastModifiedBy,
                isResizable: true,
                minWidth: 150,
                maxWidth: 400,
                headerClassName: "query-column-header query-lastmodifiedby",
                className: "query-column-cell query-lastmodifiedby",
                columnActionsMode: ColumnActionsMode.disabled
            }
        ];
    }
}