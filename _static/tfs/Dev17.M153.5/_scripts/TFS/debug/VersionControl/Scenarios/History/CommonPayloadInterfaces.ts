import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

export interface RepositoryChangedPayload {
    isGit: boolean;
    repositoryName: string;
    repositoryContext?: RepositoryContext;
}

export interface SelectedPathChangedPayload {
    path: string;
    version?: VersionSpec;
    trigger?: string;
}
