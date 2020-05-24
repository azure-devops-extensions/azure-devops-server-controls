import { Store } from "VSS/Flux/Store";

import { GitVersionDescriptor } from "TFS/VersionControl/Contracts";
import { WikiV2 } from "TFS/Wiki/Contracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { ErrorPayload, ErrorProps, WikiMetadataLoadedPayload, WikiPermissions } from "Wiki/Scenarios/Shared/SharedActionsHub";

export interface CommonState {
    error: Error | JSX.Element;
    errorProps: ErrorProps;
    repositoryContext: GitRepositoryContext;
    sshUrl: string;
    sshEnabled: boolean;
    cloneUrl: string;
    isLoading: boolean;
    signalrHubUrl: string;
    // Set isPageDirty whenever some content on a page is modified.
    isPageDirty: boolean;
    tfsContext: TfsContext;
    wiki: WikiV2;
    wikiVersion: GitVersionDescriptor;
    wikiVersionError: string;
    isTfvcOnlyProject: boolean;
    isProjectWikiExisting: boolean;
    isStakeholder: boolean;
    draftVersions?: GitVersionDescriptor[];
}

export class CommonStore extends Store {
    public state = {
        isLoading: true,
    } as CommonState;

    public loadWikiMetadata = (payload: WikiMetadataLoadedPayload): void => {
        $.extend(this.state, payload);
        this.state.isLoading = false;
        
        this.emitChanged();
    };

    public setError = (payload: ErrorPayload) => {
        if (payload.error instanceof Error) {
            this.state.error = payload.error;
            this.state.errorProps = payload.errorProps;
        } else {
            this.state.error = payload.error;
        }
        
        this.emitChanged();
    };

    public clearError = () => {
        this.state.error = null;
        this.state.errorProps = null;
       
        this.emitChanged();
    };

    public startLoading = () => {
        this.state.isLoading = true;

        this.emitChanged();
    };

    public stopLoading = () => {
        this.state.isLoading = false;

        this.emitChanged();
    };

    public setIsPageDirty = (): void => {
        this.state.isPageDirty = true;

        this.emitChanged();
    }

    public resetIsPageDirty = (): void => {
        this.state.isPageDirty = false;

        this.emitChanged();
    }
}
