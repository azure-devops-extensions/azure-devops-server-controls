import { IFieldIdValue } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { ITeamSettings } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { getService } from "VSS/Service";
import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { Debug } from "VSS/Diag";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { TeamAwarenessService } from "Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService";
import { handleError } from "VSS/VSS";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";

/**
 * Try to set team defaults on the provided work item
 *
 * @param teamId Id of the team to set defaults for
 * @param workItem Work item
 * @param useDefaultIteration
 */
export async function beginTrySetWorkItemTeamDefaults(teamId: string, workItem: WorkItem, useDefaultIteration: boolean = true): Promise<void> {
    Debug.assertParamIsType(workItem, WorkItem, "workItem");

    let pageContextProjectId: string;
    let workItemProjectId: string;

    try {
        const tfsContext = workItem.store.getTfsContext();
        const connection = ProjectCollection.getConnection(tfsContext);
        pageContextProjectId = connection.getWebContext().project.id.toLowerCase();
        workItemProjectId = workItem.project.guid.toLowerCase();
    } catch {
        // NOTE: Being overly protective here since this is coming late in M96. Thoughts here are that there might be scenarios where this code executes
        // outside a project context.
        pageContextProjectId = "";
        workItemProjectId = "";
    }

    if (pageContextProjectId !== workItemProjectId) {
        return Promise.resolve(null);
    }

    return workItem.store.beginGetTeamSettings(teamId).then(
        teamSettings => {
            if (!teamSettings) {
                // If the team settings cannot be retrieved, ignore
                return;
            }

            const presets: IFieldIdValue[] = [];

            let iterationValue: string | undefined = undefined;
            if (useDefaultIteration) {
                if (teamSettings.defaultIteration) {
                    iterationValue = teamSettings.defaultIteration.friendlyPath;
                } else if (teamSettings.currentIteration) {
                    iterationValue = teamSettings.currentIteration.friendlyPath;
                }
            }

            if (!iterationValue && teamSettings.backlogIteration) {
                iterationValue = teamSettings.backlogIteration.friendlyPath;
            }

            if (iterationValue) {
                presets.push({ fieldName: CoreFieldRefNames.IterationPath, value: iterationValue });
            }

            if (teamSettings.teamFieldName) {
                presets.push({ fieldName: teamSettings.teamFieldName, value: teamSettings.teamFieldDefaultValue });
            }

            for (const preset of presets) {
                const field = workItem.getField(preset.fieldName);
                if (field) {
                    field.setValue(preset.value);
                }
            }
        },
        (error: TfsError) => {
            // If the team settings cannot be retrieved, ignore error and continue with the work item
        }
    );
}
