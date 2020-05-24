import { ReportActions } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TestInsights/ReportActions";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { Store } from "VSS/Flux/Store";

export interface IConfigurationToolbarState {
    reportConfigurationValues: CommonTypes.IReportConfiguration;
    isFilterBarVisible: boolean;
}

export class ConfigurationToolbarStore extends Store {

    constructor(private _instanceId?: string, reportConfigurationValues?: CommonTypes.IReportConfiguration) {
        super();
        this._initialize(reportConfigurationValues);
    }

    public static getInstance(reportConfigurationValues: CommonTypes.IReportConfiguration, instanceId?: string): ConfigurationToolbarStore {
        return FluxFactory.instance().get(ConfigurationToolbarStore, instanceId, reportConfigurationValues);
    }

    public static getKey(): string {
        return "TestInsight_ConfigurationToolbarStore";
	}

    public getState(): IConfigurationToolbarState {
        return this._state;
    }

    public dispose(): void {
        this._actions.updateConfigurationValuesAction.removeListener(this._onUpdateConfiguration);
        this._actions.toggleFilter.removeListener(this._onToggleFilter);
        this._actions.expandFilterBar.removeListener(this._expandFilterBar);
    }

    private _initialize(reportConfigurationValues: CommonTypes.IReportConfiguration): void {
        this._actions = ReportActions.getInstance(this._instanceId);
        this._state = { reportConfigurationValues: reportConfigurationValues, isFilterBarVisible: false } as IConfigurationToolbarState;        
        this._actions.updateConfigurationValuesAction.addListener(this._onUpdateConfiguration);
        this._actions.toggleFilter.addListener(this._onToggleFilter);
        this._actions.expandFilterBar.addListener(this._expandFilterBar);
    }

    private _onUpdateConfiguration = (newConfValues: CommonTypes.IReportConfiguration) => {
        this._state.reportConfigurationValues = Object.assign({}, newConfValues);
        this._state.reportConfigurationValues.configuredFilters = Object.assign({}, newConfValues.configuredFilters);

        this.emitChanged();
    }

    private _onToggleFilter = () => {
        this._state.isFilterBarVisible = !this._state.isFilterBarVisible;

        this.emitChanged();
    }

    private _expandFilterBar = (isFilterBarVisible: boolean) => {
        this._state.isFilterBarVisible = isFilterBarVisible;

        this.emitChanged();
    }

    private _actions: ReportActions;
    private _state: IConfigurationToolbarState;
}