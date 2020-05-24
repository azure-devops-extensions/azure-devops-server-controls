import { Action } from "VSS/Flux/Action";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export interface TagCreationStatus {
    complete: boolean;
    inProgress: boolean;
    error: string;
}

export interface TagNameValidationStatus {
    name: string,
    error: string;
}

export class ActionsHub {
    public selectedVersionChanged = new Action<VersionSpec>();
    public messageChanged = new Action<string>();
    public tagNameValidationStatusChanged = new Action<TagNameValidationStatus>();
    public tagCreationStatusChanged = new Action<TagCreationStatus>();
}
