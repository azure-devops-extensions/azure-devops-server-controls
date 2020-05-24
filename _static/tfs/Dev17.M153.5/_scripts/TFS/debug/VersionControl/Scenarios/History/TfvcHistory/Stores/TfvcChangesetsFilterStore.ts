import { Store } from "VSS/Flux/Store";

import { ChangesetsFilterSearchCriteria } from "VersionControl/Scenarios/History/TfvcHistory/Components/ChangesetsFilter";
import { CriteriaChangedPayload } from "VersionControl/Scenarios/History/TfvcHistory/TfvcInterfaces"

export { ChangesetsFilterSearchCriteria as TfvcChangesetsFilterStoreState};
export class TfvcChangesetsFilterStore extends Store {
    public state = {} as ChangesetsFilterSearchCriteria;

    public updateFilters = (params: CriteriaChangedPayload): void => {
        this.state = ({
            userName: params.userName,
            userId: params.userId,
            fromDate: params.fromDate,
            toDate: params.toDate,
            fromVersion: params.fromVersion,
            toVersion: params.toVersion,
        } as ChangesetsFilterSearchCriteria);
        this.emitChanged();
    }
}