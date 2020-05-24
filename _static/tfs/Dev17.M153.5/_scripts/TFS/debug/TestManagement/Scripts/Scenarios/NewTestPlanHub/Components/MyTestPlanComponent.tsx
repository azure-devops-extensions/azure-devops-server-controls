import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as Tooltip from "VSSUI/Tooltip";
import * as Utils_String from "VSS/Utils/String";
import { autobind } from "OfficeFabric/Utilities";
import {
    DirectoryPivotType,
    IDirectoryRow,
    IGroupRow,
    IMineTestPlanComponentState,
    ITestPlanListBaseComponentProps,
    ITestPlanRow,
    TestPlanPivotColumnKeys
} from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import { getService } from "VSS/Service";
import { IColumn } from "OfficeFabric/DetailsList";
import { Link } from "OfficeFabric/Link";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import { TestPlanComponentBase } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/TestPlanComponentBase";
import { TestPlanDirectoryStore } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Stores/TestPlanDirectoryStore";
import { TestPlansHubSettingsService } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/SettingsService";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";
import { PerformanceUtils } from "TestManagement/Scripts/TFS.TestManagement.Performance";
import { TcmPerfScenarios } from "TestManagement/Scripts/TFS.TestManagement.Utils";

import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/TestPlanDirectoryView";

export class MyTestPlanComponent extends TestPlanComponentBase<IMineTestPlanComponentState> {
    constructor(props: ITestPlanListBaseComponentProps) {
        super(props);

        this.state = props.store.getMineTestPlanState();
    }
    public componentWillMount(): void {
        PerformanceUtils.addSplitTiming(TcmPerfScenarios.LoadTestPlansMine, "my-test-plans-initialization-started");

        // Attach store changed listener and initialize the actions creator to fetch data
        this.props.store.addChangedListener(this._onStoreChanged);
    }

    public componentWillUnmount(): void {
        // Remove listener
        this.props.store.removeChangedListener(this._onStoreChanged);
    }

    public componentDidMount(): void {
        getService(TestPlansHubSettingsService).setMostRecentPivot(DirectoryPivotType.mine);

        TelemetryService.publishEvent(TelemetryService.featureNewTestPlanHub, TelemetryService.navigateToMyPlansPage, Utils_String.empty);

        PerformanceUtils.addSplitTiming(TcmPerfScenarios.LoadTestPlansMine, "my-test-plans-initialization-ended");
    }


    public componentDidUpdate(): void {
        if (!this.state.isLoading) {
            PerformanceUtils.endScenario(TcmPerfScenarios.LoadTestPlansMine);
        }
    }

    // Override
    @autobind
    protected _getContainerClassName(): string {
        return "mine-testplan-content";
    }

    // Override
    @autobind
    protected _getDetailsListClassName(): string {
        return "mine-testplan";
    }

    // Override
    @autobind
    protected _getAriaLabelForDetailsList(): string {
        return Resources.MyTestPlanText;
    }

    /**
     * Update state when store is updated
     */
    @autobind
    private _onStoreChanged() {
        this.setState(this.props.store.getMineTestPlanState());
    }

    // Override
    @autobind
    protected _onRenderDirectoryItemColumn(item?: IDirectoryRow, index?: number, column?: IColumn): JSX.Element {
        if (!item || !column) {
            return null;
        }

        // Item can either be a group row or a testplan row.  To take advantage of VSSDetailsList built in keyboard navigation,
        // we are rendering all rows, group or testplan, as items. We then determine which information to render here.
        if (item.isGroupRow) {
            if (Utils_String.equals(column.fieldName, TestPlanPivotColumnKeys.Title, true)) {
                let groupRow = item.directoryRow as IGroupRow;
                return (
                    <Link className="mine-testplan-directory-group-list-header" onClick={() => { this._onGroupHeaderClick(groupRow); }} >
                        <VssIcon className={groupRow.isCollapsed ? "" : "expanded"} iconName="chevron-right" iconType={VssIconType.bowtie} />
                        {
                            groupRow.showTeamIcon ?
                                <VssIcon iconName="users" iconType={VssIconType.bowtie} /> :
                                null

                        }
                        <span>{groupRow.title}</span>
                    </Link>
                );
            }
        } else {

            if (Utils_String.equals(item.directoryRow.teamId, TestPlanDirectoryStore.MY_FAVORITES_EMPTY_CONTENT_ID, true) &&
                Utils_String.equals(column.fieldName, TestPlanPivotColumnKeys.Title, true)) {

                // Render favorites empty content
                return <div className={TestPlanComponentBase.CSS_TESTPLAN_DIRECTORY_ROWITEM}>
                    <div className={TestPlanComponentBase.CSS_TESTPLAN_DIRECTORY_GROUP_SPACER} />
                    <FormatComponent format={Resources.TestPlanDirectoryEmptyFavoritesGroupText}>
                        <VssIcon iconName="favorite" iconType={VssIconType.bowtie} />
                    </FormatComponent>
                </div>;
            }
            else {
                // Return TestPlanComponentBase row
                return super._onRenderItemColumn(item.directoryRow as ITestPlanRow, index, column, true);
            }
        }

    }

    /**
     * Handle group header click
     * @param groupHeaderProps
     */
    @autobind
    private _onGroupHeaderClick(group: IGroupRow): void {
        if (group.isCollapsed) {
            this.props.actionsCreator.expandGroupRow(group.teamId);
        }
        else {
            this.props.actionsCreator.collapseGroupRow(group.teamId);
        }
    }

}