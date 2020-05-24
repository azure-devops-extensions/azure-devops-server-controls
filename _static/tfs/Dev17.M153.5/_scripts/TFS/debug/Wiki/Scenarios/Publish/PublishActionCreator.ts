import * as Utils_String from "VSS/Utils/String";

import { autobind } from "OfficeFabric/Utilities";

import { ProjectNameValidator } from "Admin/Scripts/ProjectNameValidator";
import { WikiType, WikiV2 } from "TFS/Wiki/Contracts";
import { GitRepository } from "TFS/VersionControl/Contracts";
import { GitHttpClient } from "TFS/VersionControl/GitRestClient";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import { SharedActionsHub } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { PathConstants } from "Wiki/Scripts/Generated/Constants";
import { GitRepositorySource } from "Wiki/Scenarios/Publish/GitRepositorySource";
import { PublishActionsHub, PublishFields } from "Wiki/Scenarios/Publish/PublishActionsHub";
import { PublishWikiSource } from "Wiki/Scenarios/Publish/PublishWikiSource";

import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";

export interface Sources {
    publishSource: PublishWikiSource;
    gitRepositorySource: GitRepositorySource;
}

export class PublishActionCreator {
    private _gitClient: GitHttpClient;

    constructor(
        private _sharedActionsHub: SharedActionsHub,
        private _actionsHub: PublishActionsHub,
        private _sources: Sources,
    ) { }

    public get publishSource(): PublishWikiSource {
        return this._sources.publishSource;
    }

    public get gitRepositorySource(): GitRepositorySource {
        return this._sources.gitRepositorySource;
    }

    @autobind
    public loadInitialRepository(repositoryId: string): void {
        this._actionsHub.initialRepositoryLoading.invoke(undefined);

        this.gitRepositorySource.getRepository(repositoryId).then(
            (gitRepository: GitRepository) => {
                this._actionsHub.initialRepositoryLoaded.invoke(gitRepository);
            },
            (error: Error) => {
                this._actionsHub.initialRepositoryLoadFailed.invoke(error);
            }
        );
    }

    @autobind
    public onNameChange(value: string): void {
        let error: Error;

        if (!ProjectNameValidator.validate(value)) {
            error = new Error(WikiResources.WikiFormNameInvalid);
        } else {
            // Mock data. Task 1137264: Linking the publish view with right APIs and completing the full flow
            const existingWikiNames: string[] = ["social", "discovery"];
            const nameAlreadyExists = value != null
                && existingWikiNames.some(name => Utils_String.localeIgnoreCaseComparer(name, value) === 0);

            error = nameAlreadyExists ? new Error(WikiResources.WikiFormNameAlreadyExisting) : null;
        }

        const isValid = Boolean(value) && !Boolean(error);
        this._actionsHub.nameChanged.invoke({ value, isValid, error });
    }

    @autobind
    public onRepositoryChange(value: GitRepository, isDefault?: boolean): void {
        const isValid = true;
        this._actionsHub.repositoryChanged.invoke({ value, isValid, isDefault });
    }

    @autobind
    public onVersionChange(value: VersionSpec): void {
        const isValid = Boolean(value);
        this._actionsHub.versionChanged.invoke({ value, isValid });
    }

    @autobind
    public onPathChange(value: string): void {
        const incorrectFormat = value != null && !Utils_String.startsWith(value, "/");
        const error = incorrectFormat ? new Error(WikiResources.WikiFormFolderFieldInvalid) : null;
        const isValid = Boolean(value) && !incorrectFormat;

        this._actionsHub.pathChanged.invoke({ value, isValid, error });
    }

    @autobind
    public publishWiki(
        name: string,
        path: string,
        version: VersionSpec,
        repository: GitRepository,
    ): void {
        this._actionsHub.wikiPublishInProgress.invoke({
            name: name,
            path: path,
            versionString: version.toVersionString(),
            repositoryId: repository.id,
        } as PublishFields);

        this.publishSource.publishWiki(
            name,
            path,
            version,
            repository
        ).then(
            (value: WikiV2) => {
                // Invoke action that a wiki is created. Listened by telemetry handler.
                this._sharedActionsHub.wikiCreated.invoke(WikiType.CodeWiki);
                this._actionsHub.wikiPublishSucceeded.invoke(value);
            },
            (error: Error) => {
                this._actionsHub.wikiPublishFailed.invoke(error);
            });
    }

    public unpublishWiki(wikiId: string): void {
        this._actionsHub.wikiUnpublishInProgress.invoke(null);

        this.publishSource.unpublishWiki(wikiId).then(
            (wiki: WikiV2) => {
                // Invoke action that a wiki is unpublished. Listened by telemetry handler.
                this._sharedActionsHub.unpublishedWiki.invoke(null);
                this._actionsHub.wikiUnpublishSucceeded.invoke(null);
            },
            (error: Error) => {
                this._actionsHub.wikiUnpublishFailed.invoke(error);
            });
    }

    @autobind
    public addVersionToWiki(
        wikiIdentifier: string,
        project: string,
        version: VersionSpec,
    ): void {
        this._actionsHub.wikiPublishInProgress.invoke({
            versionString: version.toVersionString()
        } as PublishFields);

        this.publishSource.publishWikiVersion(
            wikiIdentifier,
            project,
            version,
        ).then(
            (value: WikiV2) => {
                // Invoke action that a wiki version is published. Listened by telemetry handler.
                this._sharedActionsHub.wikiVersionPublished.invoke(null);
                this._actionsHub.wikiPublishSucceeded.invoke(value);
            },
            (error: Error) => {
                this._actionsHub.wikiPublishFailed.invoke(error);
            });
    }
}
