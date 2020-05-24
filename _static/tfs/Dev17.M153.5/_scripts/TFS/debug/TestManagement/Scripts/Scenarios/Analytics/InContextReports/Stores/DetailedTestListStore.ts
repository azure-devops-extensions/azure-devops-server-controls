import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { TestResultsReportActions } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TestResultsReportActions";
import * as Definitions from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Definitions";
import { DurationFormatter } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/DurationUtility";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { Utility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Utility";
import { MetadataStore } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/MetadataStore";
import { TreeNodeType } from "TestManagement/Scripts/Scenarios/Common/Common";
import * as CommonUtils from "TestManagement/Scripts/Scenarios/Common/CommonUtils";
import { Store } from "VSS/Flux/Store";
import * as Utils_String from "VSS/Utils/String";


export interface IDetailedTestListState {
    sortedColumn: CommonTypes.IDetailedListColumn;
    items: CommonTypes.IDetailedListItem[];
    gridViewDisplayType: CommonTypes.GridViewDisplayType;
    totalTestResults: number;
}

export class DetailedTestListStore extends Store {

    constructor(private _instanceId?: string) {
        super();
        this._initialize();
    }

    public static getInstance(instanceId?: string): DetailedTestListStore {
        return FluxFactory.instance().get(DetailedTestListStore, instanceId);
    }

    public static getKey(): string {
        return "DetailedTestListStore";
	}

    public getState(): IDetailedTestListState {
        return this._state;
    }

    public getConfValue(): CommonTypes.IReportConfiguration {
        return this._confValues;
    }

    public getTestContext(item: CommonTypes.IDetailedListItem): CommonTypes.ITestContext {
        if (item.nodeType === TreeNodeType.leaf) {
            return {
                testIdentifier: item.itemkey as string,
                testName: item.itemName
            } as CommonTypes.ITestContext;
        }

        return null;
    }

    public getNextPageToken(parentKey: number | string): CommonTypes.INextDataPageToken {
        switch (this._confValues.groupBy) {
            case CommonTypes.GroupBy.None:
                return this._itemList.nextPageToken;
            default:        // For all groupBy
                if (parentKey || parentKey === Utils_String.empty) {
                    return this._groupItemKeyToDetailMap[parentKey.toString()].nextPageToken;
                } else {
                    return this._itemList.nextPageToken;
                }
        }
    }

    public isListCompletelyFetched(parentKey?: number | string): boolean {
        if (parentKey || parentKey === Utils_String.empty) {        // For groupBy's
            const parentKeyAsStr: string = parentKey.toString();
            return this._groupItemKeyToDetailMap &&
                this._groupItemKeyToDetailMap[parentKeyAsStr] &&
                this._groupItemKeyToDetailMap[parentKeyAsStr].children.length > 0 &&
                !(this._groupItemKeyToDetailMap[parentKeyAsStr].nextPageToken && this._groupItemKeyToDetailMap[parentKeyAsStr].nextPageToken.token);
        }

        return !(this._itemList.nextPageToken && this._itemList.nextPageToken.token);
    }

    public dispose(): void {
        this._actions.updateReportsWithConfigurationAction.removeListener(this._onUpdateConfiguration);
        this._actions.updateDetailedTestListAction.removeListener(this._onUpdateDetailedTestList);
        this._actions.detailedTestListGroupExpandedAction.removeListener(this._onGroupExpanded);
        this._actions.detailedTestListGroupCollapsedAction.removeListener(this._onGroupCollapsed);
        this._actions.detailedTestListColumnOrderChangedAction.removeListener(this._onColumnOrderChanged);
        this._actions.detailedTestListSortByColumnAction.removeListener(this._onSortByColumn);
        this._actions.detailedTestListExpandGroupAndSortByColumnAction.removeListener(this._onGroupExpandAndSortByColumn);
        this._actions.updateTestOutcomeMetricsAction.removeListener(this._onUpdateTestOutcomeMetrics);
        this._actions.initializingTestResultsAction.removeListener(this._showInitializingTestListExperience);
        this._actions.detailedListShowMoreAction.removeListener(this._onDetailedListShowMore);
        this._actions.detailedListShowMoreInsideGroupAction.removeListener(this._onDetailedListShowMoreInsideGroup);
    }

    private _initialize(): void {
        this._actions = TestResultsReportActions.getInstance(this._instanceId);
        let reportConfigurationDef = new Definitions.ReportConfigurationDefinition();
        this._state = {
            sortedColumn: reportConfigurationDef.defaultDetailedTestListSortedColumn,
            gridViewDisplayType: CommonTypes.GridViewDisplayType.Loading
        } as IDetailedTestListState;
        this._itemList = { detailedListItems: [] } as CommonTypes.IDetailedListData;

        this._actions.updateReportsWithConfigurationAction.addListener(this._onUpdateConfiguration);
        this._actions.updateDetailedTestListAction.addListener(this._onUpdateDetailedTestList);
        this._actions.detailedTestListGroupExpandedAction.addListener(this._onGroupExpanded);
        this._actions.detailedTestListGroupCollapsedAction.addListener(this._onGroupCollapsed);
        this._actions.detailedTestListColumnOrderChangedAction.addListener(this._onColumnOrderChanged);
        this._actions.detailedTestListSortByColumnAction.addListener(this._onSortByColumn);
        this._actions.detailedTestListExpandGroupAndSortByColumnAction.addListener(this._onGroupExpandAndSortByColumn);
        this._actions.updateTestOutcomeMetricsAction.addListener(this._onUpdateTestOutcomeMetrics);
        this._actions.initializingTestResultsAction.addListener(this._showInitializingTestListExperience);
        this._actions.detailedListShowMoreAction.addListener(this._onDetailedListShowMore);
        this._actions.detailedListShowMoreInsideGroupAction.addListener(this._onDetailedListShowMoreInsideGroup);
    }   

    private _onUpdateConfiguration = (confValues: CommonTypes.IReportConfiguration) => {
        this._state.gridViewDisplayType = CommonTypes.GridViewDisplayType.Loading;
        this._state.totalTestResults = null;  
        this._confValues = Object.assign({}, confValues);
        this._state.items = null;        
        this._itemList = { detailedListItems: [] } as CommonTypes.IDetailedListData;

        this._updateColumnToOrderBy(this._confValues);

        this.emitChanged();
    }

    private _onUpdateDetailedTestList = (detailedListItemsData: CommonTypes.IDetailedListData) => {
        if (this._confValues && !Utility.areConfValuesEqual(this._confValues, detailedListItemsData.confValues)) {
            // Do not update store as the configuration has changed.
            return;
        }

        this._state.gridViewDisplayType = CommonTypes.GridViewDisplayType.Initialized;   

        this._itemList = { detailedListItems: (detailedListItemsData.detailedListItems || []), nextPageToken: detailedListItemsData.nextPageToken } as CommonTypes.IDetailedListData;
        this._groupItemKeyToDetailMap = {};
        
        this._createItemListToShow();

        this.emitChanged();
    }

    // This method is for show more in both plain test list or grouped list.
    private _onDetailedListShowMore = (detailedListItemsData: CommonTypes.IDetailedListData) => {
        if (this._confValues && !Utility.areConfValuesEqual(this._confValues, detailedListItemsData.confValues)) {
            // Do not update store as the configuration has changed.
            return;
        }

        this._itemList.detailedListItems.push(...(detailedListItemsData.detailedListItems || []));
        this._itemList.nextPageToken = detailedListItemsData.nextPageToken;

        this._createItemListToShow();      

        this.emitChanged();
    }

    // This method is for show more inside a group.
    private _onDetailedListShowMoreInsideGroup = (showMoreData: CommonTypes.IDetailedListGroupData) => {
        if (this._confValues && !Utility.areConfValuesEqual(this._confValues, showMoreData.confValues)) {
            // Do not update store as the configuration has changed.
            return;
        }

        this._groupItemKeyToDetailMap[showMoreData.detailedListGroupItem.groupItem.itemkey].children.push(...showMoreData.detailedListGroupItem.children);
        this._groupItemKeyToDetailMap[showMoreData.detailedListGroupItem.groupItem.itemkey].nextPageToken = showMoreData.detailedListGroupItem.nextPageToken;

        this._prepareItemListFromGroupToTestListMap();

        this.emitChanged();
    }

    private _showInitializingTestListExperience = () => {
        if (this._state.gridViewDisplayType === CommonTypes.GridViewDisplayType.Loading) {
            this._state.gridViewDisplayType = CommonTypes.GridViewDisplayType.Initializing;
            this.emitChanged();
        }
    }

    private _onGroupExpanded = (groupItemExpanded: CommonTypes.IDetailedListGroupData) => {
        if (this._confValues && !Utility.areConfValuesEqual(this._confValues, groupItemExpanded.confValues)) {
            // Do not update store as the configuration has changed.
            return;
        }

        if (this._groupItemKeyToDetailMap[groupItemExpanded.detailedListGroupItem.groupItem.itemkey]) {

            this._groupItemKeyToDetailMap[groupItemExpanded.detailedListGroupItem.groupItem.itemkey].groupItem.expanded = true;

            // This is to ensure that we don't update a group which was first expanded, then show more, then collapsed and then again expanded.
            if (!this._groupItemKeyToDetailMap[groupItemExpanded.detailedListGroupItem.groupItem.itemkey].children
                || this._groupItemKeyToDetailMap[groupItemExpanded.detailedListGroupItem.groupItem.itemkey].children.length === 0)
            {
                this._groupItemKeyToDetailMap[groupItemExpanded.detailedListGroupItem.groupItem.itemkey].children = groupItemExpanded.detailedListGroupItem.children ? groupItemExpanded.detailedListGroupItem.children : [];
                this._groupItemKeyToDetailMap[groupItemExpanded.detailedListGroupItem.groupItem.itemkey].nextPageToken = groupItemExpanded.detailedListGroupItem.nextPageToken;
            }
        }

        this._prepareItemListFromGroupToTestListMap();
        this.emitChanged();
    }

    private _onGroupCollapsed = (groupItemCollapsed: CommonTypes.IDetailedListItem) => {
        if (this._groupItemKeyToDetailMap[groupItemCollapsed.itemkey]) {
            this._groupItemKeyToDetailMap[groupItemCollapsed.itemkey].groupItem.expanded = false;
        }

        this._prepareItemListFromGroupToTestListMap();
        this.emitChanged();
    }

    private _onColumnOrderChanged = (orderedColumn: CommonTypes.IDetailedListColumn) => {
        this._state.gridViewDisplayType = CommonTypes.GridViewDisplayType.Loading;
        this._state.sortedColumn = Object.assign({}, orderedColumn);
        this._state.items = null;        
        this.emitChanged();
    }

    private _onSortByColumn = () => {
        this._state.gridViewDisplayType = CommonTypes.GridViewDisplayType.Initialized;

        if (this._itemList && this._itemList.detailedListItems && this._itemList.detailedListItems.length > 0) {          

            this._sortItemsInList(this._itemList.detailedListItems, this._state.sortedColumn);

            //Collapse all expanded groups as data is sorted and one should expand again to view new sorted list.
            if (this._groupItemKeyToDetailMap) {
                for (const key in this._groupItemKeyToDetailMap) {
                    this._groupItemKeyToDetailMap[key].groupItem.expanded = false;
                }
            }

            this._createItemListToShow();

            this.emitChanged();
        }
    }

    private _onGroupExpandAndSortByColumn = (groupItem: CommonTypes.IDetailedListItem) => {
        if (this._groupItemKeyToDetailMap[groupItem.itemkey]) {
            //Expand group.
            this._groupItemKeyToDetailMap[groupItem.itemkey].groupItem.expanded = true;

            this._sortItemsInList(this._groupItemKeyToDetailMap[groupItem.itemkey].children, this._state.sortedColumn);
        }

        this._prepareItemListFromGroupToTestListMap();

        this.emitChanged();
    }

    private _onUpdateTestOutcomeMetrics = (metricsData: CommonTypes.ICardMetricsData) => {
        if (this._confValues && !Utility.areConfValuesEqual(this._confValues, metricsData.confValues)) {
            // Do not update store as the configuration has changed.
            return;
        }

        //Save total tests to be displayed when loading Test Results take more than 5 minutes.
        this._state.totalTestResults = metricsData ? metricsData.totalCount : null;
    }

    private _createItemListToShow(): void {
        switch (this._confValues.groupBy) {
            case CommonTypes.GroupBy.None:          //Plain test list
                this._state.items = this._itemList.detailedListItems.map(i => {
                    return this._prepareItemToDisplay(i, TreeNodeType.leaf, 0);
                });

                if (this._itemList.nextPageToken && this._itemList.nextPageToken.token) {
                    this._state.items.push({ itemkey: this._showMoreKey, itemName: Resources.ShowMoreText, nodeType: TreeNodeType.showMore, depth: 0 } as CommonTypes.IDetailedListItem);
                }
                break;
            case CommonTypes.GroupBy.Environment:
                let releaseEnvironmentDefinitionIdToNameMap = MetadataStore.getInstance().getReleaseEnvironmentDefinitionIdToNameMap();

                this._itemList.detailedListItems.forEach(item => {
                    // Replace Environment Id with Environment Name
                    item.itemName = item.itemkey && releaseEnvironmentDefinitionIdToNameMap && releaseEnvironmentDefinitionIdToNameMap[item.itemkey.toString()]
                        ? releaseEnvironmentDefinitionIdToNameMap[item.itemkey.toString()] : Utility.getDeletedEnvironmentDefIdDisplayString(item.itemkey.toString());
                });
                this._prepareItemListFromGroupToTestListMap();
                break;
            default:            //For all group by's
                this._prepareItemListFromGroupToTestListMap();
                break;
        }
    }

    /**
     * Handles preparation of list for groups and its childrens
     */
    private _prepareItemListFromGroupToTestListMap(): void {
        this._state.items = [];
        this._itemList.detailedListItems.forEach(item => {
            const itemKey: string | number = item.itemkey;

            if (!this._groupItemKeyToDetailMap[itemKey]) {
                this._groupItemKeyToDetailMap[itemKey] = { groupItem: item, children: [] };
            }

            //Inserting group item.
            this._state.items.push(this._prepareItemToDisplay(this._groupItemKeyToDetailMap[itemKey].groupItem, TreeNodeType.group, 0));

            if (this._groupItemKeyToDetailMap[itemKey].groupItem.expanded) {
                //Inserting test item
                this._groupItemKeyToDetailMap[itemKey].children.forEach(item => {
                    this._state.items.push(this._prepareItemToDisplay(item, TreeNodeType.leaf, 1));
                });

                // Add ShowMoreButton if there is possibility of more items.
                if (this._groupItemKeyToDetailMap[itemKey].nextPageToken && this._groupItemKeyToDetailMap[itemKey].nextPageToken.token) {
                    this._state.items.push({ itemkey: this._showMoreKey, itemName: Resources.ShowMoreText, nodeType: TreeNodeType.showMore, parentItemKey: itemKey, depth: 1 } as CommonTypes.IDetailedListItem);
                }
            }
        });

        if (this._itemList.nextPageToken && this._itemList.nextPageToken.token) {
            this._state.items.push({ itemkey: this._showMoreKey, itemName: Resources.ShowMoreText, nodeType: TreeNodeType.showMore, depth: 0 } as CommonTypes.IDetailedListItem);
        }
    }

    private _prepareItemToDisplay(item: CommonTypes.IDetailedListItem, nodeType: TreeNodeType, depth: number): CommonTypes.IDetailedListItem {
        let newItem: CommonTypes.IDetailedListItem = Object.assign({}, item);

        newItem.nodeType = nodeType;
        newItem.depth = depth;
        newItem.passPercentage = CommonUtils.TestReportDataParser.getPercentageInDisplayFormat(item.passPercentage as number);
        newItem.avgDuration = DurationFormatter.getDurationInAbbreviatedFormat(item.avgDuration as number);
        newItem.avgDurationAriaLabel = DurationFormatter.getDurationAriaLabel(item.avgDuration as number);

        return newItem;
    }

    private _updateColumnToOrderBy(confValues: CommonTypes.IReportConfiguration): void {
        let currentOrderedColumn: CommonTypes.IDetailedListColumn = this._state.sortedColumn;
        let columns: CommonTypes.ColumnIndices[] = [CommonTypes.ColumnIndices.Passrate, CommonTypes.ColumnIndices.AvgDuration, CommonTypes.ColumnIndices.TotalCount];

        if (confValues && confValues.outcomes && confValues.outcomes.length > 0) {
            for (let outcome of confValues.outcomes) {
                columns.push(this._getColumnFromOutcome(outcome));
            }
        }

        if (columns.indexOf(currentOrderedColumn.column) === -1) {
            if (columns.indexOf(CommonTypes.ColumnIndices.FailedCount) !== -1) {
                currentOrderedColumn.column = CommonTypes.ColumnIndices.FailedCount;
                currentOrderedColumn.sortOrder = CommonTypes.SortOrder.Descending;
            } else {
                currentOrderedColumn.column = CommonTypes.ColumnIndices.Passrate;
                currentOrderedColumn.sortOrder = CommonTypes.SortOrder.Ascending;
            }
        }
    }

    private _getColumnFromOutcome(outcome: CommonTypes.TestOutcome): CommonTypes.ColumnIndices {
        switch (outcome) {
            case CommonTypes.TestOutcome.Failed:
                return CommonTypes.ColumnIndices.FailedCount;

            case CommonTypes.TestOutcome.Passed:
                return CommonTypes.ColumnIndices.PassedCount;

            case CommonTypes.TestOutcome.Inconclusive:
                return CommonTypes.ColumnIndices.InconclusiveCount;

            case CommonTypes.TestOutcome.Aborted:
                return CommonTypes.ColumnIndices.AbortedCount;

            case CommonTypes.TestOutcome.NotExecuted:
                return CommonTypes.ColumnIndices.NotExecutedCount;

            case CommonTypes.TestOutcome.Error:
                return CommonTypes.ColumnIndices.ErrorCount;

            case CommonTypes.TestOutcome.NotImpacted:
                return CommonTypes.ColumnIndices.NotImpactedCount;
        }
    }

    private _sortItemsInList(items: CommonTypes.IDetailedListItem[], sortedColumn: CommonTypes.IDetailedListColumn) {
        items.sort((item1: CommonTypes.IDetailedListItem, item2: CommonTypes.IDetailedListItem) => {

            let diff: number = 0;
            switch (sortedColumn.column) {
                case CommonTypes.ColumnIndices.Passrate:
                    diff = (item1.passPercentage as number) - (item2.passPercentage as number);
                    break;
                case CommonTypes.ColumnIndices.TotalCount:
                    diff = item1.totalCount - item2.totalCount;
                    break;
                case CommonTypes.ColumnIndices.AvgDuration:
                    diff = (item1.avgDuration as number) - (item2.avgDuration as number);
                    break;
                case CommonTypes.ColumnIndices.FailedCount:
                    diff = item1.failedCount - item2.failedCount;
                    break;
                case CommonTypes.ColumnIndices.PassedCount:
                    diff = item1.passedCount - item2.passedCount;
                    break;
                case CommonTypes.ColumnIndices.NotExecutedCount:
                    diff = item1.notExecutedCount - item2.notExecutedCount;
                    break;
                case CommonTypes.ColumnIndices.NotImpactedCount:
                    diff = item1.notImpactedCount - item2.notImpactedCount;
                    break;
                case CommonTypes.ColumnIndices.ErrorCount:
                    diff = item1.errorCount - item2.errorCount;
                    break;
                case CommonTypes.ColumnIndices.InconclusiveCount:
                    diff = item1.inconclusiveCount - item2.inconclusiveCount;
                    break;
                case CommonTypes.ColumnIndices.AbortedCount:
                    diff = item1.abortedCount - item2.abortedCount;
                    break;
            }

            return sortedColumn.sortOrder === CommonTypes.SortOrder.Descending ? -1 * diff : diff;
        });
    }

    private _actions: TestResultsReportActions;
    private _state: IDetailedTestListState;
    private _confValues: CommonTypes.IReportConfiguration;
    private _groupItemKeyToDetailMap: IDictionaryStringTo<CommonTypes.IDetailedListGroupItem>;
    private _itemList: CommonTypes.IDetailedListData;       //Store copy of list of items when no-group and only group items(no child items) when grouped.
    private _showMoreKey: string = "ShowMoreKey";
}