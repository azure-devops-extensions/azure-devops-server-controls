import { IItem } from "Search/Scenarios/Shared/VCPath/PathStore";
import * as _VCGitRestClient from "TFS/VersionControl/GitRestClient";
import * as _OMCommon from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as _VCContracts from "TFS/VersionControl/Contracts";
import { using } from "VSS/VSS";
import { ignoreCaseComparer } from "VSS/Utils/String";

export interface PathSourceParams {
    project: string;

    repositoryName: string;

    repositoryId?: string;

    branch?: string;
}

export class LazyPathSource {
    public getPaths(params: PathSourceParams, isGit: boolean): IPromise<IItem[]> {
        // ToDo: implement this section
        return new Promise<IItem[]>((resolve, reject) => {
            isGit
                ? using(
                    [
                        "Presentation/Scripts/TFS/TFS.OM.Common",
                        "TFS/VersionControl/GitRestClient",
                        "TFS/VersionControl/Contracts"
                    ], (OMCommon: typeof _OMCommon,
                        VCGitRestClient: typeof _VCGitRestClient,
                        VCContracts: typeof _VCContracts) => {
                        const gitHttpClient: _VCGitRestClient.GitHttpClient =
                            OMCommon
                                .ProjectCollection
                                .getDefaultConnection()
                                .getHttpClient<_VCGitRestClient.GitHttpClient>(VCGitRestClient.GitHttpClient);
                        const gitVersionDescriptor: _VCContracts.GitVersionDescriptor = {
                            versionType: VCContracts.GitVersionType.Branch,
                            version: params.branch,
                            versionOptions: null
                        };

                        gitHttpClient
                            .getFilePaths(params.project, params.repositoryName, null, gitVersionDescriptor)
                            .then((pathCollection: _VCContracts.GitFilePathsCollection) => {
                                resolve(createGitPathItems(pathCollection));
                            }, reject)
                    })
                : reject();
        });
    }
}

function createGitPathItems(pathCollection: _VCContracts.GitFilePathsCollection): IItem[] {
    let folderPathsLookup: IDictionaryStringTo<boolean> = {},
        items: IItem[] = [{ path: "/", isFolder: true }];

    const paths = pathCollection.paths;

    for (let path of paths) {
        let start = path.length - 1;
        let pos;

        while ((pos = path.lastIndexOf("/", start)) > 0) {
            let folderPath = path.substring(0, pos);

            // we already have this folder and its parents
            if (folderPathsLookup[folderPath]) {
                break;
            }

            folderPathsLookup[folderPath] = true;
            items.push({ path: "/" + folderPath, isFolder: true });

            start = pos - 1;
        }
    }

    // Sort the list of items
    items.sort((a: IItem, b: IItem) => { return ignoreCaseComparer(a.path, b.path); });

    return items;
}