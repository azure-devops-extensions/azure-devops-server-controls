import { VssHubViewState, IVssHubViewStateOptions } from "VSSPreview/Utilities/VssHubViewState";
import { AgileRouteParameters } from "Agile/Scripts/Generated/HubConstants";

export class DirectoryViewState extends VssHubViewState {
    constructor(defaultPivot: string) {
        const options: IVssHubViewStateOptions = {
            defaultPivot: defaultPivot,
            pivotNavigationParamName: AgileRouteParameters.Pivot
        };
        super(options);

        this.setupNavigation();
    }
}