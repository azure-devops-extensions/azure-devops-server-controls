/// <reference types="jquery" />
import "VSS/LoaderPlugins/Css!Agile";

import * as TFS_Agile from "Agile/Scripts/Common/Agile";
import {
    BacklogConfigurationService,
    WorkItemStateCategory
} from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as Diag from "VSS/Diag";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

/**
 * Handles evaluating work items Product Backlog membership validity after changes.
 * This class logic needs to be kept in sync with the WIQL in the ProductBacklogQueryBuilder C# code.
 */
export class ProductBacklogMembershipEvaluator extends TFS_Agile.BaseBacklogMembershipEvaluator {
    /**
     * OVERRIDE: Check for product backlog membership validity
     * @param workItem The work item we are evaluating
     * @return True if the work item is valid, otherwise false
     */
    public _isValid(workItem: WITOM.WorkItem): boolean {
        // NOTE: Order of evaluation here is important. _isStateValid should be after _isIterationValid since it implicitly relies on
        // _isIterationValid succeeding. This is an optimization so we don't have to check that the work item's iteration is one of the
        // team iterations twice.

        const teamFieldName = this._teamSettings.teamFieldName;
        const workItemTeamFieldValue = workItem.getFieldValue(teamFieldName);

        return this._isTeamFieldValid(workItemTeamFieldValue) && this._isIterationValid(workItem) && this._areTypeAndStateValid(workItem);
    }

    /**
     * Checks whether the iteration field is valid for product backlog membership
     * @param workItem The work item we are evaluating
     * @return True if the iteration field is valid, otherwise false
     */
    private _isIterationValid(workItem: WITOM.WorkItem): boolean {
        Diag.Debug.assertParamIsObject(workItem, "workItem");

        const workItemIterationValue = workItem.getFieldValue(WITConstants.CoreFieldRefNames.IterationPath);

        return super._isBacklogIterationPathValid(workItemIterationValue);
    }

    /**
     * Checks whether the work item type and the state field are valid for product backlog membership
     * @param workItem The work item we are evaluating
     * @return True if the work item type and state field are valid, otherwise false
     */
    private _areTypeAndStateValid(workItem: WITOM.WorkItem): boolean {
        const backlogContext = TFS_Agile.BacklogContext.getInstance();
        const workItemStateValue: string = workItem.getFieldValue(WITConstants.CoreFieldRefNames.State);
        const workItemTypeName: string = workItem.getFieldValue(WITConstants.CoreFieldRefNames.WorkItemType);
        let metaState: WorkItemStateCategory = null;

        // If the work item type is in the base context category then we only allow Proposed, In Progress, and Resolved (for bugs) metastates. We don't need to do any further checking
        if (backlogContext.backlogContainsWorkItemType(workItemTypeName)) {
            metaState = BacklogConfigurationService.getBacklogConfiguration().getWorkItemStateCategory(workItemTypeName, workItemStateValue);
            switch (metaState) {
                case WorkItemStateCategory.Proposed:
                    return true;

                case WorkItemStateCategory.Resolved:
                case WorkItemStateCategory.InProgress:
                    return backlogContext.showInProgress;

                case WorkItemStateCategory.Completed:
                default:
                    return false;
            }
        } else {
            // The work item type is either in the filter context category or intermediate category. Now we have to find the category that this work
            // item belongs to so we can get the metastates. Once we have the metastates we allow Proposed, In Progress, Resolved (for bugs) and Complete.

            const workItemTypeInBacklogLevels: boolean = BacklogConfigurationService.getBacklogConfiguration().getAllBacklogLevels().some(level => Utils_Array.contains(level.workItemTypes, workItemTypeName, Utils_String.ignoreCaseComparer));
            if (!workItemTypeInBacklogLevels) {
                return false; // WorkItem does not exist in any of the backlog categories in view so it is not valid
            }

            metaState = BacklogConfigurationService.getBacklogConfiguration().getWorkItemStateCategory(workItemTypeName, workItemStateValue);

            switch (metaState) {
                case WorkItemStateCategory.Proposed:
                case WorkItemStateCategory.Resolved:
                case WorkItemStateCategory.InProgress:
                case WorkItemStateCategory.Completed:
                    return true;
                default:
                    return false;
            }
        }
    }
}