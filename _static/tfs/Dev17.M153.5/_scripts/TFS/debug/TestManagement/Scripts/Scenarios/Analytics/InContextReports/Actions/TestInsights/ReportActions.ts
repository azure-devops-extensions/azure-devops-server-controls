import { TrendChartHelper } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TestInsights/TrendChartHelper";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import { Action } from "VSS/Flux/Action";


export class ReportActions {

    constructor() {
        this._updateConfigurationValuesAction = new Action<CommonTypes.IReportConfiguration>();
        this._updateTrendChartAction = new Action<TrendChartHelper>();
        this._updateTestHistoryListAction = new Action<CommonTypes.ITestHistoryListData>();
        this._openDetailsPanelAction = new Action<TCMContracts.TestCaseResult>();  
        this._closeDetailsPanelAction = new Action<void>();
        this._appendTestHistoryListAction = new Action<CommonTypes.ITestHistoryListData>();
        this._toggleFilterAction = new Action<void>();
        this._onError = new Action<Error>();
        this._onDetailsPanelError = new Action<Error>();
        this._expandFilterBar = new Action<boolean>();
    }

    public static getInstance(instanceId?: string): ReportActions {
        return FluxFactory.instance().get(ReportActions, instanceId);
    }

    public static getKey(): string {
        return "ReportActions";
    }

    /**
     * Configuration toolbar change is carried on this action
     */
    public get updateConfigurationValuesAction(): Action<CommonTypes.IReportConfiguration> {
        return this._updateConfigurationValuesAction;
    }

    /**
     * Action that carries chart data to store.
     */
    public get updateTrendChartAction(): Action<TrendChartHelper> {
        return this._updateTrendChartAction;
    }

    /**
     * Action that carries test history list items to store
     */
    public get updateTestHistoryListAction(): Action<CommonTypes.ITestHistoryListData> {
        return this._updateTestHistoryListAction;
    }

    /**
     * Action that notify to toggle the visibility of filters.
     */
    public get toggleFilter(): Action<void> {
        return this._toggleFilterAction;
    }

    public get closeDetailsPanelAction(): Action<void> {
        return this._closeDetailsPanelAction;
    }

    public get openDetailsPanelAction(): Action<TCMContracts.TestCaseResult> {
        return this._openDetailsPanelAction;
    }

    public get appendTestHistoryListAction(): Action<CommonTypes.ITestHistoryListData> {
        return this._appendTestHistoryListAction;
    }

    public get onError(): Action<Error> {
        return this._onError;
    }

    public get onDetailsPanelError(): Action<Error> {
        return this._onDetailsPanelError;
    }

    public get expandFilterBar(): Action<boolean> {
        return this._expandFilterBar;
    }
    
    public dispose(): void {
    }

    private _updateConfigurationValuesAction: Action<CommonTypes.IReportConfiguration>;
    private _updateTrendChartAction: Action<TrendChartHelper>;
    private _updateTestHistoryListAction: Action<CommonTypes.ITestHistoryListData>;
    private _openDetailsPanelAction: Action<TCMContracts.TestCaseResult>;
    private _closeDetailsPanelAction: Action<void>;
    private _appendTestHistoryListAction: Action<CommonTypes.ITestHistoryListData>;
    private _toggleFilterAction: Action<void>;
    private _onError: Action<Error>;
    private _onDetailsPanelError: Action<Error>;
    private _expandFilterBar: Action<boolean>;
}