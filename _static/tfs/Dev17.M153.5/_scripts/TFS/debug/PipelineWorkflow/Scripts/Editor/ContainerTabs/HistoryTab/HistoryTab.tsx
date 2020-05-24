/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import * as ContainerTabBase from "DistributedTaskControls/SharedViews/ContainerTabs/ContainerTabBase";
import { History } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/History";
import { HistoryStore, IHistoryState } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryStore";
import { IRevisionsData } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryStore";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { DialogWithMultiLineTextInput } from "DistributedTaskControls/Components/DialogWithMultiLineTextInput";
import { HistoryActionsCreator } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryActionsCreator";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { CodeEditorIntegration } from "PipelineWorkflow/Scripts/Shared/CodeEditor/CodeEditorIntegration";

import { PipelineHistorySource } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/HistoryTab/HistorySource";
import { CoreDefinitionStore } from "PipelineWorkflow/Scripts/Editor/Definition/CoreDefinitionStore";
import { DefinitionActionsCreator } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionActionsCreator";

import * as Utils_String from "VSS/Utils/String";
import { Telemetry, Feature } from "DistributedTaskControls/Common/Telemetry";

export class HistoryTab extends Base.Component<ContainerTabBase.IContainerTabBaseProps, IHistoryState> {

    public componentWillMount() {
        this._historyStore = StoreManager.GetStore<HistoryStore>(HistoryStore);
        this._coreDefinitionStore = StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore);
        this._definitionId = this._coreDefinitionStore.getState().id;

        this._historyStore.addChangedListener(this._onChange);
        this._coreDefinitionStore.addChangedListener(this._onCoreDefinitionStoreChange);
        this._definitionActionsCreator = ActionCreatorManager.GetActionCreator<DefinitionActionsCreator>(DefinitionActionsCreator);
        this._historyActionsCreator = ActionCreatorManager.GetActionCreator<HistoryActionsCreator>(HistoryActionsCreator);

        this.setState(this._historyStore.getState());
    }

    public render() {
        return (
            <div>
                <History
                    definitionId={this._definitionId}
                    sourceInstance={PipelineHistorySource.instance()}
                    isRevertSupported={true}
                    displayHistory={this.state.displayHistory}
                    revisions={this.state.revisions}
                    revisionsDiffData={this.state.revisionsDiffData}
                    isRevertToRevisionAllowed={this._isRevertToRevisionAllowed}
                    useNewDiffEditor={true} />

                <DialogWithMultiLineTextInput
                    okButtonText={DTCResources.OK}
                    okButtonAriaLabel={DTCResources.OK}
                    cancelButtonAriaLabel={DTCResources.CancelButtonText}
                    cancelButtonText={DTCResources.CancelButtonText}
                    titleText={DTCResources.SaveButtonText}
                    multiLineInputLabel={DTCResources.CommentText}
                    showDialog={this.state.showSaveDialog}
                    onOkButtonClick={this._onSaveClick}
                    onCancelButtonClick={this._hideSaveDialog}
                    okDisabled={false} />
            </div>
        );
    }

    public componentWillUnmount(): void {
        this._historyStore.removeChangedListener(this._onChange);
        this._coreDefinitionStore.removeChangedListener(this._onCoreDefinitionStoreChange);
    }

    private _onChange = (): void => {
        this.setState(this._historyStore.getState());
    }

    private _onCoreDefinitionStoreChange = (): void => {
        this._definitionId = this._coreDefinitionStore.getState().id;
        this.setState(this._historyStore.getState());
    }

    private _onSaveClick = (comment: string) => {
        let revertToRevision = this.state.revisions.filter(rev => rev.revisionNumber === this.state.revertToRevision)[0];
        if (!revertToRevision || !revertToRevision.apiVersion) {
            throw new Error("Revert RD called with no api version RD revision");
        }

        let maxRevisionNumber = Math.max(...this.state.revisions.map(rev => rev.revisionNumber));
        this._definitionActionsCreator.revertDefinition(this._definitionId, this.state.revertToRevision, maxRevisionNumber, comment, revertToRevision.apiVersion);
        this._hideSaveDialog();
    }

    private _hideSaveDialog = () => {
        this._historyActionsCreator.closeRevertConfirmationDialog();
    }

    private _isRevertToRevisionAllowed = (revision: IRevisionsData): boolean => {
        return !!revision.apiVersion;
    }

    private _historyStore: HistoryStore;
    private _coreDefinitionStore: CoreDefinitionStore;
    private _definitionId: number;
    private _definitionActionsCreator: DefinitionActionsCreator;
    private _historyActionsCreator: HistoryActionsCreator;
}


