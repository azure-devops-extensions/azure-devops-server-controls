import { Action } from "VSS/Flux/Action";

import { WikiV2 } from "TFS/Wiki/Contracts";
import { GitRepository } from "TFS/VersionControl/Contracts";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export interface PublishWikiFieldData<T> {
    value: T;
    isValid: boolean;
    error?: Error;
    isDefault?: boolean;
}

export interface PublishOperationStatus {
    isComplete: boolean;
    isInProgress: boolean;
    error: Error;
}

export interface PublishFields {
    versionString: string;
    repositoryId?: string;
    name?: string;
    path?: string;
}

export class PublishActionsHub {
    public initialRepositoryLoading = new Action<void>();
    public initialRepositoryLoaded = new Action<GitRepository>();
    public initialRepositoryLoadFailed = new Action<Error>();
    public repositoryChanged = new Action<PublishWikiFieldData<GitRepository>>();
    public versionChanged = new Action<PublishWikiFieldData<VersionSpec>>();
    public pathChanged = new Action<PublishWikiFieldData<string>>();
    public nameChanged = new Action<PublishWikiFieldData<string>>();
    public wikiPublishInProgress = new Action<PublishFields>();
    public wikiPublishSucceeded = new Action<WikiV2>();
    public wikiPublishFailed = new Action<Error>();

    // Actions for unpublish scenarios
    public wikiUnpublishInProgress = new Action<void>();
    public wikiUnpublishSucceeded = new Action<void>();
    public wikiUnpublishFailed = new Action<Error>();
}