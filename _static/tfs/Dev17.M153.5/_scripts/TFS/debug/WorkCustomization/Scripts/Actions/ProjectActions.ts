import Q = require("q");
import { Action } from "VSS/Flux/Action";
import { showErrorAction, clearErrorAction } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";
import { WebAccessHttpClient, IWebAccessHttpClient, PromoteJobStatusResult } from "WorkCustomization/Scripts/WebApi/WebAccessHttpClient";
import { getCollectionService } from "VSS/Service";
import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";
import { IMigrateProjectProcessPayload, IMigratingProjectDetails } from "WorkCustomization/Scripts/Contracts/Projects";
import { endGetProcessesWithProjectsAction, IEndGetProcessesActionPayload } from "WorkCustomization/Scripts/Actions/ProcessActions";
import { ProcessesActionCreator } from "WorkCustomization/Scripts/Actions/ProcessActions";

export interface IEndMigrateProjectsPayload {
    processes: IProcess[];
}
export var endMigrateProjects = new Action<IEndMigrateProjectsPayload>();
export var endPartialMigrateProjects = new Action<IEndGetProcessesActionPayload>();

export module ProjectsActionCreator {
    export function beginMigrateProjects(projectIds: string[], targetProcessTypeId: string, errorBarId: string): Q.Promise<void> {
        let httpClient: IWebAccessHttpClient = getCollectionService(WebAccessHttpClient);

        let migratingProjectDetails: IMigratingProjectDetails[] = [];

        for (let projectId of projectIds) {
            migratingProjectDetails.push({ newProcessTypeId: targetProcessTypeId, projectId: projectId });
        }

        return Q(httpClient.beginMigrateProjects({ migratingProjects: migratingProjectDetails })
            .then<void>((processes: IProcess[]) => {
                endMigrateProjects.invoke({ processes: processes });
                clearErrorAction.invoke(null);
            }, error => {
                const hasHtmlError: boolean = error.htmlMessage != null;
                let errorMessage: string = hasHtmlError ? error.htmlMessage : error.message;

                // Remove duplicate errors.
                const messages: string[] = errorMessage.split(/<br\s*\/>/i);

                for (let i = messages.length - 1; i >= 0; i--) {
                    if (messages[i] === "" || messages.indexOf(messages[i]) !== i) {
                        messages.splice(i, 1);
                    }
                }

                errorMessage = messages.join("<br />") + "<br />";

                ProcessesActionCreator.beginGetProcessesWithProjects(false);
                showErrorAction.invoke({ errorMessage: errorMessage, isDangerousHTML: hasHtmlError, errorBarId: errorBarId });
            }));
    }

    export function queryMigrationJobStatus(jobId: string): IPromise<PromoteJobStatusResult> {
        const httpClient: IWebAccessHttpClient = getCollectionService(WebAccessHttpClient);

        return httpClient.queryMigrateJobStatus(jobId);
    }
}
