/// <reference types="react" />
import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import * as ContainerTabBase from "DistributedTaskControls/SharedViews/ContainerTabs/ContainerTabBase";
import { History } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/History";
import { HistoryStore, IHistoryState } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryStore";
import { HistoryColumnKeys } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryConstants";
import { IRevisionsData } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryStore";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { CodeEditorIntegration } from "PipelineWorkflow/Scripts/Shared/CodeEditor/CodeEditorIntegration";
import { ReleaseHistorySource } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/HistoryTab/HistorySource";
import { HistoryTabActionsCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/HistoryTab/HistoryTabActionsCreator";
import * as Utils_String from "VSS/Utils/String";
import { Telemetry, Feature } from "DistributedTaskControls/Common/Telemetry";

export interface IHistoryTabProps extends Base.IProps {
    releaseId: number;
}

export class HistoryTab extends Base.Component<IHistoryTabProps, IHistoryState> {

    public componentWillMount() {
        this._historyStore = StoreManager.GetStore<HistoryStore>(HistoryStore);
        this._historyTabActionCreator = ActionCreatorManager.GetActionCreator<HistoryTabActionsCreator>(HistoryTabActionsCreator);
        this._historyStore.addChangedListener(this._onChange);
        this.setState(this._historyStore.getState());
    }

    public componentDidMount() {
        this._historyTabActionCreator.getRevisions(this.props.releaseId);
    }

    public render() {
        return (
            <div>
                <History
                    instanceId={this.props.releaseId.toString()}
                    definitionId={this.props.releaseId}
                    sourceInstance={ReleaseHistorySource.instance()}
                    actions={null}
                    columns={[HistoryColumnKeys.changedBy, HistoryColumnKeys.changedDate, HistoryColumnKeys.changeType,
                         HistoryColumnKeys.changeDetails, HistoryColumnKeys.comment]}
                    isRevertSupported={false}
                    displayHistory={this.state.displayHistory}
                    revisions={this.state.revisions}
                    revisionsDiffData={this.state.revisionsDiffData}
                    useNewDiffEditor={true} />
            </div>
        );
    }

    public componentWillUnmount(): void {
        this._historyStore.removeChangedListener(this._onChange);
    }

    private _onChange = (): void => {
        this.setState(this._historyStore.getState());
    }

    private _historyStore: HistoryStore;
    private _historyTabActionCreator: HistoryTabActionsCreator;
    private _releaseId: number;
}


