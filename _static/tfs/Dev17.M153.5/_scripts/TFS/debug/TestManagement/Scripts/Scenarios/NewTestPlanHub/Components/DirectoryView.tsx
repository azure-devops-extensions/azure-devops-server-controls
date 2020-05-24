/// <reference types="react" />
import { autobind } from "OfficeFabric/Utilities";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import {
    TestPlanDirectoryActionsCreator,
} from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Actions/TestPlanDirectoryActionsCreator";
import { AllTestPlanComponent } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/AllTestPlanComponent";
import { HubErrorBar } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/HubErrorBar";
import { MyTestPlanComponent } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/MyTestPlanComponent";
import {
    ITestPlanDirectoryFilterBar,
    TestPlanDirectoryFilterBar,
} from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/TestPlanDirectoryFilterBar";
import {
    DirectoryPivotType,
    Filters,
    IDirectoryPivot,
    TestPlanRouteParameters,
} from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";
import { TestPlanDirectoryUrls } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/HubUrlUtilities";
import { HubErrorBarStore } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Stores/HubErrorBarStore";
import { TestPlanDirectoryStore } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Stores/TestPlanDirectoryStore";
import { TestPlanDirectoryViewState } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/TestPlanHubViewState";
import { PerformanceUtils } from "TestManagement/Scripts/TFS.TestManagement.Performance";
import { TcmPerfScenarios } from "TestManagement/Scripts/TFS.TestManagement.Utils";
import { LicenseAndFeatureFlagUtils } from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import { IObservableViewStateUrl } from "VSSPreview/Utilities/ViewStateNavigation";
import { Hub } from "VSSUI/Components/Hub/Hub";
import { HubHeader } from "VSSUI/Components/HubHeader/HubHeader";
import { IPivotBarAction, PivotBarItem } from "VSSUI/PivotBar";
import { VssIconType } from "VSSUI/VssIcon";


export interface ITestPlanDirectoryViewProps {
    selectedPivot: DirectoryPivotType;
    pivots: IDirectoryPivot[];
}

export class DirectoryView extends React.Component<ITestPlanDirectoryViewProps, {}>{
    constructor(props: ITestPlanDirectoryViewProps) {
        super(props);
        this._hubViewState = new TestPlanDirectoryViewState(props.selectedPivot);
    }

    private _errorBarStore: HubErrorBarStore = HubErrorBarStore.getInstance();
    private _actionsCreator: TestPlanDirectoryActionsCreator = TestPlanDirectoryActionsCreator.getInstance();
    private _store: TestPlanDirectoryStore = TestPlanDirectoryStore.getInstance();
    private _hubViewState: TestPlanDirectoryViewState;
    private _allPivotUrl: IObservableViewStateUrl;
    private _minePivotUrl: IObservableViewStateUrl;
    private _filterBar: ITestPlanDirectoryFilterBar;

    public componentWillMount(): void {
        switch (this.props.selectedPivot) {
            case DirectoryPivotType.all:
                PerformanceUtils.addSplitTiming(TcmPerfScenarios.LoadTestPlansAll, "directory-view-initialization-started");
                break;
            case DirectoryPivotType.mine:
                PerformanceUtils.addSplitTiming(TcmPerfScenarios.LoadTestPlansMine, "directory-view-initialization-started");
                break;
        }

        this._store.initializeCurrentPivot(this.props.selectedPivot);
        this._store.initializeFilterManager(this._actionsCreator, this._hubViewState);

        this._allPivotUrl = this._hubViewState.createObservableUrl({
            [TestPlanRouteParameters.Pivot]: DirectoryPivotType.all
        });
        this._minePivotUrl = this._hubViewState.createObservableUrl({
            [TestPlanRouteParameters.Pivot]: DirectoryPivotType.mine
        });

        this._hubViewState.selectedPivot.subscribe(this._onPivotChanged);

        //  Initialize pivot's data so the store contains the initial filter state, which is needed
        //  to render the filter's icon in the hub header.
        switch (this.props.selectedPivot) {
            case DirectoryPivotType.all:
                this._actionsCreator.initializeAllTestPlan();
                break;
            case DirectoryPivotType.mine:
                this._actionsCreator.initializeMineTestPlan();
                break;
            default:
                
        }

    }

    public componentDidMount(): void {
        switch (this.props.selectedPivot) {
            case DirectoryPivotType.all:
                PerformanceUtils.addSplitTiming(TcmPerfScenarios.LoadTestPlansAll, "directory-view-initialization-ended");
                break;
            case DirectoryPivotType.mine:
                PerformanceUtils.addSplitTiming(TcmPerfScenarios.LoadTestPlansMine, "directory-view-initialization-ended");
                break;
        }
    }

    public componentWillUnmount(): void {
        this._hubViewState.selectedPivot.unsubscribe(this._onPivotChanged);
        this._hubViewState.dispose();
        this._hubViewState = null;
    }

    public render() {

        const filterBar = (
            <TestPlanDirectoryFilterBar
                store={this._store}
                fields={Filters.Items}
                className={"testplan-directory-filterbar"}
                componentRef={this._setFilterBar}
            />);

        //  All and Mine Pivot Tabs.
        const pivotItems = [];
        this.props.pivots.forEach((pivotProp) => {

            //  Construct 'mine' and 'all' pivot components.
            const pivotType: string = pivotProp.type;
            pivotItems.push(
                <PivotBarItem
                    className={"test-plans-pivot"}
                    key={`pivotBarItem.${pivotProp.name}`}
                    name={pivotProp.name}
                    url={pivotProp.type === DirectoryPivotType.all ? this._allPivotUrl : this._minePivotUrl}
                    itemKey={pivotType} >
                    {
                        (pivotProp.type === DirectoryPivotType.all) ?
                            <AllTestPlanComponent
                                store={this._store}
                                actionsCreator={this._actionsCreator} /> :
                            <MyTestPlanComponent
                                store={this._store}
                                actionsCreator={this._actionsCreator} />
                    }
                </PivotBarItem>
            );
        });

        const errorBar = <HubErrorBar store={this._errorBarStore} />;

        //  Render hub component.
        return <div className="testplan-directory-content">
            {errorBar}
            <Hub
                hubViewState={this._hubViewState}
                commands={this.getHubCommands()}
                onRenderFilterBar={() => filterBar}
            >
                <HubHeader
                    title={Resources.TestPlansText}
                />
                {pivotItems}
            </Hub>
        </div>;
    }

    private getHubCommands(): IPivotBarAction[] {
        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            return [{
                key: "new-test-plan",
                name: Resources.NewTestPlanText,
                important: true,
                iconProps: { iconName: "CalculatorAddition", iconType: VssIconType.fabric },
                onClick: this._onNewTestPlanClicked
            }];
       }

        return [];
    }

    @autobind
    private _onPivotChanged(newPivotKey: string) {
        this._actionsCreator.pivotSwitched(newPivotKey);
    }

    @autobind
    private _setFilterBar(item: ITestPlanDirectoryFilterBar) {
        this._filterBar = item;
    }

    @autobind
    private _onNewTestPlanClicked(event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>): void {
        TestPlanDirectoryUrls.navigateToNewTestPlanHubUrl(TestPlanDirectoryUrls.getNewTestPlanDirectoryUrl(DirectoryPivotType.new));
    }
}