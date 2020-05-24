/**
 *  This file implements actions related to Environments
 */
import * as Q from "q";

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { MessageHandlerActions, IAddMessagePayload } from "DistributedTaskControls/Actions/MessageHandlerActions";
import { Actions as ItemSelectorActions } from "DistributedTaskControls/Actions/ItemSelectorActions";
import { OverlayPanelActions } from "DistributedTaskControls/Actions/OverlayPanelActions";
import { Store as ItemSelectionStore } from "DistributedTaskControls/Stores/ItemSelectionStore";
import { OverlayPanelStore } from "DistributedTaskControls/Stores/OverlayPanelStore";
import { ProcessVariablesActionCreator } from "DistributedTaskControls/Variables/ProcessVariables/Actions/ProcessVariablesActionCreator";
import { VariableGroupActions } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActions";
import { Item } from "DistributedTaskControls/Common/Item";
import { IScope } from "DistributedTaskControls/Variables/Common/Types";
import { Telemetry, Feature } from "DistributedTaskControls/Common/Telemetry";

import { ErrorMessageParentKeyConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import * as CommonTypes from "PipelineWorkflow/Scripts/Common/Types";
import { EnvironmentListActionsHub } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListActionsHub";
import { EnvironmentActionsCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentActionsCreator";
import { EnvironmentTriggerActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTriggerActionCreator";
import { DeployPipelineDefinitionSource } from "PipelineWorkflow/Scripts/Editor/Sources/DeployPipelineDefinitionSource";
import { MoveDirection } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentNodeMover";
import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListStore";
import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { EnvironmentCorePropertiesItem } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentCorePropertiesItem";
import { DeployEnvironmentStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStore";
import { CoreDefinitionStore } from "PipelineWorkflow/Scripts/Editor/Definition/CoreDefinitionStore";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

/**
 * @brief Raises actions related to Environment list
 */
export class EnvironmentListActionsCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_EnvironmentListActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._environmentListActionsHub = ActionsHubManager.GetActionsHub<EnvironmentListActionsHub>(EnvironmentListActionsHub);
        this._processVariablesActionCreator = ActionCreatorManager.GetActionCreator<ProcessVariablesActionCreator>(ProcessVariablesActionCreator);
        this._messageHandlerActions = ActionsHubManager.GetActionsHub<MessageHandlerActions>(MessageHandlerActions);
        this._environmentListStore = StoreManager.GetStore<EnvironmentListStore>(EnvironmentListStore);
        this._coreDefinitionStore = StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore);
        this._itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions, CanvasSelectorConstants.CanvasSelectorInstance);
        this._overlayPanelActions = ActionsHubManager.GetActionsHub<OverlayPanelActions>(OverlayPanelActions, CanvasSelectorConstants.CanvasSelectorInstance);
        this._variableGroupActions = ActionsHubManager.GetActionsHub<VariableGroupActions>(VariableGroupActions);
    }

    public createEnvironmentList(environments: CommonTypes.PipelineDefinitionEnvironment[]): void {
        this._environmentListActionsHub.createEnvironmentList.invoke({
            environments: environments
        });
    }

    public updateEnvironmentList(environments: CommonTypes.PipelineDefinitionEnvironment[], force?: boolean): void {
        this._environmentListActionsHub.updateEnvironmentList.invoke({
            environments: environments,
            force: force
        });

        environments.forEach((environment: CommonTypes.PipelineDefinitionEnvironment) => {

            // child stores required for the environment should also have the same instance id
            let instanceId: string = this._environmentListStore.getEnvironmentInstanceId(environment.id);
            let environmentActionsCreator = ActionCreatorManager.GetActionCreator<EnvironmentActionsCreator>(EnvironmentActionsCreator,
                instanceId);

            environmentActionsCreator.updateEnvironment(environment, force);
        });
    }

    public cloneEnvironment(
        environmentId: number, 
        onMoveEnvironment?: (instanceId: string, moveDirection: MoveDirection, onMoveComplete: () => void) => void,
        isMoveEnvironmentEnabled?: (instanceId: string, moveDirection: MoveDirection) => boolean): void {

        this._environmentListActionsHub.cloneEnvironment.invoke(environmentId);
        this.selectNewlyAddedEnvironment(onMoveEnvironment, isMoveEnvironmentEnabled);
        this._cloneVariables(environmentId);
    }
    
    public deleteEnvironment(environmentId: number, isTemporaryEnvironment: boolean = false): void {
        if (isTemporaryEnvironment){
            this._restoreSelection();
        }else{
            Telemetry.instance().publishEvent(Feature.DeleteEnvironment);
        }

        let stores = this._environmentListStore.getDataStoreList();
        let storeToBeRemoved = stores.filter(e => e.getEnvironmentId() === environmentId)[0];

        let length = stores.length;
        // First delete all triggers
        for (let i = 0; i < length; i++) {
            let currentStoreState = stores[i].getCurrentState();
            let storeDependsOnDeletedStore = currentStoreState.conditions.some(
                    e => e.conditionType === RMContracts.ConditionType.EnvironmentState 
                    && Utils_String.localeIgnoreCaseComparer(e.name, storeToBeRemoved.getEnvironmentName()) === 0
                );

            if (storeDependsOnDeletedStore) {
                let conditions = Utils_Array.clone(stores[i].getCurrentState().conditions);
                let indexToDelete = Utils_Array.findIndex(conditions, con => {
                    return Utils_String.localeIgnoreCaseComparer(con.name, storeToBeRemoved.getEnvironmentName()) === 0;
                });
                
                if (indexToDelete >= 0){
                    Utils_Array.removeAtIndex(conditions, indexToDelete);
                    let actionsHub = ActionCreatorManager.GetActionCreator<EnvironmentTriggerActionCreator>(EnvironmentTriggerActionCreator, stores[i].getInstanceId());
                    actionsHub.updatePostEnvironmentTrigger(currentStoreState.id, conditions);
                }
            }
        }

        // Delete variables
        this._processVariablesActionCreator.deleteScope({
            key: environmentId,
            value: storeToBeRemoved.getEnvironmentName()
        });

        // Delete variable groups
        this._variableGroupActions.deleteScope.invoke({
            key: environmentId,
            value: storeToBeRemoved.getEnvironmentName()
        });

        // Environment is now safe to delete.
        this._environmentListActionsHub.deleteEnvironment.invoke(environmentId);

        // Recalculate ranks
        this._updateRanks();

        this._environmentListActionsHub.refreshEnvironmentsCanvas.invoke(null);

        // If the overlay was previously hidden, but was opened to bring the new environment 
        // place holder into view, close it if the user choses to not add the new environment.
        if (!this._isItemDetailsOpen && isTemporaryEnvironment) {
            this._overlayPanelActions.hideOverlay.invoke({});
        }
    }

    public deleteEnvironmentByInstanceId(instanceId: string, isTemporaryEnvironment: boolean = false): void {
        let selectedEnvironmentId = this._environmentListStore.getEnvironmentIdFromInstanceId(instanceId);
        this.deleteEnvironment(selectedEnvironmentId, isTemporaryEnvironment);
    }

    public createNewEnvironment(
        templateId: string, 
        parentEnvironmentId?: number, 
        isTemporary?: boolean,
        onMoveEnvironment?: (instanceId: string, moveDirection: MoveDirection, onMoveComplete: () => void) => void,
        isMoveEnvironmentEnabled?: (instanceId: string, moveDirection: MoveDirection) => boolean): IPromise<{}> {
        
        return DeployPipelineDefinitionSource.instance().getEnvironmentTemplate(templateId).then(
            (template: RMContracts.ReleaseDefinitionEnvironmentTemplate) => {
                this._environmentListActionsHub.createEnvironment.invoke({
                    template: template,
                    parentEnvironmentId: parentEnvironmentId,
                    isTemporary: !!isTemporary
                });

                this.selectNewlyAddedEnvironment(onMoveEnvironment, isMoveEnvironmentEnabled);

                // If overlay is hidden show it to ensure that the 
                // new environment place-holder is always visible to the user.
                this._showOverlayIfHidden();
                return Q.resolve();
            },
            (error) => {
                this._handleError(error);
                return Q.reject();
            });
    }

    public selectNewlyAddedEnvironment(
        onMoveEnvironment: (instanceId: string, moveDirection: MoveDirection, onMoveComplete: () => void) => void,
        isMoveEnvironmentEnabled: (instanceId: string, moveDirection: MoveDirection) => boolean): void {
            
        let environmentId = this._environmentListStore.getLastLocallyAddedEnvironmentId();
        if (!environmentId) {
            return;
        }

        let instanceId: string = this._environmentListStore.getEnvironmentInstanceId(environmentId);

        const coreState = this._coreDefinitionStore.getState();

        // pradeepn: Selecting an item by creating a new item is a design problem and will not scale
        // This pattern needs to be fixed. 
        this._itemSelectorActions.selectItem.invoke({ data: new EnvironmentCorePropertiesItem(coreState.folderPath, coreState.id, instanceId, onMoveEnvironment, isMoveEnvironmentEnabled) });
    }

    public selectEnvironmentItemByInstanceId(instanceId: string, item: Item): void {
        if (!instanceId) {
            return;
        }

        this._itemSelectorActions.selectItem.invoke({ data: item });
    }

    private _updateRanks() {
        let stores = this._environmentListStore.getDataStoreList().sort((a, b) => { return a.getCurrentState().rank - b.getCurrentState().rank; } );
        let index = 1;
        for (let i = 0; i < stores.length ; i++){
            let actionsHub = ActionCreatorManager.GetActionCreator<EnvironmentActionsCreator>(EnvironmentActionsCreator, stores[i].getInstanceId());
            let environment = stores[i].getCurrentState();
            environment.rank = index++;
            actionsHub.updateEnvironmentRank({rank: environment.rank});
        }
    }

    private _showOverlayIfHidden(): void {
        const overlayPanelStore = StoreManager.GetStore<OverlayPanelStore>(OverlayPanelStore, CanvasSelectorConstants.CanvasSelectorInstance);
        const state = overlayPanelStore.getState();
        if (!state.showDetails) {
            this._isItemDetailsOpen = false;
            this._overlayPanelActions.showOverlay.invoke({});
        }
        else {
            this._isItemDetailsOpen = true;
        }
    }

    private _cloneVariables(parentEnvironmentId: number): void {

        // Get the environment id for the newly added environment
        let clonedEnvironmentId = this._environmentListStore.getLastLocallyAddedEnvironmentId();
        let clonedEnvironmentnstanceId = this._environmentListStore.getEnvironmentInstanceId(clonedEnvironmentId);

        // Get the cloned environment
        let store = StoreManager.GetStore<DeployEnvironmentStore>(DeployEnvironmentStore, clonedEnvironmentnstanceId);
        let clonedEnvironment = store.getCurrentState();
        let targetScope: IScope = { key: clonedEnvironment.id, value: clonedEnvironment.name };

        // clone the scoped variables and variable groups
        this._processVariablesActionCreator.cloneScopedProcessVariables({ targetScope: targetScope, sourceScopeKey: parentEnvironmentId });
        this._variableGroupActions.cloneScopedVariableGroups.invoke({ targetScope: targetScope, sourceScopeKey: parentEnvironmentId });
    }

    private _restoreSelection(): void {
        this._itemSelectionStore = StoreManager.GetStore<ItemSelectionStore>(ItemSelectionStore, CanvasSelectorConstants.CanvasSelectorInstance);
        let item = this._itemSelectionStore.getPreviouslySelectedItem();
        if (item) {
            this._itemSelectorActions.selectItem.invoke({ data: item });
        }
        else {
            this._itemSelectorActions.clearSelection.invoke({});
        }
    }

    private _handleError(error): void {
        this._messageHandlerActions.addMessage.invoke({
            parentKey: ErrorMessageParentKeyConstants.MainParentKey,
            message: (error.message || error),
            statusCode: error.status
        } as IAddMessagePayload);
    }

    private _environmentListActionsHub: EnvironmentListActionsHub;
    private _processVariablesActionCreator: ProcessVariablesActionCreator;
    private _messageHandlerActions: MessageHandlerActions;
    private _environmentListStore: EnvironmentListStore;
    private _itemSelectorActions: ItemSelectorActions;
    private _overlayPanelActions: OverlayPanelActions;
    private _itemSelectionStore: ItemSelectionStore;
    private _coreDefinitionStore: CoreDefinitionStore;
    private _variableGroupActions: VariableGroupActions;

    private _isItemDetailsOpen: boolean;
}


