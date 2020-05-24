import * as Q from "q";
import { using } from "VSS/VSS";

import { GitRef } from "TFS/VersionControl/Contracts";
import * as CommittingSource_Async from "VersionControl/Scenarios/Shared/Committing/CommittingSource";
import { FocusManager } from "VersionControl/Scenarios/Shared/Sources/FocusManager";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as GitRefService_Async from "VersionControl/Scripts/Services/GitRefService";
import * as FileViewerModelBuilder_Async from "Welcome/Scripts/TFS.Welcome.FileViewerModelBuilder";

import * as ReadmeEditingSource_Async from "ProjectOverview/Scripts/Shared/Sources/ReadmeEditingSource";

export class AsyncReadmeEditingSource {
    public readonly focusManager: FocusManager;
    private _committingSource: Q.Deferred<CommittingSource_Async.CommittingSource>;

    constructor() {
        this.focusManager = new FocusManager();
    }

    public getLatestGitRef(gitContext: GitRepositoryContext, branchName: string): IPromise<GitRef> {
        const deferred = Q.defer<GitRef>();

        using(["ProjectOverview/Scripts/Shared/Sources/ReadmeEditingSource"], (ReadmeEditingSourceModule: typeof ReadmeEditingSource_Async) => {
            ReadmeEditingSourceModule.getLatestGitRef(gitContext, branchName).then(
                (gitRef: GitRef) => {
                    deferred.resolve(gitRef);
                },
                deferred.reject
            );
        });

        return deferred.promise;
    }

    public getExistingBranches(repositoryContext: GitRepositoryContext): IPromise<string[]> {
        const deferred = Q.defer<string[]>();

        using(["VersionControl/Scripts/Services/GitRefService"], (GitRefService: typeof GitRefService_Async) => {
            GitRefService.getGitRefService(repositoryContext).getBranchNames().then(
                (branchNames: string[]) => {
                    deferred.resolve(branchNames);
                },
                deferred.reject
            );
        });

        return deferred.promise;
    }

    public getDefaultContentItem(repositoryContext: RepositoryContext): IPromise<FileViewerModelBuilder_Async.IFileViewerModel> {
        const deferred = Q.defer<FileViewerModelBuilder_Async.IFileViewerModel>();

        using(["ProjectOverview/Scripts/Shared/Sources/ReadmeEditingSource"], (ReadmeEditingSourceModule: typeof ReadmeEditingSource_Async) => {
            const fileViewerModel = ReadmeEditingSourceModule.getDefaultContentItem(repositoryContext);
            deferred.resolve(fileViewerModel);
        });

        return deferred.promise;
    }

    public getCommittingSource(): IPromise<CommittingSource_Async.CommittingSource> {
        if (!this._committingSource) {
            this._committingSource = Q.defer<CommittingSource_Async.CommittingSource>();

            using(
                [
                    "VersionControl/Scenarios/Shared/Committing/CommittingSource",
                ],
                (committingSource_Async: typeof CommittingSource_Async) => {
                    this._committingSource.resolve(
                        new committingSource_Async.CommittingSource());
                });
        }

        return this._committingSource.promise;
    }
}
