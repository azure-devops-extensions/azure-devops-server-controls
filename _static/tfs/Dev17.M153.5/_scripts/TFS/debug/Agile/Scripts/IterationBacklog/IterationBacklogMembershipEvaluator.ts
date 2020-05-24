import TFS_Agile_ProductBacklog_DM = require("Agile/Scripts/Backlog/ProductBacklogDataManager");
import TFS_Agile = require("Agile/Scripts/Common/Agile");
import TFS_Agile_Utils = require("Agile/Scripts/Common/Utils");
import {
    BacklogConfigurationService,
    WorkItemStateCategory,
} from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import TFS_OM = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Diag = require("VSS/Diag");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");


var DatabaseCoreFieldRefName = TFS_Agile_Utils.DatabaseCoreFieldRefName;

export class IterationBacklogMembershipEvaluator extends TFS_Agile.BaseBacklogMembershipEvaluator {
    private _dataManager: TFS_Agile_ProductBacklog_DM.ProductBacklogDataManager;

    constructor(dataManager: TFS_Agile_ProductBacklog_DM.ProductBacklogDataManager) {
        /**
         * Handles evaluating work items Iteration Backlog membership validity after changes
         */
        super(TFS_Agile.BacklogContext.getInstance().team.id);
        Diag.Debug.assertParamIsObject(dataManager, "dataManager");

        this._dataManager = dataManager;
    }

    /**
     * Checks whether the iteration field is valid for product backlog membership
     * 
     * @param workItem The work item we are evaluating
     * @return True if the iteration field is valid, otherwise false
     */
    private _isIterationValid(workItem: WITOM.WorkItem): boolean {
        Diag.Debug.assertParamIsObject(workItem, "workItem");

        var workItemIterationValue = workItem.getField(DatabaseCoreFieldRefName.IterationPath).getValue();
        var requestIteration = TFS_OM.ProjectCollection.getDefaultConnection().getService<TFS_Agile.AgileContext>(TFS_Agile.AgileContext).getContext().iteration.path;

        return super._isIterationPathValid(workItemIterationValue, requestIteration);
    }

    /**
     * Checks whether the state field is valid for product backlog membership
     * 
     * @param workItem The work item we are evaluating
     * @return True if the state field is valid, otherwise false
     */
    private _isStateValid(workItem: WITOM.WorkItem): boolean {

        var workItemStateValue = workItem.getState(),
            stateType = WorkItemStateCategory,
            workItemType = workItem.workItemType.name,
            workItemStateCategory = BacklogConfigurationService.getBacklogConfiguration().getWorkItemStateCategory(workItemType, workItemStateValue);

        switch (workItemStateCategory) {
            case stateType.Proposed:
            case stateType.InProgress:
            case stateType.Resolved: // Resolved metastate for Bugs Category is valid
            case stateType.Completed:
                return true;
            default:
                return false;
        }
    }

    /**
     * OVERRIDE: Evaluate workitem membership on iteration backlog
     *
     * @param workItem The work item we are evaluating
     * @callback function to be executed after evaluating the workItem
     */
    public evaluate(workItem: WITOM.WorkItem, callback: IResultCallback) {
        Diag.Debug.assertParamIsObject(workItem, "workItem");
        Diag.Debug.assertParamIsFunction(callback, "callback");
        var hasChildInIteration = false;
        var workItemId = workItem.id;
        var evaluateResult = () => {
            if (hasChildInIteration || this._isValid(workItem)) {
                callback(true); // true = backlog membership is valid
            }
            else {
                callback(false); // false = backlog membership is not valid
            }
        };
        this._beginGetSettings(() => {

            if (this._dataManager.getDescendantCount(workItemId) > 0) {
                var childWorkItemIds = this._dataManager.getDescendantWorkItemIds(workItemId) || [];
                WorkItemManager.get(TFS_OM.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore)).beginGetWorkItems(childWorkItemIds, (workItems) => {
                    for (workItem of workItems) {
                        if (this._isValid(workItem)) {
                            hasChildInIteration = true;
                            break;
                        }
                    }
                    evaluateResult();
                });
            }
            else {
                evaluateResult();
            }

        });
    }

    /**
     * OVERRIDE: Check for product backlog membership validity
     * 
     * @param workItem The work item we are evaluating
     * @return True if the work item is valid, otherwise false
     */
    public _isValid(workItem: WITOM.WorkItem): boolean {

        var teamFieldName = this._teamSettings.teamFieldName,
            workItemTeamFieldValue = workItem.getFieldValue(teamFieldName);

        return this._isTeamFieldValid(workItemTeamFieldValue) && this._isIterationValid(workItem) && this._isStateValid(workItem);
    }
}