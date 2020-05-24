import { Action } from "VSS/Flux/Action";

export interface ITreePathExpandPayload {
    folders: IDictionaryStringTo<string[]>,
    parentPathToExpand: string
}

export interface ITreeOperationsPayload {
    path: string
}

export class ActionsHub {
    public treePathExpanded = new Action<ITreePathExpandPayload>();
    public treePathExpanding = new Action<ITreeOperationsPayload>();
    public treePathCollapsed = new Action<ITreeOperationsPayload>();
}