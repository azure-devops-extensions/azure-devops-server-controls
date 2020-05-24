import { RemoteStore } from "VSS/Flux/Store";
import { PageContentLoadedPayload } from "Wiki/Scenarios/Shared/SharedActionsHub";

export interface PageContentState {
    path: string;
    content: string;
    version: string;
    isLoading: boolean;
}

export class PageContentStore extends RemoteStore {

    public state: PageContentState = {
        path: "",
        content: "",
        version: "",
        isLoading: true,
    };

    public onPageContentFetched = (payload: PageContentLoadedPayload): void => {
        this.state = {
            path: payload.path,
            content: payload.content,
            version: payload.version,
            isLoading: false,
        };
        this.emitChanged();
    }

    public onPageVersionChanged = (version: string): void => {
        this.state.version = version;

        this.emitChanged();
    }

    public onPageLoadEnded = (): void => {
        this.state.isLoading = false;

        this.emitChanged();
    }

    public onPageContentReset = (isLoading: boolean): void => {
        this.state = {
            path: "",
            content: "",
            version: "",
            isLoading: isLoading,
        };

        this.emitChanged();
    }
}
