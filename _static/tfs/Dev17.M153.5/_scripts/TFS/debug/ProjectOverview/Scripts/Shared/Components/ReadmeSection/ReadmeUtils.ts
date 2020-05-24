import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";

export function isGit(repositoryContext: RepositoryContext): boolean {
    return (repositoryContext.getRepositoryType() !== RepositoryType.Tfvc);
}