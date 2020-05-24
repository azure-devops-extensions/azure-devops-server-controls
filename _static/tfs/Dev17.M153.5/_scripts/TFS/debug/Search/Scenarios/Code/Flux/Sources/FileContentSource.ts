import * as _Ajax from "Presentation/Scripts/TFS/TFS.Legacy.Ajax";
import * as _VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as _VCRepositoryContext from "VersionControl/Scripts/RepositoryContext";
import * as _VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { using } from "VSS/VSS"
import { CodeResult, VersionControlType } from "Search/Scenarios/WebApi/Code.Contracts";
import { isGitType, isTfvcType, getFileExtension } from "Search/Scenarios/Code/Utils";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

export class FileContentSource {
    public getVCFileContent(selectedItem: CodeResult, repoContext: _VCRepositoryContext.RepositoryContext): Promise<_VCLegacyContracts.FileContent> {
        return new Promise<_VCLegacyContracts.FileContent>((resolve, reject) => {
            using([
                "VersionControl/Scripts/TFS.VersionControl.VersionSpecs"
            ], (VCSpecs: typeof _VCSpecs) => {
                let versionString: string;

                if (isGitType(selectedItem.vcType)) {
                    versionString = !!selectedItem.changeId
                        ? new VCSpecs.GitCommitVersionSpec(selectedItem.changeId).toVersionString()
                        : new VCSpecs.GitBranchVersionSpec(selectedItem.branch).toVersionString();
                }
                else if (isTfvcType(selectedItem.vcType)) {
                    versionString = new VCSpecs.ChangesetVersionSpec(selectedItem.changeId).toVersionString();
                }

                repoContext
                    .getClient()
                    .beginGetItemContentJson(
                    repoContext,
                    selectedItem.path,
                    versionString,
                    (fileContent: _VCLegacyContracts.FileContent) => {
                        resolve(fileContent);
                    }, reject);
            }, reject);
        });
    }

    public getSearchFileContent(selectedItem: CodeResult): Promise<_VCLegacyContracts.FileContent> {
        const scope = TfsContext.getDefault().contextData.account.name;
        const actionUrl: string = TfsContext.getDefault().getActionUrl("getFileContent", "search", { area: "api" });

        return new Promise<_VCLegacyContracts.FileContent>((resolve, reject) => {
            using([
                "Presentation/Scripts/TFS/TFS.Legacy.Ajax"
            ], (Ajax: typeof _Ajax) => {
                Ajax.getMSJSON(
                    actionUrl,
                    {
                        scope: scope,
                        projectName: selectedItem.project,
                        repositoryName: selectedItem.repository,
                        branchName: selectedItem.contentId,
                        filePath: selectedItem.path,
                    },
                    (content, statusText, responseHeaders) => {
                        var fileContent = {
                            content: content,
                            contentBytes: this.getBytes(content),
                            contentLines: content.split("\n"),
                            exceededMaxContentLength: false,
                            metadata: {
                                // Currently filling with a default content metadata. TODO : Fetch these details from the VC
                                // Use MimeMapper to get the content type for the given file extension/file name
                                contentType: "text/plain",
                                encoding: 65001, // utf-8 
                                extension: getFileExtension(selectedItem.path),
                                fileName: selectedItem.fileName,
                                isBinary: false,
                                isImage: false,
                                vsLink: null
                            }
                        }
                        resolve(fileContent)
                    },
                    reject);
            }, reject)
        })
    }

    private getBytes(value: string): number[] {
        var bytes = [];
        for (var i = 0; i < value.length; ++i) {
            bytes.push(value.charCodeAt(i));
        }
        return bytes;
    }
}