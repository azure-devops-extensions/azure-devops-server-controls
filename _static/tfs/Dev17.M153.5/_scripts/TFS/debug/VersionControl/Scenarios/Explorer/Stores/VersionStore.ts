import * as VSSStore from "VSS/Flux/Store";

import { CurrentRepositoryChangedPayload } from "VersionControl/Scenarios/Explorer/ActionsHub";
import { ItemModel, GitItem } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { VersionSpec, GitBranchVersionSpec, GitCommitVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export interface VersionState {
    isGit: boolean;
    allowEditing: boolean;
    userLastVisitedVersionSpec: VersionSpec;
    defaultGitBranchName: string;
    isBranchSelectorOpened: boolean;
    versionSpec: VersionSpec;
    /**
     * The actual commit represented by the current version.
     * For example, GBmaster would be resolved to GCa1b2c3d4.
     * Necessary to push commits from the web.
     */
    realVersionSpec: VersionSpec;
    isDefaultBranch: boolean;
}

export interface CommitPayload {
    newRealVersionSpec: VersionSpec;
    newBranchVersionSpec?: VersionSpec;
}

/**
 * A store containing the state of the currently displayed version (changeset or commit).
 */
export class VersionStore extends VSSStore.Store {
    public state = {
        isBranchSelectorOpened: false,
    } as VersionState;

    public changeRepository = (payload: CurrentRepositoryChangedPayload): void => {
        this.state.isGit = payload.isGit;
        this.state.userLastVisitedVersionSpec = payload.userLastVisitedVersionSpec;
        this.state.defaultGitBranchName = payload.defaultGitBranchName;
        this.state.allowEditing = payload.allowEditing;

        this.emitChanged();
    }

    public selectVersion = (versionSpec: VersionSpec): void => {
        if (!this.state.versionSpec || this.state.versionSpec.toVersionString() !== versionSpec.toVersionString()) {
            this.setVersionSpec(versionSpec);

            this.emitChanged();
        }
    }

    public selectRealVersion = (payload: { allRetrievedItems?: ItemModel[] }): void => {
        if (payload.allRetrievedItems && payload.allRetrievedItems.length) {
            const newRealVersionSpec = this.state.isGit
                ? getLatestGitVersionSpec(payload.allRetrievedItems as GitItem[])
                : undefined;

            if (newRealVersionSpec &&
                (!this.state.realVersionSpec || this.state.realVersionSpec.toVersionString() !== newRealVersionSpec.toVersionString())) {
                this.state.realVersionSpec = newRealVersionSpec;
                this.emitChanged();
            }
        }
    }

    public commit = (payload: CommitPayload): void => {
        this.state.realVersionSpec = payload.newRealVersionSpec;

        if (payload.newBranchVersionSpec) {
            this.setVersionSpec(payload.newBranchVersionSpec);
        }

        this.emitChanged();
    }

    public toggleBranchSelector = (isOpened: boolean): void => {
        if (this.state.isBranchSelectorOpened !== isOpened) {
            this.state.isBranchSelectorOpened = isOpened;

            this.emitChanged();
        }
    }

    private setVersionSpec(versionSpec: VersionSpec): void {
        this.state.versionSpec = versionSpec;
        const branchName = versionSpec && (versionSpec as GitBranchVersionSpec).branchName;
        this.state.isDefaultBranch = branchName === this.state.defaultGitBranchName;
    }
}

/**
 * Gets the commit hash from the retrieved items.
 */
export function getLatestGitVersionSpec(items: GitItem[]): VersionSpec {
    const firstValidItem = items.filter(item => item && item.commitId)[0];
    return firstValidItem && new GitCommitVersionSpec(firstValidItem.commitId.full);
}
