import { ChangeSetsListItem } from "VersionControl/Scenarios/History/TfvcHistory/TfvcInterfaces";
import { GitPushRefExtended } from "VersionControl/Scenarios/Pushes/ActionsHub";
import { HistoryEntry } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";

export interface Item {
    date: Date

    item: GitPushRefExtended | ChangeSetsListItem | HistoryEntry;
}
