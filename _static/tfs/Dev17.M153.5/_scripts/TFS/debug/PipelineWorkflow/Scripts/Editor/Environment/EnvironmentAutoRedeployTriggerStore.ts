// Copyright (c) Microsoft Corporation.  All rights reserved.

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { CoreDefinitionStore } from "PipelineWorkflow/Scripts/Editor/Definition/CoreDefinitionStore";
import { DataStoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { DeployPhaseListStore } from "DistributedTaskControls/Phase/Stores/DeployPhaseListStore";
import { DeployPhaseTypes } from "DistributedTaskControls/Phase/Types";
import { EnvironmentAutoRedeployTriggerActions } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentAutoRedeployTriggerActions";
import { EnvironmentTrigger, EnvironmentTriggerType, EnvironmentTriggerContent } from "ReleaseManagement/Core/Contracts";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { PipelineDefinitionEnvironment } from "PipelineWorkflow/Scripts/Common/Types";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { EventConstants } from "DistributedTaskControls/Generated/DistributedTask.Constants";

export interface IAutoRedeployTriggerState {
    triggerContent: EnvironmentTriggerContent;
    isEnabled: boolean;
}

export interface IAutoRedeployTriggerArgs {
    triggers: EnvironmentTrigger[];    
}

export class EnvironmentAutoRedeployTriggerStore extends DataStoreBase {
    constructor(args: IAutoRedeployTriggerArgs) {
        super();
        this._setInitialData(args);
    }

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineAutoRedeployTriggerStoreKey;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);
        this._actions = ActionsHubManager.GetActionsHub(EnvironmentAutoRedeployTriggerActions, instanceId);
        this._deployPhaseListStore = StoreManager.GetStore(DeployPhaseListStore, instanceId);

        this._actions.toggleTriggers.addListener(this._handleTriggersToggle);
        this._actions.addTriggerEvent.addListener(this._handleAddTriggerEvent);
        this._actions.removeTriggerEvent.addListener(this._handleRemoveTriggerEvent);
        this._actions.changeTriggerEvent.addListener(this._handleChangeTriggerEvent);
        this._actions.changeTriggerAction.addListener(this._handleChangeTriggerAction);
        this._actions.updateAutoRedeployTriggerData.addListener(this._handleUpdateTriggerData);
    }

    public isDirty(): boolean {
        let currentTriggerContent: EnvironmentTriggerContent = this._currentState.triggerContent;
        let originalTriggerContent: EnvironmentTriggerContent = this._originalState.triggerContent;

        if (this._currentState.isEnabled === false && this._originalState.isEnabled === false) {
            return false;
        }

        if (this._currentState.isEnabled !== this._originalState.isEnabled) {
            return true;
        }

        if (!Utils_String.equals(currentTriggerContent.action, originalTriggerContent.action)) {
            return true;
        }

        if (currentTriggerContent.eventTypes.length !== originalTriggerContent.eventTypes.length) {
            return true;
        }
        
        for (let index = 0; index < currentTriggerContent.eventTypes.length; index++) {
            if (!Utils_String.equals(currentTriggerContent.eventTypes[index], originalTriggerContent.eventTypes[index])) {
                return true;
            }
        }
        return false;
    }

    public isValid(): boolean {
        let triggerContent: EnvironmentTriggerContent = this._currentState.triggerContent;
        let isEnabled: boolean = this._currentState.isEnabled;

        return !isEnabled || (!!triggerContent && !!triggerContent.action && !!triggerContent.eventTypes && triggerContent.eventTypes.length > 0);
    }

    public disposeInternal(): void {
        this._actions.toggleTriggers.removeListener(this._handleTriggersToggle);
        this._actions.addTriggerEvent.removeListener(this._handleAddTriggerEvent);
        this._actions.removeTriggerEvent.removeListener(this._handleRemoveTriggerEvent);
        this._actions.changeTriggerAction.removeListener(this._handleChangeTriggerAction);
        this._actions.changeTriggerEvent.removeListener(this._handleChangeTriggerEvent);
        this._actions.updateAutoRedeployTriggerData.removeListener(this._handleUpdateTriggerData);
    }

    public getState(): IAutoRedeployTriggerState {
        return this._currentState;
    }

    public updateVisitor(visitor: PipelineDefinitionEnvironment): void {
        if (FeatureFlagUtils.isRedeployTriggerEnabled() && !!visitor && !!this._currentState) {
            let autoRedeployTriggerIndex: number = this._findAutoRedeployTriggerIndex(visitor.environmentTriggers);

            if (!this._currentState.isEnabled || !this.isAnyDgPhaseWithEnvironment()) {
                if (autoRedeployTriggerIndex !== -1) {
                    visitor.environmentTriggers.splice(autoRedeployTriggerIndex, 1);
                }
            }
            else {
                let updatedAutoRedeployTrigger: EnvironmentTrigger = this._createEnvironmentTriggerObject(visitor);
                
                if (updatedAutoRedeployTrigger.triggerType === EnvironmentTriggerType.DeploymentGroupRedeploy) {
                    visitor.environmentTriggers = [ updatedAutoRedeployTrigger ];
                }
            }
        }

        if (FeatureFlagUtils.isRollbackTriggerEnabled() && !!visitor && !!this._currentState) {

            if (!this._currentState.isEnabled) {
                visitor.environmentTriggers = [];
            }
            else {
                let rollBackTrigger: EnvironmentTrigger = this._createEnvironmentTriggerObject(visitor);
                
                if (rollBackTrigger.triggerType === EnvironmentTriggerType.RollbackRedeploy) {
                    visitor.environmentTriggers = [ rollBackTrigger ];
                }
            }
        }
    }

    public isAnyDgPhaseWithEnvironment(): boolean {
        return (this._deployPhaseListStore.getPhaseCount() > 0)
            && this._deployPhaseListStore.getDataStoreList().some(store => store.getPhaseType() === DeployPhaseTypes.MachineGroupBasedDeployment);
    }

    private _setInitialData(args: IAutoRedeployTriggerArgs): void {
        args = args || {} as IAutoRedeployTriggerArgs;

        let triggers: EnvironmentTrigger[] = args.triggers;

        let triggerIndex: number = this._findAutoRedeployTriggerIndex(triggers);
        let environmentTrigger: EnvironmentTrigger = triggerIndex !== -1 ? triggers[triggerIndex] : undefined;

        let parsedContent: EnvironmentTriggerContent = this._parseEnvironmentTriggerContent(environmentTrigger);

        if (FeatureFlagUtils.isRollbackTriggerEnabled() && triggerIndex === -1) {
            triggerIndex = this._findRollbackTriggerIndex(triggers);
            environmentTrigger = triggerIndex !== -1 ? triggers[triggerIndex] : undefined;
            parsedContent = this._parseEnvironmentTriggerContent(environmentTrigger);
        }

        this._currentState = { triggerContent: parsedContent, isEnabled: triggerIndex !== -1 } as IAutoRedeployTriggerState;
        this._originalState = JQueryWrapper.extendDeep({}, this._currentState);
    }

    private _findAutoRedeployTriggerIndex(triggers: EnvironmentTrigger[]): number {
        triggers = triggers || [];
        return Utils_Array.findIndex(triggers, (trigger: EnvironmentTrigger) => {
            return trigger.triggerType === EnvironmentTriggerType.DeploymentGroupRedeploy;
        });
    }

    private _findRollbackTriggerIndex(triggers: EnvironmentTrigger[]): number {
        triggers = triggers || [];
        return Utils_Array.findIndex(triggers, (trigger: EnvironmentTrigger) => {
            return trigger.triggerType === EnvironmentTriggerType.RollbackRedeploy;
        });
    }

    private _parseEnvironmentTriggerContent(trigger: EnvironmentTrigger): EnvironmentTriggerContent {
        let parsedContent: EnvironmentTriggerContent = {
            action: undefined,
            eventTypes: []
        } as EnvironmentTriggerContent;

        if (!!trigger && !!trigger.triggerContent) {
            try {
                parsedContent = JSON.parse(trigger.triggerContent) as EnvironmentTriggerContent;
            }
            catch (ex) {
            }
        }

        return parsedContent;
    }

    private _createEnvironmentTriggerObject(visitor: PipelineDefinitionEnvironment): EnvironmentTrigger {
        let triggerContent: EnvironmentTriggerContent = this._currentState.triggerContent;
        let serializedTriggerContent: string = JSON.stringify(triggerContent);
        let releaseDefinitionId: number = StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore).getState().id;

        return {
            definitionEnvironmentId: visitor.id,
            releaseDefinitionId: releaseDefinitionId,
            triggerContent: serializedTriggerContent,
            triggerType: this._getEnvironmentTriggerType(triggerContent)
        } as EnvironmentTrigger;
    }

    private _handleTriggersToggle = (isEnabled: boolean): void => {
        this._currentState.isEnabled = isEnabled;
        this.emitChanged();
    }

    private _handleAddTriggerEvent = (eventKey: string): void => {
        this._currentState.triggerContent.eventTypes.push(eventKey);
        Utils_Array.uniqueSort(this._currentState.triggerContent.eventTypes);
        this.emitChanged();
    }

    private _handleChangeTriggerEvent = (eventKey: string): void => {
        this._currentState.triggerContent.eventTypes = [ eventKey ];
        this.emitChanged();
    }

    private _handleRemoveTriggerEvent = (eventKey: string): void => {
        Utils_Array.remove(this._currentState.triggerContent.eventTypes, eventKey);
        this.emitChanged();
    }

    private _handleChangeTriggerAction = (actionKey: string): void => {
        this._currentState.triggerContent.action = actionKey;
        this.emitChanged();
    }

    private _handleUpdateTriggerData = (triggers: EnvironmentTrigger[]): void => {
        let updatedData: IAutoRedeployTriggerArgs = {
            triggers: triggers            
        } as IAutoRedeployTriggerArgs;

        this._setInitialData(updatedData);
    }

    private _getEnvironmentTriggerType(environmentTriggerContent: EnvironmentTriggerContent) {
        let eventTypes = environmentTriggerContent.eventTypes;
        
        if (!eventTypes || eventTypes.length === 0) {
            return EnvironmentTriggerType.Undefined;
        }

        let eventType: string = eventTypes[0];
        if (eventType === EventConstants.DeploymentMachinesChanged) {
            return EnvironmentTriggerType.DeploymentGroupRedeploy;
        }
        else if (eventType === EventConstants.DeploymentFailed) {
            return EnvironmentTriggerType.RollbackRedeploy;
        }
        else {
            return EnvironmentTriggerType.Undefined;
        }
    }

    private _currentState: IAutoRedeployTriggerState = {} as IAutoRedeployTriggerState;
    private _originalState: IAutoRedeployTriggerState = {} as IAutoRedeployTriggerState;
    private _actions: EnvironmentAutoRedeployTriggerActions;    
    private _deployPhaseListStore: DeployPhaseListStore;
}