import { IVssHubViewStateOptions, VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { getNavigationHistoryService } from "VSS/Navigation/NavigationHistoryService";
import { TestPlanRouteParameters } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";

export class TestPlanHubViewState extends VssHubViewState {
    constructor(options?: IVssHubViewStateOptions) {
        super(options, false);
    }

    public getCurrentUrl(): string {
        const navHistoryService = getNavigationHistoryService();
        return navHistoryService.generateUrl(this.viewOptions.getViewOptions());
    }
}

export class TestPlanDirectoryViewState extends TestPlanHubViewState {
    constructor(defaultPivot: string) {
        const options: IVssHubViewStateOptions = {
            defaultPivot: defaultPivot,
            pivotNavigationParamName: TestPlanRouteParameters.Pivot
        };
        super(options);

        this.setupNavigation();
    }
}