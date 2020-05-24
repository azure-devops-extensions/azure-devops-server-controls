import * as Charts_Contracts from "Charts/Contracts";
import { ReportActions } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TestInsights/ReportActions";
import { TrendChartHelper } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TestInsights/TrendChartHelper";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { Utility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Utility";
import { Store } from "VSS/Flux/Store";

export interface ITrendChartState {
    chartOptions: Charts_Contracts.CommonChartOptions;
}

export class ChartStore extends Store {
    constructor(private _instanceId?: string) {
        super();
        this._initialize();
    }

    public static getInstance(instanceId?: string): ChartStore {
        return FluxFactory.instance().get(ChartStore, instanceId);
    }

    public static getKey(): string {
        return "ChartStore";
	}

    public getState(): ITrendChartState {
        return this._state;
    }

    public dispose(): void {
        this._actions.updateConfigurationValuesAction.removeListener(this._onUpdateConfiguration);
        this._actions.updateTrendChartAction.removeListener(this._onUpdateTrendChart);
    }

    private _initialize(): void {
        this._actions = ReportActions.getInstance(this._instanceId);
        this._state = {} as ITrendChartState;

        this._actions.updateConfigurationValuesAction.addListener(this._onUpdateConfiguration);
        this._actions.updateTrendChartAction.addListener(this._onUpdateTrendChart);
    }

    private _onUpdateConfiguration = (confValues: CommonTypes.IReportConfiguration) => {
        this._state.chartOptions = null;        //This is done since after config change it will take time for data to come and component can show loading experience till then.
        this._confValues = Object.assign({}, confValues);
        this.emitChanged();
    }

    private _onUpdateTrendChart = (trendChartHelper: TrendChartHelper) => {
        if (this._confValues && !Utility.areConfValuesEqual(this._confValues, trendChartHelper.getChartData().confValues)) {
            // Do not update store as the configuration has changed.
            return;
        }

        this._state.chartOptions = trendChartHelper.getChartOptions();
        this.emitChanged();
    }
    
    private _actions: ReportActions;
    private _state: ITrendChartState;
    private _confValues: CommonTypes.IReportConfiguration;
}