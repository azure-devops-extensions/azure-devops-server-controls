import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { BaseSourceInfoProvider } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Sources/SourceInfoProviders/Base";
import {
    IFilePathData,
    ILinkedStackTraceInfo,
    IParsedStackTraceInfo,
    ISourceInfoProvider,
    RepositoryTypes,
} from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Sources/SourceInfoProviders/common";
import * as TMService from "TestManagement/Scripts/TFS.TestManagement.Service";
import * as BuildContracts from "TFS/Build/Contracts";
import * as VCContracts from "TFS/VersionControl/Contracts";
import * as Diag from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";

export class TfsGit extends BaseSourceInfoProvider implements ISourceInfoProvider {

    private tfsContext: TfsContext = TfsContext.getDefault();
    private refsHeadsPrefix = "refs/heads/";
    private refsPullPrefix = "refs/pull/";
    private branch: string;

    constructor(private repository: string, private project: string, private sourceBranch: string) {
        super();
    }

    public getKey() {
        return RepositoryTypes.TfsGit;
    }

    public constructFilePath(parsedStackTraceInfo: IParsedStackTraceInfo[]): Promise<ILinkedStackTraceInfo[]> {
        return new Promise<ILinkedStackTraceInfo[]>((resolve, reject) => {

            // check if there is any full path in stack trace
            parsedStackTraceInfo.forEach(x => {
                if (x.filePathData) {
                    this.shouldGetRootFilesAndFolder = this.shouldGetRootFilesAndFolder || x.filePathData.isFullPath;
                }
            })

            this.initializeProvider().then(() => {
                let result = parsedStackTraceInfo.map((parsedInfo) =>
                    this.constructFilePathForEachLine(parsedInfo)
                );

                resolve(result);
            });
        });
    }

    private constructFilePathForEachLine(parsedInfo: IParsedStackTraceInfo): ILinkedStackTraceInfo {
        let linkedStackTraceInfo =
            {
                stackTrace: parsedInfo.stackTrace,
                url: null
            } as ILinkedStackTraceInfo;

        if (!!parsedInfo.filePathData) {
            if (this.removeSourceDirectoryFromPath(parsedInfo.filePathData)) {
                let fileUrl = this.constructUrl(parsedInfo.filePathData);
                if (!!fileUrl) {
                    linkedStackTraceInfo.url = fileUrl;
                }
            }
        }

        return linkedStackTraceInfo;
    }

    // Contruct URL for the file.
    private constructUrl(filePathData: IFilePathData): string {
        if (this.project && this.branch && this.repository) {
            let filePathUrl = this.tfsContext.navigation.serviceHost.uri
                + encodeURIComponent(this.project) + "/_git/"
                + encodeURIComponent(this.repository) + "#path="
                + encodeURIComponent(filePathData.filePath.split("\\").join("/")) + "&version="
                + encodeURIComponent(`GB${this.branch}`) + "&_a=contents"
                + "&line=" + encodeURIComponent(filePathData.lineNumber.toString())
                + "&lineEnd=" + encodeURIComponent((filePathData.lineNumber + 1).toString())
                + "&lineStartColumn=" + encodeURIComponent(filePathData.columnNumber.toString())
                + "&lineEndColumn=" + encodeURIComponent(filePathData.columnNumber.toString())
                + "&lineStyle=plain";

            return filePathUrl;
        }
        else {
            Diag.logWarning(Utils_String.format("TfsGit.constructFilePath: Can not create path. Project: {0}, Branch: {1}, repository: {2}",
                this.project, this.branch, this.repository));
            return null;
        }
    }

    // This function should get called before calling any other function of this class.
    private initializeProvider(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!this.branch) {
                this._getBranchText().then((branch: string) => {
                    this.branch = branch;
                    this._getRootFilesAndFolder(this.branch).then(() => {
                        resolve(null);
                    });
                });
            }
            else {
                resolve(null);
            }
        });
    }

    protected _getBranchText(): Promise<string> {
        let branchText = this.sourceBranch;

        return new Promise<string>((resolve, reject) => {
            if (this._isAPullRequest(branchText)) {
                let pullRequestId = this._getPullRequestId(branchText);
                if (pullRequestId) {
                    this._getBranchTextFromPullRequest(this.project, this.getKey(), pullRequestId.toString(), this.repository).then((branchName: string) => {
                        if (!!branchName) {
                            branchText = branchName;
                        }

                        resolve(branchText);
                    });
                }
                else {
                    resolve(branchText);
                }
            }
            else if (branchText.startsWith(this.refsHeadsPrefix)) {
                resolve(branchText.substring(this.refsHeadsPrefix.length));
            }
            else {
                resolve(branchText);
            }
        });
    }

    protected _isAPullRequest(branchName: String): boolean {
        return (branchName.indexOf(this.refsPullPrefix) === 0) ? true : false;
    }

    protected _getPullRequestId(branchName: string): number | undefined {
        const prSourceBranch = branchName.substring(this.refsPullPrefix.length);
        const tokens = prSourceBranch.trim().split("/", 2);
        if (tokens.length !== 2) {
            return;
        }
        const mergeString = tokens[1].trim();
        if (mergeString.toLowerCase() !== "merge") {
            return;
        }
        const id = parseInt(tokens[0].trim());
        if (!isNaN(id)) {
            return id;
        }

    }

    private _getBranchTextFromPullRequest(project: string, providerName: string, pullRequestId: string, repositoryId: string): Promise<string> {
        let buildService = TMService.ServiceManager.instance().buildService3();
        return new Promise<string>((resolve, reject) => {
            buildService.getPullRequest(project, providerName, pullRequestId, repositoryId).then(
                (pullRequest: BuildContracts.PullRequest) => {
                    let branchName = pullRequest.sourceBranchRef;
                    if (!!branchName) {
                        if (branchName.startsWith(this.refsHeadsPrefix)) {
                            branchName = branchName.substring(this.refsHeadsPrefix.length);
                        }
                    }
                    resolve(branchName);
                },
                (error) => {
                    Diag.logWarning(Utils_String.format("getting pullRequest data failed. error: {0}", error.message || error.toString()));
                    resolve(null);
                });
        });
    }

    private _getRootFilesAndFolder(branchName: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.shouldGetRootFilesAndFolder && !this.rootFilesAndFolder) {
                let gitService = TMService.ServiceManager.instance().gitService();

                let gitVersionDescriptor: VCContracts.GitVersionDescriptor =
                    {
                        version: branchName,
                        versionOptions: VCContracts.GitVersionOptions.None,
                        versionType: VCContracts.GitVersionType.Branch
                    };

                gitService.getItems(this.repository, gitVersionDescriptor).then((sha) => {
                    gitService.getTree(this.repository, sha[0].objectId).then((tree) => {
                        if (tree && tree.treeEntries) {
                            this.rootFilesAndFolder = tree.treeEntries.map(x => x.relativePath);
                        }
                        resolve(null);
                    });
                });
            }
            else {
                resolve(null);
            }
        });
    }
}
