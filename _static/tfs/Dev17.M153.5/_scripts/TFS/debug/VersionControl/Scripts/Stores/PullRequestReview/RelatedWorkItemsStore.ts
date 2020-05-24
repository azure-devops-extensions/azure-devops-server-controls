import { autobind } from "OfficeFabric/Utilities";
import { RemoteStore } from "VSS/Flux/Store";
import { format } from "VSS/Utils/String";
import { WorkItemNextStateOnTransition } from "TFS/WorkItemTracking/Contracts";
import {
    IWorkItemAddedPayload,
    IWorkItemsRemovedPayload,
    IWorkItemsUpdatedPayload,
    IWorkItemTransitionsUpdatedPayload,
} from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { 
    PullRequest_CompleteMergeDialog_WorkItemTransitionWarningOverflowSingular,
    PullRequest_CompleteMergeDialog_WorkItemTransitionWarningOverflowPlural,
} from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export interface WorkItemTransitionWarning {
    message: string; // the transition warning message to show
    link?: string; // the url for the learn more link
    overflow?: string; // overflow string (e.g. N other work items can't be completed)
}

export class RelatedWorkItemsStore extends RemoteStore {
    private _workItems: IDictionaryNumberTo<WorkItemNextStateOnTransition>;

    private static readonly TRANSITION_ERROR_LINKS = {
        "VS1640134": "https://go.microsoft.com/fwlink/?linkid=854123",
        "VS1640135": "https://go.microsoft.com/fwlink/?linkid=858200",
    };

    constructor() {
        super();
        this._workItems = {};
    }

    @autobind
    public onWorkItemAdded (payload: IWorkItemAddedPayload): void {
        this._workItems[payload.workItemId] = {} as WorkItemNextStateOnTransition;
        this.emitChanged();
    }

    @autobind
    public onWorkItemsRemoved(payload: IWorkItemsRemovedPayload): void {
        payload.workItemIds.forEach(id => { 
            delete this._workItems[id];
        });
        this.emitChanged();
    }

    @autobind
    public onWorkItemsUpdated(payload: IWorkItemsUpdatedPayload): void {
        payload.workItems.forEach(item => {
            const itemId : number = parseInt(item.id);
            this._workItems[itemId] = this._workItems[itemId] || {} as WorkItemNextStateOnTransition;
        });
        this._loading = false;
        this.emitChanged();
    }

    @autobind
    public onWorkItemTransitionsUpdated(payload: IWorkItemTransitionsUpdatedPayload): void {
        if (!payload.workItemTransitions || !payload.workItemTransitions.length) {
            return;
        }
        
        payload.workItemTransitions.forEach(transition => {
            if (this._workItems[transition.id]) {
                this._workItems[transition.id] = transition;
            }
        });
        this.emitChanged();
    }

    public getWorkItems(): number[] {
        return Object.keys(this._workItems).map(key => Number(key)).sort();
    }

    public getWorkItemTransitions(): WorkItemNextStateOnTransition[] {
        return Object.keys(this._workItems).map(key => this._workItems[key]);
    }

    public getWorkItemTransitionWarning(): WorkItemTransitionWarning {
        const workItemTransitions: WorkItemNextStateOnTransition[] = this.getWorkItemTransitions();
        const workItemTransitionsWithProblems: WorkItemNextStateOnTransition[] = 
            (workItemTransitions || []).filter(transition => transition.message);

        if (!workItemTransitionsWithProblems.length) {
            return null;
        }

        const transitionToShow: WorkItemNextStateOnTransition = workItemTransitionsWithProblems[0];
        const hasOverflow: boolean = workItemTransitionsWithProblems.length > 1;
        const overflow: string = workItemTransitionsWithProblems.length > 2
            ? format(PullRequest_CompleteMergeDialog_WorkItemTransitionWarningOverflowPlural, workItemTransitionsWithProblems.length - 1)
            : PullRequest_CompleteMergeDialog_WorkItemTransitionWarningOverflowSingular;

        return {
            message: transitionToShow.message,
            link: (transitionToShow.errorCode && RelatedWorkItemsStore.TRANSITION_ERROR_LINKS[transitionToShow.errorCode]) || null,
            overflow: (hasOverflow && overflow) || null,
        };
    }
}