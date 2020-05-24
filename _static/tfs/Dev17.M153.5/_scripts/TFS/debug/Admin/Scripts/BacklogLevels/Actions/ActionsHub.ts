import { Action } from "VSS/Flux/Action";
import * as Interfaces from "Admin/Scripts/BacklogLevels/Interfaces";

export class ActionsHub {
    private _createAction<T>(): Action<T> {
        return new Action<T>();
    }

    // Actions for backlog hierarchy data    
    public beginFetchHierarchyAction = this._createAction<void>();
    public endFetchHierarchyAction = this._createAction<Interfaces.IBacklogLevelHierarchy>();
    
    public launchAddBacklogLevelDialogAction = this._createAction<void>();
    public launchEditBacklogLevelDialogAction = this._createAction<Interfaces.IEditBacklogLevelPayload>();
   
    //Various operations that can be done inside the dialog
    public dialogBacklogNameChangedAction = this._createAction<string>();
    public dialogBacklogColorChangedAction = this._createAction<string>();
    public dialogWorkItemTypeSelectionChangedAction = this._createAction<Interfaces.IWorkItemTypeSelectionChangedPayload>(); //Raised when a work item type is selected/unselected in backlog edit/add dialog
    public dialogCreateClientOnlyWorkItemTypeClickedAction = this._createAction<void>(); //Raised when Add New Work Item is clicked in dialog
    public dialogSaveClientOnlyWorkItemTypeClickedAction = this._createAction<Interfaces.IUserAddedWorkItemType>(); //Raised when Save is clicked on Add New Work Item Type section of the dialog
    public dialogCancelClientOnlyWorkItemTypeClickedAction = this._createAction<void>(); //Raised when Cancel is clicked on Add New Work Item Type section of the dialog
    public dialogSetDefaultWorkItemTypeAction = this._createAction<Interfaces.ISetDefaultWorkItemTypePayload>(); //Raised when setDefault is clicked for a selected work item type in the dialog
    
    public hideBacklogLevelDialogAction = this._createAction<void>();
    public cancelEditDialogClickedAction = this._createAction<void>();
    public discardDialogChangesAction = this._createAction<boolean>();

    //Called when save starts e.g. user clicks on Save button
    public beginBacklogLevelSaveAction = this._createAction<Interfaces.IDialogState>();
    public endBacklogLevelSaveAction = this._createAction<Interfaces.IEndBacklogLevelSavePayload>();

    public workItemTypeCreatedAction = this._createAction<Interfaces.IWorkItemType>();
    public backlogLevelCreatedAction = this._createAction<Interfaces.IBacklogLevel>();
    public backlogLevelUpdatedAction = this._createAction<Interfaces.IBehaviorUpdatedPayload>();
    public workItemTypeAssociatedAction = this._createAction<Interfaces.IWorkItemTypeAssociationPayload>();
    public workItemTypeDeAssociatedAction = this._createAction<Interfaces.IWorkItemTypeAssociationPayload>();
    public defaultWorkItemTypeChangedAction = this._createAction<Interfaces.IWorkItemTypeAssociationPayload>();

    // Actions for deleting a backlog level
    public launchDeleteConfirmationDialogAction = this._createAction<Interfaces.IBacklogLevel>();
    public cancelDeleteBacklogLevelDialogAction = this._createAction<void>();
    public beginDeleteBacklogLevelAction = this._createAction<Interfaces.IBacklogLevel>();
    public endbacklogLevelDeletedAction = this._createAction<Interfaces.IBacklogLevel>();

    //reset actions
    public launchResetConfirmationDialogAction = this._createAction<Interfaces.IBacklogLevel>();
    public cancelResetBacklogLevelDialogAction = this._createAction<void>();
    public beginResetBacklogLevelAction = this._createAction<Interfaces.IBacklogLevel>();
    
    public showErrorAction = this._createAction<Interfaces.IBacklogLevelError>();
    public hideErrorAction = this._createAction<void>();
    public hideDialogErrorAction = this._createAction<void>();

    // Close Message Dialog
    public closeMessageDialogAction = this._createAction<void>();

    // Context Menu
    public showContextMenuAction = this._createAction<Interfaces.IContextMenuData>();
    public dismissContextMenuAction = this._createAction<void>();
}