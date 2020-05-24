import * as VSSStore from "VSS/Flux/Store";

import { ActionsHub } from "Admin/Scripts/BacklogLevels/Actions/ActionsHub";
import * as Interfaces from "Admin/Scripts/BacklogLevels/Interfaces";
import { BacklogLevelUtils } from "Admin/Scripts/BacklogLevels/BacklogLevelUtils";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";
import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";
import { WorkItemTypeColorAndIcons } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";

export class Store extends VSSStore.Store {

    private _actionHub: ActionsHub;

    private _currentState: Interfaces.IBacklogLevelsComponentState;

    public static DEFAULT_COLOR = WorkItemTypeColorAndIcons.DEFAULT_WORKITEMTYPE_COLOR_HEX;

    constructor(
        actionHub: ActionsHub,
        currentProcess: Interfaces.IProcessDescriptor) {
        super();
        this._actionHub = actionHub;

        this._currentState = {
            processId: currentProcess.processTypeId,
            canEdit: currentProcess.canEdit,
            isInherited: currentProcess.isInherited,
            hierarchy: null,
            dialogState: null,
            error: null,
            isLoading: false,
        };

        // Attach listeners
        this._actionHub.beginFetchHierarchyAction.addListener(() => {
            this._currentState.isLoading = true;
            this.emitChanged();
        });

        this._actionHub.endFetchHierarchyAction.addListener((payload) => {
            this._currentState.hierarchy = payload;
            this._currentState.isLoading = false;
            this.emitChanged();
        });

        //Launch Add Dialog
        this._actionHub.launchAddBacklogLevelDialogAction.addListener(this._handleLaunchAddBacklogLevelDialogAction.bind(this));

        //Launch edit dialog
        this._actionHub.launchEditBacklogLevelDialogAction.addListener(this._handleLaunchEditBacklogLevelDialogAction.bind(this));

        //Backlog name changed
        this._actionHub.dialogBacklogNameChangedAction.addListener((name) => {
            this._currentState.dialogState.name = name;
            this._currentState.dialogState.validationError = this._getValidationError();
            this._currentState.dialogState.isDirty = this._isDialogStateDirty();
            this.emitChanged();
        });

        //Backlog color changed
        this._actionHub.dialogBacklogColorChangedAction.addListener((color) => {
            this._currentState.dialogState.color = color;
            this._currentState.dialogState.validationError = this._getValidationError();
            this._currentState.dialogState.isDirty = this._isDialogStateDirty();
            this.emitChanged();
        });

        //User click on New Work Item Type in the dialog
        this._actionHub.dialogCreateClientOnlyWorkItemTypeClickedAction.addListener(() => {
            const color = this._currentState.dialogState.color || WorkItemTypeColorAndIcons.DEFAULT_WORKITEMTYPE_COLOR_HEX;
            const icon = this._currentState.dialogState.icon || WorkItemTypeColorAndIcons.DEFAULT_WORKITEMTYPE_ICON;
            this._currentState.dialogState.userAddedWorkItemType = { name: null, color: color, icon: icon };
            this._currentState.dialogState.validationError = this._getValidationError();
            this._currentState.dialogState.isDirty = this._isDialogStateDirty();
            this.emitChanged();
        });

        //Save client only wit
        this._actionHub.dialogSaveClientOnlyWorkItemTypeClickedAction.addListener(this._handleSaveClientOnlyWorkItemTypeClickedAction.bind(this));

        //Discard changes to client only wit
        this._actionHub.dialogCancelClientOnlyWorkItemTypeClickedAction.addListener(() => {
            this._currentState.dialogState.userAddedWorkItemType = null;
            this._currentState.dialogState.validationError = this._getValidationError();
            this._currentState.dialogState.isDirty = this._isDialogStateDirty();
            this.emitChanged();
        });

        //Set default work item type        
        this._actionHub.dialogSetDefaultWorkItemTypeAction.addListener(this._handleDialogSetDefaultWorkItemTypeAction.bind(this));

        //Hide backlog edit dialog
        this._actionHub.hideBacklogLevelDialogAction.addListener(() => {
            this._currentState.dialogState = null;
            this.emitChanged();
        });

        //Cancel backlog edit dialog
        this._actionHub.cancelEditDialogClickedAction.addListener(this._handleCancelBacklogLevelDialogAction.bind(this));
        //Discard backlog level changes

        this._actionHub.discardDialogChangesAction.addListener((discardChanges: boolean) => {
            this._currentState.dialogState.showCancelConfirmation = false;
            if (discardChanges) {
                this._currentState.dialogState = null;
            }
            this.emitChanged();
        });

        this._actionHub.beginBacklogLevelSaveAction.addListener((backlogLevel) => { this._currentState.dialogState.isLoading = true; this.emitChanged(); });
        this._actionHub.endBacklogLevelSaveAction.addListener(this._handleEndBacklogLevelSaveAction.bind(this));

        //Show delete backlog level confirmation dialog
        this._actionHub.launchDeleteConfirmationDialogAction.addListener((backlogLevel: Interfaces.IBacklogLevel) => {
            var portfolioGroup = BacklogLevelUtils.getPortfolioGroup(this._currentState.hierarchy);
            if (!this._currentState.canEdit) {
                this._currentState.messageDialog = {
                    title: AdminResources.BacklogLevels_Deletebacklog_DialogTitle,
                    message: AdminResources.BacklogLevelDialog_NoDeletePermissionForBacklogLevelsMessage
                };
            }
            else if (!backlogLevel.isCustom) {
                this._currentState.messageDialog = {
                    title: AdminResources.BacklogLevels_Deletebacklog_DialogTitle,
                    message: AdminResources.BacklogLevelDialog_CantDeleteInheritedBacklogLevelsMessage
                };
            }
            else if (!Utils_String.equals(backlogLevel.id, portfolioGroup.backlogLevels[0].id, true)) {
                this._currentState.messageDialog = {
                    title: AdminResources.BacklogLevels_Deletebacklog_DialogTitle,
                    message: AdminResources.BacklogLevelDialog_DeleteNonTopBacklogLevelMessage
                };
            }
            else {
                this._currentState.dialogState = <Interfaces.IDialogState>{
                    backlogLevel: backlogLevel,
                    mode: Interfaces.DialogMode.Delete
                };
            }

            this.emitChanged();
        });

        //Show reset backlog level confirmation dialog
        this._actionHub.launchResetConfirmationDialogAction.addListener((backlogLevel: Interfaces.IBacklogLevel) => {

            if (!this._currentState.canEdit) {
                this._currentState.messageDialog = {
                    title: AdminResources.BacklogLevels_Resetbacklog_DialogTitle,
                    message: AdminResources.BacklogLevelDialog_NoResetPermissionForBacklogLevelsMessage
                };
            }
            else if (backlogLevel.isCustom) {
                this._currentState.messageDialog = {
                    title: AdminResources.BacklogLevels_Resetbacklog_DialogTitle,
                    message: AdminResources.BacklogLevelDialog_CantResetCustomBacklogLevelsMessage
                };
            }
            else {
                this._currentState.dialogState = <Interfaces.IDialogState>{
                    backlogLevel: backlogLevel,
                    mode: Interfaces.DialogMode.Reset
                };
            }

            this.emitChanged();
        });

        this._actionHub.cancelDeleteBacklogLevelDialogAction.addListener(() => { this._currentState.dialogState = null; this.emitChanged(); });
        this._actionHub.beginDeleteBacklogLevelAction.addListener((backlogLevel) => { this._currentState.isLoading = true; this.emitChanged(); });
        this._actionHub.closeMessageDialogAction.addListener(() => { this._currentState.messageDialog = null; this.emitChanged(); });

        //Backlog level deleted
        this._actionHub.endbacklogLevelDeletedAction.addListener((level: Interfaces.IBacklogLevel) => {
            // Only portfolios can be removed
            var portfolioGroup = BacklogLevelUtils.getPortfolioGroup(this._currentState.hierarchy);
            portfolioGroup.backlogLevels = portfolioGroup.backlogLevels.filter(b => !Utils_String.equals(b.id, level.id, true));
            portfolioGroup.addBacklogLevelPermission = BacklogLevelUtils.getAddBacklogLevelPermission(
                this._currentState.canEdit,
                this._currentState.isInherited,
                portfolioGroup.backlogLevels.length);

            // Clear the default
            for (var wit of level.workItemTypes) {
                wit.isDefault = false;
            }

            //Move the work item types from the level to unmapped 
            this._currentState.hierarchy.unmappedWorkItemTypes.push(...level.workItemTypes);
            this._currentState.hierarchy.unmappedWorkItemTypes
                .sort((a, b) => Utils_String.defaultComparer(a.name, b.name));
            let unmappedGroup = BacklogLevelUtils.getUnmappedWorkItemsGroup(this._currentState.hierarchy);
            unmappedGroup.backlogLevels[1].workItemTypes = this._currentState.hierarchy.unmappedWorkItemTypes.filter((wit) => !wit.isBug && !wit.isTask).sort((a, b) => Utils_String.ignoreCaseComparer(a.name, b.name));

            this._currentState.dialogState = null;
            this._currentState.isLoading = false;
            this._currentState.error = null;
            this.emitChanged();
        });

        //reset
        this._actionHub.cancelResetBacklogLevelDialogAction.addListener(() => { this._currentState.dialogState = null; this.emitChanged(); });
        this._actionHub.beginResetBacklogLevelAction.addListener((backlogLevel) => { this._currentState.isLoading = true; this.emitChanged(); });
        
        this._actionHub.showErrorAction.addListener((error: Interfaces.IBacklogLevelError) => {
            this._currentState.error = error;
            this._currentState.isLoading = false;
            this.emitChanged();
        });

        this._actionHub.hideErrorAction.addListener(() => {
            this._currentState.error = null;
            this._currentState.isLoading = false;
            this.emitChanged();
        });

        this._actionHub.hideDialogErrorAction.addListener(() => {
            if (this._currentState.dialogState) {
                this._currentState.dialogState.errors = null;
            }
            this.emitChanged();
        });

        this._actionHub.workItemTypeCreatedAction.addListener((wit: Interfaces.IWorkItemType) => {
            //Keep it in unmapped wits
            this._currentState.hierarchy.unmappedWorkItemTypes.push(wit);
            this._currentState.hierarchy.unmappedWorkItemTypes.sort((a, b) => Utils_String.ignoreCaseComparer(a.name, b.name));
            let unmappedGroup = BacklogLevelUtils.getUnmappedWorkItemsGroup(this._currentState.hierarchy);
            unmappedGroup.backlogLevels[1].workItemTypes = this._currentState.hierarchy.unmappedWorkItemTypes.filter((wit) => !wit.isBug && !wit.isTask).sort((a, b) => Utils_String.ignoreCaseComparer(a.name, b.name));
            this.emitChanged();
        });

        this._actionHub.backlogLevelCreatedAction.addListener(this._handleBacklogLevelCreatedAction.bind(this));
        this._actionHub.backlogLevelUpdatedAction.addListener(this._handleBacklogLevelUpdatedAction.bind(this));
        this._actionHub.workItemTypeAssociatedAction.addListener((payload: Interfaces.IWorkItemTypeAssociationPayload) => {
            this._associateWorkItem(payload.backlogId, payload.workItemTypeReferenceName);
        });

        this._actionHub.workItemTypeDeAssociatedAction.addListener((payload: Interfaces.IWorkItemTypeAssociationPayload) => {
            this._deAssociateWorkItem(payload.backlogId, payload.workItemTypeReferenceName);
        });

        this._actionHub.dialogWorkItemTypeSelectionChangedAction.addListener(this._handleSelectionChangedAction.bind(this));

        this._actionHub.defaultWorkItemTypeChangedAction.addListener(this._handleSetDefaultWorkItemTypeAction.bind(this));

        this._actionHub.showContextMenuAction.addListener((payload: Interfaces.IContextMenuData) => {
            var group: Interfaces.IBacklogLevelGroup = Utils_Array.first(this._currentState.hierarchy.groups, (group) => group.type === payload.groupType);
            group.contextMenu = payload;
            this.emitChanged();
        });

        this._actionHub.dismissContextMenuAction.addListener(() => {
            for (var group of this._currentState.hierarchy.groups) {
                group.contextMenu = null;
            }
            this.emitChanged();
        });
    }

    public get state(): Interfaces.IBacklogLevelsComponentState {
        return this._currentState;
    }

    private _associateWorkItem(backlogLevelId: string, witRefName: string) {
        let hierarchy = this._currentState.hierarchy;
        let backlogLevel = BacklogLevelUtils.getBacklogLevel(this._currentState.hierarchy, backlogLevelId);
        if (!backlogLevel.workItemTypes.some((wit) => Utils_String.equals(wit.id, witRefName, true))) {
            let witInfo = BacklogLevelUtils.getWorkItemType(this._currentState.hierarchy, witRefName);
            witInfo.isDefault = false;
            backlogLevel.workItemTypes.push(witInfo);
            backlogLevel.workItemTypes.sort((a, b) => Utils_String.ignoreCaseComparer(a.name, b.name));
        }

        for (let group of hierarchy.groups) {
            for (let level of group.backlogLevels) {
                if (!Utils_String.equals(backlogLevelId, level.id, true)) {
                    level.workItemTypes = this._substractWorkItemsByRefName(level.workItemTypes, [witRefName]);
                }
            }
        }

        hierarchy.unmappedWorkItemTypes = this._substractWorkItemsByRefName(hierarchy.unmappedWorkItemTypes, [witRefName]);
    }

    private _deAssociateWorkItem(backlogLevelId: string, witRefName: string) {
        let hierarchy = this._currentState.hierarchy;
        let witInfo = BacklogLevelUtils.getWorkItemType(hierarchy, witRefName);
        if (!witInfo) {
            return;
        }
        witInfo.isDefault = false;
        hierarchy.unmappedWorkItemTypes.push(witInfo);
        hierarchy.unmappedWorkItemTypes.sort((a, b) => Utils_String.ignoreCaseComparer(a.name, b.name));
        let unmappedGroup = BacklogLevelUtils.getUnmappedWorkItemsGroup(this._currentState.hierarchy);
        unmappedGroup.backlogLevels[1].workItemTypes = hierarchy.unmappedWorkItemTypes.filter((wit) => !wit.isBug && !wit.isTask).sort((a, b) => Utils_String.ignoreCaseComparer(a.name, b.name));

        for (let group of hierarchy.groups) {
            for (let level of group.backlogLevels) {
                if (Utils_String.equals(backlogLevelId, level.id, true)) {
                    if (level.workItemTypes.some((wit) => Utils_String.equals(wit.id, witRefName, true))) {
                        level.workItemTypes = this._substractWorkItemsByRefName(level.workItemTypes, [witRefName]);
                        return;
                    }
                }
            }
        }
    }

    private _handleEndBacklogLevelSaveAction(payload: Interfaces.IEndBacklogLevelSavePayload) {
        this._currentState.isLoading = false;

        const cs = this._currentState.dialogState;
        const ns: Interfaces.IDialogState = {
            backlogLevel: cs.backlogLevel,
            newWorkItemTypes: cs.newWorkItemTypes.filter((wit) => !wit.id),
            color: cs.color,
            errors: payload.errors,
            isLoading: false,
            showCancelConfirmation: false,
            mode: Interfaces.DialogMode.AddEdit,
            name: cs.name,
            userAddedWorkItemType: null,
            validationError: cs.validationError,
            isDirty: cs.isDirty,
            workItemTypes: this._getWorksItemTypesAfterPartialSave(this._currentState.hierarchy, cs.backlogLevel, cs),
            defaultFieldNames: cs.defaultFieldNames,
            groupName: cs.groupName
        };

        this._currentState.dialogState = ns;
        this.emitChanged();
    }

    private _handleSaveClientOnlyWorkItemTypeClickedAction(payload: Interfaces.IUserAddedWorkItemType) {
        let dialogState = this._currentState.dialogState;

        dialogState.userAddedWorkItemType = null;
        if (!this._currentState.dialogState.workItemTypes.some(wit => Utils_String.equals(wit.name, payload.name, true)) &&
            !this._currentState.dialogState.newWorkItemTypes.some(wit => Utils_String.equals(wit.name, payload.name, true))) {

            let clientOnlyWit: Interfaces.IDialogWorkItemType = {
                name: payload.name,
                id: null,
                color: payload.color,
                icon: payload.icon,
                isDefault: false,
                isDisabled: false,
                isSelected: true,
                isCustom: true
            };

            var selectedWits: Interfaces.IDialogWorkItemType[] = dialogState.workItemTypes.concat(dialogState.newWorkItemTypes).filter(wit => wit.isSelected);
            if (selectedWits.length === 0) {
                // There were no selected items, so this new item should become the default
                clientOnlyWit.isDefault = true;
            }

            dialogState.newWorkItemTypes.push(clientOnlyWit);
            dialogState.newWorkItemTypes = dialogState.newWorkItemTypes
                .sort((a, b) => Utils_String.ignoreCaseComparer(a.name, b.name));
        }

        dialogState.isDirty = this._isDialogStateDirty();
        dialogState.validationError = this._getValidationError();
        this.emitChanged();
    }

    private _handleDialogSetDefaultWorkItemTypeAction(payload: Interfaces.ISetDefaultWorkItemTypePayload) {
        let dialogState = this._currentState.dialogState;
        let allWit: Interfaces.IDialogWorkItemType[] = [];
        allWit.push(...dialogState.workItemTypes);
        allWit.push(...dialogState.newWorkItemTypes);

        for (let wit of allWit) {
            if (Utils_String.equals(payload.name, wit.name, true) ||
                (payload.referenceName && Utils_String.equals(payload.referenceName, wit.id, true))) {
                wit.isDefault = true;
                wit.isSelected = true;
            }
            else {
                wit.isDefault = false;
            }
        }

        dialogState.isDirty = this._isDialogStateDirty();
        dialogState.validationError = this._getValidationError();

        //Change is disabled for other wits
        this.emitChanged();
    }

    private _handleSetDefaultWorkItemTypeAction(payload: Interfaces.IWorkItemTypeAssociationPayload) {
        let backlogLevel = BacklogLevelUtils.getBacklogLevel(this._currentState.hierarchy, payload.backlogId);

        for (let wit of backlogLevel.workItemTypes) {
            if (Utils_String.equals(payload.workItemTypeReferenceName, wit.id, true)) {
                wit.isDefault = true;
            }
            else {
                wit.isDefault = false;
            }
        }

        //Change is disabled for other wits
        this.emitChanged();
    }

    private _handleSelectionChangedAction(payload: Interfaces.IWorkItemTypeSelectionChangedPayload) {
        let dialogState = this._currentState.dialogState;
        let allWit: Interfaces.IDialogWorkItemType[] = [];
        allWit.push(...dialogState.workItemTypes);
        allWit.push(...dialogState.newWorkItemTypes);

        var defaultWit: Interfaces.IDialogWorkItemType;
        var selectedWits: Interfaces.IDialogWorkItemType[] = [];
        for (let wit of allWit) {
            if (Utils_String.equals(payload.name, wit.name, true) ||
                (payload.id && Utils_String.equals(payload.id, wit.id, true))) {
                wit.isSelected = payload.isSelected;
                if (!wit.isSelected) {
                    // In case they unselect the default work item type
                    wit.isDefault = false;
                }
            }

            if (wit.isSelected) {
                selectedWits.push(wit);

                if (wit.isDefault) {
                    defaultWit = wit;
                }
            }
        }

        // The default work item type was unselected, so make the first selected one default
        if (selectedWits.length > 0 && !defaultWit) {
            selectedWits[0].isDefault = true;
        }

        dialogState.isDirty = this._isDialogStateDirty();
        dialogState.validationError = this._getValidationError();

        //Change is disabled for other wits
        this.emitChanged();
    }

    private _getValidationError(): string {
        let name = this._currentState.dialogState.name;

        if (BacklogLevelUtils.isNameWhitespace(name)) {
            return AdminResources.BacklogLevelNameIsEmpty;
        }

        if (!BacklogLevelUtils.isNameValid(name)) {
            return AdminResources.InvalidCharInBacklogLevelName;
        }
        return null;
    }

    private _isDialogStateDirty(): boolean {
        let state = this._currentState.dialogState;
        let backlogLevel = state.backlogLevel;

        //If new backlog level
        if (!backlogLevel) {
            return !!state.name ||
                state.color !== Store.DEFAULT_COLOR ||
                state.newWorkItemTypes.length > 0;
        }

        let selectedWorkItemTypes = state.workItemTypes.filter((wit) => wit.isSelected);

        let areWorkItemTypesEqual = Utils_Array.arrayEquals(backlogLevel.workItemTypes, selectedWorkItemTypes,
            (s, t) => {
                return s.color === t.color &&
                    s.id === t.id &&
                    s.name === t.name &&
                    s.isDefault === t.isDefault;
            });

        return state.name !== backlogLevel.name ||
            state.color !== backlogLevel.color ||
            !areWorkItemTypesEqual ||
            state.newWorkItemTypes.length > 0;
    }

    private _substractWorkItemsByRefName(source: Interfaces.IWorkItemType[], workItemRefNames: string[]): Interfaces.IWorkItemType[] {
        return source
            .filter((wit) => !Utils_Array.arrayContains(wit, workItemRefNames,
                (wit1, wit2) => Utils_String.equals(wit1.id, wit2, true)))
            .sort((a, b) => Utils_String.ignoreCaseComparer(a.name, b.name));
    }

    private _substractWorkItems(source: Interfaces.IWorkItemType[], workItems: Interfaces.IWorkItemType[]): Interfaces.IWorkItemType[] {
        return this._substractWorkItemsByRefName(source, workItems.map((wit) => wit.id));
    }

    private _handleBacklogLevelCreatedAction(levelAdded: Interfaces.IBacklogLevel) {
        let hierarchy = this._currentState.hierarchy;
        //fix work item type association
        for (let group of hierarchy.groups) {
            for (let level of group.backlogLevels) {
                level.workItemTypes = this._substractWorkItems(level.workItemTypes, levelAdded.workItemTypes);
            }
        }

        hierarchy.unmappedWorkItemTypes = this._substractWorkItems(hierarchy.unmappedWorkItemTypes, levelAdded.workItemTypes);
        let unmappedGroup = BacklogLevelUtils.getUnmappedWorkItemsGroup(hierarchy);
        unmappedGroup.backlogLevels[1].workItemTypes = hierarchy.unmappedWorkItemTypes.filter((wit) => !wit.isBug && !wit.isTask).sort((a, b) => Utils_String.ignoreCaseComparer(a.name, b.name));

        // Items are always added to portfolios
        var portfolioGroup = BacklogLevelUtils.getPortfolioGroup(this._currentState.hierarchy);
        portfolioGroup.backlogLevels = [levelAdded].concat(...portfolioGroup.backlogLevels);
        portfolioGroup.addBacklogLevelPermission = BacklogLevelUtils.getAddBacklogLevelPermission(
            this._currentState.canEdit,
            this._currentState.isInherited,
            portfolioGroup.backlogLevels.length);

        if (this._currentState.dialogState) {
            this._currentState.dialogState.backlogLevel = levelAdded;
        }

        this.emitChanged();
    }

    private _handleBacklogLevelUpdatedAction(updated: Interfaces.IBehaviorUpdatedPayload) {
        let hierarchy = this._currentState.hierarchy;
        let level = BacklogLevelUtils.getBacklogLevel(hierarchy, updated.id);

        level.color = updated.color;
        level.name = updated.name;
        
        this.emitChanged();
    }

    private _handleLaunchAddBacklogLevelDialogAction() {
        let hierarchy = this._currentState.hierarchy;
        var portfolioGroup = BacklogLevelUtils.getPortfolioGroup(hierarchy);
        if (!this._currentState.canEdit) {
            this._currentState.messageDialog = {
                title: AdminResources.BacklogLevels_AddPortfolioBacklog_DialogTitle,
                message: AdminResources.BacklogLevels_AddNewLevelNoPermissionsMessage
            };
        }
        else if (portfolioGroup.backlogLevels.length >= BacklogLevelUtils.MAX_PORTFOLIO_LEVELS) {
            this._currentState.messageDialog = {
                title: AdminResources.BacklogLevels_AddPortfolioBacklog_DialogTitle,
                message: AdminResources.BacklogLevels_MaxNumberOfLevelsReached
            }
        }
        else {
            this._currentState.dialogState = {
                color: Store.DEFAULT_COLOR,
                backlogLevel: null,
                name: Utils_String.empty,
                newWorkItemTypes: [],
                errors: [],
                isLoading: false,
                showCancelConfirmation: false,
                mode: Interfaces.DialogMode.AddEdit,
                userAddedWorkItemType: null,
                workItemTypes: this._getWorkItemTypesForDialog(),
                validationError: null,
                isDirty: false,
                defaultFieldNames: hierarchy.defaultFieldNames,
                groupName: AdminResources.BacklogLevels_PortfolioBacklogs_Title
            };
        }
        this.emitChanged();
    }

    private _handleCancelBacklogLevelDialogAction() {
        if (this._currentState.dialogState.isDirty) {
            this._currentState.dialogState.showCancelConfirmation = true;
        } else {
            this._currentState.dialogState = null;
        }
        this.emitChanged();
    }

    private _handleLaunchEditBacklogLevelDialogAction(payload: Interfaces.IEditBacklogLevelPayload) {
        if (this._currentState.canEdit) {
            let hierarchy = this._currentState.hierarchy;
            let backlogLevel = payload.backlogLevel;
            this._currentState.dialogState = {
                name: backlogLevel.name,
                color: backlogLevel.color,
                backlogLevel: backlogLevel,
                newWorkItemTypes: [],
                errors: [],
                isLoading: false,
                showCancelConfirmation: false,
                mode: Interfaces.DialogMode.AddEdit,
                userAddedWorkItemType: null,
                workItemTypes: this._getWorkItemTypesForDialog(backlogLevel),
                isDirty: false,
                validationError: null,
                groupName: payload.groupName,
                defaultFieldNames: backlogLevel.fields
                    .map((field) => field.name)
                    .sort((f, f1) => Utils_String.ignoreCaseComparer(f, f1))
            };
        }
        else {
            this._currentState.messageDialog = {
                title: AdminResources.BacklogLevels_Editbacklog_DialogTitle,
                message: AdminResources.BacklogLevelDialog_NoEditPermissionForBacklogLevelsMessage
            };
        }
        this.emitChanged();
    }

    private _getWorksItemTypesAfterPartialSave(hierarchy: Interfaces.IBacklogLevelHierarchy,
        backlogLevel: Interfaces.IBacklogLevel,
        previousDialogState: Interfaces.IDialogState): Interfaces.IDialogWorkItemType[] {

        let ret: Interfaces.IDialogWorkItemType[] = [];

        //Finds the isDefault and isSelected states from previous state of the dialog to preserve them
        let statusFromPreviousState = (id) => {
            let w = Utils_Array.first(previousDialogState.workItemTypes, (wit) => Utils_String.equals(wit.id, id, true));
            if (!w) {
                w = Utils_Array.first(previousDialogState.newWorkItemTypes, (wit) => Utils_String.equals(wit.id, id, true));
            }
            if (w) {
                return {
                    isDefault: w.isDefault,
                    isSelected: w.isSelected
                }
            }

            return null;
        };

        var defaultWitFound: boolean = false;
        // Add this levels Work Item Types
        if (backlogLevel) {
            ret = ret.concat(backlogLevel.workItemTypes.map(wit => {
                let status = statusFromPreviousState(wit.id);
                let isDefault = !defaultWitFound && (status ? status.isDefault : wit.isDefault);
                let isSelected = status ? status.isSelected : true;
                return {
                    id: wit.id,
                    name: wit.name,
                    color: wit.color,
                    icon: wit.icon,
                    isDefault: isDefault,
                    isSelected: isSelected,
                    isDisabled: wit.isDisabled,
                    isCustom: wit.isCustom,
                };
            }));
        }

        // Add unmapped Work Item Types
        for (var wit of hierarchy.unmappedWorkItemTypes) {
            if (wit.isCustom) {
                let status = statusFromPreviousState(wit.id);
                let isDefault = !defaultWitFound && (status ? status.isDefault: wit.isDefault);
                let isSelected = status ? status.isSelected : false;
                ret.push({
                    id: wit.id,
                    name: wit.name,
                    color: wit.color,
                    icon: wit.icon,
                    isDefault: isDefault,
                    isSelected: isSelected,
                    isDisabled: wit.isDisabled,
                    isCustom: true,
                })
            }
        }

        ret = ret.sort((wit1, wit2) => Utils_String.ignoreCaseComparer(wit1.name, wit2.name));
        return ret;
    }

    /**
     * This method is called only when launching the dialog
     *
     * So this returns the initial work item type list shown in the Backlog Level Dialog
     *
     * @param backlogLevel
     */
    private _getWorkItemTypesForDialog(backlogLevel?: Interfaces.IBacklogLevel): Interfaces.IDialogWorkItemType[] {
        var hierarchy: Interfaces.IBacklogLevelHierarchy = this._currentState.hierarchy;
        let wits: Interfaces.IDialogWorkItemType[] = [];

        // Add this levels Work Item Types
        if (backlogLevel) {
            wits = wits.concat(backlogLevel.workItemTypes.map(wit => {
                return {
                    id: wit.id,
                    name: wit.name,
                    color: wit.color,
                    icon: wit.icon,
                    isDefault: wit.isDefault,
                    isSelected: true,
                    isDisabled: wit.isDisabled,
                    isCustom: wit.isCustom,
                };
            }));
        }

        // Add unmapped Work Item Types
        for (var wit of hierarchy.unmappedWorkItemTypes) {
            if (wit.isCustom) {
                wits.push({
                    id: wit.id,
                    name: wit.name,
                    color: wit.color,
                    icon: wit.icon,
                    isDefault: false,
                    isSelected: false,
                    isDisabled: wit.isDisabled,
                    isCustom: true,
                })
            }
        }

        wits = wits.sort((wit1, wit2) => Utils_String.ignoreCaseComparer(wit1.name, wit2.name));
        return wits;
    }
    
 }