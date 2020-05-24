import * as _VCWebApi from "VersionControl/Scripts/TFS.VersionControl.WebApi";
import * as _OMCommon from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as _VCContracts from "TFS/VersionControl/Contracts";
import * as _VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as _VCGitRepositoryContext from "VersionControl/Scripts/GitRepositoryContext";
import * as _VCTfvcRepositoryContext from "VersionControl/Scripts/TfvcRepositoryContext";
import * as _VCRepositoryContext from "VersionControl/Scripts/RepositoryContext";
import * as _VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as _VCSpecUtils from "VersionControl/Scripts/VersionSpecUtils";
import * as _TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { CodeResult } from "Search/Scenarios/WebApi/Code.Contracts";

import { using } from "VSS/VSS";

export interface ItemDescriptor {
    path: string;

    version: string;
}

export class RepositorySource {
    public getItem(item: CodeResult, versionString: string, repositoryContext: _VCRepositoryContext.RepositoryContext): IPromise<_VCLegacyContracts.ItemModel> {
        return new Promise<_VCLegacyContracts.ItemModel>((resolve, reject) => {
            const { path } = item;
            repositoryContext
                .getClient()
                .beginGetItems(
                repositoryContext,
                [{
                    path: path,
                    version: versionString
                }],
                {
                    includeContentMetadata: true,
                    includeVersionDescription: false,
                    recursionLevel: 0
                },
                (itemModels: _VCLegacyContracts.ItemModel[]) => {
                    resolve(itemModels[0]);
                }, reject);
        });
    }

    public getGitRepositoryContext(project: string, repoId: string): IPromise<_VCGitRepositoryContext.GitRepositoryContext> {
        return new Promise<_VCGitRepositoryContext.GitRepositoryContext>((resolve, reject) => {
            using([
                "Presentation/Scripts/TFS/TFS.OM.Common",
                "VersionControl/Scripts/TFS.VersionControl.WebApi",
                "VersionControl/Scripts/GitRepositoryContext"
            ], (OMCommon: typeof _OMCommon,
                VCWebApi: typeof _VCWebApi,
                VCGitRepositoryContext: typeof _VCGitRepositoryContext) => {
                    const gitHttpClient: _VCWebApi.GitHttpClient = OMCommon.ProjectCollection.getDefaultConnection().getHttpClient(VCWebApi.GitHttpClient);
                    gitHttpClient
                        .beginGetRepository(project, repoId)
                        .then((repo: _VCContracts.GitRepository) => {
                            resolve(VCGitRepositoryContext.GitRepositoryContext.create(repo));
                        }, reject);
                }, reject);
        });
    }

    public getTfvcRepositoryContext(project: string): IPromise<_VCTfvcRepositoryContext.TfvcRepositoryContext> {
        return new Promise<_VCTfvcRepositoryContext.TfvcRepositoryContext>((resolve, reject) => {
            using([
                "VersionControl/Scripts/TfvcRepositoryContext"
            ], (VCTfvcRepositoryContext: typeof _VCTfvcRepositoryContext) => {
                resolve(VCTfvcRepositoryContext.TfvcRepositoryContext.create());
            }, reject);
        });
    }

    public getItems(itemDescriptors: ItemDescriptor[], repositoryContext: _VCRepositoryContext.RepositoryContext, includeContentMetadata: boolean = false): IPromise<_VCLegacyContracts.ItemModel[]> {
        return new Promise<_VCLegacyContracts.ItemModel[]>((resolve, reject) => {
            using([
                "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts"
            ], (VCLegacyContracts: typeof _VCLegacyContracts) => {
                const options = {
                    recursionLevel: VCLegacyContracts.VersionControlRecursionType.OneLevel,
                    includeContentMetadata,
                    includeVersionDescription: false,
                };

                repositoryContext
                    .getClient()
                    .beginGetItems(
                    repositoryContext,
                    itemDescriptors,
                    options,
                    (itemModels: _VCLegacyContracts.ItemModel[]) => {
                        resolve(itemModels);
                    }, reject);
            }, reject);
        });
    }

    public getRepositoryContext = (isGit: boolean, project: string, repositoryId: string): IPromise<_VCRepositoryContext.RepositoryContext> => {
        return isGit
            ? this.getGitRepositoryContext(project, repositoryId)
            : this.getTfvcRepositoryContext(project);
    }

    public getGitItemDownloadUrl(projectId: string, repoId: string, path: string, changeId: string): IPromise<string> {
        return new Promise<string>((resolve) => {
            using([
                "VersionControl/Scripts/TFS.VersionControl.VersionSpecs",
                "VersionControl/Scripts/VersionSpecUtils",
                "Presentation/Scripts/TFS/TFS.OM.Common",
                "VersionControl/Scripts/TFS.VersionControl.WebApi"
            ], (VCSpecs: typeof _VCSpecs,
                VCSpecUtils: typeof _VCSpecUtils,
                OMCommon: typeof _OMCommon,
                VCWebApi: typeof _VCWebApi) => {
                    const versionString = new VCSpecs.GitCommitVersionSpec(changeId).toVersionString();
                    const versionDescriptor = versionString ? VCSpecUtils.gitVersionStringToVersionDescriptor(versionString) : null;
                    const gitHttpClient: _VCWebApi.GitHttpClient = OMCommon.ProjectCollection.getDefaultConnection().getHttpClient(VCWebApi.GitHttpClient);
                    resolve(gitHttpClient.getFileContentUrl(projectId, repoId, path, true, versionDescriptor));
                });
        });
    }

    public getTfvcItemDownloadUrl(projectId: string, path: string, changeId: string): IPromise<string> {
        return new Promise<string>((resolve) => {
            using([
                "VersionControl/Scripts/TFS.VersionControl.VersionSpecs",
                "VersionControl/Scripts/VersionSpecUtils",
                "Presentation/Scripts/TFS/TFS.OM.Common",
                "VersionControl/Scripts/TFS.VersionControl.WebApi"
            ], (VCSpecs: typeof _VCSpecs,
                VCSpecUtils: typeof _VCSpecUtils,
                OMCommon: typeof _OMCommon,
                VCWebApi: typeof _VCWebApi) => {
                    const versionSpec = new VCSpecs.ChangesetVersionSpec(changeId);
                    const versionDescriptor = versionSpec ? VCSpecUtils.tfvcVersionSpecToVersionDescriptor(versionSpec) : null;
                    const tfvcHttpClient: _VCWebApi.TfvcHttpClient = OMCommon.ProjectCollection.getDefaultConnection().getHttpClient(VCWebApi.TfvcHttpClient);
                    resolve(tfvcHttpClient.getFileContentUrl(projectId, path, true, versionDescriptor));
                });
        });
    }

    public getCustomItemDownloadUrl(projectName: string,
        repoName: string,
        path: string,
        fileName: string,
        contentId: string): IPromise<string> {
        return new Promise<string>((resolve) => {
            using([
                "Presentation/Scripts/TFS/TFS.Host.TfsContext"
            ], (TfsContext: typeof _TfsContext) => {
                const tfsContext = TfsContext.TfsContext.getDefault();
                const routeData = {
                    area: "api",
                    scope: tfsContext.contextData.account.name,
                    projectName: projectName,
                    repositoryName: repoName,
                    branchName: contentId,
                    filePath: path,
                    fileName: fileName,
                    contentId: contentId,
                    contentsOnly: false
                }
                resolve(tfsContext.getActionUrl("getFileDownload", "search", routeData));
            });
        });
    }
}
