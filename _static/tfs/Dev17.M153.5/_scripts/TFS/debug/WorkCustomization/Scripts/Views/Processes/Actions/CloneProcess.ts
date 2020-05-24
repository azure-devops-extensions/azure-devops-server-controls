import * as Service from "VSS/Service";
import { Action } from "VSS/Flux/Action";
import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";
import { IProcess, ICloneProcessRequestPayload, ICreateProcessRequestPayload, ISetEnableProcessPayload, IDeleteProcessRequestPayload } from "WorkCustomization/Scripts/Contracts/Process";
import { WebAccessHttpClient, ICreateProcessResult, IWebAccessHttpClient } from "WorkCustomization/Scripts/WebApi/WebAccessHttpClient";
import { WorkItemTypesActionCreator } from "WorkCustomization/Scripts/Actions/WorkItemTypesActions";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import StringUtils = require("VSS/Utils/String");
import ProcessesHttpClient = require("TFS/WorkItemTracking/ProcessRestClient");
import ProcessDefinitionsHttpClient = require("TFS/WorkItemTracking/ProcessDefinitionsRestClient");
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import ProcessDefinitionsContracts = require("TFS/WorkItemTracking/ProcessDefinitionsContracts");
import { autobind } from "OfficeFabric/Utilities";
import { FieldUtils, CommonUtils, ProcessUtils } from "WorkCustomization/Scripts/Utils/CommonUtils";
import { showErrorAction, clearErrorAction } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";
import Q = require("q");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import * as TFS_Core_Utils from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { CloneUtils } from "WorkCustomization/Scripts/Utils/CloneUtils";
import { ProcessCustomizationTelemetry } from "WorkCustomization/Scripts/Utils/Telemetry";
import { CopyProcessTasks } from "WorkCustomization/Scripts/Constants";
import { utils } from "knockout";

/*
    This is a tree representation of how tasks are executed.
    Left side of the arrow represents a task and right side represents what task it triggers.
    RIght side can have different tasks. Separate arrays represent that only of the array will execute. Different arrays represents if-else triggers.
    Task order of execution is top-bottom on left of arrow.
    If you add any new task there are chances it might regress. So update the tree below.

    getProcessesTask => [createProcessTask]
    createProcessTask => [disableProcessTask, getInheritedBehaviorsTask, getWorkItemTypesTask]
    disableProcessTask => []
    getInheritedBehaviorsTask => [getSourceBehaviorsTask]
    getWorkItemTypesTask => [createWorkItemTypeTask] [getNewInheritedWorkItemTypesTask]
    getSourceBehaviorsTask => [replaceBehaviorTask]
    createWorkItemTypeTask => [getFieldsTask, getNewLayoutTask, getNewWitBehaviorsTask, getNewStatesTask]
    getNewInheritedWorkItemTypesTask => [updateWorkItemTypeTask]
    replaceBehaviorTask => []
    getFieldsTask => [createFieldTask]
    getNewLayoutTask => [getWitFieldsTask]
    getNewWitBehaviorsTask => [getOldProcessBehaviorsTask]
    getNewStatesTask => [getStatesTask, getRulesTask]
    updateWorkItemTypeTask => []
    createFieldTask => []
    getWitFieldsTask => [updatePageNameTask]
    getOldProcessBehaviorsTask => [getWitBehaviorsTask]
    getStatesTask => [createStateTask] [hideStateTask] [updateStateTask]
    getRulesTask => [createRuleTask]
    updatePageNameTask => [updateGroupNameTask]
    getWitBehaviorsTask => [createWitBehaviorTask]
    createStateTask => []
    hideStateTask => []
    updateStateTask => []
    createRuleTask => []
    updateGroupNameTask => [updateGroupTask, updateLayoutPayloadTask]
    createWitBehaviorTask => []
    updateGroupTask => []
    updateLayoutPayloadTask => [getLayoutTask]
    getLayoutTask => [createLayoutPageTask] [getNewWitLayoutGroupTask]
    createLayoutPageTask => [createLayoutGroupTask]
    getNewWitLayoutGroupTask => [editFieldTask] [addFieldToLayoutTask]
    createLayoutGroupTask => [addFieldToLayoutTask]
    editFieldTask => []
    addFieldToLayoutTask => [setFieldOrderTask]
    addFieldToLayoutTask => [setFieldOrderTask]
    setFieldOrderTask => []
    setFieldOrderTask => []
*/
export interface IEndCloneProcessPayload {
    process: IProcess;
}

interface ICloneTask {
    func: (data: any) => void;
    data: any;
    isFinalizeTask?: boolean;
    taskName: string;
}

interface IFinalizeTaskPayload {
    disablePayload: ISetEnableProcessPayload,
    process: IProcess
    sourceProcessId: string,
    targetProcessId: string
}

interface ICloneWorkItemTypePayload {
    targetProcess: ICreateProcessResult;
    newWorkItemType: ProcessContracts.ProcessWorkItemType;
    originalWorkItemType: ProcessContracts.ProcessWorkItemType;
}

interface IGetNewInheritedWorkItemTypesPayload {
    targetProcess: ICreateProcessResult;
    originalWorkItemType: ProcessContracts.ProcessWorkItemType;
    updatedWorkItemType: ProcessContracts.ProcessWorkItemType;
}

interface IUpdateWorkItemTypePayload {
    targetProcess: ICreateProcessResult;
    newWorkItemType: ProcessContracts.ProcessWorkItemType;
    updatedWorkItemType: ProcessContracts.ProcessWorkItemType;
}

interface IGetBehaviorsPayload {
    targetProcess: ICreateProcessResult;
    inheritedBehaviors: ProcessContracts.ProcessBehavior[];
}

interface IGetOldProcessBehaviorsPayload {
    targetProcess: ICreateProcessResult;
    newWorkItemType: ProcessContracts.ProcessWorkItemType;
    originalWorkItemType: ProcessContracts.ProcessWorkItemType;
    newProcessBehaviors: ProcessContracts.ProcessBehavior[];
}

interface IGetWitBehaviorsPayload {
    targetProcess: ICreateProcessResult;
    newWorkItemType: ProcessContracts.ProcessWorkItemType;
    originalWorkItemType: ProcessContracts.ProcessWorkItemType;
    newProcessBehaviors: ProcessContracts.ProcessBehavior[];
    oldProcessBehaviors: ProcessContracts.ProcessBehavior[];
}

interface IReplaceBehaviorPayload {
    targetProcess: ICreateProcessResult;
    newBehavior: ProcessContracts.ProcessBehaviorUpdateRequest;
    newBehaviorId: string;
}

interface ICloneBehaviorPayload {
    targetProcess: ICreateProcessResult;
    newBehavior: ProcessContracts.ProcessBehaviorCreateRequest;
}

interface IGetWitFieldsPayload {
    targetProcess: ICreateProcessResult;
    newWorkItemTypeLayout: ProcessContracts.FormLayout;
    newWorkItemType: ProcessContracts.ProcessWorkItemType;
    originalWorkItemType: ProcessContracts.ProcessWorkItemType;
}

interface IClonePagePayload {
    targetProcess: ICreateProcessResult;
    newPage: ProcessContracts.Page;
    originalPage: ProcessContracts.Page;
    newWorkItemType: ProcessContracts.ProcessWorkItemType;
    newFields: ProcessContracts.ProcessWorkItemTypeField[];
}

interface IGetGroupsPayload {
    targetProcess: ICreateProcessResult;
    newWorkItemType: ProcessContracts.ProcessWorkItemType;
}

interface ICloneGroupPayload {
    targetProcess: ICreateProcessResult;
    newGroup: ProcessContracts.Group;
    originalGroup: ProcessContracts.Group;
    newSectionId: string;
    newPageId: string;
    newWorkItemType: ProcessContracts.ProcessWorkItemType;
    newFields: ProcessContracts.ProcessWorkItemTypeField[];
}

interface IGetLayoutPayload {
    targetProcess: ICreateProcessResult;
    newWorkItemTypeLayout: ProcessContracts.FormLayout;
    newWorkItemType: ProcessContracts.ProcessWorkItemType;
    originalWorkItemType: ProcessContracts.ProcessWorkItemType;
    newFields: ProcessContracts.ProcessWorkItemTypeField[];
}

interface ICloneFieldPayload {
    targetProcess: ICreateProcessResult;
    newField: ProcessContracts.ProcessWorkItemTypeField;
    newWorkItemType: ProcessContracts.ProcessWorkItemType;
}

interface IUpdateGroupPayload {
    targetProcess: ICreateProcessResult;
    groupToUpdate: ProcessContracts.Group;
    witRefName: string;
    pageId: string;
    sectionId: string;
}

interface IGetNewWitGroupPayload {
    targetProcess: ICreateProcessResult;
    newControl: ProcessContracts.Control;
    newWorkItemType: ProcessContracts.ProcessWorkItemType;
    originalControl: ProcessContracts.Control;
    originalGroup: ProcessContracts.Group;
    originalSection: ProcessContracts.Section;
    originalPage: ProcessContracts.Page;
    newFieldRefName: string;
    newFields: ProcessContracts.ProcessWorkItemTypeField[];
    visible: boolean;
    order: number;
    isAddNewField: boolean;
}

interface IAddFieldToLayoutPayload {
    targetProcess: ICreateProcessResult;
    newControl: ProcessContracts.Control;
    newWorkItemType: ProcessContracts.ProcessWorkItemType;
    group: ProcessContracts.Group;
    newFieldRefName: string;
    order: number;
}

interface IEditFieldPayload {
    targetProcess: ICreateProcessResult;
    newControl: ProcessContracts.Control;
    newWorkItemType: ProcessContracts.ProcessWorkItemType;
    newGroup: ProcessContracts.Group;
}

interface ICloneRulePayload {
    targetProcess: ICreateProcessResult;
    newRule: ProcessContracts.ProcessRule;
    newWorkItemType: ProcessContracts.ProcessWorkItemType;
}

interface ICloneRuleCreatePayload {
    targetProcess: ICreateProcessResult;
    newRule: ProcessContracts.CreateProcessRuleRequest;
    newWorkItemType: ProcessContracts.ProcessWorkItemType;
}

interface ICloneWitBehaviorPayload {
    targetProcess: ICreateProcessResult;
    newBehavior: ProcessContracts.WorkItemTypeBehavior;
    newWorkItemType: ProcessContracts.ProcessWorkItemType;
}

interface IGetStatesPayload {
    targetProcess: ICreateProcessResult;
    newWorkItemType: ProcessContracts.ProcessWorkItemType;
    originalWorkItemType: ProcessContracts.ProcessWorkItemType;
    inheritedStates: ProcessContracts.WorkItemStateResultModel[];
}

interface IDeleteStatePayload {
    targetProcess: ICreateProcessResult;
    newWorkItemType: ProcessContracts.ProcessWorkItemType;
    state: ProcessContracts.WorkItemStateResultModel;
}

interface ICloneStatePayload {
    targetProcess: ICreateProcessResult;
    newState: ProcessContracts.WorkItemStateResultModel;
    newWorkItemType: ProcessContracts.ProcessWorkItemType;
}

interface IHideStatePayload {
    targetProcess: ICreateProcessResult;
    state: ProcessContracts.WorkItemStateResultModel;
    newWorkItemType: ProcessContracts.ProcessWorkItemType;
    hideStateModel: ProcessContracts.HideStateModel;
}

interface IUpdateStatePayload {
    targetProcess: ICreateProcessResult;
    state: ProcessContracts.WorkItemStateResultModel;
    newWorkItemType: ProcessContracts.ProcessWorkItemType;
    updateStateModel: ProcessContracts.WorkItemStateInputModel;
}

interface IUpdatePagePayload {
    targetProcess: ICreateProcessResult;
    witRefName: string;
    pageToUpdate: ProcessContracts.Page;
}

export const endCloneProcessAction = new Action<IEndCloneProcessPayload>();

export class CloneProcessActionCreator extends TfsService {
    private _deferred: Q.Deferred<void>;
    private _clonePayload: ICloneProcessRequestPayload;
    private _queue: ICloneTask[];
    private _errorBarId: string;
    private _isCancelled: boolean;
    private _taskLog: string[];

    public beginCloneProcess(payload: ICloneProcessRequestPayload, errorBarId: string): Q.Promise<void> {
        this._deferred = Q.defer<void>();
        this._isCancelled = false;
        this._clonePayload = payload;
        this._errorBarId = errorBarId;
        this._queue = [];
        this._queue.push({ data: null, func: this._getProcessesTask, taskName: "GetProcessesTask" });

        this._taskLog = [];
        this._executeNextTask();

        return this._deferred.promise;
    }

    @autobind
    public cancelCloneProcess(): void {
        this._isCancelled = true;
        let finalizeTasks: ICloneTask[] = this._queue.filter(task => task.isFinalizeTask);
        if (finalizeTasks.length > 0) {
            endCloneProcessAction.invoke({ process: finalizeTasks[0].data.process });
        }
    }

    /**
     * Some step failed
     */
    @autobind
    private _fail(reason: any, processId: string, source: string): void {
        // cleaning up queue
        this._queue.splice(0);

        ProcessCustomizationTelemetry.onProcessCopyFailed(this._clonePayload.processTypeId, source, reason, this._taskLog);

        // Attempt to delete 
        if (processId) {
            let webAccessClient: IWebAccessHttpClient = this.tfsConnection.getService(WebAccessHttpClient);
            let payload: IDeleteProcessRequestPayload = {
                templateTypeId: processId
            };
            webAccessClient.beginDeleteProcess(payload).then(() => {
                showErrorAction.invoke({ errorMessage: reason.message, errorBarId: this._errorBarId });
                this._deferred.reject(null);
            });
        } else {
            showErrorAction.invoke({ errorMessage: reason.message, errorBarId: this._errorBarId });
            this._deferred.reject(null);
        }
    }

    @autobind
    private _executeNextTask(): void {
        if (this._queue && this._queue.length > 0 && !this._isCancelled) {
            // Popping the next task to execute
            let task: ICloneTask = this._queue.shift();
            if (task.isFinalizeTask && this._queue.length > 0) {
                this._queue.push(task);
                task = this._queue.shift();
            }
            this._taskLog.push(task.taskName); // log the name of task which is about to be executed
            task.func(task.data);
        }
    }

    @autobind
    private _finalizeTask(data: IFinalizeTaskPayload): void {
        ProcessCustomizationTelemetry.onProcessCopySucceeded(data.sourceProcessId, data.targetProcessId, this._taskLog);

        // No need to reenable process, requested to keep it disabled
        if (!this._clonePayload.isEnabled) {
            data.process.isEnabled = data.disablePayload.isEnabled;
            endCloneProcessAction.invoke({ process: data.process });
            this._deferred.resolve(null);
        }
        else {
            let webAccessClient: IWebAccessHttpClient = this.tfsConnection.getService(WebAccessHttpClient);
            webAccessClient.beginSetEnableProcess(data.disablePayload).then<void>(() => {
                endCloneProcessAction.invoke({ process: data.process });
                this._deferred.resolve(null);
            }, (reason: any) => {
                this._fail(reason, data.disablePayload.templateTypeId, CopyProcessTasks.finalizeTask);
            });
        }
    }

    @autobind
    private _getProcessesTask(data: any): void {
        let createProcPayload: ICreateProcessRequestPayload = {
            description: this._clonePayload.description,
            parentTypeId: this._clonePayload.parentTypeId,
            name: this._clonePayload.name
        };
        this._queue.push({ data: createProcPayload, func: this._createProcessTask, taskName: CopyProcessTasks.createProcessTask });
        this._executeNextTask();
    }

    @autobind
    private _createProcessTask(data: ICreateProcessRequestPayload): void {
        let webAccessClient: IWebAccessHttpClient = this.tfsConnection.getService(WebAccessHttpClient);
        webAccessClient.beginCreateProcess(data).then<void>((process: ICreateProcessResult) => {
            let disableProcessPayload: ISetEnableProcessPayload = {
                templateTypeId: process.processTemplateTypeId,
                isEnabled: this._clonePayload.isEnabled
            };
            this._queue.push({ data: disableProcessPayload, func: this._disableProcessTask, taskName: CopyProcessTasks.disableProcessTask });
            this._queue.push({ data: process, func: this._getInheritedBehaviorsTask, taskName: CopyProcessTasks.getInheritedBehaviorsTask });
            this._queue.push({ data: process, func: this._getWorkItemTypesTask, taskName: CopyProcessTasks.getWorkItemTypesTask });
            let finalizePayload: IFinalizeTaskPayload = {
                disablePayload: disableProcessPayload,
                process: process.createdProcess,
                sourceProcessId: this._clonePayload.processTypeId,
                targetProcessId: process.processTemplateTypeId
            }
            this._queue.push({ data: finalizePayload, func: this._finalizeTask, isFinalizeTask: true, taskName: "finalizeTask" });
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, null, CopyProcessTasks.createProcessTask);
        }
        );
    }

    @autobind
    private _disableProcessTask(data: ISetEnableProcessPayload): void {
        let webAccessClient: IWebAccessHttpClient = this.tfsConnection.getService(WebAccessHttpClient);
        webAccessClient.beginSetEnableProcess(data).then<void>(() => {
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.templateTypeId, CopyProcessTasks.disableProcessTask);
        }
        );
    }

    @autobind
    private _getInheritedBehaviorsTask(data: ICreateProcessResult): void {
        let processClient = Service.getClient(ProcessesHttpClient.WorkItemTrackingProcessHttpClient5);
        // get behaviors of the newly created process, which will only be behaviors initially inherited by all processes
        processClient.getProcessBehaviors(data.processTemplateTypeId).then((behaviors: ProcessContracts.ProcessBehavior[]) => {
            let getBehaviorsPayload: IGetBehaviorsPayload = {
                targetProcess: data,
                inheritedBehaviors: behaviors
            };
            this._queue.push({ data: getBehaviorsPayload, func: this._getSourceBehaviorsTask, taskName: CopyProcessTasks.getSourceBehaviorsTask });
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.processTemplateTypeId, CopyProcessTasks.getInheritedBehaviorsTask);
        }
        );
    }

    @autobind
    private _getSourceBehaviorsTask(data: IGetBehaviorsPayload): void {
        let processClient = Service.getClient(ProcessesHttpClient.WorkItemTrackingProcessHttpClient5);
        // get behaviors of the source process that must be copied/renamed
        processClient.getProcessBehaviors(this._clonePayload.processTypeId).then((behaviors: ProcessContracts.ProcessBehavior[]) => {

            // first pass: rename inherited behaviors to a random GUID to avoid naming conflicts
            behaviors.filter(behavior => data.inheritedBehaviors.filter(inhBehavior => StringUtils.equals(behavior.referenceName, inhBehavior.referenceName)).length > 0).map((behavior: ProcessContracts.ProcessBehavior) => {
                let behaviorUpdateModel: ProcessContracts.ProcessBehaviorUpdateRequest = {
                    color: behavior.color,
                    name: TFS_Core_Utils.GUIDUtils.newGuid().replace(/-/g, "")
                }
                let behaviorUpdatePayload: IReplaceBehaviorPayload = {
                    targetProcess: data.targetProcess,
                    newBehavior: behaviorUpdateModel,
                    newBehaviorId: behavior.referenceName
                };
                this._queue.push({ data: behaviorUpdatePayload, func: this._replaceBehaviorTask, taskName: CopyProcessTasks.replaceBehaviorTask });
            });

            // second pass: create custom behaviors
            behaviors.filter(behavior => data.inheritedBehaviors.filter(inhBehavior => StringUtils.equals(behavior.referenceName, inhBehavior.referenceName)).length === 0).map((behavior: ProcessContracts.ProcessBehavior) => {
                let behaviorCreateModel: ProcessContracts.ProcessBehaviorCreateRequest = {
                    color: behavior.color,
                    inherits: behavior.inherits.behaviorRefName, // Parent behavior id
                    name: behavior.name,
                    referenceName: null
                }
                let createBehaviorPayload: ICloneBehaviorPayload = {
                    targetProcess: data.targetProcess,
                    newBehavior: behaviorCreateModel
                };
                this._queue.push({ data: createBehaviorPayload, func: this._createBehaviorTask, taskName: CopyProcessTasks.createBehaviorTask });
            });

            // third pass: rename inherited behaviors to name they were given in source process
            behaviors.filter(behavior => data.inheritedBehaviors.filter(inhBehavior => StringUtils.equals(behavior.referenceName, inhBehavior.referenceName)).length > 0).map((behavior: ProcessContracts.ProcessBehavior) => {
                let newBehavior: ProcessContracts.ProcessBehaviorUpdateRequest = {
                    color: behavior.color,
                    name: behavior.name
                };
                let renameBehaviorPayload: IReplaceBehaviorPayload = {
                    targetProcess: data.targetProcess,
                    newBehavior: newBehavior,
                    newBehaviorId: behavior.referenceName
                };
                this._queue.push({ data: renameBehaviorPayload, func: this._replaceBehaviorTask, taskName: "replaceBehaviorTask" });
            });

            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.getSourceBehaviorsTask);
        }
        );
    }

    @autobind
    private _replaceBehaviorTask(data: IReplaceBehaviorPayload): void {
        let processClient = Service.getClient(ProcessesHttpClient.WorkItemTrackingProcessHttpClient5);
        processClient.updateProcessBehavior(data.newBehavior, data.targetProcess.processTemplateTypeId, data.newBehaviorId).then(() => {
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.replaceBehaviorTask);
        }
        );
    }

    @autobind
    private _createBehaviorTask(data: ICloneBehaviorPayload): void {
        let processClient = Service.getClient(ProcessesHttpClient.WorkItemTrackingProcessHttpClient5);
        processClient.createProcessBehavior(data.newBehavior, data.targetProcess.processTemplateTypeId).then(() => {
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.createBehaviorTask);
        }
        );
    }

    @autobind
    private _getWorkItemTypesTask(data: ICreateProcessResult): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.getProcessWorkItemTypes(this._clonePayload.processTypeId).then((workItemTypes: ProcessContracts.ProcessWorkItemType[]) => {
            workItemTypes.map((wit: ProcessContracts.ProcessWorkItemType) => {
                if (wit.customization === ProcessContracts.CustomizationType.Custom || wit.customization === ProcessContracts.CustomizationType.Inherited) {

                    let createWitPayload: ICloneWorkItemTypePayload = {
                        targetProcess: data,
                        newWorkItemType: wit,
                        originalWorkItemType: wit
                    };
                    this._queue.push({ data: createWitPayload, func: this._createWorkItemTypeTask, taskName: CopyProcessTasks.createWorkItemTypeTask });
                } else if (wit.isDisabled) {

                    let getNewInheritedWorkItemTypesPayload: IGetNewInheritedWorkItemTypesPayload = {
                        targetProcess: data,
                        originalWorkItemType: wit,
                        updatedWorkItemType: wit
                    };
                    this._queue.push({ data: getNewInheritedWorkItemTypesPayload, func: this._getNewInheritedWorkItemTypesTask, taskName: CopyProcessTasks.getNewInheritedWorkItemTypesTask });
                }
            });
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.processTemplateTypeId, CopyProcessTasks.getWorkItemTypesTask);
        }
        );
    }

    @autobind
    private _createWorkItemTypeTask(data: ICloneWorkItemTypePayload): void {
        let processClient = ProcessUtils.getProcessClient();
        let createWitRequest: ProcessContracts.CreateProcessWorkItemTypeRequest = {
            name: data.originalWorkItemType.name,
            description: data.originalWorkItemType.description,
            color: data.originalWorkItemType.color,
            icon: data.originalWorkItemType.icon,
            inheritsFrom: data.originalWorkItemType.inherits,
            isDisabled: data.originalWorkItemType.isDisabled
        }
        processClient.createProcessWorkItemType(createWitRequest, data.targetProcess.processTemplateTypeId).then<void>((newWit: ProcessContracts.ProcessWorkItemType) => {
            let subWitArtifactPayload: ICloneWorkItemTypePayload = {
                targetProcess: data.targetProcess,
                newWorkItemType: newWit,
                originalWorkItemType: data.originalWorkItemType
            };

            // do not add rule task here since state task tree has dept of 2 and rule task tree have depth of 1.
            // different depths can cause exception since a rule might be created for a state which is not yet created.
            this._queue.push({ data: subWitArtifactPayload, func: this._getFieldsTask, taskName: "getFieldsTask" });
            this._queue.push({ data: subWitArtifactPayload, func: this._getNewLayoutTask, taskName: "getNewLayoutTask" });
            this._queue.push({ data: subWitArtifactPayload, func: this._getNewProcessBehaviorsTask, taskName: "getNewWitBehaviorsTask" });
            this._queue.push({ data: subWitArtifactPayload, func: this._getNewStatesTask, taskName: "getNewStatesTask" });
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.createWorkItemTypeTask);
        }
        );
    }

    @autobind
    private _getNewInheritedWorkItemTypesTask(data: IGetNewInheritedWorkItemTypesPayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.getProcessWorkItemTypes(data.targetProcess.processTemplateTypeId).then((workItemTypes: ProcessContracts.ProcessWorkItemType[]) => {
            let newWitMatches: ProcessContracts.ProcessWorkItemType[] = workItemTypes.filter(wit => StringUtils.equals(data.originalWorkItemType.name, wit.name));
            if (newWitMatches.length > 0) {
                let updateWorkItemTypePayload: IUpdateWorkItemTypePayload = {
                    targetProcess: data.targetProcess,
                    updatedWorkItemType: data.updatedWorkItemType,
                    newWorkItemType: newWitMatches[0]
                };
                this._queue.push({ data: updateWorkItemTypePayload, func: this._updateWorkItemTypeTask, taskName: CopyProcessTasks.updateWorkItemTypeTask });
            }
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.getNewInheritedWorkItemTypesTask);
        }
        );
    }

    @autobind
    private _updateWorkItemTypeTask(data: IUpdateWorkItemTypePayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.updateProcessWorkItemType(data.updatedWorkItemType, data.targetProcess.processTemplateTypeId, data.newWorkItemType.referenceName).then(() => {
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.updateWorkItemTypeTask);
        }
        );
    }

    @autobind
    private _getFieldsTask(data: ICloneWorkItemTypePayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.getAllWorkItemTypeFields(this._clonePayload.processTypeId, data.originalWorkItemType.referenceName).then((witFields: ProcessContracts.ProcessWorkItemTypeField[]) => {
            witFields.filter(x=>x.customization!=ProcessContracts.CustomizationType.System).map((field: ProcessContracts.ProcessWorkItemTypeField) => {
                let createFieldPayload: ICloneFieldPayload = {
                    targetProcess: data.targetProcess,
                    newField: field,
                    newWorkItemType: data.newWorkItemType
                };
                if (field.customization != ProcessContracts.CustomizationType.System) {
                    this._queue.push({ data: createFieldPayload, func: this._createFieldTask, taskName: CopyProcessTasks.createFieldTask });
                }
            });
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.getFieldsTask);
        }
        );
    }

    @autobind
    private _createFieldTask(data: ICloneFieldPayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.addFieldToWorkItemType(data.newField, data.targetProcess.processTemplateTypeId, data.newWorkItemType.referenceName).then((newField: ProcessContracts.ProcessWorkItemTypeField) => {
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.createFieldTask);
        }
        );
    }

    @autobind
    private _getNewLayoutTask(data: ICloneWorkItemTypePayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.getFormLayout(data.targetProcess.processTemplateTypeId, data.newWorkItemType.referenceName).then((layout: ProcessContracts.FormLayout) => {
            let getWitFieldsPayload: IGetWitFieldsPayload = {
                targetProcess: data.targetProcess,
                newWorkItemTypeLayout: layout,
                newWorkItemType: data.newWorkItemType,
                originalWorkItemType: data.originalWorkItemType
            };
            this._queue.push({ data: getWitFieldsPayload, func: this._getWitFieldsTask, taskName: CopyProcessTasks.getWitFieldsTask });
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.getNewLayoutTask);
        }
        );
    }

    @autobind
    private _getWitFieldsTask(data: IGetWitFieldsPayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.getAllWorkItemTypeFields(data.targetProcess.processTemplateTypeId, data.newWorkItemType.referenceName).then((witFields: ProcessContracts.ProcessWorkItemTypeField[]) => {
            let witLayoutPayload: IGetLayoutPayload = {
                targetProcess: data.targetProcess,
                newWorkItemTypeLayout: data.newWorkItemTypeLayout,
                newWorkItemType: data.newWorkItemType,
                originalWorkItemType: data.originalWorkItemType,
                newFields: witFields.filter(x => x.customization != ProcessContracts.CustomizationType.System)
            };
            this._queue.push({ data: witLayoutPayload, func: this._updatePageNameTask, taskName: CopyProcessTasks.updatePageNameTask });
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.getWitFieldsTask);
        }
        );
    }

    @autobind
    private _updatePageNameTask(data: IGetLayoutPayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.getFormLayout(this._clonePayload.processTypeId, data.originalWorkItemType.referenceName).then((layout: ProcessContracts.FormLayout) => {
            // get inherited pages and check if they are renamed
            let inheritedPagesList = layout.pages.filter(page => page.inherited);
            inheritedPagesList.forEach((page: ProcessContracts.Page) => {
                let newPage = data.newWorkItemTypeLayout.pages.filter(newPage => StringUtils.equals(newPage.id, page.id));
                if (newPage.length > 0 && !StringUtils.equals(newPage[0].label, page.label)) { // page is renamed
                    let renamePage: ProcessContracts.Page = {
                        contribution: null,
                        id: newPage[0].id,
                        inherited: null,
                        isContribution: null,
                        label: page.label,
                        locked: null,
                        order: null,
                        overridden: null,
                        pageType: null,
                        sections: null,
                        visible: null
                    }
                    let updatePagePayload: IUpdatePagePayload = {
                        targetProcess: data.targetProcess,
                        witRefName: data.newWorkItemType.referenceName,
                        pageToUpdate: renamePage
                    }
                    this._queue.push({ data: updatePagePayload, func: this._updatePageTask, taskName: CopyProcessTasks.updatePageTask });
                }
            });
            this._queue.push({ data: data, func: this._updateGroupNameTask, taskName: CopyProcessTasks.updateGroupNameTask });
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.updatePageNameTask);
        }
        );
    }

    @autobind
    private _updateGroupNameTask(data: IGetLayoutPayload): void {
        let newOOBProcessLayoutDict = {};
        data.newWorkItemTypeLayout.pages.forEach((newPage: ProcessContracts.Page) => {
            newOOBProcessLayoutDict[newPage.id] = {};
            newPage.sections.forEach((newSection: ProcessContracts.Section) => {
                newOOBProcessLayoutDict[newPage.id][newSection.id] = {};
                newSection.groups.forEach((newGroup: ProcessContracts.Group) => {
                    newOOBProcessLayoutDict[newPage.id][newSection.id][newGroup.id] = newGroup.label;
                });
            });
        });
        let processClient = ProcessUtils.getProcessClient()
        processClient.getFormLayout(this._clonePayload.processTypeId, data.originalWorkItemType.referenceName).then((layout: ProcessContracts.FormLayout) => {
            // layout has pages which have sections which have groups
            layout.pages.filter(page => page.inherited).forEach((page: ProcessContracts.Page) => {
                page.sections.forEach((section: ProcessContracts.Section) => {
                    section.groups.filter(group => group.inherited).forEach((group: ProcessContracts.Group) => {
                        if ((page.id in newOOBProcessLayoutDict) && (section.id in newOOBProcessLayoutDict[page.id]) && (group.id in newOOBProcessLayoutDict[page.id][section.id])) {
                            let inheritedLabel = newOOBProcessLayoutDict[page.id][section.id][group.id];
                            let renamedLabel = group.label;
                            if (!StringUtils.equals(inheritedLabel, renamedLabel)) {
                                let renameGroup: ProcessContracts.Group = {
                                    contribution: null,
                                    controls: null,
                                    height: null,
                                    id: group.id,
                                    inherited: null,
                                    isContribution: null,
                                    label: renamedLabel,
                                    order: null,
                                    overridden: null,
                                    visible: null
                                }
                                let updateGroupPayload: IUpdateGroupPayload = {
                                    targetProcess: data.targetProcess,
                                    groupToUpdate: renameGroup,
                                    witRefName: data.newWorkItemType.referenceName,
                                    pageId: page.id,
                                    sectionId: section.id
                                }
                                this._queue.push({ data: updateGroupPayload, func: this._updateGroupTask, isFinalizeTask: false, taskName: CopyProcessTasks.updateGroupTask });
                            }
                        }
                    });
                });
            });
            this._queue.push({ data: data, func: this._updateLayoutPayloadTask, isFinalizeTask: false, taskName: CopyProcessTasks.updateLayoutPayloadTask });
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.updateGroupNameTask);
        }
        );
    }

    @autobind
    private _updateLayoutPayloadTask(data: IGetLayoutPayload) {
        let processClient = ProcessUtils.getProcessClient();
        processClient.getFormLayout(data.targetProcess.processTemplateTypeId, data.newWorkItemType.referenceName).then((updatedNewWorkItemTypeLayout: ProcessContracts.FormLayout) => {
            let updatedLayoutPayload: IGetLayoutPayload = {
                targetProcess: data.targetProcess,
                newWorkItemTypeLayout: updatedNewWorkItemTypeLayout,
                newWorkItemType: data.newWorkItemType,
                originalWorkItemType: data.originalWorkItemType,
                newFields: data.newFields
            }
            this._queue.push({ data: updatedLayoutPayload, func: this._getLayoutTask, isFinalizeTask: false, taskName: CopyProcessTasks.getLayoutTask });
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.updateLayoutPayloadTask);
        }
        );
    }

    @autobind
    private _getLayoutTask(data: IGetLayoutPayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.getFormLayout(this._clonePayload.processTypeId, data.originalWorkItemType.referenceName).then((layout: ProcessContracts.FormLayout) => {
            layout.pages.map((page: ProcessContracts.Page) => {
                // layout has pages which have sections which have groups
                if (!(page.inherited) && data.newWorkItemTypeLayout.pages.filter(newPage => StringUtils.equals(newPage.label, page.label)).length === 0) {
                    let createPagePayload: IClonePagePayload = {
                        targetProcess: data.targetProcess,
                        newPage: page,
                        originalPage: page,
                        newWorkItemType: data.newWorkItemType,
                        newFields: data.newFields
                    };
                    this._queue.push({ data: createPagePayload, func: this._createLayoutPageTask, isFinalizeTask: false, taskName: CopyProcessTasks.createLayoutPageTask });
                } else {
                    // get groups for inherited pages
                    page.sections.map((section: ProcessContracts.Section) => {
                        for (let groupIndex = 0; groupIndex < section.groups.length; groupIndex++) {
                            let group: ProcessContracts.Group = section.groups[groupIndex];

                            // check if group is inherited or if group is added automatically by custom control
                            if (group.inherited ||
                                data.newWorkItemTypeLayout.pages.filter(newPage => StringUtils.equals(newPage.label, page.label))[0]
                                    .sections.filter(newSection => StringUtils.equals(newSection.id, section.id))[0]
                                    .groups.filter(newGroup => StringUtils.equals(newGroup.id, group.id)).length > 0) {
                                // get controls for inherited group
                                let controlOrder: number = 0;
                                group.controls.map((control: ProcessContracts.Control) => {
                                    if (!control.inherited) {
                                        var newFieldRefName: string = CloneUtils._getFieldReferenceName(control, data.newFields);
                                        let addFieldToLayoutPackage: ProcessContracts.Control = {
                                            order: controlOrder,
                                            label: control.label,
                                            readOnly: false,
                                            visible: control.visible,
                                            controlType: null,
                                            id: newFieldRefName,
                                            metadata: null,
                                            inherited: null,
                                            overridden: null,
                                            watermark: null,
                                            contribution: control.contribution,
                                            height: null,
                                            isContribution: control.isContribution
                                        }

                                        let getNewWitGroupsPayload: IGetNewWitGroupPayload = {
                                            targetProcess: data.targetProcess,
                                            newControl: addFieldToLayoutPackage,
                                            newWorkItemType: data.newWorkItemType,
                                            originalControl: control,
                                            originalGroup: group,
                                            originalSection: section,
                                            originalPage: page,
                                            newFieldRefName: newFieldRefName,
                                            newFields: data.newFields,
                                            visible: true,
                                            order: controlOrder,
                                            isAddNewField: true
                                        };
                                        this._queue.push({ data: getNewWitGroupsPayload, func: this._getNewWitLayoutGroupTask, taskName: CopyProcessTasks.getNewWitLayoutGroupTask });
                                    } else if (!control.visible) {
                                        let getNewWitGroupsPayload: IGetNewWitGroupPayload = {
                                            targetProcess: data.targetProcess,
                                            newControl: null,
                                            newWorkItemType: data.newWorkItemType,
                                            originalControl: control,
                                            originalGroup: group,
                                            originalSection: section,
                                            originalPage: page,
                                            newFieldRefName: null,
                                            newFields: null,
                                            visible: false,
                                            order: controlOrder,
                                            isAddNewField: false
                                        }
                                        this._queue.push({ data: getNewWitGroupsPayload, func: this._getNewWitLayoutGroupTask, taskName: CopyProcessTasks.getNewWitLayoutGroupTask });
                                    } else if (control.controlType === WITConstants.WellKnownControlNames.FieldControl || control.controlType === WITConstants.WellKnownControlNames.HtmlControl) {
                                        let getNewWitGroupsPayload: IGetNewWitGroupPayload = {
                                            targetProcess: data.targetProcess,
                                            newControl: null,
                                            newWorkItemType: data.newWorkItemType,
                                            originalControl: control,
                                            originalGroup: group,
                                            originalSection: section,
                                            originalPage: page,
                                            newFieldRefName: null,
                                            newFields: null,
                                            visible: true,
                                            order: controlOrder,
                                            isAddNewField: false
                                        }
                                        this._queue.push({ data: getNewWitGroupsPayload, func: this._getNewWitLayoutGroupTask, taskName: CopyProcessTasks.getNewWitLayoutGroupTask });
                                    }
                                    controlOrder = controlOrder + 1;
                                });
                            } else {
                                let newGroup: ProcessContracts.Group = {
                                    controls: group.controls,
                                    id: null,
                                    label: group.label,
                                    order: groupIndex,
                                    visible: group.visible,
                                    contribution: group.contribution,
                                    height: group.height,
                                    inherited: group.inherited,
                                    isContribution: group.isContribution,
                                    overridden: group.overridden
                                };

                                let createGroupPayload: ICloneGroupPayload = {
                                    targetProcess: data.targetProcess,
                                    newGroup: newGroup,
                                    originalGroup: group,
                                    newSectionId: section.id,
                                    newPageId: CloneUtils._findPageIdByLabel(page.label, data.newWorkItemTypeLayout),
                                    newWorkItemType: data.newWorkItemType,
                                    newFields: data.newFields
                                };
                                this._queue.push({ data: createGroupPayload, func: this._createLayoutGroupTask, taskName: CopyProcessTasks.createLayoutGroupTask });
                            }
                        }
                    });
                }
            });
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.getLayoutTask);
        }
        );
    }

    @autobind
    private _getNewWitLayoutGroupTask(data: IGetNewWitGroupPayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.getFormLayout(data.targetProcess.processTemplateTypeId, data.newWorkItemType.referenceName).then((newLayout: ProcessContracts.FormLayout) => {
            newLayout.pages.filter(newPage => StringUtils.equals(newPage.label, data.originalPage.label, true)).map((newPage: ProcessContracts.Page) => {
                newPage.sections.filter(newSection => StringUtils.equals(newSection.id, data.originalSection.id, true)).map((newSection: ProcessContracts.Section) => {
                    newSection.groups.filter(newGroup => StringUtils.equals(newGroup.label, data.originalGroup.label, true)).map((newGroup: ProcessContracts.Group) => {
                        if (!data.isAddNewField) {
                            // get new control from group
                            var newControls: ProcessContracts.Control[] = newGroup.controls.filter(control => StringUtils.equals(control.id, data.originalControl.id, true));
                            if (newControls.length > 0) {
                                var newControl: ProcessContracts.Control = {
                                    contribution: newControls[0].contribution,
                                    controlType: newControls[0].controlType,
                                    height: newControls[0].height,
                                    id: newControls[0].id,
                                    inherited: newControls[0].inherited,
                                    isContribution: newControls[0].isContribution,
                                    label: data.originalControl.label,
                                    metadata: newControls[0].metadata,
                                    order: data.order,
                                    overridden: newControls[0].overridden,
                                    readOnly: newControls[0].readOnly,
                                    visible: data.visible,
                                    watermark: newControls[0].watermark
                                }
                                let editFieldPayload: IEditFieldPayload = {
                                    targetProcess: data.targetProcess,
                                    newControl: newControl,
                                    newWorkItemType: data.newWorkItemType,
                                    newGroup: newGroup
                                }
                                this._queue.push({ data: editFieldPayload, func: this._editFieldTask, taskName: "editFieldTask" });
                            }
                        } else {
                            let addFieldToLayoutPayload: IAddFieldToLayoutPayload = {
                                targetProcess: data.targetProcess,
                                newControl: data.newControl,
                                newWorkItemType: data.newWorkItemType,
                                group: newGroup,
                                newFieldRefName: data.newFieldRefName,
                                order: data.order
                            }

                            if (data.originalControl.controlType !== WITConstants.WellKnownControlNames.HtmlControl) {
                                this._queue.push({ data: addFieldToLayoutPayload, func: this._addFieldToLayoutTask, taskName: "addFieldToLayoutTask" });
                            }
                        }
                    });
                });
            });
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.getNewWitLayoutGroupTask);
        }
        );
    }

    @autobind
    private _createLayoutPageTask(data: IClonePagePayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.addPage(data.newPage, data.targetProcess.processTemplateTypeId, data.newWorkItemType.referenceName).then((newPage: ProcessContracts.Page) => {
            data.originalPage.sections.map((section: ProcessContracts.Section) => {
                section.groups.map((group: ProcessContracts.Group) => {
                    let newGroup: ProcessContracts.Group = {
                        controls: group.controls,
                        id: null,
                        label: group.label,
                        order: group.order,
                        visible: group.visible,
                        contribution: group.contribution,
                        height: group.height,
                        inherited: group.inherited,
                        isContribution: group.isContribution,
                        overridden: group.overridden
                    };

                    if (!group.inherited) {
                        let createGroupPayload: ICloneGroupPayload = {
                            targetProcess: data.targetProcess,
                            newGroup: newGroup,
                            originalGroup: group,
                            newSectionId: section.id,
                            newPageId: newPage.id,
                            newWorkItemType: data.newWorkItemType,
                            newFields: data.newFields
                        };
                        this._queue.push({ data: createGroupPayload, func: this._createLayoutGroupTask, isFinalizeTask: false, taskName: CopyProcessTasks.createLayoutGroupTask });
                    }
                });
            });
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.createLayoutPageTask);
        }
        );
    }

    @autobind
    private _createLayoutGroupTask(data: ICloneGroupPayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.addGroup(data.newGroup, data.targetProcess.processTemplateTypeId, data.newWorkItemType.referenceName, data.newPageId, data.newSectionId).then((newGroup: ProcessContracts.Group) => {
            data.originalGroup.controls.map((control: ProcessContracts.Control) => {
                var newFieldRefName: string = CloneUtils._getFieldReferenceName(control, data.newFields);
                let addFieldToLayoutPackage: ProcessContracts.Control = {
                    order: control.order,
                    label: control.label,
                    readOnly: false,
                    visible: control.visible,
                    controlType: null,
                    id: newFieldRefName,
                    metadata: null,
                    inherited: null,
                    overridden: null,
                    watermark: null,
                    contribution: control.contribution,
                    height: null,
                    isContribution: control.isContribution
                }

                let addFieldToLayoutPayload: IAddFieldToLayoutPayload = {
                    targetProcess: data.targetProcess,
                    newControl: addFieldToLayoutPackage,
                    newWorkItemType: data.newWorkItemType,
                    group: newGroup,
                    newFieldRefName: newFieldRefName,
                    order: control.order
                }
                if (control.controlType !== WITConstants.WellKnownControlNames.HtmlControl) {
                    this._queue.push({ data: addFieldToLayoutPayload, func: this._addFieldToLayoutTask, taskName: CopyProcessTasks.addFieldToLayoutTask });
                }
            });
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.createLayoutGroupTask);
        }
        );
    }

    @autobind
    private _addFieldToLayoutTask(data: IAddFieldToLayoutPayload): void {
        let existingControls: ProcessContracts.Control[] = data.group.controls.filter(control => StringUtils.equals(control.id, data.newControl.id, true));
        if (existingControls.length > 0) {
            var newControl: ProcessContracts.Control = {
                contribution: existingControls[0].contribution,
                controlType: existingControls[0].controlType,
                height: existingControls[0].height,
                id: existingControls[0].id,
                inherited: existingControls[0].inherited,
                isContribution: existingControls[0].isContribution,
                label: existingControls[0].label,
                metadata: existingControls[0].metadata,
                order: data.order,
                overridden: existingControls[0].overridden,
                readOnly: existingControls[0].readOnly,
                visible: existingControls[0].visible,
                watermark: existingControls[0].watermark
            }
            let editFieldPayload: IEditFieldPayload = {
                targetProcess: data.targetProcess,
                newControl: newControl,
                newWorkItemType: data.newWorkItemType,
                newGroup: data.group
            }
            this._queue.push({ data: editFieldPayload, func: this._setFieldOrderTask, taskName: CopyProcessTasks.setFieldOrderTask });
            this._executeNextTask();
        } else {
            let processClient = ProcessUtils.getProcessClient();
            if (data.newControl.inherited == null) {
                let customControlPayload: ProcessContracts.Control = {
                    contribution: data.newControl.contribution,
                    controlType: null,
                    height: null,
                    isContribution: data.newControl.isContribution,
                    label: data.newControl.label,
                    metadata: null,
                    order: null,
                    overridden: null,
                    readOnly: data.newControl.readOnly,
                    visible: data.newControl.visible,
                    watermark: null,
                    id: data.newControl.id,
                    inherited: null
                };
                processClient.createControlInGroup(customControlPayload, data.targetProcess.processTemplateTypeId, data.newWorkItemType.referenceName, data.group.id)
                    .then((control: ProcessContracts.Control) => {
                        var newControl: ProcessContracts.Control = control;
                        newControl.order = data.order;
                        let editFieldPayload: IEditFieldPayload = {
                            targetProcess: data.targetProcess,
                            newControl: newControl,
                            newWorkItemType: data.newWorkItemType,
                            newGroup: data.group
                        }
                        this._queue.push({ data: editFieldPayload, func: this._setFieldOrderTask, taskName: CopyProcessTasks.setFieldOrderTask });
                        this._executeNextTask();
                    }, (reason: any) => {
                        this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.addFieldToLayoutTask);
                    }
                    );
            } else {
                processClient.moveControlToGroup(data.newControl, data.targetProcess.processTemplateTypeId, data.newWorkItemType.referenceName, data.group.id, data.newFieldRefName)
                    .then((control: ProcessContracts.Control) => {
                        var newControl: ProcessContracts.Control = control;
                        newControl.order = data.order;
                        let editFieldPayload: IEditFieldPayload = {
                            targetProcess: data.targetProcess,
                            newControl: newControl,
                            newWorkItemType: data.newWorkItemType,
                            newGroup: data.group
                        }
                        this._queue.push({ data: editFieldPayload, func: this._setFieldOrderTask, taskName: CopyProcessTasks.setFieldOrderTask });
                        this._executeNextTask();
                    }, (reason: any) => {
                        this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.addFieldToLayoutTask);
                    }
                    );
            }
        }
    }

    @autobind
    private _editFieldTask(data: IEditFieldPayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.updateControl(data.newControl, data.targetProcess.processTemplateTypeId, data.newWorkItemType.referenceName, data.newGroup.id, data.newControl.id).then(() => {
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.editFieldTask);
        }
        );
    }

    @autobind
    private _setFieldOrderTask(data: IEditFieldPayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.moveControlToGroup(data.newControl, data.targetProcess.processTemplateTypeId, data.newWorkItemType.referenceName, data.newGroup.id, data.newControl.id, data.newGroup.id).then(() => {
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.setFieldOrderTask);
        }
        );
    }

    @autobind
    private _getRulesTask(data: ICloneWorkItemTypePayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.getProcessWorkItemTypeRules(this._clonePayload.processTypeId, data.originalWorkItemType.referenceName).then((witRules: ProcessContracts.ProcessRule[]) => {
            witRules.map((rule: ProcessContracts.ProcessRule) => {
                if (!(rule.customizationType == ProcessContracts.CustomizationType.System)) {
                    let processRule: ProcessContracts.CreateProcessRuleRequest = {
                        actions: rule.actions,
                        conditions: rule.conditions,
                        name: rule.name,
                        isDisabled: rule.isDisabled
                    }

                    let createRulePayload: ICloneRuleCreatePayload = {
                        targetProcess: data.targetProcess,
                        newRule: processRule,
                        newWorkItemType: data.newWorkItemType
                    }
                    this._queue.push({ data: createRulePayload, func: this._createRuleTask, taskName: "createRuleTask" });
                }
            });
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.getRulesTask);
        }
        );
    }

    @autobind
    private _createRuleTask(data: ICloneRuleCreatePayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.addProcessWorkItemTypeRule(data.newRule, data.targetProcess.processTemplateTypeId, data.newWorkItemType.referenceName).then(() => {
            this._executeNextTask();
        }, (reason: any) => {
            if (StringUtils.localeIgnoreCaseComparer(reason.serverError.typeKey, "FieldRuleModelValidationException") === 0) {
                reason.message = StringUtils.format(Resources.FieldRuleModelValidationExceptionCopyMessage, reason.message);
            }

            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.createRuleTask);
        }
        );
    }

    @autobind
    private _getNewProcessBehaviorsTask(data: ICloneWorkItemTypePayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.getProcessBehaviors(data.targetProcess.processTemplateTypeId).then((processBehaviors: ProcessContracts.ProcessBehavior[]) => {
            let getOldProcessBehaviorsPayload: IGetOldProcessBehaviorsPayload = {
                targetProcess: data.targetProcess,
                newWorkItemType: data.newWorkItemType,
                originalWorkItemType: data.originalWorkItemType,
                newProcessBehaviors: processBehaviors
            }
            this._queue.push({ data: getOldProcessBehaviorsPayload, func: this._getOldProcessBehaviorsTask, taskName: CopyProcessTasks.getOldProcessBehaviorsTask });
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.getNewProcessBehaviorsTask);
        }
        );
    }

    @autobind
    private _getOldProcessBehaviorsTask(data: IGetOldProcessBehaviorsPayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.getProcessBehaviors(this._clonePayload.processTypeId).then((processBehaviors: ProcessContracts.ProcessBehavior[]) => {
            let getWitBehaviorsPayload: IGetWitBehaviorsPayload = {
                targetProcess: data.targetProcess,
                newWorkItemType: data.newWorkItemType,
                originalWorkItemType: data.originalWorkItemType,
                newProcessBehaviors: data.newProcessBehaviors,
                oldProcessBehaviors: processBehaviors
            }
            this._queue.push({ data: getWitBehaviorsPayload, func: this._getWitBehaviorsTask, taskName: CopyProcessTasks.getWitBehaviorsTask });
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.getOldProcessBehaviorsTask);
        }
        );
    }

    @autobind
    private _getWitBehaviorsTask(data: IGetWitBehaviorsPayload): void {
        if (data.originalWorkItemType.customization == ProcessContracts.CustomizationType.Custom) {
            let processDefClient = ProcessDefinitionsHttpClient.getClient();
            processDefClient.getBehaviorsForWorkItemType(this._clonePayload.processTypeId, data.originalWorkItemType.referenceName).then((witBehaviors: ProcessDefinitionsContracts.WorkItemTypeBehavior[]) => {
                witBehaviors.map((behavior: ProcessDefinitionsContracts.WorkItemTypeBehavior) => {
                    var behaviorRefPayload: ProcessDefinitionsContracts.WorkItemBehaviorReference = {
                        id: CloneUtils._findWitBehaviorId(behavior.behavior.id, data.oldProcessBehaviors, data.newProcessBehaviors),
                        url: null
                    };
                    var witBehaviorModel: ProcessDefinitionsContracts.WorkItemTypeBehavior = {
                        behavior: behaviorRefPayload,
                        isDefault: behavior.isDefault,
                        url: null
                    };
                    let createBehaviorPayload: ICloneWitBehaviorPayload = {
                        targetProcess: data.targetProcess,
                        newBehavior: witBehaviorModel,
                        newWorkItemType: data.newWorkItemType
                    };
                    this._queue.push({ data: createBehaviorPayload, func: this._createWitBehaviorTask, taskName: CopyProcessTasks.createWitBehaviorTask });
                });
                this._executeNextTask();
            }, (reason: any) => {
                this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.getWitBehaviorsTask);
            }
            );
        } else {
            this._executeNextTask();
        }
    }

    @autobind
    private _createWitBehaviorTask(data: ICloneWitBehaviorPayload): void {
        let processDefClient = ProcessDefinitionsHttpClient.getClient();
        processDefClient.addBehaviorToWorkItemType(data.newBehavior, data.targetProcess.processTemplateTypeId, data.newWorkItemType.referenceName).then(() => {
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.createWitBehaviorTask);
        }
        );
    }
    @autobind
    private _updatePageTask(data: IUpdatePagePayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.updatePage(data.pageToUpdate, data.targetProcess.processTemplateTypeId, data.witRefName).then(() => {
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.updatePageTask);
        }
        );
    }

    @autobind
    private _updateGroupTask(data: IUpdateGroupPayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.updateGroup(data.groupToUpdate, data.targetProcess.processTemplateTypeId, data.witRefName, data.pageId, data.sectionId, data.groupToUpdate.id).then(() => {
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.updateGroupTask);
        }
        );
    }

    @autobind
    private _getNewStatesTask(data: ICloneWorkItemTypePayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.getStateDefinitions(data.targetProcess.processTemplateTypeId, data.newWorkItemType.referenceName).then((witStates: ProcessContracts.WorkItemStateResultModel[]) => {
            let getOriginalStatesPayload: IGetStatesPayload = {
                targetProcess: data.targetProcess,
                newWorkItemType: data.newWorkItemType,
                originalWorkItemType: data.originalWorkItemType,
                inheritedStates: witStates
            };
            this._queue.push({ data: getOriginalStatesPayload, func: this._getStatesTask, taskName: CopyProcessTasks.getStatesTask });
            this._queue.push({ data: data, func: this._getRulesTask, taskName: CopyProcessTasks.getRulesTask });
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.getNewStatesTask);
        }
        );
    }

    @autobind
    private _getStatesTask(data: IGetStatesPayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.getStateDefinitions(this._clonePayload.processTypeId, data.originalWorkItemType.referenceName).then((witStates: ProcessContracts.WorkItemStateResultModel[]) => {

            // first create states to avoid WorkItemTypeTwoStateRestriction
            witStates.filter(x => x.customizationType != ProcessContracts.CustomizationType.System).map((state: ProcessContracts.WorkItemStateResultModel) => {
                const inheritedStatesMatchingSource = data.inheritedStates.filter(inhState => StringUtils.equals(inhState.name, state.name, true));
                if (inheritedStatesMatchingSource.length === 0) {
                    let createStatePayload: ICloneStatePayload = {
                        targetProcess: data.targetProcess,
                        newState: state,
                        newWorkItemType: data.newWorkItemType
                    };
                    this._queue.push({ data: createStatePayload, func: this._createStateTask, taskName: CopyProcessTasks.createStateTask });
                } else if (state.hidden) {
                    let hideStateModelPayload: ProcessContracts.HideStateModel = {
                        hidden: true
                    };
                    let inheritedStatesList: ProcessContracts.WorkItemStateResultModel[] = data.inheritedStates.filter(inhState => StringUtils.equals(inhState.name, state.name, true));
                    let hideStatePayload: IHideStatePayload = {
                        targetProcess: data.targetProcess,
                        state: inheritedStatesList[0],
                        newWorkItemType: data.newWorkItemType,
                        hideStateModel: hideStateModelPayload
                    };
                    this._queue.push({ data: hideStatePayload, func: this._hideStateTask, taskName: CopyProcessTasks.hideStateTask });
                } else {
                    const currentState = inheritedStatesMatchingSource[0];
                    if (currentState.color !== state.color || currentState.stateCategory !== state.stateCategory || currentState.name !== state.name) {
                        const updateStatePayload: IUpdateStatePayload = {
                            targetProcess: data.targetProcess,
                            state: currentState,
                            updateStateModel: {
                                color: state.color,
                                stateCategory: state.stateCategory,
                                name: state.name,
                                order: null
                            },
                            newWorkItemType: data.newWorkItemType
                        };
                        this._queue.push({ data: updateStatePayload, func: this._updateStateTask, taskName: CopyProcessTasks.updateStateTask })
                    }
                }
            });

            // remove all inherited states that were removed
            data.inheritedStates.filter(inhState => witStates.filter(witState => StringUtils.equals(inhState.name, witState.name, true)).length === 0)
                .map((removeState: ProcessContracts.WorkItemStateResultModel) => {
                    let deleteStatePayload: IDeleteStatePayload = {
                        targetProcess: data.targetProcess,
                        state: removeState,
                        newWorkItemType: data.newWorkItemType
                    };
                    this._queue.push({ data: deleteStatePayload, func: this._deleteStateTask, taskName: CopyProcessTasks.deleteStateTask });
                });


            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.getStatesTask);
        }
        );
    }

    @autobind
    private _updateStateTask(data: IUpdateStatePayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.updateStateDefinition(data.updateStateModel, data.targetProcess.processTemplateTypeId, data.newWorkItemType.referenceName, data.state.id).then(
            () => { this._executeNextTask(); },
            (reason: any) => {
                this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.updateStateTask);
            }
        );
    }

    @autobind
    private _deleteStateTask(data: IDeleteStatePayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.deleteStateDefinition(data.targetProcess.processTemplateTypeId, data.newWorkItemType.referenceName, data.state.id).then(() => {
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.deleteStateTask);
        }
        );
    }

    @autobind
    private _createStateTask(data: ICloneStatePayload): void {
        let stateInput: ProcessContracts.WorkItemStateInputModel = {
            color: data.newState.color,
            name: data.newState.name,
            order: 0,   // default value to avoid ERROR: WorkItemStateOrderInvalid 
            stateCategory: data.newState.stateCategory
        };

        let processClient = ProcessUtils.getProcessClient();
        processClient.createStateDefinition(stateInput, data.targetProcess.processTemplateTypeId, data.newWorkItemType.referenceName).then(() => {
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.createStateTask);
        }
        );
    }

    @autobind
    private _hideStateTask(data: IHideStatePayload): void {
        let processClient = ProcessUtils.getProcessClient();
        processClient.hideStateDefinition(data.hideStateModel, data.targetProcess.processTemplateTypeId, data.newWorkItemType.referenceName, data.state.id).then(() => {
            this._executeNextTask();
        }, (reason: any) => {
            this._fail(reason, data.targetProcess.processTemplateTypeId, CopyProcessTasks.hideStateTask);
        }
        );
    }
}