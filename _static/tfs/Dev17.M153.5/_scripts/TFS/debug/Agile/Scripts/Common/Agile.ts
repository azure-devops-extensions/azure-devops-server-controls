///<amd-dependency path="jQueryUI/effect"/>
/// <reference types="jquery" />

import { IBacklogGridItem } from "Agile/Scripts/Backlog/Events";
import AgileResources = require("Agile/Scripts/Resources/TFS.Resources.Agile");
import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_AgileCommon = require("Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon");
import TFS_TeamAwarenessService = require("Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService");
import TFS_OM = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_FeatureLicenseService = require("Presentation/Scripts/TFS/TFS.FeatureLicenseService");
import Diag = require("VSS/Diag");
import Service = require("VSS/Service");
import Events_Action = require("VSS/Events/Action");
import Events_Handlers = require("VSS/Events/Handlers");
import Events_Services = require("VSS/Events/Services");
import Navigation_Services = require("VSS/Navigation/Services");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import VSS = require("VSS/VSS");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { IFieldIdValue, IProjectData } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import WITConstants = require("WorkItemTracking/Scripts/OM/WorkItemConstants");
import Work_Contracts = require("TFS/Work/Contracts");
import { BacklogConfigurationService, IBacklogLevelConfiguration } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import { IBacklogMembershipEvaluator } from "Agile/Scripts/Common/IBacklogMembershipEvaluator";
import { ITeam } from "Agile/Scripts/Models/Team";
import { handleError } from "VSS/VSS";
import { haveBacklogManagementPermission } from "WorkItemTracking/Scripts/Utils/PermissionHandler";

var TeamAwarenessService = TFS_TeamAwarenessService.TeamAwarenessService;
var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
var ActionManager = Events_Action.getService();
var delegate = Utils_Core.delegate;

export function IsWebAccessAsyncEnabled() {
    var navigation = tfsContext.navigation;
    var currentController = navigation.currentController;
    var currentAction = navigation.currentAction;
    return currentController.toLowerCase() === "backlogs"
        && (currentAction.toLowerCase() === "backlog" || currentAction.toLowerCase() === "index" || currentAction.toLowerCase() === "iteration");
}

/** Check if user has advanced backlog features licensed. */
export function areAdvancedBacklogFeaturesEnabled(isRequirementBacklog: boolean = true): boolean {
    // Note: These two licenses will probably be merged in the future, so we allow to default to 
    // AdvancedBacklogManagement for now.

    if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.EnableBacklogManagementPermission)) {
        return haveBacklogManagementPermission();
    }

    var isAdvancedBacklog: boolean = false;
    if (isRequirementBacklog) {
        isAdvancedBacklog = haveBacklogManagementPermission();
    } else {
        isAdvancedBacklog = TFS_FeatureLicenseService.FeatureLicenseService.isFeatureActive(ServerConstants.LicenseFeatureIds.AdvancedPortfolioBacklogManagement);
    }
    return isAdvancedBacklog;
}

export interface IErrorActionArgs {
    message: string;
    content?: JQuery;
}

/**
 * Values to support Agile related actions
 */
export class Actions {
    public static BACKLOG_NAVIGATE: string = "VSS.Agile.Backlogs.Navigate";

    public static EVALUATE_MEMBERSHIP: string = "VSS.Agile.Backlogs.EvaluateMembership";
    public static CHANGE_TEAM_WORK_IN_PROGRESS_LIMIT: string = "VSS.Agile.Boards.ChangeWipLimit";

    public static BACKLOG_BULK_EDIT_EVALUATE_MEMBERSHIP: string = "VSS.Agile.Backlogs.BulkEdit.EvaluateMembership";

    public static BACKLOG_MOVE_TO_ITERATION: string = "VSS.Agile.Backlogs.MoveToIteration";

    /** Trigger explicit membership check for the backlog */
    public static VERIFY_MEMBERSHIP_EXPLICIT: string = "verify-membership";

    public static BACKLOG_SHOW_ERROR_MESSAGE: string = "backlog-show-error-message";

    /** Filter a selection of work items on the backlog */
    public static BACKLOG_FILTER_SELECTION: string = "backlog-filter-selection";

    public static LAUNCH_FILTER_CONTROL: string = "launch-filter-control";

    public static MAPPING_PANE_REPARENT: string = "mapping-pane-reparent";

    public static BACKLOG_ERROR = "backlog-error";
}

/**
 * Interface implemented by backlog pages third-party extensions.
 */
export interface IContributedPanel {
    /**
     * Handles notification of work items selection changed in the backlog pages.
     */
    workItemSelectionChanged?: (selectedWorkItems: IBacklogGridItem[]) => void;
}

export interface IMoveToIterationActionArgs {
    workItemIds: number[];
    iterationPath: string;
}

export interface IBacklogNavigationActionArgs {
    /** Uri to navigate to */
    uri: string;

    /** Backlog level name  */
    level: string;
}

// Register fallback navigation handler
ActionManager.registerActionWorker(Actions.BACKLOG_NAVIGATE, (actionArgs: IBacklogNavigationActionArgs) => {
    Diag.Debug.assertIsStringNotEmpty(actionArgs.uri, "uri");

    // Trigger real navigation
    window.location.href = actionArgs.uri;
}, 1000);

export class DragDropScopes {
    public static WorkItem = "work-item";
    public static IterationBacklog = "work-item";
    public static ProductBacklog = "work-item";
}

export class DataKeys {
    public static DataKeyId = "item-id";
    public static DataKeyType = "item-type";
}

export interface IChangeWorkItemIterationActionArgs {
    workItemId: number;
    iterationPath: string;
}

export interface IEvaluateMembershipActionArgs {
    workItem: WITOM.WorkItem;
    sendResult(isMember: boolean): void;
}

/** Action arguments for BACKLOG_FILTER_SELECTION action */
export interface IBacklogFilterWorkItemsActionArgs {
    /** Work Item Ids to filter */
    selectedWorkItemIds: number[];
}

export interface IBacklogBulkEditEvaluateMembershipActionArgs {
    workItems: WITOM.WorkItem[];
    changes: IFieldIdValue[];
}

export class Notifications {

    public static MEMBERSHIP_EVALUATED: string = "VSS.Agile.Backlog.MembershipEvaluated";
    public static BACKLOG_QUERY_SAVE_COMPLETED: string = "VSS.Agile.Backlog.BacklogQuerySaveCompleted";
    public static BACKLOG_ITEM_ADDED: string = "VSS.Agile.Backlog.BacklogItemAdded";

    /**
     * Values to support Agile related notifications
     */
    constructor() {
    }
}

/** Allows to suppress membership evaluation messages per work item */
export interface IMessageSuppressor {
    suppress(workItemId: number): void;
    unsuppress(workItemId: number): void;
    isSuppressed(workItemId: number): boolean;
    suppressAll(): void;
    disableSuppressAll(): void;
}

export class MembershipTracker {
    private _eventHelper: ScopedEventHelper;

    public constructor(eventHelper: ScopedEventHelper) {
        this._eventHelper = eventHelper;
        this._setupMembershipTracking();
    }

    /**
     * When work items are saved or refreshed, check whether they are still a "member"
     * of the current experience. If not, raise the notification that the work item is not a member.
     * 
     * @param source The source of the work item change
     * @param args The work item change arguments
     * @param evaluationCompleteCallback Optional Callback that will be called after membership evaluation is complete; boolean indicating whether the item is a member is provided
     */
    public verifyMembership = (source: WorkItemManager, args?: WITOM.IWorkItemChangedArgs, evaluationCompleteCallback?: (isMember: boolean) => any) => {
        Diag.Debug.assertParamIsObject(args, "args");
        const change = args.change;

        if (change === WITConstants.WorkItemChangeType.SaveCompleted) {
            Diag.Debug.assertParamIsObject(args.workItem, "args.workItem");

            const workItem = args.workItem;
            const actionArgs = {
                workItem: workItem,
                sendResult: (isMember: boolean) => {
                    Diag.Debug.assertParamIsBool(isMember, "isMember");
                    if ($.isFunction(evaluationCompleteCallback)) {
                        evaluationCompleteCallback(isMember);
                    }
                    if (this._eventHelper) {
                        this._eventHelper.fire(Notifications.MEMBERSHIP_EVALUATED, source, { workItem: workItem, isMember: isMember, changedFields: args.changedFields });
                    }
                }
            };

            ActionManager.performAction(Actions.EVALUATE_MEMBERSHIP, actionArgs);
        }
    }

    /**
     * Detach events and actions
     */
    public dispose() {
        ActionManager.unregisterActionWorker(Actions.EVALUATE_MEMBERSHIP, this._alwaysAMember);
        WorkItemManager.get(TFS_OM.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore)).detachWorkItemChanged(this.verifyMembership);
        this._eventHelper = null;
    }

    /**
     * Setup membership tracking on work item changes
     */
    private _setupMembershipTracking() {
        // register default membership evaluator
        ActionManager.registerActionWorker(Actions.EVALUATE_MEMBERSHIP, this._alwaysAMember, Events_Action.ActionService.MaxOrder);

        // listen for work item changes and check membership, raising a notification if the work item is not a member
        WorkItemManager.get(TFS_OM.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore)).attachWorkItemChanged(this.verifyMembership);
    }

    /**
     * Action worker that evaluates membership - simply returns true for all work items.
     * Specific actions workers should be registered for each experience that determines membership and
     * return true if the work item is a member, or false otherwise.
     * 
     * @param actionArgs An object containing the workItem to evaluate (workItem)
     *  and a callback (sendResult) for the result.
     * @param next The next action work to call if not handled by this action worker
     */
    private _alwaysAMember(actionArgs: IEvaluateMembershipActionArgs, next: Function) {
        Diag.Debug.assertParamIsObject(actionArgs.workItem, "actionArgs.workItem");
        Diag.Debug.assertParamIsFunction(actionArgs.sendResult, "actionArgs.sendResult");

        actionArgs.sendResult(true);
    }
}

/** 
 * Represents the agileContext object in the iteration payload JSON.
 * Should be kept in sync with AgileContext HtmlHelper 
 */
export interface IAgileContextData {
    iteration: {
        name: string,
        path: string,
        id: string,
        start?: Date,
        finish?: Date
    }
}

export class AgileContext extends Service.VssService {
    private static _context: IAgileContextData;

    constructor() {
        /**
         * A collection-level service that provides services around the Agile experience's context.
         */
        super();
    }

    /**
     * Get the current Agile context information (if it exists) or null
     * 
     * @return 
     * {
     *     iteration: {
     *         id: GUID string,
     *         path: The path for the iteration
     *         name: The name of the iteration
     *         start: The start date of the sprint (or null if none is set)
     *         finish: The finish date of the sprint (or null if none is set)
     *     }
     * }
     * 
     */
    public getContext(): IAgileContextData {
        if (!AgileContext._context) {
            AgileContext._context = Utils_Core.parseJsonIsland($(document), ".agile-context");
        }
        return AgileContext._context;
    }

    public setContext(context: IAgileContextData): void {
        AgileContext._context = context;
    }
}

/**
 * Represents the backlogContext object in the backlog payload JSON.
 * Should be kept in sync with the server's BacklogContext.cs serialization. 
 */
export interface IBacklogContextData {
    /** Id of the team owning the backlog */
    team: ITeam;

    levelName: string;

    includeParents: boolean;
    showInProgress: boolean;
    portfolios: string[];

    // Don't use.
    actionNameFromMru?: string;
    updateUrlActionAndParameter: boolean;
}

/**
 * Maintain a mapping of project ids to project names to be more resilient when projects are renamed.
 *
 * When WIT meta data is received, information about a rename of the current project might be included in it. To
 * allow subsequent operations to correctly compare classification paths, we maintain a mapping of project id (which
 * does not change) to names encountered for that project. When performing comparisons where a project name is included
 * all known names can then be used. This doesn't cover every possible scenario, but guards against data loss in
 * currently open work items, for example.
 */
export class AgileProjectMapping {
    private static _instance: AgileProjectMapping;

    public static getInstance() {
        if (!AgileProjectMapping._instance) {
            AgileProjectMapping._instance = new AgileProjectMapping();
        }

        return AgileProjectMapping._instance;
    }

    public static ensureCreated() {
        AgileProjectMapping.getInstance();
    }

    protected _projectMapping: IDictionaryStringTo<string[]> = {};

    constructor() {
        Events_Services.getService().attachEvent(WITConstants.Actions.NEW_PROJECT_DATA, Utils_Core.delegate(this, this._buildProjectMapping));
    }

    /**
     * Get all known project names for the given project id
     * @param projectId Id of project
     */
    public getProjectNames(projectId: string): string[] {
        return this._projectMapping[projectId] || [];
    }

    private _buildProjectMapping(sender: WITOM.WorkItemStore, projects: IProjectData[]): void {
        Diag.Debug.assertIsNotNull(projects);

        if (projects) {
            for (let project of projects) {
                if (!this._projectMapping[project.guid]) {
                    this._projectMapping[project.guid] = [];
                }

                this._projectMapping[project.guid].push(project.name);
            }
        }
    }
}

// Ensure an instance is created so that every event fired by WIT is captured. 
AgileProjectMapping.ensureCreated();

/** Describes a particular backlog dataset's parameters. */
export class BacklogContext {
    private static JSON_ISLAND_SELECTOR = ".backlog-context";

    protected static _backlogContext: BacklogContext;

    /** Indicates whether the current level is a portfolio level */
    private _isPortfolioInContext: boolean;

    /** Team owning the current backlog */
    public team: ITeam;

    /** This entry backlog level - the level which the data contains, and from which any parents/children are related. */
    public level: IBacklogLevelConfiguration;

    /** Value indicating whether the current backlog level is the requirement level */
    public isRequirement: boolean;

    /** Whether the backlog data includes parent levels. */
    public includeParents: boolean;

    /** Whether the backlog data includes items in the InProgress meta-state. */
    public showInProgress: boolean;

    /* The portfolio backlog levels' plural names. */
    public portfolios: string[];

    /** Whether this backlog data is for the backlog action. */
    public isBacklog: boolean;

    /** Whether the current url context has to be updated to match appropriate action and parameters. */
    public updateUrlActionAndParameter: boolean;

    /** The name of the action requested. */
    public actionNameFromMru: string;

    /** Returns the default backlog context for the current page by finding the JSON island. */
    public static getInstance(): BacklogContext {
        if (!BacklogContext._backlogContext) {
            BacklogContext._backlogContext = new BacklogContext();
        }

        return BacklogContext._backlogContext;
    }

    /** Resets the default backlog context for the current page */
    public static resetInstance(): void {
        if (BacklogContext._backlogContext) {
            BacklogContext._backlogContext = null;
        }
    }

    constructor() {
        this._setupConfigurationData();
    }

    /** Updates the current backlog context using the input context data. */
    public setBacklogContextData(backlogContextData: IBacklogContextData) {
        this._setupConfigurationData(backlogContextData);
    }

    /** Returns a value indicating whether the given backlogLevelConfiguration is the current hub level */
    public isHubContext(backlog: IBacklogLevelConfiguration): boolean {
        return Utils_String.ignoreCaseComparer(this.level.name, backlog.name) === 0;
    }

    /** Returns a value indicating whether the given portfolio name is in the current list of portfolios */
    public isInPortfolios(portfolioName: string): boolean {
        return $.inArray(portfolioName, this.portfolios) !== -1;
    }

    /** Returns a value indicating whether the current backlog level is a portfolio */
    public isPortfolioInContext(): boolean {
        return this._isPortfolioInContext;
    }

    /** Returns a value indicating whether the given work item type name is in the current level */
    public backlogContainsWorkItemType(workItemTypeName: string): boolean {
        if (this.level && this.level.workItemTypes) {
            return Utils_Array.contains(this.level.workItemTypes, workItemTypeName, Utils_String.localeIgnoreCaseComparer);
        }

        return false;
    }

    /**
     * Sets up the current backlog context using the input context data.
     */
    private _setupConfigurationData(backlogContextData?: IBacklogContextData) {
        if (!backlogContextData) {
            var $jsonIsland = $(BacklogContext.JSON_ISLAND_SELECTOR);
            if ($jsonIsland.length > 0) {
                backlogContextData = Utils_Core.parseMSJSON($jsonIsland.html(), false).backlogContext;
                $jsonIsland.empty();
            }
        }

        if (backlogContextData) {
            this.level = BacklogConfigurationService.getBacklogConfiguration(null, backlogContextData.team.id).getBacklogByDisplayName(backlogContextData.levelName);
            Diag.Debug.assertIsNotNull(this.level, "Backlog level configuration is required");

            this.team = backlogContextData.team;
            this.isRequirement = Utils_String.equals(BacklogConfigurationService.getBacklogConfiguration(null, backlogContextData.team.id).requirementBacklog.name, backlogContextData.levelName, true);

            this._isPortfolioInContext = BacklogConfigurationService.getBacklogConfiguration(null, backlogContextData.team.id).portfolioBacklogs.some(lvl => Utils_String.equals(lvl.id, this.level.id, true));

            this.includeParents = backlogContextData.includeParents;
            this.portfolios = backlogContextData.portfolios;
            this.showInProgress = backlogContextData.showInProgress;
            this.updateUrlActionAndParameter = backlogContextData.updateUrlActionAndParameter;
            this.actionNameFromMru = backlogContextData.actionNameFromMru;
        }
    }
}

export abstract class BaseBacklogMembershipEvaluator implements IBacklogMembershipEvaluator {
    public _backlogContext: BacklogContext;
    public _teamSettings: TFS_AgileCommon.ITeamSettings;

    protected _teamId: string;

    constructor(teamId: string) {
        this._teamId = teamId;
    }

    /**
     * Get the team and common settings that are needed for performing backlog membership tests
     *
     * @param callback Callback to invoke when settings have been retrieved
     */
    public _beginGetSettings(callback: IResultCallback) {
        Diag.Debug.assertParamIsFunction(callback, "callback");

        var sync = () => {
            // Sync block for parallel Ajax calls
            if (BacklogContext.getInstance() && this._teamSettings) {
                callback();
            }
        };

        if (this._teamSettings) {
            callback(); // If the settings are already cached then invoke callback immediately
        } else {
            const tfsProjectCollection = TFS_OM.ProjectCollection.getConnection(tfsContext);
            const teamAwarenessService = tfsProjectCollection.getService<TFS_TeamAwarenessService.TeamAwarenessService>(TeamAwarenessService);

            // Try to get the settings synchronously first
            const teamSettings = teamAwarenessService.getTeamSettings(this._teamId);
            if (teamSettings) {
                this._teamSettings = teamSettings;
                sync();
            } else {
                teamAwarenessService.beginGetTeamSettings(this._teamId).then(teamSettings => {
                    this._teamSettings = teamSettings;
                    sync();
                }, handleError);
            }
        }
    }

    /**
     * Perform the backlog membership evaluation
     * 
     * @param workItem The work item we are evaluating
     * @param callback 
     *     Callback to invoke when evaluation is complete. A single Boolean argument will be passed to this callback:
     *     True if membership is valid, otherwise false.
     * 
     */
    public evaluate(workItem: WITOM.WorkItem, callback: IResultCallback) {
        Diag.Debug.assertParamIsObject(workItem, "workItem");
        Diag.Debug.assertParamIsFunction(callback, "callback");

        this._beginGetSettings(() => {
            if (this._isValid(workItem)) {
                callback(true); // true = backlog membership is valid
            }
            else {
                callback(false); // false = backlog membership is not valid
            }
        });
    }

    /**
     * Internal membership validity check
     * 
     * @param workItem The item that needs to be evaluated for membership
     */
    protected abstract _isValid(workItem);

    /**
     * Checks whether the team field is valid for backlog membership
     * 
     * @param fieldValue The team field value we are evaluating
     * @return True if the team field is valid, otherwise false
     */
    public _isTeamFieldValid(fieldValue: string): boolean {
        if (!fieldValue) {
            return false;
        }
        Diag.Debug.assertIsObject(this._teamSettings, "Ensure that _beginGetSettings has been called before this function");

        // Loop over the projectNames which map to the project guid. Typically it will be only one item.
        // Get the projectName to compare in order to deal with project rename scenario.
        var projectNames = AgileProjectMapping.getInstance().getProjectNames(this._teamSettings.projectId);

        var teamFieldValues = this._teamSettings.teamFieldValues;

        return teamFieldValues.some(teamFieldValue =>
            ClassificationPathUtils.isClassificationPathEqualOrUnderRelative(
                projectNames, fieldValue, teamFieldValue.value, teamFieldValue.includeChildren));
    }

    /**
     * Checks whether the given iteration path value for a work item is valid according to the current team's backlog iteration
     * @param fieldValue Work item iteration path value
     */
    protected _isBacklogIterationPathValid(fieldValue: string): boolean {
        return this._isIterationPathValid(fieldValue, this._teamSettings.backlogIteration.friendlyPath);
    }

    /**
     * Checks whether the given iteration path value for a work item is valid according to the given iteration path
     * @param fieldValue Work item iteration path value
     * @param iterationPath Iteration path to check against
     */
    protected _isIterationPathValid(fieldValue: string, iterationPath: string): boolean {
        var projectNames = AgileProjectMapping.getInstance().getProjectNames(this._teamSettings.projectId);

        return ClassificationPathUtils.isClassificationPathEqualOrUnderRelative(
            projectNames, fieldValue, iterationPath, true);
    }
}

VSS.initClassPrototype(BaseBacklogMembershipEvaluator, {
    _processSettings: null,
    _backlogContext: null,
    _teamSettings: null
});

export module ClassificationPathUtils {
    export function isClassificationPathEqualOrUnderRelative(projectNames: string[], pathToCheck: string, basePath: string, includeChildren: boolean): boolean {
        var isValid = _isEqualOrUnder(pathToCheck, basePath, includeChildren);

        if (!isValid) {
            return projectNames.some(
                projectName => _isEqualOrUnder(
                    pathToCheck, ClassificationPathUtils.replaceClassificationRoot(basePath, projectName), includeChildren));
        }

        return isValid;
    }

    function _isEqualOrUnder(pathToCheck: string, basePath: string, includeChildren: boolean) {
        var isValid = false;
        
        var classificationPart = basePath + "\\";

        isValid = WITOM.Field.compareValues(basePath, pathToCheck, true);

        if (!isValid && includeChildren) {
            isValid = Utils_String.startsWith(pathToCheck, classificationPart, Utils_String.localeIgnoreCaseComparer);
        }
        return isValid;
    }

    export function replaceClassificationRoot(path: string, newRoot: string): string {
        return path.replace(/^[^\\]+\s*/, newRoot);
    }
}

export module BacklogQueryManager {

    /**
     * Gets the action URL
     * 
     * @param actionName The name of the action to call
     * @return The action url
     */
    export function _getActionUrl(actionName: string): string {
        Diag.Debug.assertParamIsString(actionName, "actionName");

        return tfsContext.getActionUrl(actionName, BacklogQueryManager.CONTROLLER_NAME, { area: "api" });
    }

    export var CONTROLLER_NAME: string = "Backlog";

	/**
      * Gets a product backlog query name, simulating (but not exactly replicating) the product backlog payload.
      * @param backlogContext The context to generate a WIQL for.
      * @param teamName Name of the team.
    */
    export function getProductBacklogQueryName(backlogContext: BacklogContext, teamName: string): string {
        // NOTE: The backlog query name should be a reasonable default, but cannot
        // describe every aspect of the query. For simplicity, we do not include complex
        // settings such as bugs behavior, show/hide in-progress items, filtering, etc.

        Diag.Debug.assertParamIsObject(backlogContext, "backlogContext");
        Diag.Debug.assertParamIsStringNotEmpty(teamName, "teamName");
        if (!backlogContext || !teamName || teamName.length === 0) {
            return null;
        }

        return Utils_String.format(
            AgileResources.ProductBacklogQueryName_Backlog,
            teamName,
            backlogContext.level.name);
    }

    /**
     * Gets the iteration backlog query for a specific iteration node
     * 
     * @param fields List of field ref names
     * @param iterationId The iteration node guid
     * @param successCallback The success callback
     * @param errorCallback The error callback
     */
    export function beginGetIterationBacklogQuery(fields: any[], iterationId: string, successCallback: IResultCallback, errorCallback?: IErrorCallback) {
        Diag.Debug.assertParamIsArray(fields, "fields");
        Diag.Debug.assertParamIsString(iterationId, "iterationId");
        Diag.Debug.assertParamIsFunction(successCallback, "successCallback");
        Diag.Debug.assertParamIsFunction(errorCallback, "errorCallback");

        var url = BacklogQueryManager._getActionUrl("IterationBacklogQuery");

        Ajax.getMSJSON(url,
            {
                fields: fields,
                iterationId: iterationId
            },
            function (result) {
                successCallback(result.wiql);
            },
            errorCallback);
    }
}

export namespace BacklogHelpers {
    /** Gets the backlog payload for the given level and inclusion parameters.
     * @param teamId The team id
     * @param levelName The plural name of the backlog level to get the payload for.
     * @param includeParents Whether to include parents in the payload.
     * @param successCallback Success handler, given an IBacklogPayload.
     * @param errorCallback Error handler, given an Error.  
     */
    export function beginGetBacklogPayload(teamId: string, levelName: string, includeParents: boolean, successCallback: IResultCallback, errorCallback: IErrorCallback) {
        Diag.Debug.assertParamIsFunction(successCallback, "successCallback");
        Diag.Debug.assertParamIsFunction(errorCallback, "errorCallback");

        const params: { level?: string; includeParents?: boolean; teamId: string; } = {
            teamId
        };

        if (levelName != null) {
            params.level = levelName;
        }

        if (includeParents != null) {
            params.includeParents = includeParents;
        }

        Ajax.getMSJSON(
            tfsContext.getActionUrl("payload", "backlog", { area: "api" }),
            params,
            successCallback,
            errorCallback);
    }
}

export module LinkHelpers {
    /**
     * Generates an action link (URL) for the specified iteration path
     */
    export function generateIterationLink(actionName: string, iterationPath: string, backlogIteration: string): string {
        Diag.Debug.assertParamIsString(actionName, "actionName");
        Diag.Debug.assertParamIsString(iterationPath, "iterationPath");
        Diag.Debug.assertParamIsString(backlogIteration, "backlogIteration");

        // strip off the backlog path
        iterationPath = iterationPath.replace(backlogIteration, "");

        // if this is an aggregate iteration path (e.g. IterationA\IterationB\IterationC) with a backlog iteration path of IterationA
        // then ensure that the separating character (\) is removed from the beginning because prior to this call iterationPath will be 
        // "\IterationB\IterationC"
        iterationPath = iterationPath.replace(/^\\/, "");

        // get the url to the backlog or sprint actions
        if (!iterationPath) {
            if (Utils_String.ignoreCaseComparer(actionName, "board") === 0 ||
                Utils_String.ignoreCaseComparer(actionName, "taskboard") === 0) {
                return generateBacklogLink("board");
            } else {
                return generateBacklogLink("backlog");
            }
        } else {
            return generateLinkWithParams(actionName, iterationPath.split("\\"));
        }
    }

    /** Generates a (#level & #showParents) async backlog URL.
      * @param action      The action name to use in the "_a=" URL hash parameter.
      * @param level       The level plural name to use in the "level" URL hash parameter.
      * @param showParents Whether to include parents - the value to use in the "showParents" URL hash parameter.
      * @returns A fully-formed URL to the backlogs page with the specified parameters. */
    export function getAsyncBacklogLink(action: string, context?: { level?: string; showParents?: boolean }, routeData?: TFS_Host_TfsContext.IRouteData): string {
        Diag.Debug.assertParamIsObject(context, "context");

        var urlState: any = {};

        if (context) {
            if (context.level) {
                urlState.level = context.level;
            }

            if (context.showParents != null) {
                urlState.showParents = context.showParents;
            }
        }

        if (action) {
            urlState._a = action;
        }

        var urlParams = Navigation_Services.HistoryService.serializeState(urlState);
        var url = tfsContext.getActionUrl(null, "backlogs", routeData) + "?" + urlParams;

        return url;
    }

    export function generateBacklogLink(action: string): string {
        /// <summary>Generates an action link (URL) for the given action on the backlog controller, including the current backlog context

        Diag.Debug.assertParamIsString(action, "action");

        // Build url route data from hub and context
        var backlogContext = BacklogContext.getInstance();
        var params = [];

        if (backlogContext && backlogContext.level && backlogContext.level.name) {
            params.push(backlogContext.level.name);
        }

        return generateLinkWithParams(action, params);
    }

    function generateLinkWithParams(action: string, params: string[]): string {
        if (params && params.length > 0) {
            return tfsContext.getActionUrl(action, "backlogs", { parameters: params });
        } else {
            return tfsContext.getActionUrl(action, "backlogs");
        }
    }
}

export module WorkItemReorderHelpers {
    /**
     * Queue a reorder operation
     * @param reorderOperationQueue 
     * @param reorderManager 
     * @param workItemIds 
     * @param parentId 
     * @param prevId 
     * @param nextId 
     * @param reorderPreProcessingCallback OPTIONAL: Function to invoke before performing the reorder operation.  The function should have the following signature:
     *     function reorderPreProcessingCallback(successCallback, errorCallback)
     *
     * The successCallback can optionally be provided with a new work item ID for the work item being reordered (in cases where
     * the work item is being created, the ID will not be known in advance).
     *
     * The reorder operation will be sent to the server only if the reorder preprocessing is successful.
     * @param reorderCompletedCallback OPTIONAL: Function to invoke after the reorder operation is complete to notify the caller who has queued this operation.
     */
    export function queueReorderOperation(
        reorderOperationQueue: TFS_Core_Utils.OperationQueue,
        reorderManager: IReorderManager,
        workItemIds: number[],
        parentId: number,
        prevId: number,
        nextId: number,
        reorderPreProcessingCallback?: (successCallback: (oldReorderWorkItemIds?: number[], newReorderWorkItemIds?: number[]) => void, errorCallback: Function) => void,
        reorderCompletedCallback?: Function) {

        Diag.Debug.assertIsArray(workItemIds, "workItemIds");
        Diag.Debug.assertParamIsNumber(parentId, "parentId");

        var operationCompletedCallback, // This will be set when the operation is invoked.
            reorderOperation: IReorderOperation = {
                ParentId: parentId,
                Ids: workItemIds,
                PreviousId: prevId,
                NextId: nextId,
                preProcessNotCompleted: true,
                blockQueue: true,       // All reorder operations are queued as blocked until the reorderOperation queue gets to the item.
                /**
                 * Callback method for the operation
                 * 
                 * @param reorderManager reordermanager context the operation is in
                 * @param result result of request from server
                 */
                completedCallback: function (reorderManager, result) {
                    Diag.Debug.assert(operationCompletedCallback, "Reorder operation completed without an operation completed callback available.");

                    if ($.isFunction(reorderCompletedCallback)) {
                        reorderCompletedCallback();
                    }

                    // Call the completed callback to allow subsequent operations to be processed.
                    // We want to maintain the order of operations, if anything has failed we do not 
                    // call the callback to continue operations
                    if (result.success) {
                        operationCompletedCallback();
                    }
                }
            };

        // Queue the reorder operation to be sent to the server.  When the reorder operation
        // completes an event will be raised and the row saving indicator will be removed.
        //
        // NOTE: All reorders are queued to the reorder manager up front so the changing of ID's
        ///      happens correctly (previous or next items ID can change if they were initially being created).
        reorderManager.queueReorder(reorderOperation);

        // Reorder operations can be multi-part operations (update a work item and then perform reorder).
        // Each of these parts need to complete before any subsequent reorder operations can be processed.
        // Without ensuring that each part of the operation is completed, subsequent reorder operations
        // can result in errors.
        //
        // The main multi-part reorder operations are in the creation of new user stories and in reparenting
        // of existing user stories.  Each of these require a workitem call to be completed before the reorder
        // operation can be processed.  To prevent subsequent work item updates from interfering with on going
        // reorder requests we use an operation queue to ensure that full reorder operations are completed before
        // starting to process the next one.
        reorderOperationQueue.queueOperation(function (completedCallback) {
            // Save off the completed callback so it can be invoked when the reorder operation completes, unblocking the OperationQueue
            operationCompletedCallback = completedCallback;

            /**
             * Invoked when the preprocessing operation was successful or when there was no preprocessing callback.
             * 
             * @param oldReorderWorkItemIds OPTIONAL: Old work item ids of the work item being reordered.
             * @param newReorderWorkItemIds OPTIONAL: New work item ids of the work item being reordered.
             */
            var successCallback = (oldReorderWorkItemIds?: number[], newReorderWorkItemIds?: number[]) => {

                // If a new work item ID was provided, make sure that the pending reorder requests are updated
                // with the new ID.
                if (oldReorderWorkItemIds && newReorderWorkItemIds && newReorderWorkItemIds.length === oldReorderWorkItemIds.length) {
                    for (var i = 0; i < oldReorderWorkItemIds.length; i++) {
                        reorderManager.changeReorderId(oldReorderWorkItemIds[i], newReorderWorkItemIds[i]);
                    }
                }
                delete reorderOperation.preProcessNotCompleted;

                // Unblock the reorder manager.
                reorderManager.unblockReadyOperations();
            }

            /**
             * Called when the preprocessing operation completes with an error.
             */
            var errorCallback = () => {

                // Remove the reorder operation from the reorder managers queue.
                reorderManager.dequeueReorder(workItemIds);

                // Call the completed callback to allow subsequent operations to be processed.
                completedCallback();
            }

            // If there is a preprocessing callback, call it.
            if ($.isFunction(reorderPreProcessingCallback)) {
                reorderPreProcessingCallback(successCallback, errorCallback);
            }
            else {
                // Since there is no preprocessing to be performed, just call the success callback
                // to allow the reorder manager to proceed with sending the request to the server.
                successCallback(null, null);
            }
        });
    }
}


export interface IReorderResult {
    success: boolean;
    clientError?: boolean;
    processedIds?: number[];
    processedOperations?: IReorderOperation[];
    updatedWorkItemIds?: number[];
    updatedWorkItemOrders?: number[];
    error?: Error;
}

export interface IReorderAjaxResponse {
    success: boolean;
    updatedWorkItemIds?: number[];
    updatedWorkItemOrders?: number[];
}

/**
 * A reorder operation object which looks like:
 * {
 *     ParentId: The ID of the parent within which we are reordering. Use 'null' to infer parent from ReorderId.
 *     Ids
 *     PreviousId
 *     NextId
 *     CategoryRefName
 *     IterationPath
 *     preProcessCompleted: Indicates whether preProcessing for the current reoder operation is completed
 *     blockQueue: Indicates if the queue should be blocked when this item is reached.  Operations with temporary work item ID's will automatically be blocked.
 *     completedCallback: Called when the reorder operation is completed.  The callback will be invoked with the reorder manager and the result as its arguments.
 *     continueOnFailure?: true to not requeue after failure (will call completed callback + requeue other requests)
 * }
 *
 * @member CategoryRefName: The work item category from the level at which the item is being re-ordered.
 *      For example, if a Feature is being reordered, then pass "Microsoft.FeatureCategory". If a Task is being reordered, pass "Microsoft.TaskCategory"
 */
export interface IReorderOperation {
    Ids: number[];
    ParentId: number;
    PreviousId: number;
    NextId: number;
    IterationPath?: string;
    preProcessNotCompleted?: boolean;
    blockQueue?: boolean;
    completedCallback?: IResultCallback;
    continueOnFailure?: boolean;
}

/**
 * A reorder manager object looks like:
 * {
 *      queueReorder: queue a reorder operation (of type IReorderOperation)
 *      dequeueReorder: dequeue a pending reorder operation
 *      unblockReadyOperations: unblock ready operations in the queue
 *      changeReorderId: change reorder id of a queued item
 *      numberOfUncommittedChanges: get number of uncommitted operations
 *      attachRequestComplete: attach a handler for request complete event
 *      detachRequestComplete: detach handler for request complete event
 *      pause: pause reorder operations
 *      resume: resume reorder operations
 *      isPaused: returns reorder status, true if paused
 * }
 */
export interface IReorderManager {
    teamId: string;
    queueReorder(reorderOperation: IReorderOperation): void;
    dequeueReorder(ids: number[]): void;
    unblockReadyOperations(): void;
    changeReorderId(oldId: number, newId: number): void;
    numberOfUncommittedChanges(): number;
    attachRequestComplete(handler: IEventHandler): void;
    detachRequestComplete(handler: IEventHandler): void;
    pause(): void;
    resume(): void;
    isPaused(): boolean;
    dispose(): void;
}

export class ReorderManager implements IReorderManager {

    public static readonly EVENT_REQUEST_COMPLETE: string = "request-complete";

    // These should match the corresponding constants in the ReorderOperation class in
    // Tfs\Service\WebAccess\Agile\Utility\ReorderOperation.cs.
    public static readonly ReorderEndOfList = 0;
    public static readonly ReorderIdUnspecified = null;

    private _teamId: string;
    private _queuedChanges: IReorderOperation[];
    private _pendingChanges: IReorderOperation[];
    private _queuedIdsLookup: IDictionaryNumberTo<IReorderOperation>; // lookup for workItemIds to reorderOperation (many-to-one)
    private _events: Events_Handlers.NamedEventCollection<any, any>;
    private _paused: boolean;

    /**
     * Reorder Manager is the class handling the reorder operations queue
     * @param teamId Team owning the backlog to order items on
     */
    constructor(teamId: string) {
        this._teamId = teamId;
        this._queuedChanges = [];
        this._pendingChanges = null;
        this._queuedIdsLookup = {};
        this._events = new Events_Handlers.NamedEventCollection();
    }

    public get teamId() {
        return this._teamId;
    }

    public pause(): void {
        this._paused = true;
    }

    public resume(): void {
        this._paused = false;
        this._flush();
    }

    public isPaused(): boolean {
        return this._paused;
    }

    /**
     * Returns number of uncommitted operations
     */
    public numberOfUncommittedChanges(): number {
        return (this._queuedChanges ? this._queuedChanges.length : 0)
            + (this._pendingChanges ? this._pendingChanges.length : 0);
    }

    /**
     * Dequeue a reorder operation. This is *currently* only used to dequeue reorder operations that were queued as blocked.
     * 
     * @param id Work item id
     */
    public dequeueReorder(ids: number[]) {

        Diag.Debug.assertIsArray(ids, "Array expected");

        var lookup = this._queuedIdsLookup;
        var queued = this._queuedChanges;

        for (var id of ids) {
            var reorderOperation = lookup[id];
            if (reorderOperation) {
                Diag.Debug.assert(reorderOperation.blockQueue, "Reorder operation which was not set to block the queue is being dequeued.");

                var operationIndexInQueue = queued.indexOf(reorderOperation);
                reorderOperation.Ids.forEach(id => delete lookup[id]); // Delete entry from lookup
                queued.splice(operationIndexInQueue, 1); // Delete the reorder operation entry
            }
        }
    }

    /** Unblock ready reorder operations in the queue */
    public unblockReadyOperations() {
        var itemUnblocked = false;

        // See if any reorder operation can be unblocked
        for (var operation of this._queuedChanges) {
            if (operation.blockQueue && ReorderManager._canOperationBeUnblocked(operation)) {
                delete operation.blockQueue;

                itemUnblocked = true;
            }
        }

        if (itemUnblocked) {
            this._flush(); // Flush the queue if atleast one item is unblocked
        }
    }

    /**
     * Change the reorder id of a queued item.
     * 
     * @param oldId old id
     * @param newId new id
     */
    public changeReorderId(oldId: number, newId: number): void {

        Diag.Debug.assertParamIsNumber(oldId, "oldId");
        Diag.Debug.assertParamIsNumber(newId, "newId");

        var queued = this._queuedChanges,
            lookup = this._queuedIdsLookup,
            reorderOperation: IReorderOperation;

        if (lookup[oldId]) {
            // Add the operation under the new ID in the lookup table.
            reorderOperation = lookup[oldId];
            lookup[newId] = reorderOperation;
            delete lookup[oldId];

            var indexOfOldId = $.inArray(oldId, reorderOperation.Ids);
            if (indexOfOldId >= 0) {
                reorderOperation.Ids.splice(indexOfOldId, 1, newId);
            }
        }

        // scan the queue and fix references
        for (var i = 0; i < queued.length; i += 1) {
            reorderOperation = queued[i];

            if (reorderOperation.PreviousId === oldId) {
                reorderOperation.PreviousId = newId;
            }
            if (reorderOperation.NextId === oldId) {
                reorderOperation.NextId = newId;
            }
        }
    }

    public queueReorder(reorderOperation: IReorderOperation): void {
        /// <summary>Queue a reorder operation object.
        /// <param name="reorderOperation" type="Object">the reorder operation</param>

        Diag.Debug.assertParamIsObject(reorderOperation, "reorderOperation");


        // If one of the ids is already queued, cancel reorder
        if (reorderOperation.Ids.some(id => !!this._queuedIdsLookup[id])) {
            Diag.Debug.fail("Cannot queue new reorder operation, an operation for one of given ids is already in progress");
            return;
        }

        // If the reorder ID is a temporary work item ID, automatically mark this reorder operation to block the queue.
        for (var id of reorderOperation.Ids) {
            if (id < 0) {
                reorderOperation.blockQueue = true;
            }
            this._queuedIdsLookup[id] = reorderOperation;
        }

        // If the parent ID is a temporary work item ID, change it to 0 to indicate unparented items.
        if (reorderOperation.ParentId < 0) {
            reorderOperation.ParentId = 0;
        }

        if (!reorderOperation.IterationPath) {
            var agileContext = TFS_OM.ProjectCollection.getDefaultConnection().getService<AgileContext>(AgileContext).getContext();
            reorderOperation.IterationPath = agileContext && agileContext.iteration ? agileContext.iteration.path : null;
        }

        if (reorderOperation.preProcessNotCompleted) {
            reorderOperation.blockQueue = true;
        }

        // Trace out information about the reorder operation.
        //this._traceReorderOperation(reorderOperation);

        this._queuedChanges.push(reorderOperation);

        this._flush();
    }

    /**
     *  Attach a handler for the EVENT_REQUEST_COMPLETE event. 
     * 
     * @param handler The handler to attach
     */
    public attachRequestComplete(handler: IEventHandler): void {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.subscribe(ReorderManager.EVENT_REQUEST_COMPLETE, <any>handler);
    }

    /**
     * Remove a handler for the EVENT_REQUEST_COMPLETE event
     * 
     * @param handler The handler to remove
     */
    public detachRequestComplete(handler: IEventHandler): void {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.unsubscribe(ReorderManager.EVENT_REQUEST_COMPLETE, <any>handler);
    }

    public dispose() {
        Diag.Debug.assert(!this._paused, "Reorder manager should not be paused.");
        if (this._events) {
            this._events.unsubscribeAll();
            this._events = null;
        }

        this._queuedChanges = null;
        this._pendingChanges = null;
        this._queuedIdsLookup = null;
    }


    /** Determine whether the given reorder operation is valid and can be unblocked */
    protected static _canOperationBeUnblocked(reorderOperation: IReorderOperation): boolean {
        if (reorderOperation.preProcessNotCompleted) {
            return false;
        }

        for (var id of reorderOperation.Ids) {
            if (id <= 0) {
                return false;
            }
        }

        var nextIdIsValidItem = reorderOperation.NextId > 0 || reorderOperation.NextId === ReorderManager.ReorderEndOfList;
        var previousIdIsValidItem = reorderOperation.PreviousId > 0 || reorderOperation.PreviousId === ReorderManager.ReorderEndOfList;

        var bothUnspecified = reorderOperation.NextId === ReorderManager.ReorderIdUnspecified && reorderOperation.PreviousId === ReorderManager.ReorderIdUnspecified;

        // An operation can be unblocked
        //  - if we have a valid reference element before or after
        //  - no reference element is specified (e.g., reordering to an empty parent)
        return (nextIdIsValidItem || previousIdIsValidItem) || bothUnspecified;
    }

    /**
     * post request to server
     */
    private _postRequest(): void {
        const apiLocation = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl(
            "Reorder",
            "ReorderWorkItems",
            {
                area: "api",
                teamId: this._teamId
            } as TFS_Host_TfsContext.IRouteData);

        Ajax.postMSJSON(
            apiLocation,
            {
                operations: Utils_Core.stringifyMSJSON(this._pendingChanges),
            },
            delegate(this, this._onRequestComplete),
            delegate(this, this._onRequestFail)
        );
    }

    /**
     * flush the pending changes to Server
     */
    protected _flush(): void {

        var queued = this._queuedChanges,
            lookup = this._queuedIdsLookup,
            pending: IReorderOperation[] = [],
            reorderOperation: IReorderOperation;

        var l = queued.length;

        if (this._pendingChanges === null && l > 0 && !this._paused) {
            for (var i = 0; i < l; i++) {
                reorderOperation = queued[i];

                // don't send a request that is marked as blocked.
                if (reorderOperation.blockQueue) {
                    break;
                }

                //if the NextId or PreviousId are marked as null or undefined replace them with ReorderIdUnspecified before sending to server
                if (reorderOperation.NextId === undefined) {
                    reorderOperation.NextId = ReorderManager.ReorderIdUnspecified;
                }

                if (reorderOperation.PreviousId === undefined) {
                    reorderOperation.PreviousId = ReorderManager.ReorderIdUnspecified;
                }

                // Sanity check to make sure we are not sending requests with negative ID's.
                Diag.Debug.assert(reorderOperation.Ids.every(id => id > 0), "ReorderId should never be negative when sending operation to server.");
                Diag.Debug.assert(ReorderManager._canOperationBeUnblocked(reorderOperation), "Operation should have been blocked");

                pending.push(reorderOperation);
                $.each(reorderOperation.Ids, (idx, id) => { delete lookup[id]; });
            }

            if (pending.length > 0) {
                this._pendingChanges = pending;
                queued.splice(0, i);
                // send request here
                this._postRequest();
            }
        }
    }

    /**
     * Get Processed Ids
     */
    protected _getProcessedIds(): number[] {

        var processedIds: number[] = [];
        var pendingChanges = this._pendingChanges;
        var lookup = this._queuedIdsLookup;

        for (var i = 0; i < pendingChanges.length; i++) {
            // we need to skip items currently in the queue from the processed list

            for (var id of pendingChanges[i].Ids) {
                if (!lookup[id]) {
                    processedIds.push(id);
                }
            }
        }
        return processedIds;
    }

    /**
     * Event Handler for request complete
     * 
     * @param result Result from object
     */
    private _onRequestComplete(result: IReorderAjaxResponse): void {
        var args: IReorderResult = {
            success: true,
            processedIds: this._getProcessedIds(),
            processedOperations: this._pendingChanges,
            clientError: false,
            updatedWorkItemIds: result.updatedWorkItemIds,
            updatedWorkItemOrders: result.updatedWorkItemOrders
        };

        this._raiseRequestComplete(args);

        Diag.logTracePoint("ProductBacklog.ReorderManager.prototype._onRequestComplete.completed");
    }

    /**
     * Event Handler for request complete
     * 
     * @param result Result from object
     */
    private _onRequestFail(result: Error): void {

        var args: IReorderResult = {
            success: false,
            error: result,
            processedIds: this._getProcessedIds(),
            processedOperations: this._pendingChanges,
            clientError: result.name === Ajax.Exceptions.AjaxException || result.name === Ajax.Exceptions.AjaxTimeoutException
        };

        this._raiseRequestComplete(args);
    }

    /**
     * Notifies listeners that a request has completed
     * 
     * @param result result of request from server
     */
    protected _raiseRequestComplete(result: IReorderResult): void {

        var pending = this._pendingChanges,
            lookup = this._queuedIdsLookup,
            queued = this._queuedChanges,
            reorderOperation: IReorderOperation,
            tfsContext = TFS_Host_TfsContext.TfsContext.getDefault(),
            store = TFS_OM.ProjectCollection.getConnection(tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore),
            workItemManager = WorkItemManager.get(store);

        if (result.success) {
            this._pendingChanges = null;
            this._flush();
            // Clear the WIT cache for all work item IDs in result.updateWorkItemIds
            workItemManager.invalidateCache(result.updatedWorkItemIds);
        }
        else {
            // pause the queue and re-place failed items
            this.pause();
            for (var i = 0; i < pending.length; i++) {
                reorderOperation = pending[i];
                if (!reorderOperation.continueOnFailure) {
                    $.each(reorderOperation.Ids, (idx, id) => { lookup[id] = reorderOperation; });
                }
            }
            this._queuedChanges = pending.filter(x => !x.continueOnFailure).concat(queued);
            this._pendingChanges = null;
        }

        // Invoke the global request completed handler.
        this._events.invokeHandlers(ReorderManager.EVENT_REQUEST_COMPLETE, this, result);

        // If there were operations that are "expected" to potentially fail, then send the request again without them
        if (!result.success && pending.some(x => x.continueOnFailure)) {
            // Only call the complete callback for the bad reorder operations, others will be resent
            for (let operation of pending) {
                if (operation.continueOnFailure && $.isFunction(operation.completedCallback)) {
                    operation.completedCallback(this, result);
                }
            }

            this.resume();
        }
        else {
            // Invoke the individual requests request completed handler.
            for (i = 0; i < pending.length; i++) {
                reorderOperation = pending[i];

                // If the operation has a completed callback associated with it, then invoke it.
                if ($.isFunction(reorderOperation.completedCallback)) {
                    reorderOperation.completedCallback(this, result);
                }
            }
        }
    }

    //private _traceReorderOperation(reorderOperation: any) {
    //    /// <summary>Trace out information about the reorder operation.</summary>
    //    /// <param name="reorderOperation" type="Object">See ReorderManager.queueReorder for more details on this objects structure.</param>

    //    Diag.Debug.assertParamIsObject(reorderOperation, "reorderOperation");

    //    var logLevel = Diag.LogVerbosity.Verbose,
    //        subsetData,
    //        source,
    //        target;

    //    if (Diag.logLevel === logLevel) {
    //        Diag.log(logLevel, "Reorder Operation Info:");
    //        Diag.log(logLevel, "-----------------------------------");

    //        // Dump out the current order of items in the grid.
    //        subsetData = (<ProductBacklogGrid>Controls.Enhancement.getInstance(ProductBacklogGrid, $(Backlog.GRID_SELECTOR))).getDataManager().getSubSetData(ProductBacklogGrid.TREE_VIEW);
    //        source = JSON.stringify(subsetData.sourceIds);
    //        target = JSON.stringify(subsetData.targetIds);

    //        Diag.log(logLevel, "Source: " + source);
    //        Diag.log(logLevel, "Target: " + target);
    //        Diag.log(logLevel, "");

    //        Diag.log(logLevel, "  Reordering: " + reorderOperation.ReorderId);
    //        Diag.log(logLevel, "    ParentId: " + reorderOperation.ParentId);
    //        Diag.log(logLevel, "  PreviousId: " + reorderOperation.PreviousId);
    //        Diag.log(logLevel, "      NextId: " + reorderOperation.NextId);
    //        Diag.log(logLevel, "");

    //        Diag.log(logLevel, "-----------------------------------");
    //    }
    //}
}

//  Mapping Panel Interface Declarations
//  NOTE: These are placed here to avoid circular dependencies between
//  MappingPanel.ts and ProductBacklog.ts, as both files require the interfaces.

/**
 * MRU item from options
 */
export interface ITeamMruItem {
    teamName: string;
    teamId: string;
}

/**
 * MRU Entry for dropdown.
 */
export interface ITeamMruEntry {
    selected: boolean;
    text: string;
    title: string;
    value: string;
}

export module NotificationGuids {
    export var LimitedPortfolioAccess = "16676E24-8F6A-4EAA-9A9D-FCDF57E8BC8A";
    export var ProposedStateNotMappedForBugsWarning = "02ADFCA6-1633-483A-972D-E0192AB07A0D";
    export var NewBacklogLevelVisibilityNotSet = "F6070FC4-EF8E-48B8-B0E5-1E9A99979981";
}

/** 
 * @interface Interface for sortable item handler 
 */
export interface ISortableItemHandler {
    /** The Jquery selctor for the item that will be reordered */
    originalItem: JQuery;
    /** The JQueryUI draggable helper (ui.helper) */
    draggableHelper: JQuery;
    /** Callback function that will be called when the drag operation is completed.
     * It provides these parameters:
     *     event: the event parameter from the JQueryUI draggable stop event.
     *     ui: the ui parameter from the JQueryUI draggable stop event.
     *     originalItem: echoes the originalItem JQuery selector that was passed in, although it will now be in the new location.
     *                   If the item is dragged outside of the sortable container or the item is dragged back to its original position,
     *                   then the originalItem is located at the original position.
     *     originalItemIndex: the 0-based index of where the originalItem was before the reorder operation.
     *     newItemIndex: the 0-based index of where the originalItem was dropped after the reorder.
     *     isDropOnHeader: whether the item was drop on header.
     */
    completedCallback: (event: Event, ui: Object, originalItem: JQuery, originalItemIndex: number, newItemIndex: number, isDropOnHeader?: boolean) => void;
    /** Function to retrieve id of the JQuery item */
    getIdDelegate: (item: JQuery) => any /* number or string */;
    /** css selector for items that are sortable */
    itemClass: string;
    /** css selector to indicate that the container is droppable and sortable */
    hoverClass: string;
    /** css selector to find container that should block ui sortable gesture */
    unSortableClass: string;
    /** Flag indicate whether to block sortable on the item */
    blockSortable: boolean;
    /** css selector to find a JQuery object to insert the item after that object. This is used only when the container contains no sortable item */
    dropOnEmptyClass: string;
    /** css selector for droppable header container */
    droppableHeaderClass: string;
    /** Function to be called when the item is dropped out of scope */
    revertCallback?: Function;
}

export class ReorderItemHandler {

    public static DRAGGED_ITEM_CLASS: string = "reorderDragStarted";
    public static DRAGGED_ITEM_OUTSIDE_CONTAINER: string = "reorderDragOutside";
    public static SORTABLE_HIDDEN: string = "sortable-helper-hidden";

    public static SUFFICIENT_DRAG_DISTANCE: number = 10;

    /**
     *     Enable a group of DOM elements to be sortable.
     *     The elements must be draggable. And the containers must be droppable with a specified hover class when the draggable item is hovered over.
     *     You should call this in the event handler for the JQueryUI draggable start event.
     * 
     * @param options Options for the sortable item handler
     */
    public static attachSortableItemHandler(options?: ISortableItemHandler) {

        var $originalItem = options.originalItem;
        var getIdDelegate = options.getIdDelegate;
        var reorderItemSelector = "." + options.itemClass;
        var originalContainer: JQuery = $originalItem.parent();
        var originalItemIndex = ReorderItemHandler._getItemIndex($originalItem, getIdDelegate, originalContainer, reorderItemSelector);
        if (originalItemIndex < 0) {
            // We couldn't find the item among the children of its parent?  Better not do anything.
            return;
        }

        var isDragStopped: boolean = false;
        var $draggableHelper = options.draggableHelper;
        var unSortable = options.unSortableClass;
        var hoverSelector = "." + options.hoverClass;
        var currentItemIndex = originalItemIndex;
        var previousItemIndex = -1;
        var previousContainer = originalContainer;
        var $clone = $originalItem.clone().addClass("clone").addClass(ReorderItemHandler.DRAGGED_ITEM_CLASS).attr("id", "cloneid");
        var lastKnownX = Number.MAX_VALUE;
        var lastKnownY = Number.MAX_VALUE;
        $originalItem.addClass(ReorderItemHandler.DRAGGED_ITEM_CLASS);
        var currentContainer = originalContainer;

        // Touch handlers
        var touchMoveHandle: JQueryEventHandler;
        var touchStartHandle: JQueryEventHandler;
        var touchEndHandle: JQueryEventHandler;

        /*
        * Insert the original item next to the given item in the given container at the given the index.
        * @param item - Item to anchored to.
        * @param index - Index to insert.
        * @param container - Container to insert.
        * @param x - Mouse cursor x page offset.
        * @param y - Mouse cursor y page offset.
        */
        var moveItem = function (item: JQuery, index: number, container: JQuery, x: number, y: number) {
            var isSameContainer = container[0] === previousContainer[0];
            if (isSameContainer) {
                if (index < currentItemIndex) {
                    $originalItem.insertBefore(item);
                } else {
                    $originalItem.insertAfter(item);
                }
            }
            else {
                var isPointAboveContainer = ReorderItemHandler._isPointAboveContainer(y, item.offset().top, item.outerHeight());
                if (isPointAboveContainer) {
                    $originalItem.insertBefore(item);
                }
                else {
                    $originalItem.insertAfter(item);
                    index++;
                }
            }
            previousItemIndex = currentItemIndex;
            currentItemIndex = index;
            previousContainer = container;
        };

        /*
        * Find closest item to the mouse position and insert the original item next to the closest item found.
        * @param container - Container to find the closest item that the draggable helper is next to.
        * @param x - The mouse position relative to the left edge of the document.
        * @param y - The mouse position relative to the top edge of the document.
        */
        var findAndMoveItem = (container: JQuery, x: number, y: number) => {
            var handled = false;
            var isBlockSortable = options.blockSortable && originalContainer !== container;

            if (originalContainer.hasClass(unSortable) && container.hasClass(unSortable)) {
                // if we are moving item from unsortable container back to its original unsortable container,
                // insert the item back to its original position.
                ReorderItemHandler._replaceOriginalItem($originalItem, originalItemIndex, originalContainer, reorderItemSelector, options.dropOnEmptyClass);
                currentItemIndex = originalItemIndex;
                previousContainer = container;
                return;
            }

            if (container.hasClass(unSortable) || isBlockSortable) {
                // if we are moving item to unsortable container, add the item to the top but hide it.
                container.prepend($originalItem);
                $originalItem.addClass(ReorderItemHandler.SORTABLE_HIDDEN);
                currentItemIndex = 0;
                previousContainer = container;
                return;
            }

            $originalItem.removeClass(ReorderItemHandler.SORTABLE_HIDDEN);

            var childItems = reorderItemSelector ? container.find(reorderItemSelector).toArray() : container.children().toArray();
            var childItemCount = childItems.length;
            if (childItemCount <= 0) {
                ReorderItemHandler._insertOnEmpty($originalItem, container, options.dropOnEmptyClass);
                currentItemIndex = 0;
                previousContainer = container;
                return;
            }

            for (var i = 0, len = childItemCount; i < len; i++) {
                var item = $(childItems[i]);
                var itemOffset = item.offset();
                if (ReorderItemHandler._isPointInContainer(x, y,
                    itemOffset.left, itemOffset.top, item.outerWidth(), item.outerHeight())) {

                    // if the point is still in the container for the previous item we just moved, don't
                    // do a moveItem as it will result in flicking.
                    if (i === previousItemIndex) {
                        handled = true;
                        continue;
                    }

                    // The mouse cursor is over one of the items.
                    moveItem(item, i, container, x, y);
                    handled = true;
                    return;
                }
            }

            if (!handled) {
                // The mouse cursor is in the container but not over any of the children.
                var lastItem = $(childItems[childItemCount - 1]);
                var lastOffset = lastItem.offset();

                if ((x >= lastOffset.left && y >= lastOffset.top) ||
                    y > (lastOffset.top + lastItem.outerHeight())) {
                    // Any time we are below or to the right of the last item, assume the user
                    // wants to put the item at the end of the list, the new last item. This
                    // allows dragging to the "whitespace" at the bottom of the container.
                    moveItem(lastItem, childItemCount - 1, container, x, y);
                    handled = true;
                    return;
                }
            }

            if (!handled) {
                // The mouse cursor is in the container but not over any of the children.
                // We should find the closest child and pretend we are over that one.  Not ideal to
                // have this much calculation in a mousemove handler, but I couldn't come up with
                // something else that make the UI behavior feel as natural.
                var closestDistance = Number.POSITIVE_INFINITY;
                var closestIndex = 0;
                for (var i = 0, len = childItemCount; i < len; i++) {
                    var item = $(childItems[i]);
                    var offset = item.offset();
                    var distX = x - (offset.left + item.outerWidth() / 2);
                    var distY = y - (offset.top + item.outerHeight() / 2);
                    var distance = distX * distX + distY * distY;
                    if (distance <= closestDistance) {
                        closestDistance = distance;
                        closestIndex = i;
                    }
                }
                moveItem($(childItems[closestIndex]), closestIndex, container, x, y);
                handled = true;
                return;
            }
        };

        $originalItem.on("touchmove", touchMoveHandle = (event: JQueryEventObject) => {
            // Simulate the mousemove event
            TouchEventsHelper.simulateMouseEvent(event, $draggableHelper[0]);

            event.preventDefault();
        });

        $originalItem.on("touchstart", touchStartHandle = (event: JQueryEventObject) => {
            // Simulate the mousedown event
            TouchEventsHelper.simulateMouseEvent(event, $draggableHelper[0]);
        });

        $originalItem.on("touchend", touchEndHandle = (event: JQueryEventObject) => {
            // Simulate the mouseup event
            TouchEventsHelper.simulateMouseEvent(event, $draggableHelper[0]);
        });

        const mouseMoveHandler = (event?: JQueryEventObject, ui?) => {
            if (isDragStopped) {
                return;
            }
            var x = event.pageX;
            var y = event.pageY;
            var childItems: Element[];

            /*
            * Handle UI sorting behavior of the item in a specified container.
            * @param container - The container that the mouse is hovered over.
            */
            var uiSortableHandler = (container) => {
                // Pre-sortable setup.
                var xChange = Math.abs(lastKnownX - x);
                var yChange = Math.abs(lastKnownY - y);

                // Sortable start.
                var isDragSufficient = ReorderItemHandler._isDragSufficient(xChange, yChange);
                if (isDragSufficient) {
                    // If the drag distance is sufficent for reorder to kick-in.
                    lastKnownX = x;
                    lastKnownY = y;
                    findAndMoveItem(container, x, y);
                }
            };

            var containerOffset = originalContainer.offset();
            var containerWidth = originalContainer.outerWidth();
            var containerHeight = originalContainer.outerHeight();
            if (!ReorderItemHandler._isPointInContainer(x, y,
                containerOffset.left, containerOffset.top, containerWidth, containerHeight)) {

                // The item is dragged outside the original container.
                currentContainer = $(hoverSelector);

                // Reset the previous item index if we changed containers.
                if (currentContainer[0] !== previousContainer[0]) {
                    previousItemIndex = -1;
                }

                var isDropOnHeader = currentContainer.hasClass(options.droppableHeaderClass);
                if (currentContainer.length > 0 && !isDropOnHeader) {
                    // the item is in droppable scope.
                    uiSortableHandler(currentContainer);
                }
                else {
                    // the item is out of droppable scope.
                    $originalItem.detach();
                    previousContainer = currentContainer;
                }

                // Place a placeholder space for original item.
                childItems = reorderItemSelector ? originalContainer.find(reorderItemSelector).toArray() : originalContainer.children().toArray();
                if (originalItemIndex === 0) {
                    $clone.insertBefore($(childItems[0]));
                } else {
                    $clone.insertAfter($(childItems[originalItemIndex - 1]));
                }
            } else {
                // The item is dragged inside the original container.
                currentContainer = originalContainer;
                $(".clone").remove();
                uiSortableHandler(originalContainer);
            }
        };

        // Theoretically we would only need to listen to mousemove on draggableHelper, but 
        // Edge running on SurfaceHub has a bug where it doesn't invoke draggableHelper.mousemove
        // So we are forced to listen to document.body.mousemove also.
        // We can't listen to document.body.mousemove only because touchmove/touchstart/touchend above are simulated on draggableHelper
        $draggableHelper.mousemove(mouseMoveHandler);
        $(document.body).mousemove(mouseMoveHandler);

        $originalItem.on("dragstop", (event, ui) => {
            isDragStopped = true;
            $originalItem.unbind("dragstop");
            $originalItem.off("touchstart", touchStartHandle);
            $originalItem.off("touchmove", touchMoveHandle);
            $originalItem.off("touchend", touchEndHandle);

            $draggableHelper.unbind("mousemove", mouseMoveHandler);
            $(document.body).unbind("mousemove", mouseMoveHandler);

            $originalItem.removeClass(ReorderItemHandler.SORTABLE_HIDDEN);
            $originalItem.removeClass(ReorderItemHandler.DRAGGED_ITEM_CLASS);

            var revertCallback = () => {
                if ($.isFunction(options.revertCallback)) {
                    options.revertCallback(ui);
                }
            };

            var isDropOnHeader = currentContainer.hasClass(options.droppableHeaderClass);
            if (isDropOnHeader) {
                $clone.remove();
                revertCallback();
            }
            else if (currentContainer.length <= 0) {
                // the item is dropped out of scope.
                $clone.remove();
                ReorderItemHandler._replaceOriginalItem($originalItem, originalItemIndex, originalContainer, reorderItemSelector, options.dropOnEmptyClass);
                currentItemIndex = originalItemIndex;
                revertCallback();
            }
            else {
                // the item is dropped within the scope.
                if ($originalItem.parent().length <= 0) {
                    // if the original item was not in any of the droppable container, find the insert the original item to a correct container.
                    findAndMoveItem(currentContainer, event.pageX, event.pageY);
                };

                if ($originalItem.parent()[0] !== originalContainer[0]) {
                    // if the item is now in a different container from its original container.
                    $clone.remove();
                }
                else if (originalItemIndex === currentItemIndex) {
                    // if the item is dropped in the same container and same index, revert and do nothing.
                    revertCallback();
                    return;
                }

                options.completedCallback(event, ui, $originalItem, originalItemIndex, currentItemIndex, isDropOnHeader);
            }
        });
    }

    public static attachReorderItemHandler(
        $originalItem: JQuery,
        $draggableHelper: JQuery,
        completedCallback: (event: Event, ui: Object, originalItem: JQuery, originalItemIndex: number, newItemIndex: number) => void,
        getIdDelegate: (item: JQuery) => any /*number or string*/,
        reorderItemSelector: string,
        revertCallback?: Function,
        containerSelector?: string,
        rePositionDelegate?: (originalItem: JQuery, childItems: Element[], newIndex: number) => void,
        /**
         *     Handles all the UI aspects of drag-drop reordering inside a single container.  It assumes
         *     you want to reorder originalItem within its peers and that these items are JQueryUI 'draggable'.
         *     You should call this in the event handler for the JQueryUI draggable start event.
         * 
         * @param originalItem The Jquery selctor for the item that will be reordered (the one that will
         *     change position within the list of its peers).
         * @param draggableHelper The JQueryUI draggable helper (ui.helper).
         * @param completedCallback Function that will be called when the drag operation is complete.  This
         *     is the function that should handle/persist the order change.  It will only be called if the drop
         *     produced a valid reorder change, so it won't be called if the user drags back to to the original
         *     position or drops outside the container.  It provides these parameters:
         *         event: the event parameter from the JQueryUI draggable stop event.
         *         ui: the ui parameter from the JQueryUI draggable stop event.
         *         originalItem: echoes the originalItem JQuery selector that was passed in, although it will now
         *             be in the new reordered position.
         *         originalItemIndex: the 0-based index of where the originalItem was before the reorder operation.
         *         newItemIndex: the 0-based index of where the originalItem was dropped after the reorder.
         * 
         * @param getId Function to retrieve id of the JQuery item.
         * @param reorderitemSelector The JQuery selector to retrieve list of items to be considered for reorder operation.
         * @param revertCallback Optional Function that will be called when the action was not a reorder.
         * @param containerSelector The JQuery selector to get item's container.
         * @param rePositionDelegate Delegate for handling child item's insertions during reorder
         * @param childItemsSortDelegate Delegate for sorting the child items
         * @return Nothing.
         */
        childItemsSortDelegate?: (children: Element[]) => void) {

        // Touch handlers
        var touchMoveHandle: JQueryEventHandler;
        var touchStartHandle: JQueryEventHandler;
        var touchEndHandle: JQueryEventHandler;

        var isDragStopped: boolean = false;
        var originalItemIndex = -1;
        var currentItemIndex = -1;
        var $dummyChild: JQuery;

        var lastKnownX = Number.MAX_VALUE,
            lastKnownY = Number.MAX_VALUE;

        var container: JQuery = $originalItem.parent();
        if (containerSelector) {
            container = $originalItem.closest(containerSelector);

            // Container's height might decrease while we are shifting child items, which may cause the page to scroll up.
            // We don't want the container's height to decrease below current height. Adding a dummy child for this purpose
            $dummyChild = $("<div>");
            $dummyChild.height(container.height()).css({ "visibility": "hidden", "float": "left" });
            container.append($dummyChild);
        }
        var children = reorderItemSelector ? container.find(reorderItemSelector).toArray() : container.children().toArray();
        var originalItemId = getIdDelegate($originalItem);

        if (childItemsSortDelegate) {
            childItemsSortDelegate(children);
        }
        for (var i = 0, len = children.length; i < len; i++) {
            var $item: JQuery = $(children[i]);
            if (getIdDelegate($item) === originalItemId) {
                originalItemIndex = i;
                break;
            }
        }

        if (originalItemIndex < 0) {
            // We couldn't find the item among the children of its parent?  Better not do anything.
            return;
        }

        currentItemIndex = originalItemIndex;

        $originalItem.addClass(ReorderItemHandler.DRAGGED_ITEM_CLASS);

        $originalItem.on("touchmove", touchMoveHandle = (event: JQueryEventObject) => {
            // Simulate the mousemove event
            TouchEventsHelper.simulateMouseEvent(event, $draggableHelper[0]);

            event.preventDefault();
        });

        $originalItem.on("touchstart", touchStartHandle = (event: JQueryEventObject) => {
            // Simulate the mousedown event
            TouchEventsHelper.simulateMouseEvent(event, $draggableHelper[0]);
        });

        $originalItem.on("touchend", touchEndHandle = (event: JQueryEventObject) => {
            // Simulate the mouseup event
            TouchEventsHelper.simulateMouseEvent(event, $draggableHelper[0]);
        });

        // Seems natural to set up the mousemove event on the original container, but that
        // didn't work out. During a drag your cursor is almost always over the helper.
        $draggableHelper.mousemove((event?: JQueryEventObject) => {
            //When we move the mouse the mouse move events keep getting fired.
            //when we stop the mouse move the dragstop event gets fired.
            //On drag stop we are unbinding mouse move.
            //But looks like when we quickly do mouse move 
            //there are some mouse move events already queued up and they gets 
            //processed and they were causing the assert failure.
            if (isDragStopped) {
                return;
            }
            var x = event.pageX;
            var y = event.pageY;
            var childItems: Element[];

            var isPointInRect = function (pointX: number, pointY: number,
                rectX: number, rectY: number, rectWidth: number, rectHeight: number) {
                return (pointX > rectX && pointX < (rectX + rectWidth) &&
                    pointY > rectY && pointY < (rectY + rectHeight));
            };

            var moveItem = function (item: JQuery, newIndex: number) {
                // Move the items around given that the mouse is currently over 'item', the newIndex-th child.

                if (newIndex === currentItemIndex) {
                    return;
                }

                if (rePositionDelegate) {
                    rePositionDelegate($originalItem, childItems, newIndex);
                }
                else {
                    if (newIndex < currentItemIndex) {
                        $originalItem.insertBefore(item);
                    } else {
                        $originalItem.insertAfter(item);
                    }
                }
                currentItemIndex = newIndex;
            };

            var containerOffset = container.offset();
            var containerWidth = container.outerWidth();
            var containerHeight = container.outerHeight();
            if (!isPointInRect(x, y,
                containerOffset.left, containerOffset.top, containerWidth, containerHeight)) {

                // The drag has gone outside of our container of interest.
                $originalItem.addClass(ReorderItemHandler.DRAGGED_ITEM_OUTSIDE_CONTAINER);
                if (currentItemIndex !== originalItemIndex) {
                    // Return children to original order.

                    if (!rePositionDelegate) {
                        $originalItem.detach();
                    }

                    childItems = reorderItemSelector ? container.find(reorderItemSelector).toArray() : container.children().toArray();
                    if (childItemsSortDelegate) {
                        childItemsSortDelegate(childItems);
                    }
                    if (rePositionDelegate) {
                        rePositionDelegate($originalItem, childItems, originalItemIndex);
                    }
                    else {
                        if (originalItemIndex === 0) {
                            $originalItem.insertBefore($(childItems[0]));
                        } else {
                            $originalItem.insertAfter($(childItems[originalItemIndex - 1]));
                        }
                    }
                    currentItemIndex = originalItemIndex;

                    lastKnownX = x;
                    lastKnownY = y;
                }
            } else {
                // The mouse cursor is in the container.
                $originalItem.removeClass(ReorderItemHandler.DRAGGED_ITEM_OUTSIDE_CONTAINER);

                var xChange = Math.abs(lastKnownX - x),
                    yChange = Math.abs(lastKnownY - y);

                // See if the drag distance is sufficent for reorder to kick-in. If child items are not of same size,
                // trying to reorder on every mouse move may result in too much flicker.
                if (this._isDragSufficient(xChange, yChange)) {
                    lastKnownX = x;
                    lastKnownY = y;

                    var handled = false;
                    childItems = reorderItemSelector ? container.find(reorderItemSelector).toArray() : container.children().toArray();
                    var childItemCount = childItems.length;

                    if (childItemsSortDelegate) {
                        childItemsSortDelegate(childItems);
                    }

                    for (var i = 0, len = childItemCount; i < len; i++) {
                        var item = $(childItems[i]);
                        var itemOffset = item.offset();
                        if (isPointInRect(x, y,
                            itemOffset.left, itemOffset.top, item.outerWidth(), item.outerHeight())) {

                            // The mouse cursor is over one of the items.
                            moveItem(item, i);
                            handled = true;

                            break;
                        }
                    }

                    if (!handled) {
                        // The mouse cursor is in the container but not over any of the children.

                        var lastItem = $(childItems[childItemCount - 1]);
                        var lastOffset = lastItem.offset();

                        if ((x >= lastOffset.left && y >= lastOffset.top) ||
                            y > (lastOffset.top + lastItem.outerHeight())) {
                            // Any time we are below or to the right of the last item, assume the user
                            // wants to put the item at the end of the list, the new last item. This
                            // allows dragging to the "whitespace" at the bottom of the container.
                            moveItem(lastItem, childItemCount - 1);
                            handled = true;
                        }
                    }

                    if (!handled) {
                        // The mouse cursor is in the container but not over any of the children.
                        // We should find the closest child and pretend we are over that one.  Not ideal to
                        // have this much calculation in a mousemove handler, but I couldn't come up with
                        // something else that make the UI behavior feel as natural.
                        var closestDistance = Number.POSITIVE_INFINITY;
                        var closestIndex = 0;
                        for (var i = 0, len = childItemCount; i < len; i++) {
                            var item = $(childItems[i]);
                            var offset = item.offset();
                            var distX = x - (offset.left + item.outerWidth() / 2);
                            var distY = y - (offset.top + item.outerHeight() / 2);
                            var distance = distX * distX + distY * distY;
                            if (distance <= closestDistance) {
                                closestDistance = distance;
                                closestIndex = i;
                            }
                        }

                        moveItem($(childItems[closestIndex]), closestIndex);
                    }
                }
            }
        });

        $originalItem.on("dragstop", (event, ui) => {
            isDragStopped = true;
            $originalItem.removeClass(ReorderItemHandler.DRAGGED_ITEM_OUTSIDE_CONTAINER);
            $originalItem.removeClass(ReorderItemHandler.DRAGGED_ITEM_CLASS);

            $originalItem.unbind("dragstop");
            $originalItem.off("touchstart", touchStartHandle);
            $originalItem.off("touchmove", touchMoveHandle);
            $originalItem.off("touchend", touchEndHandle);

            $draggableHelper.unbind("mousemove");

            // Remove the dummy child which we might have added to maintain mininum height of container
            if ($dummyChild) {
                $dummyChild.empty().remove();
            }

            if (originalItemIndex !== currentItemIndex) {
                completedCallback(event, ui, $originalItem, originalItemIndex, currentItemIndex);
            }
            else if (originalItemIndex === currentItemIndex) {
                // if the item is dropped in the same container and same index, revert and do nothing.
                if ($.isFunction(revertCallback)) {
                    revertCallback($originalItem);
                }
            }
        });
    }

    /**
     *  Given change in x-position and y-position, tells if a reorder operation should be attempted or not 
     */
    private static _isDragSufficient(xChange: number, yChange: number): boolean {
        if ((xChange < ReorderItemHandler.SUFFICIENT_DRAG_DISTANCE) && (yChange < ReorderItemHandler.SUFFICIENT_DRAG_DISTANCE)) {
            return false;
        }

        return true;
    }

    private static _isPointInContainer(
        pointX: number,
        pointY: number,
        containerLeftOffset: number,
        containerTopOffset: number,
        containerWidth: number,
        containerHeight: number): boolean {
        return (pointX > containerLeftOffset
            && pointX < (containerLeftOffset + containerWidth)
            && pointY > containerTopOffset
            && pointY < (containerTopOffset + containerHeight));
    }

    private static _isPointAboveContainer(
        top: number,
        containerTopOffset: number,
        containerHeight: number): boolean {

        var mid = containerTopOffset + containerHeight / 2;
        return top < mid;
    }

    private static _getItemIndex($item: JQuery, getIdDelegate: (item: JQuery) => any, $container: JQuery, itemSelector: string): number {
        var children = itemSelector ? $container.find(itemSelector).toArray() : $container.children().toArray();
        var itemId = getIdDelegate($item);
        for (var i = 0, len = children.length; i < len; i++) {
            var $child: JQuery = $(children[i]);
            if (getIdDelegate($child) === itemId) {
                return i;
            }
        }
        return -1;
    }

    private static _insertOnEmpty($originalItem: JQuery, container: JQuery, dropOnEmptyClass: string) {
        var allItems = container.find("." + dropOnEmptyClass);
        if (allItems.length > 0) {
            $originalItem.insertAfter(allItems[0]);
        }
        else {
            container.prepend($originalItem);
        }
    }

    private static _replaceOriginalItem($originalItem: JQuery, originalItemIndex: number, originalContainer: JQuery, reorderItemSelector: string, dropOnEmptyClass: string) {
        var childItems = reorderItemSelector ? originalContainer.find(reorderItemSelector).toArray() : originalContainer.children().toArray();
        if (childItems.length === 0) {
            ReorderItemHandler._insertOnEmpty($originalItem, originalContainer, dropOnEmptyClass);
        }
        if (originalItemIndex === 0) {
            $originalItem.insertBefore($(childItems[0]));
        } else {
            $originalItem.insertAfter($(childItems[originalItemIndex - 1]));
        }
    }
}

export module ContibutionContexts {
    export interface ICardContextMenu {
        id: number;
        workItemType: string;
        team: { id: string; name: string; }
    }
}

export module CapacityDateUtils {

    export function shiftDateRangesToLocal(dateRanges: Work_Contracts.DateRange[]) {
        Diag.Debug.assertIsNotNull(dateRanges, "dateRanges can not be null");

        dateRanges.forEach((dateRange: Work_Contracts.DateRange) => {
            shiftDateRangeToLocal(dateRange);
        });
    }

    export function shiftDateRangesToUTC(dateRanges: Work_Contracts.DateRange[]) {
        Diag.Debug.assertIsNotNull(dateRanges, "dateRanges can not be null");

        dateRanges.forEach((dateRange: Work_Contracts.DateRange) => {
            shiftDateRangeToUTC(dateRange);
        });
    }

    export function shiftDateRangeToLocal(dateRange: Work_Contracts.DateRange) {
        Diag.Debug.assertIsNotNull(dateRange, "dateRange can not be null");

        dateRange.end = Utils_Date.shiftToLocal(dateRange.end);
        dateRange.start = Utils_Date.shiftToLocal(dateRange.start);
    }

    export function shiftDateRangeToUTC(dateRange: Work_Contracts.DateRange) {
        Diag.Debug.assertIsNotNull(dateRange, "dateRange can not be null");

        dateRange.end = Utils_Date.shiftToUTC(dateRange.end);
        dateRange.start = Utils_Date.shiftToUTC(dateRange.start);
    }

    /**
     * Compares two date ranges for equality. Note that testing date equality (using the === operator) is not supported at the object level; it must be done via toString() or getTime()
     * 
     * @param first Date range
     * @param second Date range
     * @return True if the date ranges are equal, false otherwise
     */
    export function areDateRangeEqual(first: Work_Contracts.DateRange, second: Work_Contracts.DateRange): boolean {

        Diag.Debug.assertParamIsObject(first, "first");
        Diag.Debug.assertParamIsDate(first.start, "first.Start");
        Diag.Debug.assertParamIsDate(first.end, "first.End");
        Diag.Debug.assertParamIsObject(second, "second");
        Diag.Debug.assertParamIsDate(second.start, "second.Start");
        Diag.Debug.assertParamIsDate(second.end, "second.End");

        return first.start.getTime() === second.start.getTime() &&
            first.end.getTime() === second.end.getTime();
    }

    /**
     * Compares two arrays of date ranges for equality. We assume the arrays are already in the correct order for comparison
     * 
     * @param first An array of date ranges
     * @param second An array of date ranges
     * @return True if the arrays of date ranges are equal, false otherwise
     */
    export function areDateRangesEqual(first: Work_Contracts.DateRange[], second: Work_Contracts.DateRange[]): boolean {

        Diag.Debug.assertParamIsArray(first, "first");
        Diag.Debug.assertParamIsArray(second, "second");

        var i, l,
            equal = true;

        if (first.length !== second.length) {
            equal = false;
        }
        else {
            for (i = 0, l = first.length; i < l; i += 1) {
                if (!areDateRangeEqual(first[i], second[i])) {
                    equal = false;
                    break;
                }
            }
        }

        return equal;
    }

    /**
     * Gets the count of weekend days between the provided dates.  This method assumes the dates are in the same week.
     * 
     * @param startDate Day to start from.
     * @param endDate Day to end on (inclusive).
     * @param weekends Array of days that are weekends.  Sunday = 0, Monday = 1, ...
     * @return 
     */
    export function _getWeekendsBetweenDaysOfWeek(startDate: Date, endDate: Date, weekends: number[]): number {

        Diag.Debug.assertParamIsDate(startDate, "startDate");
        Diag.Debug.assertParamIsDate(endDate, "endDate");
        Diag.Debug.assertParamIsArray(weekends, "weekends", false);

        var weekendDay: number,
            weekendDaysCount = 0,
            startDateDay = startDate.getDay(),
            endDateDay = endDate.getDay();

        // Exclude weekend days.
        for (var i = 0, l = weekends.length; i < l; i += 1) {
            weekendDay = weekends[i];

            if (startDateDay <= weekendDay && endDateDay >= weekendDay) {
                weekendDaysCount += 1;
            }
        }

        return weekendDaysCount;
    }

    /**
     * Gets a breakdown of the date range which includes:
     *    totalDays: [total number of days in the date range],
     *    weekendDays: [count of days which are weekends],
     *    totalWorkingDays: [total number of working days (totalDays - weekendDays)],
     *    totalExcludedDays: [total of days which are working days in the excluded ranges],
     *    workingDays: [totalDays - weekendDays - totalExcludedDays]
     * 
     * @param startDate Start of the date range to get the breakdown for.
     * @param endDate End of the date range to get the breakdown for.
     * @param excludedRanges Date ranges to exclude from the count.
     * @param weekends Array of days that are weekends.  Sunday = 0, Monday = 1, ...
     */
    export function getDateBreakdown(startDate: Date, endDate: Date, excludedRanges: Work_Contracts.DateRange[], weekends: number[]): IWorkingDaysInfo {

        Diag.Debug.assertParamIsDate(startDate, "startDate");
        Diag.Debug.assertParamIsDate(endDate, "endDate");
        Diag.Debug.assertParamIsArray(excludedRanges, "excludedRanges", false);
        Diag.Debug.assertParamIsArray(weekends, "weekends", false);

        var result = CapacityDateUtils.getWorkingDaysInfo(startDate, endDate, weekends),
            currentRange: Work_Contracts.DateRange,
            excludedWorkingDays = 0;

        // Add up the excluded days in each of the excluded ranges.
        for (var i = 0, l = excludedRanges.length; i < l; i += 1) {
            currentRange = excludedRanges[i];

            excludedWorkingDays += CapacityDateUtils.getWorkingDaysInfo(
                currentRange.start,
                currentRange.end,
                weekends).totalWorkingDays;
        }

        // Add the excluded days and working days count to the result.
        result.totalExcludedDays = excludedWorkingDays;
        result.workingDays = result.totalWorkingDays - excludedWorkingDays;

        return result;
    }

    /**
     * Gets an empty date breakdown.
     */
    export function getEmptyDateBreakdown() {

        return {
            totalDays: 0,
            weekendDays: 0,
            totalWorkingDays: 0,
            totalExcludedDays: 0,
            workingDays: 0
        };
    }

    /**
     * Gets a merged array of date ranges.  Days which are before the minimum date are excluded.  The arrays must be sorted by the start date of the date range.
     * 
     * @param firstArray List of date ranges to be merged. Must be sorted by start date of the date range.
     * @param secondArray List of date ranges to be merged. Must be sorted by start date of the date range.
     * @param minimumDate Minimum date to include when merging the arrays.
     * @param maximumDate Maximum date to include when merging the arrays.
     */
    export function getMergedDateRangeList(firstArray: Work_Contracts.DateRange[], secondArray: Work_Contracts.DateRange[], minimumDate: Date, maximumDate: Date): Work_Contracts.DateRange[] {

        Diag.Debug.assertParamIsArray(firstArray, "firstArray", false);
        Diag.Debug.assertParamIsArray(secondArray, "secondArray", false);
        Diag.Debug.assertParamIsDate(minimumDate, "minimumDate");
        Diag.Debug.assertParamIsDate(maximumDate, "maximumDate");

        var firstArrayIndex = 0,
            firstArrayLength = firstArray.length,
            secondArrayIndex = 0,
            secondArrayLength = secondArray.length,
            currentRange: Work_Contracts.DateRange,
            previousRange: Work_Contracts.DateRange,
            nextFirstArrayRange: Work_Contracts.DateRange,
            nextSecondArrayRange: Work_Contracts.DateRange,
            mergedDateRanges: Work_Contracts.DateRange[] = [];

        // Initialize the next range for each of the lists.
        nextFirstArrayRange = firstArray[firstArrayIndex];
        nextSecondArrayRange = secondArray[secondArrayIndex];

        // Merge the first and second array.
        while (firstArrayIndex < firstArrayLength || secondArrayIndex < secondArrayLength) {
            // Determine which list to pull the current value from by picking the one with the 
            // earliest start date.  If the start dates are equal, then the first array range will be used.
            if ((nextFirstArrayRange && nextSecondArrayRange && nextFirstArrayRange.start <= nextSecondArrayRange.start) ||
                (!nextSecondArrayRange)) {
                // There is either no next second array range or the first array start date is earlier.
                currentRange = nextFirstArrayRange;

                // Get the next range from the first array.
                firstArrayIndex += 1;
                nextFirstArrayRange = firstArray[firstArrayIndex];
            }
            else {
                // There is either no first array range or the second array range start date is earlier.
                currentRange = nextSecondArrayRange;

                // Get the next second array range from the array.
                secondArrayIndex += 1;
                nextSecondArrayRange = secondArray[secondArrayIndex];
            }

            // If any part of the date range is within the min/max range normalize it to be fully within the min/max range
            // since we do not want to count things which will occur outside of the min/max range.
            currentRange = this.normalizeForDateRange(currentRange, minimumDate, maximumDate);

            // If the date range is between the min and max dates, then include it.
            if (currentRange.start >= minimumDate && currentRange.start <= maximumDate &&
                currentRange.end >= minimumDate && currentRange.end <= maximumDate) {

                // If there is overlap in the current date range and the previous one in the merged list, then combine them.
                if (previousRange &&
                    ((previousRange.start <= currentRange.start && previousRange.end >= currentRange.start) ||
                        (previousRange.start <= currentRange.end && previousRange.end >= currentRange.end))) {

                    // Build the new overlapping range.
                    currentRange = {
                        start: previousRange.start < currentRange.start ? previousRange.start : currentRange.start,
                        end: previousRange.end > currentRange.end ? previousRange.end : currentRange.end
                    };

                    // Replace the last item in the merged list with the new merged range.
                    mergedDateRanges[mergedDateRanges.length - 1] = currentRange;
                }
                else {
                    // Add the range to the merged list of days off.
                    mergedDateRanges[mergedDateRanges.length] = currentRange;
                }

                // Set the previous current range as the previous range.
                previousRange = currentRange;
            }
        }

        return mergedDateRanges;
    }

    /**
     * If the date range contains the minimum date or the maximum date.  The range will be updated to be within the minimum and maximum.
     * 
     * @param dateRange Date range to normaize.
     * @param minimumDate Minimum date to normalize with.
     * @param maximumDate Maximum date to normalize with.
     * @return 
     */
    export function normalizeForDateRange(dateRange: Work_Contracts.DateRange, minimumDate: Date, maximumDate: Date): Work_Contracts.DateRange {

        Diag.Debug.assertParamIsObject(dateRange, "dateRange");
        Diag.Debug.assertParamIsDate(minimumDate, "minimumDate");
        Diag.Debug.assertParamIsDate(maximumDate, "maximumDate");

        // The date range completely overlaps the min/max range.
        if (dateRange.start < minimumDate && dateRange.end > maximumDate) {
            return {
                start: minimumDate,
                end: maximumDate
            };
        }
        // The start is outside of the min/max range, but the end is not.
        else if (dateRange.start < minimumDate && dateRange.end >= minimumDate && dateRange.end <= maximumDate) {
            return {
                start: minimumDate,
                end: dateRange.end
            };
        }
        // The end is outside of the min/max range, but the start is not.
        else if (dateRange.end > maximumDate && dateRange.start >= minimumDate && dateRange.start <= maximumDate) {
            return {
                start: dateRange.start,
                end: maximumDate
            };
        }

        return dateRange;
    }

    /**
     * Gets information about the working days between the start and end dates provides.
     * The information includes:
     *    totalDays: [total number of days in the date range],
     *    weekendDays: [count of days which are weekends],
     *    totalWorkingDays: [total number of working days (totalDays - weekendDaysCount)]
     * 
     * @param startDate Start date to get the days from.
     * @param endDate End date to get the date to (inclusive).
     * @param weekends Array of days that are weekends.  Sunday = 0, Monday = 1, ...
     * @return Working days info: {
     *         totalDays
     *         totalWorkingDays
     *         weekendDays
     *     }
     * 
     */
    export function getWorkingDaysInfo(startDate: Date, endDate: Date, weekends: number[]): IWorkingDaysInfo {

        Diag.Debug.assertParamIsDate(startDate, "startDate");
        Diag.Debug.assertParamIsDate(endDate, "endDate");
        Diag.Debug.assertParamIsArray(weekends, "weekends", false);

        var day = Utils_Date.MILLISECONDS_IN_DAY,
            week = Utils_Date.MILLISECONDS_IN_WEEK,
            middleDays = 0,
            totalWorkingDays: number;

        // If the start date is after the end date, return zero.
        if (startDate > endDate) {
            return {
                totalDays: 0,
                totalWorkingDays: 0,
                weekendDays: 0
            };
        }

        // Get the number of days between the two dates.
        // NOTE: Rounding is done here because with some longer date ranges we can end up
        //       with fractional days between dates.  For example 6/23/2011 - 12/29/2011 yields
        //       190.04166666666666 in the below expresssion without the rounding.
        var daysBetweenDates = Math.round(((endDate.getTime() - startDate.getTime()) / day)) + 1;

        // Get the day of the week that each date is on.	
        var startDateDay = startDate.getDay();
        var endDateDay = endDate.getDay();

        // If the dates are within the same week, then just calculate the remaining days directly.
        if (daysBetweenDates <= 7 && startDateDay <= endDateDay) {
            // Get the working days between the dates by subtracting off weekends between the dates.
            totalWorkingDays = daysBetweenDates - CapacityDateUtils._getWeekendsBetweenDaysOfWeek(startDate, endDate, weekends);
        }
        else {
            // Get the working days between the dates by calculating the number of working days
            // in the first week and last week of the date range (they may be partial weeks),
            // then calculate the working days in all of the middle weeks (these will be full weeks),
            // and add them all up.

            // Find the number of days in the first week.
            var firstWeekDays = 7 - startDateDay;
            var firstWeekEndDate = this.getDSTAgnosticDate(startDate.getTime() + (day * (firstWeekDays - 1)));
            firstWeekDays -= CapacityDateUtils._getWeekendsBetweenDaysOfWeek(startDate, firstWeekEndDate, weekends);

            // Set the middle weeks start date to the beginning of the following week.
            var middleWeeksStartDate = this.getDSTAgnosticDate(startDate.getTime() + (day * (7 - startDateDay)));

            // Find the number of days in the last week.
            var lastWeekDays = endDateDay + 1;
            var lastWeekStartDate = this.getDSTAgnosticDate(endDate.getTime() - (day * (lastWeekDays - 1)));
            lastWeekDays -= CapacityDateUtils._getWeekendsBetweenDaysOfWeek(lastWeekStartDate, endDate, weekends);

            // Set the end date of the middle weeks to the last day of the previous week.
            var middleWeeksEndDate = this.getDSTAgnosticDate(endDate.getTime() - (day * (endDateDay + 1)));

            // If the dates were not in adjacent weeks, calculate working days in the middle weeks.
            if (middleWeeksStartDate < middleWeeksEndDate) {
                var middleWeeks = Math.round(((middleWeeksEndDate.getTime() - middleWeeksStartDate.getTime() + day) / week));
                middleDays = (middleWeeks * 7) - (middleWeeks * weekends.length);
            }

            totalWorkingDays = firstWeekDays + middleDays + lastWeekDays;
        }

        return <IWorkingDaysInfo>{
            totalDays: daysBetweenDates,
            totalWorkingDays: totalWorkingDays,
            weekendDays: daysBetweenDates - totalWorkingDays
        };
    }

    /**
     * Returns a date that handles daylight savings times. Note that this is only used when the time portion
     *     of the date is not important. It will round the date to the nearest 0th hour.
     * 
     * @return 
     */
    export function getDSTAgnosticDate(milliseconds): Date {
        Diag.Debug.assertParamIsNumber(milliseconds, "milliseconds");

        var date = new Date(milliseconds),
            hours = date.getHours();

        // This will effectively round the date to the nearest "whole" date. For example:
        // "March 11, 2012 23:00:00" => "March 12, 2012 00:00:00"
        // "March 11, 2012 01:00:00" => "March 11, 2012 00:00:00"
        // "March 11, 2012 00:00:00" => "March 11, 2012 00:00:00"

        if (hours >= 12) {
            date.setHours(24, 0, 0, 0);
        }
        else if (hours < 12) {
            date.setHours(0, 0, 0, 0);
        }

        return date;
    }
}

export interface IWorkingDaysInfo {
    totalDays: number;
    totalWorkingDays: number;
    weekendDays: number;
    totalExcludedDays?: number;
    workingDays?: number;
}

//tab registration constants
export class TabControlsRegistrationConstants {
    public static COMMON_CONFIG_SETTING_INSTANCE_ID = "af585f7e-3a58-4826-b1c6-b080bd1eaea2";

    public static BOARDS_GROUP_ID = "7acc5438-9254-4b93-9c66-900a0b214989";
    public static BOARD_GROUP_TITLE = AgileControlsResources.CSC_BOARD_GROUP_TITLE;

    public static CARDS_GROUP_ID = "a857de31-d327-47ce-86bc-7e2d82d8713e";
    public static CARDS_GROUP_TITLE = AgileControlsResources.CSC_CARDS_GROUP_TITLE;

    public static CHARTS_GROUP_ID = "92F5854F-6C88-4C37-A055-23306A73D525";
    public static CHARTS_GROUP_TITLE = AgileControlsResources.CSC_CHARTS_GROUP_TITLE;

    public static GENERAL_GROUP_ID = "7c548ed6-1cea-4ba3-a167-b093da447f4f";
    public static GENERAL_GROUP_TITLE = AgileControlsResources.CSC_GENERAL_GROUP_TITLE;

    public static FIELDS_TAB_ID = "4d737028-f57e-4728-9b4e-5d94ffe7dac1";
    public static FIELDS_TAB_TITLE = AgileControlsResources.CSC_FIELDS_TAB_TITLE;

    public static CARDS_ANNOTATION_TAB_ID = "53FB3DAF-7900-46BC-96E2-4D60882D2822";
    public static CARDS_ANNOTATION_TAB_TITLE = AgileControlsResources.CSC_CARDS_ANNOTATION_TAB_TITLE;

    public static CARDS_TESTS_TAB_ID = "3A6EF72F-6AC1-4414-A634-59ED0222BD89";
    public static CARDS_TESTS_TAB_TITLE = AgileControlsResources.CSC_TESTS_TAB_TITLE;

    public static CARDS_STYLES_TAB_ID = "C1463A1D-28CF-4B22-8355-7C0045D0B1A8";
    public static CARDS_STYLES_TAB_TITLE = AgileControlsResources.CSC_CARDS_STYLES_TAB_TITLE;

    public static CARDS_TAGCOLOR_TAB_ID = "39276C4E-4285-46E1-A2C5-4D7DBB06535D";
    public static CARDS_TAGCOLOR_TAB_TITLE = AgileControlsResources.CSC_CARDS_TAGCOLOR_TAB_TITLE;

    public static SWIMLANES_TAB_ID = "0245BB3E-63A6-4B4E-9444-5FAD220D4E69";
    public static COLUMNS_TAB_ID = "B5CD2EA4-D622-4CAC-A26E-12509324A896";
    public static KANBAN_DRAG_BEHAVIOR_ID = "3CB1429B-28E9-408E-AC6E-6A6AA2F43B9E";

    public static BACKLOGS_TAB_ID = "85b81c61-9c1c-4e79-8e17-ddb4960544a6";
    public static WORKINGDAYS_TAB_ID = "9608a9c1-6ae8-45e9-b28e-1e3d57f3da3a";
    public static BUGBEHAVIOR_TAB_ID = "bc589740-4a0c-4f61-9f5c-c4f0bad7b628";
    public static CFD_TAB_ID = "1C784703-A1EF-4EB3-83A7-4576268E5A90";
}

export class AgileCustomerIntelligenceConstants {
    public static KANBAN_VIEW = "Kanban";
    public static PRODUCT_BACKLOG_VIEW = "ProductBacklog";
    public static ITERATION_BACKLOG_VIEW = "IterationBacklog";
    public static ITERATION_BOARD_VIEW = "Taskboard";
    public static CAPACITY_VIEW = "Capacity";
    public static CFD_VIEW = "CFD";
}

export class IdentityControlConsumerIds {
    public static CardFieldSearchControl = "1f0c09e1-cd5d-4618-b7c6-75561d63166e";
    public static CardFieldDisplayControl = "3223bcb2-df35-4a1b-a8fa-41483b5a37e4";
    public static CardStylingSearchControl = "fece9ad0-925d-41b9-a1d5-7eda696bc518";
    public static TaskBoardFilterDisplayControl = "bd967d1e-bd03-4520-a882-d43104703ddb";
    public static TaskBoardRowHeaderDisplayControl = "a2beec8c-5c11-4a24-9361-3183250614fc";
    public static CapacitySearchControl = "aeb42d33-cca6-4530-ae42-7e3a64f1efd1";
    public static CapacityDisplayControl = "a8c5bc60-dad1-47dd-ad74-a6ac9e151c79";
    public static KanbanFilterDisplayControl = "32c71465-1023-48bb-bdb3-40da063293bb";
    public static SprintPlanningDisplayControl = "fc2df75a-e408-4110-ad99-a1d35240d5a7";
}

export class TouchEventsHelper {
    /**
     * Simulates an appropriate mouse event on the target element corresponding to a touch event
     * @param event The touch event which we need to map
     * @param target The target element on which the mouse event is to be simulated
     */
    public static simulateMouseEvent(event: JQueryEventObject, target: any): void {
        var originalEvent = <any>event.originalEvent;
        var touch = originalEvent && originalEvent.changedTouches[0];
        var touchToMouseEventsMap = {
            touchstart: ["mousedown"],
            touchmove: ["mousedown", "mousemove"],
            touchend: ["mouseup"]
        };

        if (touch) {
            var eventTypes: string[] = touchToMouseEventsMap[event.type];
            eventTypes.forEach((eventType: string, index: number, eventTypes: string[]) => {
                var simulatedEvent = document.createEvent("MouseEvent");
                simulatedEvent.initMouseEvent(eventType,
                    true, true, window, 1,
                    touch.screenX, touch.screenY,
                    touch.clientX, touch.clientY, false,
                    false, false, false, 0, null);

                // Dispatch the simulated event to the target element
                target.dispatchEvent(simulatedEvent);
            });
        }
    }
}

export class BacklogSettings {
    private static _backlogContextWitNames: string[];

    /**
     * Gets the list of work item type names that are part of the current backlog
     */
    public static getBacklogContextWorkItemTypeNames() {

        if (!BacklogSettings._backlogContextWitNames) {
            var $settings = $(".backlog-context-work-item-type-names");

            // Parse the settings.
            BacklogSettings._backlogContextWitNames = Utils_Core.parseMSJSON($settings.eq(0).html(), false);

            // Remove the element containing the settings.
            $settings.remove();
        }

        return BacklogSettings._backlogContextWitNames;
    }

    /**
     * Sets the list of work item type names that are part of the current backlog
     * 
     * @param witNames The list of workitem type names
     */
    public static setBacklogContextWorkItemTypeNames(witNames: string[]) {
        this._backlogContextWitNames = witNames;
    }
}