import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Yaml/YamlEditorView";

import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { HistoryStore } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryStore";
import { HistoryTab } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/HistoryTab/HistoryTab";
import { VariablesTabStore } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/VariablesTab/VariablesTabStore";
import { YamlClient } from "PipelineWorkflow/Scripts/Editor/Yaml/YamlClient";
import { IYamlEditorViewState, YamlEditorViewStore } from "PipelineWorkflow/Scripts/Editor/Yaml/YamlEditorViewStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { VariablesTab } from "PipelineWorkflow/Scripts/Shared/ContainerTabs/VariablesTab/VariablesTab";
import * as React from "react";
import { Hub } from "VSSUI/Hub";
import { HubHeader } from "VSSUI/HubHeader";
import { IPivotBarAction, PivotBarItem } from "VSSUI/PivotBar";
import { HubViewState } from "VSSUI/Utilities/HubViewState";

export interface IYamlEditorViewProps extends IProps {
    
}
    
export class YamlEditorView extends Component<IYamlEditorViewProps, IYamlEditorViewState> {
    private _getPivotBarItems(): JSX.Element[] {
        return [this._getSourceItem(), this._getVariablesItem(), this._getHistoryItem()];
    }

    private _getSourceItem(): JSX.Element {
        return (<PivotBarItem
            className="customPadding"
            name={"Source"}
            key={"yaml-source"}
            itemKey={"yaml-source-item-key"}
            >
            <table className={"source-details"}>
                <tr>
                    <th className="left-cell"> Source </th>
                    <th className="right-cell"> Azure Repos Git </th>
                </tr>
                <tr>
                    <th className="left-cell"> Project </th>
                    <th className="right-cell"> {this.state.teamProjectName} </th>
                </tr>
                <tr>
                    <th className="left-cell"> Repository </th>
                    <th className="right-cell"> {this.state.repositoryName} </th>
                </tr>
                <tr>
                    <th className="left-cell"> Branch </th>
                    <th className="right-cell"> {this.state.branchName} </th>
                </tr>
                <tr>
                    <th className="left-cell"> YAML path </th>
                    <th className="right-cell"> {this.state.yamlPath} </th>
                </tr>
            </table>

        </PivotBarItem>);
    }

    private _getVariablesItem(): JSX.Element {
        return (<PivotBarItem
            className="customPadding"
            name={"Variables"}
            key={"yaml-variables"}
            itemKey={"yaml-variables-item-key"}
        >
            <VariablesTab
                key={VariablesTabStore.getKey()}
                cssClass="yaml-definition-tab-container"
                tabKey={VariablesTabStore.getKey()}
                title={Resources.VariablesTabItemTitle}
                icon={(!this.state.variablesTabIsValid) ? "bowtie-icon bowtie-status-error" : null} />
        </PivotBarItem>);
    }

    private _getHistoryItem(): JSX.Element {
        return (<PivotBarItem
            className="customPadding"
            name={"History"}
            key={"yaml-history"}
            itemKey={"yaml-history-item-key"}
        >
            <HistoryTab
                key={HistoryStore.getKey()}
                cssClass="definition-tab-container"
                tabKey={HistoryStore.getKey()}
                title={Resources.HistoryTabItemTitle}
                icon={null}
            />
        </PivotBarItem>);
    }

    private _getHubHeader(): JSX.Element {
        return (
            <HubHeader />
        );
    }

    private _getHubCommandItems(): IPivotBarAction[] {
        let items: IPivotBarAction[] = [];
        let savePivotBarAction: IPivotBarAction = {
            key: "save-yaml-definition",
            name: Resources.SaveButtonText,
            title: Resources.SaveButtonText,
            onClick: this._onSaveClick,
            important: true,
            disabled: !this.state.isDirty || !this.state.isValid,
            iconProps: { className: "bowtie-icon bowtie-save" }
        };

        let createReleasePivotBarAction: IPivotBarAction = {
            key: "create-release",
            name: "Create Release",
            title: "Create Release",
            onClick: this._onCreateRelease,
            important: true,
            disabled: this.state.isDirty || !this.state.isValid,
            iconProps: { className: "bowtie-icon bowtie-save" }
        };

        items.push(savePivotBarAction);
        items.push(createReleasePivotBarAction);

        return items;
    }

    private _onSaveClick = () => {
        let definition = this.state.definition;
        definition.environments = [];
        let client = new YamlClient();
        client.updateYamlPipeline(definition).then( (def: any) => {
            window.location.reload(true);
        });
    }

    private _onCreateRelease = () => {

    }

    private _viewStore: YamlEditorViewStore;
    private _hubViewState: HubViewState;

    public constructor(props) {
        super(props);
        this._viewStore = StoreManager.GetStore<YamlEditorViewStore>(YamlEditorViewStore);
        let viewState = this._viewStore.getState();
        this.state = {
            ...this._viewStore.getState()
        } as Readonly<IYamlEditorViewState>;

  
        this._hubViewState = new HubViewState();

        this._hubViewState.selectedPivot.subscribe(this._handleSelectedPivotChange);
        this._viewStore.addChangedListener(this._handleStoreChange);
    }

    public render(): JSX.Element {
        return <Hub
            className="yaml-hub"
            hubViewState={this._hubViewState}
            showPivots={undefined}
            commands={this._getHubCommandItems()} >

            {this._getHubHeader()}
            {this._getPivotBarItems()}
        </Hub>;
    }

    private _handleStoreChange = (): void => {
        this.setState(this._viewStore.getState());
    }

    private _handleSelectedPivotChange = (arg0: any): any => {
        
    }

    private _getSourceTab(): JSX.Element {
        return (
            <div className="source-tab">
                
            </div>
        );
    }
}
