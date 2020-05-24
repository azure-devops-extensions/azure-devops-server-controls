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
import * as Diag from "VSS/Diag";
import { format } from "VSS/Utils/String";

export class TfsVersionControl extends BaseSourceInfoProvider implements ISourceInfoProvider {

    private tfsContext: TfsContext = TfsContext.getDefault();
    private tfvcPrefix = "$/";

    constructor(private project: string, private sourceBranch: string) {
        super();
    }

    public getKey() {
        return RepositoryTypes.TfsVersionControl;
    }

    public constructFilePath(parsedStackTraceInfo: IParsedStackTraceInfo[]): Promise<ILinkedStackTraceInfo[]> {
        return new Promise<ILinkedStackTraceInfo[]>((resolve, reject) => {

            // check if there is any full path in stack trace
            parsedStackTraceInfo.forEach(x => {
                if (x.filePathData) {
                    this.shouldGetRootFilesAndFolder = this.shouldGetRootFilesAndFolder || x.filePathData.isFullPath;
                }
            })

            this._getRootFilesAndFolder(this.sourceBranch).then(() => {
                let result = parsedStackTraceInfo.map((parsedInfo) =>
                    this.constructFilePathForEachLine(parsedInfo)
                );

                resolve(result);
            });
        });
    }

    private constructFilePathForEachLine(parsedInfo: IParsedStackTraceInfo): ILinkedStackTraceInfo {
        let linkedStackTraceInfo = {
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
        if (this.project && this.sourceBranch) {
            let filePathUrl = this.tfsContext.navigation.serviceHost.uri
                + encodeURIComponent(this.project) + "/_versionControl" + "#path="
                + encodeURIComponent(this.sourceBranch) + "/"
                + encodeURIComponent(filePathData.filePath.split("\\").join("/")) + "&version="
                + "&line=" + encodeURIComponent(filePathData.lineNumber.toString())
                + "&lineEnd=" + encodeURIComponent((filePathData.lineNumber + 1).toString())
                + "&lineStartColumn=" + encodeURIComponent(filePathData.columnNumber.toString())
                + "&lineEndColumn=" + encodeURIComponent(filePathData.columnNumber.toString())
                + "&lineStyle=plain"
                + encodeURIComponent("T") + "&_a=contents";

            return filePathUrl;
        }
        else {
            Diag.logWarning(format("TfsVersionControl.constructFilePath: Can not create path. Project: {0}, Branch: {1}",
                this.project, this.sourceBranch));
            return null;
        }

    }

    private _getRootFilesAndFolder(branchName: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.shouldGetRootFilesAndFolder && !this.rootFilesAndFolder) {
                let gitService = TMService.ServiceManager.instance().tfvcService();

                gitService.getItems(this.project, this.sourceBranch).then((tree) => {
                    if (tree) {
                        this.rootFilesAndFolder = tree.map(x => {
                            if (x.path !== this.sourceBranch) {
                                if (x.path.startsWith(this.sourceBranch)) {

                                    // here x.path is in the form $/branch/foldername and this.sourceBranch is $/branch.
                                    // So to remove extra "/", adding 1.
                                    return x.path.substring(this.sourceBranch.length + 1);
                                }

                                return x.path;
                            }
                        });

                        resolve(null);
                    }
                    resolve(null)
                });
            }
            else {
                resolve(null);
            }
        });
    }
}