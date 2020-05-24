import { areAdvancedBacklogFeaturesEnabled } from "Agile/Scripts/Common/Agile";
import { AddItemInsertLocation } from "Agile/Scripts/Common/Components/BacklogAddItemCallout/BacklogAddItemCallout";
import { BacklogAddItemCalloutActions } from "Agile/Scripts/Common/Components/BacklogAddItemCallout/BacklogAddItemCalloutActions";
import { Store } from "VSS/Flux/Store";
import { WorkItemType } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

export class BacklogAddItemCalloutStore extends Store {
    private _actions: BacklogAddItemCalloutActions;
    private _currentWorkItemType: WorkItemType;
    private _isLoadingWorkItemType: boolean;
    private _insertLocation: AddItemInsertLocation;
    private _selectedWorkItemType: string;


    public get currentWorkItemType(): WorkItemType {
        return this._currentWorkItemType;
    }

    public get isLoadingWorkItemType(): boolean {
        return this._isLoadingWorkItemType;
    }

    public get insertLocation(): AddItemInsertLocation {
        if (!areAdvancedBacklogFeaturesEnabled()) {
            return AddItemInsertLocation.Bottom;
        }

        return this._insertLocation;
    }

    public get selectedWorkItemType(): string {
        return this._selectedWorkItemType;
    }

    constructor(actions: BacklogAddItemCalloutActions) {
        super();
        // Initialize variables
        this._isLoadingWorkItemType = false;
        this._currentWorkItemType = null;
        // Setup action listeners
        this._actions = actions;
        this._actions.beginLoadWorkItemType.addListener(this._loadingWorkItemType);
        this._actions.workItemTypeLoaded.addListener(this._handleLoadWorkItemType);
        this._actions.readLocalSettings.addListener(this._handleReadLocalSettings);
        this._actions.insertLocationChanged.addListener(this._handleInsertLocationChanged);
        this._actions.selectedWorkItemTypeChanged.addListener(this._handleSelectedWorkItemTypeChanged);
        this._actions.errorOnLoad.addListener(this._handleErrorOnLoad);
    }

    public dispose() {
        this._actions.beginLoadWorkItemType.removeListener(this._loadingWorkItemType);
        this._actions.workItemTypeLoaded.removeListener(this._handleLoadWorkItemType);
        this._actions = null;
        this._isLoadingWorkItemType = null;
        this._currentWorkItemType = null;
    }

    private _loadingWorkItemType = () => {
        this._isLoadingWorkItemType = true;
        this._currentWorkItemType = null;
        this.emitChanged();
    }

    private _handleLoadWorkItemType = (workItemType: WorkItemType) => {
        this._isLoadingWorkItemType = false;
        this._currentWorkItemType = workItemType;
        this.emitChanged();
    }

    private _handleInsertLocationChanged = (insertLocation: AddItemInsertLocation): void => {
        this._insertLocation = insertLocation;
        this.emitChanged();
    }

    private _handleSelectedWorkItemTypeChanged = (workItemType: string): void => {
        this._selectedWorkItemType = workItemType;
        this.emitChanged();
    }

    private _handleReadLocalSettings = (settings: { insertLocation: AddItemInsertLocation, selectedWorkItemType: string }): void => {
        this._insertLocation = settings.insertLocation;
        this._selectedWorkItemType = settings.selectedWorkItemType;
        this.emitChanged();
    }

    private _handleErrorOnLoad = () => {
        this._isLoadingWorkItemType = false;
        this.emitChanged();
    }
}