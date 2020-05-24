import { Artifact } from "VSS/Artifacts/Services";
import * as Utils_Array from "VSS/Utils/Array";
import { LinkWorkItemsActionsHub } from "Wiki/Scenarios/Integration/LinkWorkItems/LinkWorkItemsActionsHub";
import { LinkWorkItemsSource } from "Wiki/Scenarios/Integration/LinkWorkItems/LinkWorkItemsSource";

export class LinkWorkItemsActionCreator {
    constructor(
        private _actionsHub: LinkWorkItemsActionsHub,
        private _linkWorkItemsSource: LinkWorkItemsSource,
        private _projectId: string,
    ) {
    }

    public fetchLinkedWorkItems(artifactUri: string): void {
        this._linkWorkItemsSource.getWorkItemIdsForArtifactUri(artifactUri, this._projectId).then(
            (workItemIds: number[]) => {
                this._actionsHub.workItemsFetched.invoke(workItemIds);
            },
            (error: Error) => {
                this._actionsHub.errorRaised.invoke(error.message);
            },
        );
    }

    public saveWorkItems(
        savedWorkItemIds: number[],
        draftWorkItemIds: number[],
        artifactUri: string,
        artifactLinkName: string,
    ): void {
        this._actionsHub.savingStarted.invoke(null);

        const workItemsToAdd = draftWorkItemIds.filter((workItem: number) => {
            return savedWorkItemIds.indexOf(workItem) < 0;
        })

        const workItemsToRemove = savedWorkItemIds.filter((workItem: number) => {
            return draftWorkItemIds.indexOf(workItem) < 0;
        })

        if (workItemsToAdd.length > 0) {
            this._linkWorkItemsSource.addWorkItemsAsync(workItemsToAdd, artifactUri, artifactLinkName).then(
                () => {
                    this._removeWorkItemsAsync(workItemsToRemove, artifactUri);
                },
                (error: Error) => {
                    this._actionsHub.errorRaised.invoke(error.message);
                },
            );
        } else {
            this._removeWorkItemsAsync(workItemsToRemove, artifactUri);
        }
    }

    public addWorkItemToDraft(workItemId: number): void {
        this._actionsHub.addWorkItemToDraft.invoke(workItemId);
    }

    public removeWorkItemFromDraft(workItemId: number): void {
        this._actionsHub.removeWorkItemFromDraft.invoke(workItemId);
    }

    private _removeWorkItemsAsync(workItemIds: number[], artifactUri: string): void {
        if (workItemIds.length > 0) {
            this._linkWorkItemsSource.removeWorkItemsAsync(workItemIds, artifactUri).then(
                () => {
                    this._actionsHub.workItemsUpdated.invoke(null);
                },
                (error: Error) => {
                    this._actionsHub.errorRaised.invoke(error.message);
                },
            );
        } else {
            this._actionsHub.workItemsUpdated.invoke(null);
        }
    }
}