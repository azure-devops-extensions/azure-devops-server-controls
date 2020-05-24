import { autobind } from "OfficeFabric/Utilities";

// actions
import { PullRequestAutoCompleteActionCreator } from "VersionControl/Scenarios/PullRequestDetail/Actions/PullRequestAutoCompleteActionCreator";
import { PullRequestClientPoliciesActionCreator } from "VersionControl/Scenarios/PullRequestDetail/Actions/PullRequestClientPoliciesActionCreator";
import { ActionsHub } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { StoresHub } from "VersionControl/Scripts/Stores/PullRequestReview/StoresHub";

// sources
import { IRelatedWorkItemSource } from "VersionControl/Scripts/Sources/RelatedWorkItemSource";
import { SourcesHub } from "VersionControl/Scripts/Sources/SourcesHub";

import { PullRequestPolicyTypeIds } from "VersionControl/Scenarios/PullRequestDetail/Policy/ClientPolicyEvaluation";

/**
 * Actions associated with work items.
 */
export class WorkItemActionCreator {
    private _relatedWorkItemSource: IRelatedWorkItemSource;
    private _policyActionCreator: PullRequestClientPoliciesActionCreator;
    private _autoCompleteActionCreator: PullRequestAutoCompleteActionCreator;

    private _actionsHub: ActionsHub;
    private _storesHub: StoresHub;

    constructor(
        policyActionCreator: PullRequestClientPoliciesActionCreator,
        autoCompleteActionCreator: PullRequestAutoCompleteActionCreator,
        actionsHub: ActionsHub,
        sourcesHub: SourcesHub,
        storesHub: StoresHub) {
        this._policyActionCreator = policyActionCreator;
        this._autoCompleteActionCreator = autoCompleteActionCreator;
        this._relatedWorkItemSource = sourcesHub.relatedWorkItemSource;
        this._actionsHub = actionsHub;
        this._storesHub = storesHub;
    }

    public updateAssociatedWorkItems(pullRequestId: number): void {
        this._actionsHub.workItemsUpdating.invoke(null);

        // get initial workflows and fire initialize action for related workflow items
        this._relatedWorkItemSource.queryWorkItemsAsync(pullRequestId)
            .then(workItems => {
                this._actionsHub.workItemsUpdated.invoke({ workItems: workItems });

                if (this._storesHub.permissionsStore.getPermissions().complete) {
                    this.queryAssociatedWorkItemTransitions(workItems.map(item => parseInt(item.id)));
                }
            })
            .then(() => {
                this._requestPolicyEvaluation();
            })
            .then(undefined, this.raiseError);
    }

    public addAssociatedWorkItem(artifactUri: string, workItemId: number): void {
        this._relatedWorkItemSource.addWorkItemAsync(artifactUri, workItemId)
            .then(() => {
                this._actionsHub.workItemAdded.invoke({ workItemId: workItemId });

                if (this._storesHub.permissionsStore.getPermissions().complete) {
                    this.queryAssociatedWorkItemTransitions([workItemId]);
                }
            })
            .then(() => {
                this._requestPolicyEvaluation();
            })
            .then(undefined, this.raiseError);
    }

    public removeAssociatedWorkItems(artifactUri: string, workItemIds: number[]): void {
        // Remove from UI first, we expect that eventually the link will be deleted
        this._actionsHub.workItemsRemoving.invoke({ workItemIds: workItemIds });

        this._relatedWorkItemSource.removeWorkItemsAsync(artifactUri, workItemIds)
            .then(() => this._actionsHub.workItemsRemoved.invoke({ workItemIds: workItemIds }))
            .then(() => {
                // but policy evaluations need to be updated after the removal has actually happened.
                this._requestPolicyEvaluation();
            })
            .then(undefined, this.raiseError);
    }

    public queryAssociatedWorkItemTransitions(workItemIds: number[]): void {
        if (!workItemIds || !workItemIds.length) {
            return;
        }

        this._relatedWorkItemSource.queryWorkItemTransitionsAsync(workItemIds)
            .then(workItemTransitions => this._actionsHub.workItemTransitionsUpdated.invoke({ workItemTransitions }))
            .then(undefined, this.raiseError);
    }

    /**
     * Raise an application error. This could be a typical JS error or some text.
     */
    @autobind
    public raiseError(error: any): void {
        this._actionsHub.raiseError.invoke(error);
    }

    private _requestPolicyEvaluation(): void {
        // query policy evaluation for work item linking policy
        this._policyActionCreator.queryPolicyEvaluationsByType(PullRequestPolicyTypeIds.WorkItemLinkingPolicy);

        // update blocking autocomplete criteria
        this._autoCompleteActionCreator.getBlockingAutoCompletePolicies();
    }
}
