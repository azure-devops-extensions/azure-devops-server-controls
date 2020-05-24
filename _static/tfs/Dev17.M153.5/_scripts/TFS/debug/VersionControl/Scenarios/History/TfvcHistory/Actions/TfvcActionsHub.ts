import { RepositoryChangedPayload } from 'VersionControl/Scenarios/History/CommonPayloadInterfaces';
import { CriteriaChangedPayload, ErrorPayload, TfvcHistoryListPayload, TfvcHistoryLoadStartPayload } from 'VersionControl/Scenarios/History/TfvcHistory/TfvcInterfaces';
import { Action } from 'VSS/Flux/Action';

export class TfvcActionsHub {
    public currentRepositoryChanged = new Action<RepositoryChangedPayload>()
    public pathEditingStarted = new Action<string>();
    public pathEdited = new Action<string>();
    public pathEditingCancelled = new Action<void>();

    public criteriaChanged = new Action<CriteriaChangedPayload>();

    public tfvcHistoryItemsLoaded = new Action<TfvcHistoryListPayload>();
    public changeTypeHistoryItemsCollapsed = new Action<number>();
    public tfvcHistoryItemsLoadStarted = new Action<TfvcHistoryLoadStartPayload>();
    public errorRaised = new Action<ErrorPayload>();
    public tfvcHistoryClearAllErrorsRaised = new Action<void>();
    public errorFlushed = new Action<Error>();
}