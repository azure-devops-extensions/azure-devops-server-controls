import * as Q from "q";

import { autobind } from "OfficeFabric/Utilities";
import { PullRequestPermissionsSet } from "VersionControl/Scenarios/PullRequestDetail/Stores/PullRequestPermissionsStore";
import { ActionsHub } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { SourcesHub } from "VersionControl/Scripts/Sources/SourcesHub";
import {
    GitPermissionsKey,
    GitPermissionSet,
    createRepositoryGitPermissionsKey,
    createBranchGitPermissionsKey
} from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { SettingsPermissions } from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";
import { FavoritesPermissions } from "VersionControl/Scenarios/Shared/Permissions/FavoritesPermissionsSource";
import { GitPullRequest, GitRepository } from "TFS/VersionControl/Contracts";

export class PullRequestPermissionsActionCreator {
    private _actionsHub: ActionsHub;
    private _sourcesHub: SourcesHub;

    public constructor(actionsHub: ActionsHub, sourcesHub: SourcesHub) {
        this._actionsHub = actionsHub;
        this._sourcesHub = sourcesHub;
    }

    public updatePermissions(pullRequest: GitPullRequest): IPromise<void> {
        const permissionKeys: GitPermissionsKey[] = [];

        this._actionsHub.permissionsUpdating.invoke(null);

        // by default, include permissions for the target repository (pr repo) and target branch
        permissionKeys.push(createRepositoryGitPermissionsKey(pullRequest.repository.project.id, pullRequest.repository.id));
        permissionKeys.push(createBranchGitPermissionsKey(pullRequest.repository.project.id, pullRequest.repository.id, pullRequest.targetRefName));

        // if this pull request is a fork, include permissions for the source repository and source branch
        if (pullRequest.forkSource && pullRequest.forkSource.repository && pullRequest.forkSource.repository.project) {
            permissionKeys.push(createRepositoryGitPermissionsKey(pullRequest.forkSource.repository.project.id, pullRequest.forkSource.repository.id));
            permissionKeys.push(createBranchGitPermissionsKey(pullRequest.forkSource.repository.project.id, pullRequest.forkSource.repository.id, pullRequest.forkSource.name));
        }
        else {
            permissionKeys.push(createBranchGitPermissionsKey(pullRequest.repository.project.id, pullRequest.repository.id, pullRequest.sourceRefName));
        }

        const gitPermissionsPromise: IPromise<GitPermissionSet> = this._sourcesHub.gitPermissionsSource.queryGitPermissionsAsync(permissionKeys);
        const settingsPermissionsPromise: IPromise<SettingsPermissions> = this._sourcesHub.settingsPermissionsSource.querySettingsPermissionsAsync();
        const favoritesPermissionsPromise: IPromise<FavoritesPermissions> = this._sourcesHub.favoritesPermissionsSource.queryFavoritesPermissionsAsync();

        return Q.all([gitPermissionsPromise, settingsPermissionsPromise, favoritesPermissionsPromise])
            .then(([gitPermissionSet, settingsPermissions, favoritesPermissions]) => {
                this._handlePermissionsUpdated({ gitPermissionSet, settingsPermissions, favoritesPermissions });
            })
            .then(null, this._raiseError);
    }

    private _handlePermissionsUpdated(permissionSet: PullRequestPermissionsSet): void {
        this._actionsHub.permissionsUpdated.invoke(permissionSet);
    }

    @autobind
    private _raiseError(error: Error): void {
        this._actionsHub.raiseError.invoke(error);
    }
}
