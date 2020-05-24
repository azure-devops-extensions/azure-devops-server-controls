import Q = require("q");
import * as Service from "VSS/Service"; 
import * as VSS from "VSS/VSS";
import * as Diag from "VSS/Diag";
import { ActionsHub } from "Admin/Scripts/BacklogLevels/Actions/ActionsHub";
import * as Interfaces from "Admin/Scripts/BacklogLevels/Interfaces";
import * as AdminProcessCommon from "Admin/Scripts/TFS.Admin.Process.Common";
import * as ProcessContracts from "TFS/WorkItemTracking/ProcessContracts";
import * as ProcessHttpClient from "TFS/WorkItemTracking/ProcessRestClient";
import { ProgressAnnouncer } from "VSS/Utils/Accessibility";

import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";
import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";
import { BacklogLevelUtils } from "Admin/Scripts/BacklogLevels/BacklogLevelUtils";
import { GetBehaviorsExpand, CustomizationType } from "TFS/WorkItemTracking/ProcessContracts";

export class ActionsCreator {

    private static portfolioBehaviorReferenceName = "System.PortfolioBacklogBehavior";
    private static requirementBehaviorReferenceName = "System.RequirementBacklogBehavior";
    private static taskBehaviorReferenceName = "System.TaskBacklogBehavior";
    private static orderedBehaviorReferenceName = "System.OrderedBehavior";

    private static bugReferenceName = "Microsoft.VSTS.WorkItemTypes.Bug";
    private static taskReferenceName = "Microsoft.VSTS.WorkItemTypes.Task";

    protected _actionsHub: ActionsHub;
    protected _currentProcess: Interfaces.IProcessDescriptor;

    constructor(
        actionsHub: ActionsHub,
        process: Interfaces.IProcessDescriptor) {

        this._actionsHub = actionsHub;
        this._currentProcess = process;
    }

    /**
     * Initialize control
     */
    public initialize() {
        this._fetchHierarchy();
    }

    protected _fetchHierarchy() {
        // Invoke begin fetch backlog hierarchy action
        this._actionsHub.beginFetchHierarchyAction.invoke(null);

        let behaviors: ProcessContracts.ProcessBehavior[] = [];
        let workItemTypes: ProcessContracts.ProcessWorkItemType[] = [];
        let inheritedWorkItemTypes: ProcessContracts.ProcessWorkItemType[] = [];

        // Queue behavior promise
        let behaviorPromise = this._getBehaviors(this._currentProcess.processTypeId).then(
            (results: ProcessContracts.ProcessBehavior[]) => {
                behaviors = results || [];
            });

        // Queue workItemType promises
        let workItemTypesPromise = this._getWorkItemTypes(this._currentProcess.processTypeId).then(
            (result) => {
                workItemTypes.push(...result);
            });

        const allPromises = Q.allSettled<any>([behaviorPromise, workItemTypesPromise]).then(
            (results) => {
                let errors: Error[] = [];
                for (let result of results) {
                    if (result.state !== "fulfilled") {
                        errors.push(result.reason);
                    }
                }
                if (errors.length > 0) {
                    this._actionsHub.showErrorAction.invoke({
                        backlogLevel: null,
                        errors: errors,
                        operation: Interfaces.BacklogLevelOperation.FetchHierarchy
                    });
                }
                else {
                    let hierarchy = this._getBacklogHierarchy(behaviors, workItemTypes, inheritedWorkItemTypes);
                    this._actionsHub.endFetchHierarchyAction.invoke(hierarchy);
                }
                return null;
            });
        ProgressAnnouncer.forPromise(allPromises, {
            announceStartMessage: AdminResources.BacklogLevels_LoadingStart,
            announceEndMessage: AdminResources.BacklogLevels_LoadingEnd,
            announceErrorMessage: AdminResources.BacklogLevels_LoadingError
        });
        return allPromises;
    }

    public showContextMenu(groupType: Interfaces.BacklogLevelGroupType, level: Interfaces.IBacklogLevel, ev: Event) {
        this._actionsHub.showContextMenuAction.invoke({
            groupType: groupType,
            level: level,
            event: ev
        });
    }

    public dismissContextMenu() {
        this._actionsHub.dismissContextMenuAction.invoke(null);
    }

    public launchAddNewBacklogLevelDialog() {
        this._actionsHub.launchAddBacklogLevelDialogAction.invoke(null);
    }

    public launchEditBacklogLevelDialog(groupName: string, backlogLevel: Interfaces.IBacklogLevel) {
        this._actionsHub.launchEditBacklogLevelDialogAction.invoke({ groupName: groupName, backlogLevel: backlogLevel });
    }

    public dialogSetBacklogName(backlogName: string) {
        this._actionsHub.dialogBacklogNameChangedAction.invoke(backlogName);
    }

    public dialogSetBacklogColor(color: string) {
        this._actionsHub.dialogBacklogColorChangedAction.invoke(color);
    }

    public dialogChangeWorkItemTypeSelection(name: string, isSelected: boolean, refName?: string) {
        this._actionsHub.dialogWorkItemTypeSelectionChangedAction.invoke({
            isSelected: isSelected,
            name: name,
            id: refName,
            isClientOnlyWorkItemType: !refName
        });
    }

    public dialogAddNewClientOnlyWorkItemTypeClicked() {
        this._actionsHub.dialogCreateClientOnlyWorkItemTypeClickedAction.invoke(null);
    }

    public dialogSaveClientOnlyWorkItemType(displayName: string, color: string, icon: string) {
        this._actionsHub.dialogSaveClientOnlyWorkItemTypeClickedAction.invoke({ color: color, icon: icon, name: displayName });
    }

    public dialogCancelClientOnlyWorkItemType() {
        this._actionsHub.dialogCancelClientOnlyWorkItemTypeClickedAction.invoke(null);
    }

    public dialogSetDefaultWorkItemType(workItemTypeName: string, workItemTypeReferenceName?: string) {
        this._actionsHub.dialogSetDefaultWorkItemTypeAction.invoke({
            isClientOnlyWorkItemType: !workItemTypeReferenceName,
            name: workItemTypeName,
            referenceName: workItemTypeReferenceName
        });
    }

    public cancelDeleteConfirmationDialog() {
        this._actionsHub.cancelDeleteBacklogLevelDialogAction.invoke(null);
    }

    public cancelEditDialogClicked() {
        this._actionsHub.cancelEditDialogClickedAction.invoke(null);
    }

    public closeMessageDialog() {
        this._actionsHub.closeMessageDialogAction.invoke(null);
    }

    public discardDialogChanges(discardChanges: boolean) {
        this._actionsHub.discardDialogChangesAction.invoke(discardChanges);
    }

    public launchDeleteConfirmationDialog(backlogLevel: Interfaces.IBacklogLevel) {
        this._actionsHub.launchDeleteConfirmationDialogAction.invoke(backlogLevel);
    }

    public dismissPageError() {
        this._actionsHub.hideErrorAction.invoke(null);
    }

    public dismissDialogError() {
        this._actionsHub.hideDialogErrorAction.invoke(null);
    }

    public deleteBacklogLevel(backlogLevel: Interfaces.IBacklogLevel): IPromise<void> {
        this._actionsHub.beginDeleteBacklogLevelAction.invoke(backlogLevel);
        return this._deleteBehavior(backlogLevel.id).then(
            () => {
                this._actionsHub.hideErrorAction.invoke(null);
                this._actionsHub.endbacklogLevelDeletedAction.invoke(backlogLevel);
                return null;
            },
            (error: Error) => {
                this._actionsHub.showErrorAction.invoke({
                    backlogLevel: backlogLevel,
                    errors: [error],
                    operation: Interfaces.BacklogLevelOperation.DeleteBacklogLevel
                });
                this._actionsHub.cancelDeleteBacklogLevelDialogAction.invoke(null);
            }
        );
    }

    public cancelResetConfirmationDialog() {
        this._actionsHub.cancelResetBacklogLevelDialogAction.invoke(null);
    }

    public launchResetConfirmationDialog(backlogLevel: Interfaces.IBacklogLevel) {
        this._actionsHub.launchResetConfirmationDialogAction.invoke(backlogLevel);
    }

    //Reset the customization done in the process for a parent backlog
    public resetBacklogLevel(backlogLevel: Interfaces.IBacklogLevel) {

        //reset is actually a delete of overridden behavior
        this._actionsHub.beginResetBacklogLevelAction.invoke(backlogLevel);

        this._deleteBehavior(backlogLevel.id).then(
            () => {
                this._actionsHub.cancelResetBacklogLevelDialogAction.invoke(null);
                //making this just simple re-fetch all instead of re-calculating the backloglevel and its WITs
                this._fetchHierarchy();
                return null;
            },
            (error: Error) => {
                this._actionsHub.showErrorAction.invoke({
                    backlogLevel: backlogLevel,
                    errors: [error],
                    operation: Interfaces.BacklogLevelOperation.DeleteBacklogLevel
                });
                this._actionsHub.cancelResetBacklogLevelDialogAction.invoke(null);
            }
        );
    }

    public saveBacklogLevel(hierarchy: Interfaces.IBacklogLevelHierarchy, dialogState: Interfaces.IDialogState): IPromise<any> {
        let isError = false;
        let errors = [];
        if (dialogState.mode !== Interfaces.DialogMode.AddEdit) {
            Diag.Debug.fail("Invalid dialog mode.");
            return;
        }

        if (!dialogState.isDirty || dialogState.validationError) {
            Diag.Debug.fail("Dialog should be dirty and valid.");
            return;
        }

        let backlogLevel = dialogState.backlogLevel;
        this._actionsHub.beginBacklogLevelSaveAction.invoke(dialogState);

        //Save the Behavior
        let createOrUpdateBehavior = () => {
            if (!dialogState.backlogLevel) {
                return this._createBehavior(dialogState.name, dialogState.color);
            }
            if (Utils_String.equals(backlogLevel.name, dialogState.name, false) &&
                Utils_String.equals(backlogLevel.color, dialogState.color, true)) {
                let bl = dialogState.backlogLevel;
                return Q({ id: bl.id, name: bl.name, color: bl.color });
            }
            else {
                return this._updateBehavior(backlogLevel.id, dialogState.name, dialogState.color)
                    .then((behavior) => {
                        return { id: behavior.referenceName, name: behavior.name, color: behavior.color }
                    });
            }
        }

        let createWorkItemTypes = () => {
            //In parallel queue up requests to create new Work Item Types
            return dialogState.newWorkItemTypes
                .filter((wit) => !wit.id) //exclude the client only wits that already have ref name
                .map((value) => {
                    return this._createWorkItemType(value.name, value.color, value.icon)
                        .then((createdWit) => {
                            value.id = createdWit.referenceName;
                            return createdWit;
                        });
                });
        }

        return Q.allSettled<any>([createOrUpdateBehavior(), ...createWorkItemTypes()])
            .then((results) => {

                let behaviorResult = results.shift() as Q.PromiseState<ProcessContracts.ProcessBehavior>;
                let createWitsResults = results as Q.PromiseState<ProcessContracts.ProcessWorkItemType>[];
                backlogLevel = dialogState.backlogLevel;

                let errors: Error[] = [];
                if (behaviorResult.state !== "fulfilled") {
                    errors.push(behaviorResult.reason);
                }

                errors.push(...createWitsResults.filter((result) => result.state !== "fulfilled").map((result) => result.reason));

                if (errors.length === 0) {
                    return this._processWorkItemTypeAssociationUpdates(hierarchy, backlogLevel, dialogState).then((witErrors) => {
                        errors.push(...witErrors);
                        this._actionsHub.endBacklogLevelSaveAction.invoke({
                            id: backlogLevel.id,
                            errors: errors
                        });
                        if (errors.length === 0) {
                            this._actionsHub.hideErrorAction.invoke(null);
                            this._actionsHub.hideBacklogLevelDialogAction.invoke(null);
                        }
                        return backlogLevel;
                    });
                }
                this._actionsHub.endBacklogLevelSaveAction.invoke({
                    id: backlogLevel ? backlogLevel.id : "",
                    errors: errors
                });
                return Q.reject(errors[0]);
            });
    }

    public workItemTypeCreated(workItemType: ProcessContracts.ProcessWorkItemType) {
        this._actionsHub.workItemTypeCreatedAction.invoke(this._getWorkItemTypeInfo(workItemType, /*isDefault*/ false, []));
    }

    public behaviorCreated(behavior: ProcessContracts.ProcessBehavior) {
        this._actionsHub.backlogLevelCreatedAction.invoke(
            {
                id: behavior.referenceName,
                name: behavior.name,
                color: behavior.color,
                type: Interfaces.BacklogLevelType.Portfolio,
                isCustom: true,
                workItemTypes: [],
                fields: behavior.fields.map((field) => { return { id: field.referenceName, name: field.name } })
            }
        );
    }

    public behaviorUpdated(behavior: ProcessContracts.ProcessBehavior) {
        this._actionsHub.backlogLevelUpdatedAction.invoke(
            {
                id: behavior.referenceName,
                name: behavior.name,
                color: behavior.color
            }
        );
    }

    public associateWorkItemType(behaviorId: string, witRefName: string) {
        this._actionsHub.workItemTypeAssociatedAction.invoke({
            backlogId: behaviorId,
            workItemTypeReferenceName: witRefName
        });
    }

    public unassociateWorkItemType(behaviorId: string, witRefName: string) {
        this._actionsHub.workItemTypeDeAssociatedAction.invoke({
            backlogId: behaviorId,
            workItemTypeReferenceName: witRefName
        });
    }

    public setDefaultWorkItemType(behaviorId: string, witRefName: string) {
        this._actionsHub.defaultWorkItemTypeChangedAction.invoke({
            backlogId: behaviorId,
            workItemTypeReferenceName: witRefName
        });
    }

    /**
     * Edit a backlog level (Update name, color or associated workItemTypes)
     * @param backlogLevel
     * @param dialogState
     */
    private _processWorkItemTypeAssociationUpdates(hierarchy: Interfaces.IBacklogLevelHierarchy,
        backlogLevel: Interfaces.IBacklogLevel,
        dialogState: Interfaces.IDialogState): IPromise<Error[]> {

        let associatedWorkItemTypes = dialogState.workItemTypes.filter((wit) => wit.isSelected).map((wit) => wit.id);
        associatedWorkItemTypes.push(...dialogState.newWorkItemTypes.filter((wit) => wit.isSelected && wit.id).map((wit) => wit.id));

        let originalDefaultWit = Utils_Array.first(backlogLevel.workItemTypes, (wit) => wit.isDefault);
        let dialogDefaultWit = Utils_Array.first(dialogState.workItemTypes, (wit) => wit.isDefault);
        let defaultWorkItemTypeRefName = Utils_String.empty;
        if (dialogDefaultWit) {
            defaultWorkItemTypeRefName = dialogDefaultWit.id;
        }
        else if (dialogState.newWorkItemTypes && dialogState.newWorkItemTypes.length > 0) {
            let wit = Utils_Array.first(dialogState.newWorkItemTypes, (wit) => wit.isDefault);
            defaultWorkItemTypeRefName = wit ? wit.id : Utils_String.empty;
        }

        let behaviorId = backlogLevel.id;
        let existingWits = backlogLevel.workItemTypes.map((wit) => wit.id);
        let witsToRemove = Utils_Array.subtract(existingWits, associatedWorkItemTypes, Utils_String.ignoreCaseComparer);
        let witsToAdd = Utils_Array.subtract(associatedWorkItemTypes, existingWits, Utils_String.ignoreCaseComparer);

        let removalPromises = [];
        let defaultProcessedByAdd = false; //newely added wit ref is default and already handled
        let oldDefaultProcessedByRemove = false; //previous default WIT reference was removed

        for (let refName of witsToRemove) {
            let wasDefault = originalDefaultWit && Utils_String.equals(refName, originalDefaultWit.id, true);
            let isDefault = Utils_String.equals(refName, defaultWorkItemTypeRefName, true);
            Diag.Debug.assert(!isDefault, "Default wit can not be removed.");
            oldDefaultProcessedByRemove = oldDefaultProcessedByRemove || wasDefault;
            removalPromises.push(this._removeBehaviorFromWorkItemType(behaviorId, refName));
        }

        //The removals should go first otherwise the adds might fail due to conflict
        return Q.allSettled(removalPromises).then((removals) => {
            var failedRemovals = removals.filter((removal) => removal.state !== "fulfilled");
            //If there are any failures return the errors
            if (failedRemovals.length !== 0) {
                return failedRemovals.map((removal) => removal.reason);
            }

            let addPromises = [];
            for (let refName of witsToAdd) {
                let isDefault = Utils_String.equals(refName, defaultWorkItemTypeRefName, true);
                defaultProcessedByAdd = defaultProcessedByAdd || isDefault;
                addPromises.push(this._addBehaviorToWorkItemType(behaviorId, refName, isDefault));
            }

            //Check if just the default wit is switched
            //It is also possible that a newly created work item type was supposed to be default but creating that wit failed
            if (defaultWorkItemTypeRefName
                && (!originalDefaultWit || !Utils_String.equals(defaultWorkItemTypeRefName, originalDefaultWit.id, true))
                && associatedWorkItemTypes.some((refName) => Utils_String.equals(refName, defaultWorkItemTypeRefName, true))) {

                //existing WIT is marked has default and it is custom WIT 
                if (dialogDefaultWit && dialogDefaultWit.isCustom && !defaultProcessedByAdd) {
                    addPromises.push(this._updateWorkItemTypeDefault(backlogLevel.id, defaultWorkItemTypeRefName, true, defaultWorkItemTypeRefName));
                }
                //exisitng WIT is marked default but it is inherited, so in this scope just un-set the original WIT if it is custom
                else if (originalDefaultWit && originalDefaultWit.isCustom) {
                    //unset the old custom wit default
                    if (!oldDefaultProcessedByRemove) {
                        addPromises.push(this._updateWorkItemTypeDefault(backlogLevel.id, originalDefaultWit.id, false, defaultWorkItemTypeRefName));
                    }
                    //default is unset because of reference removal, fix the store
                    else {
                        this.setDefaultWorkItemType(behaviorId, defaultWorkItemTypeRefName);
                    }
                }
            }

            return Q.allSettled(addPromises).then((additions) => {
                var failedAdds = additions.filter((removal) => removal.state !== "fulfilled");
                //If there are any failures return the errors
                if (failedAdds.length !== 0) {
                    return failedAdds.map((removal) => removal.reason);
                }
                return [];
            });
        });
    }

    /** Private methods */
    private _isCutomWit(workItemType: ProcessContracts.ProcessWorkItemType,
        inheritedWorkItemTypes: ProcessContracts.ProcessWorkItemType[]) {
        return this._currentProcess.isInherited
            && !workItemType.inherits
            && !inheritedWorkItemTypes.some((wit) => Utils_String.equals(wit.referenceName, workItemType.referenceName));
    }

    private _isBugWit(workItemType: ProcessContracts.ProcessWorkItemType) {
        return Utils_String.equals(ActionsCreator.bugReferenceName, workItemType.referenceName, true) || Utils_String.equals(ActionsCreator.bugReferenceName, workItemType.inherits, true);
    }

    private _isTaskWit(workItemType: ProcessContracts.ProcessWorkItemType) {
        return Utils_String.equals(ActionsCreator.taskReferenceName, workItemType.referenceName, true) || Utils_String.equals(ActionsCreator.taskReferenceName, workItemType.inherits, true);
    }

    private _getWorkItemTypeInfo(workItemType: ProcessContracts.ProcessWorkItemType, isDefault: boolean, inheritedWorkItemTypes: ProcessContracts.ProcessWorkItemType[]) {
        return <Interfaces.IWorkItemType>{
            processId: this._currentProcess.processTypeId,
            id: workItemType.referenceName,
            name: workItemType.name,
            customization: workItemType.customization,
            color: workItemType.color,
            icon: workItemType.icon,
            description: workItemType.description,
            inherits: workItemType.inherits,
            isDefault: isDefault || false,
            isDisabled: workItemType.isDisabled,
            isCustom: workItemType.customization == ProcessContracts.CustomizationType.Custom,
            isBug: this._isBugWit(workItemType),
            isTask: this._isTaskWit(workItemType)
        };
    }

    //Public for unit testing
    public _getBacklogHierarchy(
        behaviors: ProcessContracts.ProcessBehavior[],
        workItemTypes: ProcessContracts.ProcessWorkItemType[],
        inheritedWorkItemTypes: ProcessContracts.ProcessWorkItemType[]): Interfaces.IBacklogLevelHierarchy {

        //Checks if this is a custom wit
        let workItemTypesInProcess: ProcessContracts.ProcessWorkItemType[] = [];
        workItemTypesInProcess.push(...workItemTypes);

        let nonOverriddenInheritedTypes = inheritedWorkItemTypes
            .filter((inheritedType) => !Utils_Array.first(workItemTypes, (wit) => Utils_String.equals(wit.inherits, inheritedType.referenceName, true)));
        workItemTypesInProcess.push(...nonOverriddenInheritedTypes);

        let unmappedWorkItemTypes: Interfaces.IWorkItemType[] = [];
        let witsByBehavior: IDictionaryStringTo<Interfaces.IWorkItemType[]> = {};
        let fieldMap: IDictionaryStringTo<string> = {};
        let defaultFieldNames: string[] = [];
        for (let behavior of behaviors) {
            for (let field of behavior.fields) {
                fieldMap[field.referenceName.toLowerCase()] = field.name;
                if (Utils_String.equals(behavior.referenceName, ActionsCreator.portfolioBehaviorReferenceName, true)) {
                    defaultFieldNames.push(field.name);
                }
            }
        }

        let defaultWITByBehavior: IDictionaryStringTo<string> = this._getDefaultWitByBehavior(workItemTypes, inheritedWorkItemTypes);

        for (let workitemtype of workItemTypesInProcess) {
            let behaviors = workitemtype.behaviors;

            let isDefault = false;
            let behaviorId: string = null;
            if ($.isArray(behaviors) && behaviors.length === 1) {
                behaviorId = behaviors[0].behavior.id;
                let defaultWitId = defaultWITByBehavior[behaviorId.toLowerCase()];
                isDefault = Utils_String.equals(defaultWitId, workitemtype.referenceName, true);
            }

            let witInfo = this._getWorkItemTypeInfo(workitemtype, isDefault, inheritedWorkItemTypes)
            if (behaviorId) {
                if (!witsByBehavior[behaviorId.toLowerCase()]) {
                    witsByBehavior[behaviorId.toLowerCase()] = [];
                }
                witsByBehavior[behaviorId.toLowerCase()].push(witInfo);

            }
            else {
                unmappedWorkItemTypes.push(witInfo);
            }
        }

        unmappedWorkItemTypes = unmappedWorkItemTypes.filter((wit) => !this._isExcluded(wit));

        behaviors.sort((a, b) => b.rank - a.rank);

        let portfolioBehaviors = behaviors
            .filter(x => x.inherits && Utils_String.equals(x.inherits.behaviorRefName, ActionsCreator.portfolioBehaviorReferenceName, true));

        let requirementBehaviors = behaviors
            .filter(x => Utils_String.equals(x.referenceName, ActionsCreator.requirementBehaviorReferenceName, true));

        let iterationBehaviors = behaviors
            .filter(x => Utils_String.equals(x.referenceName, ActionsCreator.taskBehaviorReferenceName, true));

        let portfolioGroup: Interfaces.IBacklogLevelGroup = {
            name: AdminResources.BacklogLevels_PortfolioBacklogs_Title,
            description: AdminResources.BacklogLevels_PortfolioBacklogs_Description,
            type: Interfaces.BacklogLevelGroupType.Portfolio,
            addBacklogLevelPermission: BacklogLevelUtils.getAddBacklogLevelPermission(
                this._currentProcess.canEdit,
                this._currentProcess.isInherited,
                portfolioBehaviors.length),
            backlogLevels: portfolioBehaviors.map((b, index) => {
                return {
                    id: b.referenceName,
                    name: b.name,
                    color: b.color,
                    type: Interfaces.BacklogLevelType.Portfolio,
                    workItemTypes: (witsByBehavior[b.referenceName.toLowerCase()] || []).sort((a, b) => Utils_String.ignoreCaseComparer(a.name, b.name)),
                    isCustom: b.customization === CustomizationType.Custom,
                    fields: b.fields.map((field) => { return { id: field.referenceName, name: field.name } })
                };
            })
        };

        let requirementGroup: Interfaces.IBacklogLevelGroup = {
            name: AdminResources.BacklogLevels_RequirementBacklog_Title,
            description: AdminResources.BacklogLevels_RequirementBacklog_Description,
            type: Interfaces.BacklogLevelGroupType.Requirements,
            addBacklogLevelPermission: { value: false, reason: null },
            backlogLevels: requirementBehaviors.map(b => {
                return {
                    id: b.referenceName,
                    name: b.name,
                    color: b.color,
                    type: Interfaces.BacklogLevelType.Requirements,
                    workItemTypes: (witsByBehavior[b.referenceName.toLowerCase()] || []).sort((a, b) => Utils_String.ignoreCaseComparer(a.name, b.name)),
                    isCustom: b.customization === CustomizationType.Custom,
                    fields: b.fields.map((field) => { return { id: field.referenceName, name: field.name } })
                };
            })
        };

        let iterationGroup: Interfaces.IBacklogLevelGroup = {
            name: AdminResources.BacklogLevels_IterationBacklog_Title,
            description: AdminResources.BacklogLevels_IterationBacklog_Description,
            type: Interfaces.BacklogLevelGroupType.Tasks,
            addBacklogLevelPermission: { value: false, reason: null },
            backlogLevels: iterationBehaviors.map(b => {
                return {
                    id: b.referenceName,
                    name: b.name,
                    color: null,
                    type: Interfaces.BacklogLevelType.Tasks,
                    workItemTypes: (witsByBehavior[b.referenceName.toLowerCase()] || []).sort((a, b) => Utils_String.ignoreCaseComparer(a.name, b.name)),
                    isCustom: b.customization === CustomizationType.Custom,
                    fields: b.fields.map((field) => { return { id: field.referenceName, name: field.name } })
                };
            })
        };

        let unmappedGroup: Interfaces.IBacklogLevelGroup = {
            name: AdminResources.BacklogLevels_OtherWorkItemTypes_Title,
            description: AdminResources.BacklogLevels_OtherWorkItemTypes_Description,
            type: Interfaces.BacklogLevelGroupType.Unmapped,
            addBacklogLevelPermission: { value: false, reason: null },
            backlogLevels: []
        };


        if (unmappedWorkItemTypes.some((wit) => wit.isBug || wit.isTask)) {
            unmappedGroup.backlogLevels.push({
                id: null,
                name: AdminResources.BacklogBug_Title,
                color: null,
                type: Interfaces.BacklogLevelType.Unmapped,
                workItemTypes: unmappedWorkItemTypes.filter((wit) => wit.isBug || wit.isTask).sort((a, b) => Utils_String.ignoreCaseComparer(a.name, b.name)),
                isCustom: false,
                fields: []
            });
        }

        if (unmappedWorkItemTypes.some((wit) => !wit.isBug && !wit.isTask)) {
            unmappedGroup.backlogLevels.push({
                id: null,
                name: AdminResources.BacklogLevels_UnmappedWorkItemTypes_Level_Title,
                color: null,
                type: Interfaces.BacklogLevelType.Unmapped,
                workItemTypes: unmappedWorkItemTypes.filter((wit) => !wit.isBug && !wit.isTask).sort((a, b) => Utils_String.ignoreCaseComparer(a.name, b.name)),
                isCustom: false,
                fields: []
            });
        }

        return {
            groups: [portfolioGroup, requirementGroup, iterationGroup, unmappedGroup],
            unmappedWorkItemTypes: unmappedWorkItemTypes,
            fieldsMap: fieldMap,
            defaultFieldNames: defaultFieldNames.sort((f, f1) => Utils_String.ignoreCaseComparer(f, f1))
        };
    }

    public _getDefaultWitByBehavior(workItemTypes: ProcessContracts.ProcessWorkItemType[],
        inheritedWorkItemTypes: ProcessContracts.ProcessWorkItemType[]): IDictionaryStringTo<string> {

        //Then process overridden inherited types
        let overriddenInheritedTypes = workItemTypes
            .filter((wit) => Utils_Array.first(inheritedWorkItemTypes, (inheritedWit) => Utils_String.equals(wit.inherits, inheritedWit.referenceName, true)));

        //Custom work item types
        let customWorkItemTypes = workItemTypes
            .filter((wit) => !this._currentProcess.isInherited || this._isCutomWit(wit, inheritedWorkItemTypes));

        let defaultWITByBehavior: IDictionaryStringTo<string> = {};

        let updateDefaults = (wits: ProcessContracts.ProcessWorkItemType[]) => {
            for (let wit of wits) {
                let behaviors = wit.behaviors;
                let isDefault = false;
                let behaviorId: string = null;

                if ($.isArray(behaviors) && behaviors.length === 1) {
                    behaviorId = behaviors[0].behavior.id;
                    isDefault = behaviors[0].isDefault;
                }
                if (isDefault) {
                    defaultWITByBehavior[behaviorId.toLowerCase()] = wit.referenceName;
                }
            }
        };

        updateDefaults(inheritedWorkItemTypes);
        updateDefaults(overriddenInheritedTypes);
        updateDefaults(customWorkItemTypes);
        return defaultWITByBehavior;
    }

    private _isExcluded(workItemType: Interfaces.IWorkItemType): boolean {
        let excluded = AdminProcessCommon.ProcessBlockingResource.WorkItemTypesBlockedFromCustomization;
        excluded.push(...AdminProcessCommon.ProcessBlockingResource.WorkItemTypesBlockedFromDisabling);
        return excluded.some((id) => Utils_String.equals(id, workItemType.id, true));
    }

    private _createBehavior(name: string, color: string): IPromise<ProcessContracts.ProcessBehavior> {
        let behavior: ProcessContracts.ProcessBehaviorCreateRequest = {
            inherits: ActionsCreator.portfolioBehaviorReferenceName,
            name: name,
            color: color,
            referenceName: null
        };
        
        return Service.getClient(ProcessHttpClient.WorkItemTrackingProcessHttpClient5).createProcessBehavior(behavior, this._currentProcess.processTypeId)
            .then((behavior: ProcessContracts.ProcessBehavior) => {
                this.behaviorCreated(behavior);
                return behavior;
            });
    }

    private _addBehaviorToWorkItemType(behaviorId: string, workItemTypeRefName: string, isDefault: boolean): IPromise<ProcessContracts.WorkItemTypeBehavior> {
        return Service.getClient(ProcessHttpClient.WorkItemTrackingProcessHttpClient5).addBehaviorToWorkItemType(<ProcessContracts.WorkItemTypeBehavior>{
            behavior: {
                id: behaviorId
            },
            isDefault: !!isDefault
        }, this._currentProcess.processTypeId, workItemTypeRefName)
            .then((updatedBehavior) => {
                this.associateWorkItemType(behaviorId, workItemTypeRefName);

                if (isDefault) {
                    this.setDefaultWorkItemType(behaviorId, workItemTypeRefName);
                }

                return null;
            });
    }

    private _updateWorkItemTypeDefault(behaviorId: string, workItemTypeRefName: string, isDefault: boolean, defaultWitRefName: string): IPromise<ProcessContracts.WorkItemTypeBehavior> {
        return Service.getClient(ProcessHttpClient.WorkItemTrackingProcessHttpClient5)
            .updateBehaviorToWorkItemType(<ProcessContracts.WorkItemTypeBehavior>{
                behavior: {
                    id: behaviorId
                },
                isDefault: isDefault
            },
            this._currentProcess.processTypeId, workItemTypeRefName)
            .then((updatedBehavior) => {
                this.setDefaultWorkItemType(behaviorId, defaultWitRefName);
                return updatedBehavior;
            });
    }

    private _createWorkItemType(name: string, color: string, icon: string): IPromise<ProcessContracts.ProcessWorkItemType> {
        const workItemType: ProcessContracts.CreateProcessWorkItemTypeRequest = {
            description: null,
            inheritsFrom: null,
            name: name,
            color: color,
            icon: icon,
            isDisabled: false
        }

        return Service.getClient(ProcessHttpClient.WorkItemTrackingProcessHttpClient5)
            .createProcessWorkItemType(workItemType, this._currentProcess.processTypeId)
            .then((wit) => {
                this.workItemTypeCreated(wit);
                return wit;
            });
    }

    private _removeBehaviorFromWorkItemType(behaviorId: string, workItemTypeRefName: string): IPromise<void> {
        return Service.getClient(ProcessHttpClient.WorkItemTrackingProcessHttpClient5)
            .removeBehaviorFromWorkItemType(this._currentProcess.processTypeId, workItemTypeRefName, behaviorId)
            .then(() => {
                this.unassociateWorkItemType(behaviorId, workItemTypeRefName);
                return null;
            });
    }

    private _updateBehavior(behaviorId: string, name: string, color: string): IPromise<ProcessContracts.ProcessBehavior> {
        let behavior: ProcessContracts.ProcessBehaviorCreateRequest = {
            inherits: ActionsCreator.portfolioBehaviorReferenceName,
            name: name,
            color: color,
            referenceName: null
        };

        return Service.getClient(ProcessHttpClient.WorkItemTrackingProcessHttpClient5).updateProcessBehavior(behavior, this._currentProcess.processTypeId, behaviorId)
            .then((behavior) => {
                this.behaviorUpdated(behavior);
                return behavior;
            });
    }

    private _deleteBehavior(behaviorId: string): IPromise<void> {
        return Service.getClient(ProcessHttpClient.WorkItemTrackingProcessHttpClient5).deleteProcessBehavior(this._currentProcess.processTypeId, behaviorId);
    }

    private _getBehaviors(processId: string): IPromise<ProcessContracts.ProcessBehavior[]> 
    {
        return Service.getClient(ProcessHttpClient.WorkItemTrackingProcessHttpClient5).getProcessBehaviors(processId, GetBehaviorsExpand.CombinedFields).then(
            (behaviors: ProcessContracts.ProcessBehavior[]) => {
                return behaviors;
            },
            (error: Error) => {
                VSS.handleError(error);
            }
        );
    }

    private _getWorkItemTypes(processId: string): IPromise<ProcessContracts.ProcessWorkItemType[]> {
        return Service.getClient(ProcessHttpClient.WorkItemTrackingProcessHttpClient5).getProcessWorkItemTypes(processId, ProcessContracts.GetWorkItemTypeExpand.Behaviors).then(
            (workItemTypes: ProcessContracts.ProcessWorkItemType[]) => {
                return workItemTypes;
            },
            (error: Error) => {
                VSS.handleError(error);
            }
        );
    }
}