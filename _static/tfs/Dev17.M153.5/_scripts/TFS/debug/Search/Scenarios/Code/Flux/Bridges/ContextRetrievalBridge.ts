import * as _VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as _VCRepositoryContext from "VersionControl/Scripts/RepositoryContext";
import * as _VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as _RepositorySource from "Search/Scenarios/Code/Flux/Sources/RepositorySource";
import { CodeResult, VersionControlType } from "Search/Scenarios/WebApi/Code.Contracts";
import { isVCType, getFileExtension, isGitType } from "Search/Scenarios/Code/Utils";
import { using, requireModules } from "VSS/VSS";

export type VCSpecModuleType = typeof _VCSpecs;

export interface ContextRetrievalInvokers {
    contextRetrievalStarted: () => void;
    contextRetrieved(
        item: CodeResult,
        repositoryContext: _VCRepositoryContext.RepositoryContext,
        requestedItem: _VCLegacyContracts.ItemModel,
        latestItem: _VCLegacyContracts.ItemModel): void;
    contextRetrievalFailed: (error: any) => void;
}

/**
 * Implementation of action creators that retrieve items.
 */
export class ContextRetrievalBridge {
    constructor(
        private readonly invokers: ContextRetrievalInvokers,
        private readonly repositorySource: _RepositorySource.RepositorySource) {
    }

    public getContext = (item: CodeResult, repositoryContext: _VCRepositoryContext.RepositoryContext): void => {
        this.invokers.contextRetrievalStarted();
        if (!isVCType(item.vcType)) {
            // In Source Depot scenarios, ItemModel is created inline and repoContext is null.
            this.invokers.contextRetrieved(
                item,
                null,
                getItemModelFromActiveItem(item),
                {} as _VCLegacyContracts.ItemModel);
        }
        else if (repositoryContext) {
            this.getVCSpecModule()
                .then((VCSpecs: VCSpecModuleType) => {
                    const { changeId, branch } = item,
                        versionString = isGitType(item.vcType)
                            ? (changeId
                                ? new VCSpecs.GitCommitVersionSpec(changeId).toVersionString()
                                : new VCSpecs.GitBranchVersionSpec(branch).toVersionString())
                            : new VCSpecs.ChangesetVersionSpec(changeId).toVersionString(),
                        latestVersionString = isGitType(item.vcType)
                            ? new VCSpecs.GitBranchVersionSpec(branch).toVersionString()
                            : new VCSpecs.LatestVersionSpec().toVersionString(),
                        itemDescriptors: _RepositorySource.ItemDescriptor[] = [
                            {
                                path: item.path,
                                version: versionString
                            },
                            {
                                path: item.path,
                                version: latestVersionString
                            }
                        ];

                    this.repositorySource
                        .getItems(itemDescriptors, repositoryContext, true)
                        .then((itemModels: _VCLegacyContracts.ItemModel[]) => {
                            // Assuming the order of the versions requested is maintained in the response as well.
                            // It seems the order is maintained -> 
                            // https://mseng.visualstudio.com/VSOnline/_git/VSO?path=%2FTfs%2FService%2FSourceControl%2FWeb%2FServer%2FControllers%2FTfvc%2FTfvcItemBatchController.cs&version=GBmaster&_a=contents
                            this.invokers.contextRetrieved(item, repositoryContext, itemModels[0], itemModels[1]);
                        }, error => this.invokers.contextRetrievalFailed(error));
                }, error => this.invokers.contextRetrievalFailed(error));
        }
    }

    /**
     * Made public for stubbing in L0 tests.
     */
    public getVCSpecModule(): IPromise<VCSpecModuleType> {
        return new Promise((resolve, reject) => {
            using([
                "VersionControl/Scripts/TFS.VersionControl.VersionSpecs"
            ], resolve, reject)
        });
    }
}

/**
 * This function creates an object of Item Model from the selected code result.
 * @param selectedItem
 */
function getItemModelFromActiveItem(selectedItem: CodeResult): _VCLegacyContracts.ItemModel {
    return {
        changeDate: null,
        childItems: [],
        isFolder: false,
        isSymLink: false,
        serverItem: selectedItem.path,
        url: selectedItem.path,
        version: selectedItem.branch,
        versionDescription: "",
        contentMetadata: {
            contentType: "text/plain",
            encoding: 65001, // utf-8 
            extension: getFileExtension(selectedItem.path),
            fileName: selectedItem.fileName,
            isBinary: false,
            isImage: false,
            vsLink: null
        }
    };
}
