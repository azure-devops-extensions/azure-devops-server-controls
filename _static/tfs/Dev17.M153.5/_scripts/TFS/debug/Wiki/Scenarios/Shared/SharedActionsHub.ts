import { Action } from "VSS/Flux/Action";

import { GitVersionDescriptor } from "TFS/VersionControl/Contracts";
import { WikiType, WikiV2 } from "TFS/Wiki/Contracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

export interface UrlParameters {
    action?: string;
    pagePath?: string;
    anchor?: string;
    latestPagePath?: string;
    isPrint?: boolean;
    isSubPage?: boolean;
    version?: string;
    view?: string;
    wikiIdentifier?: string;
    wikiVersion?: string;
    template?: string;
} 

export interface GuidSuffixedFile extends File {
    guidSuffixedFileName: string;
}

export interface Attachment {
    blob: Blob;
    file: GuidSuffixedFile;
    objectUrl: string;
    base64Content?: string;
    error?: Error;
}

export interface WikiPermissions {
    hasCreatePermission: boolean;
    hasContributePermission: boolean;
    hasReadPermission: boolean;
    hasRenamePermission: boolean;
    hasManagePermission: boolean;
}

export interface PageContentLoadedPayload {
	path: string;
	content: string;
	version: string;
}

export interface WikiMetadataLoadedPayload {
    wiki: WikiV2;
    wikiVersion: GitVersionDescriptor;
    wikiVersionError: string;
    repositoryContext: GitRepositoryContext;
    sshUrl: string;
    sshEnabled: boolean;
    cloneUrl: string;
    signalrHubUrl: string;
    tfsContext: TfsContext;
    isTfvcOnlyProject: boolean;
    isProjectWikiExisting: boolean;
    isStakeholder: boolean;
    draftVersions?: GitVersionDescriptor[];
}

export interface ErrorProps {
    errorMessage: string;
    actionButtonText?: string;
    actionCallbackData?: string;
    actionCallbackHandler?(errorProps: ErrorProps): void;
    disableActionButton?: boolean;
    secondaryErrorMessage?: string | JSX.Element;
    errorIconPath?: string;
}

export interface ErrorPayload {
    error: Error | JSX.Element;
    errorProps: ErrorProps;
}

export class SharedActionsHub {
    public errorRaised = new Action<ErrorPayload>();
    public errorCleared = new Action<void>();
    public wikiMetadataLoaded = new Action<WikiMetadataLoadedPayload>();
    public startedLoading = new Action<void>();
    public stoppedLoading = new Action<void>();
    public navigateAwayDialogPrompted = new Action<() => void>();
    public navigateAwayDialogDismissed = new Action<void>();
    public permissionsChanged = new Action<WikiPermissions>();
    public wikiCreated = new Action<WikiType>();
    public wikiVersionPublished = new Action<void>();
    public unpublishedWiki = new Action<void>();
}
