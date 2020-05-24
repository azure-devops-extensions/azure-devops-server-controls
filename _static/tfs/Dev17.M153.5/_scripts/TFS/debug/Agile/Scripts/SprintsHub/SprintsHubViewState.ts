import { AgileRouteParameters } from "Agile/Scripts/Generated/HubConstants";
import { getNavigationHistoryService } from "VSS/Navigation/NavigationHistoryService";
import { HistoryBehavior } from "VSSPreview/Utilities/ViewStateNavigation";
import { IVssHubViewStateOptions, VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { HubViewStateEventNames } from "VSSUI/Utilities/HubViewState";

export class SprintsHubViewState extends VssHubViewState {
    constructor(defaultPivot: string, options?: IVssHubViewStateOptions) {
        super({
            ...options,
            pivotNavigationParamDeserializer: (value: string) => value.toLowerCase(),
            defaultPivot,
            pivotNavigationParamName: AgileRouteParameters.Pivot
        });

        this.subscribe(this._onPivotChanging, HubViewStateEventNames.pivotChanging);
    }

    public dispose() {
        this.unsubscribe(this._onPivotChanging, HubViewStateEventNames.pivotChanging);

        super.dispose();
    }

    public getCurrentUrl(): string {
        const navHistoryService = getNavigationHistoryService();
        return navHistoryService.generateUrl(this.viewOptions.getViewOptions());
    }

    private _onPivotChanging = (newPivotKey: string): void => {
        // Update the view option so that the url is updated accordingly
        this.viewOptions.setViewOption(AgileRouteParameters.Pivot, newPivotKey);
    }
}

export class SprintsDirectoryViewState extends SprintsHubViewState {
    constructor(defaultPivot: string) {
        super(
            defaultPivot
        );
    }
}

export class SprintsContentViewState extends SprintsHubViewState {
    constructor(defaultPivot: string) {
        super(
            defaultPivot,
            {
                preventDirtyPivotNavigation: true,
                viewOptionNavigationParameters: [
                    { key: AgileRouteParameters.Iteration, rawString: true, behavior: HistoryBehavior.newEntry },
                    { key: AgileRouteParameters.Team, rawString: true, behavior: HistoryBehavior.newEntry },
                    { key: AgileRouteParameters.TeamName, rawString: true, behavior: HistoryBehavior.newEntry }
                ]
            });

        this.setupNavigation();
    }
}