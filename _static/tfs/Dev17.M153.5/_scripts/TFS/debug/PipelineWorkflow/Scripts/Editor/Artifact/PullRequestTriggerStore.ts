/**
 * Store for Artifact Trigger View
 */
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { AggregatorDataStoreBase } from "DistributedTaskControls/Common/Stores/AggregatorStoreBase";
import { Feature, Properties, Telemetry } from "DistributedTaskControls/Common/Telemetry";
import { PipelineDefinition } from "PipelineWorkflow/Scripts/Common/Types";
import {
    IChangeFilterArgs,
    IInitializeBuildProperties,
    PullRequestTriggerActions,
} from "PipelineWorkflow/Scripts/Editor/Artifact/PullRequestTriggerActions";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import {
    CodeRepositoryReference,
    PullRequestFilter,
    PullRequestSystemType,
    PullRequestTrigger,
    ReleaseTriggerType,
} from "ReleaseManagement/Core/Contracts";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export interface IPullRequestTriggerStoreState {
    allTags: string[];
    isToggleEnabled: boolean;
    filters: PullRequestFilter[];
    codeRepositoryReference: CodeRepositoryReference;
    useArtifactReference: boolean;
    isPullRequestTriggerSupported: boolean;
}

export interface IPullRequestTriggerStoreOptions {
    getArtifactAlias: () => string;
    trigger: PullRequestTrigger;
}


export class PullRequestTriggerStore extends AggregatorDataStoreBase {
    
    constructor(options: IPullRequestTriggerStoreOptions) {
        super();
        this._options = options;

        this._currentState = this._initializeEmptyState();
        this._originalState = this._initializeEmptyState();

        if (this._options) {
            this._initializeStates(this._currentState, this._options);
            this._initializeStates(this._originalState, this._options);
        }
    }

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelinePullRequestTriggerStore;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);

        this._actionsHub = ActionsHubManager.GetActionsHub<PullRequestTriggerActions>(PullRequestTriggerActions, instanceId);
        this._actionsHub.toggleChanged.addListener(this._handleToggleChanged);
        this._actionsHub.updateTrigger.addListener(this._updateTrigger);
        this._actionsHub.addFilter.addListener(this._addFilter);
        this._actionsHub.updateCodeRepositoryReference.addListener(this._updateCodeRepositoryReference);
        this._actionsHub.deleteFilter.addListener(this._deleteFilter);
        this._actionsHub.changeFilter.addListener(this._changeFilter);
        this._actionsHub.initializeBuildProperties.addListener(this._initializeBuildProperties);
        this._actionsHub.updateUseArtifactReference.addListener(this._updateUseArtifactReference);
        this._actionsHub.updatePullRequestTriggerSupported.addListener(this._updatePullRequestTriggerSupported);
    }

    public disposeInternal(): void {
        super.disposeInternal();
        this._actionsHub.toggleChanged.removeListener(this._handleToggleChanged);
        this._actionsHub.updateTrigger.removeListener(this._updateTrigger);
        this._actionsHub.updateCodeRepositoryReference.removeListener(this._updateCodeRepositoryReference);
        this._actionsHub.addFilter.removeListener(this._addFilter);
        this._actionsHub.deleteFilter.removeListener(this._deleteFilter);
        this._actionsHub.changeFilter.removeListener(this._changeFilter);
        this._actionsHub.initializeBuildProperties.removeListener(this._initializeBuildProperties);
        this._actionsHub.updateUseArtifactReference.removeListener(this._updateUseArtifactReference);
        this._actionsHub.updatePullRequestTriggerSupported.removeListener(this._updatePullRequestTriggerSupported);
    }

    
    public isDirty(): boolean {

        if (this._currentState.isToggleEnabled === false && this._originalState.isToggleEnabled === false){
            // in this case, we won't check anything else, the reason behind this is that, there are some properties
            // which are autopopulated, like repo and projectid
            return false;
        }

        let isDirty: boolean = this._currentState.isToggleEnabled !== this._originalState.isToggleEnabled;
        isDirty = isDirty || !this._areCodeRepositoryReferencesEqual(this._originalState.codeRepositoryReference, this._currentState.codeRepositoryReference);
        isDirty = isDirty || !Utils_Array.arrayEquals(this._originalState.filters, this._currentState.filters, PullRequestTriggerStore._areTriggerFiltersEqual , false, true);
        
        if (!isDirty && this._currentState.isToggleEnabled) {
            return super.isDirty();
        }
        return isDirty;
    }

    public isValid(): boolean {
        let isValid: boolean = true;

        if (this._currentState.isToggleEnabled === false){
            // if the toggle isn't enabled, then its always valid;
            return true;
        }

        if (this._currentState.filters.length === 0){
            return false;
        }

        this._currentState.filters.forEach(filter => {
            if (filter.targetBranch.trim() === Utils_String.empty){
                isValid = false;
            }
        });

        return isValid;
    }

    private _areCodeRepositoryReferencesEqual(codeRepoRef1: CodeRepositoryReference, codeRepoRef2: CodeRepositoryReference): boolean{
        if (!codeRepoRef1 && !codeRepoRef2){
            // both are null
            return true;
        }

        if (!codeRepoRef1 || !codeRepoRef2){
            // If one of them is null, then they aren't equal.
            return false;
        }

        let ref1 = codeRepoRef1.repositoryReference;
        let ref2 = codeRepoRef2.repositoryReference;

        let isNullOrEmpty = (obj) => {
            if (obj && Object.keys(obj).length === 0){
                return true;
            }

            return !obj;
        };

        if (isNullOrEmpty(ref1) && isNullOrEmpty(ref2)){
            return true;
        }

        for (const key in ref1) {
            if (ref1.hasOwnProperty(key)) {
                if (ref1[key].value !== ref2[key].value || ref1[key].displayValue !== ref2[key].displayValue){
                    return false;
                }
            }
        }

        return ref1.systemType === ref2.systemType;
    }

    private static _areTriggerFiltersEqual(filter1: PullRequestFilter, filter2: PullRequestFilter){
        if (!filter1 && !filter2) {
            return true;
        }

        if (Utils_String.defaultComparer(filter1.targetBranch, filter2.targetBranch) === 0 && 
            Utils_Array.arrayEquals(filter1.tags, filter2.tags, (a, b) => Utils_String.defaultComparer(a, b) === 0)
        ){
            return true;
        }

        return false;
    }

    public updateVisitor(definition: PipelineDefinition): void {
        if (!!definition) {
            if (this._currentState.isToggleEnabled) {
                let trigger = this._getEmptyTrigger();
                trigger.artifactAlias = this._options.getArtifactAlias();
                trigger.triggerConditions = this._currentState.filters;
                trigger.pullRequestConfiguration.useArtifactReference = this._currentState.useArtifactReference;
                trigger.pullRequestConfiguration.codeRepositoryReference = this._currentState.codeRepositoryReference;
                Utils_Array.add(definition.triggers, trigger);
            }
        }
    }

    public getState(): IPullRequestTriggerStoreState {
        return JQueryWrapper.extendDeep(this._currentState, {});
    }

    private _initializeStates(state: IPullRequestTriggerStoreState, options: IPullRequestTriggerStoreOptions) {
        state.isToggleEnabled = !!options.trigger;
        if (options.trigger){
            state.codeRepositoryReference = options.trigger.pullRequestConfiguration.codeRepositoryReference;
            state.filters = Utils_Array.clone(options.trigger.triggerConditions);
            state.useArtifactReference = options.trigger.pullRequestConfiguration.useArtifactReference;
            state.isPullRequestTriggerSupported = true;
        }
        
    }

    private _initializeEmptyState(): IPullRequestTriggerStoreState {
        return {
            isToggleEnabled: false,
            filters: [],
            allTags: [],
            codeRepositoryReference: null,
            useArtifactReference: false, 
            isPullRequestTriggerSupported: false
        };
    }

    private _initializeBuildProperties = (args: IInitializeBuildProperties) => {
        this._currentState.allTags = Utils_Array.clone(args.allTags);
        this._currentState.codeRepositoryReference = args.codeRepositoryReference;
        this.emitChanged();
    }

    private _handleToggleChanged = (checked: boolean) => {
        this._currentState.isToggleEnabled = checked;
        if (this._currentState.filters.length === 0){
            // insert one dummy filter
            this._currentState.filters.push({
                targetBranch: "", 
                tags: []
            });
        }
        
        this.emitChanged();
    }

    private _updateTrigger = (trigger: PullRequestTrigger) => {
        let isEnabled = !!trigger;
        
        this._initializeStates(this._originalState, { trigger: trigger, getArtifactAlias: this._options.getArtifactAlias });
        this._initializeStates(this._currentState, { trigger: trigger, getArtifactAlias: this._options.getArtifactAlias });
    }

    private _addFilter = () => {
        this._currentState.filters.push({
            targetBranch: "",
            tags: []
        });
        this.emitChanged();
    }

    private _deleteFilter = (index: number) => {
        this._currentState.filters.splice(index, 1);
        this.emitChanged();
    }

    private _changeFilter = (args: IChangeFilterArgs) => {
        this._currentState.filters[args.index] = args.filter;
        this.emitChanged();
    }

    private _updateCodeRepositoryReference = (ref: CodeRepositoryReference) => {
        this._currentState.codeRepositoryReference = ref;
        this.emitChanged();
    }

    private _updateUseArtifactReference = (value: boolean) => {
        this._currentState.useArtifactReference = value;
        this.emitChanged();
    }

    private _updatePullRequestTriggerSupported = (value: boolean) => {
        this._currentState.isPullRequestTriggerSupported = value;
        this.emitChanged();
    }

    private _getEmptyTrigger(): PullRequestTrigger {
        return {
            artifactAlias: "",
            triggerType: ReleaseTriggerType.PullRequest,
            triggerConditions: [],
            pullRequestConfiguration: {
                useArtifactReference: false,
                environmentNames: [],
                codeRepositoryReference : {
                    systemType: PullRequestSystemType.None,
                    repositoryReference: {}
                }
            },
            statusPolicyName: ""
        };
    }

    private _actionsHub: PullRequestTriggerActions;
    private _currentState: IPullRequestTriggerStoreState;
    private _originalState: IPullRequestTriggerStoreState;
    private _options: IPullRequestTriggerStoreOptions;
}
