import Diag = require("VSS/Diag");
import Events_Services = require("VSS/Events/Services");
import Q = require("q");
import { WorkItemStore, Link, WorkItemLink, WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { EditActionSet, IEditAction, EditActionType, IEditActionResult } from "WorkItemTracking/Scripts/OM/History/EditActionSet";
import { Actions } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { IWorkItemData } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");

export class WorkItemHistory {

    private actionSets: EditActionSet[];
    private messageActionSets: EditActionSet[];
    private _workItem: WorkItem;
    private static _listenersInitialized: boolean;
    public static HISTORY_KEY = "history";
    public static DEFERRED_HISTORY_KEY = "deferredHistory";

    public static getHistory(workItem: WorkItem): WorkItemHistory {
        Diag.Debug.assertParamIsNotUndefined(workItem, "workItem");
        Diag.Debug.assertParamIsNotNull(workItem, "workItem");
        Diag.Debug.assert(workItem.getRevisionsArePopulated(), "Revisions must be populated to call this method");

        let currentHistory: WorkItemHistory = <WorkItemHistory>workItem.relatedData[WorkItemHistory.HISTORY_KEY];

        if (!currentHistory) {
            currentHistory = new WorkItemHistory(workItem);
            workItem.relatedData[WorkItemHistory.HISTORY_KEY] = currentHistory;
        }

        if (!WorkItemHistory._listenersInitialized) {
            WorkItemHistory._listenersInitialized = true;
            Events_Services.getService().attachEvent(Actions.RESET_HISTORY, WorkItemHistory.onResetHistory);
        }

        return currentHistory;
    }

    public static getHistoryAsync(workItem: WorkItem): IPromise<WorkItemHistory> {
        const callback = () => {
            let deferredHistory: Q.Deferred<WorkItemHistory> = <Q.Deferred<WorkItemHistory>>workItem.relatedData[WorkItemHistory.DEFERRED_HISTORY_KEY];
            if (deferredHistory) {
                return deferredHistory.promise;
            }

            deferredHistory = Q.defer<WorkItemHistory>();
            workItem.relatedData[WorkItemHistory.DEFERRED_HISTORY_KEY] = deferredHistory;

            if (workItem.getRevisionsArePopulated()) {
                deferredHistory.resolve(WorkItemHistory.getHistory(workItem));
                return deferredHistory.promise;
            }

            const updateHistory = () => {

                const loadDate = workItem.getLoadTime();

                workItem.store.beginGetWorkItemData(
                    [workItem.id],
                    (workItemPayload: IWorkItemData) => {

                        if (loadDate !== workItem.getLoadTime()) {
                            // Work item was updated from the server during history download, re-download the history so it's accurate.
                            updateHistory();
                            return;
                        }

                        if (workItem.getRevisionsArePopulated()) {
                            // Another thread completed this first.
                            deferredHistory.resolve(WorkItemHistory.getHistory(workItem));
                            return;
                        }

                        if (workItemPayload.revisions) {

                            const revisionIndex = workItem.revision - 1;

                            // Revisions always come in order, 1-n.  We take the first set of them which are <= the work item's revision
                            workItemPayload.revisions.splice(revisionIndex, workItemPayload.revisions.length - revisionIndex);
                            workItem.setRevisions(workItemPayload.revisions);
                        } else {
                            workItem.setRevisions([]);
                        }

                        workItem.referencedPersons = workItemPayload.referencedPersons || {};

                        // Save off link modifications (added/deleted)
                        const changedlinks = workItem.getLinkUpdates();

                        // clear out the current set of links and take the updated ones from the server.

                        // Handle links/attachments
                        const links = [];

                        if (workItemPayload.files) {
                            Utils_Array.addRange(links, workItemPayload.files);
                        }

                        if (workItemPayload.relations) {
                            Utils_Array.addRange(links, workItemPayload.relations);
                        }

                        if (workItemPayload.relationRevisions) {
                            Utils_Array.addRange(links, workItemPayload.relationRevisions);
                        }

                        workItem.allLinks = [];

                        const fieldIdMap: IDictionaryNumberTo<boolean> = {};

                        // Update all of the links.
                        for (let i = 0, l = links.length; i < l; i++) {

                            const link = Link.createFromLinkData(workItem, links[i])

                            fieldIdMap[link.getFieldId()] = true;

                            // If the added date is in the future do not add the link.
                            if (link.getAddedDate() > workItem.getLoadTime()) {
                                continue;
                            }

                            // if the 'removed' date in the future, set the removed date to a future date (hasn't been removed in this revision)
                            if (link.isRemoved() && link.getRemovedDate() > workItem.getLoadTime()) {
                                link.setRemovedDate(WorkItemStore.FutureDate);
                            }

                            workItem.allLinks.push(link);
                        }

                        // Restore added and removed links.
                        workItem._restoreLinkUpdates(changedlinks);

                        workItem.resetLinks();

                        const changedFields = Object.keys(fieldIdMap);

                        if (changedFields.length > 0) {
                            // Tell consumers that the links collections have changed
                            workItem.fireFieldChange(changedFields);
                        }

                        deferredHistory.resolve(WorkItemHistory.getHistory(workItem));
                    },
                    (error) => {
                        deferredHistory.reject(error);
                    },
                    workItem.isDeleted(),
                    true);
            };

            updateHistory();

            return deferredHistory.promise;
        };

        if (workItem.isReadOnly()) {
            return callback();
        } else {
            return workItem.project.nodesCacheManager.beginGetNodes().then(callback);
        }
    }

    constructor(workItem: WorkItem) {
        this._init(workItem);
    }

    private _init(workItem: WorkItem) {
        ///<param name="workItem" type="WorkItem" />

        this._workItem = workItem;

        if (!workItem.isNew()) {
            const actions: IEditAction[] = [];

            this._populateActions(actions, workItem);
            this._sortActions(actions, workItem);
            this.actionSets = this._groupActions(actions, workItem);
        } else {
            this.actionSets = [];
        }
    }

    // This populates workitem change history into array of IEditAction, each IEditAction object represents either
    //   a) A revision change for fields (i.e. no matter how many fields are changed in one revision, it's one action)
    //   b) A link change (add/remove) (If multiple link change happens at same time, each is an INDIVIDUAL action)
    // The output, while based on the implementation do have certain order, is assumed UNORDERED in the further processing.
    private _populateActions(actions: IEditAction[], workItem: WorkItem) {

        // WorkItem.revisions object does not include latest revision, eg, if current rev is 5, you only see 4 elements in revisions array, where [0] is logical revision 1
        const revCount = workItem.getRevisions().length + 1;

        // Getting field revisions
        // Walk through from latest -> first revision but insert in reverse order.
        // For any code consume getNonComputedFieldValueByRevisionWithDefaultValue, the default value must be the value of revision + 1
        // See WorkItemModel class code for more details on how WorkItem.revisions is constructed
        let lastChangedDate;
        let lastChangedBy;
        for (let i = revCount - 1; i >= 0; i--) {
            const changedDate = workItem.getNonComputedFieldValueByRevisionWithDefaultValue(WITConstants.CoreField.ChangedDate, i, lastChangedDate);
            const changedBy = workItem.getNonComputedFieldValueByRevisionWithDefaultValue(WITConstants.DalFields.PersonID, i, lastChangedBy);

            actions.unshift({
                index: i,
                type: EditActionType.Revision,
                changedDate: changedDate,
                changedBy: changedBy
            });

            lastChangedDate = changedDate;
            lastChangedBy = changedBy;
        }

        // Getting link revisions
        const linkCount = workItem.allLinks.length;
        let link: Link;

        for (let i = 0; i < linkCount; i++) {
            link = workItem.allLinks[i];

            if (!link.isNew() && link.getFieldId() !== WITConstants.DalFields.HiddenAttachedFiles) {
                actions.push({
                    index: i,
                    type: WorkItemHistory._editActionFromFieldId(link.getFieldId()),
                    changedDate: link.getAddedDate(),
                    changedBy: jQuery.isFunction((<WorkItemLink>link).getAddedBy) ? (<WorkItemLink>link).getAddedBy() : 0
                });
            }

            if (link.isRemoved() && link.getFieldId() !== WITConstants.DalFields.HiddenAttachedFiles) {
                actions.push({
                    index: i,
                    type: WorkItemHistory._editActionFromFieldId(link.getFieldId()) + 1,
                    changedDate: link.getRemovedDate(),
                    changedBy: jQuery.isFunction((<WorkItemLink>link).getRemovedBy) ? (<WorkItemLink>link).getRemovedBy() : 0
                });
            }
        }
    }

    private _getActionObject(workItem: WorkItem, action: IEditAction): any {
        ///<param name="workItem" type="WorkItem" />

        if (action.type !== EditActionType.None) {
            const revisions = workItem.getRevisions();
            return action.type === EditActionType.Revision ? revisions[action.index] : workItem.allLinks[action.index];
        }
        return null;
    }

    // Sort the actions, primarily on Date, in DESCENDING order
    private _sortActions(actions: IEditAction[], workItem: WorkItem) {
        ///<param name="workItem" type="WorkItem" />

        const actionComparer = (a1: IEditAction, a2: IEditAction) => {
            let result = 0;

            // Sorting on action date first
            result = Utils_Date.defaultComparer(a2.changedDate, a1.changedDate);

            // Sorting on edit action type next
            if (result === 0) {
                result = a1.type - a2.type;
            }

            // Sorting on user
            if (result === 0 && a1.changedBy > 0 && a2.changedBy > 0) {
                result = a1.changedBy - a2.changedBy;
            }

            // Sorting on link type first and then target id
            if (result === 0 && (a1.type === EditActionType.AddWorkItemLink || a1.type === EditActionType.DelWorkItemLink)) {
                const la1 = this._getActionObject(workItem, a1);
                const la2 = this._getActionObject(workItem, a2);

                if (la1 && la2) {
                    result = la1.getLinkType() - la2.getLinkType();
                    if (result === 0) {
                        result = la1.getTargetId() - la2.getTargetId();
                    }
                }
            }
            return result;
        }

        actions.sort(actionComparer);
    }

    // Group IEditAction -> EditActionSet by ChangedDate, each EditActionSet represents a logical 'revision' in the history view
    private _groupActions(actions: IEditAction[], workItem: WorkItem): EditActionSet[] {

        const result: EditActionSet[] = [];
        let actionSet: EditActionSet;
        const lastRevState: string = null;

        function createSet(): EditActionSet {

            // Creating a new action actionSet
            const s = new EditActionSet();

            // Adding the actionSet to the result list
            result.push(s);

            return s;
        }

        for (const action of actions) {
            if (!actionSet || // If there is no actionSet or
                (action.changedDate && !Utils_Date.equals(action.changedDate, actionSet.getChangedDate())) || // If the action changedDate is different than actionSet changedDate or
                (action.changedBy && action.changedBy !== actionSet.getChangedBy())) { // If the action changedBy is different than actionSet changedBy

                // Creating a new actionSet
                actionSet = createSet();
            }

            // Adding the action to the current actionSet
            actionSet.add(action);

            // Adding the action type to the flags
            actionSet.flags |= 1 << action.type / 2;
        }

        // actionSet is DESCENDING sorted on revision, so we walk 0->max and the revision would be max->0
        // For any code consume getNonComputedFieldValueByRevisionWithDefaultValue, the default value must be the value of revision+1
        // See WorkItemModel class code for more details on how WorkItem.revisions is constructed
        let nextRevInfo: IEditActionResult = { state: undefined, changedByIdentity: undefined, project: undefined, type: undefined };
        for (const action of result) {
            nextRevInfo = action.finalize(workItem, nextRevInfo.state, nextRevInfo.changedByIdentity, nextRevInfo.project, nextRevInfo.type);
        }

        return result;
    }

    public getWorkItem(): WorkItem {
        return this._workItem;
    }

    public getActions(): EditActionSet[] {
        return this.actionSets;
    }

    public getMessageActions(): EditActionSet[] {
        let messageActionSets: EditActionSet[];

        if (!this.messageActionSets) {
            messageActionSets = [];
            for (const actionSet of this.actionSets) {
                if (actionSet && actionSet.message) {
                    messageActionSets.push(actionSet);
                }
            }

            this.messageActionSets = messageActionSets;
        }

        return this.messageActionSets;
    }

    public getNonEmptyActions() {
        const populatedActionSets: EditActionSet[] = [];

        for (const actionSet of this.actionSets) {
            if (actionSet && !actionSet.isEmpty(this._workItem)) {
                populatedActionSets.push(actionSet);
            }
        }

        return populatedActionSets;
    }

    public findMessageActionSetByRev(rev: number): EditActionSet {
        const messageActions = this.getMessageActions();

        for (const a of messageActions) {
            if (rev === a.getRev()) {
                return a;
            }
        }

        return null;
    }

    private static _editActionFromFieldId(fieldId: number): EditActionType {
        switch (fieldId) {
            case WITConstants.DalFields.AttachedFiles:
                return EditActionType.AddAttachment;
            case WITConstants.DalFields.LinkedFiles:
                return EditActionType.AddHyperLink;
            case WITConstants.DalFields.BISURI:
                return EditActionType.AddExternalLink;
            case WITConstants.DalFields.RelatedLinks:
                return EditActionType.AddWorkItemLink;
        }

        throw new Error(Utils_String.format("Unexpected link action (FieldId: {0}).", fieldId));
    }

    private static onResetHistory(workItem: WorkItem, args: any) {
        workItem.relatedData[WorkItemHistory.HISTORY_KEY] = null;
        workItem.relatedData[WorkItemHistory.DEFERRED_HISTORY_KEY] = null;
    }
}
