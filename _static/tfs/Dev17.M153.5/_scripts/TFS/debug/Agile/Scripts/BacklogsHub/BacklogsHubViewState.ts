import { AgileRouteParameters, BacklogsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { getNavigationHistoryService } from "VSS/Navigation/NavigationHistoryService";
import { HistoryBehavior } from "VSSPreview/Utilities/ViewStateNavigation";
import { VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";

export class BacklogsHubViewState extends VssHubViewState {
    constructor(defaultPivot: string) {
        super({
            preventDirtyPivotNavigation: true,
            viewOptionNavigationParameters: [
                { key: AgileRouteParameters.Team, rawString: true, behavior: HistoryBehavior.newEntry },
                { key: AgileRouteParameters.TeamName, rawString: true, behavior: HistoryBehavior.newEntry },
                { key: AgileRouteParameters.BacklogLevel, rawString: true, behavior: HistoryBehavior.newEntry },
                { key: BacklogsHubConstants.ShowParentsQueryParameter, rawString: false, behavior: HistoryBehavior.replace },
                { key: BacklogsHubConstants.RightPaneQueryParameter, rawString: true, behavior: HistoryBehavior.replace }
            ],
            pivotNavigationParamDeserializer: (value: string) => value.toLowerCase(),
            defaultPivot,
            pivotNavigationParamName: AgileRouteParameters.Pivot
        });

        this.setupNavigation();
    }

    public getCurrentUrl(): string {
        const navHistoryService = getNavigationHistoryService();
        return navHistoryService.generateUrl(this.viewOptions.getViewOptions());
    }
}