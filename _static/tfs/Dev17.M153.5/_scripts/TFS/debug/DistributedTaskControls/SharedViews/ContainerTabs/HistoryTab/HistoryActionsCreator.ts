import * as Q from "q";

import * as Actions from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryActions";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";

import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";

import { IHistorySource } from "DistributedTaskControls/Sources/HistorySource";

export class HistoryActionsCreator extends ActionsBase.ActionCreatorBase {

    public static getKey(): string {
        return ActionCreatorKeys.HistoryActionsCreator;
    }

    public initialize(): void {
        this._historyActions = ActionsHubManager.GetActionsHub<Actions.HistoryActions>(Actions.HistoryActions);
    }

    public getRevisionDiff(historySource: IHistorySource, definitionId: number | string, olderRevision: number, newerRevision: number): void {

        let leftPromise: IPromise<string> = historySource.getDefinitionRevision(definitionId, olderRevision);
        let rightPromise: IPromise<string> = historySource.getDefinitionRevision(definitionId, newerRevision);

        Q.all([leftPromise, rightPromise]).spread((leftData: string, rightData: string) => {
            this._historyActions.ShowDiffData.invoke({
                originalVersion: olderRevision,
                modifiedVersion: newerRevision,
                originalVersionContent: JSON.stringify(JSON.parse(leftData), null, 2),
                modifiedVersionContent: JSON.stringify(JSON.parse(rightData), null, 2)
            } as Actions.IRevisionsDiffData);
        });
    }

    public displayHistory(showHistory: boolean): void {
        this._historyActions.DisplayHistory.invoke(showHistory);
    }

    public setRevertToRevision(revertToRevision: number): void {
        this._historyActions.SetRevertToRevision.invoke(revertToRevision);
    }

    public closeRevertConfirmationDialog(): void {
        this._historyActions.CloseRevertConfirmationDialog.invoke(null);
    }

    private _historyActions: Actions.HistoryActions;
}
