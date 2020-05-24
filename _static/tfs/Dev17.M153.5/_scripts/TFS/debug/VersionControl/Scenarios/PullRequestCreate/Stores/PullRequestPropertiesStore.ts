import * as VSSStore from "VSS/Flux/Store";
import { IdentityRef } from "VSS/WebApi/Contracts";

export interface LinkedWorkItemInfo {
    id: number;
    autoLinked: boolean;
}

export interface PullRequestProperties {
    title: string;
    description: string;
    reviewers: IdentityRef[];
    defaultReviewers: IdentityRef[];
    workItemIds: LinkedWorkItemInfo[];
    isDirty: boolean;
    canPasteCommitMessages: boolean;
    labels: string[];
    isDraft: boolean;
}

export class PullRequestPropertiesStore extends VSSStore.Store {
    public state: PullRequestProperties;

    constructor() {
        super();
        this._clearState();
    }

    public updateDefaultPullRequestProps(props: PullRequestProperties) {
        this.state = {
            ...this.state,
            ...props,
        };
        this.emitChanged();
    }

    public updatePullRequestProps(props: PullRequestProperties) {
        this.state = {
            ...this.state,
            ...props,
            isDirty: true,
        };
        this.emitChanged();
    }

    public onValidationStarted() {
        if (!this.state.isDirty) {
            this._clearState();
            this.emitChanged();
        }
    }

    public resetIsDirty() {
        if (this.state.isDirty) {
            this.state = {
                ...this.state,
                isDirty: false,
            };
            this.emitChanged();
        }
    }

    private _clearState() {
        this.state = {
            title: "",
            description: "",
            reviewers: [],
            defaultReviewers: [],
            workItemIds: [],
            isDirty: false,
            canPasteCommitMessages: false,
            labels: [],
            isDraft: false,
        };
    }
}
