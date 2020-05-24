import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { ServiceClientManager } from "DistributedTaskControls/Common/Service/ServiceClientManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Telemetry } from "DistributedTaskControls/Common/Telemetry";
import { HistoryActions } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryActions";
import { HistoryStore } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryStore";
import { Status } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActions";
import {
    VariableGroupActionsCreator,
} from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActionsCreator";
import { NavigationStateUtils } from "PipelineWorkflow/Scripts/Common/NavigationStateUtils";
import { IEnvironmentVariablesData, IVariablesData } from "PipelineWorkflow/Scripts/Common/Types";
import { EditorActions } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { DefinitionVariablesUtils } from "PipelineWorkflow/Scripts/Editor/Common/DefinitionVariablesUtils";
import { PipelineDefinition, PipelineDefinitionRevision } from "PipelineWorkflow/Scripts/Editor/Common/Types";
import { HistoryUtils } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/HistoryTab/HistoryUtils";
import {
    DefinitionVariablesActionsCreator,
} from "PipelineWorkflow/Scripts/Editor/ContainerTabs/VariablesTab/DefinitionVariablesActionsCreator";
import { DefinitionActionsHub } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionActions";
import { DeployPipelineDefinitionSource } from "PipelineWorkflow/Scripts/Editor/Sources/DeployPipelineDefinitionSource";
import { YamlPipelineProcessActions } from "PipelineWorkflow/Scripts/Editor/Yaml/PipelineProcessStore";
import { YamlClient } from "PipelineWorkflow/Scripts/Editor/Yaml/YamlClient";
import { YamlDefinitionStore } from "PipelineWorkflow/Scripts/Editor/Yaml/YamlDefinitionStore";
import { YamlEditorContainer } from "PipelineWorkflow/Scripts/Editor/Yaml/YamlEditorContainer";
import { YamlUtils } from "PipelineWorkflow/Scripts/Editor/Yaml/YamlUtils";
import { DeployServiceClient } from "PipelineWorkflow/Scripts/ServiceClients/DeployServiceClient";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { ReleaseDefinition, VariableGroup, YamlPipelineProcess } from "ReleaseManagement/Core/Contracts";
import { NavigationView } from "VSS/Controls/Navigation";

export class YamlNavigationView extends NavigationView {
    public initializeOptions(options) {
        super.initializeOptions(JQueryWrapper.extend({
            attachNavigate: true
        }, options));

        // Initialize the store
        this._store = StoreManager.GetStore<YamlDefinitionStore>(YamlDefinitionStore);
    }

    public onNavigate(state: any) {
        this.getElement().addClass("yaml-view");

        // This is required for the variables tab to appear
        this.getElement().attr("style", "height: 100%");

        if (state) {
            const action = this._options.action = NavigationStateUtils.getAction().toLowerCase();
            const pageSource = NavigationStateUtils.getRequestSource();
            let definitionId = NavigationStateUtils.getDefinitionId();

            switch (action){
                case EditorActions.ACTION_CREATE_DEFINITION:
                    this._create();
                    this._createView(action);
                    break;
                case EditorActions.ACTION_EDIT_DEFINITION:
                    this._edit(definitionId).then(() => {
                        this._createView(action);
                    });
                    break;
                default:

            }
        }
    }

    /**
     * @brief Initialize the main Store, ActionCreator and ServiceClient
     */
    public initialize(): void {
        super.initialize();

        Telemetry.instance().setArea("Deployment-Definition");
        
        // Initialize the Service Client manager with DeployServiceClient object
        ServiceClientManager.GetServiceClient<DeployServiceClient>(DeployServiceClient);
    }

    private _create() {
        let definitionHub = ActionsHubManager.GetActionsHub<DefinitionActionsHub>(DefinitionActionsHub);
        let yamlHub = ActionsHubManager.GetActionsHub<YamlPipelineProcessActions>(YamlPipelineProcessActions);
        let definition = YamlUtils.getEmptyYamlDefinition();

        definitionHub.createDefinition.invoke(definition);
        yamlHub.create.invoke(definition.pipelineProcess as YamlPipelineProcess);
    }

    private _edit(definitionId: number): IPromise<void> {
        let definitionHub = ActionsHubManager.GetActionsHub<DefinitionActionsHub>(DefinitionActionsHub);
        let yamlHub = ActionsHubManager.GetActionsHub<YamlPipelineProcessActions>(YamlPipelineProcessActions);
        let client = new YamlClient();
        return client.getYamlDefinition(definitionId).then((definition: ReleaseDefinition) => {
            definitionHub.createDefinition.invoke(definition);
            yamlHub.create.invoke(definition.pipelineProcess as YamlPipelineProcess);

            let variablesData: IVariablesData = DefinitionVariablesUtils.mapDefinitionToVariablesData(definition);
            let variablesActionsCreator = ActionCreatorManager.GetActionCreator<DefinitionVariablesActionsCreator>(DefinitionVariablesActionsCreator);
            variablesActionsCreator.invokeCreateDefinitionActions(variablesData, false);
            const updateScopePermissionsPromise = variablesActionsCreator.invokeUpdateDefinitionScopePermissionsActions(variablesData);

            this._initializeVariableGroups(definition);
            this._fetchDefinitionRevisions(definition.id);
        });
    }

    private _fetchDefinitionRevisions(definitionId: number) {
        
        // Initialize Store
        StoreManager.GetStore<HistoryStore>(HistoryStore);
        DeployPipelineDefinitionSource.instance().getDefinitionRevisions(definitionId).then(
            (releaseDefinitionRevisions: PipelineDefinitionRevision[]) => {
                let historyActions = ActionsHubManager.GetActionsHub<HistoryActions>(HistoryActions);
                historyActions.UpdateRevisions.invoke(HistoryUtils.convertPipelineDefinitionRevisionToColumn((releaseDefinitionRevisions)));
            }
        );
    }

    private _initializeVariableGroups(definition: PipelineDefinition): IPromise<void> {
        // Fire the action to fetch the linkable variable groups in anticipation that
        // user may add/update variable group
        let variableGroupActionCreator  = ActionCreatorManager.GetActionCreator<VariableGroupActionsCreator>(VariableGroupActionsCreator);
        variableGroupActionCreator.fetchLinkableVariableGroups();

        variableGroupActionCreator.updateInitializeVariableGroupsStatus({ status: Status.InProgress });

        return DefinitionVariablesUtils.beginGetVariableGroups(definition).then((variableGroups: VariableGroup[]) => {
            variableGroupActionCreator.updateInitializeVariableGroupsStatus({ status: Status.Success });

            let environments: IEnvironmentVariablesData[] = DefinitionVariablesUtils.getEnvironmentVariablesData(definition.environments);

            variableGroupActionCreator.handleInitializeVariableGroups(
                DefinitionVariablesUtils.getVariableGroupReferences(definition),
                variableGroups,
                DefinitionVariablesUtils.getScopes(environments),
            );
        }, (error: any) => {
            const message = error.message || error;
            variableGroupActionCreator.updateInitializeVariableGroupsStatus({ status: Status.Failure, message: message });
        });

    }

    private _createView(action: string): void {

        if (this._view) {
            StoreManager.dispose();
            ActionCreatorManager.dispose();
            ReactDOM.unmountComponentAtNode(this.getElement()[0]);
//             this._initializeFlux();
        }

        // Start the rendering of React based view
        this._view = ReactDOM.render(React.createElement(YamlEditorContainer, { action: action }), this.getElement()[0]);

        // Do a dummy markdown render so that the required modules for markdown are available.
        //MarkdownRenderer.marked("markdown-preload-helper");
    }

    private _view: YamlEditorContainer;
    private _store: YamlDefinitionStore;
    
}