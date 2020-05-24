import { Iteration } from "Agile/Scripts/Models/Iteration/Iteration";
import { IIterationData } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { shiftToUTC } from "VSS/Utils/Date";
import { TeamSettingsIteration } from "TFS/Work/Contracts";
import { ISprintsIterationData } from "Agile/Scripts/SprintsHub/Directory/SprintDirectoryContracts";
import { WorkItemClassificationNode } from "TFS/WorkItemTracking/Contracts";

export namespace IterationBuilder {
    /**
     * Create an Iteration from an IIterationData interface
     * @param iterationData The iteration data inferface
     * @return A constructed Iteration object
     */
    export function fromIIterationData(iterationData: IIterationData): Iteration {
        if (iterationData) {
            return new Iteration({
                name: iterationData.name,
                iterationPath: iterationData.friendlyPath,
                id: iterationData.id,
                startDateUTC: iterationData.startDate ? shiftToUTC(new Date(iterationData.startDate)) : undefined,
                finishDateUTC: iterationData.finishDate ? shiftToUTC(new Date(iterationData.finishDate)) : undefined
            });
        }
    }

    export function fromISprintsIterationData(iterationData: ISprintsIterationData): Iteration {
        return new Iteration({
            name: iterationData.name,
            iterationPath: iterationData.path,
            id: iterationData.id,
            startDateUTC: iterationData.startDate ? shiftToUTC(new Date(iterationData.startDate)) : undefined,
            finishDateUTC: iterationData.endDate ? shiftToUTC(new Date(iterationData.endDate)) : undefined
        });
    }

    export function fromTeamSettingsIteration(teamSettingsIteration: TeamSettingsIteration): Iteration {
        if (teamSettingsIteration) {
            return new Iteration({
                id: teamSettingsIteration.id,
                name: teamSettingsIteration.name,
                iterationPath: teamSettingsIteration.path,
                startDateUTC: teamSettingsIteration.attributes.startDate ? shiftToUTC(teamSettingsIteration.attributes.startDate) : undefined,
                finishDateUTC: teamSettingsIteration.attributes.finishDate ? shiftToUTC(teamSettingsIteration.attributes.finishDate) : undefined,
            });
        }
    }

    export function fromWorkItemClassificationNode(workItemClassificationNode: WorkItemClassificationNode): Iteration {
        if (workItemClassificationNode) {
            return new Iteration({
                id: workItemClassificationNode.identifier,
                name: workItemClassificationNode.name,
                iterationPath: null, // We do not have enough information at this level to construct an iteration path
                startDateUTC: workItemClassificationNode.attributes.startDate ? shiftToUTC(new Date(workItemClassificationNode.attributes.startDate)) : undefined,
                finishDateUTC: workItemClassificationNode.attributes.finishDate ? shiftToUTC(new Date(workItemClassificationNode.attributes.finishDate)) : undefined,
            })
        }
    }
}