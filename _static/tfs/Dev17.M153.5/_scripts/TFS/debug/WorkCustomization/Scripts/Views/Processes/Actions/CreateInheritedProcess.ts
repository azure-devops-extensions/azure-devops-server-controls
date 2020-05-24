
import Q = require("q");
import { Action } from "VSS/Flux/Action";
import { ICreateInheritedProcessRequestPayload, IMigrateInheritedProcessRequestPayload } from "WorkCustomization/Scripts/Contracts/Process";
import { WebAccessHttpClient, ICreateProcessResult, IWebAccessHttpClient } from "WorkCustomization/Scripts/WebApi/WebAccessHttpClient";
import { IProcess, ICreateProcessRequestPayload } from "WorkCustomization/Scripts/Contracts/Process";
import { showErrorAction, clearErrorAction } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";
import { endMigrateProjects, IEndMigrateProjectsPayload } from "WorkCustomization/Scripts/Actions/ProjectActions";
import { IMigrateProjectProcessPayload, IMigratingProjectDetails } from "WorkCustomization/Scripts/Contracts/Projects";
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import StringUtils = require("VSS/Utils/String");
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import ProcessesHttpClient = require("TFS/WorkItemTracking/ProcessRestClient");
import { ProcessUtils } from "WorkCustomization/Scripts/Utils/CommonUtils";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import { getCollectionService } from "VSS/Service";

var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

interface IProjectProcessModel {
    process: ProcessContracts.ProcessInfo;
    project: ProcessContracts.ProjectReference;
}

export class CreateInheritedProcessActionCreator {
    public static beginCreateInheritedProcess(payload: ICreateInheritedProcessRequestPayload, errorBarId: string): Q.Promise<void> {
        return Q(CreateInheritedProcessActionCreator._createInheritedProcessAndMigrate(
            payload.processName, payload.parentProcessTypeId, payload.projectId, payload.workItemType, errorBarId));
    }

    public static beginMigrateToExistingProcess(payload: IMigrateInheritedProcessRequestPayload, errorBarId: string): Q.Promise<void> {
        return Q(CreateInheritedProcessActionCreator._migrateToExistingInheritedProcess(payload.projectId, payload.workItemType, payload.process, errorBarId));
    }

    private static _createInheritedProcessAndMigrate(
        newProcessName: string, parentProcessTypeId: string, projectId: string, workItemType: string, errorBarId: string): IPromise<void> {
        let createProcesspayload: ICreateProcessRequestPayload = {
            name: newProcessName,
            description: "",
            parentTypeId: parentProcessTypeId
        };
        let webAccessHttpClient: IWebAccessHttpClient = CreateInheritedProcessActionCreator._getClient();

        return webAccessHttpClient.beginCreateProcess(createProcesspayload)
            .then<void>((result: ICreateProcessResult) => {
                let process = result.createdProcess;

                let migratePayload: IMigrateProjectProcessPayload = {
                    migratingProjects: [
                        {
                            newProcessTypeId: process.templateTypeId,
                            projectId: projectId
                        }
                    ]
                };

                return CreateInheritedProcessActionCreator._migrateToExistingInheritedProcess(projectId, workItemType, process, errorBarId);

            }, (error) => {
                showErrorAction.invoke({ errorMessage: error.message, errorBarId: errorBarId });
            });
    }

    private static _migrateToExistingInheritedProcess(
        projectId: string,
        workItemType: string,
        process: IProcess,
        errorBarId: string): IPromise<void> {
        let webAccessHttpClient: IWebAccessHttpClient = CreateInheritedProcessActionCreator._getClient();

        let migratePayload: IMigrateProjectProcessPayload = {
            migratingProjects: [
                {
                    newProcessTypeId: process.templateTypeId,
                    projectId: projectId
                }
            ]
        };

        return webAccessHttpClient.beginMigrateProjects(migratePayload).
            then<void>((processes: IProcess[]) => {
                endMigrateProjects.invoke({ processes: processes } as IEndMigrateProjectsPayload);
                clearErrorAction.invoke(null);

                UrlUtils.replaceHistoryPointWithWorkItemTypePage(process.name, workItemType);
            },
            (error) => {
                showErrorAction.invoke({ errorMessage: error.message, errorBarId: errorBarId });
            });
    }

    private static _findProcessByProject(projectId: string, processes: ProcessContracts.ProcessInfo[]): IProjectProcessModel {
        let result: IProjectProcessModel = null;
        processes.forEach((process: ProcessContracts.ProcessInfo) => {
            let project: ProcessContracts.ProjectReference = CreateInheritedProcessActionCreator._findProject(process, projectId);
            if (project != null) {
                result = {
                    process: process,
                    project: project
                };
                return;
            }
        });
        return result;
    }

    private static _findProject(process: ProcessContracts.ProcessInfo, projectId: string): ProcessContracts.ProjectReference {
        let project: ProcessContracts.ProjectReference = null;

        if (process.projects != null) {
            process.projects.forEach((prj: ProcessContracts.ProjectReference) => {
                if (prj.id === projectId) {
                    project = prj;
                    return;
                }
            });
        }
        return project;
    }

    private static _getClient(): IWebAccessHttpClient {
        return getCollectionService(WebAccessHttpClient);
    }
}
