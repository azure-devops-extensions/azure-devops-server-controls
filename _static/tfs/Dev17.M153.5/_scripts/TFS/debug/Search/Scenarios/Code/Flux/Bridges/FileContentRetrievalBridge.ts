import * as _VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as _VCRepositoryContext from "VersionControl/Scripts/RepositoryContext";
import { CodeResult } from "Search/Scenarios/WebApi/Code.Contracts";
import { FileContentSource } from "Search/Scenarios/Code/Flux/Sources/FileContentSource"

export interface FileContentRetrievalInvokers {
    fileContentRetrievalStarted: () => void;
    fileContentRetrieved(item: CodeResult, fileContent: _VCLegacyContracts.FileContent): void;
    fileContentRetrievalFailed: (error) => void;
}

export class FileContentRetrievalBridge {
    constructor(
        private readonly invokers: FileContentRetrievalInvokers,
        private readonly fileContentSource: FileContentSource) {
    }

    public getFileContents = (selectedItem: CodeResult, repoContext?: _VCRepositoryContext.RepositoryContext): void => {
        this.invokers.fileContentRetrievalStarted();
        if (!repoContext) {
            this.fileContentSource.getSearchFileContent(selectedItem)
                .then((fileContent: _VCLegacyContracts.FileContent) => {
                    this.invokers.fileContentRetrieved(selectedItem, fileContent);
                }, error => this.invokers.fileContentRetrievalFailed(error));
        }
        else {
            this.fileContentSource.getVCFileContent(selectedItem, repoContext)
                .then((fileContent: _VCLegacyContracts.FileContent) => {
                    this.invokers.fileContentRetrieved(selectedItem, fileContent);
                }, error => this.invokers.fileContentRetrievalFailed(error));
        }
    }
}