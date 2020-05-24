import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { ReportActions } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TestInsights/ReportActions";
import { DurationFormatter } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/DurationUtility";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { Utility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Utility";
import { MetadataStore } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/MetadataStore";
import { TreeNodeType } from "TestManagement/Scripts/Scenarios/Common/Common";
import { Store } from "VSS/Flux/Store";


export interface ITestHistoryListState {
    items: CommonTypes.ITestHistoryListItem[];
}

export class TestHistoryListStore extends Store {

    constructor(private _instanceId?: string) {
        super();
        this._initialize();
    }

    public static getInstance(instanceId?: string): TestHistoryListStore {
        return FluxFactory.instance().get(TestHistoryListStore, instanceId);
    }

    public static getKey(): string {
        return "TestHistoryListStore";
	}

    public getState(): ITestHistoryListState {
        return this._state;
    }

    public getNextPageToken(): CommonTypes.INextDataPageToken {
        return this._itemList.nextPageToken;
    }

    public dispose(): void {
        this._actions.updateConfigurationValuesAction.removeListener(this._onUpdateConfiguration);
        this._actions.updateTestHistoryListAction.removeListener(this._onUpdateTestHistoryList);
        this._actions.appendTestHistoryListAction.removeListener(this._onAppendTestHistoryList);
    }

    private _initialize(): void {
        this._actions = ReportActions.getInstance(this._instanceId);

        this._itemList = { testHistoryListItems: [] } as CommonTypes.ITestHistoryListData;
        this._state = {} as ITestHistoryListState;

        this._actions.updateConfigurationValuesAction.addListener(this._onUpdateConfiguration);
        this._actions.updateTestHistoryListAction.addListener(this._onUpdateTestHistoryList);
        this._actions.appendTestHistoryListAction.addListener(this._onAppendTestHistoryList);

        this._showMoreKey = { testRunId: 0, testResultId: 0 } as CommonTypes.ITestResultIdentifier;
    }

    private _onUpdateConfiguration = (confValues: CommonTypes.IReportConfiguration) => {

        this._confValues = confValues;
        this._state.items = null;        //This is done since after config change it will take time for data to come and component can show loading experience till then.
        this._itemList = { testHistoryListItems: [] } as CommonTypes.ITestHistoryListData;
        this.emitChanged();
    }

    private _onUpdateTestHistoryList = (testHistoryListData: CommonTypes.ITestHistoryListData) => {
        if (this._confValues && !Utility.areConfValuesEqual(this._confValues, testHistoryListData.confValues)) {
            // Do not update store as the configuration has changed.
            return;
        }

        this._itemList = { testHistoryListItems: [] } as CommonTypes.ITestHistoryListData;
        this._createItemListToShow(testHistoryListData);
        this.emitChanged();
    }

    private _onAppendTestHistoryList = (testHistoryListData: CommonTypes.ITestHistoryListData) => {
        if (this._confValues && !Utility.areConfValuesEqual(this._confValues, testHistoryListData.confValues)) {
            // Do not update store as the configuration has changed.
            return;
        }

        this._createItemListToShow(testHistoryListData);
        this.emitChanged();
    }

    private _createItemListToShow(testHistoryListData: CommonTypes.ITestHistoryListData): void {
        this._itemList.testHistoryListItems.push(...(testHistoryListData.testHistoryListItems || []));
        this._itemList.nextPageToken = testHistoryListData.nextPageToken;

        this._state.items = this._getNewItemsToInsert(this._itemList.testHistoryListItems);               

        // Insert ShowMore item if there is possibility of more items.
        if (this._itemList.nextPageToken && this._itemList.nextPageToken.token) {
            this._state.items.push({ itemkey: this._showMoreKey, itemName: Resources.ShowMoreText, nodeType: TreeNodeType.showMore, depth: 0 } as CommonTypes.ITestHistoryListItem);
        }
    }

    private _getNewItemsToInsert(testHistoryListItems: CommonTypes.ITestHistoryListItem[]): CommonTypes.ITestHistoryListItem[] {
        const releaseEnvironmentDefinitionIdToNameMap = MetadataStore.getInstance().getReleaseEnvironmentDefinitionIdToNameMap();
        return testHistoryListItems.map(i => {
            let item = Object.assign({}, i);
            item.nodeType = i.nodeType ? i.nodeType : TreeNodeType.leaf;
            item.depth = 0;
            item.duration = DurationFormatter.getDurationInAbbreviatedFormat(i.duration as number);
            item.durationAriaLabel = DurationFormatter.getDurationAriaLabel(i.duration as number);
            item.environmentRef.name = (i.environmentRef && releaseEnvironmentDefinitionIdToNameMap &&
                releaseEnvironmentDefinitionIdToNameMap[i.environmentRef.id.toString()]) ?
                releaseEnvironmentDefinitionIdToNameMap[i.environmentRef.id.toString()] :
                Utility.getDeletedEnvironmentDefIdDisplayString(i.environmentRef.id.toString());

            return item;
        });
    }

    private _backButtonClicked = () => {
        this._state.items = null;
    }
    
    private _actions: ReportActions;
    private _state: ITestHistoryListState;
    private _confValues: CommonTypes.IReportConfiguration;
    private _itemList: CommonTypes.ITestHistoryListData;  
    private _showMoreKey: CommonTypes.ITestResultIdentifier;
}