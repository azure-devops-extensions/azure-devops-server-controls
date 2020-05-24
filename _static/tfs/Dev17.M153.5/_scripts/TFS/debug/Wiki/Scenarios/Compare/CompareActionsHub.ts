import { Action } from "VSS/Flux/Action";
import { ItemModel, VersionControlChangeType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { IAvatarImageProperties } from "VersionControl/Scenarios/Shared/AvatarImageInterfaces";

export interface ComparePagePayload {
    author: IAvatarImageProperties;
    authoredDate: Date;
    gitItemPath: string;
    pagePath: string;
    comment: string;
    version: string;
    itemChangeType: VersionControlChangeType;
}

export class CompareActionsHub {
    public comparePageDataLoaded = new Action<ComparePagePayload>();
    public compareDiffDataLoaded = new Action<void>();
    public dataLoadFailed = new Action<Error>();
    public itemDetailsLoaded = new Action<ItemModel>();
    public fileContentLoaded = new Action<string>();
}
