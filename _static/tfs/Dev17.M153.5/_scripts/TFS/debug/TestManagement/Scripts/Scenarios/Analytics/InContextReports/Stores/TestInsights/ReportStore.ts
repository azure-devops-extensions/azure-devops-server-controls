import { ErrorParser } from "Analytics/Scripts/AnalyticsExceptionUtilities";
import { ReportActions } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TestInsights/ReportActions";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import { Store } from "VSS/Flux/Store";

export interface IReportViewState {
    showDetails: boolean;
    isLoading: boolean;
    errorMessage?: string;
    detailsPanelErrorMessage?: string;
    viewType: CommonTypes.ViewType;
}

export class ReportStore extends Store {
    constructor(private _instanceId?: string) {
        super();
        this._initialize();
    }

    public static getInstance(instanceId?: string): ReportStore {
        return FluxFactory.instance().get(ReportStore, instanceId);
    }

    public static getKey(): string {
        return "ReportStore";
	}

    public getState(): IReportViewState {
        return this._state;
    }

    public dispose(): void {
        this._actions.openDetailsPanelAction.removeListener(this._openDetailsPanel);
        this._actions.closeDetailsPanelAction.removeListener(this._closeDetailsPanel);
        this._actions.onError.removeListener(this._onError);
        this._actions.onDetailsPanelError.removeListener(this._onDetailsPanelError);
        this._actions.updateTestHistoryListAction.removeListener(this._onUpdateTestHistoryList);
    }

    private _initialize(): void {
        this._actions = ReportActions.getInstance(this._instanceId);
        this._state = {} as IReportViewState;
        this._state.isLoading = true;
        this._state.showDetails = false;
        this._state.viewType = CommonTypes.ViewType.TestInsightsReportView;
        
        this._actions.updateConfigurationValuesAction.addListener(this._updateConfigurationValues);
        this._actions.openDetailsPanelAction.addListener(this._openDetailsPanel);
        this._actions.closeDetailsPanelAction.addListener(this._closeDetailsPanel);
        this._actions.onError.addListener(this._onError);
        this._actions.onDetailsPanelError.addListener(this._onDetailsPanelError);
        this._actions.updateTestHistoryListAction.addListener(this._onUpdateTestHistoryList);
    }

    private _updateConfigurationValues = (configurationValues: CommonTypes.IReportConfiguration) => {
        this._state.viewType = CommonTypes.ViewType.TestInsightsReportView;
    }

    private _openDetailsPanel = (result: TCMContracts.TestCaseResult) => {
        this._state.showDetails = true;
        this._state.detailsPanelErrorMessage = null;

        this.emitChanged();
    }

    private _closeDetailsPanel = () => {
        this._state.showDetails = false;

        this.emitChanged();
    }

    private _onError = (error: Error) => {
        this._state.errorMessage = ErrorParser.stringifyODataError(error);

        this.emitChanged();
    }

    private _onDetailsPanelError = (error: Error) => {
        this._state.detailsPanelErrorMessage = ErrorParser.stringifyError(error);

        this.emitChanged();
    }

    private _onUpdateTestHistoryList = (testHistoryList: CommonTypes.ITestHistoryListData) => {
        if (testHistoryList.testHistoryListItems.length === 0) {
            this._state.viewType = CommonTypes.ViewType.NoTestDataView;
        } else {
            this._state.viewType = CommonTypes.ViewType.TestInsightsReportView;
        }

        this.emitChanged();
    }
    
    private _state: IReportViewState;
    private _actions: ReportActions;
}