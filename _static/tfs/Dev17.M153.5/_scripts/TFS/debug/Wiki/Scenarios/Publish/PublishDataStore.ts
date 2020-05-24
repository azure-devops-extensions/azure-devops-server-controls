import { autobind } from "OfficeFabric/Utilities";
import { Store } from "VSS/Flux/Store";

import { GitRepository } from "TFS/VersionControl/Contracts";
import { WikiV2 } from "TFS/Wiki/Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { GitVersionSelector } from "VersionControl/Scenarios/Shared/GitVersionSelector";
import { GitBranchVersionSpec, VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import {
    PublishActionsHub,
    PublishFields,
    PublishWikiFieldData,
    PublishOperationStatus,
} from "Wiki/Scenarios/Publish/PublishActionsHub";
import { gitVersionDescriptorToVersionSpec } from "Wiki/Scripts/Helpers";

export interface PublishData {
    repository: PublishWikiFieldData<GitRepository>;
    version: PublishWikiFieldData<VersionSpec>;
    name: PublishWikiFieldData<string>;
    path: PublishWikiFieldData<string>;
    lastPublishedFields: PublishFields;
    publishOperation: PublishOperationStatus;
    publishedWiki: WikiV2;
    isDataLoading: boolean;
    isDataComplete: boolean;
    dataLoadError?: Error;
}

export class PublishDataStore extends Store  {
    public state: PublishData = {
        isDataLoading: false,
        isDataComplete: false,
        dataLoadError: undefined,
        repository: {} as PublishWikiFieldData<GitRepository>,
        version: {} as PublishWikiFieldData<VersionSpec>,
        name: {} as PublishWikiFieldData<string>,
        path: {} as PublishWikiFieldData<string>,
        publishOperation: {} as PublishOperationStatus,
        publishedWiki: undefined,
        lastPublishedFields: {} as PublishFields,
    };

    constructor(
        private _actionsHub: PublishActionsHub,
        private _inputWiki?: WikiV2,
    ) {
        super();

        if (this._inputWiki) {
            // Populate static wiki properties as initial state.
            const wikiName = this._inputWiki.name;
            const mappedPath = this._inputWiki.mappedPath;
            const repository = {
                id: _inputWiki.repositoryId,
            } as GitRepository;

            this.state = {
                isDataLoading: false,
                isDataComplete: false,
                repository: {
                    isValid: Boolean(repository),
                    value: repository,
                } as PublishWikiFieldData<GitRepository>,
                version: {} as PublishWikiFieldData<VersionSpec>,  // Not setting a version since there could be many versions in the wiki
                name: {
                    isValid: Boolean(wikiName),
                    value: wikiName,
                } as PublishWikiFieldData<string>,
                path: {
                    isValid: Boolean(mappedPath),
                    value: mappedPath,
                } as PublishWikiFieldData<string>,
                publishOperation: {} as PublishOperationStatus,
                publishedWiki: undefined,
                lastPublishedFields: {} as PublishFields,
            }
        }

        this._actionsHub.initialRepositoryLoading.addListener(this._onRepositoryLoading);
        this._actionsHub.initialRepositoryLoaded.addListener(this._onRepositoryLoadComplete);
        this._actionsHub.initialRepositoryLoadFailed.addListener(this._onRepositoryLoadFailed);
        this._actionsHub.nameChanged.addListener(this._onNameChanged);
        this._actionsHub.pathChanged.addListener(this._onPathChanged);
        this._actionsHub.versionChanged.addListener(this._onVersionChanged);
        this._actionsHub.repositoryChanged.addListener(this._onRepositoryChanged);
        this._actionsHub.wikiPublishInProgress.addListener(this._onWikiPublishInProgress);
        this._actionsHub.wikiPublishSucceeded.addListener(this._onWikiPublishSucceeded);
        this._actionsHub.wikiPublishFailed.addListener(this._onWikiPublishFailed);
    }

    public dispose(): void {
        this._actionsHub.initialRepositoryLoading.removeListener(this._onRepositoryLoading);
        this._actionsHub.initialRepositoryLoaded.removeListener(this._onRepositoryLoadComplete);
        this._actionsHub.initialRepositoryLoadFailed.removeListener(this._onRepositoryLoadFailed);
        this._actionsHub.nameChanged.removeListener(this._onNameChanged);
        this._actionsHub.pathChanged.removeListener(this._onPathChanged);
        this._actionsHub.versionChanged.removeListener(this._onVersionChanged);
        this._actionsHub.repositoryChanged.removeListener(this._onRepositoryChanged);
        this._actionsHub.wikiPublishInProgress.removeListener(this._onWikiPublishInProgress);
        this._actionsHub.wikiPublishSucceeded.removeListener(this._onWikiPublishSucceeded);
        this._actionsHub.wikiPublishFailed.removeListener(this._onWikiPublishFailed);

        this._actionsHub = null;
    }

    @autobind
    private _onRepositoryLoading(): void {
        this.state.isDataLoading = true;

        this.emitChanged();
    }

    @autobind
    private _onRepositoryLoadComplete(repository: GitRepository): void {
        this.state.isDataLoading = false;
        this.state.repository.value = repository;
        this.state.repository.isValid = true;

        this._updateAndEmitStateChange();
    }

    @autobind
    private _onRepositoryLoadFailed(error: Error): void {
        this.state.dataLoadError = error;

        this.emitChanged();
    }

    @autobind
    private _onNameChanged({ value, isValid, error }: PublishWikiFieldData<string>): void {
        this.state.name.value = value;
        this.state.name.isValid = isValid;
        this.state.name.error = error;

        this._updateAndEmitStateChange();
    }

    @autobind
    private _onPathChanged({ value, isValid, error }: PublishWikiFieldData<string>): void {
        this.state.path.value = value;
        this.state.path.isValid = isValid;
        this.state.path.error = error;

        this._updateAndEmitStateChange();
    }

    @autobind
    private _onVersionChanged({ value, isValid, error }: PublishWikiFieldData<VersionSpec>): void {
        this.state.version.value = value;
        this.state.version.isValid = isValid;
        this.state.version.error = error;

        this._updateAndEmitStateChange();
    }

    @autobind
    private _onRepositoryChanged({ value, isValid, error, isDefault }: PublishWikiFieldData<GitRepository>): void {
        this.state.repository.value = value;
        this.state.repository.isValid = isValid;
        this.state.repository.error = error;

        // Do not update the other fields if this is the default repository
        if (!isDefault) {
            const defaultBranchName = value && value.defaultBranch
                ? value.defaultBranch.substring(value.defaultBranch.lastIndexOf("/") + 1)
                : null;

            // When the repository is changed, set the default branch of that repository in the version selector.
            this.state.version.value = defaultBranchName ? new GitBranchVersionSpec(defaultBranchName) : null;
            this.state.version.isValid = this.state.version.value != null;

            // When the repository is changed, clear out the path.
            this.state.path.value = "";
            this.state.path.isValid = false;
        }

        this._updateAndEmitStateChange();
    }

    @autobind
    private _isDataComplete(): boolean {
        return this.state.repository.isValid
            && this.state.version.isValid
            && this.state.path.isValid
            && this.state.name.isValid;
    }

    @autobind
    private _updateAndEmitStateChange(): void {
        this.state.isDataComplete = this._isDataComplete();

        this.emitChanged();
    }

    @autobind
    private _onWikiPublishInProgress(publishFields: PublishFields): void {
        this.state.publishOperation.isInProgress = true;
        this.state.publishOperation.error = null;
        this.state.lastPublishedFields = publishFields;

        this.emitChanged();
    }

    @autobind
    private _onWikiPublishFailed(error: Error): void {
        this.state.publishOperation.error = error;
        this.state.publishOperation.isInProgress = false;

        this.emitChanged();
    }

    @autobind
    private _onWikiPublishSucceeded(wiki: WikiV2): void {
        this.state.publishOperation.isComplete = true;
        this.state.publishOperation.isInProgress = false;
        this.state.publishOperation.error = null;
        this.state.publishedWiki = wiki;

        this.emitChanged();
    }
}
