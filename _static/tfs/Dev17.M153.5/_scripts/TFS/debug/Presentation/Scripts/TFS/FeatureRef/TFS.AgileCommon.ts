// TODO: Ajay: Adding process settings helper back once all the consumers are updated. Only consumer is admin page

/// <reference types="jquery" />

import VSS = require("VSS/VSS");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import { WorkItemTypeColor } from "TFS/WorkItemTracking/Contracts";
import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");
import Diag = require("VSS/Diag");
import Service = require("VSS/Service");
import Events_Services = require("VSS/Events/Services");
import Context = require("VSS/Context");

export enum StateType {
    Proposed = 1,
    InProgress = 2,
    Complete = 3,
    Requested = 4,
    Received = 5,
    Reviewed = 6,
    Declined = 7,
    Resolved = 8,
};

export interface IIterationData {
    /** The node name (not including any path components), e.g. "Iteration 1" **/
    name: string;
    /** The node display text, e.g. 'Iteration 1 - 2/10/2016 - 2/17/2016" **/
    displayText: string;
    /** The node path. The path should end with the name, e.g. "\Test Project\Iteration\Iteration 1" **/
    path: string;
    /** The node friendly path, e.g. "Test Project\Iteration 1" **/
    friendlyPath: string;
    /** The node id. Generally a GUID **/
    id: string;
    /** The iteration start date **/
    startDate?: string;
    /** The iteration finish (end) date **/
    finishDate?: string;
}

/**Interface for team field data, contains a value and a optional flag to indicate if it's children are included */
export interface ITeamFieldData {
    /** team field value */
    value: string;
    /** indicate if the team field has children */
    includeChildren?: boolean;
}

export interface IWeekendData {
    canEditWeekends: boolean;
    days: number[];
}

export interface ITeamSettings {
    /** The team owning the team settings */
    teamId: string;
    teamName: string;

    projectId: string;
    backlogIteration: IIterationData;
    currentIteration: IIterationData;
    defaultIteration?: IIterationData;
    futureIterations: IIterationData[];
    previousIterations: IIterationData[];
    teamFieldDefaultValue: string;
    teamFieldName: string;
    teamFieldValues: ITeamFieldData[];
    showBugCategoryWorkItem: boolean;
    bugsBehavior: number;
    /** Category Ref Name -> Visibility. (Server-side serialization cannot be easily controlled. Also, this encourages & reminds use of custom comparer.) */
    backlogVisibilities: IDictionaryStringTo<boolean>;
    weekends: IWeekendData;
    referencedNodes: IReferencedNodes;
}

/** Used in INode */
export enum INodeStructureType {
    Project = 0,
    Area = 1,
    Iteration = 2
}

/** Some data types may reference nodes before the nodes are available, they can provide data about the nodes referenced as a IReferencedNodes object */
export interface IReferencedNodes {
    areaNodes: IReferencedNode[],
    iterationNodes: IReferencedNode[]
}

/** A minimal version of INode for ReferencedNodes. This allows the rule engine to validate nodes referenced */
export interface IReferencedNode {
    id: number;
    name: string;
    path: string;
}

export interface INode {
    id: number;
    name: string;
    guid?: string;
    structure: INodeStructureType;
    type?: number;
    children: INode[];
    parent?: INode;
    startDate?: Date;
    finishDate?: Date;
}

export interface IBacklogCategoryState {
    type: StateType;
    value: string;
}

export interface ICategoryConfiguration {
    plural: string;
    singular: string;
    category: string;
    states: IBacklogCategoryState[];
    workItemTypeNames: string[];
}

export interface ITypeField {
    name: string;
    type: number;
}

export interface IBacklogCategoryConfigurationData {
    plural: string;
    singular: string;
    category: string;
    parentCategory: string;
    workItemCountLimit: number;
    states: IBacklogCategoryState[];
}

export class BacklogCategoryConfiguration implements ICategoryConfiguration {
    public plural: string;
    public singular: string;
    public category: string;
    public parentCategory: string;
    public workItemCountLimit: number;
    public states: IBacklogCategoryState[];

    public workItemTypeNames: string[];
    public parent: BacklogCategoryConfiguration;
    public child: BacklogCategoryConfiguration;
    public isRequirementCategory: boolean;
    public defaultWorkItemType: string;

    constructor(data: IBacklogCategoryConfigurationData) {
        this.plural = data.plural;
        this.singular = data.singular;
        this.category = data.category;
        this.parentCategory = data.parentCategory;
        this.workItemCountLimit = data.workItemCountLimit;
        this.states = data.states;
    }

    public containsWorkItemType(workItemTypeName: string) {
        return Utils_Array.contains(this.workItemTypeNames, workItemTypeName, Utils_String.localeIgnoreCaseComparer);
    }
}

export interface IProjectProcessConfigurationData {
    taskBacklog: BacklogCategoryConfiguration;
    requirementBacklog: BacklogCategoryConfiguration;
    portfolioBacklogs: BacklogCategoryConfiguration[];
    allBacklogs: BacklogCategoryConfiguration[];

    bugWorkItems: ICategoryConfiguration;

    workItemCategories: IDictionaryStringTo<string[]>;
    typeFields: ITypeField[];
    weekends: number[];

    defaultWorkItemTypes: IDictionaryStringTo<string>;

    workItemColors: { name: string, primary: string, secondary: string }[];
}

export class ProjectProcessConfiguration {
    public static StateType: typeof StateType = StateType;
    public static FieldType: { [fieldType: string]: number } = {
        Effort: 1,
        Order: 2,
        RemainingWork: 3,
        Team: 4,
        Activity: 5,
        Requestor: 6,
        ApplicationType: 7,
        ApplicationStartInformation: 8,
        ApplicationLaunchInstructions: 9,
        FeedbackNotes: 10,
        ClosedDate: 11
    };

    public taskBacklog: BacklogCategoryConfiguration;
    public requirementBacklog: BacklogCategoryConfiguration;
    public portfolioBacklogs: BacklogCategoryConfiguration[];
    public allBacklogs: BacklogCategoryConfiguration[];

    public bugWorkItems: ICategoryConfiguration;

    public workItemCategories: { [key: string]: string[]; };
    public typeFields: ITypeField[];
    public weekends: number[];

    public workItemColors: WorkItemTypeColor[];

    private _workItemTypeCategoryMap: { [key: string]: string; };
    private _backlogCategoryNameMap: { [key: string]: BacklogCategoryConfiguration; };
    private _workItemCategoryStateNameTypeMap: { [key: string]: IDictionaryStringTo<StateType>; };

    constructor(data: IProjectProcessConfigurationData) {
        this.taskBacklog = new BacklogCategoryConfiguration(data.taskBacklog);
        this.requirementBacklog = new BacklogCategoryConfiguration(data.requirementBacklog);
        this.portfolioBacklogs = $.map(data.portfolioBacklogs, (backlogData: IBacklogCategoryConfigurationData) => {
            return new BacklogCategoryConfiguration(backlogData);
        });
        this.allBacklogs = this.portfolioBacklogs.concat([this.requirementBacklog, this.taskBacklog]);

        this._workItemTypeCategoryMap = {};
        this._backlogCategoryNameMap = {};
        this._workItemCategoryStateNameTypeMap = {};

        // Create the list of typed portfolio backlogs and attach pointers to parent/child backlog to each one.
        this.workItemCategories = data.workItemCategories;

        var previous: BacklogCategoryConfiguration = null;
        $.each(this.allBacklogs, (i: number, backlog: BacklogCategoryConfiguration) => {
            if (previous !== null) {
                previous.child = backlog;
                backlog.parent = previous;
            }
            previous = backlog;
            backlog.workItemTypeNames = data.workItemCategories[backlog.category];
            backlog.isRequirementCategory = (backlog === this.requirementBacklog);
            backlog.defaultWorkItemType = data.defaultWorkItemTypes[backlog.category];

            // Add work item type information to our cache so we get fast lookup from wit -> category later.
            $.each(backlog.workItemTypeNames || [], (i: number, type: string) => {
                this._workItemTypeCategoryMap[type] = backlog.category;
            });

            // Add a reference to this backlog to our cache so we get fast lookup from refname -> backlog later.
            this._backlogCategoryNameMap[backlog.category] = backlog;
        });

        this.bugWorkItems = data.bugWorkItems;
        if (this.bugWorkItems) {
            this.bugWorkItems.workItemTypeNames = data.workItemCategories[this.bugWorkItems.category];
            $.each(this.bugWorkItems.workItemTypeNames, (i: number, type: string) => {
                //don't overwrite the category for workitemtypes which are already part of a backlog category
                if (!this._workItemTypeCategoryMap[type]) {
                    this._workItemTypeCategoryMap[type] = this.bugWorkItems.category;
                }
            });
        }

        this.typeFields = data.typeFields;
        this.weekends = data.weekends;

        if (data.workItemColors) {
            this.workItemColors = $.map(data.workItemColors, (item) => {
                return { primaryColor: item.primary, secondaryColor: item.secondary, workItemTypeName: item.name }
            });
        }
    }

    public getCategoryForWorkItemType(workItemTypeName: string): string {
        return this._workItemTypeCategoryMap[workItemTypeName];
    }

    public getCategoryForCategoryRefName(categoryRefName: string): BacklogCategoryConfiguration {
        return this._backlogCategoryNameMap[categoryRefName];
    }

    public getTypeField(fieldType: any /*ProjectProcessConfiguration.FieldType*/): ITypeField {
        Diag.Debug.assertParamIsNumber(fieldType, "fieldType");

        return Utils_Array.first(this.typeFields, tf => tf.type === fieldType);
    }

    /**
     * Retrieves the map of [state name, meta type] pairs for use in determining which metastate group a state belongs to
     *
     * @param backlogCategoryName The backlog category refname for which we are retrieving state mappings.
     * @return An object where properties are state names and values are meta state types
     */
    public getStateNameTypeMap(backlogCategoryName: string): IDictionaryStringTo<StateType> {
        let stateNameTypeMap = this._workItemCategoryStateNameTypeMap[backlogCategoryName];
        if (!stateNameTypeMap) {
            stateNameTypeMap = {};

            //first check if the category belongs to backlogs
            if (this.allBacklogs) {
                $.each(this.allBacklogs, (i, backlog: BacklogCategoryConfiguration) => {
                    if (Utils_String.ignoreCaseComparer(backlogCategoryName, backlog.category) === 0) {
                        $.each(backlog.states, (i, backlogState: IBacklogCategoryState) => {
                            stateNameTypeMap[backlogState.value] = backlogState.type;
                            stateNameTypeMap[backlogState.value.toUpperCase()] = backlogState.type; // add the uppercase variant to allow consumers to always check without casing issues
                            stateNameTypeMap[backlogState.value.toLowerCase()] = backlogState.type; // add the lowercase variant to allow consumers to always check without casing issues
                        });
                        // obtained the stateNameTypeMap, so break out of the loop
                        return (false);
                    }
                });
            }

            //if category requested is the bug category
            if (this.bugWorkItems && Utils_String.ignoreCaseComparer(backlogCategoryName, this.bugWorkItems.category) === 0) {
                $.each(this.bugWorkItems.states, (i, backlogState: IBacklogCategoryState) => {
                    stateNameTypeMap[backlogState.value] = backlogState.type;
                    stateNameTypeMap[backlogState.value.toUpperCase()] = backlogState.type; // add the uppercase variant to allow consumers to always check without casing issues
                    stateNameTypeMap[backlogState.value.toLowerCase()] = backlogState.type; // add the lowercase variant to allow consumers to always check without casing issues
                });
            }

            this._workItemCategoryStateNameTypeMap[backlogCategoryName] = stateNameTypeMap;
        }
        return stateNameTypeMap;
    }

    /**
     * Retrieves the metastate for the state of a work item type
     *
     * @param workItemTypeName The work item type for which we are are checking the state.
     * @return Value for metastate that would map to ProjectProcessConfiguration.StateType
     */
    public getBacklogItemStateType(workItemTypeName: string, workItemState: string): StateType {
        Diag.Debug.assertParamIsStringNotEmpty(workItemTypeName, "workItemTypeName");
        Diag.Debug.assertParamIsStringNotEmpty(workItemState, "workItemState");

        if (workItemTypeName && workItemTypeName !== '') {
            //get the RefName for the category that the work item type belongs to
            var witCategoryRefName = this.getCategoryForWorkItemType(workItemTypeName);

            if (witCategoryRefName && witCategoryRefName !== '') {
                //get the state to metastate mappings for the category
                var stateNameTypeMap = this.getStateNameTypeMap(witCategoryRefName);

                if (stateNameTypeMap) {
                    //return metastate corresponding to the requested state
                    return stateNameTypeMap[workItemState.toLowerCase()];
                }
            }
        }
        return undefined;
    }

    /**
     * Return true if work item type is a requirement category.
     * @param workItemTypeName the name of work item type.
     */
    public isRequirementCategory(workItemTypeName: string): boolean {
        return this.requirementBacklog && this.requirementBacklog.containsWorkItemType(workItemTypeName);
    }

    /**
     * Return true if work item type is a task category.
     * @param workItemTypeName the name of work item type.
     */
    public isTaskCategory(workItemTypeName: string): boolean {
        return this.taskBacklog && this.taskBacklog.containsWorkItemType(workItemTypeName);
    }

    /**
     * Return true if work item type is a bug category.
     * @param workItemTypeName the name of work item type.
     */
    public isBugCategory(workItemTypeName: string): boolean {
        return this.bugWorkItems && this.bugWorkItems.workItemTypeNames && Utils_Array.contains(this.bugWorkItems.workItemTypeNames, workItemTypeName, Utils_String.localeIgnoreCaseComparer);
    }
}

export enum BugsBehavior {
    Off = 0,
    AsRequirements,
    AsTasks
}

/**
* Provides access to process configuration for a given project.
*/
export class ProjectProcessConfigurationService extends TFS_Service.TfsService {
    public static PROCESS_SETTINGS_LOADED_EVENT: string = "ProcessConfigService.SettingsLoaded";
    private _processSettings: ProjectProcessConfiguration;
    private _processSettingsInternal: any;
    private _checkedForDataIsland: boolean;

    /**
     * Obtains the project process settings for the current project.
     *
     * @param successCallback The success callback (receives the settings object).
     * @param errorCallback The error callback.
     * @param additionalActionUrlArgs Any additional parameters for the get action url call
     */
    public beginGetProcessSettings(successCallback: IResultCallback, errorCallback?: IErrorCallback, additionalActionUrlArgs?: any) {
        var onSuccess = (settings: IProjectProcessConfigurationData) => {
            if (!this._processSettings) {
                this._processSettings = new ProjectProcessConfiguration(settings);
            }
            successCallback.apply(this, [this._processSettings]);
        }

        // Check for the data island containing the process settings.
        this._checkDataIsland();

        // Merge default args with additional args if supplied
        var args: any = { area: "api" };
        if (additionalActionUrlArgs) {
            args = $.extend(additionalActionUrlArgs, args);
        }

        VSS.queueRequest(this, this, "_processSettingsInternal", onSuccess, errorCallback, (succeeded: IResultCallback, failed: IErrorCallback) => {
            var that: ProjectProcessConfigurationService = this;
            var url = this.getTfsContext().getActionUrl("getProcessSettings", "processConfiguration", args);
            function fireNotificationAndSucceed(settings: IProjectProcessConfigurationData) {
                that._fireProcessSettingsLoaded(settings);
                succeeded.apply(this, arguments);
            }
            Ajax.getMSJSON(url, null, fireNotificationAndSucceed, failed);
        });
    }

    /**
     * Checks the data island for the process settings.
     */
    private _checkDataIsland() {
        var $dataIsland: JQuery;

        // Check for the data island containing the process settings if we have not already.
        if (!this._checkedForDataIsland) {
            this._checkedForDataIsland = true;
            $dataIsland = $(".process-settings-data");

            if ($dataIsland.length > 0) {
                this._processSettingsInternal = Utils_Core.parseMSJSON($dataIsland.eq(0).html(), false);
                $dataIsland.eq(0).empty();
                this._fireProcessSettingsLoaded(this._processSettingsInternal);
            }
        }
    }

    /**
      * Returns the the process settings if they have already been loaded or are in
      * a data island of the page.  If the process settings are not available, undefined
      * will be returned.
      *
      * NOTE: Use the beginGetProcessSettings method if you are not sure that the settings have already been loaded.
      *
      * @return See documentation in beginGetProcessSettings for process settings object structure.
      */
    public getProcessSettings(): ProjectProcessConfiguration {
        // Check for the data island containing the process settings.
        this._checkDataIsland();
        if (!this._processSettings && this._processSettingsInternal) {
            this._processSettings = new ProjectProcessConfiguration(this._processSettingsInternal);
        }

        return this._processSettings;
    }

    private _fireProcessSettingsLoaded(settings: IProjectProcessConfigurationData) {
        Events_Services.getService().fire(ProjectProcessConfigurationService.PROCESS_SETTINGS_LOADED_EVENT, settings);
    }
}

export class TeamService extends TFS_Service.TfsService {
    private _teamMembers: any;

    constructor() {
        super();

        this._teamMembers = {};
    }

    public beginGetTeamMembers(teamIdentity: string, includeGroups: any, maxResults: number, callback: (members: TFS_OM_Identities.ITeamFoundationIdentityData[]) => void, errorCallback?: IErrorCallback) {
        var key: string;
        var tfsContext = this.getTfsContext();

        if (!teamIdentity) {
            Diag.Debug.assertIsNotNull(tfsContext.currentTeam, "Current context is not a team context.");

            teamIdentity = tfsContext.currentTeam.identity.id;
        }

        maxResults = maxResults || 100;
        includeGroups = Boolean(includeGroups);

        key = teamIdentity + "|" + maxResults + "|" + includeGroups;

        VSS.queueRequest(this, this._teamMembers, key, callback, errorCallback, function (succeeded: IResultCallback, failed: IErrorCallback) {
            var url = tfsContext.getActionUrl("members", "teams", { area: "api" });

            Ajax.getMSJSON(url, { teamId: teamIdentity, maxResults: maxResults, includeGroups: includeGroups }, function (memberResult: any) {
                succeeded(memberResult.members);
            }, failed);
        });
    }
}