import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/NewTestPlanView";

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as Utils_String from "VSS/Utils/String";
import { autobind } from "OfficeFabric/Utilities";
import { getDefaultPageTitle } from "VSS/Navigation/Services";
import { getService } from "VSS/Service";
import { Hub } from "VSSUI/Hub";
import { HubHeader } from "VSSUI/HubHeader";
import { NewTestPlanPageActionsCreator } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Actions/NewTestPlanPageActionsCreator";
import { NewTestPlanPageComponent } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/NewTestPlanPageComponent";
import { NewTestPlanPageStore } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Stores/NewTestPlanPageStore";
import { PivotBarItem } from "VSSUI/PivotBar";
import { TestPlanDirectoryUrls } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/HubUrlUtilities";
import { TestPlansHubSettingsService } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/SettingsService";
import { UrlHelper } from "TestManagement/Scripts/TFS.TestManagement.Utils";
import { VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import {
    DirectoryPivotType,
    TestPlanRouteParameters
} from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";

export interface INewTestPlanViewProps {
    /** The actions creator to use with this component */
    actionsCreator: NewTestPlanPageActionsCreator;
    /** The store that drives this component */
    store: NewTestPlanPageStore;
}

export class NewTestPlanView extends React.Component<INewTestPlanViewProps> {
    private _hubViewState: VssHubViewState;

    constructor(props: INewTestPlanViewProps) {
        super(props);

        this._hubViewState = new VssHubViewState({
            defaultPivot: DirectoryPivotType.new,
            pivotNavigationParamName: TestPlanRouteParameters.Pivot
        });
    }

    public render(): JSX.Element {

        return (
            <Hub hubViewState={this._hubViewState} hideFullScreenToggle={true}>
                <HubHeader />
                <PivotBarItem itemKey={DirectoryPivotType.new} name={Resources.NewTestPlanText} className="new-test-plan-pivot">
                    <NewTestPlanPageComponent
                        {...this.props}
                        onCancel={this._onCancel}
                        onCompleted={this._onCompleted}
                    />
                </PivotBarItem>
            </Hub>
        );
    }

    public componentDidMount(): void {
        document.title = getDefaultPageTitle(Resources.NewTestPlanText);
    }

    @autobind
    private _onCancel(): void {
        const url = TestPlanDirectoryUrls.getNewTestPlanDirectoryUrl(getService(TestPlansHubSettingsService).userOptions.selectedPivot as DirectoryPivotType);
        TestPlanDirectoryUrls.navigateToNewTestPlanHubUrl(url);
    }

    @autobind
    private _onCompleted(name: string, projectId: string, areaPath: string, iteration: string): IPromise<void> {

        return this.props.actionsCreator.createTestPlan(name,
            projectId,
            areaPath,
            iteration).then((id: number) => {
                const url = UrlHelper.getPlanUrl(id);
                TestPlanDirectoryUrls.navigateToLiteTestPlanHubUrl(url);
            });
    }
}
