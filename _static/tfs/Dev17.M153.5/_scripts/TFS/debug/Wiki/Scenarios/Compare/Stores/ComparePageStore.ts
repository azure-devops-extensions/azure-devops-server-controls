import * as VSSStore from "VSS/Flux/Store";

import { ItemModel, VersionControlChangeType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { IAvatarImageProperties } from "VersionControl/Scenarios/Shared/AvatarImageInterfaces";

import { ComparePagePayload } from "Wiki/Scenarios/Compare/CompareActionsHub";

export interface ComparePageState {
    author: IAvatarImageProperties;
    authoredDate: Date;
    pagePath: string;
    gitItemPath: string;
    comment: string;
    version: string;
    item: ItemModel;
    itemChangeType: VersionControlChangeType;
    fileContent: string;
    isPreviewContentLoading: boolean;
    isDiffViewContentLoading: boolean;
}

export class ComparePageStore extends VSSStore.Store {
    public state = {
        isPreviewContentLoading: true,
        isDiffViewContentLoading: true,
    } as ComparePageState;

    public onComparePageDataLoaded = (payload: ComparePagePayload): void => {
        this.state = $.extend(this.state, payload);

        this.emitChanged();
    }

    public onCompareDiffDataLoaded = (): void => {
        this.state.isDiffViewContentLoading = false;

        this.emitChanged();
    }

    public onItemDetailsLoaded = (payload: ItemModel): void => {
        this.state.item = payload;

        this.emitChanged();
    }

    public onFileContentLoaded = (payload: string): void => {
        this.state.fileContent = payload;
        this.state.isPreviewContentLoading = false;

        this.emitChanged();
    }

    public onAnyDataLoadFailed = (error: Error): void => {
        this.state.isPreviewContentLoading = false;
        this.state.isDiffViewContentLoading = false;

        this.emitChanged();
    }
}
