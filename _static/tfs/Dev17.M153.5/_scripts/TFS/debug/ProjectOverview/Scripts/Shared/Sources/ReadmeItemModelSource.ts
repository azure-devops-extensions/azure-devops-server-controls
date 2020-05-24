import * as Q from "q";

import { errorHandler } from "VSS/VSS";
import { combinePaths } from "VSS/Utils/File";
import { ContentRendererFactory, IContentRenderer } from "Presentation/Scripts/TFS/TFS.ContentRendering";

import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { VersionSpec, LatestVersionSpec, GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { ItemModel, ItemDetailsOptions, FileContent } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { getRefFriendlyName } from "VersionControl/Scripts/GitRefUtility";

import { ProjectOverviewConstants } from "ProjectOverview/Scripts/Generated/Constants";

export class ReadmeItemModelSource {
    private _markdownRenderer: IPromise<IContentRenderer>;

    public getJsonContent(repositoryContext: RepositoryContext, item: ItemModel): IPromise<FileContent> {
        return Q.Promise<FileContent>((resolve, reject) => {
            repositoryContext.getClient().beginGetItemContentJson(
                repositoryContext,
                item.serverItem,
                item.version,
                resolve,
                reject);
        });
    }

    public getMarkdownRenderer(): IPromise<IContentRenderer> {
        if (!this._markdownRenderer) {
            this._markdownRenderer = ContentRendererFactory.getRendererForExtension("md");
        }

        return this._markdownRenderer;
    }

    public getReadmeForRepository(repositoryContext: RepositoryContext, readmeFilePath?: string): IPromise<ItemModel> {
        let version: string;
        let serverItem: string;
        if (!readmeFilePath) {
            readmeFilePath = ProjectOverviewConstants.ReadmeFilePath;
        }

        if (repositoryContext.getRepositoryType() === RepositoryType.Tfvc) {
            version = new LatestVersionSpec().toVersionString();
            serverItem = combinePaths(repositoryContext.getRootPath(), readmeFilePath);
        }
        else {
            let branchName = getRefFriendlyName((repositoryContext as GitRepositoryContext).getRepository().defaultBranch);
            // TODO: Find a better way of populating the default branch name. One option is to add a get repository call.
            // Temporarily, populating it with the master for the scenarios, where readme is added in an empty repo on this page.
            version = new GitBranchVersionSpec(branchName || "master").toVersionString();
            serverItem = readmeFilePath;
        }

        return this._beginGetItem(repositoryContext, version, serverItem);
    }

    public getUpdatedReadmeItemModel(
        repositoryContext: RepositoryContext,
        versionSpec: VersionSpec,
        previousItem: ItemModel
    ): IPromise<ItemModel> {
        let versionString = repositoryContext.getRepositoryType() === RepositoryType.Git ?
            previousItem.version :
            versionSpec.toVersionString();

        return this._beginGetItem(repositoryContext, versionString, previousItem.serverItem).then(item => item, (error) => {
            errorHandler.show(error);
        });
    }

    private _beginGetItem(
        repositoryContext: RepositoryContext,
        version: string,
        serverItem: string)
        : IPromise<ItemModel> {
        let itemDetailOptions = {
            includeContentMetadata: true,
            includeVersionDescription: true,
        } as ItemDetailsOptions;

        return Q.Promise((resolve, reject) => {
            repositoryContext.getClient().beginGetItem(
                repositoryContext,
                serverItem,
                version,
                itemDetailOptions,
                resolve,
                reject
            );
        })
    }
}