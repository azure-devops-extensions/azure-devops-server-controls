import * as HubConstants from "Agile/Scripts/Generated/HubConstants";
import { getNavigationHistoryService } from "VSS/Navigation/NavigationHistoryService";
import { HistoryBehavior } from "VSSPreview/Utilities/ViewStateNavigation";
import { IVssHubViewStateOptions, VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";

export class BoardsHubViewState extends VssHubViewState {
    constructor(options?: IVssHubViewStateOptions) {
        super(options, false);
    }

    public getCurrentUrl(): string {
        const navHistoryService = getNavigationHistoryService();
        return navHistoryService.generateUrl(this.viewOptions.getViewOptions());
    }
}

export class TeamBoardContentViewState extends BoardsHubViewState {
    constructor() {
        super({
            preventDirtyPivotNavigation: true,
            viewOptionNavigationParameters: [
                { key: HubConstants.AgileRouteParameters.Team, rawString: true, behavior: HistoryBehavior.newEntry },
                { key: HubConstants.AgileRouteParameters.TeamName, rawString: true, behavior: HistoryBehavior.newEntry },
                { key: HubConstants.AgileRouteParameters.BacklogLevel, rawString: true, behavior: HistoryBehavior.newEntry }],
            viewOptions: {
            },
            pivotNavigationParamDeserializer: (value: string) => value.toLowerCase(),
            defaultPivot: HubConstants.BoardsHubRoutingConstants.BoardPivot,
            pivotNavigationParamName: HubConstants.AgileRouteParameters.Pivot
        });

        this.setupNavigation();
    }
}