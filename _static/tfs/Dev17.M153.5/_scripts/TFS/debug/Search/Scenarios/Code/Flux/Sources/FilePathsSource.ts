import * as _OMCommon from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as _GitHttpClient from "TFS/VersionControl/GitRestClient";
import * as _RepositorySource from "Search/Scenarios/Code/Flux/Sources/RepositorySource";
import * as _VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as _VCContracts from "TFS/VersionControl/Contracts";
import * as _VCRepositoryContext from "VersionControl/Scripts/RepositoryContext";
import { using } from "VSS/VSS";

export class FilePathsSource {
    constructor() { }

    public getFilePaths(
        project: string,
        repoName: string,
        versionString: string,
        repositoryContext: _VCRepositoryContext.RepositoryContext): IPromise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            using([
                "Presentation/Scripts/TFS/TFS.OM.Common",
                "TFS/VersionControl/GitRestClient",
                "VersionControl/Scripts/TFS.VersionControl.VersionSpecs",
                "TFS/VersionControl/Contracts"
            ], (OMCommon: typeof _OMCommon,
                GitHttpClient: typeof _GitHttpClient,
                VCSpec: typeof _VCSpecs,
                VCContracts: typeof _VCContracts) => {
                    const gitHttpClient = OMCommon
                        .ProjectCollection
                        .getDefaultConnection()
                        .getHttpClient<_GitHttpClient.GitHttpClient>(GitHttpClient.GitHttpClient);

                    const gitRepository = repositoryContext.getRepository() as _VCContracts.GitRepository,
                        versionSpec = VCSpec.GitBranchVersionSpec.parse(versionString) as _VCSpecs.GitBranchVersionSpec;

                    const gitBranchVersionDescription = {
                        versionType: VCContracts.GitVersionType.Branch,
                        versionOptions: VCContracts.GitVersionOptions.None,
                        version: versionSpec.branchName
                    } as _VCContracts.GitVersionDescriptor;

                    gitHttpClient
                        .getFilePaths(
                        gitRepository.project.id,
                        gitRepository.id,
                        undefined,
                        gitBranchVersionDescription)
                        .then((filePathCollection) => {
                            resolve(filePathCollection.paths);
                        }, reject);


                }, reject);
        });
    }
}
