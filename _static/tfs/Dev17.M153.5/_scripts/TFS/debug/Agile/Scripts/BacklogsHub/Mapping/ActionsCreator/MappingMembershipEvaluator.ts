import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { ITeamSettings } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { AgileProjectMapping, ClassificationPathUtils } from "Agile/Scripts/Common/Agile";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { IBacklogLevelConfiguration, WorkItemStateCategory } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Models";
import { equals } from "VSS/Utils/String";
import { BacklogConfigurationService } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import { findIndex } from "VSS/Utils/Array";

export class MappingMembershipEvaluator {
    private _getTargetBacklogConfiguration: () => IBacklogLevelConfiguration;
    private _getTeamSettings: () => ITeamSettings;

    constructor(getTeamSettings: () => ITeamSettings, getTargetBacklogConfiguration: () => IBacklogLevelConfiguration) {
        this._getTeamSettings = getTeamSettings;
        this._getTargetBacklogConfiguration = getTargetBacklogConfiguration;
    }

    public isValid(workItem: WorkItem): boolean {
        return this._isProperType(workItem) && this._isTeamFieldValid(workItem) && this._isIterationValid(workItem) && this._areTypeAndStateValid(workItem);
    }

    private _isProperType(workItem: WorkItem): boolean {
        const workItemType: string = workItem.getFieldValue(CoreFieldRefNames.WorkItemType);
        const targetBacklogConfiguration = this._getTargetBacklogConfiguration();
        return findIndex(targetBacklogConfiguration.workItemTypes, wit => equals(wit, workItemType, true)) >= 0;
    }

    private _isTeamFieldValid(workItem: WorkItem): boolean {
        const teamSettings = this._getTeamSettings();
        const teamFieldName = teamSettings.teamFieldName;
        const workItemTeamFieldValue = workItem.getFieldValue(teamFieldName);

        // Loop over the projectNames which map to the project guid. Typically it will be only one item.
        // Get the projectName to compare in order to deal with project rename scenario.
        const projectNames = AgileProjectMapping.getInstance().getProjectNames(teamSettings.projectId);
        const teamFieldValues = teamSettings.teamFieldValues;

        return teamFieldValues.some(teamFieldValue =>
            ClassificationPathUtils.isClassificationPathEqualOrUnderRelative(
                projectNames, workItemTeamFieldValue, teamFieldValue.value, teamFieldValue.includeChildren));
    }

    private _isIterationValid(workItem: WorkItem): boolean {
        const teamSettings = this._getTeamSettings();
        const iterationFieldValue = workItem.getFieldValue(CoreFieldRefNames.IterationPath);
        const backlogIterationPath = teamSettings.backlogIteration.friendlyPath;
        const projectNames = AgileProjectMapping.getInstance().getProjectNames(teamSettings.projectId);

        return ClassificationPathUtils.isClassificationPathEqualOrUnderRelative(
            projectNames, iterationFieldValue, backlogIterationPath, true);
    }

    private _areTypeAndStateValid(workItem: WorkItem): boolean {
        const workItemType = workItem.getFieldValue(CoreFieldRefNames.WorkItemType);
        const state = workItem.getFieldValue(CoreFieldRefNames.State);

        const metaState = BacklogConfigurationService.getBacklogConfiguration().getWorkItemStateCategory(workItemType, state);
        switch (metaState) {
            case WorkItemStateCategory.Proposed:
            case WorkItemStateCategory.InProgress:
            case WorkItemStateCategory.Resolved:
                return true;
            case WorkItemStateCategory.Completed:
            default:
                return false;
        }
    }
}