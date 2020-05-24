import { autobind } from "OfficeFabric/Utilities";

import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";

import { GitHttpClient } from "TFS/VersionControl/GitRestClient";
import { GitAsyncOperationStatus, GitForkSyncRequest, GitRepository, GitRepositoryCreateOptions } from "TFS/VersionControl/Contracts";
import { TeamProjectReference } from "TFS/Core/Contracts";

import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import * as Utils_String from "VSS/Utils/String";

export type ForkCreationResultCallback = (result: IForkCreationResult) => any;

export interface IForkCreationResult {
    success: boolean;
    resultMessage?: string;
    forkRepository?: GitRepository;
}

export class ForkRepositorySource {
    private _gitClient: GitHttpClient;
    private _repoContext: GitRepositoryContext;
    private readonly _syncJobPollInterval = 3000; //ms

    constructor(repositoryContext: GitRepositoryContext) {
        this._repoContext = repositoryContext;
        this._gitClient = this._getGitClient();
    }

    public getDefaultForkName(): string {
        const identity = this._repoContext.getTfsContext().currentIdentity;
        // Try to use the identifying part of the user's email, but fall back to uniqueName if that fails
        const splitEmail = identity.email ? identity.email.split("@") : [];
        const userIdentifierString = (splitEmail && splitEmail.length > 0) ? splitEmail[0] : this._repoContext.getTfsContext().currentIdentity.displayName;
        const sanitizeduserIdentifierString = this._sanitizeDefaultForkName(userIdentifierString);

        return Utils_String.format(VCResources.ForkRepositoryDefaultName, this._repoContext.getRepository().name, sanitizeduserIdentifierString);
    }

    public createFork(forkName: string, sourceRepository: GitRepository, destinationProject: TeamProjectReference, callback: ForkCreationResultCallback, refToInclude: string): void {
        const repoToCreate = {
            name: forkName,
            project: destinationProject,
            parentRepository: {
                id: sourceRepository.id,
                project: { id: sourceRepository.project.id },
                collection: { id: this._repoContext.getTfsContext().contextData.collection.id }
            }
        } as GitRepositoryCreateOptions;

        this._gitClient.createRepository(repoToCreate, destinationProject.id, refToInclude)
            .then((newRepo) => {
                this._gitClient.getForkSyncRequests(newRepo.id, destinationProject.id)
                    .then((response: GitForkSyncRequest[]) => {
                        if (response.length > 0) {
                            // We should never get more than one sync request on a brand new repo, so just grab the first item
                            const syncRequest = response[0];
                            this._pollSyncJob(newRepo, destinationProject, syncRequest, callback);
                        }
                    }, (error) => {
                        callback({ success: false, resultMessage: error.message });
                    })
            }, (error) => {
                callback({ success: false, resultMessage: error.message });
            });
    }

    // Attempts to remove or replace characters from the generated repo name that are known not to be supported by git
    // This is a "best effort" attempt. It is overly aggressive, but since the name is only a suggestion we're ok with that.
    private _sanitizeDefaultForkName(name: string) {
        name = name.replace(" ", "_"); // First replace spaces with underscores
        name = name.replace(/[\\/]/g, "."); // Now replace slash/backslash separators with dot
        name = name.replace(/[^A-Z0-9_.!^()_-]/gi, ""); // Finally, strip out anything that isn't in the simple English character set
        return name;
    }

    @autobind
    private _pollSyncJob(newRepo: GitRepository, destinationProject: TeamProjectReference, syncRequest: GitForkSyncRequest, callback: ForkCreationResultCallback) {
        switch (syncRequest.status) {
            case GitAsyncOperationStatus.InProgress:
            case GitAsyncOperationStatus.Queued:
                setTimeout(() => {
                    this._gitClient.getForkSyncRequest(newRepo.id, syncRequest.operationId, destinationProject.id)
                        .then((updatedSyncData: GitForkSyncRequest) => {
                            this._pollSyncJob(newRepo, destinationProject, updatedSyncData, callback);
                        }, (error) => {
                            callback({ success: false, resultMessage: error.message });
                        });
                }, this._syncJobPollInterval);
                break;
            case GitAsyncOperationStatus.Completed:
                callback({ success: true, forkRepository: newRepo });
                break;
            case GitAsyncOperationStatus.Abandoned:
            case GitAsyncOperationStatus.Failed:
            default:
                callback({ success: false, resultMessage: syncRequest.detailedStatus.errorMessage });
                break;
        }
    }

    private _getGitClient(): GitHttpClient {
        return ProjectCollection.getDefaultConnection().getHttpClient<GitHttpClient>(GitHttpClient);
    }
}