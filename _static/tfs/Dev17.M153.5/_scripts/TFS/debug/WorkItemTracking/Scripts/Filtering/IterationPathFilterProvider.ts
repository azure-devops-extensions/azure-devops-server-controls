import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { TeamAwarenessService } from "Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService";
import { IFilterProvider, IFilter } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { FieldFilterProvider } from "WorkItemTracking/Scripts/Filtering/FieldFilterProvider";
import { equals } from "VSS/Utils/String";
import { WiqlOperators } from "WorkItemTracking/Scripts/OM/WiqlOperators";

export class IterationPathFilterProvider extends FieldFilterProvider implements IFilterProvider {
    private _teamId: string;

    constructor(teamId: string) {
        super(CoreFieldRefNames.IterationPath);

        this._teamId = teamId;
    }

    public setFilter(filter: IFilter) {
        super.setFilter(filter);

        // Resolve macro filter values
        const filterValues = Object.keys(this._filterValueMap);
        for (const filterValue of filterValues) {
            if (equals(filterValue, WiqlOperators.MacroCurrentIteration, true)) {
                const teamAwareness = ProjectCollection.getConnection(TfsContext.getDefault()).getService<TeamAwarenessService>(TeamAwarenessService);
                const teamSettings = teamAwareness.getTeamSettings(this._teamId);
                const currentIteration = teamSettings.currentIteration && teamSettings.currentIteration.friendlyPath;

                delete this._filterValueMap[filterValue];
                this._filterValueMap[currentIteration] = true;
            }
        }
    }
}
