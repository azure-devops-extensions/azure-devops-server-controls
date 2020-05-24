
import { ITask } from "DistributedTasksCommon/TFS.Tasks.Types";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ViewStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import {
    ActionForTaskInput,
    IInputControllerStore,
    IInputBaseState,
    ITaskContext
} from "DistributedTaskControls/Common/Types";
import { ProcessParameterStore, ProcessParametersUtilities } from "DistributedTaskControls/Stores/ProcessParameterStore";
import { DeployPhaseListStore } from "DistributedTaskControls/Phase/Stores/DeployPhaseListStore";
import { PhaseStoreBase } from "DistributedTaskControls/Phase/Stores/PhaseStoreBase";
import { TaskItem } from "DistributedTaskControls/Components/Task/TaskItem";
import { IDeployPhase, DeployPhaseTypes } from "DistributedTaskControls/Phase/Types";
import * as Common from "DistributedTaskControls/Common/Common";

import {
    TaskInputDefinitionBase as TaskInputDefinition, TaskSourceDefinitionBase as TaskSourceDefinition,
    DataSourceBindingBase as DataSourceBinding, ProcessParameters
} from "TFS/DistributedTaskCommon/Contracts";

import { TaskGroupDefinition } from "TFS/DistributedTask/Contracts";

import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";
import * as Diag from "VSS/Diag";

export interface IInputReference {
    phaseStoreInstanceId: string;
    taskStoreInstanceId: string;
}

export interface IGroupedData {
    phaseStoreInstanceId: string;
    processParameterInputs: TaskInputDefinition[];
    rank: number;
}

export interface IProcessParameterViewState {
    phaseGroupedData: IGroupedData[];
    inputNameToLinkMap: IDictionaryStringTo<IInputReference[]>;
    inputNameToRefCountMap: IDictionaryStringTo<number>;
    processParameterInputs: TaskInputDefinition[];
}

export class ProcessParameterViewStore extends ViewStoreBase implements IInputControllerStore {

    //Public member functions---------------------------------------------------------------------------------------------------------------------------
    //---------------------------------------------------------------------------------------------------------------------------------------------------
    //---------------------------------------------------------------------------------------------------------------------------------------------------

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);

        this._state = {} as IProcessParameterViewState;

        this._processParameterDataStore = StoreManager.GetStore<ProcessParameterStore>(ProcessParameterStore, instanceId);
        this._phaseListDataStore = StoreManager.GetStore<DeployPhaseListStore>(DeployPhaseListStore, instanceId);

        this._onDataStoreChanged();
        this._processParameterDataStore.addChangedListener(this._onDataStoreChanged);
        this._phaseListDataStore.addChangedListener(this._onDataStoreChanged);
    }

    public disposeInternal(): void {
        this._processParameterDataStore.removeChangedListener(this._onDataStoreChanged);
        this._phaseListDataStore.removeChangedListener(this._onDataStoreChanged);
    }

    public getState(): IProcessParameterViewState {
        return this._state;
    }

    public static getKey(): string {
        return Common.StoreKeys.ProcessParameterViewStore;
    }

    public getProcessParameters(): ProcessParameters {
        return this._processParameterDataStore.getProcessParameters();
    }

    public getTaskInputState(inputName: string): IInputBaseState {
        let taskInputState = this._processParameterDataStore.getTaskInputState(inputName);
        return taskInputState;
    }

    public getTaskContext(): ITaskContext {
        return this._processParameterDataStore.getTaskContext();
    }

    public getInputState(inputDefn: TaskInputDefinition, value: string): Common.InputState {
        return this._processParameterDataStore.getInputState(inputDefn, value);
    }

    public getSourceDefinitions(): TaskSourceDefinition[] {
        return this._processParameterDataStore.getSourceDefinitions();
    }

    public isInputValid(inputDefn: TaskInputDefinition): boolean {
        return this._processParameterDataStore.isInputValid(inputDefn);
    }

    public getDataSourceBindings(): DataSourceBinding[] {
        return this._processParameterDataStore.getDataSourceBindings();
    }

    public getTaskDefinitionIdForTaskInstance(taskInstance: string): string {
        if (this._taskStoreInstanceIdToITaskMap && taskInstance) {
            return this._taskStoreInstanceIdToITaskMap[taskInstance].task.id;
        }
    }

    public getTaskDefinitionId(input: TaskInputDefinition): string {
        Diag.Debug.assertIsNotNull(input, "Input in getTaskDefinitionId func call cannot be null");
        if (input) {
            let inputNameToLinkMap = this.getInputNameToLinkMap();
            let inputNameKey = input.name ? input.name.toLowerCase() : null;

            //Currently the match is strict to the first input name match, as the same methodology was applied previously too.
            let taskInstanceId = null;
            if (inputNameKey && inputNameToLinkMap[inputNameKey] && inputNameToLinkMap[inputNameKey].length > 0) {
                taskInstanceId = inputNameToLinkMap[inputNameKey][0].taskStoreInstanceId;
            }

            return this.getTaskDefinitionIdForTaskInstance(taskInstanceId);
        }
        
        return null;
    }

    public getActionForInputField(inputName: string): ActionForTaskInput {
        // For process parameter will have action to navigate to variables tab.
        return ActionForTaskInput.NavigateToVariablesTab;
    }

    public getProcessParameterToValueMap(): IDictionaryStringTo<string> {
        return this._processParameterDataStore.getProcessParameterToValueMap();
    }

    public getTaskName(taskInstanceId: string): string {
        if (this._taskStoreInstanceIdToITaskMap && taskInstanceId && this._taskStoreInstanceIdToITaskMap[taskInstanceId]) {
            return this._taskStoreInstanceIdToITaskMap[taskInstanceId].displayName;
        }
    }

    public getPhaseName(phaseStoreInstanceId: string): string {
        if (this._phaseStoreInstanceIdToPhaseMap && phaseStoreInstanceId && this._phaseStoreInstanceIdToPhaseMap[phaseStoreInstanceId]) {
            return this._phaseStoreInstanceIdToPhaseMap[phaseStoreInstanceId].name;
        }
    }

    public getPhaseType(phaseStoreInstanceId: string): DeployPhaseTypes {
        if (this._phaseStoreInstanceIdToPhaseMap && phaseStoreInstanceId && this._phaseStoreInstanceIdToPhaseMap[phaseStoreInstanceId]) {
            return this._phaseStoreInstanceIdToPhaseMap[phaseStoreInstanceId].phaseType;
        }
    }

    public getInputToResolvedValueMap(): IDictionaryStringTo<string> {
        return this.getInputToValueMap();
    }

    public getInputToValueMap(): IDictionaryStringTo<string> {
        return this._processParameterDataStore.getInputToValueMap();
    }

    public getGroupDefinition(phaseStoreInstanceId: string): TaskGroupDefinition {
        let groupDefinition: TaskGroupDefinition = {
            displayName: this.getPhaseName(phaseStoreInstanceId),
            isExpanded: true,
            name: phaseStoreInstanceId,
            tags: [],
            visibleRule: Utils_String.empty
        };
        return groupDefinition;
    }

    //Logic for phase.task string development
    public getInputReferencesText(inputName: string, noPhaseName: boolean = false): string[] {
        let inputNameToLinkData = this.getInputNameToLinkMap();
        let inputNameKey = inputName ? inputName.toLowerCase() : null;

        let phaseTaskNames: string[] = [];
        if (inputNameToLinkData && inputNameKey && inputNameToLinkData[inputNameKey]) {
            inputNameToLinkData[inputNameKey].forEach((linkData: IInputReference, index: number) => {

                let inputNameLinkRef = this._getInputLinkName(linkData.phaseStoreInstanceId, linkData.taskStoreInstanceId, noPhaseName);

                phaseTaskNames.push(inputNameLinkRef);
            });
        }
        return phaseTaskNames;
    }

    public getPhaseGroupedInputsData(): IGroupedData[] {
        return this._phasesGroupedData;
    }

    public getInputNameToLinkMap(): IDictionaryStringTo<IInputReference[]> {
        return this._inputNameToLinkMap;
    }

    public getInputNameToLinkRefCount(): IDictionaryStringTo<number> {
        return this._inputNameToLinkRefCountMap;
    }

    //Private member functions---------------------------------------------------------------------------------------------------------------------------
    //---------------------------------------------------------------------------------------------------------------------------------------------------
    //---------------------------------------------------------------------------------------------------------------------------------------------------

    private _onDataStoreChanged = (): void => {
        //To re-initialize all maps when data store changes
        this._initializeMaps();

        //To re-create linking on data store changes
        this._createTwoWayLinking();

        //Sort phase grouping on ranks
        this._sortPhaseGrouping();

        this._state = {
            phaseGroupedData: this.getPhaseGroupedInputsData(),
            inputNameToLinkMap: this.getInputNameToLinkMap(),
            processParameterInputs: this._processParameterDataStore.getState().inputs,
            inputNameToRefCountMap: this.getInputNameToLinkRefCount()
        };

        //To make the view listen the state change
        this.emitChanged();
    }

    private _initializeMaps(): void {
        this._nameToInputDefnMap = {};
        this._taskStoreInstanceIdToITaskMap = {};
        this._phaseStoreInstanceIdToPhaseMap = {};
        this._phasesGroupedData = [];
        this._inputNameToLinkMap = {};
        this._inputNameToLinkRefCountMap = {};
    }

    //This func return link ref for each input
    // ex: {PhaseA.TaskA}
    // ex: {PhaseA}
    // ex: {TaskA}
    private _getInputLinkName(phaseStoreInstanceId: string, taskStoreInstanceId: string, noPhaseName: boolean): string {
        let inputLinkName: string = Utils_String.empty;

        let phaseName = noPhaseName ? null : this.getPhaseName(phaseStoreInstanceId);
        let taskName = this.getTaskName(taskStoreInstanceId);

        if (phaseName) {
            inputLinkName = inputLinkName.concat(Utils_String.localeFormat("'{0}'", phaseName));
        }

        //If phase name and task name both exists
        if (taskName && phaseName) {
            inputLinkName = inputLinkName.concat(Common.DotSeparator, Utils_String.localeFormat("'{0}'", taskName));
        }
        else if (taskName) {
            //If only task name exists
            inputLinkName = inputLinkName.concat(Utils_String.localeFormat("'{0}'", taskName));
        }

        return inputLinkName;
    }

    private _createTwoWayLinking(): void {
        let processParameters = this._processParameterDataStore.getProcessParameters();
        let phaseStoreList = this._phaseListDataStore.getPhaseStores();

        if (processParameters && processParameters.inputs && phaseStoreList) {
            processParameters.inputs.forEach((processParameterTaskInputDefinition: TaskInputDefinition) => {

                //Get the process parameter bound name to search for
                let processParameterBoundValue: string = Utils_String.format(Common.ProcessParameterConstants.NewProcessParameterBoundInputValueFormat,
                    processParameterTaskInputDefinition.name);

                // Search the bound value in all task input in all build steps in all phases
                phaseStoreList.forEach((phaseStore: PhaseStoreBase) => {
                    
                    if (phaseStore) {
                        const overrideInputs = phaseStore.getOverrideInputs();

                        ProcessParametersUtilities.searchProcessParametersInInputs(overrideInputs, processParameterBoundValue, () => {
                            this._updateMaps(processParameterTaskInputDefinition, phaseStore, null);
                        });

                        if (phaseStore) {
                            let taskItems = phaseStore.getTaskItems();

                            if (taskItems && taskItems.taskItemList) {

                                taskItems.taskItemList.forEach((taskItem: TaskItem) => {
                                    let task: ITask = taskItem.getTask();

                                    //Search process parameter bound value in each task item
                                    ProcessParametersUtilities.searchTaskInputProcessParametersReferences(task, processParameterBoundValue, () => {
                                        this._updateMaps(processParameterTaskInputDefinition, phaseStore, taskItem);
                                    });
                                });
                            }
                        }
                    }

                });


            });
        }
    }

    //This function creates 5 maps
    // 1.) Process parameter input name to Input definition
    // 2.) TaskStoreInstanceId to ITask
    // 3.) PhaseStoreInstanceId to Phase data
    // 4.) Phase grouped Process parameters for UI 
    // 5.) Process parameter name to array of [{PhaseStoreInstanceID, TaskStoreInstanceId}]
    private _updateMaps(processParameterInputDefinition: TaskInputDefinition, phaseStore: PhaseStoreBase, taskItem?: TaskItem) {
        if (processParameterInputDefinition && processParameterInputDefinition.name) {
            let taskStoreInstanceId = taskItem ? taskItem.getKey() : null;

            //Updating maps with relevant data
            let inputUniqueName = processParameterInputDefinition.name.toLowerCase();
            if (this._nameToInputDefnMap) {
                this._nameToInputDefnMap[inputUniqueName] = processParameterInputDefinition;
            }

            //Skip this for phase level process parameters
            if (taskItem) {
                let task = taskItem.getTask();
                this._maintainTaskMapping(taskStoreInstanceId, task);
            }

            this._maintainPhaseMapping(phaseStore.getInstanceId(), phaseStore.getState());

            this._maintainPhaseGrouping(phaseStore.getInstanceId(), processParameterInputDefinition, phaseStore.getState().rank);
            this._addToTwoWayLinkingMap(processParameterInputDefinition, phaseStore.getInstanceId(), taskStoreInstanceId);
        }
    }

    private _sortPhaseGrouping(): void {
        if (this._phasesGroupedData) {
            this._phasesGroupedData.sort((a: IGroupedData, b: IGroupedData) => {
                return a.rank - b.rank;
            });
        }
    }

    /* Grouped Data to show inputs in a group.
    // Object is an array:
    //  [0]- {phaseStoreInstanceId_A, [inputDefinition_solution, inputDefinition_timeout, inputDefinition_testVersion], rank_1
    //  [1]- {phaseStoreInstanceId_B, [inputDefinition_solution, inputDefinition_MSBuildVersion], rank_0
    //  [2]- {phaseStoreInstanceId_C, [inputDefinition_NotifyUsers], rank_2
    */
    //Use: This map will be used to get the inputs lper phase
    private _maintainPhaseGrouping(phaseStoreInstanceId: string, processParameterInputDefinition: TaskInputDefinition, rank: number): void {
        Diag.Debug.assertIsNotUndefined(this._phasesGroupedData, "This map should not be undefined when the function is called");

        let doesPhaseKeyExist: boolean = false;
        //Check if an entry for the matched phase store exists.
        //If it does exist, then just push the input definition it the same object
        this._phasesGroupedData.forEach((perPhaseGroupData: IGroupedData, index: number) => {
            if (Utils_String.defaultComparer(perPhaseGroupData.phaseStoreInstanceId, phaseStoreInstanceId) === 0) {

                doesPhaseKeyExist = true;

                //Check if the same process parameter input definition exists in the group
                //If false, then simple push that input definition
                let processParameterExists = this._checkIfUniqueProcessParameterExistsPerPhase(this._phasesGroupedData[index].processParameterInputs, processParameterInputDefinition);

                if (!processParameterExists) {
                    this._phasesGroupedData[index].processParameterInputs.push(processParameterInputDefinition);
                }
            }
        });

        if (!doesPhaseKeyExist) {
            //Create a new entry for the phase store and input definition
            this._phasesGroupedData.push({
                phaseStoreInstanceId: phaseStoreInstanceId,
                processParameterInputs: [processParameterInputDefinition],
                rank: rank
            });
        }
    }

    private _checkIfUniqueProcessParameterExistsPerPhase(processParametersPerPhase: TaskInputDefinition[], processParameterInputDefinition: TaskInputDefinition): boolean {
        let processParameterUnique: boolean = false;
        if (processParametersPerPhase) {
            processParametersPerPhase.forEach((processParameter: TaskInputDefinition) => {
                if (Utils_String.defaultComparer(processParameter.name.toLowerCase(), processParameterInputDefinition.name.toLowerCase()) === 0) {
                    processParameterUnique = true;
                }
            });
        }
        return processParameterUnique;
    }


    private _maintainTaskMapping(taskStoreInstanceId: string, task: ITask) {
        if (this._taskStoreInstanceIdToITaskMap && taskStoreInstanceId) {
            this._taskStoreInstanceIdToITaskMap[taskStoreInstanceId] = task;
        }
    }

    private _maintainPhaseMapping(phaseStoreInstanceId: string, phase: IDeployPhase) {
        if (this._phaseStoreInstanceIdToPhaseMap && phaseStoreInstanceId) {
            this._phaseStoreInstanceIdToPhaseMap[phaseStoreInstanceId] = phase;
        }
    }


    /*  Brief object visualization
    //  [inputName_solution] -> [{phaseInstanceId_A, taskInstanceId_A},
                               {phaseInstanceId_A, taskInstanceId_B},
                               {phaseInstanceId_B, taskInstanceId_A}]

        [inputName_testSelection] -> [{phaseInstanceId_A, taskInstanceId_X},
                                    {phaseInstanceId_B, taskInstanceId_Y},
                                    {phaseInstanceId_B, taskInstanceId_Z}]
        [inputName_timeOut] -> [{phaseInstanceId_A, null},
                               {phaseInstanceId_B, null}]
    **/
    //Use: This map will be used to get the footer info
    private _addToTwoWayLinkingMap(input: TaskInputDefinition, phaseStoreInstanceId: string, taskStoreInstanceId: string) {

        Diag.Debug.assertIsNotUndefined(this._inputNameToLinkMap, "This map should not be undefined when the function is called");
        Diag.Debug.assertIsNotUndefined(phaseStoreInstanceId, "There should be some phase store instance id when the function is called");

        let inputNameKey: string = input.name.toLowerCase();

        if (!this._inputNameToLinkMap[inputNameKey]) {
            this._inputNameToLinkMap[inputNameKey] = [];
            this._inputNameToLinkRefCountMap[inputNameKey] = 0;
        }
        this._inputNameToLinkRefCountMap[inputNameKey] += 1;

        //Searching if phase store instance id and task store instance id are matching any of the already existing maps
        //If true, we do not want to push that data again to maintain uniqueness for a task name in the callout for the proc param
        //If false, we want to push the data.
        let isInputReferenceAlreadyVisited: boolean = false;
        if (this._inputNameToLinkMap[inputNameKey]) {
            this._inputNameToLinkMap[inputNameKey].forEach((linkData: IInputReference) => {
                if (Utils_String.ignoreCaseComparer(linkData.phaseStoreInstanceId, phaseStoreInstanceId) === 0 &&
                    Utils_String.ignoreCaseComparer(linkData.taskStoreInstanceId, taskStoreInstanceId) === 0) {
                    isInputReferenceAlreadyVisited = true;
                }
            });
        }

        if (!isInputReferenceAlreadyVisited) {
            this._inputNameToLinkMap[inputNameKey].push({
                phaseStoreInstanceId: phaseStoreInstanceId,
                taskStoreInstanceId: taskStoreInstanceId
            });
        }
    }

    //Private member variables---------------------------------------------------------------------------------------------------------------------------
    //---------------------------------------------------------------------------------------------------------------------------------------------------
    //---------------------------------------------------------------------------------------------------------------------------------------------------


    private _inputNameToLinkRefCountMap: IDictionaryStringTo<number>;
    private _inputNameToLinkMap: IDictionaryStringTo<IInputReference[]>;
    private _phasesGroupedData: IGroupedData[];
    private _nameToInputDefnMap: IDictionaryStringTo<TaskInputDefinition>;
    private _taskStoreInstanceIdToITaskMap: IDictionaryStringTo<ITask>;
    private _phaseStoreInstanceIdToPhaseMap: IDictionaryStringTo<IDeployPhase>;
    private _phaseListDataStore: DeployPhaseListStore;
    private _processParameterDataStore: ProcessParameterStore;
    private _state: IProcessParameterViewState;
}