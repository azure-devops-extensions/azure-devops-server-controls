
import { ITask, ISelectedPathNode, DefinitionType } from "DistributedTasksCommon/TFS.Tasks.Types";
import { ITaskDelegates } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { InputState } from "DistributedTaskControls/Common/Common";
import { IDeployPhase } from "DistributedTaskControls/Phase/Types";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { IGroup } from "OfficeFabric/GroupedList";

import { TaskInputDefinitionBase, DataSourceBindingBase, TaskSourceDefinitionBase, ProcessParameters } from "TFS/DistributedTaskCommon/Contracts";
import { DeploymentGroup, DeploymentGroupMetrics, DeploymentMachine, TaskVersion, TaskInputDefinition } from "TFS/DistributedTask/Contracts";

import * as ComponentBase from "VSS/Flux/Component";
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");

export interface IYamlTemplateItem {
    definition: IYamlTemplateDefinition;
    group: IGroup;
}

export interface IYamlTemplateDefinition {
    id: string;
    name: string;
    description: string;
    iconClassName: string;
}

export interface ITemplateDefinition {
    description: string;
    iconUrl: string;
    id: string;
    name: string;
    groupId: string;
    canDelete: boolean;
    category: string;
    defaultHostedQueue: string;
}

export interface ITemplatesPayload {
    templates: ITemplateDefinition[];
    preserveFilter: boolean;
}

export interface IApplicationLayerContext {
    isFileSystemBrowsable?: () => boolean;
    taskDelegates?: ITaskDelegates;
    processParametersNotSupported?: boolean;
    processInstanceId?: string;
}

export interface IInputSetContext {
    isFileSystemBrowsable?: () => boolean;
    taskDelegates?: ITaskDelegates;
    processParametersNotSupported?: boolean;
}

export interface ITaskContext extends IInputSetContext, ITaskContextOptions {
    onChangeDelegate: () => void;
    onRemoveDelegate: (id: string) => void;
    processInstanceId: string;
    taskListStoreInstanceId: string;
    isActiveDelegate?: (id: string) => boolean;
}

export interface ITaskContextOptions {
    /**
     * true will hide control options in a task
     */
    donotShowControlOptions?: boolean;
    /**
     * true will hide task versions option in a task header
     */
    donotShowVersions?: boolean;
    /**
     * true will hide links like remove the task or link process parameters etc in header
     */
    donotShowLinkOptions?: boolean;
    /**
     * true will hide output variables group
     */
    donotShowOutputVariables?: boolean;
    /**
     * true will hide YAML feature
     */
    donotShowYAMLFeature?: boolean;

    donotShowTimeout?: boolean;

    donotShowContinueOnError?: boolean;

    donotShowAlwaysRun?: boolean;
    /**
     * true will hide Task Group related context menu items in a task
     */
    donotShowTaskGroupOptions?: boolean;
}

export interface IAddTaskPayload {
    task: ITask;
}

export interface ITaskInputValue {
    name: string;
    value: string;
}

export interface ITaskInputError {
    name: string;
    value: string;
    message: string;
}

export interface ITaskInputOptions {
    name: string;
    options: IDictionaryStringTo<string>;
}

export enum ActionForTaskInput {
    None,
    LinkToProcessParameter,
    UnlinkFromProcessParameter,
    NavigateToVariablesTab
}

export interface IInputControllerActions {
    updateTaskInputValue: (name: string, value: string) => void;
    updateTaskInputError: (name: string, error: string, value: string) => void;
    updateTaskInputOptions: (name: string, options: IDictionaryStringTo<string>) => void;
}

export class ILinkToProcessParameterPayload {
    inputName: string;
    processParametername: string;
}

export interface IInputControllerStore {
    addChangedListener: (onChanged: () => void) => void;
    removeChangedListener: (onChanged: () => void) => void;
    getTaskInputState: (inputName: string) => IInputBaseState;
    getInputState: (taskInputDefinition: TaskInputDefinitionBase, value: string) => InputState;
    isInputValid?: (input: TaskInputDefinitionBase) => boolean;
    // Specific to dependent inputs and picklist.
    getDataSourceBindings?: () => DataSourceBindingBase[];
    getSourceDefinitions?: () => TaskSourceDefinitionBase[];
    getInputToValueMap?: () => IDictionaryStringTo<string>;
    getInputToResolvedValueMap?: () => IDictionaryStringTo<string>;
    getTaskDefinitionId?: (inputDefinition: TaskInputDefinitionBase) => string;
    getProcessParameterToValueMap?: () => IDictionaryStringTo<string>;
    isDirty?: () => boolean;
    // Specific to file path input and showing link/unlink process parameter
    getTaskContext?: () => ITaskContext;
    getActionForInputField?: (inputName: string) => ActionForTaskInput;
}

export interface IInputBaseState {
    inputName: string;
    inputValue: string;
    isHidden: () => boolean;
    disabled?: boolean;
    options?: IDictionaryStringTo<string>;
}

export interface IResolvedTaskInputValue {
    actualValue: string;
    resolvedValue: string;
    isResolved: boolean;
    boundProcessParameterName?: string;
}

export interface IShiftListItemPayload {
    itemKey: string;
    shiftBy: number;
}

export interface IUpdatePhasesPayload {
    phases: IDeployPhase[];
    isForceInitializationOfStore?: boolean;
}

export interface ICreateProcessParameterPayload {
    dataSourceBinding: DataSourceBindingBase;
    input: TaskInputDefinitionBase;
    sourceDefinition: TaskSourceDefinitionBase;
}

export interface IProcessParameterReferenceData {
    processParameterName: string;
    referenceCount: number;
}

export interface IUpdateReferencePayload {
    processParameterReferenceData: IProcessParameterReferenceData[];
    shouldReferencesIncrease: boolean;
}

export interface IUpdateProcessParameterReferencePayload {
    processParameterReferencePayload: IUpdateReferencePayload;
    processInstanceId: string;
}

export interface IInitializeProcessParametersPayload {
    phaseList: IDeployPhase[];
    processParameters: ProcessParameters;
    forceUpdate?: boolean;
}

export interface IRemoveTaskReferencePayload {
    name: string;
}

export interface ITaskVersionInfo {
    versionSpec: string;
    isPreview: boolean;
    isDeprecated: boolean;
}

export namespace TaskItemType {
    export const Task: string = DefinitionType.task;
    export const MetaTask: string = DefinitionType.metaTask;
    export const Extension: string = Resources.ExtensionText;
}

export namespace ExtensionStatisticName {
    export const Install: string = "install";
    export const OnpremDownloads: string = "onpremDownloads";
}

export interface ITaskItem {
    author: string;
    description: string;
    friendlyName: string;
    iconUrl: string;
    id: string;
    name: string;
    definitionType: string;
}

export interface ITaskDefinitionItem extends ITaskItem {
    helpMarkDown: string;
    category: string;    
    deprecated: boolean;
    version: TaskVersion;
    inputs: TaskInputDefinition[]; 
}

export interface IExtensionDefinitionItem extends ITaskItem {
    extensionStatusText: string;
    extensionUrl: string;
    installCount: number;
    tags?: string[];
}

export interface IRequestedExtension {
    id: string;
    requestedBy: VSS_Common_Contracts.IdentityRef[];
}

export enum ScheduleDays {
    None = 0,
    Monday = 1,
    Tuesday = 2,
    Wednesday = 4,
    Thursday = 8,
    Friday = 16,
    Saturday = 32,
    Sunday = 64,
    All = 127,
}

export interface IScheduleTriggerOptions {
    isChecked?: boolean;
    day?: ScheduleDays;
    hour?: number;
    minute?: number;
    timeZoneId?: string;
    id: number;
}

export interface IDateTimeSchedule {
    days: ScheduleDays;
    startHours: number;
    startMinutes: number;
}

export enum DraggedOverRegion {
    None = 0,
    Top = 1,
    Bottom = 2,
}

export interface ITabItemProps extends ComponentBase.Props {
    key: string;
    tabKey: string;
    title: string;
    icon?: string;
    customRenderer?: (props: ComponentBase.Props, defaultRenderer: (props: ComponentBase.Props) => JSX.Element) => JSX.Element;
}

export enum BranchFilterType {
    TagName,
    BranchName
}

export enum TemplateDefinitionCategory {
    Featured,
    Others,
    Custom
}

export interface IDragDropData {
    listId: string;
    key: string;
    data: any;
}

export interface IInsertListItemData {
    // the item that is to be inserted
    sourceItem: IDragDropData;
    // the item relative to which the insert is to be done
    targetItem: IDragDropData;
    // flag to specify if source item should be inserted before target item
    shouldInsertBefore?: boolean;
    // flag to specify if insertion should be done for copy of source item
    shouldInsertCopy?: boolean;
}

export interface IDeploymentGroupsResult {
    deploymentGroups: DeploymentGroup[];
    continuationToken?: string;
}

export interface IDeploymentGroupsMetricsResult {
    deploymentGroupsMetrics: DeploymentGroupMetrics[];
    continuationToken?: string;
}

export interface IDeploymentTargetsResult {
    deploymentTargets: DeploymentMachine[];
    continuationToken?: string;
}

export interface IErrorState {
    errorMessage: string;
    errorStatusCode: number;
}