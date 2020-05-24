import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { GitRepository, GitTemplate, VersionControlProjectInfo } from "TFS/VersionControl/Contracts";
import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export interface CreateRepositoryResult {
    repoType: RepositoryType;
    gitRepository?: GitRepository;
}

export interface ICreateRepositoryDialogState
{
    // User input.
    repoType: RepositoryType;
    repoName: string;
    addReadme: boolean;
    gitignore: string;

    // UX state.
    nameError: string;
    busy: boolean;
}

export interface ICreateRepositoryDialogProps
{
    projectInfo: VersionControlProjectInfo;
    tfsContext: TfsContext;
    elementToFocusOnDismiss: HTMLElement;
    onCreated(result: CreateRepositoryResult): void;
    onCancelled?(): void;
}

export namespace TemplateKeys {
    export const NoTemplate = VCResources.AddGitIgnoreSelector_NoneValue;
}
