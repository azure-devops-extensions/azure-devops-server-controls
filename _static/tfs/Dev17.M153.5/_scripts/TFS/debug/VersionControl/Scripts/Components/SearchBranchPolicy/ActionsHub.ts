import { Action } from "VSS/Flux/Action";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

export interface ISearchableBranchesObtainedPayLoad {
    branchesConfigured: string[];
    repositoryContext: GitRepositoryContext;
}

export interface IRepositoryContextChanged {
    repositoryContext: GitRepositoryContext;
}

export interface IBranchDialogPayLoad {
    isOpen: boolean;
    errorState: ErrorStateEnum;
}

export interface IExcludeBranchDialogPayLoad extends IBranchDialogPayLoad {
    branchToExclude: string;
}

export enum ErrorStateEnum {
    None = 0,
    PermissionError = 1,
    UnknownError = 2,
    BranchAlreadyConfigured = 3,
    BranchIndexDelay = 4
}

export class ActionsHub {
    private static instance: ActionsHub;
    public searchableBranchesObtained = new Action<ISearchableBranchesObtainedPayLoad>();
    public repositoryContextChanged = new Action<IRepositoryContextChanged>();
    public includeBranchDialogStateChanged = new Action<IBranchDialogPayLoad>();
    public excludeBranchDialogStateChanged = new Action<IExcludeBranchDialogPayLoad>();

    public static getInstance(): ActionsHub {
        if (!ActionsHub.instance) {
            ActionsHub.instance = new ActionsHub();
        }

        return ActionsHub.instance;
    }
}
