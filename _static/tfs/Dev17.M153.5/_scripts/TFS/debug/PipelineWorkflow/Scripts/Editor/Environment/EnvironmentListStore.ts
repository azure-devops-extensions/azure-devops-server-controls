/**
 * @brief Contains React store for Environment list
 */

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IdGeneratorUtils } from "DistributedTaskControls/Common/IdGeneratorUtils";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { ListDataStoreBase } from "DistributedTaskControls/Common/Stores/ListDataStoreBase";
import { ProcessParameterStore } from "DistributedTaskControls/Stores/ProcessParameterStore";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DeployPhaseUtilities } from "DistributedTaskControls/Phase/DeployPhaseUtilities";
import { EdgeMatrix, INodeData } from "DistributedTaskControls/Components/Canvas/Types";
import { GraphLayoutHelper } from "DistributedTaskControls/Components/Canvas/GraphLayoutHelper";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";

import {
    ICreateEnvironmentListActionPayload,
    IUpdateEnvironmentListActionPayload,
    ICreateEnvironmentActionPayload, EnvironmentListActionsHub
} from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListActionsHub";
import { DeployEnvironmentStore, IDeployEnvironmentStoreArgs } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStore";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { EnvironmentListModel, IEnvironmentData } from "PipelineWorkflow/Scripts/Shared/EnvironmentList/EnvironmentListModel";
import { EnvironmentUtils } from "PipelineWorkflow/Scripts/Shared/Utils/EnvironmentUtils";
import * as CommonTypes from "PipelineWorkflow/Scripts/Common/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { DefinitionSettingsStore } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionSettingsStore";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";

import Types = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Types");
import RMContracts = require("ReleaseManagement/Core/Contracts");

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as Diag from "VSS/Diag";
import VssContext = require("VSS/Context");
import WebApi_Contracts = require("VSS/WebApi/Contracts");
import { ReleaseDeployPhaseHelper } from "PipelineWorkflow/Scripts/Shared/Environment/ReleaseDeployPhaseHelper";

export class EnvironmentListStore extends ListDataStoreBase<DeployEnvironmentStore> {

    constructor() {
        super();
        this._definitionSettingsStore = StoreManager.GetStore<DefinitionSettingsStore>(DefinitionSettingsStore);
        this._environmentListActionsHub = ActionsHubManager.GetActionsHub<EnvironmentListActionsHub>(EnvironmentListActionsHub);
    }

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineEnvironmentListStoreKey;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);

        this._environmentListActionsHub.createEnvironmentList.addListener(this._handleCreateEnvironmentListAction);
        this._environmentListActionsHub.updateEnvironmentList.addListener(this._handleUpdateEnvironmentListAction);
        this._environmentListActionsHub.createEnvironment.addListener(this._handleCreateEnvironment);
        this._environmentListActionsHub.deleteEnvironment.addListener(this._handleDeleteEnvironment);
        this._environmentListActionsHub.cloneEnvironment.addListener(this._handleCloneEnvironment);
        this._environmentListActionsHub.refreshEnvironmentsCanvas.addListener(this._handleRefreshEnvironmentsCanvas);
    }

    public getCurrentState(): CommonTypes.PipelineDefinitionEnvironment[] {
        let environments: CommonTypes.PipelineDefinitionEnvironment[] = [];
        this._updateVisitorInternal(environments);
        if (this._environmentListModel) {
            this._environmentListModel.updateEnvironmentList(environments);
        }
        return environments;
    }

    public disposeInternal(): void {
        this._environmentListActionsHub.createEnvironmentList.removeListener(this._handleCreateEnvironmentListAction);
        this._environmentListActionsHub.updateEnvironmentList.removeListener(this._handleUpdateEnvironmentListAction);
        this._environmentListActionsHub.createEnvironment.removeListener(this._handleCreateEnvironment);
        this._environmentListActionsHub.deleteEnvironment.removeListener(this._handleDeleteEnvironment);
        this._environmentListActionsHub.cloneEnvironment.removeListener(this._handleCloneEnvironment);
        this._environmentListActionsHub.refreshEnvironmentsCanvas.removeListener(this._handleRefreshEnvironmentsCanvas);

        super.disposeInternal();
    }

    public isValid(): boolean {
        return this.getDataStoreList().length !== 0 && super.isValid();
    }

    /**
     * @brief Update te PipelineDefinition
     * @param visitor
     */
    public updateVisitor(visitor: CommonTypes.PipelineDefinition) {
        visitor.environments = [];
        this._updateVisitorInternal(visitor.environments);
    }

    public getEnvironmentInstanceId(environmentId: number): string {
        if (this._environmentListModel) {
            return this._environmentListModel.getEnvironmentInstanceId(environmentId);
        }
    }

    public getEnvironmentIdFromInstanceId(instanceId: string): number {
        if (this._environmentListModel) {
            return this._environmentListModel.getEnvironmentIdFromInstanceId(instanceId);
        }
    }

    public getTemporaryEnvironment(): CommonTypes.PipelineDefinitionEnvironment {
        let stores: DeployEnvironmentStore[] = this.getDataStoreList();
        let length: number = stores.length;
        for (let i = 0; i < length; i++) {
            if (stores[i].isTemporary()) {
                return stores[i].getCurrentState();
            }
        }

        return null;
    }

    /**
     * @brief returns the last added local environment
     */
    public getLastLocallyAddedEnvironmentId(): number {
        if (!this._lastLocallyAddedEnvironmentInstanceId) {
            return null;
        }

        return this._environmentListModel.getEnvironmentIdFromInstanceId(this._lastLocallyAddedEnvironmentInstanceId);
    }

    /**
     * @brief fills the data on new Environment. It does not change the state of the store.
     */
    public fillDataOnNewEnvironment(environment: CommonTypes.PipelineDefinitionEnvironment,
        parentEnvironmentId: number,
        assignId: boolean,
        assignTitle: boolean,
        populateRank: boolean,
        populateTriggerConditions: boolean,
        overrideExecutionPolicy?: boolean): void {

        if (assignId) {
            environment.id = IdGeneratorUtils.instance().getUniqueNegativeId();
        }

        if (assignTitle) {
            environment.name = this.getUniqueEnvironmentName(null);
        }

        // add the environment in end of environment list
        if (populateRank) {
            let environments = this._environmentListModel ? this._environmentListModel.getEnvironmentList() : [];
            environment.rank = environments.length + 1;
        }

        // populate required data for phases
        this._populateRequiredPhaseData(environment.deployPhases);

        // populate trigger conditions
        if (populateTriggerConditions) {
            this._populateEnvironmentTriggerCondition(environment, parentEnvironmentId);
        }

        // populate owner if not present
        if (!environment.owner) {
            environment.owner = DtcUtils.getCurrentUser();
        }

        // populate retention policy if not present
        if (!environment.retentionPolicy) {
            environment.retentionPolicy = this._getDefaultEnvironmentRetentionPolicy();
        }

        // Update execution policy to specific number of parallel deployments when overrideExecutionPolicy set to true
        // this will come true only when we apply template for the environment
        if (overrideExecutionPolicy) {
            this._updateExecutionPolicyToSpecificParallelDeployments(environment);
        }
    }

    public getEnvironmentConnections(conditionsUseEnvironmentNames: boolean = false): EdgeMatrix {
        if (!this._environmentListModel) {
            return null;
        }

        return this._environmentListModel.getEnvironmentConnections(conditionsUseEnvironmentNames);
    }

    public getEnvironmentsData(): IEnvironmentData<CommonTypes.PipelineDefinitionEnvironment>[] {
        if (!this._environmentListModel) {
            return [];
        }

        return this._environmentListModel.getEnvironmentsData();
    }

    public areEnvironmentWorkflowsValid(): boolean {
        for (let e of this.getDataStoreList()) {
            if (e.isEnvironmentWorkflowValid() === false) {
                return false;
            }
        }

        return true;
    }

    /**
     * @brief generates unique environment name
     */
    public getUniqueEnvironmentName(environmentName: string, environmentId?: number): string {
        let uniqueName: string = (environmentName === null || environmentName === undefined) ? this._getUniqueName() : environmentName;
        let currentEnvironmentNames: string[] = this._getCurrentEnvironmentNames(environmentId);
        let foundUniqueEnvironmentName: boolean = false;
        this._duplicateNameSuffix = 1;
        do {
            foundUniqueEnvironmentName = !this._environmentNameExists(uniqueName, currentEnvironmentNames);
            if (!foundUniqueEnvironmentName) {
                uniqueName = this._getUniqueName(environmentName);
            }
        } while (!foundUniqueEnvironmentName);

        return uniqueName;
    }

    /**
     * Get the data store list.
     */
    public getDataStoreList(): DeployEnvironmentStore[] {
        let storeList: DeployEnvironmentStore[] = [];
        storeList = super.getDataStoreList().sort((store1: DeployEnvironmentStore, store2: DeployEnvironmentStore) => {
            return store1.getEnvironmentRank() - store2.getEnvironmentRank();
        });
        
        return storeList;
    }

    public fixEnvironmentRanks(environments: CommonTypes.PipelineDefinitionEnvironment[], saveDefinition?: boolean): boolean {
        if (this.shouldUpdateRank()) {
            // Get current state of each environment store to ensure everything is up to date before updating rank
            let environmentsData: IEnvironmentData<CommonTypes.PipelineDefinitionEnvironment>[] = [];
            this.getDataStoreList().forEach((store: DeployEnvironmentStore) => {
                let environment: CommonTypes.PipelineDefinitionEnvironment = JQueryWrapper.extend({}, store.getCurrentState());
                environmentsData.push({
                    environment: environment,
                    instanceId: this.getEnvironmentInstanceId(environment.id)
                });
            });

            let edges = this.getEnvironmentConnections();
            let nodes = EnvironmentUtils.getNodes(environmentsData, null);
            EnvironmentUtils.fixEnvironmentRanks(environments, edges, nodes);
            return true;
        }
        else {
            return false;
        }
    }

    /* update ranks only for operations which can change canvas layout for environments */
    public shouldUpdateRank(): boolean {
        if (super.isListDirty()) {
            return true;
        }

        let haveTriggersOrRankChanged: boolean = false;
        for (let store of this.getDataStoreList()) {
            const environmentStore = store as DeployEnvironmentStore;
            if (environmentStore.haveTriggersChanged() || environmentStore.hasRankChanged()) {
                haveTriggersOrRankChanged = true;
                break;
            }
        }

        return haveTriggersOrRankChanged;
    }

    // will return environment store for given id or undefined
    public getEnvironmentStore(envId: number) {
        return this.getDataStoreList().filter((store) => store.getEnvironmentId() === envId)[0];
    }

    public getEnvironmentStoreByName(envName: string) {
        for (let store of this.getDataStoreList()){
            if (Utils_String.localeIgnoreCaseComparer(store.getEnvironmentName(), envName) === 0){
                return store;
            }
        }
    }

    private _environmentNameExists(environmentName: string, currentEnvironmentNames: string[]): boolean {
        if (!Utils_Array.contains(currentEnvironmentNames, environmentName, (name1, name2) => {
            return Utils_String.localeIgnoreCaseComparer(name1, name2);
        })) {
            return false;
        }

        return true;
    }

    private _updateVisitorInternal(environments: CommonTypes.PipelineDefinitionEnvironment[]) {

        if (!environments) {
            environments = [];
        }

        this.getDataStoreList().forEach((store: DeployEnvironmentStore, index: number) => {
            let environment: CommonTypes.PipelineDefinitionEnvironment = JQueryWrapper.extend({}, null);
            store.updateVisitor(environment);
            environments.push(environment);
        });
    }

    private _handleRefreshEnvironmentsCanvas = () => {
        this.emitChanged();
    }

    /**
     * @brief Action handler for CreateEnvironmentList Action.
     * @detailed Loops over the list of environments in the the order of their rank and create ProcessItem object
     */
    private _handleCreateEnvironmentListAction = (actionPayload: ICreateEnvironmentListActionPayload) => {
        this._createEnvironmentList(actionPayload.environments);
        this._publishRankTelemetry();
    }

    private _handleUpdateEnvironmentListAction = (actionPayload: IUpdateEnvironmentListActionPayload) => {
        let newEnvironments: CommonTypes.PipelineDefinitionEnvironment[] = actionPayload.environments;
        newEnvironments = JQueryWrapper.extendDeep(newEnvironments, actionPayload.environments);
        let oldEnvironments: CommonTypes.PipelineDefinitionEnvironment[] = this._environmentListModel.getEnvironmentList();

        if (newEnvironments.length !== oldEnvironments.length || actionPayload.force) {
            let itemsToDispose: DeployEnvironmentStore[] = [];
            this.getDataStoreList().forEach((item: DeployEnvironmentStore) => {
                this._environmentListModel.deleteEnvironment(item.getEnvironmentId());
                itemsToDispose.push(item);
            });

            itemsToDispose.forEach((item: DeployEnvironmentStore) => {
                this.removeFromDataStoreList(item);
            });
            this.handleUpdate([]);
            this._createEnvironmentList(actionPayload.environments);
        }
        else {
            if (oldEnvironments) {
                // refresh id to instance id map
                oldEnvironments.forEach((oldEnvironment) => {
                    let oldId: number = oldEnvironment.id;
                    if (oldId <= 0) {
                        let newId: number = this._findNewId(newEnvironments, oldEnvironment.name);
                        let instanceId: string = this._environmentListModel.getEnvironmentInstanceId(oldId);
                        this._environmentListModel.replaceId(instanceId, oldId, newId);
                    }
                });
            }
        }

        this._lastLocallyAddedEnvironmentInstanceId = null;
        this._environmentListModel.updateEnvironmentList(newEnvironments);
        this.handleUpdate();
    }

    private _handleDeleteEnvironment = (environmentId: number) => {
        let storeToBeRemoved: DeployEnvironmentStore = null;
        let stores: DeployEnvironmentStore[] = this.getDataStoreList();
        let length: number = stores.length;

        for (let i = 0; i < length; i++) {
            if (stores[i].getCurrentState().id === environmentId) {
                storeToBeRemoved = stores[i];
                break;
            }
        }

        if (storeToBeRemoved) {
            this._environmentListModel.deleteEnvironment(environmentId);
            this.removeFromDataStoreList(storeToBeRemoved);
            this.emitChanged();
        }
    }

    /**
     * @brief Action handler for creating an environment
     */
    private _handleCreateEnvironment = (actionPayload: ICreateEnvironmentActionPayload) => {
        let template: RMContracts.ReleaseDefinitionEnvironmentTemplate = actionPayload.template;
        if (template) {
            let environment: CommonTypes.PipelineDefinitionEnvironment = JQueryWrapper.extendDeep({}, template.environment);
            environment.environmentOptions.publishDeploymentStatus = true;
            this._addEnvironment(environment, actionPayload.parentEnvironmentId, actionPayload.isTemporary, true, true);
        }
    }

    private _updateExecutionPolicyToSpecificParallelDeployments(environment: CommonTypes.PipelineDefinitionEnvironment): void {
        if (environment) {
            environment.executionPolicy = EnvironmentUtils.getDefaultSpecificParallelDeploymentsExecutionPolicy();
        }
    }

    /**
     * @brief Action handler for cloning an environment
     */
    private _handleCloneEnvironment = (environmentId: number) => {

        let instanceId: string = this.getEnvironmentInstanceId(environmentId);
        let environmentStore: DeployEnvironmentStore = StoreManager.GetStore<DeployEnvironmentStore>(DeployEnvironmentStore, instanceId);
        if (environmentStore) {
            let environmentToBeCloned: CommonTypes.PipelineDefinitionEnvironment = environmentStore.getCurrentState();
            let environment: CommonTypes.PipelineDefinitionEnvironment = JQueryWrapper.extendDeep({}, environmentToBeCloned);
            environment.name = this.getUniqueEnvironmentName(Utils_String.localeFormat(Resources.CloneEnvironmentNameFormat, environmentToBeCloned.name));
            this._clearPreAndPostApprovalIds(environment);
            if (environment.deployStep) {
                environment.deployStep.id = 0;
            }
            this._addEnvironment(environment, environmentId, false, true, false);
        }
    }

    private _clearPreAndPostApprovalIds(environment: CommonTypes.PipelineDefinitionEnvironment): void {
        if (environment.preDeployApprovals) {
            this._clearApprovalIds(environment.preDeployApprovals.approvals);
        }

        if (environment.postDeployApprovals) {
            this._clearApprovalIds(environment.postDeployApprovals.approvals);
        }
    }

    private _clearApprovalIds(approvals: RMContracts.ReleaseDefinitionApprovalStep[]): void {
        if (approvals) {
            approvals.forEach((approval: RMContracts.ReleaseDefinitionApprovalStep) => {
                approval.id = 0;
            });
        }
    }

    private _addEnvironment(environment: CommonTypes.PipelineDefinitionEnvironment,
        parentEnvironmentId: number,
        isTemporary: boolean,
        assignId: boolean,
        assignTitle: boolean): void {

        if (!this._environmentListModel) {
            this._environmentListModel = new EnvironmentListModel<CommonTypes.PipelineDefinitionEnvironment>();
        }

        this.fillDataOnNewEnvironment(environment, parentEnvironmentId, assignId, assignTitle, true, true);
        let instanceId: string = DtcUtils.getUniqueInstanceId();
        let store: DeployEnvironmentStore = StoreManager.CreateStore<DeployEnvironmentStore, IDeployEnvironmentStoreArgs>(
            DeployEnvironmentStore,
            instanceId,
            {
                environment: environment,
                environmentListModel: this._environmentListModel,
                isTemporary: isTemporary
            });

        this._environmentListModel.addEnvironment(environment, instanceId);
        this.addToStoreList(store);
        this._lastLocallyAddedEnvironmentInstanceId = instanceId;
        this.emitChanged();
    }

    private _findNewId(newEnvironments: CommonTypes.PipelineDefinitionEnvironment[], oldEnvironmentName: string): number {
        let newId: number = 0;
        if (newEnvironments) {
            let length: number = newEnvironments.length;
            for (let i: number = 0; i < length; i++) {
                if (Utils_String.localeIgnoreCaseComparer(newEnvironments[i].name, oldEnvironmentName) === 0) {
                    newId = newEnvironments[i].id;
                    break;
                }
            }
        }
        return newId;
    }

    private _populateEnvironmentTriggerCondition(environment: CommonTypes.PipelineDefinitionEnvironment, parentEnvironmentId: number) {
        let conditions: CommonTypes.IEnvironmentTriggerCondition[] = [];
        if (parentEnvironmentId !== null && parentEnvironmentId !== undefined) {
            let map: IDictionaryNumberTo<string> = this._environmentListModel.getEnvironmentIdNameMap();
            let environmentName: string = map[parentEnvironmentId.toString()];
            if (environmentName) {
                let environmentPostEnvironmentTriggerCondition: CommonTypes.IEnvironmentTriggerCondition =
                    this._getPostEnvironmentTriggerCondition(environmentName, parentEnvironmentId);
                conditions.push(environmentPostEnvironmentTriggerCondition);
            }
        }
        else {
            let environmentPostReleaseTriggerCondition: CommonTypes.PipelineEnvironmentTriggerCondition =
                this._getDefaultPostReleaseTriggerCondition();
            conditions.push(environmentPostReleaseTriggerCondition);
        }
        environment.conditions = conditions;
    }

    private _getDefaultPostReleaseTriggerCondition(): CommonTypes.PipelineEnvironmentTriggerCondition {
        let postReleaseTriggerCondition: CommonTypes.PipelineEnvironmentTriggerCondition = {
            conditionType: CommonTypes.PipelineEnvironmentTriggerConditionType.Event,
            name: CommonTypes.PipelineEnvironmentTriggerTypeConstants.ReleaseStarted,
            value: Utils_String.empty
        };
        return postReleaseTriggerCondition;
    }

    private _getPostEnvironmentTriggerCondition(environmentName: string, parentEnvironmentId: number): CommonTypes.PipelineEnvironmentTriggerCondition {
        let postEnvironmentTriggerCondition: CommonTypes.IEnvironmentTriggerCondition = {
            conditionType: CommonTypes.PipelineEnvironmentTriggerConditionType.EnvironmentState,
            name: environmentName,
            value: CommonTypes.PipelineEnvironmentTriggerConditionEnvironmentStatus.Succeeded.toString(),
            environmentId: parentEnvironmentId
        };
        return postEnvironmentTriggerCondition;
    }

    private _populateRequiredPhaseData(phases: CommonTypes.PipelineDeployPhase[]): void {
        if (phases) {
            phases.forEach((phase) => {
                // populate phase name
                if (!phase.name) {
                    phase.name = DeployPhaseUtilities.getPhaseTypeTitleString(ReleaseDeployPhaseHelper.getDTPhaseType(phase.phaseType));
                }
            });
        }
    }

    private _getUniqueName(environmentName?: string): string {
        let uniqueName: string = null;
        if (environmentName === null || environmentName === undefined) {
            uniqueName = Utils_String.localeFormat(Resources.EnvironmentDefaultNameText, this._uniqueNameSuffix.toString());
            this._uniqueNameSuffix++;
        } else {
            uniqueName = Utils_String.localeFormat(Resources.ResolveDuplicateEnvironmentNameFormat,
                environmentName, this._duplicateNameSuffix.toString());
            this._duplicateNameSuffix++;
        }

        return uniqueName;
    }

    private _getCurrentEnvironmentNames(filterEnvironmentId?: number): string[] {
        let currentEnvironmentNames: string[] = [];

        if (this._environmentListModel) {
            let environments = this._environmentListModel.getEnvironmentList();
            environments.forEach((environment) => {
                if (environment.id !== filterEnvironmentId) {
                    currentEnvironmentNames.push(environment.name);
                }
            });
        }

        return currentEnvironmentNames;
    }

    private _getDefaultEnvironmentRetentionPolicy(): RMContracts.EnvironmentRetentionPolicy {
        return this._definitionSettingsStore.getDefaultRetentionPolicy();
    }


    private _createEnvironmentList(envList: CommonTypes.PipelineDefinitionEnvironment[]): void {

        let environments: CommonTypes.PipelineDefinitionEnvironment[] = [];
        environments = JQueryWrapper.extendDeep(environments, envList);
        let storeList: DeployEnvironmentStore[] = [];
        this._environmentListModel = new EnvironmentListModel<CommonTypes.PipelineDefinitionEnvironment>();

        // populate id on all environments so that environment trigger store is able to resolve environment ids
        this._fillDataOnEnvironments(environments);

        // Create environment list model first.
        environments.forEach((environment: CommonTypes.PipelineDefinitionEnvironment) => {
            let instanceId: string = DtcUtils.getUniqueInstanceId();
            this._environmentListModel.addEnvironment(environment, instanceId);
        });

        // Create store with a completely populated environment list model. This is needed since
        // construction of the trigger store assumes that all environments are present in the 
        // environment list model.
        environments.forEach((environment: CommonTypes.PipelineDefinitionEnvironment) => {
            const instanceId = this._environmentListModel.getEnvironmentInstanceId(environment.id);
            storeList.push(
                StoreManager.CreateStore<DeployEnvironmentStore, IDeployEnvironmentStoreArgs>(
                    DeployEnvironmentStore,
                    instanceId,
                    {
                        environment: environment,
                        environmentListModel: this._environmentListModel,
                        isTemporary: false
                    }));
        });

        this.initializeListDataStore(storeList);
        this._lastLocallyAddedEnvironmentInstanceId = null;

        this.fixEnvironmentRanks(environments);

        this.emitChanged();
    }

    private _fillDataOnEnvironments(environments: CommonTypes.PipelineDefinitionEnvironment[]): void {
        environments.forEach((environment: CommonTypes.PipelineDefinitionEnvironment) => {
            if (environment.id === 0) {
                this.fillDataOnNewEnvironment(environment, 0, true, false, false, false);
            }
        });
    }

    private _publishRankTelemetry(): void {
        try {
            this._publishRankTelemetryInternal();
        }
        catch (e) {
            // Catch all exceptions in publishing telemetry and log it.
            Diag.logError(e);
        }
    }

    private _publishRankTelemetryInternal(): void {

        if (VssContext.getPageContext().webAccessConfiguration.isHosted) {

            // HACK !!! Needs to be called to ensure that the trigger conditions in environments are complemented by their ids
            // and the environments are updated in environment list model. There is a major design issue here. 
            this.getCurrentState();

            // Get disjoint graphs.
            const nodes = EnvironmentUtils.getNodes(this.getEnvironmentsData(), null);
            const edges = this.getEnvironmentConnections();
            const dependencies = GraphLayoutHelper.getDependencies(nodes, edges);
            const disjointGraphs = GraphLayoutHelper.getDisjointTreeFromEdges(dependencies);

            // Get nodes with incoming edges.
            const nodeKeysWithIncomingEdges = this._getNodeKeysWithIncomingEdges(edges);

            // Track the graphs which contain nodes with incoming edges.
            const nodeToGraphIndexMap = this._createNodeToGraphIndexMap(disjointGraphs);
            if (nodeKeysWithIncomingEdges && nodeKeysWithIncomingEdges.length > 0) {

                // Only if there are nodes with incoming edges, proceed further.
                const graphTracker: IDictionaryNumberTo<boolean> = {};
                nodeKeysWithIncomingEdges.forEach((nodeKey) => {
                    const graphIndex = nodeToGraphIndexMap[nodeKey];
                    graphTracker[graphIndex] = true;
                });

                // Now get the nodes without incoming edges which are not already included in
                // graphs connected to incoming edges.
                const nodeKeysWithoutIncomingEdges: string[] = [];
                nodes.forEach((node) => {
                    const graphIndex = nodeToGraphIndexMap[node.key];
                    if (!dependencies[node.key] || dependencies[node.key].length === 0) {
                        // This is a node without any dependencies. 

                        if (!graphTracker[graphIndex]) {
                            // This means the node was not included in any graph that is connected to 
                            // node with incoming edges. So this is a node without any incoming edges 
                            nodeKeysWithoutIncomingEdges.push(node.key);
                        }
                        else if (!Utils_Array.contains(nodeKeysWithIncomingEdges, node.key)) {
                            // Look for those nodes that do not have incoming edges but are connected
                            // to a graph containing node with incoming edges. 

                            // Consider them as node with incoming edges for the sake of telemetry
                            nodeKeysWithIncomingEdges.push(node.key);
                        }
                    }
                });

                if (nodeKeysWithoutIncomingEdges.length > 0) {
                    // Only if there are nodes without incoming edges with their own disjoint subgraphs, proceed further.
                    const nodeKeyToNodeMap = this._createNodeKeyToNodeMap(nodes);

                    // Sort node keys with incoming edges in increasing order of rank.
                    nodeKeysWithIncomingEdges.sort((node1, node2) => {
                        return nodeKeyToNodeMap[node1].nodeRankHint - nodeKeyToNodeMap[node2].nodeRankHint;
                    });

                    const minRank = nodeKeyToNodeMap[nodeKeysWithIncomingEdges[0]].nodeRankHint;
                    const maxRank = nodeKeyToNodeMap[nodeKeysWithIncomingEdges[nodeKeysWithIncomingEdges.length - 1]].nodeRankHint;

                    // If there is any node without incoming edges with rank in between min and max rank, then we got our case.
                    let interspersedGraphSizes: number[] = [];
                    let interspersedRootNodeTracker: IDictionaryNumberTo<boolean> = {};
                    for (const nodeKey of nodeKeysWithoutIncomingEdges) {
                        const rank = nodeKeyToNodeMap[nodeKey].nodeRankHint;
                        if (rank > minRank && rank < maxRank) {
                            const graphIndex = nodeToGraphIndexMap[nodeKey];
                            if (!interspersedRootNodeTracker[graphIndex]) {
                                interspersedRootNodeTracker[graphIndex] = true;
                                interspersedGraphSizes.push(disjointGraphs[graphIndex].length);
                            }
                        }
                    }

                    if (interspersedGraphSizes.length > 0) {
                        let properties: IDictionaryStringTo<any> = {};
                        properties[Properties.interspersedManualEnvironmentCount] = interspersedGraphSizes.length;
                        properties[Properties.sizeOfEachInterspersedManualEnvironment] = interspersedGraphSizes;
                        Telemetry.instance().publishEvent(Feature.InterspersedManualEnvironments, properties);
                    }
                }
            }

        }
    }

    private _createNodeToGraphIndexMap(graphs: string[][]): IDictionaryStringTo<number> {
        let nodeToGraphIndexMap: IDictionaryStringTo<number> = {};
        graphs.forEach((graph, index) => {
            graph.forEach((node) => nodeToGraphIndexMap[node] = index);
        });

        return nodeToGraphIndexMap;
    }

    private _getNodeKeysWithIncomingEdges(edges: EdgeMatrix): string[] {
        const incomingEdges = edges[Utils_String.empty];
        let nodesConnectedToIncomingEdges: string[] = [];
        for (const nodeKey in incomingEdges) {
            if (incomingEdges.hasOwnProperty(nodeKey)) {
                nodesConnectedToIncomingEdges.push(nodeKey);
            }
        }

        return nodesConnectedToIncomingEdges;
    }

    private _createNodeKeyToNodeMap(nodesForLayout: INodeData[]): IDictionaryStringTo<INodeData> {
        let nodeKeyToNodeMap: IDictionaryStringTo<INodeData> = {};
        nodesForLayout.forEach((node: INodeData) => {
            nodeKeyToNodeMap[node.key] = node;
        });

        return nodeKeyToNodeMap;
    }

    private _environmentListActionsHub: EnvironmentListActionsHub;
    private _uniqueNameSuffix: number = 1;
    private _duplicateNameSuffix: number = 1;
    private _environmentListModel: EnvironmentListModel<CommonTypes.PipelineDefinitionEnvironment>;
    private _definitionSettingsStore: DefinitionSettingsStore;
    private _lastLocallyAddedEnvironmentInstanceId: string;
}
