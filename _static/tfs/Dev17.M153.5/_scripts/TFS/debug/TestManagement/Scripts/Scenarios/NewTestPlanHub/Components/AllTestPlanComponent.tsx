import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as Utils_String from "VSS/Utils/String";
import { autobind } from "OfficeFabric/Utilities";
import {
    DirectoryPivotType,
    IAllTestPlanComponentState,
    IDirectoryRow,
    ITestPlanListBaseComponentProps,
    ITestPlanRow
} from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";
import { getService } from "VSS/Service";
import { IColumn } from "OfficeFabric/DetailsList";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import { TestPlanComponentBase } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/TestPlanComponentBase";
import { TestPlansHubSettingsService } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/SettingsService";
import { PerformanceUtils } from "TestManagement/Scripts/TFS.TestManagement.Performance";
import { TcmPerfScenarios } from "TestManagement/Scripts/TFS.TestManagement.Utils";

import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/TestPlanDirectoryView";

export class AllTestPlanComponent extends TestPlanComponentBase<IAllTestPlanComponentState> {
    constructor(props: ITestPlanListBaseComponentProps) {
        super(props);

        this.state = props.store.getAllTestPlanState();
    }
    public componentWillMount(): void {
        PerformanceUtils.addSplitTiming(TcmPerfScenarios.LoadTestPlansAll, "all-test-plans-initialization-started");

        // Attach store changed listener and initialize the actions creator to fetch data
        this.props.store.addChangedListener(this._onStoreChanged);
    }

    public componentWillUnmount(): void {
        // Remove listener
        this.props.store.removeChangedListener(this._onStoreChanged);
    }

    public componentDidUpdate(): void {
        if (!this.state.isLoading) {
            PerformanceUtils.endScenario(TcmPerfScenarios.LoadTestPlansAll);
        }
    }

    public componentDidMount(): void {
        PerformanceUtils.addSplitTiming(TcmPerfScenarios.LoadTestPlansAll, "all-test-plans-initialization-ended");

        getService(TestPlansHubSettingsService).setMostRecentPivot(DirectoryPivotType.all);

        TelemetryService.publishEvent(TelemetryService.featureNewTestPlanHub, TelemetryService.navigateToAllPlansPage, Utils_String.empty);
    }

    // Override
    @autobind
    protected _getContainerClassName(): string {
        return "all-testplan-content";
    }

    // Override
    @autobind
    protected _getDetailsListClassName(): string {
        return "all-testplan";
    }

    // Override
    @autobind
    protected _getAriaLabelForDetailsList(): string {
        return Resources.AllTestPlanText;
    }

    // Override
    @autobind
    protected _onRenderDirectoryItemColumn(item?: IDirectoryRow, index?: number, column?: IColumn): JSX.Element {
        if (!item || !column) {
            return null;
        }
        // Return TestPlanComponentBase row
        return super._onRenderItemColumn(item.directoryRow as ITestPlanRow, index, column, true);
    }

    /**
     * Update state when store is updated
     */
    @autobind
    private _onStoreChanged() {
        this.setState(this.props.store.getAllTestPlanState());
    }

}