/// <reference types="knockout" />
import Q = require("q");
import AdminProcessContracts = require("Admin/Scripts/Contracts/TFS.Admin.Process.Contracts");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import WITStateDialog = require("Admin/Scripts/Dialogs/WorkItemStateDialog");
import Diag = require("VSS/Diag");
import VSS_Error = require("VSS/Error");
import Controls = require("VSS/Controls");
import ControlsDialogs = require("VSS/Controls/Dialogs");
import Menus = require("VSS/Controls/Menus");
import Utils_String = require("VSS/Utils/String");
import Grids = require("VSS/Controls/Grids");
import Notifications = require("VSS/Controls/Notifications");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import ProcessHttpClient = require("TFS/WorkItemTracking/ProcessRestClient");
import AdminProcessCommon = require("Admin/Scripts/TFS.Admin.Process.Common");
import AdminDialogs = require("Admin/Scripts/TFS.Admin.Dialogs");
import WorkItemDialogBase = require("Admin/Scripts/Dialogs/WorkItemDialogBase");
import WorkItemStateCategories = require("Presentation/Scripts/TFS/FeatureRef/WorkItemStateCategories");
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import { WorkItemStateCellRenderer } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateCellRenderer";
import { KeyCode } from "VSS/Utils/UI";
import * as Service from "VSS/Service";

function getProcessClient(): ProcessHttpClient.WorkItemTrackingProcessHttpClient5 {
    return Service.getClient(ProcessHttpClient.WorkItemTrackingProcessHttpClient5);
}

/**
 * Message area control for the States View
 */
class ProcessStatesMessageAreaControl extends Notifications.MessageAreaControl {
    private _ProcessStatesView: ProcessStatesView;

    setProcessStatesView(ProcessStatesView: ProcessStatesView) {
        this._ProcessStatesView = ProcessStatesView;
    }


    setMessage(message: any, messageType?: Notifications.MessageAreaType): void {
        super.setMessage(message, messageType);
    }

    clear(): void {
        super.clear();
    }
}

/**
* Interface representing StateCategory group and containing ordered list of states for the category
*/
export interface IStateCategoryGroup {
    order: number,
    displayName: string,
    stateCategory: string,
    orderedStates: ProcessContracts.WorkItemStateResultModel[]
}

/**
 * States object interface used by WorkItemTypesStateData 
 */
export interface IStateInfo {
    state: ProcessContracts.WorkItemStateResultModel;
    inherited: boolean;
};

/**
 * Used by grid to determine row behavior and handling of item in datasource
 */
export enum IGridSourceItemType {
    StateCategory = 0,
    State = 1
}

/**
 * Expected source items of StatesGrid datasource
 */
export interface IGridSourceItem {
    type: IGridSourceItemType;
    id: string;
    noContextMenu?: boolean;
}

/**
 * Stores states data for work item types
 */
export class WorkItemTypeStatesData {
    constructor(workItemType: ProcessContracts.ProcessWorkItemType) {
        Diag.Debug.assert(!!workItemType, "Work Item Type is not specified");
        this.workItemType = <ProcessContracts.ProcessWorkItemType>$.extend(true, {}, workItemType);

        this.inheritedStates = [];
        this.stateGroups = [];
        this.states = [];
        this._statesDictionary = {};
    }

    public workItemType: ProcessContracts.ProcessWorkItemType;
    public stateGroups: IStateCategoryGroup[];
    public states: ProcessContracts.WorkItemStateResultModel[];
    public inheritedStates: ProcessContracts.WorkItemStateResultModel[];

    private _statesDictionary: IDictionaryStringTo<IStateInfo>;

    /**
     * Initialize WorkItemTypeStatesData
     * @param states States for work item type (sorted by order)
     * @param inheritedStates Inherited states for work item type (sorted by order)
     */
    public initialize(states: ProcessContracts.WorkItemStateResultModel[],
        inheritedStates: ProcessContracts.WorkItemStateResultModel[]) {

        this.inheritedStates = [];
        this.stateGroups = [];
        this.states = [];
        this._statesDictionary = {};

        if (!inheritedStates) {
            inheritedStates = [];
        }

        if (!states) {
            states = [];
        }

        this.states = states;
        this.inheritedStates = inheritedStates;

        this._statesDictionary = WorkItemTypeStatesData._getStatesDictionary(states, inheritedStates);
        let orderedStates = WorkItemTypeStatesData._getOrderedStates(states, inheritedStates, this._statesDictionary);
        this.stateGroups = this._createStateGroups(orderedStates);

        this.stateGroups.sort((g1, g2) => {
            return g1.order - g2.order;
        });

    }

    /**
     * Gets the state for given stateId
     * @param stateId
     */
    public getState(stateId: string): ProcessContracts.WorkItemStateResultModel {
        let stateInfo = this._statesDictionary[stateId];
        if (!stateInfo) {
            return null;
        }
        return stateInfo.state;
    }

    /**
     * Gets if the state is inherited given stateId
     * @param stateId
     */
    public isInherited(stateId: string): boolean {
        let stateInfo = this._statesDictionary[stateId];
        if (!stateInfo) {
            Diag.Debug.fail("State does not exist");
            return false;
        }
        return stateInfo.inherited;
    }

    /**
     * Creates a dictionary for states and inheritedStates (Public for test purposes only)
     * @param states
     * @param inheritedStates
     */
    public static _getStatesDictionary(states: ProcessContracts.WorkItemStateResultModel[],
        inheritedStates: ProcessContracts.WorkItemStateResultModel[]): IDictionaryStringTo<IStateInfo> {

        let statesDictionary: IDictionaryStringTo<IStateInfo> = {};
        for (let state of states) {
            statesDictionary[state.id] = {
                state: state,
                inherited: state.customizationType === ProcessContracts.CustomizationType.Inherited || state.customizationType === ProcessContracts.CustomizationType.System
            };
        }

        //Add parent states to the dictionary
        for (let state of inheritedStates) {
            //Add only if the _stateDictionary do not have a value for that id, otherwise the state is hidden in child.
            if (!statesDictionary[state.id]) {
                statesDictionary[state.id] = {
                    state: state,
                    inherited: state.customizationType === ProcessContracts.CustomizationType.Inherited || state.customizationType === ProcessContracts.CustomizationType.System
                };
            }
        }

        return statesDictionary;
    }

    /**
     * Gets array of states ordered (Public for test purposes only)
     * @param states States
     * @param inheritedStates Inherited States
     * @param statesDictionary States dictionary 
     */
    public static _getOrderedStates(states: ProcessContracts.WorkItemStateResultModel[],
        inheritedStates: ProcessContracts.WorkItemStateResultModel[],
        statesDictionary: IDictionaryStringTo<IStateInfo>): ProcessContracts.WorkItemStateResultModel[] {

        //Order is one based but the index is zero based
        let getIndexForOrder = (order: number) => order - 1;

        //Create an array size of parentStates.length + childStates.length - hidden
        let nonHiddenStates = states.filter((state) => {
            return !state.hidden;
        });

        let totalStateCount = nonHiddenStates.length + inheritedStates.length;

        let orderedStates: ProcessContracts.WorkItemStateResultModel[] = [];
        //Allocate all non-hidden child states in the array
        for (let state of nonHiddenStates) {
            let index = getIndexForOrder(state.order);
            orderedStates[index] = state;
        }

        //Then sequentially place all parent states, use the hidden state if available in child
        for (let state of inheritedStates) {
            let s = state;
            let order = s.order;
            //Mark the inherited state as hidden if the child state is hidden
            if (statesDictionary[s.id] && statesDictionary[s.id].state.hidden) {
                s = $.extend(true, {}, s);
                s.hidden = true;
            }

            let index = -1;

            //Find the next available index, Order is one based
            for (let i = getIndexForOrder(s.order); i < totalStateCount; i++) {
                if (!orderedStates[i]) {
                    index = i;
                    break;
                }
            }

            Diag.Debug.assert(index > -1, "Index should be greater than -1");
            if (index > -1) {
                orderedStates[index] = s;
            }
            else {
                VSS_Error.publishErrorToTelemetry({
                    name: "CouldNotFindGoodIndex",
                    message: Utils_String.format("Could not find a good index for a state : {0}", JSON.stringify(s))
                });
            }
        }

        return orderedStates;
    }

    /**
     * Create state groups based off of all states passed in
     * @param states
     */
    private _createStateGroups(states: ProcessContracts.WorkItemStateResultModel[]): IStateCategoryGroup[] {
        let keys = Object.keys(WorkItemStateCategories.WorkItemStateCategoryData);

        let groups = keys.map((stateCategory) => {
            return {
                displayName: WorkItemStateCategories.WorkItemStateCategoryData[stateCategory].displayName,
                order: WorkItemStateCategories.WorkItemStateCategoryData[stateCategory].order,
                orderedStates: [],
                stateCategory: stateCategory
            };
        });

        states.forEach((state) => {
            groups[keys.indexOf(state.stateCategory)].orderedStates.push(state);
        });

        return groups.filter((group) => {
            return group.orderedStates.length > 0;
        });
    }
}

/**
 * Stores states at process level
 */
export class ProcessStatesData {
    constructor(processTypeId: string) {
        Diag.Debug.assert(!!processTypeId, "Process type id is not specified");
        this.processTypeId = processTypeId;
    }

    public processTypeId: string;
    public currentPageStatesByWorkItemType: IDictionaryStringTo<ProcessContracts.WorkItemStateResultModel[]>;

    private _otherStatesByWorkItemType: IDictionaryStringTo<ProcessContracts.WorkItemStateResultModel[]>;
    private _statesForAllWorkItemTypes: ProcessContracts.WorkItemStateResultModel[];

    /**
     * Updates states from WorkItemTypeStatesData
     * @param workItemTypeStatesData WorkItemTypeStatesData to take states from
     */
    public updateStates(workItemTypeStatesData: WorkItemTypeStatesData): void {
        //Delete the state data from otherStates dictionary for new workitemtype
        delete this._otherStatesByWorkItemType[workItemTypeStatesData.workItemType.referenceName];
        delete this._otherStatesByWorkItemType[workItemTypeStatesData.workItemType.inherits];
        this._statesForAllWorkItemTypes = null;

        //Move the states data for currentPageStates before overwriting it.
        for (let key of Object.keys(this.currentPageStatesByWorkItemType)) {
            this._otherStatesByWorkItemType[key] = this.currentPageStatesByWorkItemType[key];
        }

        //Overwrite data for currentPageStatesByWorkItemType with the one passed
        this.currentPageStatesByWorkItemType = {};

        this.currentPageStatesByWorkItemType[workItemTypeStatesData.workItemType.referenceName] = workItemTypeStatesData.states;

        if (workItemTypeStatesData.workItemType.inherits) {
            this.currentPageStatesByWorkItemType[workItemTypeStatesData.workItemType.inherits] = workItemTypeStatesData.inheritedStates;
        }
    }

    /**
     * Retrieve states for all other work item types 
     */
    public getStatesForOtherWorkItemTypes(): ProcessContracts.WorkItemStateResultModel[] {
        if (!this._statesForAllWorkItemTypes) {

            this._statesForAllWorkItemTypes = [];
            for (let key in this._otherStatesByWorkItemType) {
                this._statesForAllWorkItemTypes.push(...this._otherStatesByWorkItemType[key]);
            }
        }
        return this._statesForAllWorkItemTypes;
    }

    /**
     * Initialize 
     * @param workItemTypes All work item types
     * @param inheritedWorkItemTypes All inherited work item types
     * @param currentProcessWorkItemType WorkItem type model for current page
     */
    public initialize(workItemTypes: ProcessContracts.ProcessWorkItemType[],
        inheritedWorkItemTypes: ProcessContracts.ProcessWorkItemType[],
        currentProcessWorkItemType: ProcessContracts.ProcessWorkItemType) {

        if (!inheritedWorkItemTypes) {
            inheritedWorkItemTypes = [];
        }

        this.currentPageStatesByWorkItemType = {};
        this._otherStatesByWorkItemType = {};

        let ret: IDictionaryStringTo<ProcessContracts.WorkItemStateResultModel[]> = {};
        for (let i = 0; i < workItemTypes.length; i++) {
            let type = workItemTypes[i];
            if (type.referenceName !== currentProcessWorkItemType.referenceName && type.referenceName !== currentProcessWorkItemType.inherits) {
                this._otherStatesByWorkItemType[type.referenceName] = type.states;
            }
            else {
                this.currentPageStatesByWorkItemType[type.referenceName] = type.states;
            }
        }

        for (let i = 0; i < inheritedWorkItemTypes.length; i++) {
            let type = inheritedWorkItemTypes[i];
            Diag.Debug.assert(!this.currentPageStatesByWorkItemType[type.referenceName], "Duplicate work item type id should not exists.");
            if (type.referenceName !== currentProcessWorkItemType.referenceName && type.referenceName !== currentProcessWorkItemType.inherits) {
                this._otherStatesByWorkItemType[type.referenceName] = type.states;
            }
            else {
                this.currentPageStatesByWorkItemType[type.referenceName] = type.states;
            }
        }
    }
}

/**
* Interface for State Grid datasoruce
*/
export interface IStateGridDataSource {
    source: IGridSourceItem[],
    selectedIndex?: number
}

/**
 * States data for the ProcessStatesView
 */
export class ProcessStatesViewData {
    private _workItemTypeStatesData: WorkItemTypeStatesData;
    private _processStatesData: ProcessStatesData;

    constructor(workItemTypeStatesData: WorkItemTypeStatesData, processStatesData: ProcessStatesData) {
        this._workItemTypeStatesData = workItemTypeStatesData;
        this._processStatesData = processStatesData;
    }

    /**
     * Checks if the current work item type is blocked from customization
     */
    public isWorkItemTypeBlockedFromCustomization(): boolean {
        return this._getWorkItemType() &&
            AdminProcessCommon.ProcessBlockingResource.WorkItemTypesBlockedFromCustomization.indexOf(this._workItemTypeStatesData.workItemType.referenceName.toLowerCase()) > -1;
    }

    /**
     * Checks if the given state is inherited, also returns true if the state is hidden
     * @param state
     */
    public isInheritedState(state: ProcessContracts.WorkItemStateResultModel): boolean {
        return state.hidden || this._workItemTypeStatesData.isInherited(state.id);
    }

    /**
     * checks if you can show the context menu
     * @param stateId
     */
    public canShowContextMenu(stateId: string): boolean {
        //Show context menu for states row, state category grouping row does not have a context menu
        return Utils_String.isGuid(stateId) && this.getState(stateId) !== null;
    }

    /**
     * Checks if the given state can move up in the order
     * @param state
     */
    public canMoveUp(state: ProcessContracts.WorkItemStateResultModel): boolean {
        Diag.Debug.assertIsObject(state, "State should not be null.");
        if (!state) {
            return false;
        }

        if (this.isInheritedState(state)) {
            return false;
        }

        if (state.order <= 1) {
            return false;
        }

        let group = this._getCategoryGroup(state.stateCategory);
        let firstStateInGroup = group.orderedStates[0];
        return firstStateInGroup.order < state.order || firstStateInGroup.id !== state.id;  //The inherited states can have order equal to non-inherited states
    }

    /**
     * Checks if the given state can move down in the order
     * @param state
     */
    public canMoveDown(state: ProcessContracts.WorkItemStateResultModel): boolean {
        Diag.Debug.assertIsObject(state, "State should not be null.");
        if (!state) {
            return false;
        }

        if (this.isInheritedState(state)) {
            return false;
        }

        let group = this._getCategoryGroup(state.stateCategory);
        let lastStateInGroup = group.orderedStates[group.orderedStates.length - 1];
        return lastStateInGroup.order > state.order || lastStateInGroup.id !== state.id; //The inherited states can have order equal to non-inherited states
    }

    /**
     * Checks if the given state can be hidden
     * @param state
     */
    public canHide(state: ProcessContracts.WorkItemStateResultModel): boolean {
        Diag.Debug.assertIsObject(state, "State should not be null.");
        if (!state) {
            return false;
        }
        return this.isInheritedState(state)
            && !state.hidden
            && !this._isUnchangeableStateCategory(state.stateCategory);
    }

    /**
     * Checks if the given state can be un-hidden
     * @param state
     */
    public canUnhide(state: ProcessContracts.WorkItemStateResultModel): boolean {
        Diag.Debug.assertIsObject(state, "State should not be null.");
        if (!state) {
            return false;
        }
        return !!state.hidden;
    }

    /**
     * Checks if the given state can be deleted
     * @param state
     */
    public canDelete(state: ProcessContracts.WorkItemStateResultModel): boolean {
        Diag.Debug.assertIsObject(state, "State should not be null.");
        if (!state) {
            return false;
        }
        return !this.isInheritedState(state)
            && this._workItemTypeStatesData.workItemType.customization !== ProcessContracts.CustomizationType.System
            && !this._isUnchangeableStateCategory(state.stateCategory);
    }

    /**
     * Checks if the given state is editable
     * @param state
     */
    public canEdit(state: ProcessContracts.WorkItemStateResultModel): boolean {
        Diag.Debug.assertIsObject(state, "State should not be null.");
        if (!state) {
            return false;
        }
        return !this.isInheritedState(state) && this._workItemTypeStatesData.workItemType.customization !== ProcessContracts.CustomizationType.System;
    }

    /**
     * Gets the state for given state id
     * @param stateId
     */
    public getState(stateId: string): ProcessContracts.WorkItemStateResultModel {
        if (!this._workItemTypeStatesData) {
            return null;
        }
        return this._workItemTypeStatesData.getState(stateId);
    }

    /**
     * Gets all the state groups
     */
    public getStateGroups(): IStateCategoryGroup[] {
        if (!this._workItemTypeStatesData || !this._workItemTypeStatesData.stateGroups) {
            return null;
        }
        return this._workItemTypeStatesData.stateGroups;
    }

    /**
     * Gets names of all states for the current work item type
     */
    public getStateNamesForCurrentWorkItemType(): string[] {
        if (!this._workItemTypeStatesData) {
            return [];
        }

        let values: string[] = this._workItemTypeStatesData.states.map((s) => s.name);
        values.push(...this._workItemTypeStatesData.inheritedStates.map((s) => s.name));
        return values;
    }

    /**
     * Gets states from all work item types except for the current
     */
    public getStatesFromOtherWorkItemTypes(): ProcessContracts.WorkItemStateResultModel[] {
        if (!this._processStatesData) {
            return [];
        }
        return this._processStatesData.getStatesForOtherWorkItemTypes();
    }

    /**
     * Get process type id
     */
    public getProcessTypeId(): string {
        if (!this._processStatesData) {
            return null;
        }
        return this._processStatesData.processTypeId;
    }

    /**
     * Get current work item type id
     */
    public getCurrentWorkItemTypeId(): string {
        if (!this._workItemTypeStatesData || !this._workItemTypeStatesData.workItemType) {
            return null;
        }
        return this._workItemTypeStatesData.workItemType.referenceName;
    }

    /**
     * Clones the processStatesViewData
     * @param workItemTypeStatesData workitemtypeStatesData to merge
     * @param processStatesViewData processStaatesViewData to clone
     */
    public static Clone(workItemTypeStatesData: WorkItemTypeStatesData, processStatesViewData: ProcessStatesViewData): ProcessStatesViewData {
        let processStatesData: ProcessStatesData = $.extend(true, {}, processStatesViewData._processStatesData);
        processStatesData.updateStates(workItemTypeStatesData);
        return new ProcessStatesViewData(workItemTypeStatesData, processStatesData);
    }

    /**
     * Set workItemTypeStatesData to null
     */
    public resetworkItemTypeStatesData() {
        this._workItemTypeStatesData = null;
    }

    /**
     * Return state category group based on category name
     * @param category
     */
    private _getCategoryGroup(category: string): IStateCategoryGroup {
        let group = this._workItemTypeStatesData.stateGroups.filter((g) => {
            return g.stateCategory === category;
        })[0];
        Diag.Debug.assert(!!group, "Could not find group for category.");
        return group;
    }

    /**
     * Return work item type of workItemTypeStatesData. Default return value is null
     */
    private _getWorkItemType() {
        if (!this._workItemTypeStatesData) {
            return null;
        }
        return this._workItemTypeStatesData.workItemType;
    }

    /**
     * Returns true for categories where states cannot be hidden or removed
     */
    private _isUnchangeableStateCategory(category: string): boolean {
        return category === WorkItemStateCategories.WorkItemStateCategoryNames.Completed;
    }
}

export interface ProcessStatesViewOptions extends AdminProcessCommon.ProcessControlOptions.ProcessAndWorkItemType {
    /**
     * Event for when an error occurs or when error should be cleared (when message is null).
     * If this optional option is not specified, the default error pane will be used.
     * @param message
     */
    onErrorMessage?: (message: string) => void;

    // Callbacks to ensure new nav UI gets notified of updates
    beginCreateStateDefinition: (stateModel: ProcessContracts.WorkItemStateInputModel, processId: string, witRefName: string, errorBarId?: string) => IPromise<ProcessContracts.WorkItemStateResultModel>;
    beginUpdateStateDefinition: (stateModel: ProcessContracts.WorkItemStateInputModel, processId: string, witRefName: string, stateId: string, errorBarId?: string) => IPromise<ProcessContracts.WorkItemStateResultModel>
    beginDeleteStateDefinition: (processId: string, witRefName: string, stateId: string, errorBarId?: string) => IPromise<void>
    beginHideStateDefinition: (stateModel: ProcessContracts.HideStateModel, processId: string, witRefName: string, stateId: string, errorBarId?: string) => void;
}

/**
 * Process states view
 */
export class ProcessStatesView extends Controls.BaseControl {
    private _toolBar: Menus.MenuBar;
    private _workItemType: ProcessContracts.ProcessWorkItemType;
    private _process: AdminProcessCommon.ProcessDescriptorViewModel;
    private _statesGridContainer: JQuery;
    private _errorPane: ProcessStatesMessageAreaControl;
    private _grid: StatesGrid;
    private _executeCommandHandler: IEventHandler;
    private _processStatesViewData: ProcessStatesViewData;
    private _$loadingOverlay: JQuery;
    private _statusIndicator: StatusIndicator.StatusIndicator;
    private _setErrorMessage: (message: string) => void;

    private _gridDataSource: {
        source: IGridSourceItem[],
    };

    private static MENU_NEW = "process-states-toolbar-new";

    constructor(options: ProcessStatesViewOptions) {
        super(options);
        this._workItemType = options.workItemType;
        this._process = options.process;
        this._processStatesViewData = null;
        this._setErrorMessage = options.onErrorMessage == null ? (message: string) => {
            if (message == null) {
                this._errorPane.clear();
                return;
            }

            this._errorPane.setError(message);
        } : options.onErrorMessage;
    }

    public initialize() {
        super.initialize();
        this._initializeUIElements();
        this.refresh(this._process, this._workItemType);
    }

    /**
     * Refresh the control
     * Executed when we switch between Fields, Layout and States pages
     * @param processDescriptor
     * @param workItemType
     */
    public refresh(processDescriptor?: AdminProcessCommon.ProcessDescriptorViewModel,
        workItemType?: ProcessContracts.ProcessWorkItemType) {
        this._refresh(processDescriptor, workItemType);
    }

    public dispose() {
        super.dispose();
        Menus.menuManager.detachExecuteCommand(this._executeCommandHandler);
    }

    /**
     * Set up UI Elements
     */
    private _initializeUIElements() {
        this.getElement().empty();
        let viewDiv = this.getElement().addClass('process-states-view');

        let header = $('<div>').addClass('process-grid-view-header bowtie').appendTo(viewDiv);
        header.html(Utils_String.format(AdminResources.StatesViewDescription, `<span class="icon icon-inherited-form"></span>`));

        header.append("&nbsp;");
        header.append(`<a href="${AdminResources.StatesViewLearnMoreLink}" target="_blank" rel="external">${PresentationResources.LearnMore}</a>`);

        let items: Menus.IMenuItemSpec[] = [];
        items.push({
            id: ProcessStatesView.MENU_NEW,
            idIsAction: true,
            disabled: false,
            setDefaultTitle: false,
            text: AdminResources.StatesToolBarNew,
            cssClass: "new-state-item",
            icon: "bowtie-icon bowtie-math-plus-light"
        });

        let toolBarDiv = $('<div>').addClass('process-work-item-type-toolbar toolbar process-admin-wit-toolbar').appendTo(viewDiv);
        this._toolBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, toolBarDiv,
            {
                items: items,
            });
        this._toolBar._element.find('[class=drop]').css('margin-left', '2px');

        this._executeCommandHandler = (sender, args?) => {
            this._onExecuteCommand(sender, args);
        };

        Menus.menuManager.attachExecuteCommand(this._executeCommandHandler);

        this._statesGridContainer = $('<div>').addClass('process-states-grid-container').appendTo(viewDiv);

        this._errorPane = <ProcessStatesMessageAreaControl>Controls.BaseControl.createIn(ProcessStatesMessageAreaControl, this._statesGridContainer);
        this._errorPane.setProcessStatesView(this);

        this._grid = <StatesGrid>Controls.BaseControl.createIn(StatesGrid, this._statesGridContainer, this._generateGridOptions());

        // Double click to open 
        this._grid._bind('rowdblclick', (e: JQueryEventObject, item: { dataIndex: number /*... and some other fields*/ }): void => {
            this._rowClicked(e, item.dataIndex);
        });

        // Grid Keyboard interaction
        this._grid._bind(this._grid._canvas, 'keypress', (e: JQueryEventObject) => {
            let targetClassName = e != null && e.target != null && e.target.className != null ?
                e.target.className : '';

            if (targetClassName.indexOf(StatesGrid.CONTEXT_MENU_CONTAINER_CLASSNAME) === -1 && e.which === KeyCode.ENTER) {
                this._rowClicked(e, this._grid.getSelectedDataIndex())
            }
        });
        this._grid._bind(this._grid._canvas, 'keyup', (e: JQueryEventObject) => {
            if (e.which === KeyCode.DELETE) {
                // Check to see if this item can be removed, then fire remove click
                var dataItem = this._gridDataSource.source[this._grid.getSelectedDataIndex()];
                if (dataItem && dataItem.type === IGridSourceItemType.State) {
                    var state = this._processStatesViewData.getState(dataItem.id);
                    if (this._processStatesViewData.canDelete(state)) {
                        this._removeState(dataItem.id);
                    }
                }
            }
        });
        this._grid._bind(this._grid._canvas, 'keydown', (e: JQueryEventObject) => {
            switch (e.which) {
                case KeyCode.SPACE:
                    this._grid._onEnterKey(e);
                    break;
                case KeyCode.RIGHT:
                    let contextMenuButtons: JQuery = this._grid._element.find(`.${StatesGrid.CONTEXT_MENU_CONTAINER_CLASSNAME}`);
                    let selectedIndex: number = this._grid._selectedIndex;
                    if (contextMenuButtons.length > selectedIndex) {
                        contextMenuButtons[selectedIndex].focus();
                    }
                    break;
                case KeyCode.LEFT:
                case KeyCode.UP:
                case KeyCode.DOWN:
                    this._grid.focus();
            }
        });
    }

    /**
     * Respond to row clicked and opens up the WorkItemStateDialog
     * @param e
     * @param dataIndex
     */
    private _rowClicked(e: JQueryEventObject, dataIndex: number): void {
        // resolve the row item to an item in the datasource
        var dataItem = this._gridDataSource.source[dataIndex];

        // Open dialog for states
        if (dataItem.type === IGridSourceItemType.State) {
            var state = this._processStatesViewData.getState(dataItem.id);

            if (this._processStatesViewData.canEdit(state)) {
                this._editStateClicked($.extend({ item: dataItem }, e));
            }
            else {
                this._viewStateClicked($.extend({ item: dataItem }, e));
            }
        }
    }

    /**
     * Retrieve the states view data asynchronously 
     * @param workItemType
     * @param process
     * @param processStatesViewData
     */
    private _beginGetProcessStatesViewData(workItemType: ProcessContracts.ProcessWorkItemType,
        process: AdminProcessCommon.ProcessDescriptorViewModel, processStatesViewData: ProcessStatesViewData): IPromise<ProcessStatesViewData> {

        if (!processStatesViewData.getProcessTypeId()) {
            let witPromises: IPromise<ProcessContracts.ProcessWorkItemType[]>[] = [];
            //Get states for current process
            witPromises.push(getProcessClient().getProcessWorkItemTypes(process.processTypeId, ProcessContracts.GetWorkItemTypeExpand.States));

            // //If process is inherited get work item types for parent  process
            // if (process.isInherited) {
            //     witPromises.push(getProcessClient().getProcessWorkItemTypes(process.inherits, ProcessContracts.GetWorkItemTypeExpand.States));
            // }

            return Q.all(witPromises).spread((workItemTypes: ProcessContracts.ProcessWorkItemType[],
                inheritedWorkItemTypes: ProcessContracts.ProcessWorkItemType[]) => {

                let states: ProcessContracts.WorkItemStateResultModel[] = [];
                let inheritedStates: ProcessContracts.WorkItemStateResultModel[] = [];

                if (!inheritedWorkItemTypes) {
                    inheritedWorkItemTypes = [];
                }

                let processStatesData = new ProcessStatesData(process.processTypeId);
                processStatesData.initialize(workItemTypes, inheritedWorkItemTypes, workItemType);


                //Case 1: OOB Process
                // - No inherited states
                //Case 2: Inherited/Custom Process
                // 2.1: OOB Work Item Type
                // - All states are inherited states
                // 2.2: Custom Work Item Type (workitem.class is Custom)
                // - All states are custom states
                // 2.3: Inherited WorkItem Type
                // - Some are custom states
                // - Some are inherited states
                if (!process.isInherited) { //Case 1
                    states = processStatesData.currentPageStatesByWorkItemType[workItemType.referenceName];
                }
                else { // Case 2
                    //Case 2.1
                    if (!workItemType.inherits && workItemType.customization !== ProcessContracts.CustomizationType.Custom) {
                        states = [] //No custom states
                        inheritedStates = processStatesData.currentPageStatesByWorkItemType[workItemType.referenceName];
                    }
                    else if (workItemType.customization === ProcessContracts.CustomizationType.Custom) { //Case 2.2
                        states = processStatesData.currentPageStatesByWorkItemType[workItemType.referenceName];
                        inheritedStates = [];
                    }
                    else { //Case 2.3
                        states = processStatesData.currentPageStatesByWorkItemType[workItemType.referenceName];
                        inheritedStates = processStatesData.currentPageStatesByWorkItemType[workItemType.inherits];
                    }
                }

                let workItemTypeStatesData = new WorkItemTypeStatesData(workItemType);
                workItemTypeStatesData.initialize(states, inheritedStates);

                return new ProcessStatesViewData(workItemTypeStatesData, processStatesData);
            });
        }
        else {
            let statePromises: IPromise<ProcessContracts.WorkItemStateResultModel[]>[] = [];

            //Case 1: OOB Process
            // - No inherited states
            //Case 2: Inherited/Custom Process
            // 2.1: OOB Work Item Type
            // - All states are inherited states
            // 2.2: Custom Work Item Type (workItemType.class is Custom)
            // - All states are custom states
            // 2.3: Inherited WorkItem Type
            // - Some are custom states
            // - Some are inherited states

            //Case 1
            if (!process.isInherited) {
                //Get states for current work item type
                statePromises.push(ProcessHttpClient.getClient().getStateDefinitions(process.processTypeId, workItemType.referenceName));
            }
            else { //Case 2
                //Case 2.1
                if (!workItemType.inherits && workItemType.customization !== ProcessContracts.CustomizationType.Custom) {
                    statePromises.push(Q([])); //No custom states
                    statePromises.push(ProcessHttpClient.getClient().getStateDefinitions(process.inherits, workItemType.referenceName));
                }
                else if (workItemType.customization === ProcessContracts.CustomizationType.Custom) { //Case 2.2
                    statePromises.push(ProcessHttpClient.getClient().getStateDefinitions(process.processTypeId, workItemType.referenceName));
                    statePromises.push(Q([])); //No inherited states
                }
                else { //Case 2.3
                    statePromises.push(ProcessHttpClient.getClient().getStateDefinitions(process.processTypeId, workItemType.referenceName));
                    statePromises.push(ProcessHttpClient.getClient().getStateDefinitions(process.inherits, workItemType.inherits));
                }
            }

            return Q.all(statePromises).spread((states: ProcessContracts.WorkItemStateResultModel[],
                inheritedStates: ProcessContracts.WorkItemStateResultModel[]) => {

                let workItemTypeStatesData = new WorkItemTypeStatesData(workItemType);
                workItemTypeStatesData.initialize(states, inheritedStates);

                return ProcessStatesViewData.Clone(workItemTypeStatesData, processStatesViewData);
            });
        }
    }

    /**
     *  Internal refresh method to update data 
     * @param processDescriptor
     * @param workItemType
     * @param stateIdToSelect
     * @param focusGrid
     */
    private _refresh(
        processDescriptor?: AdminProcessCommon.ProcessDescriptorViewModel,
        workItemType?: ProcessContracts.ProcessWorkItemType,
        stateIdToSelect?: string,
        focusGrid: boolean = false) {
        if (processDescriptor) {
            this._process = processDescriptor;
        }

        if (workItemType) {
            this._workItemType = workItemType;
        }

        Diag.Debug.assert(!!this._process, "Process descriptor should be available.");
        Diag.Debug.assert(!!this._workItemType, "Work item type should be available.");
        if (!this._process || !this._workItemType) {
            VSS_Error.publishErrorToTelemetry({
                message: "Process and WorkItemtype is null",
                name: "InvalidInputWhileStatePageRefresh"
            });
            return;
        }

        //If process is changed
        if (!this._processStatesViewData || this._processStatesViewData.getProcessTypeId() !== this._process.processTypeId) {
            this._processStatesViewData = new ProcessStatesViewData(null, null);
        }

        this._processStatesViewData.resetworkItemTypeStatesData();
        this._gridDataSource = {
            source: []
        };

        this._setErrorMessage(null);
        this._updateToolbarPermissions();

        this._beginGetProcessStatesViewData(this._workItemType, this._process, this._processStatesViewData).then((processStatesViewData: ProcessStatesViewData) => {
            let selectedIndex = 0;
            //Refresh only if the process id and work item type id is matched
            //TODO: We need to also match that we are on the states page (Bug 559830: Refresh methods can not check the current active view on process page while refreshing the data.)
            if (this._process.processTypeId === processStatesViewData.getProcessTypeId() &&
                this._workItemType.referenceName === processStatesViewData.getCurrentWorkItemTypeId()) {
                this._processStatesViewData = processStatesViewData;
                this._gridDataSource = ProcessStatesView._getGridDataSource(processStatesViewData.getStateGroups(), stateIdToSelect);

                this._grid.updateSource(this._gridDataSource);

                var sourceIndex: number = 0;
                if (stateIdToSelect) {
                    while (sourceIndex < this._gridDataSource.source.length && this._gridDataSource.source[sourceIndex].id !== stateIdToSelect) {
                        sourceIndex++;
                    }
                    if (sourceIndex >= this._gridDataSource.source.length) {
                        sourceIndex = 0;
                    }
                }
                else { // Set grid selection to first non state category item
                    while (this._gridDataSource.source[sourceIndex].type !== IGridSourceItemType.State) {
                        sourceIndex++;
                    }
                }
                this._grid.setSelectedDataIndex(sourceIndex);
                if (focusGrid && this._grid != null) {
                    this._grid.focus();
                }
            }
        }, (reason) => {
            this._setErrorMessage(reason);
            VSS_Error.publishErrorToTelemetry(<TfsError>{
                message: Utils_String.format("Error: {0}, ProcessType: {1}, WorkItemTypeId: {2}", reason, this._process.processTypeId, this._workItemType.referenceName),
                name: "ErrorInGettingProcessState"
            });
        });
    }

    /**
     * Transform state category groups to grid datasource format
     * public for unit testing
     * @param stateGroups
     * @param stateIdToSelect
     */
    public static _getGridDataSource(stateGroups: IStateCategoryGroup[], stateIdToSelect: string): IStateGridDataSource {
        let dataSource: IStateGridDataSource = {
            source: [],
            selectedIndex: 0
        };

        for (let group of stateGroups) {
            //Insert only those groups that have states
            if (group.orderedStates.length > 0) {
                dataSource.source.push({ type: IGridSourceItemType.StateCategory, noContextMenu: true, id: group.stateCategory });
                for (let state of group.orderedStates) {
                    dataSource.source.push({
                        type: IGridSourceItemType.State,
                        id: state.id
                    });
                    if (state.id === stateIdToSelect) {
                        dataSource.selectedIndex = dataSource.source.length - 1;
                    }
                }
            }
        }

        return dataSource;
    }

    /**
     * Update toolbar permissions
     */
    private _updateToolbarPermissions(): void {

        // Change the tool bar menu state on switching between workitem types
        let allowEdit = this._allowEdits();
        this._toolBar.updateCommandStates([
            {
                id: ProcessStatesView.MENU_NEW,
                disabled: !allowEdit
            }
        ]);
    }

    /**
     * Generate states grid options
     */
    private _generateGridOptions(): IStatesGridOptions {
        return <IStatesGridOptions>{
            header: false,
            sharedMeasurements: false,
            coreCssClass: "grid process-states-grid",
            width: "401px",
            columns: [{
                width: 16,
                name: "Inherited",

                getCellContents: (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) => {
                    // Base grid cell
                    let $cell = $("<div>").addClass("grid-cell").css("width", "16px");
                    let sourceItem = this._gridDataSource.source[dataIndex];
                    if (sourceItem && sourceItem.type === IGridSourceItemType.State) {
                        let state = this._processStatesViewData.getState(sourceItem.id);
                        if (state && this._processStatesViewData.isInheritedState(state)) {
                            let $inheritedIcon = $("<span>").addClass("icon bowtie-icon icon-inherited-form").attr("aria-label", AdminResources.ProcessStatesGridInheritedAriaLabel);
                            $cell.append($inheritedIcon);
                        }
                    }
                    $cell.data("no-tooltip", true);
                    return $cell
                }
            },
            {
                name: "States",
                // Renderer for grid cells
                getCellContents: (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) => {
                    // Base grid cell
                    let $cell = $("<div>").addClass("grid-cell");
                    let sourceItem = this._gridDataSource.source[dataIndex];

                    if (sourceItem) {
                        // Render Category rows
                        if (sourceItem.type === IGridSourceItemType.StateCategory) {
                            let stateCategory = WorkItemStateCategories.WorkItemStateCategoryData[sourceItem.id];
                            Diag.Debug.assert(!!stateCategory, "Cannot render a column cell for unkown metastate");
                            let $categoryDiv = $("<div>")
                                .text(stateCategory.displayName)
                                .addClass("process-states-grid-category-container")
                                .attr("aria-label", Utils_String.format(AdminResources.StateCategoryAriaLabel, stateCategory.displayName));
                            return $cell.append($categoryDiv);
                        }
                        // Render state rows
                        else if (sourceItem.type === IGridSourceItemType.State) {
                            let state = this._processStatesViewData.getState(sourceItem.id);
                            let $stateDiv = WorkItemStateCellRenderer.getColorCell("#" + state.color, state.name);

                            if (state.hidden) {
                                $stateDiv.addClass("process-states-grid-hidden");
                            }
                            return $cell.append($stateDiv);
                        }
                    }
                }
            }],
            allowMoveColumns: false,
            allowMultiSelect: false,
            lastCellFillsRemainingContent: true,
            useBowtieStyle: true,
            contextMenu: {
                items: (contextInfo) => {
                    if (this._processStatesViewData.canShowContextMenu(contextInfo.item.id)) {
                        return this._getContextMenuItems(contextInfo);
                    }
                    return null;
                }
            },
            showContextMenu: (rowInfo: Grids.IGridRowInfo, menuOptions: any) => { return this._processStatesViewData.canShowContextMenu(this._gridDataSource.source[rowInfo.dataIndex].id); }
        };
    }

    /**
     * Get context meny items
     * @param contextInfo
     */
    private _getContextMenuItems(contextInfo: { rowInfo: Grids.IGridRowInfo, item: IGridSourceItem }): Menus.IMenuItemSpec[] {
        let menuItems: Menus.IMenuItemSpec[] = [];
        let state = this._processStatesViewData.getState(contextInfo.item.id);
        if (!state) {
            Diag.Debug.fail("Could not get state for id." + contextInfo.item.id);
            return null;
        }

        if (this._processStatesViewData.canEdit(state)) {
            menuItems.push({
                id: "edit-state",
                icon: "bowtie-icon bowtie-edit",
                text: AdminResources.EditStateMenuItem,
                setDefaultTitle: false,
                action: (e) => { this._editStateClicked(e); },
                "arguments": contextInfo
            });
        }
        else {
            menuItems.push({
                id: "view-state",
                icon: "bowtie-icon bowtie-arrow-open",
                text: AdminResources.ViewStateMenuItem,
                setDefaultTitle: false,
                action: (e) => { this._viewStateClicked(e); },
                "arguments": contextInfo
            });
        }

        if (this._processStatesViewData.canHide(state)) {
            menuItems.push({
                id: "hide-state",
                icon: "bowtie-icon bowtie-status-no",
                text: AdminResources.StateHideState,
                setDefaultTitle: false,
                action: (e) => { this._hideStateClicked(e); },
                "arguments": contextInfo
            });
        }

        if (this._processStatesViewData.canUnhide(state)) {
            menuItems.push({
                id: "show-state",
                icon: "bowtie-icon bowtie-check-light",
                text: AdminResources.StateShowState,
                setDefaultTitle: false,
                action: (e) => { this._showStateClicked(e); },
                "arguments": contextInfo
            });
        }

        // TODO: Uncomment this once ordering is supported
        //if (this._processStatesViewData.canMoveUp(state)) {
        //    menuItems.push({ id: "move-up-state", text: AdminResources.StateMoveUpMenuItem, setDefaultTitle: false, action: (e) => { this._moveUpStateClicked(e); }, "arguments": contextInfo });
        //}
        //if (this._processStatesViewData.canMoveDown(state)) {
        //    menuItems.push({ id: "move-down-state", text: AdminResources.StateMoveDownMenuItem, setDefaultTitle: false, action: (e) => { this._moveDownStateClicked(e); }, "arguments": contextInfo });
        //}

        if (this._processStatesViewData.canDelete(state)) {
            menuItems.push({
                id: "remove-state",
                icon: "bowtie-icon bowtie-edit-delete",
                text: AdminResources.StateRemoveMenuItem,
                setDefaultTitle: false,
                action: (e) => { this._removeState(e.item.id); },
                "arguments": contextInfo
            });
        }
        return menuItems;
    }

    /**
     * Allow edit based on process settings and work item type
     */
    private _allowEdits(): boolean {
        return this._process.canEdit() && !this._process.isSystem && !this._processStatesViewData.isWorkItemTypeBlockedFromCustomization();
    }

    /**
     * Async call to update state
     * @param value
     * @param stateId
     */
    private _beginUpdateState(value: ProcessContracts.WorkItemStateInputModel, stateId: string): IPromise<ProcessContracts.WorkItemStateResultModel> {
        let promise = this._options.beginUpdateStateDefinition(value, this._process.processTypeId, this._workItemType.referenceName, stateId);
        return promise;
    }

    /**
     * Async call to create state
     * @param value
     */
    private _beginCreateState(value: ProcessContracts.WorkItemStateInputModel): IPromise<ProcessContracts.WorkItemStateResultModel> {
        let promise = this._options.beginCreateStateDefinition(value, this._process.processTypeId, this._workItemType.referenceName);
        return promise;
    }

    /**
     * Async call to create inherited workitemtype
     */
    private _beginCreateInheritedWorkItemType(): IPromise<ProcessContracts.ProcessWorkItemType> {
        const workItemType : ProcessContracts.CreateProcessWorkItemTypeRequest= {
            color: this._workItemType.color,
            description: this._workItemType.description,
            icon: this._workItemType.icon,
            inheritsFrom: this._workItemType.referenceName,
            name: this._workItemType.name,
            isDisabled: this._workItemType.isDisabled
        };

        let client = getProcessClient();
        let processTypeId = this._process.processTypeId;
        return client.createProcessWorkItemType(workItemType, this._process.processTypeId).then((witResponse: ProcessContracts.ProcessWorkItemType) => {
            this._options.addHistoryPoint(witResponse);

            //TODO: Also ensure we are on the current page
            if (this._process.processTypeId === processTypeId && this._workItemType.referenceName === witResponse.inherits) {
                this._workItemType.referenceName = witResponse.referenceName;
                this._workItemType.name = witResponse.name;
                this._workItemType.description = witResponse.description;
                this._workItemType.inherits = witResponse.inherits;
                this._workItemType.color = witResponse.color;
                this._workItemType.icon = witResponse.icon;
                this._workItemType.customization = witResponse.customization;
                return this._workItemType;
            }
        });
    }

    /**
     * Respond to edit state clicked
     * @param e
     */
    private _editStateClicked(e) {
        let state = this._processStatesViewData.getState(e.item.id);
        if (!state) {
            Diag.Debug.fail("Could not find state.");
            return;
        }

        let options: WITStateDialog.IWorkItemStateDialogOptions = {
            title: AdminResources.EditStateDialogTitle,
            okCallback: (updatedState: ProcessContracts.WorkItemStateInputModel) => {
                if (!this._workItemType.inherits && this._workItemType.customization !== ProcessContracts.CustomizationType.Custom) {
                    return this._beginCreateInheritedWorkItemType().then((workItem) => {
                        return this._beginUpdateState(updatedState, e.item.id);
                    });
                }
                else {
                    return this._beginUpdateState(updatedState, e.item.id);
                }
            },
            cancelCallback: () => {
                this._grid.focus();
            },
            close: () => {
                if (this._grid != null) {
                    this._grid.focus();
                }
            },
            value: {
                color: state.color,
                name: state.name,
                order: state.order,
                stateCategory: state.stateCategory
            },
            suggestedStates: [],
            existingStates: [],
            mode: WorkItemDialogBase.WorkItemDialogBaseMode.Edit
        };

        ControlsDialogs.show(WITStateDialog.WorkItemStateDialog, options);
    }

    private _viewStateClicked(e) {
        let state = this._processStatesViewData.getState(e.item.id);
        if (!state) {
            Diag.Debug.fail("Could not find state.");
            return;
        }

        let options: WITStateDialog.IWorkItemStateDialogOptions = {
            title: AdminResources.ViewStateDialogTitle,
            okCallback: (updatedState: ProcessContracts.WorkItemStateInputModel) => {
                if (!this._workItemType.inherits && this._workItemType.customization !== ProcessContracts.CustomizationType.Custom) {
                    return this._beginCreateInheritedWorkItemType().then((workItemType) => {
                        return this._beginUpdateState(updatedState, e.item.id);
                    });
                }
                else {
                    return this._beginUpdateState(updatedState, e.item.id);
                }
            },
            cancelCallback: () => {
                this._grid.focus();
            },
            close: () => {
                if (this._grid != null) {
                    this._grid.focus();
                }
            },
            value: {
                color: state.color,
                name: state.name,
                order: state.order,
                stateCategory: state.stateCategory
            },
            suggestedStates: [],
            existingStates: [],
            mode: WorkItemDialogBase.WorkItemDialogBaseMode.View
        };

        ControlsDialogs.show(WITStateDialog.WorkItemStateDialog, options);
    }

    private _hideStateClicked(e) {
        let state = this._processStatesViewData.getState(e.item.id);
        if (!state) {
            Diag.Debug.fail("Could not find state.");
            return;
        }
        let stateModel: ProcessContracts.HideStateModel = {
            hidden: true
        };

        if (!this._workItemType.inherits && this._workItemType.customization !== ProcessContracts.CustomizationType.Custom) {
            let workItemTypeId = this._workItemType.referenceName;
            this._beginCreateInheritedWorkItemType().then((workItemType) => {
                if (workItemType) { //The workitem type could change by the time this call comes back
                    workItemTypeId = this._workItemType.referenceName;
                }
                this._options.beginHideStateDefinition(stateModel, this._process.processTypeId, workItemTypeId, state.id);
            });
        }
        else {
            this._options.beginHideStateDefinition(stateModel, this._process.processTypeId, this._workItemType.referenceName, state.id);
        }
    }

    private _showStateClicked(e) {
        let promise = this._options.beginDeleteStateDefinition(this._process.processTypeId, this._workItemType.referenceName, e.item.id);
    }

    private _moveUpStateClicked(e) {
        let state = this._processStatesViewData.getState(e.item.id);
        if (!state) {
            Diag.Debug.fail("Could not find state.");
            return;
        }
        this._changeStateOrder(state, -1);
    }

    private _moveDownStateClicked(e) {
        let state = this._processStatesViewData.getState(e.item.id);
        if (!state) {
            Diag.Debug.fail("Could not find state.");
            return;
        }
        this._changeStateOrder(state, 1);
    }

    private _removeState(stateId: string) {

        let state = this._processStatesViewData.getState(stateId);
        if (!state) {
            Diag.Debug.fail("Could not find state.");
            return;
        }

        let options: AdminDialogs.IConfirmRemoveDialogOptions = {
            title: AdminResources.RemoveStateConfirmationTitle,
            okCallback: () => {
                let promise = this._options.beginDeleteStateDefinition(this._process.processTypeId, this._workItemType.referenceName, stateId);
            },
            cancelCallback: () => {
                this._grid.focus();
            },
            close: () => {
                if (this._grid != null) {
                    this._grid.focus();
                }
            },
            dialogTextStrings: [Utils_String.format(AdminResources.RemoveStateConfirmatioinLine1, state.name, this._workItemType.name), AdminResources.RemoveStateConfirmationLine2],
            successCallback: null,
            okText: AdminResources.RemoveStateConfirmationButtonText,
            width: 640
        };

        ControlsDialogs.show(AdminDialogs.ConfirmRemoveDialog, options);
    }

    private _changeStateOrder(state: ProcessContracts.WorkItemStateResultModel, offset: number) {
        let stateModel = <ProcessContracts.WorkItemStateInputModel>{
            order: state.order + offset
        };

        let promise = this._options.beginUpdateStateDefinition(stateModel, this._process.processTypeId, this._workItemType.referenceName, state.id);
    }

    private _addNewState() {
        let existingStateNames = this._processStatesViewData.getStateNamesForCurrentWorkItemType();
        let options: WITStateDialog.IWorkItemStateDialogOptions = {
            title: Utils_String.format(AdminResources.NewStateDialogTitle, this._workItemType.name),
            okCallback: (state: ProcessContracts.WorkItemStateInputModel) => {
                if (!this._workItemType.inherits && this._workItemType.customization !== ProcessContracts.CustomizationType.Custom) {
                    return this._beginCreateInheritedWorkItemType().then((workItem) => {
                        return this._beginCreateState(state);
                    });
                }
                else {
                    return this._beginCreateState(state);
                }
            },
            suggestedStates: this._processStatesViewData.getStatesFromOtherWorkItemTypes(),
            existingStates: existingStateNames,
            mode: WorkItemDialogBase.WorkItemDialogBaseMode.Add
        };

        ControlsDialogs.show(WITStateDialog.WorkItemStateDialog, options);
    }

    private _onExecuteCommand(sender: any, args?: any) {
        switch (args.get_commandName()) {
            case ProcessStatesView.MENU_NEW:
                this._addNewState();
                break;
        }
    }

    private _showLoadingOverlay() {
        if (!this._$loadingOverlay) {
            this._$loadingOverlay = $("<div></div>").addClass("control-busy-overlay state-view-grid-overlay").appendTo(this.getElement());
        }
        this._$loadingOverlay.show();

        var statusOptions: StatusIndicator.IStatusIndicatorOptions = {
            center: true,
            imageClass: "big-status-progress",
            throttleMinTime: 0
        };
        this._statusIndicator = Controls.Control.create(StatusIndicator.StatusIndicator, this._$loadingOverlay, statusOptions);
        this._statusIndicator.start();
    }

    private _hideLoadingOverlay() {
        if (this._$loadingOverlay) {
            this._statusIndicator.complete();
            this._$loadingOverlay.hide();
            this._$loadingOverlay.empty();
        }
    }
}

/**
* Options for States Grid
*/
interface IStatesGridOptions extends Grids.IGridOptions {
    showContextMenu: (rowInfo: Grids.IGridRowInfo, menuOptions: any) => boolean;
}

/**
 * Grid for Process states
 */
class StatesGrid extends Grids.GridO<IStatesGridOptions> {

    public static CONTEXT_MENU_CONTAINER_CLASSNAME: string = 'grid-context-menu-container';
    public static enhancementTypeName: string = "tfs.wit.linksgrid";

    /**
     * Creates StatesGrid instance
     * @param options
     */
    constructor(options?: any) {
        super(options);
    }

    /**
     * Updates data soruce for the grid
     * @param source
     * @param expandStates
     */
    public updateSource(dataSource: IStateGridDataSource) {
        let options = this._options;
        options.source = dataSource.source;
        options.columns = this._columns;
        this.initializeDataSource();
        this.setSelectedDataIndex(dataSource.selectedIndex);
    }

    public onEnterKey(eventArgs): any {
        let targetClassName = eventArgs != null && eventArgs.event != null && eventArgs.event.target != null && eventArgs.event.target.className != null ?
            eventArgs.event.target.className : '';

        if (targetClassName.indexOf(StatesGrid.CONTEXT_MENU_CONTAINER_CLASSNAME) >= 0) {
            eventArgs.contextMenu = eventArgs.event.target;
            this._showContextMenu(eventArgs);
            return false;
        } else {
            return super.onEnterKey(eventArgs);
        }
    }

    /**
     * Overrides to optionally show the context menu
     * @param rowInfo Row info
     * @param menuOptions Menu options
     */
    public _createContextMenu(rowInfo: any, menuOptions: any): Menus.PopupMenu {
        if (this._options.showContextMenu(rowInfo, menuOptions)) {
            return super._createContextMenu(rowInfo, menuOptions);
        }
        return null;
    }

    /**
     * Overrides to add class to grid rows that contain a category container
     * @param visibleRange
     * @param includeNonDirtyRows
     */
    public _drawRowsInternal(visibleRange: number[], includeNonDirtyRows: boolean): {
        rowsFragment: DocumentFragment;
        gutterFragment: DocumentFragment;
    } {
        // Generate JQuery using super class
        var retVal = super._drawRowsInternal(visibleRange, includeNonDirtyRows);
        // Get all grid category rows and add class
        if (retVal.rowsFragment !== undefined) {
            var $categoryGridRows = $(retVal.rowsFragment.querySelectorAll(".process-states-grid-category-container")).closest(".grid-row");
            $categoryGridRows.addClass("process-states-grid-category-row");
        }
        return retVal;
    }
}
