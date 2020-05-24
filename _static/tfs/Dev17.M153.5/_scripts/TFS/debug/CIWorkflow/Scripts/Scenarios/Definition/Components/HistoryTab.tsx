/// <reference types="react" />

import * as React from "react";

import { BuildDefinitionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActionsCreator";
import { Component as SaveDefinitionDialog } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SaveDefinitionDialog";
import { BuildHistorySource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/BuildHistorySource";
import { CodeEditorIntegration } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/CodeEditorIntegration";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ITabItemProps } from "DistributedTaskControls/Common/Types";
import { History } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/History";
import { HistoryActionsCreator } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryActionsCreator";
import { HistoryStore, IHistoryState, IRevisionsData } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryStore";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";

export interface IHistoryProps extends ITabItemProps {
    definitionId: number;
    currentRevision: number;
}

export class HistoryTab extends Base.Component<IHistoryProps, IHistoryState> {
    private _historyStore: HistoryStore;
    private _historyActionsCreator: HistoryActionsCreator;
    private _buildDefinitionActionsCreator: BuildDefinitionActionsCreator;
    
    public componentWillMount() {
        this._historyStore = StoreManager.GetStore<HistoryStore>(HistoryStore);
        this._historyActionsCreator = ActionCreatorManager.GetActionCreator<HistoryActionsCreator>(HistoryActionsCreator);
        this._buildDefinitionActionsCreator = ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator);

        this.setState(this._historyStore.getState());

        this._historyStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        this._historyStore.removeChangedListener(this._onChange);
    }

    private _onChange = (): void => {
        this.setState(this._historyStore.getState());
    }

    public render(): JSX.Element {
        return (
            <div>
                <History
                    definitionId={this.props.definitionId}
                    sourceInstance={BuildHistorySource.instance()}
                    isRevertSupported={true}
                    displayHistory={this.state.displayHistory}
                    revisions={this.state.revisions}
                    isRevertToRevisionAllowed={(revision: IRevisionsData): boolean => { return true; } } />

                <SaveDefinitionDialog
                    showDialog={this.state.showSaveDialog}
                    onCloseDialog={this._onCloseSaveDialog}
                    onSave={this._onDialogSaveClick}
                    hideFolderPicker={true} />
            </div>
        );
    }

    public componentDidUpdate() {

        if (!this.state.displayHistory) {
            let codeEditorIntegration: CodeEditorIntegration = new CodeEditorIntegration("tfs.source-control.diff-viewer", $(".history-diff-viewer-container"));
            codeEditorIntegration.setConfiguration({
                opath: "opath",
                oversion: this.state.revisionsDiffData.originalVersion,
                ocontent: this.state.revisionsDiffData.originalVersionContent,
                ocontentType: "application/json",
                mpath: "mpath",
                mversion: this.state.revisionsDiffData.modifiedVersion,
                mcontent: this.state.revisionsDiffData.modifiedVersionContent,
                mcontentType: "application/json",
                lineNumbers: true
            });
        }
    }

    private _onDialogSaveClick = (comment: string, path: string) => {
        this._buildDefinitionActionsCreator.revertBuildDefinition(this.props.definitionId, this.props.currentRevision, this.state.revertToRevision, comment);
    }

    private _onCloseSaveDialog = () => {
        this._historyActionsCreator.closeRevertConfirmationDialog();
    }
}