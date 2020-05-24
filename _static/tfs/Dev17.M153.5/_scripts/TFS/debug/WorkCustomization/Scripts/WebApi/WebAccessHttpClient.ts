import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";
import { VssConnection } from "VSS/Service";
import { PageDataService } from "WorkCustomization/Scripts/WebApi/PageDataService";
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import { ICreateProcessRequestPayload, IProcess, IDeleteProcessRequestPayload, ISetEnableProcessPayload, ISetDefaultProcessPayload, IUpdateProcessRequestPayload } from "WorkCustomization/Scripts/Contracts/Process";
import { IMigrateProjectProcessPayload, IMigratingProjectDetails } from "WorkCustomization/Scripts/Contracts/Projects";
import Q = require("q");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import { ProcessUtils } from "WorkCustomization/Scripts/Utils/CommonUtils";
import * as ProcessTemplateHttpClient from "TFS/WorkItemTracking/ProcessTemplateRestClient";

import AdminProcessContracts = require("Admin/Scripts/Contracts/TFS.Admin.Process.Contracts");

export interface ICreateProcessResult {
    processTemplateTypeId: string;
    createdProcess: IProcess;
}

// capitalized to match the return type from server
export interface PromoteJobStatusResult {
    State: number;
    PercentComplete?: number;
    ProgressText: string;
}

export enum JobProgressState {
    NotStarted = 0,
    InProgress = 1,
    Complete = 2,
    Error = 3
}

export interface IWebAccessHttpClient {
    beginGetProcessFieldUsageData: (processId: string) => IPromise<AdminProcessContracts.ProcessFieldUsageData>;
    beginCreateProcess: (payload: ICreateProcessRequestPayload) => IPromise<ICreateProcessResult>;
    beginUpdateProcess: (payload: IUpdateProcessRequestPayload) => IPromise<IProcess[]>;
    beginDeleteProcess: (payload: IDeleteProcessRequestPayload) => IPromise<IProcess[]>;
    beginSetEnableProcess: (payload: ISetEnableProcessPayload) => IPromise<void>;
    beginSetDefaultProcess: (payload: ISetDefaultProcessPayload) => IPromise<void>;
    beginMigrateProjects: (payload: IMigrateProjectProcessPayload) => IPromise<IProcess[]>;
    beginGetFieldAllowedValues: (fieldReferenceName: string) => IPromise<string[]>;
    queryMigrateJobStatus: (jobIdToQuery: string) => IPromise<PromoteJobStatusResult>;
    beginCloneXmlProcessToInherited: (sourceProcessId: string, targetProcessName: string, targetProcessType: string, processDescription: string) => IPromise<IProcess[]>;
    queuePromoteProjectToProcessJob: (projectName: string, targetProcessId: string) => IPromise<string>;
}

export class WebAccessHttpClient extends TfsService implements IWebAccessHttpClient {
    private _pageDataSvc: PageDataService;

    public initializeConnection(connection: VssConnection): void {
        super.initializeConnection(connection);
        this._pageDataSvc = this.tfsConnection.getService(PageDataService);
    }

    public beginGetProcessFieldUsageData(processId: string): IPromise<AdminProcessContracts.ProcessFieldUsageData> {
        let url: string = this.getTfsContext().getActionUrl('GetProcessFieldUsages', 'process', { area: 'api' });
        let deferred: Q.Deferred<AdminProcessContracts.ProcessFieldUsageData> = Q.defer<AdminProcessContracts.ProcessFieldUsageData>();

        let onSuccess = (data) => {
            deferred.resolve(JSON.parse(data) as AdminProcessContracts.ProcessFieldUsageData);
        };

        TFS_Core_Ajax.getMSJSON(url, { processTypeId: processId }, onSuccess, deferred.reject);

        return deferred.promise;
    }

    public beginCreateProcess(payload: ICreateProcessRequestPayload): IPromise<ICreateProcessResult> {
        let processesClient = ProcessUtils.getProcessClient();
        let deferred: Q.Deferred<ICreateProcessResult> = Q.defer<ICreateProcessResult>();

        let onSuccess = (result: ProcessContracts.ProcessInfo) => {
            let newProcess : IProcess = {
                templateTypeId: result.typeId,
                name: result.name,
                referenceName: result.referenceName,
                description: result.description,
                isEnabled:result.isEnabled,
                isDefault: result.isDefault,
                isSystemTemplate: false,        // cannot be system Template
                isInheritedTemplate: true,      // inherited process
                editPermission: true,          // just define true for now until user refreshes
                deletePermission: true,        // just define true for now until user refreshes
                createPermission: true,         // has to be true since user created this process
                allProjectsCount: 0,
                projects: [],       // no new projects since process is just created
                parentTemplateTypeId: result.parentProcessTypeId

            }
            deferred.resolve({ processTemplateTypeId: newProcess.templateTypeId, createdProcess: newProcess } as ICreateProcessResult);
        };

        let createRequest: ProcessContracts.CreateProcessModel = {
            name: payload.name,
            description: payload.description,
            parentProcessTypeId: payload.parentTypeId,
            referenceName: this._generateReferenceName(payload.name)
        };
        processesClient.createNewProcess(createRequest).then(onSuccess, deferred.reject);

        return deferred.promise;
    }

    public beginUpdateProcess(payload: IUpdateProcessRequestPayload): IPromise<IProcess[]> {
        let processesClient =  ProcessUtils.getProcessClient();
        let deferred: Q.Deferred<IProcess[]> = Q.defer<IProcess[]>();

        let onSuccess = () => {
            this._pageDataSvc.beginReloadPageData()
                .then(data => {
                    deferred.resolve(data.processes);
                });
        };

        let updateRequest: ProcessContracts.UpdateProcessModel = {
            name: payload.name,
            description: payload.description,
            isDefault: null,
            isEnabled: null
        };
        processesClient.editProcess(updateRequest, payload.templateTypeId).then(onSuccess, deferred.reject);

        return deferred.promise;
    }

    public beginDeleteProcess(payload: IDeleteProcessRequestPayload): IPromise<IProcess[]> {
        let processesClient = ProcessUtils.getProcessClient();
        let deferred: Q.Deferred<IProcess[]> = Q.defer<IProcess[]>();

        let onSuccess = () => {
            this._pageDataSvc.beginReloadPageData()
                .then(data => {
                    deferred.resolve(data.processes);
                });
        };
        processesClient.deleteProcessById(payload.templateTypeId).then(onSuccess, deferred.reject);

        return deferred.promise;
    }

    public beginSetEnableProcess(payload: ISetEnableProcessPayload): IPromise<void> {
        let processesClient =  ProcessUtils.getProcessClient();
        let deferred: Q.Deferred<void> = Q.defer<void>();

        let updateRequest: ProcessContracts.UpdateProcessModel = {
            name: null,
            description: null,
            isDefault: null,
            isEnabled: payload.isEnabled
        };
        processesClient.editProcess(updateRequest, payload.templateTypeId).then(_ => deferred.resolve(null), deferred.reject);

        return deferred.promise;
    }

    public beginSetDefaultProcess(payload: ISetDefaultProcessPayload): IPromise<void> {
        let processesClient = ProcessUtils.getProcessClient();
        let deferred: Q.Deferred<void> = Q.defer<void>();

        let updateRequest: ProcessContracts.UpdateProcessModel = {
            name: null,
            description: null,
            isDefault: true,
            isEnabled: null
        };
        processesClient.editProcess(updateRequest, payload.templateTypeId).then(_ => deferred.resolve(null), deferred.reject);

        return deferred.promise;
    }

    public beginMigrateProjects(payload: IMigrateProjectProcessPayload): IPromise<IProcess[]> {
        let url: string = this.getTfsContext().getActionUrl('MigrateProjectsProcess', 'process', { area: 'api' });

        let deferred: Q.Deferred<IProcess[]> = Q.defer<IProcess[]>();

        let onSuccess = (data: any[]) => {
            if (data && data.length > 0) {
                let htmlMessage = "";
                for (let entry of data) {
                    if (entry.exception != null && entry.exception.message != null) {
                        htmlMessage += Utils_String.htmlEncode(entry.exception.message) + "<br />"; // we don't trust server message, so encode it
                    }
                }

                if (htmlMessage.length > 0) {
                    deferred.reject({ htmlMessage: htmlMessage });
                    return;
                }
            }

            this._pageDataSvc.beginReloadPageData()
                .then(data => {
                    deferred.resolve(data.processes);
                }, deferred.reject);
        };

        TFS_Core_Ajax.postMSJSON(url, { migratingProjects: Utils_Core.stringifyMSJSON(payload.migratingProjects) },
            onSuccess, deferred.reject);

        return deferred.promise;
    }

    public queryMigrateJobStatus(jobIdToQuery: string): IPromise<PromoteJobStatusResult> {
        let url: string = this.getTfsContext().getActionUrl('GetJobProgress', 'process', $.extend({ area: 'api' }, { jobId: jobIdToQuery  }));

        let deferred: Q.Deferred<PromoteJobStatusResult> = Q.defer<PromoteJobStatusResult>();
        TFS_Core_Ajax.getMSJSON(
            url,
            null,
            (statusResult: PromoteJobStatusResult) => {
                deferred.resolve(statusResult);
            }, deferred.reject);

        return deferred.promise;
    }

    public beginGetFieldAllowedValues(fieldReferenceName: string, workItemTypeNames?: string[]): IPromise<string[]> {
        let deferred: Q.Deferred<string[]> = Q.defer<string[]>();
        let url: string = this.getTfsContext().getActionUrl('allowedValues', 'wit', $.extend({ project: "", team: "", area: 'api' }, { fieldReferenceName: fieldReferenceName, workItemTypeNames: workItemTypeNames }));
        TFS_Core_Ajax.getMSJSON(
            url,
            null,
            (allowedValues: string[]) => {
                deferred.resolve(allowedValues);
            }, deferred.reject);

        return deferred.promise;
    }

    public beginCloneXmlProcessToInherited(sourceProcessId: string, targetProcessName: string, targetProcessType: string, processDescription: string): IPromise<IProcess[]> {
        let deferred: Q.Deferred<IProcess[]> = Q.defer<IProcess[]>();

        let onSuccess = (typeId: string) => {
            this._pageDataSvc.beginReloadPageData()
                .then(data => {
                    deferred.resolve(data.processes);
                });
        };

        let httpClient = ProcessTemplateHttpClient.getClient();
        httpClient.cloneXmlToInherited(sourceProcessId, targetProcessName, targetProcessType, processDescription).then(onSuccess, deferred.reject);

        return deferred.promise;
    }

    public queuePromoteProjectToProcessJob(projectName: string, targetProcessId: string): IPromise<string> {
        let deferred: Q.Deferred<string> = Q.defer<string>();

        let onSuccess = (jobId: string) => {
            deferred.resolve(jobId);
        };

        let httpClient = ProcessTemplateHttpClient.getClient();
        httpClient.queuePromoteProjectToProcessJob(projectName, targetProcessId).then(onSuccess, deferred.reject);

        return deferred.promise;
    }

    // helper method to generate unique process reference name
    private _generateReferenceName(processName: string): string {
        let accountName: string = this.getTfsContext().contextData.account.name;

        accountName = accountName.replace(/[ \-]|[^\x00-\x7F]/g, '') || 'Custom';
        processName = processName.replace(/[ \-]|[^\x00-\x7F]/g, '');

        let index = 0;

        if (!processName) { // Default value if process is all spaces dashes and unicode
            processName = 'Process';
            index = 1;
        }

        let referenceName: string = accountName + '.' + processName;

        while (this._isExistingProcessRefName(referenceName + (index ? '_' + index : ''))) {
            index++;
        }

        return referenceName + (index ? '_' + index : '');
    }

    // helper method to verify if a process reference name already exists
    private _isExistingProcessRefName(refName: string): boolean {
        var processes: IProcess[] = this._pageDataSvc.getAllProcesses();

        if (processes) {
            for (var i in processes) {
                if (processes[i].referenceName === refName) {
                    return true;
                }
            }
        }

        return false;
    }
}