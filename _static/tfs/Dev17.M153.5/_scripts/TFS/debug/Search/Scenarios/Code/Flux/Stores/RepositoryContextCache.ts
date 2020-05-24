import * as _VCRepositoryContext from "VersionControl/Scripts/RepositoryContext";
/**
 * Cache to store all known repository context.
 */
export class RepositoryContextCache {
    public readonly repositories: IDictionaryStringTo<IDictionaryStringTo<_VCRepositoryContext.RepositoryContext>> = {};

    public loadRepositoryContext = (project: string, repoName: string, repositoryContext: _VCRepositoryContext.RepositoryContext): void => {
        //ToDo: Donot update when repo is already present.
        if (project && repoName && repositoryContext) {
            const projectRepositories = this.repositories[project.toLowerCase()];
            if (projectRepositories) {
                projectRepositories[repoName.toLowerCase()] = repositoryContext;
            }
            else {
                this.repositories[project.toLowerCase()] = {
                    [repoName.toLowerCase()]: repositoryContext
                };
            }
        }
    }
}