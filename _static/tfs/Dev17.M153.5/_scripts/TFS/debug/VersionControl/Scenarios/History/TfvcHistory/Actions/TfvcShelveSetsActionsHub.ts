import { Action } from "VSS/Flux/Action";
import { TfvcChangeListItems } from "VersionControl/Scenarios/History/TfvcHistory/TfvcInterfaces"
import { ShelveSetsUrlState } from "VersionControl/Scenarios/History/TfvcHistory/Stores/ShelveSetUrlStore"

export class TfvcShelveSetsActionsHub {
    public shelvesetsLoadErrorRaised = new Action<Error>();
    public shelvesetsClearAllErrorsRaised = new Action<void>();
    public shelvesetsLoaded = new Action<TfvcChangeListItems>();
    public shelvesetsLoadStarted = new Action<void>();
    public urlChanged = new Action<ShelveSetsUrlState>();
}
