/// <reference types="jquery" />

import VSS = require("VSS/VSS");
import { publishErrorToTelemetry } from "VSS/Error";
import { traceMessage } from "WorkItemTracking/Scripts/Trace";
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Number = require("VSS/Utils/Number");
import Utils_File = require("VSS/Utils/File");
import Diag = require("VSS/Diag");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import Events_Action = require("VSS/Events/Action");
import Events_Handlers = require("VSS/Events/Handlers");
import Events_Services = require("VSS/Events/Services");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");
import TFS_TeamAwarenessService = require("Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService");
import { INode, IReferencedNode, ITeamSettings } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import WITWebApi = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.WebApi");
import TFS_WitBatch_WebApi = require("TFS/WorkItemTracking/BatchRestClient");
import Utils_Html = require("VSS/Utils/Html");
import Telemetry = require("VSS/Telemetry/Services");
import Q = require("q");
import Performance = require("VSS/Performance");
import VSS_Service = require("VSS/Service");
import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import { NodeHelpers } from "WorkItemTracking/Scripts/Utils/NodeHelpers";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { WorkItemRichTextHelper } from "WorkItemTracking/Scripts/Utils/WorkItemRichTextHelper";
import { WIFormCIDataHelper } from "WorkItemTracking/Scripts/Utils/WIFormCIDataHelper";
import { WitFormModeUtility } from "WorkItemTracking/Scripts/Utils/WitControlMode";
import {
    ServerDefaultValueType, WorkItemChangeType, Exceptions, FieldStatus,
    FieldStatusFlags, RuleEvaluatorExecutionPhase, FieldUsages, FieldFlags, WorkItemCategoryConstants,
    Actions, WorkItemUpdateResultState, BugWITFieldReferenceNames, PageSizes
} from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import {
    IProjectProcessData, IWorkItemTypeCategory, IFieldEntry, IWorkItemTypeExtensionFieldEntry,
    IWorkItemTypeExtension, IWorkItemLinkTypeEnd, IWorkItemLinkType, ILinkTypes, WitUserContext, IResourceLink, IWorkItemTypeData,
    RuleName, RuleParameters, FieldRuleType,
    IFieldDataDictionary, IFieldUpdate, IFieldUpdateDictionary, ILinkUpdates, IWorkItemUpdatePackage, ILinkUpdateResult,
    IWorkItemUpdateResult, IWorkItemRelatedData, IWorkItemError, IWorkItemInfoText, ILinkInfo, IWorkItemData, IValueStatus, IItemGlobalValue,
    IItemGlobalValueList, IFieldRule, IEvalStateValue, IFieldSetValueOptions, IFieldProjectData, WorkItemIdentityRef, IRegisteredLinkType, IFieldsToEvaluate, IRuleEnginePayload, RemoteLinkContext
} from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { isLinkFormRegistered } from "WorkItemTracking/Scripts/LinkForm";
import { registerLinkForms } from "WorkItemTracking/Scripts/RegisterLinkForms";
import { IQueryParams, IQueryResult, IPageData } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { NodesCacheManager } from "WorkItemTracking/Scripts/OM/NodesCacheManager";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { FilterByScope } from "VSS/Identities/Picker/Common";
import { WorkItemMetadataCacheStampManager } from "WorkItemTracking/Scripts/WorkItemMetadataCacheStampManager";
import WITContracts = require("TFS/WorkItemTracking/Contracts");
import Contributions_Services = require("VSS/Contributions/Services");
import { Contribution } from "VSS/Contributions/Contracts";
import { IWorkItemDataSource, getDataSources } from "WorkItemTracking/Scripts/OM/DataSources/index";
import { ICacheProvider, constructCacheProvider } from "WorkItemTracking/Scripts/OM/Caching/Cache";
import { getService } from "VSS/Service";
import { WorkItemFormUserLayoutSettingsService } from "WorkItemTracking/Scripts/Form/UserLayoutSettings";
import { WorkItemMetadataCacheInformationManager } from "WorkItemTracking/Scripts/OM/WorkItemMetadataCacheInformationManager";
import { convertPotentialIdentityRefFromFieldValue, createIdentityRefFromDistinctDisplayName, isWorkItemIdentityRef, setResolvedByDescriptorIfWorkItemIdentityRef } from "WorkItemTracking/Scripts/Utils/WorkItemIdentityHelper";
import { IdentityHelper } from "Presentation/Scripts/TFS/TFS.OM.Identities";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { ProjectVisibility } from "TFS/Core/Contracts";
import { WebPageDataService } from "VSS/Contributions/Services";
import { RemoteLinkStatus, IExternalLinkedArtifact } from "TFS/WorkItemTracking/ExtensionContracts";
import { getRemoteWorkItemRestUrl } from "WorkItemTracking/Scripts/Utils/RemoteWorkItemUtils";
import { ToolNames } from "VSS/Artifacts/Constants";

const queueCallbacks = VSS.queueCallbacks;
const queueRequest = VSS.queueRequest;
const handleError = VSS.handleError;
const getErrorMessage = VSS.getErrorMessage;
const guidRegex = /^\{?([\dA-F]{8})-?([\dA-F]{4})-?([\dA-F]{4})-?([\dA-F]{4})-?([\dA-F]{12})\}?$/i;

/**
 * This regex is also used in wh code, see https://mseng.visualstudio.com/DefaultCollection/VSOnline/Modern%20WIT/_git/VSO/pullrequest/189641?path=%2FTfs%2FService%2FWorkItemTracking%2FAdapter%2FWITAdapter.cs&discussionId=1796400&_a=files
 */
const replacementControlChars = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const replacementSurrogateChars = /(^[\uD800-\uDFFF]$)|[^\uD800-\uDBFF](?=[\uDC00-\uDFFF])|[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g;

export function isIdentityPickerSupportedForField(fieldDef: FieldDefinition) {
    return fieldDef && fieldDef.isIdentity;
}

/**
 * dontNotifyAllFieldsOnSave is experimental form code that attempts to improve the way the rule engine notifies form controls after a save operation.
 * Currently, when you save, the work item is saved to the server, and the update result is merged into the current work item object. Then rules are run on all of the fields to determine
 * if based on the update result, other field states need to be changed (readonly is a good example). However currently, we are notifying 1) all fields that were changed in update result + all fields that have rules on them (even if they were not changed!).
 * The reason for this issue is a bug in the rule engine where, we create evaluation states for every field that has a rule on it (this is how we run rules). Then, we return as changedFields  all of the eval states (even if they were not changed by rule!)
 * So with this code change, we are marking the eval state if it was changed by rules, and only return those as changedFields. This stops a lot of javascripting from occuring on large forms like WDGs
 */
function dontNotifyAllFieldsOnSave(): boolean {
    return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.DontNotifyAllFieldsOnSave);
}

/** A dictionary of field reference names to values. */
export type IFieldValueDictionary = { [fieldRefName: string]: any };

export type IContributedLinkTypeData = {
    linkType: string,
    tool: string,
    artifactName: string,
    linkTypeName: string,
    contributionId: string
};
export type IContributedLinkTypes = { [id: string]: IContributedLinkTypeData };

export function createError(message: string, props: any): Error {
    const err = new Error(message);
    $.each(props, (key, value) => {
        err[key] = value;
    });
    return err;
}

function Error_workItemBulkSave(bulkSaveResults: IWorkItemBulkSaveResult[]): Error {
    return createError(Resources.WorkItemBulkSaveFailed, { name: Exceptions.WorkItemBulkSaveException, results: bulkSaveResults });
}

function Error_projectDoesNotExist(projectName: string): Error {
    return createError(Utils_String.format(Resources.ProjectDoesNotExist, projectName), { name: Exceptions.ProjectDoesNotExistException, projectName: projectName });
}

function Error_linkTypeEndDoesNotExist(linkTypeEnd: number | string): Error {
    return createError(Utils_String.format(Resources.WorkItemLinkTypeEndDoesNotExist, linkTypeEnd), { name: Exceptions.LinkTypeEndDoesNotExistException, linkTypeEnd: linkTypeEnd });
}

function Error_linkTypeDoesNotExist(linkType: string): Error {
    return createError(Utils_String.format(Resources.WorkItemLinkTypeDoesNotExists, linkType), { name: Exceptions.LinkTypeDoesNotExistException, linkType: linkType });
}

function Error_workItemSaveFailedDueToInvalidStatus(workItem: WorkItem): Error {
    const errorDetail = workItem.getInfoText().text;
    const err = createError(errorDetail, {
        name: Exceptions.WorkItemSaveFailedDueToInvalidStatusException,
        detail: errorDetail,
        workItem: workItem
    });
    return err;
}

enum ErrorCodes {
    WorkItemMissingOrUpdated = 600122,
    ResourceLinkNotFoundException = 600180
}

export interface IWorkItemChangedArgs {
    workItem?: WorkItem;
    change?: WorkItemChangeType;
    changedWorkItemLinks?: ILinkInfo[];
    firstSave?: boolean;
    changedFields?: IDictionaryStringTo<Field>;
    projectChanged?: boolean;
    typeChanged?: boolean;
}

export class Project {

    public store: WorkItemStore;
    public id: number;
    public name: string;
    public guid: string;
    public workItemTypes: { [name: string]: WorkItemType; };
    public workItemTypeNames: string[];
    public fieldIds: number[];
    public extras: any;
    public process: IProjectProcessData;
    public relatedData: IDictionaryStringTo<any>;
    public nodesCacheManager: NodesCacheManager;
    public visibility: ProjectVisibility;

    constructor(store: WorkItemStore, projectData: any) {
        this.store = store;
        this.id = projectData.id;
        this.name = projectData.name;
        this.guid = projectData.guid;
        this.workItemTypeNames = projectData.workItemTypes;
        this.fieldIds = projectData.fieldIds;
        this.extras = projectData.extras || {};
        this.process = projectData.process;
        this.visibility = projectData.visibility;
        this.relatedData = {};

        if ($.isArray(this.workItemTypeNames)) {
            this.workItemTypeNames.sort(Utils_String.localeIgnoreCaseComparer);
        }

        this.workItemTypes = {};
        this.nodesCacheManager = new NodesCacheManager(this);
    }

    /**
     * Get API location for the current project and default team
     * @param action
     * @param params
     * @return Api location for the given action, current project, and default team
     */
    public getApiLocation(action?: string, params?: any): string {
        return this._getApiLocation(false, action, params);
    }

    /**
     * Get API location for the current project and the current team
     * @param action
     * @param params
     * @return Api location for the given action, current project, and the current team
     */
    public getApiLocationIncludingTeam(action?: string, params?: any): string {
        return this._getApiLocation(true, action, params);
    }

    public path(): string {
        return this.store.path() + "/" + this.name;
    }

    public beginGetWorkItemType(name: string, callback: (workItemType: WorkItemType) => void, errorCallback?: IErrorCallback) {
        this.beginGetWorkItemTypes([name], types => callback(types[0]), errorCallback);
    }

    /**
     * Ensure an array of work item type based on the names are loaded.
     * @param typeNames The work item type names.
     * @param callback The success callback
     * @param errorCallback The callback when something is wrong
     */
    public beginGetWorkItemTypes(typeNames: string[], callback: (workItemTypes: WorkItemType[]) => void, errorCallback?: IErrorCallback) {
        Diag.Debug.assertIsArray(typeNames);
        let waitingTypes = 0;
        let errorExist = false;
        const downloadedTypes: IWorkItemTypeData[] = [];
        let cbQueues: VSS.IQueueCallbacksResult[] = [];
        const areFieldsPopulated: boolean = this.store.fields && this.store.fields.length > 0;

        PerfScenarioManager.addSplitTiming(
            CIConstants.PerformanceEvents.WORKITEMTRACKING_GETTYPES, true);

        const tryFinish = () => {
            waitingTypes--;
            if (!errorExist && waitingTypes === 0) {
                if (downloadedTypes.length > 0) {
                    this._constructWITsAsync(downloadedTypes).then(
                        () => {
                            success();
                        }, failed);
                } else {
                    success();
                }
            }
        };

        let finished = false;
        const success = () => {
            // Safety-guard to detect when the success callback is being called twice
            if (finished) {
                // When we get here, we should throw because the success callback should not be called multiple times, but today this happens.
                // US mseng #1147676 tracks the investigation
                Diag.Debug.logInfo("WIT OM::beginGetWorkItemTypes::success has been called twice, ideally this should not happen.");
            }

            finished = true;

            PerfScenarioManager.addSplitTiming(
                CIConstants.PerformanceEvents.WORKITEMTRACKING_GETTYPES, false);

            for (const cbQueue of cbQueues) {
                cbQueue.finish();
            }

            cbQueues = [];
            if ($.isFunction(callback)) {
                const result: WorkItemType[] = [];
                for (const workItemTypeName of typeNames) {
                    const uname = workItemTypeName.toUpperCase();
                    result.push(this.workItemTypes[uname]);
                }
                callback(result);
            }
        };

        const failed = (err: Error) => {
            for (const cbQueue of cbQueues) {
                cbQueue.error();
            }
            cbQueues = [];
            if (!errorExist) {
                errorExist = true;
                if ($.isFunction(errorCallback)) {
                    errorCallback.apply(this, [err]);
                }
            }
        };

        const fetchTypes = (types: string[]) => {
            const cbQueue = queueCallbacks(this, $.noop, $.noop);
            cbQueues.push(cbQueue);
            for (const typeName of types) {
                this.workItemTypes[typeName.toUpperCase()] = <any>cbQueue.register;
            }

            this.store.witDataManager.beginGetWorkItemTypeData(this.guid, types).then(workItemTypes => {
                for (const workItemType of workItemTypes) {
                    downloadedTypes.push(workItemType);
                }

                tryFinish();
            }, errorCallback);
        };

        const typesToDownload: string[] = [];
        for (const typeName of typeNames) {
            const cachedType = this.workItemTypes[typeName.toUpperCase()]; // This can be either a work item type or a function
            if (!cachedType) {
                typesToDownload.push(typeName);
            } else if ($.isFunction(cachedType)) {
                // there is a pending GET going on for this stype so attach its queue handle
                waitingTypes++;
                (<any>cachedType)(tryFinish, failed);
            }
        }

        typesToDownload.sort(); // sort the work item types so caching should leverage it.

        let currentTypes: string[];
        const queue: string[][] = [];
        let queryStringLength = 0;

        for (const typeName of typesToDownload) {
            // measure current type name length plus param name length
            const typeLength = typeName.length + 11; // + "&typeNames=".length;

            if (queryStringLength + typeLength > 1024) {
                // we are exceeding max url limit, so start a new group
                queryStringLength = 0;
                currentTypes = null;
            }

            if (!currentTypes) {
                currentTypes = [typeName];
                queue.push(currentTypes);

                // count only groups
                waitingTypes++;
            } else {
                // add it to the current group
                currentTypes.push(typeName);
            }

            // measure current query string length so that we don't exceed max url limit
            queryStringLength += typeLength;
        }

        waitingTypes++;

        // If fields are populated in project's call, we dont want to fetch it again
        if (!areFieldsPopulated) {
            this.store.beginGetFields(tryFinish, failed);
        } else {
            tryFinish();
        }

        {
            // we need to check here if settings are already loaded because this function is also called
            // by backlogs page when its trying to set the current work item. It assumes this call is synchronous.
            // The second time this function is called and we have already loaded settings. We dont need this call to wait.
            // We dont need to worry about what happens if this call takes too long the first time. The first time this
            // call is executed it is being called in the right way. The caller is waiting for all calls to complete
            // before handing it off to backlogs to set the current work item.
            const loadUserSettings = this.store.userSettingsLoaded === undefined;
            if (loadUserSettings) {
                waitingTypes++;
                WitFormModeUtility.ensureWitFormModeLoaded().then(
                    () => {
                        // Mark this as true so that next time work item types are being loaded, this code path is not hit since we already have a call in progress
                        this.store.userSettingsLoaded = true;

                        getService(WorkItemFormUserLayoutSettingsService).ensureSettingsAreLoaded().then(() => {
                            tryFinish();
                        }, failed);
                    },
                    failed);
            }
        }

        while (queue.length > 0) {
            fetchTypes(queue.pop());
        }
    }

    public getWorkItemTypes(typeNames: string[]): IPromise<WorkItemType[]> {
        return Q.Promise((resolve, reject) => this.beginGetWorkItemTypes(typeNames, resolve, reject));
    }

    private _constructWITsAsync(witPayloads: IWorkItemTypeData[]): IPromise<void> {
        const defer = Q.defer<any>();
        const setIdsMap: IDictionaryStringTo<string> = {};
        const setIds: string[] = [];
        const payloads: IWorkItemTypeData[] = [];

        const success = () => {
            let refreshFields = false;
            const createWit = (payload: IWorkItemTypeData) => {
                const wit = new WorkItemType(this, payload);
                const typeName = payload.name.toUpperCase();
                this.workItemTypes[typeName] = wit;
            };

            for (const payload of witPayloads) {

                const fieldDefs = payload.fields;
                let fieldId: number;
                for (let fdNo = 0; fdNo < fieldDefs.length; fdNo++) {
                    fieldId = fieldDefs[fdNo];
                    // Will only be true if a field was added server side after page load
                    if (!this.store.fieldMap[fieldId] && !this.store.fieldMapById[fieldId]) {
                        refreshFields = true;
                        break;
                    }
                }

                if (refreshFields) {
                    // If refreshFields is true, we create workitemtype object after refreshing fields.
                    payloads.push(payload);
                } else {
                    createWit(payload);
                }
            }
            if (refreshFields) {
                this.store.refreshFields().then(() => {
                    for (const payload of payloads) {
                        createWit(payload);
                    }
                    defer.resolve(null);
                }, (error) => {
                    defer.reject(error);
                });
            } else {
                defer.resolve(null);
            }
        };

        const failed = (error: Error) => {
            for (const { name: typeName } of witPayloads) {
                delete this.workItemTypes[typeName.toUpperCase()];
            }
            defer.reject(error);
        };

        for (const witPayload of witPayloads) {
            if (witPayload.rules && witPayload.rules.globals && witPayload.rules.globals.length > 0) {
                const globals = witPayload.rules.globals;
                for (const id of globals) {
                    setIdsMap[id] = id;
                }
            }
        }

        for (const key in setIdsMap) {
            if (setIdsMap.hasOwnProperty(key)) {
                setIds.push(key);
            }
        }

        this.store.beginEnsureConstantSets(setIds, success, failed);
        return defer.promise;
    }

    public getWorkItemType(name: string): WorkItemType {
        const uname = name.toUpperCase();
        const wit = this.workItemTypes[uname];

        if (wit && !$.isFunction(wit)) {
            return wit;
        }

        Diag.Debug.fail(Utils_String.format("WorkItemType '{0}' is not ready yet. Use beginGetWorkItemType('{0}') to download work item type.", name));
    }

    public beginQuery(wiql: string, callback: IFunctionPR<IQueryResult, void>, errorCallback?: IErrorCallback, params?: IQueryParams) {
        this.store.beginQuery(this.guid, wiql, callback, errorCallback, params);
    }

    public beginSearch(searchText: string, callback: IResultCallback, errorCallback?: IErrorCallback, params?: any) {
        this.store.beginSearch(this, searchText, callback, errorCallback, params);
    }

    public beginUpdateColumnOptions(persistenceId: string, fields: Field[], callback: IResultCallback, errorCallback?: IErrorCallback) {
        Ajax.postMSJSON(this.getApiLocation("updateColumnOptions"), { persistenceId: persistenceId, fields: fields }, callback, errorCallback);
    }

    public beginGetGroups(includeGlobal: boolean, callback: IResultCallback, errorCallback?: IErrorCallback) {
        this.store.beginGetGroups(this, includeGlobal, callback, errorCallback);
    }

    public beginGetWorkItemCategories(callback: IResultCallback, errorCallback?: IErrorCallback) {
        this.store.beginGetWorkItemCategories(this, callback, errorCallback);
    }

    public beginGetVisibleWorkItemTypeNames(callback: (workItemTypeNames: string[]) => void, errorCallback?: IErrorCallback) {
        const hiddenCategory = [WorkItemCategoryConstants.HIDDEN];
        this._beginGetWorkItemTypeNames(callback, hiddenCategory, errorCallback);
    }

    public beginGetValidWorkItemTypeNames(callback: (workItemTypeNames: string[], excludedWorkItemTypeNames: string[]) => void, errorCallback?: IErrorCallback) {
        const invalidCategories = [WorkItemCategoryConstants.HIDDEN, WorkItemCategoryConstants.TEST_CASE, WorkItemCategoryConstants.TEST_PLAN, WorkItemCategoryConstants.TEST_SUITE];
        this._beginGetWorkItemTypeNames(callback, invalidCategories, errorCallback);
    }

    private _beginGetWorkItemTypeNames(callback: (workItemTypeNames: string[], excludedWorkItemTypeNames?: string[]) => void, excludedCategoryNames?: string[], errorCallback?: IErrorCallback) {

        this.beginGetWorkItemCategories((allCategories: IDictionaryStringTo<IWorkItemTypeCategory>) => {
            const result: string[] = [];
            const excludedWorkItemTypeDict: IDictionaryStringTo<boolean> = {};

            // Gather any work item types names that are from excluded categories
            if (excludedCategoryNames) {
                $.each(excludedCategoryNames, (i: number, categoryName: string) => {
                    if (allCategories && allCategories[categoryName]) {
                        const excludedCategory = allCategories[categoryName];
                        $.each(excludedCategory.workItemTypeNames, (i, name) => {
                            excludedWorkItemTypeDict[name] = true;
                        });
                    }
                });
            }

            // Add all included work item type names to the result list
            $.each(this.workItemTypeNames, (i: number, witName: string) => {
                if (!excludedWorkItemTypeDict.hasOwnProperty(witName)) {
                    result.push(witName);
                }
            });

            const excludedWorkItemTypeNames = Object.keys(excludedWorkItemTypeDict);

            if ($.isFunction(callback)) {
                callback.call(this, result, excludedWorkItemTypeNames);
            }
        }, errorCallback);
    }

    private _getApiLocation(includeTeam: boolean, action?: string, params?: any): string {
        const teamOptions: any = {};
        if (!includeTeam) {
            // Prevent current team from being added to the api location.
            teamOptions.team = "";
        }

        return this.store.getTfsContext().getActionUrl(action || "", "wit", $.extend({ project: this.guid, area: "api" }, teamOptions, params));
    }
}

export interface IWorkItemBulkSaveResult {
    workItem: WorkItem;
    error?: any;
}

export interface IWorkItemsBulkSaveSuccessResult {
    workItems: WorkItem[];
}

const reWellKnownConstants = /^-(1|2|10|30)(\|.*)?$/;

export class WorkItemStore extends TFS_Service.TfsService {
    public static readonly FutureDate: Date = new Date(253370764800000);

    public static readonly LayoutUserSettingsKey = "workItemTracking.LayoutUserSettings";

    public fields: FieldDefinition[];
    private _getFieldsPromise: Promise<FieldDefinition[]>;

    public fieldMap: {
        [key: string]: FieldDefinition;
    };

    public fieldMapById: {
        [id: string]: FieldDefinition;
    };

    public projects: Project[];
    public constantSets: IDictionaryStringTo<any>;
    public allowedValues: any;
    public groups: any;
    public witCategories: any;
    public linkTypes: IWorkItemLinkType[];
    public linkTypeEnds: IWorkItemLinkTypeEnd[];
    public registeredLinkTypes: IRegisteredLinkType[];
    public contributedLinkTypes: IContributedLinkTypes;
    public relatedData: IDictionaryStringTo<any>;

    public metadataCacheStampManager: WorkItemMetadataCacheStampManager;
    public witDataManager: WorkItemDataManager;

    /**
     * Flag used to determine if the user settings have been loaded in store
     * 
     * @deprecated Keep this for old work item form for now, remove with cleanup
     */
    public userSettingsLoaded: boolean;
    private workItemTypeExtensions: { [key: string]: IWorkItemTypeExtension; };
    private _ongoingDeleteOrRestoreOperationCt: number = 0;
    private _allProjectsLoaded: boolean;
    private _allProjectsLoadingPromise: Q.Promise<IFieldProjectData>;
    private _projectLoadingPromisesMap: IDictionaryStringTo<Q.Promise<IFieldProjectData>>;
    private _queryExecutingPromiseMap: IDictionaryStringTo<Promise<IQueryResult>>;
    private _beginGetContributedLinkTypesPromise: Q.Promise<IContributedLinkTypes>;

    constructor() {
        super();

        this.constantSets = {};
        this.allowedValues = {};
        this.groups = {};
        this.witCategories = {};
        this.workItemTypeExtensions = {};
        this.relatedData = {};
        this._allProjectsLoaded = false;
        this._projectLoadingPromisesMap = {};
        this._queryExecutingPromiseMap = {};
    }

    public initializeConnection(tfsConnection: VSS_Service.VssConnection) {
        super.initializeConnection(tfsConnection);

        this.metadataCacheStampManager = new WorkItemMetadataCacheStampManager(this.getTfsContext());
        this.witDataManager = new WorkItemDataManager(this.getTfsContext(), this.metadataCacheStampManager);
    }

    public isDeletingOrRestoring(): boolean {
        return this._ongoingDeleteOrRestoreOperationCt > 0;
    }

    public path(): string {
        return Utils_File.combinePaths(this.getConnection().getHostUrl(), "WorkItemStore");
    }

    public getApiLocation(action?: string, params?: any): string {
        return this.getTfsContext().getActionUrl(action || "", "wit", $.extend({ project: "", team: "", area: "api" }, params));
    }

    public getProjectApiLocationIncludingTeam(projectGuid: string, action?: string, params?: any): string {
        return this.getTfsContext().getActionUrl(action || "", "wit", $.extend({ project: projectGuid, area: "api" }, params));
    }

    // For our performance scenarios, we want to log the unencoded work item types etag.
    public getWorkItemTypesEtagForCI() {
        return this.metadataCacheStampManager.workItemTypesEtag;
    }

    public getCurrentUserName(): string {
        return this.getCurrentUser().distinctDisplayName;
    }

    public getCurrentUser(): WorkItemIdentityRef {
        const identity = this.getTfsContext().currentIdentity;
        const displayName = identity.displayName;
        const uniqueName = identity.uniqueName;

        return {
            distinctDisplayName: IdentityHelper.getDistinctDisplayName(displayName, uniqueName),
            identityRef: {
                id: identity.id,
                displayName: displayName,
                uniqueName: uniqueName
            } as IdentityRef
        };
    }

    private _loadFieldsFromServer(successCallback: (field: FieldDefinition[]) => void, errorCallback?: IErrorCallback): void {
        if (this._getFieldsPromise) {
            this._getFieldsPromise.then(successCallback, errorCallback);
            return;
        }

        const resolveFinalize = result => {
            this._getFieldsPromise = null;
            return result;
        };

        const rejectFinalize = error => {
            this._getFieldsPromise = null;
            throw error;
        };

        this._getFieldsPromise = new Promise<FieldDefinition[]>((resolve, reject) => {
            return this.witDataManager.beginGetFields().then(fields => {
                this._prepareFields(fields);
                resolve(this.fields);
            }, reject);
        }).then(resolveFinalize, rejectFinalize);

        this._getFieldsPromise.then(successCallback, errorCallback);
    }

    public beginGetFields(successCallback: (field: FieldDefinition[]) => void, errorCallback?: IErrorCallback): void {
        if (this.fields) {
            successCallback(this.fields);
            return;
        }

        this._loadFieldsFromServer(successCallback, errorCallback);
    }

    public refreshFields(): Q.Promise<void> {
        return Q.Promise<void>((resolve, reject) => {
            this._loadFieldsFromServer(fields => resolve(null), reject);
        });
    }

    /**
     * Returns field definition by field id, name and reference name
     * @param fieldReference
     */
    public getFieldDefinition(fieldReference: number | string): FieldDefinition {
        Diag.Debug.assert(Boolean(this.fieldMap), "Fields are not available. It must be downloaded first. Use beginGetFields method.");

        const key = ("" + fieldReference).toUpperCase();

        return this.fieldMap[key] || this.fieldMapById[key];
    }

    public beginGetProjects(callback: (projects: Project[]) => void, errorCallback?: IErrorCallback) {
        if (this._allProjectsLoaded) {
            callback(this.projects);
        } else if (this._allProjectsLoadingPromise && this._allProjectsLoadingPromise.isPending()) {
            this._allProjectsLoadingPromise = this._allProjectsLoadingPromise.then<IFieldProjectData>((fieldProjectData: IFieldProjectData) => {
                callback(this.projects);
                return fieldProjectData;
            }, (error) => {
                if ($.isFunction(errorCallback)) {
                    errorCallback(error);
                }
                return error;
            });
        } else {
            this._allProjectsLoadingPromise = this._loadProjects().then<IFieldProjectData>((fieldProjectData: IFieldProjectData) => {
                if (!this.projects || this.projects.length === 0) {
                    this.projects = fieldProjectData.projects.map((projectData) => {
                        return new Project(this, projectData);
                    });
                } else {
                    for (const projectData of fieldProjectData.projects) {
                        if (!this.hasProject(projectData.guid)) {
                            this.projects.push(new Project(this, projectData));
                        }
                    }
                }

                this._allProjectsLoaded = true;
                callback(this.projects);

                return fieldProjectData;
            }, (error) => {
                if ($.isFunction(errorCallback)) {
                    errorCallback(error);
                }
                return error;
            });
        }
    }

    public beginGetContributedLinkTypes(): Q.Promise<IContributedLinkTypes> {

        if (this._beginGetContributedLinkTypesPromise) {
            return this._beginGetContributedLinkTypesPromise;
        }

        let defer = Q.defer<IContributedLinkTypes>();
        let supportedArtifactTypes: IContributedLinkTypes = {}; // map to avoid duplicate artifact types.
        let contributionId = "ms.vss-work-web.workitem-artifact-links";

        let extnService = VSS_Service.getService(Contributions_Services.ExtensionService);
        extnService.getContributionsForTargets([contributionId]).then((contributions: Contribution[]) => {
            $.each(contributions, function (ind, contribution) {
                let toolId = contribution.properties["toolId"];
                let artifactsSupportedBycontribution = contribution.properties["supportedArtifactTypes"];
                $.each(artifactsSupportedBycontribution, function (i, supportedArtifact) {
                    let artifactName: string = supportedArtifact["name"];
                    let linkTypes = supportedArtifact["linkTypes"];

                    // Build the IContributedLinkTypeData object map
                    $.each(linkTypes, function (i, linkType) {
                        let data: IContributedLinkTypeData = {
                            "linkType": linkType["id"],
                            "tool": toolId,
                            "artifactName": artifactName,
                            "linkTypeName": linkType["name"],
                            "contributionId": contribution.id
                        };
                        supportedArtifactTypes[linkType["id"]] = data;
                    });
                });
            });
            this.contributedLinkTypes = supportedArtifactTypes;
            defer.resolve(this.contributedLinkTypes);
        },
            (err) => {
                defer.reject(err);
            });

        this._beginGetContributedLinkTypesPromise = defer.promise;

        return this._beginGetContributedLinkTypesPromise;
    }

    public getContributedLinkTypes(): IContributedLinkTypes {
        if (!!this.contributedLinkTypes) {
            return this.contributedLinkTypes;
        }
        Diag.Debug.fail("Contributed link types are not ready yet. Use beginGetContributedLinkTypes to download.");
    }

    private _loadProjects(nameOrId?: string): Q.Promise<IFieldProjectData> {
        const success = (fieldProjectData: IFieldProjectData) => {
            Events_Services.getService().fire(Actions.NEW_PROJECT_DATA, this, fieldProjectData.projects);
            this._prepareFields(fieldProjectData.fields, true);
        };

        if (nameOrId) {
            return Q.Promise((resolve, reject) => this.witDataManager.beginGetFieldProjectData(nameOrId).then((fieldProjectData) => {
                success(fieldProjectData);
                resolve(fieldProjectData);
            }, reject));
        }

        const defer = Q.defer<IFieldProjectData>();

        this.metadataCacheStampManager.addStampToParams(WITConstants.WITCommonConstants.TeamProjects, { includeFieldDefinitions: true }, (params) => {
            PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMTRACKING_GETPROJECTS_REQUEST, true);

            if (nameOrId) {
                params["namesOrIds"] = [nameOrId];
            }

            Ajax.getMSJSON(this.getApiLocation("teamProjects"), params, (fieldProjectData: IFieldProjectData, textStatus: string, xhr: JQueryXHR) => {
                PerfScenarioManager.addData({
                    [`${CIConstants.PerformanceEvents.WORKITEMTRACKING_GETPROJECTS_REQUEST}.ETAG`]: xhr.getResponseHeader("ETag")
                });
                PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMTRACKING_GETPROJECTS_REQUEST, false);

                success(fieldProjectData);

                defer.resolve(fieldProjectData);
            }, (error) => {
                defer.reject(error);
            });
        }, null);

        return defer.promise;
    }

    public getProjects(): Project[] {
        if (this.projects && !$.isFunction(this.projects)) {
            return this.projects;
        }

        Diag.Debug.fail("Projects are not ready yet. Use beginGetProjects method to download projects from the server.");
    }

    public getProject(nameOrId: string, throwIfDoesNotExist: boolean = true): Project {
        const projects = throwIfDoesNotExist ? this.getProjects() : this.projects;
        const project = Utils_Array.first(projects || [], (project: Project) => {
            return Utils_String.equals(project.name, nameOrId, true) || Utils_String.equals(project.guid, nameOrId, true);
        });

        if (project) {
            return project;
        } else if (throwIfDoesNotExist) {
            throw Error_projectDoesNotExist(nameOrId);
        } else {
            return null;
        }
    }

    public hasProject(nameOrId: string): boolean {
        if (this.projects && !$.isFunction(this.projects)) {
            return Utils_Array.arrayContains(nameOrId, this.projects, (id: string, project: Project) => {
                return Utils_String.equals(project.name, id, true) || Utils_String.equals(project.guid, id, true);
            });
        }

        return false;
    }

    public beginGetProject(nameOrId: string, callback: (project: Project) => void, errorCallback?: IErrorCallback) {
        let project = this.getProject(nameOrId, false);

        const onSuccess = () => {
            try {
                project = this.getProject(nameOrId);
                callback.call(this, project);
            } catch (error) {
                handleError(error, errorCallback, this);
            }
        };

        if (project) {
            callback.call(this, project);
        } else if (this._allProjectsLoadingPromise && this._allProjectsLoadingPromise.isPending()) {
            this._allProjectsLoadingPromise = this._allProjectsLoadingPromise.then<IFieldProjectData>((fieldProjectData: IFieldProjectData) => {
                onSuccess();
                return fieldProjectData;
            }, (error) => {
                if ($.isFunction(errorCallback)) {
                    errorCallback(error);
                }
                return error;
            });
        } else if (this._projectLoadingPromisesMap[nameOrId] && this._projectLoadingPromisesMap[nameOrId].isPending()) {
            this._projectLoadingPromisesMap[nameOrId] = this._projectLoadingPromisesMap[nameOrId].then<IFieldProjectData>((fieldProjectData: IFieldProjectData) => {
                onSuccess();
                return fieldProjectData;
            }, (error) => {
                if ($.isFunction(errorCallback)) {
                    errorCallback(error);
                }
                return error;
            });
        } else {
            this._projectLoadingPromisesMap[nameOrId] = this._loadProjects(nameOrId).then<IFieldProjectData>(
                (fieldProjectData: IFieldProjectData) => {
                    if (fieldProjectData.projects && fieldProjectData.projects.length === 1) {
                        const projectObj = new Project(this, fieldProjectData.projects[0]);

                        if (this.projects) {
                            if (!this.hasProject(projectObj.guid)) {
                                this.projects.push(projectObj);
                            }
                        } else {
                            this.projects = [projectObj];
                        }
                    }

                    onSuccess();
                    return fieldProjectData;
                }, (error) => {
                    if ($.isFunction(errorCallback)) {
                        errorCallback(error);
                    }
                    return error;
                });
        }
    }

    public beginGetTeamSettings(teamId: string): IPromise<ITeamSettings> {
        let project: Project;
        let teamSettings: ITeamSettings;
        const teamSettingsDeferred = Q.defer<ITeamSettings>();

        const tryFinish = () => {
            if (project && teamSettings) {
                project.nodesCacheManager.addReferencedNodes(teamSettings.referencedNodes);
                teamSettingsDeferred.resolve(teamSettings);
            }
        };

        this.beginGetProject(
            this.getTfsContext().navigation.projectId,
            (projectData: Project) => {
                project = projectData;
                tryFinish();
            },
            (error) => teamSettingsDeferred.reject(error));

        const teamAwarenessService = VSS_Service.getService(TFS_TeamAwarenessService.TeamAwarenessService);
        teamAwarenessService.beginGetTeamSettings(teamId).then(
            (teamSettingsData: ITeamSettings) => {
                teamSettings = teamSettingsData;
                tryFinish();
            },
            (error) => teamSettingsDeferred.reject(error));

        return teamSettingsDeferred.promise;
    }

    public beginGetWorkItemData(ids: number[],
        callback: (workItemData: IWorkItemData | IWorkItemData[]) => void,
        errorCallback?: IErrorCallback,
        isDeleted?: boolean,
        includeHistory?: boolean,
        excludeFromUserRecentActivity?: boolean) {

        let argumentError;

        if (!ids) {
            argumentError = new Error(Resources.BeginGetWorkItemArgumentNull);
        } else if (!$.isArray(ids)) {
            const id = +ids;
            ids = [id];
        } else if (ids.length === 0) {
            argumentError = new Error(Resources.BeginGetWorkItemArgumentNull);
        }

        if (ids) {
            for (let i = 0, l = ids.length; i < l; ++i) {
                // Ensure values are numbers
                ids[i] = +ids[i];

                if (ids[i] === undefined) {
                    argumentError = new Error(Resources.WorkItemIdUndefined);
                    break;
                } else if (isNaN(ids[i])) {
                    argumentError = new Error(Resources.WorkItemIdNaN);
                    break;
                }
                else if (ids[i] <= 0) {
                    argumentError = new Error(Resources.WorkItemIdOutOfRange);
                    break;
                }
            }
        }

        if (argumentError) {
            argumentError.name = "ArgumentException";
            handleError(argumentError, errorCallback, this);

            // Ensure we are publishing telemetry on invalid arguments.  Seems that some clients may be handling the error
            // callback and not logging the error, and handleError will not publish telemetry if 'errorCallback' is a function.
            if (errorCallback) {
                publishErrorToTelemetry(argumentError);
            }
            return;
        }

        const successCallback = (workItemPayload: any /* TODO: can be type, need to check in server */) => {
            if ($.isFunction(callback)) {
                if (workItemPayload && workItemPayload.length === 1) {
                    callback.call(this, workItemPayload[0], errorCallback);
                } else {
                    callback.call(this, workItemPayload, errorCallback);
                }
            }
        };

        this.witDataManager.beginGetWorkItemData(ids, isDeleted, !excludeFromUserRecentActivity, includeHistory)
            .then(successCallback, errorCallback);
    }

    public beginGetWorkItem(id: number, callback: (workItem: WorkItem) => void, errorCallback?: IErrorCallback, isDeleted?: boolean, includeExtensionFields?: boolean) {
        this.beginGetWorkItems([id], (workItems: WorkItem[]) => {
            if ($.isFunction(callback)) {
                callback.call(this, workItems && workItems[0]);
            }
        }, errorCallback, isDeleted, includeExtensionFields);
    }

    public beginGetWorkItems(
        ids: number[],
        callback: (workItems: WorkItem[]) => void,
        errorCallback?: IErrorCallback,
        isDeleted?: boolean,
        includeExtensionFields: boolean = false,
        excludeFromUserRecentActivity: boolean = false
    ) {
        this.beginGetWorkItemData(ids, (workItemPayload: IWorkItemData | IWorkItemData[]) => {
            let queue: IWorkItemData[];
            let index = 0;
            const workItems: WorkItem[] = [];

            if (workItemPayload) {
                if (!$.isArray(workItemPayload)) {
                    queue = [<IWorkItemData>workItemPayload];
                } else {
                    queue = <IWorkItemData[]>workItemPayload;
                }
            }

            const finish = () => {
                if ($.isFunction(callback)) {
                    callback.call(this, workItems);
                }
            };

            const failed = (error: TfsError) => {
                handleError(error, errorCallback, this);
            };

            const continueProcess = () => {
                let payload: IWorkItemData;
                payload = queue && queue[index++];

                if (payload) {
                    let workItemType: WorkItemType = null;
                    let retrievedExtensions: IWorkItemTypeExtension[] = null;

                    let linkTypesRetrieved = false;
                    const createWorkItem = () => {
                        if (workItemType && (!includeExtensionFields || retrievedExtensions) && linkTypesRetrieved) {
                            try {
                                const workItem = workItemType.create(payload, retrievedExtensions);
                                // Set the extension Ids in case extension fields are not retrieved.
                                // This can be used later to fetch the extensions.
                                workItem.extensionIds = workItem.extensionIds.concat(payload.currentExtensions);
                                workItems.push(workItem);

                                Utils_Core.delay(this, 0, continueProcess);
                            } catch (e) {
                                failed(e);
                            }
                        }
                    };

                    this.beginGetLinkTypes(() => {
                        linkTypesRetrieved = true;
                        createWorkItem();
                    }, failed);

                    // Extension fields are fetched on-demand ask from the consumers
                    // For opening a workitem form/dialog we dont need extension fields
                    if (includeExtensionFields) {
                        this.beginGetWorkItemTypeExtensions(payload.currentExtensions, (extensions) => {
                            retrievedExtensions = extensions;
                            createWorkItem();
                        }, failed);
                    }

                    const projectIdOrName = payload.projectId || payload.fields[WITConstants.CoreField.TeamProject];

                    this.beginGetProject(projectIdOrName, (project: Project) => {
                        const witName = payload.fields[WITConstants.CoreField.WorkItemType];
                        project.beginGetWorkItemType(witName, (wit) => {
                            workItemType = wit;
                            createWorkItem();
                        }, failed);

                    }, failed);
                } else {
                    finish();
                }
            };

            continueProcess();
        }, errorCallback, isDeleted, /* includeHistory: */ undefined, excludeFromUserRecentActivity);
    }

    public beginQuery(projectGuid: string, wiql: string, callback: IFunctionPR<IQueryResult, void>, errorCallback?: IErrorCallback, params?: any) {
        /// <param name="params" type="Object">
        /// runQuery: Boolean, true  by default
        /// includePayload: Boolean, default value is true, ignored is runQuery is false
        /// fields: String[],
        /// sortFields: SortOrderEntry[]
        /// </param>
        /// <remarks>
        /// SortOrderEntry { name: String, descending: Boolean }
        /// </remarks>

        // queries initially executed w/o a callback get cached in the _queryExecutingPromiseMap which can then be
        // consumed by a later call to beginQuery with the same wiql.
        if (this._queryExecutingPromiseMap[wiql]) {
            this._queryExecutingPromiseMap[wiql].then((queryResult) => {
                delete this._queryExecutingPromiseMap[wiql];
                if ($.isFunction(callback)) {
                    callback.call(this, queryResult);
                }
            }, errorCallback);
        } else {
            const executeQuery = (resolve: IFunctionPR<IQueryResult, void>, reject: IErrorCallback) => {
                const apiLocation = projectGuid ? this.getProjectApiLocationIncludingTeam(projectGuid, "query") : this.getApiLocation("query");
                Ajax.postMSJSON(apiLocation, $.extend({ wiql: wiql }, params), (queryModel: IQueryResult) => {
                    resolve(queryModel);
                }, reject);
            };

            // no callback means we want to execute the query but not consume the results yet
            if (callback === null) {
                this._queryExecutingPromiseMap[wiql] = new Promise<IQueryResult>(executeQuery);
            } else {
                executeQuery(callback, errorCallback);
            }
        }
    }

    /**
     * Helper function for batch work items.
     *
     * @param workItemIds list of work item IDs to delete.
     * @param storeFunction function to execute in batch.
     * @param callback callback function on success.
     * @param errorCallback callback function on failure.
     */
    private _beginWorkItemsBatchHelper(
        workItemIds: number[],
        storeFunction: (workItemIds: number[]) => IPromise<any>,
        callback?: (result: TFS_WitBatch_WebApi.JsonHttpResponse[]) => void,
        errorCallback?: IErrorCallback) {
        const workItemIdsQueue: number[][] = [];
        const resultList: TFS_WitBatch_WebApi.JsonHttpResponse[] = [];

        workItemIdsQueue.push(workItemIds);

        const finish = (results: TFS_WitBatch_WebApi.JsonHttpResponse[]) => {
            if ($.isFunction(callback)) {
                callback.call(this, results);
            }
        };

        const failed = (error: TfsError) => {
            handleError(error, errorCallback, this);
        };

        const continueProcess = () => {
            if (workItemIdsQueue.length > 0) {
                const currentWorkItemIds = workItemIdsQueue.pop();

                if (currentWorkItemIds.length > PageSizes.SAVE) {
                    workItemIdsQueue.push(currentWorkItemIds.splice(PageSizes.SAVE));
                }

                storeFunction(currentWorkItemIds).then(
                    (results?: TFS_WitBatch_WebApi.JsonHttpBatchResponse) => {
                        if (results && results.count > 0) {
                            $.each(results.value, (i, result: TFS_WitBatch_WebApi.JsonHttpResponse) => {
                                resultList.push(result);
                            });
                        }

                        Utils_Core.delay(this, 0, continueProcess);
                    },
                    (error: Error) => {
                        failed(error);
                    });
            } else {
                finish(resultList);
            }
        };

        continueProcess();
    }

    /**
     * Deletes the given work items
     *
     * @param  {number[]} workItemIds list of work item IDs to delete
     *
     * @returns IPromise<WorkItemDeleteReference[]> array of WorkItemDeleteReference
     */
    private _beginDeleteWorkItems(workItemIds: number[]): IPromise<TFS_WitBatch_WebApi.JsonHttpBatchResponse> {
        const witHttpBatchClient = this.tfsConnection.getHttpClient<TFS_WitBatch_WebApi.WorkItemTrackingHttpBatchClient>(TFS_WitBatch_WebApi.WorkItemTrackingHttpBatchClient);
        this._ongoingDeleteOrRestoreOperationCt++;
        return witHttpBatchClient.deleteWorkItemsBatch(workItemIds).then(
            (response: TFS_WitBatch_WebApi.JsonHttpBatchResponse) => {
                // set deleting flag = false
                this._ongoingDeleteOrRestoreOperationCt--;
                if (response.count > 0) {
                    const results: TFS_WitBatch_WebApi.JsonHttpResponse[] = response.value;
                    for (let i = 0, len = results.length; i < len; i++) {
                        const result: TFS_WitBatch_WebApi.JsonHttpResponse = results[i];
                        if (result.code === 204) {
                            Events_Services.getService().fire(Actions.WORKITEM_DELETED, this, { workItemId: workItemIds[i] });
                        }
                    }
                }
                return response;
            }, (error) => {
                // set deleting flag = false
                this._ongoingDeleteOrRestoreOperationCt--;
                throw error;
            });
    }

    /**
     * Delete the given work items in batch.
     *
     * @param workItemIds list of work item IDs to delete.
     * @param callback callback function on success.
     * @param errorCallback callback function on failure.
     */
    public beginDeleteWorkItemsBatch(workItemIds: number[], callback?: (response: TFS_WitBatch_WebApi.JsonHttpResponse[]) => void, errorCallback?: IErrorCallback) {
        this._beginWorkItemsBatchHelper(
            workItemIds,
            (workItemIds) => {
                return this._beginDeleteWorkItems(workItemIds);
            },
            callback,
            errorCallback);
    }

    /**
     * Restores the given work items
     *
     * @param  {number[]} workItemIds list of work item IDs to restore
     *
     * @returns IPromise<WorkItemDeleteReference[]> array of WorkItemDeleteReference
     */
    private _beginRestoreWorkItems(workItemIds: number[]): IPromise<TFS_WitBatch_WebApi.JsonHttpBatchResponse> {
        const witHttpBatchClient = this.tfsConnection.getHttpClient<TFS_WitBatch_WebApi.WorkItemTrackingHttpBatchClient>(TFS_WitBatch_WebApi.WorkItemTrackingHttpBatchClient);
        this._ongoingDeleteOrRestoreOperationCt++;
        return witHttpBatchClient.restoreWorkItemsBatch(workItemIds).then(
            (response: TFS_WitBatch_WebApi.JsonHttpBatchResponse) => {
                // set deleting flag = false
                this._ongoingDeleteOrRestoreOperationCt--;
                if (response.count > 0) {
                    const result = response.value;
                    result.forEach((restoreResponse: TFS_WitBatch_WebApi.JsonHttpResponse) => {
                        if (restoreResponse.code === 200) {
                            const body: { id: number } = $.parseJSON(restoreResponse.body);
                            Events_Services.getService().fire(Actions.WORKITEM_RESTORED, this, { workItemId: body.id });
                        }
                    });
                }
                return response;
            }, (error) => {
                // set deleting flag = false
                this._ongoingDeleteOrRestoreOperationCt--;
                throw error;
            });
    }

    /**
     * Restore the given work items in batch.
     *
     * @param workItemIds list of work item IDs to restore.
     * @param callback callback function on success.
     * @param errorCallback callback function on failure.
     */
    public beginRestoreWorkItemsBatch(workItemIds: number[], callback?: (result: TFS_WitBatch_WebApi.JsonHttpResponse[]) => void, errorCallback?: IErrorCallback) {
        this._beginWorkItemsBatchHelper(
            workItemIds,
            (workItemIds) => {
                return this._beginRestoreWorkItems(workItemIds);
            },
            callback,
            errorCallback);
    }

    /**
     * Destroy the given work items
     *
     * @param  {number[]} workItemIds list of work item IDs to destroy
     *
     * @returns IPromise<void>
     */
    private _beginDestroyWorkItems(workItemIds: number[]): IPromise<TFS_WitBatch_WebApi.JsonHttpBatchResponse> {
        const witHttpBatchClient = this.tfsConnection.getHttpClient<TFS_WitBatch_WebApi.WorkItemTrackingHttpBatchClient>(TFS_WitBatch_WebApi.WorkItemTrackingHttpBatchClient);
        this._ongoingDeleteOrRestoreOperationCt++;
        return witHttpBatchClient.destroyWorkItemsBatch(workItemIds).then(
            (response: TFS_WitBatch_WebApi.JsonHttpBatchResponse) => {
                // set deleting flag = false
                this._ongoingDeleteOrRestoreOperationCt--;
                if (response.count > 0) {
                    const results = response.value;
                    for (let i = 0, len = results.length; i < len; i++) {
                        const result: TFS_WitBatch_WebApi.JsonHttpResponse = results[i];
                        if (result.code === 204) {
                            Events_Services.getService().fire(Actions.WORKITEM_DESTROYED, this, { workItemId: workItemIds[i] });
                        }
                    }
                }
                return response;
            }, (error) => {
                // set deleting flag = false
                this._ongoingDeleteOrRestoreOperationCt--;
                throw error;
            });
    }

    /**
     * Destroy the given work items in batch.
     *
     * @param workItemIds list of work item IDs to destroy.
     * @param callback callback function on success.
     * @param errorCallback callback function on failure.
     */
    public beginDestroyWorkItemsBatch(workItemIds: number[], callback?: (result: TFS_WitBatch_WebApi.JsonHttpResponse[]) => void, errorCallback?: IErrorCallback): void {
        this._beginWorkItemsBatchHelper(
            workItemIds,
            (workItemIds) => {
                return this._beginDestroyWorkItems(workItemIds);
            },
            callback,
            errorCallback);
    }

    public beginSearch(project: Project, searchText: string, callback: IResultCallback, errorCallback?: IErrorCallback, params?: any): void {
        Ajax.getMSJSON((<any>project || this).getApiLocation("search"), $.extend({ searchText: searchText }, params), (queryModel: IQueryResult) => {
            if ($.isFunction(callback)) {
                callback.call(this, queryModel);
            }
        }, errorCallback);
    }

    public beginGetLinkTypes(callback: (workItemLinkTypes: IWorkItemLinkType[], registeredLinkTypes: IRegisteredLinkType[]) => void, errorCallback?: IErrorCallback): void {
        const cbWrapper = () => {
            if (callback) {
                callback.call(this, this.linkTypes, this.registeredLinkTypes);
            }
        };

        queueRequest(this, this, "linkTypes", cbWrapper, errorCallback, (succeeded: IResultCallback, failed: IErrorCallback) => {
            this.witDataManager.beginGetLinkTypes()
                .then((linkTypes: ILinkTypes) => {
                    this._bindLinkTypeEnds(linkTypes.witLinkTypes);

                    // Right now, artifact link types are coupled with WIT service code. We have to register all the link types in the
                    // servicing step "Register WorkItemTracking Artifact Types" even if it is contributed by an extension.
                    // Identify such link types and filter them out. When coupling is removed, the filtering code below should also be removed.
                    this.registeredLinkTypes = linkTypes.registeredLinkTypes.filter(t => isLinkFormRegistered(t));
                    succeeded(linkTypes.witLinkTypes);
                }, failed);
        });
    }

    public getRegisteredLinkTypes(): IRegisteredLinkType[] {
        if (this.registeredLinkTypes && !$.isFunction(this.registeredLinkTypes)) {
            return this.registeredLinkTypes;
        }

        Diag.Debug.fail("Registered link types are not ready yet. Use beginGetLinkTypes to download.");
    }

    public getLinkTypes(): IWorkItemLinkType[] {
        if (this.linkTypes && !$.isFunction(this.linkTypes)) {
            return this.linkTypes;
        }

        Diag.Debug.fail("LinkTypes are not ready yet. Use beginGetLinkTypes to download.");
    }

    public getLinkTypesMap(): IDictionaryStringTo<IWorkItemLinkType> {
        const linkTypesMap: IDictionaryStringTo<IWorkItemLinkType> = {};
        const linkTypes = this.getLinkTypes();
        for (const linkType of linkTypes) {
            if (linkType.isDirectional) {
                linkTypesMap[linkType.reverseEnd.name] = linkType;
            }
            linkTypesMap[linkType.forwardEnd.name] = linkType;
        }

        return linkTypesMap;
    }

    public getLinkTypeEnds(): IWorkItemLinkTypeEnd[] {

        let linkTypeEnds = this.linkTypeEnds;
        if (linkTypeEnds) {
            return linkTypeEnds;
        }

        const linkTypes = this.getLinkTypes();
        linkTypeEnds = [];

        for (const linkType of linkTypes) {
            linkTypeEnds.push(linkType.forwardEnd);

            if (linkType.isDirectional) {
                linkTypeEnds.push(linkType.reverseEnd);
            }
        }

        this.linkTypeEnds = linkTypeEnds;

        return linkTypeEnds;
    }

    public findLinkType(name: string): IWorkItemLinkType {
        const search = ("" + name).toUpperCase();
        const linkTypes = this.getLinkTypes();

        for (const linkType of linkTypes) {
            if (linkType.referenceName.toUpperCase() === search) {
                return linkType;
            }
        }

        throw Error_linkTypeDoesNotExist(name);
    }

    public findLinkTypeEnd(idOrName: number | string): IWorkItemLinkTypeEnd {
        const search = ("" + idOrName).toUpperCase();

        const linkTypeEnds = this.getLinkTypeEnds();
        for (const linkTypeEnd of linkTypeEnds) {
            if (linkTypeEnd.id === idOrName) {
                return linkTypeEnd;
            } else if (linkTypeEnd.name.toUpperCase() === search) {
                return linkTypeEnd;
            } else if (linkTypeEnd.immutableName.toUpperCase() === search) {
                return linkTypeEnd;
            }
        }

        throw Error_linkTypeEndDoesNotExist(idOrName);
    }

    public beginGetAllowedValues(fieldId: number | string, projectId: string, workItemTypeName: string, callback: IResultCallback, errorCallback?: IErrorCallback) {
        // Field can be either id or refname
        const field = this.getFieldDefinition(fieldId);
        // We only want to cache on the id
        let key = field.id.toString();
        key = projectId ? (key + "|" + projectId) : key;
        key = workItemTypeName ? (key + "|" + workItemTypeName) : key;

        queueRequest(this, this.allowedValues, key, callback, errorCallback, (succeeded: IResultCallback, failed: IErrorCallback) => {
            const initialParams: any = { fieldId: field.id };
            if (workItemTypeName) {
                // Don't send the workItemTypeNames parameter at all (even as null) if no work item type filters are requested.
                // The api interprets the existence of this parameter and it being empty as requesting data for no work item types
                // instead of all work item types.
                initialParams.workItemTypeNames = [workItemTypeName];
            }

            this.metadataCacheStampManager.addStampToParams(WITConstants.WITCommonConstants.AllowedValues, initialParams, (params) => {
                Ajax.getMSJSON(
                    this.getApiLocation("allowedValues", { project: projectId || "" }),
                    params,
                    (allowedValues: string[]) => {
                        Utils_Array.flagSorted(allowedValues, Utils_String.localeIgnoreCaseComparer);
                        succeeded(allowedValues);
                    }, failed);
            });
        });
    }

    public getAllowedValues(fieldId: number | string, projectId: string, workItemTypeName: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            this.beginGetAllowedValues(
                fieldId,
                projectId,
                workItemTypeName,
                (allowedValues: string[]) => {
                    resolve(allowedValues);
                }, (error) => {
                    reject(error);
                });
        });
    }

    public beginGetGroups(project: Project, includeGlobal: boolean, callback: IResultCallback, errorCallback?: IErrorCallback) {
        const key = "" + (project ? project.id : 0) + (includeGlobal ? "-global" : "");

        queueRequest(this, this.groups, key, callback, errorCallback, (succeeded: IResultCallback, failed: IErrorCallback) => {
            Ajax.getMSJSON((project || this).getApiLocation("groups"), { includeGlobal: includeGlobal }, (groups: any /* TODO: Can be type, need to check in server */) => {
                succeeded(groups);
            }, failed);
        });
    }

    public beginGetWorkItemCategories(project: Project, callback: IResultCallback, errorCallback?: IErrorCallback) {
        const key = "" + (project ? project.id : 0);

        queueRequest(this, this.witCategories, key, callback, errorCallback, (succeeded: IResultCallback, failed: IErrorCallback) => {
            this.metadataCacheStampManager.addStampToParams(WITConstants.WITCommonConstants.WorkItemTypeCategories, null, (params) => {
                Ajax.getMSJSON((project || this).getApiLocation("workItemTypeCategories"), params, (categories: any /* TODO: Can be type, need to check in server */) => {
                    succeeded(categories);
                }, failed);
            });
        });
    }

    public beginGetWorkItemTypeExtension(extensionId: string, callback: (extension: IWorkItemTypeExtension) => void, errorCallback?: IErrorCallback) {
        const extension = this.workItemTypeExtensions[extensionId];
        if (extension) {
            callback(extension);
        } else {
            this.beginGetWorkItemTypeExtensions([extensionId], (extensions: IWorkItemTypeExtension[]) => {
                callback(extensions[0]);
            }, errorCallback);
        }
    }

    public beginGetWorkItemTypeExtensions(extensionIds: string[], callback: (extensions: IWorkItemTypeExtension[]) => void, errorCallback?: IErrorCallback) {
        const queue: string[][] = [];
        let extensionsToDownload: string[];
        let queryStringLength: number = 0;
        let waitingExtensions: number = 0;
        let fetchedExtensions: IWorkItemTypeExtension[] = [];

        const completeAction = () => {
            if (waitingExtensions === 0) {
                callback.call(this, fetchedExtensions);
            }
        };

        const fetchExtensions = (extensionIds) => {
            PerfScenarioManager.addSplitTiming(
                CIConstants.PerformanceEvents.WORKITEMTRACKING_GETTYPEEXTENSIONS_REQUEST, true);
            Ajax.getMSJSON(this.getApiLocation("workItemTypeExtensions"), { extensionIds: extensionIds }, (extensions: IWorkItemTypeExtension[], textStatus: string, xhr: JQueryXHR) => {
                PerfScenarioManager.addData({
                    [`${CIConstants.PerformanceEvents.WORKITEMTRACKING_GETTYPEEXTENSIONS_REQUEST}.ETAG`]: xhr.getResponseHeader("ETag")
                });
                PerfScenarioManager.addSplitTiming(
                    CIConstants.PerformanceEvents.WORKITEMTRACKING_GETTYPEEXTENSIONS_REQUEST, false);

                // adding extensions to the store field definition, by doing this we can avoid calling entire getFields in Kanban board
                extensions.forEach((extension) => {
                    const fields = extension.fields.map((extensionField) => {
                        return extensionField.field;
                    });
                    this._prepareFields(fields, true);
                });

                let globals = [];
                extensions.forEach((extension) => {
                    this.workItemTypeExtensions[extension.id] = extension;
                    if (extension.globals) {
                        globals = globals.concat(extension.globals);
                    }
                });

                this.beginEnsureConstantSets(globals, () => {
                    fetchedExtensions = fetchedExtensions.concat(extensions);
                    waitingExtensions--;
                    completeAction();
                }, errorCallback);
            }, errorCallback);
        };

        if (extensionIds && extensionIds.length > 0) {
            extensionIds.forEach((extensionId) => {
                if (!this.workItemTypeExtensions[extensionId]) {
                    const extensionIdsLength = extensionId.length + 15; // &extensionIds=
                    // Handling code if the querystring in the url exceeds 1024 characters
                    if (queryStringLength + extensionIdsLength > 1024) {
                        queryStringLength = 0;
                        extensionsToDownload = null;
                    }

                    // In case of first batch or starting a new batch, pushing the extension Ids to the queue
                    if (!extensionsToDownload) {
                        extensionsToDownload = [extensionId];
                        queue.push(extensionsToDownload);
                        waitingExtensions++;
                    } else {
                        // Appends the extensionIds to the existing queue
                        extensionsToDownload.push(extensionId);
                    }
                    queryStringLength += extensionIdsLength;
                } else {
                    // Store the cached extensions to return to the callback
                    fetchedExtensions.push(this.workItemTypeExtensions[extensionId]);
                }
            });

            // If the queue is empty then everything is cached, we can return directly from the cache
            if (queue.length === 0) {
                completeAction();
            } else {
                while (queue.length > 0) {
                    fetchExtensions(queue.pop());
                }
            }
        } else {
            callback.call(this, fetchedExtensions);
        }
    }

    public beginEnsureConstantSets(setIds: string[], callback: IResultCallback, errorCallback?: IErrorCallback) {
        const queue: string[][] = [];
        let currentSets: string[];
        let qsLength = 0;
        let setIdLength = 0;
        let waitingSets = 0;
        let errorExist = false;

        PerfScenarioManager.addSplitTiming(
            CIConstants.PerformanceEvents.WORKITEMTRACKING_GETCONSTANTSETS, true);

        const error = (err: Error) => {
            // error callback might be called back multiple times because of multiple parallel downloads

            if (!errorExist) {
                errorExist = true;

                PerfScenarioManager.addSplitTiming(
                    CIConstants.PerformanceEvents.WORKITEMTRACKING_GETCONSTANTSETS, false);

                if ($.isFunction(errorCallback)) {
                    errorCallback.apply(this, err);
                }
            }
        };

        const ready = () => {
            // ready callback might be called back multiple times because of multiple parallel downloads

            waitingSets--;
            if (!errorExist && waitingSets <= 0) {
                PerfScenarioManager.addSplitTiming(
                    CIConstants.PerformanceEvents.WORKITEMTRACKING_GETCONSTANTSETS, false);

                // only call if we don't hit an error
                if ($.isFunction(callback)) {
                    callback.apply(this);
                }
            }
        };

        const fetchSets = (sets: string[]) => {
            const cbQueue = queueCallbacks(this, ready, error);
            for (const setId of sets) {
                this.constantSets[setId] = cbQueue.register;
            }
            this.metadataCacheStampManager.addStampToParams(WITConstants.WITCommonConstants.ConstantSets, { ids: sets }, (params) => {

                PerfScenarioManager.addSplitTiming(
                    CIConstants.PerformanceEvents.WORKITEMTRACKING_GETCONSTANTSETS_REQUEST, true);
                Ajax.getMSJSON(this.getApiLocation("constantSets"), params, (setsData: IDictionaryStringTo<string[]>, textStatus: string, xhr: JQueryXHR) => {
                    PerfScenarioManager.addData({
                        [`${CIConstants.PerformanceEvents.WORKITEMTRACKING_GETCONSTANTSETS_REQUEST}.ETAG`]: xhr.getResponseHeader("ETag")
                    });
                    PerfScenarioManager.addSplitTiming(
                        CIConstants.PerformanceEvents.WORKITEMTRACKING_GETCONSTANTSETS_REQUEST, false);

                    let setData: string[];

                    for (const setId of sets) {
                        setData = setsData[setId];
                        Utils_Array.flagSorted(setData, Utils_String.localeIgnoreCaseComparer);

                        this.constantSets[setId] = setData;
                    }

                    cbQueue.finish();
                }, (error) => {
                    for (const setId of sets) {
                        delete this.constantSets[setId];
                    }

                    cbQueue.error(error);
                });

            });
        };

        if (setIds) {
            const setsToDownload: string[] = [];

            for (const setId of setIds) {
                const cset = this.constantSets[setId];

                if (!cset) {
                    setsToDownload.push(setId);
                } else if ($.isFunction(cset)) {
                    // there is a pending GET going on for this setid so attach its queue handle
                    waitingSets++;
                    cset(ready, error);
                }
            }

            setsToDownload.sort(); // sort the ids so caching should leverage it.

            for (const setId of setsToDownload) {
                if (reWellKnownConstants.test(setId)) {
                    // push well known constant sets as separate groups

                    queue.push([setId]);
                    // count only groups
                    waitingSets++;
                } else {
                    // measure current set id length plus param name length
                    setIdLength = (setId + "").length + 5; // + "&ids=".length;

                    if (qsLength + setIdLength > 1024) {
                        // we are exceeding max url limit, so start a new group
                        qsLength = 0;
                        currentSets = null;
                    }

                    if (!currentSets) {
                        currentSets = [setId];
                        queue.push(currentSets);

                        // count only groups
                        waitingSets++;
                    } else {
                        // add it to the current group
                        currentSets.push(setId);
                    }

                    // measure current query string length so that we don't exceed max url limit
                    qsLength += setIdLength;
                }
            }

        }

        while (queue.length > 0) {
            fetchSets(queue.pop());
        }

        if (waitingSets === 0) {
            ready();
        }
    }

    /**
     * Invalidates the work item type extension fields and rules
     * @param extensionIds Array of extension ids to be invalidated, if none are specified, all extensions are invalidated
     */
    public invalidateExtensions(extensionIds?: string[]) {
        Diag.Debug.assertParamIsObject(this.workItemTypeExtensions, "this.workItemTypeExtensions");

        if (!Boolean(extensionIds)) {
            // clear all extensions
            this.workItemTypeExtensions = {};
        } else {
            $.each(extensionIds, (i: number, extensionId: string) => {
                delete this.workItemTypeExtensions[extensionId];
            });
        }
    }

    public getConstantSet(setId: string): any {
        return this.constantSets[setId];
    }

    public beginPageWorkItems(ids, fields: string[], callback: IResultCallback, errorCallback?: IErrorCallback, optionalRequestParams?: any[]) {
        if (!$.isArray(ids)) {
            throw new Error("Invalid argument type: ids must be an array.");
        }

        if (!$.isArray(fields)) {
            throw new Error("Invalid argument type: 'fields' must be an array.");
        }

        const requestParams = {
            workItemIds: ids.join(","),
            fields: fields.join(",")
        };

        if (optionalRequestParams) {
            $.extend(requestParams, optionalRequestParams);
        }

        Ajax.postMSJSON(this.getApiLocation("pageWorkItems"), requestParams, (pagingData: IPageData) => {
            if ($.isFunction(callback)) {
                callback.apply(this, [pagingData]);
            }
        }, errorCallback);
    }

    public beginPageWorkItemsByIdRev(ids: number[], revisions: number[], fieldNames: string[], callback: IFunctionPR<IPageData, void>, errorCallback?: IErrorCallback) {
        const requestParams = {
            workItemIds: ids.join(","),
            workItemRevisions: revisions.join(","),
            fields: fieldNames.join(",")
        };

        Ajax.postMSJSON(this.getApiLocation("pageWorkItemsByIdRev"), requestParams, (pagingData: IPageData) => {
            if ($.isFunction(callback)) {
                callback.apply(this, [pagingData]);
            }
        }, errorCallback);
    }

    public beginGetWorkItemResources(ids, callback: IResultCallback, errorCallback?: IErrorCallback) {
        const requestParams = {
            ids: ids
        };

        Ajax.getMSJSON(this.getApiLocation("ResourceLinks"), requestParams, (resourceData: IResourceLink) => {
            callback(resourceData);
        }, errorCallback);
    }

    /**
     * Begin saving the provided work items.  If saving any of the work items fails, no work items are saved
     * See beginSaveWorkItemsBatch if you would like all workitems without error to be saved
     * @param workItems
     * @param callback
     * @param errorCallback
     * @param storeErrors Flag indicating if errors should be associated with the work items
     */
    public beginSaveWorkItems(workItems: WorkItem[], callback: IResultCallback, errorCallback?: IErrorCallback, storeErrors: boolean = true) {
        this._beginSaveWorkItemsInternal(workItems, {}, callback, errorCallback, storeErrors);
    }

    /**
     * Begin saving the provided work items.  If saving any of the work items fails, no work items are saved.
     * See beginSaveWorkItemsBatch if you would like all workitems without error to be saved.
     * @param workItems Work items to be saved
     * @param serverFieldUpdates Changes which occurred to the work items due to a merge operation.  Indexed by work item id
     * @param callback
     * @param errorCallback
     * @param storeErrors Flag indicating if errors should be associated with the work items
     */
    private _beginSaveWorkItemsInternal(workItems: WorkItem[],
        serverFieldUpdates: IDictionaryNumberTo<IDictionaryStringTo<Field>>,
        callback: IResultCallback, errorCallback?:
            IErrorCallback, storeErrors: boolean = true) {
        Diag.Debug.assertParamIsObject(serverFieldUpdates, "serverFieldUpdates");

        let updatedWorkItems: WorkItem[];
        let error: TfsError;
        const results: IWorkItemBulkSaveResult[] = [];
        const workItemChanges: IDictionaryNumberTo<IWorkItemChangedArgs> = {};

        Diag.logTracePoint("TFS.WorkItemTracking.WorkItemStore.beginSaveWorkItems.start");

        const markSaveFlag = (workItems: WorkItem[], saving: boolean) => {
            for (const curWorkItem of workItems) {
                const workItemChangedArgs = workItemChanges[curWorkItem.id] ? workItemChanges[curWorkItem.id] : workItemChanges[curWorkItem.tempId];

                // merge field changes with any changes that came out of the 'merge' operation, if any
                if (workItemChangedArgs && serverFieldUpdates[curWorkItem.id]) {
                    $.extend(workItemChangedArgs.changedFields, serverFieldUpdates[curWorkItem.id]);
                }

                (<any>curWorkItem)._setSavingStatus(saving, workItemChangedArgs);
                (<any>curWorkItem)._setValidatingStatus(false);
            }
        };

        const finish = () => {
            try {
                if (error) {
                    error = Error_workItemBulkSave(results);
                    handleError(error, errorCallback, this);
                } else if ($.isFunction(callback)) {
                    Diag.logTracePoint("TFS.WorkItemTracking.WorkItemStore.beginSaveWorkItems.complete");

                    Diag.logTracePoint("TFS.WorkItemTracking.WorkItemStore.beginSaveWorkItems.completedCallback.start");
                    const successResult: IWorkItemsBulkSaveSuccessResult = { workItems: workItems };
                    callback.call(this, successResult);
                    Diag.logTracePoint("TFS.WorkItemTracking.WorkItemStore.beginSaveWorkItems.completedCallback.complete");
                }
            }
            finally {
                markSaveFlag(updatedWorkItems, false);
            }
        };

        const setError = (workItem: WorkItem, workItemError: { message: string }) => {
            error = new Error(workItemError.message);

            // Associate the error with the work item.
            if (storeErrors) {
                workItem.setError(error);
            }

            results.push({ workItem: workItem, error: workItemError });
        };

        const tryFinish = () => {
            if (updatedWorkItems && updatedWorkItems.length === results.length) {
                for (const updatedWorkItem of updatedWorkItems) {
                    for (const link of updatedWorkItem.allLinks) {
                        link.setState(true);
                    }
                }
                finish();
            }
        };

        const getFieldsDictionaryOfChanges = (workItem: WorkItem, changedFields: IFieldDataDictionary): IDictionaryStringTo<Field> => {
            // Retreives a field refname => Field mapping for fields that have changed, converting from the field data dictionary
            const fields: IDictionaryStringTo<Field> = {};

            for (const fieldId in changedFields) {
                if (changedFields.hasOwnProperty(fieldId)) {
                    const changedFieldId = Number(fieldId);
                    const changedField = workItem.fieldMapById[changedFieldId];

                    if (changedField) {
                        fields[changedField.fieldDefinition.referenceName] = changedField;

                        // If area/iteration id changed, add area/iteration path
                        if (changedFieldId === WITConstants.CoreField.IterationId) {
                            fields[WITConstants.CoreFieldRefNames.IterationPath] = workItem.fieldMapById[WITConstants.CoreField.IterationPath];
                        } else if (changedFieldId === WITConstants.CoreField.AreaId) {
                            fields[WITConstants.CoreFieldRefNames.AreaPath] = workItem.fieldMapById[WITConstants.CoreField.AreaPath];
                        }
                    }
                }
            }

            return fields;
        };

        const convertUpdateToArgs = (workItem: WorkItem, update: IWorkItemUpdate): IWorkItemChangedArgs => {
            // Creates an IWorkItemChangedArgs for the specified work item and set of changes made to the work item.
            const args: IWorkItemChangedArgs = {
                typeChanged: workItem.hasWorkItemTypeChanged(),
                projectChanged: workItem.hasTeamProjectChanged(),
                changedFields: getFieldsDictionaryOfChanges(workItem, update.payload.fields),
                firstSave: workItem.id == 0
            };

            return args;
        };

        if (workItems && workItems.length > 0) {
            const workItemUpdatePackages: IWorkItemUpdatePackage[] = [];
            const workItemUpdates: IWorkItemUpdate[] = [];

            updatedWorkItems = [];

            for (let i = 0, l = workItems.length; i < l; i++) {
                const workItem = workItems[i];
                workItem.fireWorkItemPreSave();

                if (workItem.isDirty()) {
                    const workItemUpdate = workItem.getUpdateData();

                    if (workItemUpdate && workItemUpdate.payload) {
                        workItemUpdates.push(workItemUpdate);
                        workItemUpdatePackages.push(workItemUpdate.payload);

                        const id = workItem.id > 0 ? workItem.id : workItem.tempId;

                        workItemChanges[id] = convertUpdateToArgs(workItem, workItemUpdate);
                        updatedWorkItems.push(workItem);
                    }
                }
            }

            if (updatedWorkItems.length > 0) {
                markSaveFlag(updatedWorkItems, true);

                try {
                    PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMTRACKING_UPDATE_AJAX, true);

                    // first we save the work item
                    Ajax.postMSJSON(this.getApiLocation("updateWorkItems"),
                        {
                            updatePackage: Utils_Core.stringifyMSJSON(workItemUpdatePackages)
                        },
                        (updateResults: IWorkItemUpdateResult[]) => {
                            PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMTRACKING_UPDATE_AJAX, false);
                            // what we get back is an update result, which may contain more changed fields than even our save changed
                            if (updateResults.length === updatedWorkItems.length) {

                                // Check if any item in the batch is failed. If any item
                                // in the batch failed then none of the work items were saved
                                // even though some may say "Success"
                                // That "Success" status just means that workItem would have saved
                                // had the batch not contained an invalid work item
                                let batchFailed = false;
                                $.each(updateResults, (i: number, res: IWorkItemUpdateResult) => {
                                    if (res.state !== WorkItemUpdateResultState.Success) {
                                        batchFailed = true;
                                        return false;
                                    }
                                });

                                $.each(updatedWorkItems, (i: number, workItem: WorkItem) => {
                                    const updateResult = updateResults[i];

                                    // Only consider this workitem update successful if the batch passsed
                                    if (updateResult.state === WorkItemUpdateResultState.Success && !batchFailed) {
                                        this.beginGetWorkItemTypeExtensions(updateResult.currentExtensions, (extensions: IWorkItemTypeExtension[]) => {

                                            // if we got a good result, then we do _takeUpdateResult, which basically is responsible for notifying other pieces of the code about the fields that have changed
                                            workItem._takeUpdateResult(updateResult, workItemUpdates[i], extensions);

                                            results.push({ workItem: workItem });
                                            tryFinish();
                                        }, (error) => {
                                            setError(workItem, error);
                                            tryFinish();
                                        });
                                    } else if (updateResult.state !== WorkItemUpdateResultState.Success) {
                                        setError(workItem, updateResult.error);
                                        tryFinish();
                                    } else {
                                        results.push({ workItem: workItem });
                                        tryFinish();
                                    }
                                });
                            } else {
                                $.each(updatedWorkItems, (i: number, workItem: WorkItem) => {
                                    setError(workItem, { message: "Server data does not match with what client sent." });
                                });

                                finish();
                            }
                        },
                        (error) => {
                            PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMTRACKING_UPDATE_AJAX, false);

                            $.each(updatedWorkItems, (i: number, workItem: WorkItem) => {
                                setError(workItem, error);
                            });

                            finish();
                        });

                } catch (exception) {
                    markSaveFlag(updatedWorkItems, false);

                    throw exception;
                }
            } else {
                finish();
            }
        } else {
            finish();
        }
    }

    /**
     * Begin saving the provided work items.  If saving any of the work items fails, the
     * rest of the work items will be saved.  If there are resolvable merge conflicts with
     * any items beign saved, the merged work item will be saved
     * @param workItems Work items to be saved
     * @param callback
     * @param errorCallback
     */
    public beginSaveWorkItemsBatch(workItems: WorkItem[], callback: IResultCallback, errorCallback?: IErrorCallback) {
        const store = this;
        const validWorkItems: WorkItem[] = [];
        const workItemsQueue: WorkItem[][] = [];
        const mergedWorkItemFieldChanges: IDictionaryNumberTo<IDictionaryStringTo<Field>> = {};
        const results: IWorkItemBulkSaveResult[] = [];
        let hasError = false;
        const mergedWorkItems: IDictionaryNumberTo<boolean> = {};

        Diag.logTracePoint("VSS.WorkItemTracking.WorkItemStore.beginSaveWorkItemsBatch.start");

        $.each(workItems, (i: number
            , workItem: WorkItem) => {
            if (workItem.isValid()) {
                validWorkItems.push(workItem);
            } else {
                hasError = true;
                results.push({ workItem: workItem, error: Error_workItemSaveFailedDueToInvalidStatus(workItem) });
            }
        });

        if (validWorkItems.length > 0) {
            workItemsQueue.push(validWorkItems);
        }

        function beginSave() {
            if (workItemsQueue.length > 0) {
                let currentWorkItems = workItemsQueue.pop();

                if (currentWorkItems.length > PageSizes.SAVE) {
                    workItemsQueue.push(currentWorkItems.slice(PageSizes.SAVE));
                    currentWorkItems = currentWorkItems.slice(0, PageSizes.SAVE);
                }

                Diag.Debug.assert(currentWorkItems.length <= PageSizes.SAVE, "Too many work items for batch save.");

                store._beginSaveWorkItemsInternal(
                    currentWorkItems,
                    mergedWorkItemFieldChanges,
                    function () {
                        $.each(currentWorkItems, (i: number, workItem: WorkItem) => {
                            results.push({ workItem: workItem });
                        });

                        Utils_Core.delay(store, 0, beginSave);
                    },
                    function (error) {
                        let mergingWorkItemsCount = 0;
                        let hasMergeErrors = false;
                        let hasNonMergeErrors = false;

                        /**
                         * Starts the next save if all merges have completed
                         * @param workItemMerged Indicates if the work item triggering the next save is the result of a successful merge
                         */
                        function tryStartNextSave(workItemMerged: boolean) {
                            // If there are no work items being merged, kick off the next save attempt.
                            if (mergingWorkItemsCount === 0) {
                                if (currentWorkItems.length === 1 && workItemMerged) {
                                    // There is only one work item, but it was successfuly merged so try saving again.
                                    workItemsQueue.push(currentWorkItems);
                                } else if (currentWorkItems.length > 1) {
                                    const mid = currentWorkItems.length / 2;

                                    workItemsQueue.push(currentWorkItems.slice(mid));
                                    workItemsQueue.push(currentWorkItems.slice(0, mid));
                                } else {
                                    results.push(error.results[0]);
                                }

                                Utils_Core.delay(store, 0, beginSave);
                            }
                        }

                        function mergeCompleted(workitem: WorkItem, changedFields: IDictionaryStringTo<Field>) {
                            mergingWorkItemsCount -= 1;

                            mergedWorkItemFieldChanges[workitem.id] = $.extend(changedFields, mergedWorkItemFieldChanges[workitem.id]);

                            // Try and start the next save indicating that the work item was successfully merged.
                            tryStartNextSave(true);
                        }

                        function mergeError() {
                            mergingWorkItemsCount -= 1;
                            hasError = true;

                            // Try and start the next save.
                            tryStartNextSave(false);
                        }

                        if (error && error.name === Exceptions.WorkItemBulkSaveException) {
                            const saveResults = error.results;

                            // Attempt to resolve any work item conflicts.
                            for (const result of saveResults) {
                                const workItem = result.workItem;

                                // If this is a work item updated error and we have not already tried to merge this work item, try merging.
                                if (result.error
                                    && (result.error.errorCode === ErrorCodes.WorkItemMissingOrUpdated || result.error.errorCode === ErrorCodes.ResourceLinkNotFoundException)
                                    && !mergedWorkItems.hasOwnProperty((workItem.id).toString())) {
                                    hasMergeErrors = true;

                                    // Add the work item to the set of work items we have tried merging.
                                    mergedWorkItems[workItem.id] = true;

                                    // Keep track of how many work items are being merged so we know when
                                    // we are all done.
                                    mergingWorkItemsCount += 1;

                                    store._beginTryMergeWorkItem(workItem, mergeCompleted, mergeError);
                                } else {
                                    hasNonMergeErrors = true;
                                }
                            }

                            // If there were no merge errors and there were other errors, set the error flag.
                            // Note: This is done because all work items are flagged with a server error when a merge
                            //       conflict occurs.  Since we will be attempting to resolve the merge conflict,
                            //       we will not flag the error until the next save attempt.
                            if (!hasMergeErrors && hasNonMergeErrors) {
                                hasError = true;
                            }

                            // Try and start the next save.
                            tryStartNextSave(false);
                        } else {
                            // There is not an individual error per work item, so associate the error with each of the work items.
                            $.each(workItems, (i: number, workItem: WorkItem) => {
                                workItem.setError(error);
                            });

                            handleError(error, errorCallback, store);
                        }
                    },
                    false /* Do not associate errors with the work items as this will be done after all of the batches have been completed */);
            } else {
                if (hasError) {
                    // If the result has an error associated with it, store the error with the work item.
                    $.each(results, function () {
                        if (this.error) {
                            this.workItem.setError(this.error);
                        }
                    });

                    handleError(Error_workItemBulkSave(results), errorCallback, store);
                } else {
                    Diag.logTracePoint("TFS.WorkItemTracking.WorkItemStore.beginSaveWorkItemsBatch.complete");

                    Diag.logTracePoint("TFS.WorkItemTracking.WorkItemStore.beginSaveWorkItemsBatch.completedCallback.start");
                    if ($.isFunction(callback)) {
                        const successResult: IWorkItemsBulkSaveSuccessResult = { workItems: workItems };
                        callback.call(store, successResult);
                    }
                    Diag.logTracePoint("TFS.WorkItemTracking.WorkItemStore.beginSaveWorkItemsBatch.completedCallback.complete");
                }
            }
        }

        beginSave();
    }

    /**
     * Ajax wrapper for GetTagWorkitemsIds
     * @param workItemIds The list of workitems of interest
     * @param callback The success callback with a single parameter: a dictionary of tags to an array of workItemIds that have that tag
     * @param errorCallback
     */
    public beginGetTagWorkitemIds(workItemIds: number[], callback: IResultCallback, errorCallback?: IErrorCallback) {
        if (!$.isArray(workItemIds)) {
            throw new Error("Invalid argument type: 'workItemIds' must be an Array.");
        }

        Ajax.postMSJSON(this.getApiLocation("getTagWorkitemIds"), { workItemIds: workItemIds.join(",") }, (tagWorkItemAssociationData: any /* TODO: Can be type, need to check in server */) => {
            const simplifiedData = this._reduceTagWorkitemAssociation(tagWorkItemAssociationData);
            if ($.isFunction(callback)) {
                callback(simplifiedData);
            }
        }, errorCallback);
    }

    private _prepareFields(fieldDefs: IFieldEntry[], appendFields?: boolean): FieldDefinition[] {
        if (!appendFields || !this.fields) {
            this.fields = [];
            this.fieldMap = {};
            this.fieldMapById = {};
        }

        if (fieldDefs) {
            PerfScenarioManager.addSplitTiming(
                CIConstants.PerformanceEvents.WORKITEMTRACKING_GETFIELDS_PROCESS, true);
            for (const fieldEntry of fieldDefs) {
                const field = new FieldDefinition(this, fieldEntry);

                // check to see if the field already exists so that we dont
                // add the field twice to the fields array
                // we use the map for a faster lookup since these data structures should be in sync.
                let alreadyExists = true;
                if (!this.fieldMapById[field.id]) {
                    alreadyExists = false;
                }

                this.fieldMapById[field.id] = field;
                this.fieldMap[field.name.toUpperCase()] = field;
                this.fieldMap[field.referenceName.toUpperCase()] = field;

                if (!alreadyExists) {
                    this.fields.push(field);
                } else {
                    let index = -1;
                    $.each(this.fields, (i, f) => {

                        if (f.id === field.id) {
                            index = i;
                            return false;
                        }
                    });

                    // this inconsistency is not expected where fields array doesnt have a value that is
                    // there in the fieldMapById but since these are 2 different data structures we need to be safe
                    // when replacing the value.
                    if (index !== -1) {
                        this.fields[index] = field;
                    } else {
                        this.fields.push(field);
                    }
                }
            }
            PerfScenarioManager.addSplitTiming(
                CIConstants.PerformanceEvents.WORKITEMTRACKING_GETFIELDS_PROCESS, false);
        }

        return this.fields;
    }

    /**
     * Reduces the given serialized TagWorkitemAssociationData into a dictionary of tag names to an array of workitem ids
     * @param tagWorkItemAssociationData The serialized TagWorkitemAssociationData returned by the getTagWorkitemIds service
     */
    private _reduceTagWorkitemAssociation(tagWorkItemAssociationData: any /* TODO: type */): IDictionaryStringTo<number[]> {
        const stripped: IDictionaryStringTo<number[]> = {};

        // used for tag name lookup in a case insensitive way, so tags only differ by case will be merged
        const caseInsensitiveMap: IDictionaryStringTo<string> = {};
        let name: string;
        let workitemIds: number[];

        $.each(tagWorkItemAssociationData, function (i, tagToWorkitems) {
            name = caseInsensitiveMap[tagToWorkitems.tagDefinition.name.toUpperCase()];

            if (name == null) {
                stripped[tagToWorkitems.tagDefinition.name] = tagToWorkitems.workitemIds;
                caseInsensitiveMap[tagToWorkitems.tagDefinition.name.toUpperCase()] = tagToWorkitems.tagDefinition.name;
            } else {
                workitemIds = stripped[name];
                stripped[name] = Utils_Array.union(workitemIds, tagToWorkitems.workitemIds);
            }
        });
        return stripped;
    }

    /**
     * Begins merging the provided work item with the server version of the work item.  Callback will be called with
     * the work item when the merge completes
     * @param workItem Work item to try and merge
     * @param completedCallback
     * @param errorCallback
     */
    private _beginTryMergeWorkItem(workItem: WorkItem, completedCallback: IResultCallback, errorCallback?: IErrorCallback) {
        Diag.Debug.assertParamIsObject(workItem, "workItem");
        Diag.Debug.assertParamIsFunction(completedCallback, "completedCallback");
        Diag.Debug.assertParamIsFunction(errorCallback, "errorCallback");

        const mergedWorkItemUpdates: IDictionaryNumberTo<any> = {}; // Used to track updates which should be made to the merged work item.  The property name is the fieldId and the value is the field value.

        Diag.logTracePoint("TFS.WorkItemTracking.WorkItemStore._beginTryMergeWorkItem.start");

        // Load up the updated work item data from the server.
        this.beginGetWorkItemData([workItem.id],
            (workItemPayload: IWorkItemData) => {
                // Check for conflicts in the updates.
                if (this._hasConflicts(workItem, workItemPayload, mergedWorkItemUpdates)) {
                    // There are conflicts so bail.
                    errorCallback(workItem);
                    return;
                }

                // Get the set of fields that changed between the work item we have locally and the server version of the work item.
                const changedFields: IDictionaryStringTo<Field> = this._getChangedFieldsForMerge(workItem, workItemPayload);

                // There were no conflicts, so merge the payload into the work item.
                this._mergeWorkItem(workItem, workItemPayload, mergedWorkItemUpdates);

                // Run the rules on the work item.
                workItem.evaluate();

                // Re-apply the field updates to the work item (rules may have overridden user values).
                for (const fieldId in mergedWorkItemUpdates) {
                    if (mergedWorkItemUpdates.hasOwnProperty(fieldId)) {
                        workItem.setFieldValue(fieldId, mergedWorkItemUpdates[fieldId]);
                    }
                }

                // If the work item is valid, then merge was successful
                if (workItem.isValid()) {
                    Diag.logTracePoint("TFS.WorkItemTracking.WorkItemStore._beginTryMergeWorkItem.complete");

                    Diag.logTracePoint("TFS.WorkItemTracking.WorkItemStore._beginTryMergeWorkItem.completedCallback.start");
                    completedCallback(workItem, changedFields);
                    Diag.logTracePoint("TFS.WorkItemTracking.WorkItemStore._beginTryMergeWorkItem.completedCallback.complete");
                } else {
                    errorCallback(workItem);
                }
            },
            () => {
                // There was an error getting the updated work item data so fail the merge.
                errorCallback(workItem);
            },
            false,
            true);
    }

    private _getChangedFieldsForMerge(workItem: WorkItem, workItemPayload: IWorkItemData): IDictionaryStringTo<Field> {
        Diag.Debug.assertParamIsObject(workItem, "workItem");
        Diag.Debug.assertParamIsObject(workItemPayload, "workItemPayload");

        const changedFields: IDictionaryStringTo<Field> = {};
        const fields: IFieldDataDictionary = workItemPayload.fields;

        for (const fieldId in fields) {
            if (fields.hasOwnProperty(fieldId)) {
                const baselineField = workItem.getField(fieldId);

                if (baselineField) {
                    // Get the original value of the field and the server version of the field.
                    const originalValue = baselineField.getValue(true);
                    const serverValue = Field.convertValueToExternal(
                        workItem.store,
                        workItemPayload.fields[fieldId],
                        baselineField.fieldDefinition.type);

                    if (!Field.compareValues(originalValue, serverValue, false)) {
                        // This field value is different on the server vs the original value on the client.
                        changedFields[baselineField.fieldDefinition.referenceName] = baselineField;
                    }
                }
            }
        }

        return changedFields;
    }

    /**
     * Check the provided work item against the payload for conflicts
     * @param workItem Work item to check
     * @param workItemPayload Work item payload data to check the work item against
     * @param mergedWorkItemUpdates Maps the field ID to the updated field value which should be set on the merged work item
     */
    private _hasConflicts(workItem: WorkItem, workItemPayload: IWorkItemData, mergedWorkItemUpdates: IDictionaryNumberTo<any>): boolean {
        Diag.Debug.assertParamIsObject(workItem, "workItem");
        Diag.Debug.assertParamIsObject(workItemPayload, "workItemPayload");
        Diag.Debug.assertParamIsObject(mergedWorkItemUpdates, "mergedWorkItemUpdates");

        let originalValue: any;
        let serverValue: any;
        let baselineField: Field;
        let baselineValue: any;
        let pathField: Field;

        // Check for conflicts in the updates.
        const fieldUpdates = workItem.getFieldUpdates();
        for (const fieldIdStr in fieldUpdates) {
            if (fieldUpdates.hasOwnProperty(fieldIdStr)) {
                // Ensure the field ID is a number (will always be a string because it is coming from the objects property name).
                const fieldId = Number(fieldIdStr);

                baselineField = workItem.getField(fieldId);

                // If the field with conflicting edit doesn't exist on the target workItemType, ignore this field and continue
                if (baselineField) {
                    // Get the original value of the field and the server version of the field.
                    originalValue = baselineField.getValue(true);
                    serverValue = Field.convertValueToExternal(
                        workItem.store,
                        workItemPayload.fields[fieldId],
                        baselineField.fieldDefinition.type);

                    // If the value was changed by the user, then check for a conflict.
                    // NOTE: Values not changed by the user (chanded by rule) are ignored because the field updates will be applied to the work
                    //       item again in resolving the merge conflict and the rules will set the value again.
                    if (baselineField.isUserChange()) {
                        baselineValue = baselineField.getValue();

                        // If the original value does not match the server value, then there is a conflict.
                        if (fieldId != WITConstants.CoreField.History &&  // History can nevery cause a conflict.
                            !Field.compareValues(originalValue, serverValue, false)) {
                            // If the value that the user changed the field to does not match the value on the server,
                            // then bail since we can not resolve the conflict.
                            if (!Field.compareValues(baselineValue, serverValue, false)) {
                                // There are conflicts so bail.
                                return true;
                            }
                        } else {
                            // The field was changed by the user, but not changed on the server so store off
                            // the value to update the merged work item with.
                            mergedWorkItemUpdates[fieldId] = baselineValue;

                            // If the change is to an area or iteration ID field, also capture the update to the corresponding path field.
                            // NOTE: This is to workaround an issue in the rule evaluation where these calculated fields will be
                            //       flaged as "setByRule" and if this is the only update in the work item, the work item will not be considered
                            //       dirty and will not be saved.
                            // TODO: [apatters] Follow up with Ahmet when he is back in the office to see if we can change the rule evaluation back to
                            //       not flag computed field values as set by rule (was reverted in changeset 92265, but it is not clear why from the
                            //       bugs which were being fixed in the changeset).  Changeset 94466 fixed the original issue that this reversion caused
                            //       but it is dependend upon order of the fields and with the updates to the merge on save algorithm, this fix no longer
                            //       works without the below workaround.
                            if (fieldId === WITConstants.CoreField.IterationId) {
                                pathField = workItem.getField(WITConstants.CoreField.IterationPath);
                                mergedWorkItemUpdates[WITConstants.CoreField.IterationPath] = pathField.getValue();
                            } else if (fieldId === WITConstants.CoreField.AreaId) {
                                pathField = workItem.getField(WITConstants.CoreField.AreaPath);
                                mergedWorkItemUpdates[WITConstants.CoreField.AreaPath] = pathField.getValue();
                            }
                        }
                    }
                }
            }
        }

        return false;
    }

    /**
     * Merge the payload data into the provided work item
     * @param workItem Work item to merge data into
     * @param workItemPayload Work item payload data to merge into the work item
     * @param mergedWorkItemUpdates Maps the field ID to the updated field value which should be set on the merged work item
     */
    private _mergeWorkItem(workItem: WorkItem, workItemPayload: IWorkItemData, mergedWorkItemUpdates: IDictionaryNumberTo<any>) {
        Diag.Debug.assertParamIsObject(workItem, "workItem");
        Diag.Debug.assertParamIsObject(workItemPayload, "workItemPayload");
        Diag.Debug.assertParamIsObject(mergedWorkItemUpdates, "mergedWorkItemUpdates");

        let links: ILinkUpdates;

        // Get a copy of the added and removed links so we can restore them after the update.
        links = workItem.getLinkUpdates();

        // Merge the server data into the work item ensuring
        // that the fields are reset.
        workItem._load(workItemPayload, true);

        // Re-apply the field updates to the work item.
        for (const fieldId in mergedWorkItemUpdates) {
            if (mergedWorkItemUpdates.hasOwnProperty(fieldId)) {
                // Not setting value through field here because we do now want field changed events
                // to be rasised and rules to be run yet (rules will be run once all updates have been made).
                workItem._setFieldValueById(Number(fieldId), mergedWorkItemUpdates[fieldId], false);
            }
        }

        // Restore added and removed links.
        workItem._restoreLinkUpdates(links);
    }

    private _bindLinkTypeEnds(linkTypes: IWorkItemLinkType[]) {
        let linkTypeEnd: IWorkItemLinkTypeEnd;

        for (const linkType of linkTypes) {

            linkTypeEnd = linkType.forwardEnd;
            if (linkTypeEnd) {
                linkTypeEnd.linkType = linkType;
                linkTypeEnd.oppositeEnd = linkType.reverseEnd;
            }

            linkTypeEnd = linkType.reverseEnd;
            if (linkTypeEnd) {
                linkTypeEnd.linkType = linkType;
                linkTypeEnd.oppositeEnd = linkType.forwardEnd;
            }
        }
    }
}

export class WorkItemType {

    public project: Project;
    public store: WorkItemStore;
    public id: number;
    public name: string;
    public referenceName: string;
    public fields: FieldDefinition[];
    public fieldMap: IDictionaryStringTo<FieldDefinition>;
    public fieldMapById: IDictionaryStringTo<FieldDefinition>;
    public dependentFieldsMapByReferenceName: IDictionaryStringTo<FieldDefinition>;
    public form: string;
    public processId: string;
    public stateColors: { [id: string]: string };
    public triggerList: number[];
    public transitions: IDictionaryStringTo<string[]>;
    public restUrl: string;

    /** Work item type color for phase2 */
    public readonly color: string;

    private _httpClient: WITWebApi.WorkItemTrackingHttpClient;

    constructor(project: Project, witData?: IWorkItemTypeData) {
        this.project = project;
        this.store = project.store;
        this.id = witData.id;
        this.name = witData.name;
        this.referenceName = witData.referenceName;
        this.dependentFieldsMapByReferenceName = {};
        this._httpClient = this.store.tfsConnection.getHttpClient<WITWebApi.WorkItemTrackingHttpClient>(WITWebApi.WorkItemTrackingHttpClient);

        const fieldDefs = witData.fields;

        this.form = witData.rules.form;
        this.processId = witData.rules.processId;
        this.triggerList = witData.rules.triggerList;
        this.transitions = witData.rules.transitions;

        const fieldRules = witData.rules.fieldRules;
        const helpTexts = witData.rules.fieldHelpTexts;

        this.color = witData.color;
        this._parseStateColors(witData.rules.stateColors);

        const fieldMap = this.fieldMap = {};
        const fieldMapById = this.fieldMapById = {};

        const fields = this.fields = [];

        const storeFieldMap = this.store.fieldMap;
        const storeFieldMapById = this.store.fieldMapById;

        for (const fieldId of fieldDefs) {
            const storeField: FieldDefinition = storeFieldMapById[fieldId] || storeFieldMap[fieldId];

            const field = new FieldDefinition(this, storeField, fieldRules && fieldRules[fieldId], helpTexts[fieldId] || "");

            fieldMapById[field.id] = field;

            fieldMap[field.name.toUpperCase()] = field;
            fieldMap[field.referenceName.toUpperCase()] = field;

            fields[fields.length] = field;
        }
    }

    public path(): string {
        return this.project.path() + "/wit/" + this.name;
    }

    /**
     * Creates a work item from the type definition. This method should only be used
     * if you do not need UI support from the WorkItemManager, otherwise the preferred method
     * is to use WorkItemManager.createWorkItem(WorkItemManager, data)
     * @param workItemData Optional data to pass to the work item's constructor
     * @param extensions
     */
    public create(workItemData?: IWorkItemData, extensions?: IWorkItemTypeExtension[]): WorkItem {
        return new WorkItem(this, workItemData, extensions);
    }

    /**
     * Returns field definition by field id, name and reference name
     * @param fieldReferenceOrId
     */
    public getFieldDefinition(fieldReferenceOrId: number | string): FieldDefinition {
        const key = ("" + fieldReferenceOrId).toUpperCase();

        return this.fieldMapById[key] || this.fieldMap[key];
    }

    public getTriggerList(): number[] {
        const result: number[] = [];

        if (this.triggerList) {
            $.each(this.triggerList, (i: number, fieldId: number) => {
                if (this.getFieldDefinition(fieldId)) {
                    result.push(fieldId);
                }
            });
        }

        return result;
    }

    /**
     *  Get the initial state for the given workitemtype
     *  Defaults to empty string
     */
    public getInitialState(): string {
        let initialState: string;
        if (this.transitions && this.transitions[""]) {
            initialState = this.transitions[""][0];
        }

        return initialState || "";
    }

    public getRestUrl(): string {
        if (!this.restUrl) {
            const tfsContext = this.store.getTfsContext();
            const serviceHostUrl = tfsContext.navigation.publicAccessPoint.scheme + "://" + tfsContext.navigation.publicAccessPoint.authority + tfsContext.getServiceHostUrl();

            return Utils_String.format("{0}{1}/_apis/wit/workItemTypes/{2}", serviceHostUrl, this.project.guid, this.name);
        }
        return this.restUrl;
    }

    public beginGetDependentFields(fieldReferenceOrId: any, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        const field = this.getFieldDefinition(fieldReferenceOrId);
        if (!field) {
            if ($.isFunction(errorCallback)) {
                errorCallback.apply(this, { message: Utils_String.format("Field {0} doesn't exist in work item type {1}", fieldReferenceOrId, this.name) });
            }
            return;
        }

        queueRequest(this, this.dependentFieldsMapByReferenceName, field.referenceName, callback, errorCallback, (succeeded: IResultCallback, failed: IErrorCallback) => {
            this._httpClient.beginGetWorkItemTypeFields(this.project.guid, this.name, field.referenceName).then(
                (fieldData: WITWebApi.IWorkItemTypeFieldtem) => {
                    const dependentFields: FieldDefinition[] = $.map(fieldData.dependentFields || [], (dependentField: WITWebApi.IWorkItemTypeDependentFieldItem) => {
                        return this.getFieldDefinition(dependentField.referenceName);
                    });
                    this.restUrl = fieldData._links.parent.href;
                    succeeded(dependentFields);
                },
                failed);
        });
    }

    private _parseStateColors(colors: TFS_OM_Common.IStateColor[]): void {
        if (colors) {
            this.stateColors = {};

            $.each(
                colors,
                (index: number, stateColor: TFS_OM_Common.IStateColor) => {
                    this.stateColors[stateColor.name] = "#" + stateColor.color;
                });
        }
    }
}

VSS.initClassPrototype(WorkItemType, {
    project: null,
    store: null,
    id: null,
    name: null,
    fields: null,
    fieldMap: null,
    fieldMapById: null,
    form: null,
    triggerList: null
});

export class FieldDefinition {

    public store: WorkItemStore;
    public workItemType: WorkItemType;
    public id: number;
    public name: string;
    public referenceName: string;
    public type: WITConstants.FieldType;
    public usages: FieldUsages;
    public flags: FieldFlags;
    public rules: FieldRuleType[];
    public helpText: string;
    public isIdentity: boolean;
    public isHistoryEnabled: boolean;

    constructor(parent: WorkItemStore | WorkItemType, fieldData: IFieldEntry, rules?: FieldRuleType[], helpText?: string) {
        if (parent instanceof WorkItemStore) {
            this.store = <WorkItemStore>parent;
        } else {
            this.workItemType = <WorkItemType>parent;
            this.store = parent.store;
        }

        this.id = fieldData.id;
        this.name = fieldData.name;
        this.referenceName = fieldData.referenceName;
        this.flags = fieldData.flags;
        this.type = fieldData.type;
        this.usages = fieldData.usages;

        this.rules = rules;
        this.helpText = helpText || "";

        this.isIdentity = fieldData.isIdentity;
        this.isHistoryEnabled = fieldData.isHistoryEnabled;
    }

    public checkFlag(flag: FieldFlags): boolean {
        return (this.flags & +flag) !== FieldFlags.None;
    }

    public canSortBy(): boolean {
        return this.checkFlag(FieldFlags.Sortable);
    }

    public isQueryable(): boolean {
        return this.checkFlag(FieldFlags.Queryable);
    }

    public isIgnored(): boolean {
        return this.checkFlag(FieldFlags.Ignored);
    }

    public isCloneable(): boolean {
        return this.checkFlag(FieldFlags.Cloneable);
    }

    public isComputed(): boolean {
        return this.checkFlag(FieldFlags.Computed);
    }

    public supportsTextQuery(): boolean {
        return this.checkFlag(FieldFlags.SupportsTextQuery);
    }

    public isEditable(): boolean {
        // Special case for fields with "special behavior"
        switch (this.id) {
            case WITConstants.CoreField.AreaPath:
            case WITConstants.CoreField.IterationPath:
                return true;
            case WITConstants.CoreField.Id:
            case WITConstants.CoreField.Rev:
            case WITConstants.CoreField.WorkItemType:
            case WITConstants.CoreField.CreatedBy:
            case WITConstants.CoreField.IsDeleted:
                return false;
        }

        return !this.isComputed();
    }

    public isCoreField(): boolean {
        return this.referenceName.toLowerCase().indexOf("system.") === 0;
    }

    public isoobfield(): boolean {
        return this.referenceName.toLowerCase().indexOf("microsoft.vsts.") === 0;
    }

    public isCustomField(): boolean {
        return !this.isCoreField() && !this.isoobfield();
    }
}

VSS.initClassPrototype(FieldDefinition, {
    store: null,
    workItemType: null,
    id: null,
    name: null,
    referenceName: null,
    type: null,
    usages: FieldUsages.None,
    flags: FieldFlags.None,
    rules: null,
    helpText: ""
});

export interface IWorkItemUpdate {
    uniqueId: number;
    id: number;
    tempId: number;
    rev: number;
    projectId: string;

    payload?: IWorkItemUpdatePackage;

    deletedLinks?: Link[];
    updatedLinks?: Link[];
    addedLinks?: Link[];
}

export class WorkItem {

    private static tempIdSeed = 0;

    private static FIELD_ID_TO_DEPENDENT_ID_MAP: IDictionaryNumberTo<number> = {
        [WITConstants.DalFields.AttachedFiles]: WITConstants.CoreField.AttachedFileCount,
        [WITConstants.DalFields.RelatedLinks]: WITConstants.CoreField.RelatedLinkCount,
        [WITConstants.DalFields.LinkedFiles]: WITConstants.CoreField.HyperLinkCount,
        [WITConstants.DalFields.BISURI]: WITConstants.CoreField.ExternalLinkCount,
        [WITConstants.DalFields.HistoryId]: WITConstants.CoreField.CommentCount
    };

    public static MAX_TITLE_LENGTH: number = 255;
    public static FIELD_ERRORS_CLEARED = "field-errors-cleared";

    public static getTempId(): number {
        return --WorkItem.tempIdSeed;
    }

    public static getTempIdSeed(): number {
        return WorkItem.tempIdSeed;
    }

    public static reserveTempId(tempId: number) {
        if (WorkItem.tempIdSeed > tempId) {
            WorkItem.tempIdSeed = tempId;
        }
    }

    public static getResourceUrl(tfsContext: TFS_Host_TfsContext.TfsContext, id: number): string {
        const serviceHostUrl = tfsContext.navigation.publicAccessPoint.scheme + "://" + tfsContext.navigation.publicAccessPoint.authority + tfsContext.getServiceHostUrl();
        return Utils_String.format("{0}_apis/wit/workItems/{1}", serviceHostUrl, id);
    }

    private _saving: boolean = false;
    private _fieldValidationMap: IDictionaryStringTo<boolean>;
    private _error: IWorkItemError;
    private _eventsEnabled: boolean;
    private _originalWorkItemType: WorkItemType;
    private _originalExtensions: IWorkItemTypeExtension[];
    private _revisionsPopulated: boolean;
    private _fieldData: IFieldDataDictionary;
    private _isReset: boolean;
    private _revisions: any;
    private _links: Link[];
    private _loadTime: Date;
    private _linkUpdatedExternallyDate: Date;
    private ruleEngine: RuleEngine;
    private _httpClient: WITWebApi.WorkItemTrackingHttpClient;
    private _contributionErrorMap: IDictionaryStringTo<string>;
    private _isChangeProjectInProgress = false;
    private _isReadOnly: boolean;

    public workItemType: WorkItemType;
    public extensions: IWorkItemTypeExtension[];
    /** List of Ids from the workitem payload, used to fetch extensions */
    public extensionIds: string[];
    public store: WorkItemStore;
    public project: Project;
    public fieldMap: { [key: string]: Field; };
    public fieldMapById: { [id: string]: Field; };
    public fields: Field[];
    public events: Events_Handlers.NamedEventCollection<WorkItem, any>;
    public id: number = 0;
    public tempId: number = 0;
    public revision: number = 0;
    public fieldUpdates: IFieldUpdateDictionary;
    public allLinks: Link[];
    public referencedPersons: IDictionaryNumberTo<WorkItemIdentityRef>;
    public sessionId: string; // Used for tracking users behavior

    public initialValues: IFieldUpdateDictionary;
    public manuallySetFields: IFieldDataDictionary;
    public relatedData: IDictionaryStringTo<IWorkItemRelatedData>;

    constructor(wit: WorkItemType, data?: IWorkItemData | any, extensions?: IWorkItemTypeExtension[]) {
        this.workItemType = wit;
        this._originalWorkItemType = this.workItemType;
        this.store = wit.store;
        this.project = wit.project;
        this.extensions = extensions || [];
        this._originalExtensions = this.extensions;
        this._httpClient = this.store.tfsConnection.getHttpClient<WITWebApi.WorkItemTrackingHttpClient>(WITWebApi.WorkItemTrackingHttpClient);

        this.events = new Events_Handlers.NamedEventCollection();
        this._eventsEnabled = false;
        this._initializeFields();
        this._defineExtensionFields();

        // Load the data into the work item and do not reset the fields since no updates have been made yet.
        this._load(data, false);
        this._eventsEnabled = true;
        this.relatedData = {};
        this.extensionIds = [];
        this._contributionErrorMap = {};
        this.sessionId = Utils_String.generateUID();
    }

    private _initializeFields() {
        this.fields = [];
        this.fieldMap = {};
        this.fieldMapById = {};
        this._fieldValidationMap = {};
        this._defineWorkItemTypeFields();
    }

    /**
     * Sets/Clears the error associated with a contribution instance
     */
    public setContributionErrorStatus(contributionInstanceId: string, isValid: boolean, errorMessage?: string) {
        if (isValid && this._contributionErrorMap.hasOwnProperty(contributionInstanceId)) {
            delete this._contributionErrorMap[contributionInstanceId];
            this.fireWorkItemErrorChanged();
        } else if (!isValid) {
            const prevError = this._contributionErrorMap[contributionInstanceId];
            this._contributionErrorMap[contributionInstanceId] = errorMessage || "";
            if (prevError !== this._contributionErrorMap[contributionInstanceId]) {
                this.fireWorkItemErrorChanged();
            }
        }
    }

    /**
     * Reset the contribution errors.
     */
    public resetContributionErrorStatuses(): void {
        if (this._contributionErrorMap && Object.keys(this._contributionErrorMap).length > 0) {
            this._contributionErrorMap = {};
            this.fireWorkItemErrorChanged();
        }
    }

    public hasAttachmentsPendingUpload(): boolean {
        let hasAttachmentsPendingUpload: boolean = false;

        return this.allLinks.some(function (current, i, allLinks) {
            if (current instanceof Attachment && current.getPlaceholderStatus()) {
                hasAttachmentsPendingUpload = true;
            }
            return hasAttachmentsPendingUpload;
        });
    }

    public isReset(): boolean {
        return this._isReset;
    }

    /**
     * Returns a rest API workitem contract for this instance of workitem
     * @returns workItem
     */
    public getWorkItemContract(): WITContracts.WorkItem {
        if (this.isNew()) {
            return null;
        }

        const fieldValues: IDictionaryStringTo<Object> = {};
        this.fields.forEach((field: Field) => {
            fieldValues[field.fieldDefinition.referenceName] = this.getFieldValue(field.fieldDefinition.referenceName);
        });

        return {
            id: this.id,
            rev: this.revision,
            relations: null,
            fields: fieldValues,
            _links: null,
            url: WorkItem.getResourceUrl(this.store.getTfsContext(), this.id)
        };
    }

    public getWorkItemRelations(): WITContracts.WorkItemRelation[] {
        const existingLinks = this.allLinks;
        const filteredLinks = existingLinks.filter((workItemLink: Link) => {
            return !workItemLink.isRemoved() && workItemLink.linkData.FldID !== WITConstants.DalFields.AttachedFiles;
        });

        return filteredLinks.map((link: Link) => {
            const workItemRelation: WITContracts.WorkItemRelation = {
                attributes: link.getAttributes(),
                rel: link.getRelationLinkType(),
                url: link.getLinkUrl()
            };
            return workItemRelation;
        });
    }

    /**
     * Return true if the specified link is already exist
     * @param link Link to be checked for duplicate
     */
    public doesLinkAlreadyExist(link: Link): boolean {
        let isDuplicate: boolean = false;
        for (const curLink of this.allLinks) {
            isDuplicate = curLink.isDuplicate(link);
            if (isDuplicate) {
                return true;
            }
        }

        return false;
    }

    /**
     *  Change the workItemType, redefine the fields. Clear the ruleEngine instance so that we recreate the rules based on the new fields array.
     *  Also reset the project, if required
     *  @param workItemType: The new workItemType to which the current workitem needs to be changed tological revision 'revisionIndex+1'.
     *  @param extensions: The new work item extension to which the current workitem needs to be changed tological revision 'revisionIndex+1'.
     *           If no extension passed in, set to empty.
     *  @param suppressEvents: if true, no events will be fired.
     */
    public changeWorkItemType(workItemType: WorkItemType, extensions?: IWorkItemTypeExtension[], suppressEvents?: boolean) {
        if (this.isReadOnly()) {
            return;
        }

        // Act only if the workitem type being passed is different
        if (this.workItemType !== workItemType) {
            const projectChanged = (workItemType.project !== this.project);

            this._isChangeProjectInProgress = projectChanged;

            if (!suppressEvents) {
                projectChanged ? this.fireWorkItemProjectChanging() : this.fireWorkItemTypeChanging();
            }

            const prevWorkItemType = this.workItemType;
            const fieldNameToValueMap = this._getFieldChangeOnBugTypeChanged(prevWorkItemType, workItemType);

            // Change work item type.
            this.workItemType = workItemType;
            // Set ruleEngine for reinitialization
            this.ruleEngine = null;
            // reinitialize fields
            this._initializeFields();

            // Now that we've initialized the fields for the *new* work item type, we also need to define any field for which we still have
            // data (i.e., fields that only existed on the *old* work item type).
            for (const fieldRef of Object.keys(this._fieldData)) {
                this._defineField(fieldRef);
            }

            // reinitialize extensions
            this.extensions = extensions || [];
            this._defineExtensionFields();

            this._setProject(workItemType.project);

            if (!Utils_String.equals(workItemType.name, prevWorkItemType.name)) {
                this.setFieldValue(WITConstants.CoreField.WorkItemType, workItemType.name);

                for (const fieldName in fieldNameToValueMap) {
                    this.setFieldValue(fieldName, fieldNameToValueMap[fieldName]);
                }
            }

            // Trigger rule evaluation
            this.evaluate();

            this._isChangeProjectInProgress = false;

            if (!suppressEvents) {
                projectChanged ? this.fireWorkItemProjectChanged() : this.fireWorkItemTypeChanged();
            }
        }
    }

    public isChangeProjectInProgress(): boolean {
        return this._isChangeProjectInProgress;
    }

    private _getFieldChangeOnBugTypeChanged(prevWorkItemType: WorkItemType, workItemType: WorkItemType): IDictionaryStringTo<any> {
        // When change wit type from or to bug, we do best effort to populate ReproSteps field to Description field and vice versa.
        const fieldNameToValueMap: IDictionaryStringTo<any> = {};

        const message = `<b><u><br/><br/>${Utils_String.format(Resources.WorkItemChangedReproDescriptionMessage,
            this.getField(this._isBugTypeChange(prevWorkItemType) ? BugWITFieldReferenceNames.ReproSteps : WITConstants.CoreFieldRefNames.Description).fieldDefinition.name,
            prevWorkItemType.name,
            workItemType.name)}</u></b><br/>`;

        if (this._isBugTypeChange(prevWorkItemType)) {
            // change work item type from bug category.
            const reproSteps = this.getFieldValue(BugWITFieldReferenceNames.ReproSteps);
            const existingDescription = this.getFieldValue(WITConstants.CoreFieldRefNames.Description);
            if (reproSteps && !WorkItemRichTextHelper.isHtmlVisuallyBlank(reproSteps)) {
                fieldNameToValueMap[WITConstants.CoreFieldRefNames.Description] = existingDescription ? existingDescription + message + reproSteps : message + reproSteps;
            }
        } else if (this._isBugTypeChange(workItemType)) {
            // change work item type to bug cateogry.
            const description = this.getFieldValue(WITConstants.CoreFieldRefNames.Description);
            const existingReproSteps = this.getFieldValue(BugWITFieldReferenceNames.ReproSteps);
            if (description && !WorkItemRichTextHelper.isHtmlVisuallyBlank(description)) {
                fieldNameToValueMap[BugWITFieldReferenceNames.ReproSteps] = existingReproSteps ? existingReproSteps + message + description : message + description;
            }
        }
        return fieldNameToValueMap;
    }

    private _isBugTypeChange(workItemType: WorkItemType): boolean {
        if (workItemType.fields) {
            // assume that the given type is a Bug type if it has 'repro steps' field. This is a best effort so if type was customized
            // w/o OOB repro steps, then we assume it's not a bug type and skip field copy logic between repro steps and description fields
            return workItemType.fields.some(fd => Utils_String.equals(fd.referenceName, BugWITFieldReferenceNames.ReproSteps, true));
        }

        return false;
    }

    /**
     * Return the original work item type.
     */
    public getOriginalWorkItemType(): WorkItemType {
        return this._originalWorkItemType;
    }

    private _setProject(project: Project) {
        if (this.isReadOnly()) {
            return;
        }

        if (this.project !== project) {
            this.project = project;
            this._setFieldValueById(WITConstants.CoreField.TeamProject, project.name);
        }
    }

    private _defineField(fieldReferenceOrId: number | string) {
        if (!this.fieldMap.hasOwnProperty(("" + fieldReferenceOrId).toUpperCase())) {
            let fieldDef = this.workItemType.getFieldDefinition(fieldReferenceOrId);

            if (!fieldDef) {
                fieldDef = this.store.getFieldDefinition(fieldReferenceOrId);
            }

            if (fieldDef && !Boolean(this.fieldMapById[fieldDef.id + ""])) {
                const field = new Field(this, fieldDef);

                this.fieldMap[fieldDef.referenceName.toUpperCase()] = field;
                this.fieldMap[fieldDef.name.toUpperCase()] = field;
                this.fieldMapById[fieldDef.id + ""] = field;

                this.fields.push(field);
            }
        }
    }

    private _defineWorkItemTypeFields() {
        $.each(this.workItemType.fields, (i, fieldDef) => {
            this._defineField(fieldDef.referenceName);
        });
    }

    private _defineExtensionFields() {
        if (this.extensions) {
            $.each(this.extensions, (i: number, extension: IWorkItemTypeExtension) => {
                if (extension.markerField) {
                    this._defineField(extension.markerField.field.referenceName);
                }

                if (extension.fields) {
                    $.each(extension.fields, (i: number, efield: IWorkItemTypeExtensionFieldEntry) => {
                        this._defineField(efield.field.referenceName);
                    });
                }
            });
        }
    }

    public discardIfNew() {
        if (this.isNew()) {
            this.fireWorkItemDiscarded();

            Events_Services.getService().fire(Actions.WORKITEM_DISCARDED, this);
        }
    }

    public isNew(): boolean {
        return +this.id < 1;
    }

    public isDeleted(): boolean {
        return this.getFieldValue(WITConstants.CoreFieldRefNames.IsDeleted);
    }

    public resetManualFieldChanges() {
        this.manuallySetFields = {};
    }

    /**
     * Sets the extensions object and populate the field map
     * @param extensions
     */
    public setExtensions(extensions: IWorkItemTypeExtension[]): void {
        this.extensions = extensions || [];
        this._originalExtensions = this.extensions;
        this._defineExtensionFields();
        this.ruleEngine = null; // reset rule engine so that it should pick extension rules
    }

    /**
     * Checks the work item is dirty or not
     * @param onlyUserChanges
     */
    public isDirty(onlyUserChanges?: boolean): boolean {
        if (this.isReadOnly()) {
            return false;
        }

        if (this.isDeleted()) {
            // The deleted work item should not be editable
            return false;
        }

        if (this._fieldsDirty(onlyUserChanges)) {
            return true;
        }

        const allLinks = this.allLinks;
        for (const link of allLinks) {
            if (link.isRemoved()) {
                continue;
            }
            // If the link is added by a system we dont want to make workitem dirty. Also if the link is updated we want to make it as dirty
            if (link.isNew() && link instanceof WorkItemLink && link.linkData.isAddedBySystem) {
                continue;
            }
            if (link.deleted !== link.isNew()) {
                return true;
            } else if (link.updated) {
                return true;
            }
        }

        return false;
    }

    public isValid(): boolean {
        const invalidFields = this.getInvalidFields(true);

        return (!invalidFields || invalidFields.length === 0) && Object.keys(this._contributionErrorMap).length === 0;
    }

    public isReadOnly(): boolean {
        return this._isReadOnly || this.isDeleted();
    }

    /**
     * Checks if the field definition is an extension field
     * @param fieldDefinition
     */
    public isExtensionField(fieldDefinition: FieldDefinition): boolean {
        return (fieldDefinition.usages & FieldUsages.WorkItemTypeExtension) === FieldUsages.WorkItemTypeExtension;
    }

    public getRevisions() {
        return this._revisions;
    }

    public getUniqueId(): number {
        return this.id || this.tempId;
    }

    /**
     * Associate an error with the work item and raise the work item changed event
     * @param error Error object to be associated with the work item
     */
    public setError(error: Error): void {
        Diag.Debug.assertParamIsObject(error, "error");

        // IMPORTANT: DO NOT try copy object created by Error() unless you know how to - a couple properties are not enumerable and get lost.
        this._error = <IWorkItemError>error;

        // Fire the error-changed work item changed event.
        this.fireWorkItemErrorChanged();
    }

    /**
     * Clears the error associated with the work item and raises the work item changed event
     */
    public clearError(): void {
        if (this._error) {
            this._error = null;

            // Fire the error-changed work item changed event.
            this.fireWorkItemErrorChanged();
        }
    }

    /**
     * Gets error associated with this work item or null if there is not one
     */
    public getError(): IWorkItemError {
        return this._error;
    }

    /**
     * True if there is an error associated with the work item and false otherwise
     */
    public hasError(): boolean {
        if (this._error) {
            return true;
        }
        return false;
    }

    public getInvalidFields(stopAtFirst?: boolean): Field[] {
        const result: Field[] = [];
        const fields = this.fields;
        for (const field of fields) {
            if (!field.isValid()) {
                result.push(field);
                if (stopAtFirst) {
                    break;
                }
            }
        }

        return result;
    }

    /**
     * Return all dirty fields
     * @param onlyUserChanges
     */
    public getDirtyFields(onlyUserChanges?: boolean): Field[] {
        const result: Field[] = [];

        for (const field of this.fields) {
            const fieldId = field.fieldDefinition.id.toString();

            if (onlyUserChanges && this.manuallySetFields && this.manuallySetFields.hasOwnProperty(fieldId)) {
                result.push(field);
            } else if (!onlyUserChanges && this.fieldUpdates && this.fieldUpdates.hasOwnProperty(fieldId)) {
                result.push(field);
            }
        }

        return result;
    }

    public isFieldDirty(fieldNameOrId: number | string): boolean {
        const field = this.getField(fieldNameOrId);
        return field && field.isDirty();
    }

    public setFieldValue(fieldNameOrId: number | string, value: any, setByRule?: boolean, fireIdentityEagerValidation?: boolean): boolean {
        if (this.isReadOnly()) {
            return false;
        }

        const field = this.getField(fieldNameOrId);

        if (field) {
            field.setValue(value, false, fireIdentityEagerValidation, setByRule);
            return true;
        } else {
            return false;
        }
    }

    public getFieldValue(fieldNameOrId: number | string, original?: boolean, omitSetByRule?: boolean): any {
        const field = this.getField(fieldNameOrId);
        if (field) {
            return field.getValue(original, omitSetByRule);
        }
    }

    public getIdentityFieldValue(fieldNameOrId: number | string, original?: boolean, omitSetByRule?: boolean): IdentityRef {
        const field = this.getField(fieldNameOrId);
        if (field) {
            return field.getIdentityValue(original, omitSetByRule);
        }
    }

    public getFriendlyFieldValue(fieldNameOrId: number | string, original?: boolean, omitSetByRule?: boolean): any {
        const field = this.getField(fieldNameOrId);

        if (field) {
            return field.getFriendlyValue(original, omitSetByRule);
        }
    }

    public _getFieldValueById(fieldId: number, original?: boolean, omitSetByRule?: boolean, asIdentityRef?: boolean): any {
        const updates = this.fieldUpdates;

        switch (fieldId) {
            case WITConstants.CoreField.AttachedFileCount:
                return this._getLinkCount(Attachment, original);
            case WITConstants.CoreField.ExternalLinkCount:
                return this._getLinkCount(ExternalLink, original);
            case WITConstants.CoreField.HyperLinkCount:
                return this._getLinkCount(Hyperlink, original);
            case WITConstants.CoreField.RelatedLinkCount:
                return this._getLinkCount(WorkItemLink, original);
            case WITConstants.CoreField.CommentCount:
                return this._getCommentCount(original);
            case WITConstants.CoreField.TeamProject:
                if (this.isNew() && this.project) {
                    // For new workitems, return the current project.
                    // This is to support any defaulting rules based off TeamProject value
                    return this.project.name;
                }
        }

        const fieldIdStr = fieldId + "";

        if (!original && updates.hasOwnProperty(fieldIdStr)) {
            const update: IFieldUpdate = updates[fieldIdStr];
            if (!update.setByRule || !omitSetByRule) {
                return convertPotentialIdentityRefFromFieldValue(update.value, asIdentityRef);
            }
        }

        if (fieldId === WITConstants.CoreField.History) {
            return "";
        }

        return convertPotentialIdentityRefFromFieldValue(this._fieldData[fieldIdStr], asIdentityRef);
    }

    public _setFieldValueById(fieldId: number, value: any, setByRule?: boolean) {
        if (this.isReadOnly()) {
            return;
        }

        switch (fieldId) {
            case WITConstants.CoreField.AttachedFileCount:
            case WITConstants.CoreField.ExternalLinkCount:
            case WITConstants.CoreField.HyperLinkCount:
            case WITConstants.CoreField.RelatedLinkCount:
            case WITConstants.CoreField.CommentCount:
                return;
            case WITConstants.CoreField.AreaId:
            case WITConstants.CoreField.IterationId:
                if (!this.project.nodesCacheManager.getReferencedNode(<number>value)) {
                    throw new Error("Invalid node id.");
                }
                break;
        }

        const fieldIdStr = fieldId + "";

        const field = this.getField(fieldId);
        let isIdentityField = false;
        if (field && field.fieldDefinition) {
            isIdentityField = field.fieldDefinition.isIdentity;
        }

        const originalValue = this._fieldData[fieldIdStr];

        if (!setByRule && this.manuallySetFields) {
            this.manuallySetFields[fieldIdStr] = value;
        }

        // A change was made to the history field
        const historyChange = fieldId === WITConstants.CoreField.History;

        // The history field was changed to a non-empty value
        const nonEmptyHistoryChange = historyChange && !Field.compareValues("", value);

        // Another field's value was changed
        const otherFieldChange = !historyChange && !Field.compareValues(originalValue, value, undefined, isIdentityField);

        if (nonEmptyHistoryChange || otherFieldChange) {
            this.fieldUpdates[fieldIdStr] = { value: value, setByRule: setByRule };
            if (nonEmptyHistoryChange) {
                // Evaluate CommentCount-dependent rules for non-empty history changes
                const commentCountValue = this.getFieldValue(WITConstants.CoreField.CommentCount);
                this.evaluateField(WITConstants.CoreField.CommentCount, true, commentCountValue);
            }
        } else {
            delete this.fieldUpdates[fieldIdStr];
            if (this.manuallySetFields) {
                delete this.manuallySetFields[fieldIdStr];
            }
        }
    }

    public getFieldValueByRevision(fieldId: number, revision: number): any {
        const revs = this._revisions;
        const fieldIdStr = fieldId + "";

        if (revision < 0) {
            // TODO: We need to check special revisions here
            return null;
        } else {

            // Trying to get the computed fields first
            if (fieldId === WITConstants.CoreField.History) {
                // Finding the proper revision by the rev number
                if (revision < revs.length) {
                    return revs[revision][fieldIdStr];
                } else {
                    return this._fieldData[fieldIdStr];
                }
            } else {
                const computed = this.getComputedFieldValue(fieldId, revision);
                if (computed && computed.success) {
                    return computed.value;
                }

                let result;
                let found: boolean = false;
                for (let i = revision; i < revs.length; i++) {
                    if (revs[i].hasOwnProperty(fieldIdStr)) {
                        result = convertPotentialIdentityRefFromFieldValue(revs[i][fieldIdStr]);
                        found = true;
                        break;
                    }
                }
                // *IMPORTANT* Why we need a found flag and not compare result===undefined? Because the server/local behavior diverges and need handle both.
                // Field "Resolved By" - when user "Liang" resolves a work item and save as latest rev 2
                // Rev       | MVC    | Client      | Note
                // 1         | <null> | <undefined> | This revision is pushed after save happens in WorkItem.TakeUpdateResult
                // ---------------------------------------------------------------------------
                // Latest(2) | Liang  | Liang       |
                // Logically we should set these as null in the WorkItem.TakeUpdateResult code, but to keep code change minimal we handle it here.

                if (!found) {
                    // fallback to latest value, no changes occurred between [revision,latest]
                    result = this._getFieldValueById(fieldId, true);
                }

                return result;
            }
        }
    }

    /**
     * **IMPORTANT** Make sure you know how this function behaves before you call
     * @param defaultValue: The value to be returned if we found no change on given revision - undefined means use latest field value as default
     *                      In general it should be the value of revisionIndex+1 (next future revision)'s value based on how WorkItem.revisions is built, see below:
     *                      revisions[revisionX][fieldY] : If undefined, look at revisions[revisionX+1][fieldY] using same logic defined here, if revisionX+1 does not exist, refer to latest field value
     *                                                     If has value, it's the value for fieldY as of 'logical' revision revisionX+1 (logical revision is 1-base)
     *
     * @param revisionIndex: 0-based revision index to apply on WorkItem.revisions object, represent logical revision 'revisionIndex+1'.
     */
    public getNonComputedFieldValueByRevisionWithDefaultValue(fieldId: number, revisionIndex: number, defaultValue: any, asIdentityRef?: boolean): any {
        // Best effort block illegal use of this function (Given we have to make this public for cross-class usage)
        Diag.Debug.assert(fieldId !== WITConstants.CoreField.History, "History is revision specific, wrong usage");
        Diag.Debug.assert(fieldId !== WITConstants.CoreField.NodeName, "Do not support computed fields");
        Diag.Debug.assert(fieldId !== WITConstants.CoreField.IterationPath, "Do not support computed fields");
        Diag.Debug.assert(fieldId !== WITConstants.CoreField.AreaPath, "Do not support computed fields");

        if (revisionIndex < 0) {
            // [liangzhu] This is to be consistent with getFieldValueByRevision - no real usage as of 11/13/2015
            return null;
        }

        const currentRevision = this._revisions[revisionIndex];
        const fieldIdStr = fieldId + "";
        let result;

        if (currentRevision && currentRevision.hasOwnProperty(fieldIdStr)) {
            result = convertPotentialIdentityRefFromFieldValue(currentRevision[fieldIdStr], asIdentityRef);
        } else {
            // undefined => There's nothing found in walking revisions history, we shall apply the latest
            // revisionIndex >= this.revisions.length => Theoretically in this case the defaultValue should be undefined as well so we do not need this, extra protection for potential bad caller.
            if (defaultValue === undefined || revisionIndex >= this._revisions.length) {
                result = this._getFieldValueById(fieldId, true, false, asIdentityRef);
            } else {
                result = defaultValue;
            }
        }
        return result;
    }

    /**
     * Gets the computed value of a field
     * @param fieldId Id of the field to compute the value
     * @param revisionIndex (Optional) Revision number to compute against
     */
    public getComputedFieldValue(fieldId: number, revisionIndex?: number): { success: boolean, value: any } {
        const fieldIdStr = fieldId + "";

        // Use team project, iteration path, area path in the specified revision if not null.
        // Server sends these 3 values for each revision even if value didn't change to support work item move scenario
        // However it's possible to get a null value if the resolution failed on server side - for instance if area path was removed.
        if (revisionIndex >= 0 && (fieldId === WITConstants.CoreField.TeamProject ||
            fieldId === WITConstants.CoreField.IterationPath ||
            fieldId === WITConstants.CoreField.AreaPath)) {
            const revision = this._revisions[revisionIndex];
            if (revision && revision.hasOwnProperty(fieldIdStr)) {
                const fieldValue = revision[fieldIdStr];
                if (fieldValue) {
                    return { success: true, value: fieldValue };
                }
            }
        }

        switch (fieldId) {
            case WITConstants.CoreField.TeamProject:
                return this._getFieldValueById(fieldId, true);

            case WITConstants.CoreField.NodeName:
                return this.computeFieldValue(WITConstants.CoreField.NodeName, WITConstants.CoreField.AreaId, revisionIndex);

            case WITConstants.CoreField.IterationPath:
                return this.computeFieldValue(WITConstants.CoreField.IterationPath, WITConstants.CoreField.IterationId, revisionIndex);

            case WITConstants.CoreField.AreaPath:
                return this.computeFieldValue(WITConstants.CoreField.AreaPath, WITConstants.CoreField.AreaId, revisionIndex);

            default:
                return null;
        }
    }

    public isSaving(): boolean {
        return this._saving;
    }

    /**
     * return whether the specific field is waiting for server validation result
     * @param fieldValidationKey The key of the field requiring the status
     */
    public isValidating(fieldValidationKey: FieldValidationKey): boolean {
        if (fieldValidationKey) {
            return this._fieldValidationMap[fieldValidationKey.toString()] || false;
        } else {
            for (const key in this._fieldValidationMap) {
                if (this._fieldValidationMap[key]) {
                    return true;
                }
            }
            return false;
        }
    }

    public getTitle(): string {
        return this._getFieldValueById(WITConstants.CoreField.Title) || "";
    }

    public getCaption(includeDirtyModifier?: boolean, excludeTempId?: boolean): string {
        let caption: string;
        if (this.isNew()) {
            const tempId = excludeTempId ? "" : -this.tempId;
            caption = Utils_String.format(Resources.WorkItemEditorCaptionNew, this.workItemType.name, tempId);
        } else {
            caption = Utils_String.format(Resources.WorkItemEditorCaption, this.workItemType.name, this.id);
        }

        if (includeDirtyModifier && this.isDirty(true)) {
            caption = Utils_String.format(Resources.WorkItemEditorDirtyCaption, caption);
        }

        return caption;
    }

    public getInfoText(): IWorkItemInfoText {
        const result: IWorkItemInfoText = <any>{};
        const invalidFields = this.getInvalidFields(true);

        // If the work item has invalid fields, display the error for the field.
        if (invalidFields && invalidFields.length > 0) {
            result.text = invalidFields[0].getErrorText();
            result.invalid = true;
        } else if (this.hasError()) {
            if (this._error.fieldReferenceName && !this.fieldMap[this._error.fieldReferenceName.toUpperCase()]) {
                // The bad field doesn't exist on the work item.
                // Most likely, the process has been recently customized, and the browser needs to be refreshed.
                result.text = Resources.BrowserRefreshRequired;

                Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                    WIFormCIDataHelper.getArea(),
                    "WorkItem.BrowserRefreshRequired",
                    {
                        "fieldReferenceName": this._error.fieldReferenceName
                    }));
            } else {
                // The work item has an error associated with it, so display the error.
                result.text = getErrorMessage(this.getError());
            }

            result.invalid = true;
        } else if (Object.keys(this._contributionErrorMap).length > 0) {
            result.invalid = true;
            result.text = this._contributionErrorMap[Object.keys(this._contributionErrorMap)[0]] || "";
        } else {
            result.text = this.getTitle();
        }

        return result;
    }

    public getState(): string {
        return this._getFieldValueById(WITConstants.CoreField.State) || "";
    }

    public getPerson(id: number): WorkItemIdentityRef {
        // TODO: Review falling back to current user. When a new work item is created and saved,
        // updateResult doesn't update the referenced persons and changed by person name cannot
        // be resolved. As a result we fallback to the current.
        return this.referencedPersons[id] || this.store.getCurrentUser();
    }

    public getIdentity(name: string | WorkItemIdentityRef): IdentityRef {
        if (isWorkItemIdentityRef(name)) {
            return (<WorkItemIdentityRef>name).identityRef;
        } else {
            return createIdentityRefFromDistinctDisplayName(name);
        }
    }

    public updateCachedIdOnSave() {
        Events_Services.getService().fire(Actions.WORKITEM_ID_UPDATED, this);
    }

    public attachEvent(eventName: string, handler: IEventHandler) {
        this.events.subscribe(eventName, <any>handler);
    }

    public detachEvent(eventName: string, handler: IEventHandler) {
        this.events.unsubscribe(eventName, <any>handler);
    }

    public fireEvent(eventName: string, eventData?: any) {
        if (this._eventsEnabled) {
            this.events.invokeHandlers(eventName, this, eventData);
        }
    }

    public attachWorkItemChanged(handler: IEventHandler) {
        this.attachEvent("workitem-changed", handler);
    }

    public detachWorkItemChanged(handler: IEventHandler) {
        this.detachEvent("workitem-changed", handler);
    }

    /**
     * Clear the errors associated with the work item when it is changed.
     * NOTE: This is not done when it is the error which is changed or when a save completes as any
     *     error which occurred during the save operation should not be cleared.
     * @param args
     */
    public fireWorkItemChanged(args?: IWorkItemChangedArgs) {
        if (args && args.change !== WorkItemChangeType.ErrorChanged && args.change !== WorkItemChangeType.SaveCompleted) {
            this.clearError();
        }

        this.fireEvent("workitem-changed", args);
    }

    public fireWorkItemPreSave(args?: IWorkItemChangedArgs) {
        this.fireWorkItemChanged(<IWorkItemChangedArgs>($.extend({ workItem: this, change: WorkItemChangeType.PreSave }, args)));
    }

    public fireWorkItemSaved(args?: IWorkItemChangedArgs) {
        this.fireWorkItemChanged(<IWorkItemChangedArgs>($.extend({ workItem: this, change: WorkItemChangeType.Saved }, args)));
    }

    public fireWorkItemSaving(args?: IWorkItemChangedArgs) {
        this.fireWorkItemChanged(<IWorkItemChangedArgs>($.extend({ workItem: this, change: WorkItemChangeType.Saving }, args)));
    }

    public fireWorkItemValidating(args?: IWorkItemChangedArgs) {
        this.fireWorkItemChanged(<IWorkItemChangedArgs>($.extend({ workItem: this, change: WorkItemChangeType.Validating }, args)));
    }

    public fireWorkItemValidationComplete(args?: IWorkItemChangedArgs) {
        this.fireWorkItemChanged(<IWorkItemChangedArgs>($.extend({ workItem: this, change: WorkItemChangeType.ValidationCompleted }, args)));
    }

    public fireWorkItemRefresh(args?: IWorkItemChangedArgs) {
        this.fireWorkItemChanged(<IWorkItemChangedArgs>($.extend({ workItem: this, change: WorkItemChangeType.Refresh }, args)));
    }

    public fireWorkItemReset(args?: IWorkItemChangedArgs) {
        this.fireWorkItemChanged(<IWorkItemChangedArgs>($.extend({ workItem: this, change: WorkItemChangeType.Reset }, args)));
    }

    public fireWorkItemDiscarded(args?: IWorkItemChangedArgs) {
        this.fireWorkItemChanged(<IWorkItemChangedArgs>($.extend({ workItem: this, change: WorkItemChangeType.Discarded }, args)));
    }

    public fireWorkItemSaveComplete(args?: IWorkItemChangedArgs) {
        this.fireWorkItemChanged(<IWorkItemChangedArgs>($.extend({ workItem: this, change: WorkItemChangeType.SaveCompleted }, args)));
    }

    public fireWorkItemDeleted(args?: IWorkItemChangedArgs) {
        this.fireWorkItemChanged(<IWorkItemChangedArgs>($.extend({ workItem: this, change: WorkItemChangeType.Deleted }, args)));
    }

    public fireWorkItemTypeChanging(args?: IWorkItemChangedArgs) {
        this.fireWorkItemChanged(<IWorkItemChangedArgs>($.extend({ workItem: this, change: WorkItemChangeType.TypeChanging }, args)));
    }

    public fireWorkItemTypeChanged(args?: IWorkItemChangedArgs) {
        this.fireWorkItemChanged(<IWorkItemChangedArgs>($.extend({ workItem: this, change: WorkItemChangeType.TypeChanged }, args)));
    }

    public fireWorkItemProjectChanging(args?: IWorkItemChangedArgs) {
        this.fireWorkItemChanged(<IWorkItemChangedArgs>($.extend({ workItem: this, change: WorkItemChangeType.ProjectChanging }, args)));
    }

    public fireWorkItemProjectChanged(args?: IWorkItemChangedArgs) {
        this.fireWorkItemChanged(<IWorkItemChangedArgs>($.extend({ workItem: this, change: WorkItemChangeType.ProjectChanged }, args)));
    }

    public fireWorkItemErrorChanged(args?: IWorkItemChangedArgs) {
        this.fireWorkItemChanged(<IWorkItemChangedArgs>($.extend({ workItem: this, change: WorkItemChangeType.ErrorChanged }, args)));

        if (this.hasError() && this._error.fieldReferenceName) {
            this.fireEvent("field-error:" + this._error.fieldReferenceName);
        } else {
            // if error is null, mark all fields as valid
            this.fireEvent(WorkItem.FIELD_ERRORS_CLEARED);
        }
    }

    public fireWorkItemLinksUpdatedByOtherWorkItem(args?: IWorkItemChangedArgs) {
        this.fireWorkItemChanged(<IWorkItemChangedArgs>($.extend({ workItem: this, change: WorkItemChangeType.WorkItemLinkChangedOutside }, args)));
    }

    public fireFieldChange(changedFieldsRefNameOrId: string[] | number[]): void {
        const uniqueChangedFields: IDictionaryStringTo<Field> = {};

        // For performance reasons we don't perform these operations if we are not firing events.
        // This is used during construction of work items since no events can be attached until
        // the object is constructed in any case.
        if (this._eventsEnabled && changedFieldsRefNameOrId) {
            for (const fieldRef of changedFieldsRefNameOrId) {
                if (!uniqueChangedFields.hasOwnProperty(fieldRef)) {
                    const field = this.getField(fieldRef);

                    if (field) {
                        const fieldId = field.fieldDefinition.id;
                        const dependentFieldId: number = WorkItem.FIELD_ID_TO_DEPENDENT_ID_MAP[fieldId];

                        uniqueChangedFields[fieldId] = field;

                        if (dependentFieldId) {
                            const dependentField = this.getField(dependentFieldId);
                            if (dependentField) {
                                uniqueChangedFields[dependentFieldId] = dependentField;
                            }
                        }
                    } else if (!dontNotifyAllFieldsOnSave()) { // else, we don't have a good field definition here for a field that has changed. This can be true for things like the isDeleted field, which seems to exist only after a work item has been created.
                        uniqueChangedFields[fieldRef] = null;
                    }
                }
            }

            changedFieldsRefNameOrId = [];

            for (const fieldRef in uniqueChangedFields) {
                if (uniqueChangedFields.hasOwnProperty(fieldRef)) {
                    const field = uniqueChangedFields[fieldRef];
                    changedFieldsRefNameOrId[changedFieldsRefNameOrId.length] = fieldRef;
                    this.fireEvent("field-change:" + fieldRef, field);
                }
            }
        }

        this.fireWorkItemChanged({ workItem: this, change: WorkItemChangeType.FieldChange, changedFields: uniqueChangedFields });
    }

    public attachFieldChange(fieldReferenceOrId: number | string, handler: IEventHandler): void {
        const field = this.getField(fieldReferenceOrId);

        if (field) {
            this.attachEvent("field-change:" + field.fieldDefinition.id, handler);
        } else {
            this.attachEvent("field-change:" + fieldReferenceOrId, handler);
        }
    }

    public detachFieldChange(fieldReferenceOrId: string | number, handler: IEventHandler): void {
        const field = this.getField(fieldReferenceOrId);

        if (field) {
            this.detachEvent("field-change:" + field.fieldDefinition.id, handler);
        } else {
            this.detachEvent("field-change:" + fieldReferenceOrId, handler);
        }
    }

    public getField(fieldReferenceOrId: number | string): Field {

        const fieldReference: string = ("" + fieldReferenceOrId).toUpperCase();

        return this.fieldMapById[fieldReference] || this.fieldMap[fieldReference];
    }

    public computeFieldValue(fieldOrFieldId: number | Field, baseFieldId: number, revision?: number): { value: any; success: boolean; } {

        const that = this;
        let fieldId: number;
        let baseFieldValue: any /* string or number */;
        const result: { value: any; success: boolean; } = <any>{ success: false };

        fieldId = (fieldOrFieldId instanceof Field) ? (<Field>fieldOrFieldId).fieldDefinition.id : <number>fieldOrFieldId;

        if (revision >= 0) {
            // this code path will be used if valid revision was passed
            baseFieldValue = this.getFieldValueByRevision(baseFieldId, revision);
        } else {
            // this code path will be used if no revision was used
            baseFieldValue = this._getFieldValueById(baseFieldId);
        }

        function calcNodeLevel(level: number) {
            if (baseFieldValue) {
                const node = that.project.nodesCacheManager.getReferencedNode(<number>baseFieldValue);

                if (node) {
                    let segments: string[];
                    if ((<IReferencedNode>node).path) {
                        segments = NodeHelpers.getReferencedNodeSegmenets((<IReferencedNode>node).path);
                    } else {
                        segments = NodeHelpers.getNodeSegments(<INode>node);
                    }
                    result.value = segments[level];
                    result.success = true;
                }
            }
        }

        switch (fieldId) {
            case WITConstants.CoreField.AreaId:
            case WITConstants.CoreField.IterationId:
                if (baseFieldValue) {
                    const node = this.project.nodesCacheManager.getReferencedNode({ path: <string>baseFieldValue, nodeType: (fieldId === WITConstants.CoreField.AreaId) ? 1 : 2 });

                    if (node) {
                        result.value = node.id;
                        result.success = true;
                    }
                }
                break;
            case WITConstants.DalFields.AreaLevel1:
            case WITConstants.DalFields.IterationLevel1:
                calcNodeLevel(0);
                break;
            case WITConstants.DalFields.AreaLevel2:
            case WITConstants.DalFields.IterationLevel2:
                calcNodeLevel(2);
                break;
            case WITConstants.DalFields.AreaLevel3:
            case WITConstants.DalFields.IterationLevel3:
                calcNodeLevel(3);
                break;
            case WITConstants.DalFields.AreaLevel4:
            case WITConstants.DalFields.IterationLevel4:
                calcNodeLevel(4);
                break;
            case WITConstants.DalFields.AreaLevel5:
            case WITConstants.DalFields.IterationLevel5:
                calcNodeLevel(5);
                break;
            case WITConstants.DalFields.AreaLevel6:
            case WITConstants.DalFields.IterationLevel6:
                calcNodeLevel(6);
                break;
            case WITConstants.DalFields.AreaLevel7:
            case WITConstants.DalFields.IterationLevel7:
                calcNodeLevel(7);
                break;
            case WITConstants.CoreField.AreaPath:
            case WITConstants.CoreField.IterationPath:
                if (baseFieldValue) {
                    let node = this.project.nodesCacheManager.getReferencedNode(<number>baseFieldValue);

                    if (!node) {
                        // In case the workitem was moved on the client and not yet saved (move in progress),
                        // we should fall back to original project, from which it was moved to the current project,
                        // to find the given node to display in history
                        const originalProjectName: string = this.getFieldValueByRevision(WITConstants.CoreField.TeamProject, revision);
                        if (originalProjectName) {
                            try {
                                const originalProject = this.store.getProject(originalProjectName);
                                if (originalProject.nodesCacheManager.isNodesCacheAvailable()) {
                                    // Nodes call should be already initiated by the beginGetWorkItemTypes call
                                    // However, if it has not yet returned, ignore and proceed with the fallback logic
                                    node = originalProject.nodesCacheManager.findNodeById(baseFieldValue);
                                }
                            } catch (error) {
                                // Fall back to the original logic of displaying "removed node"
                            }
                        }
                    }

                    if (node) {
                        result.value = (<IReferencedNode>node).path || NodeHelpers.getPath(<INode>node, 1);
                        result.success = true;
                    } else {
                        // pioneer bug (1228743): deleted node, show it as (deleted area/iteration path) instead of falling back to the latest value (wrong)
                        // Future: we should send the delete data down to the client we can display the original deleted path.
                        result.value = fieldId === WITConstants.CoreField.AreaPath ? Resources.DeletedAreaPath : Resources.DeletedIterationPath;
                        result.success = true;
                    }
                }
                break;
            case WITConstants.CoreField.NodeName:
                if (baseFieldValue) {
                    const node = this.project.nodesCacheManager.getReferencedNode(<number>baseFieldValue);

                    if (node) {
                        result.value = node.name;
                        result.success = true;
                    }
                }
                break;
        }

        return result;
    }

    /**
     * Silently saves a work item, meaning that it turns off firing events for the duration of the save operation.
     */
    public beginSilentSave(): IPromise<void> {
        if (this.isReadOnly()) {
            return Q.reject(new Error(Resources.WorkItemIsReadOnlyError));
        }

        const eventsEnabled = this._eventsEnabled;
        this._eventsEnabled = false;

        const defer = Q.defer<void>();

        this.beginSave(
            () => {
                this._eventsEnabled = eventsEnabled;

                defer.resolve(null);
            },
            (error) => {
                this._eventsEnabled = eventsEnabled;

                defer.reject(error);
            }
        );

        return defer.promise;
    }

    public beginSave(callback: IResultCallback, errorCallback?: IErrorCallback, pathName?: string): void {
        if (this.isReadOnly()) {
            errorCallback(Resources.WorkItemIsReadOnlyError);
            return;
        }

        // Ending the create or edit workitem user action scenario
        // We gather up information like the link changes and field changes
        let addedLinks = 0, updatedLinks = 0, deletedLinks = 0;
        const linkUpdates = this.getLinkUpdates();
        if (linkUpdates) {
            addedLinks = linkUpdates.addedLinks ? linkUpdates.addedLinks.length : 0;
            updatedLinks = linkUpdates.updatedLinks ? linkUpdates.updatedLinks.length : 0;
            deletedLinks = linkUpdates.deletedLinks ? linkUpdates.deletedLinks.length : 0;
        }

        let numberOfTags: number | undefined;
        let numberOfTagsDelta: number | undefined;

        try {
            const updatedTagsValue = this.getFieldValue(WITConstants.DalFields.Tags);
            numberOfTags = this._splitTagNames(updatedTagsValue).length;

            const originalTagsValue = this.getFieldValue(WITConstants.DalFields.Tags, true);
            if (originalTagsValue !== updatedTagsValue) {
                numberOfTagsDelta = numberOfTags - this._splitTagNames(originalTagsValue).length;
            }
        } catch (e) {
            // Trace error and continue
            publishErrorToTelemetry(e);
        }

        PerfScenarioManager.endScenario(
            CIConstants.WITUserScenarioActions.WORKITEM_CREATEOREDIT, {
                "isNew": this.isNew(),
                "fieldsChangedCount": Object.keys(this.manuallySetFields).length,
                "addedLinksCount": addedLinks,
                "updatedLinksCount": updatedLinks,
                "deletedLinksCount": deletedLinks,
                "isMobile": WitFormModeUtility.isMobileForm,
                "project": this.project.name,
                "workItemType": "[NonEmail: " + this.workItemType.referenceName + "]",
                "workItemSessionId": this.sessionId,
                "workItemId": this.id
            });

        const workItemSavePerfScenario: Performance.IScenarioDescriptor = PerfScenarioManager.startScenario(
            CIConstants.WITPerformanceScenario.WORKITEM_SAVE,
            false);
        workItemSavePerfScenario.addData({
            "workItemType": "[NonEmail: " + this.workItemType.referenceName + "]",
            numberOfTags,
            numberOfTagsDelta,
        });

        if (pathName == null) {
            // set the pathname to current URL to know the unknown paths, if we are missing any.
            pathName = window.location.pathname;
        }

        // add pathname, the name of the flow which is triggering this action.
        // beginSave can be triggered from workitem form toolbar, or from card movement and save on the board.
        workItemSavePerfScenario.addData({ "PathName": pathName });

        return this.store.beginSaveWorkItemsBatch(
            [this],
            (successResult) => {
                if (workItemSavePerfScenario) {
                    workItemSavePerfScenario.addSplitTiming(
                        CIConstants.PerformanceEvents.WORKITEM_SAVE_COMPLETE);
                }

                if ($.isFunction(callback)) {
                    callback.call(this, successResult);
                }

                if (workItemSavePerfScenario) {
                    workItemSavePerfScenario.end();
                }
            },
            (error) => {
                if (workItemSavePerfScenario) {
                    workItemSavePerfScenario.abort();
                }

                if (error && error.name === Exceptions.WorkItemBulkSaveException) {
                    error = error.results[0].error;
                }
                handleError(error, errorCallback, this);
            });
    }

    /**
     * This function validates a set of field updates based on current workitemtype rules.
     * This is achieved by first getting all dependent fields for a given field in the current workitemtype, getting the field updates for
     * all these fields and send a validate request to WIT rule engine.
     * @param fieldValidationKey The key of the field that should be validated against the current workitem
     * @param callback
     * @param errorCallback
     */
    public beginValidate(fieldId: number, fieldValidationKey: FieldValidationKey, callback?: IResultCallback, errorCallback?: (error, referenceName?: string) => void): void {
        if (this.isDirty() && !this.isValidating(fieldValidationKey) && !this.isSaving()) {
            const workItemUpdate = this.getUpdateData();

            if (workItemUpdate && workItemUpdate.payload) {
                this._setValidatingStatus(true, fieldValidationKey);
                Diag.logTracePoint("VSS.WorkItemTracking.WorkItem.beginValidate.start");
                const field = this.getField(fieldId);
                this.workItemType.beginGetDependentFields(fieldId, async (dependentFields: FieldDefinition[]) => {
                    const fieldsToBeValidated: FieldDefinition[] = dependentFields.concat(field.fieldDefinition);
                    const originalFieldValues: IDictionaryStringTo<any> = {};
                    const newFieldValues: IDictionaryStringTo<any> = {};
                    $.each(fieldsToBeValidated, (i: number, f: FieldDefinition) => {
                        originalFieldValues[f.referenceName] = this.getFieldValue(f.id, true);
                        if (this.fieldUpdates.hasOwnProperty(f.id + "")) {
                            newFieldValues[f.referenceName] = this.getFieldValue(f.id);
                        }
                    });

                    if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.UseRuleEngineDataProvider)) {
                        try {
                            const result = await getService(WebPageDataService).getDataAsync<IRuleEnginePayload>(
                                "ms.vss-work-web.work-item-rule-engine-data-provider",
                                null,
                                {
                                    "fieldsToEvaluate": {
                                        "projectId": this.project.guid,
                                        "workItemType": this.workItemType.name, // Note - reference name should work but no incentive to change in fear of breaking on-prem
                                        "fields": [field.fieldDefinition.referenceName],
                                        "fieldValues": originalFieldValues,
                                        "fieldUpdates": newFieldValues
                                    } as IFieldsToEvaluate
                                });
                            if (result && result.exception) {
                                // rule engine validation failed.
                                if ($.isFunction(errorCallback)) {
                                    // If the identity is resolved successfully RuleValidationException will be thrown
                                    // If the identity is not resolved successfully WorkItemFieldInvalidException will be thrown
                                    // the property name for reference name of the field in the object model of exception are different
                                    const fieldName = result.exception.customProperties && result.exception.customProperties.FieldReferenceName || result.exception.customProperties.ReferenceName;

                                    errorCallback(result.exception, fieldName);
                                }
                            }
                            else {
                                // rule engine validation passed.
                                if (this.isValidating(fieldValidationKey) && !this.isSaving() && $.isFunction(callback)) {
                                    callback();
                                }
                            }
                        }
                        catch (error) {
                            // this is not validation failure but other reason like network error, no field name can be provided
                            if ($.isFunction(errorCallback)) {
                                errorCallback(error);
                            }
                        }
                        finally {
                            this._setValidatingStatus(false, fieldValidationKey);
                            Diag.logTracePoint("VSS.WorkItemTracking.WorkItem.beginValidate.end");
                        }
                    }
                    else {
                        this._httpClient.beginRunRuleEngine(this.workItemType.getRestUrl(), [field.fieldDefinition.referenceName], originalFieldValues, newFieldValues).then(
                            () => {
                                if (this.isValidating(fieldValidationKey) && !this.isSaving() && $.isFunction(callback)) {
                                    callback();
                                }
                                this._setValidatingStatus(false, fieldValidationKey);
                                Diag.logTracePoint("VSS.WorkItemTracking.WorkItem.beginValidate.end");
                            },
                            (error: any) => {
                                if (this.isValidating(fieldValidationKey) && !this.isSaving()) {
                                    if (error.status === 400) {
                                        if ($.isFunction(errorCallback)) {
                                            let fieldName = null;
                                            try {
                                                const validationError = JSON.parse(error.responseText);
                                                fieldName = validationError
                                                    && validationError.customProperties
                                                    // If the identity is resolved successfully RuleValidationException will be thrown
                                                    // If the identity is not resolved successfully WorkItemFieldInvalidException will be thrown
                                                    // the property name for reference name of the field in the object model of exception are different
                                                    && (validationError.customProperties.FieldReferenceName
                                                        || validationError.customProperties.ReferenceName);
                                            } catch (e) {

                                            }
                                            errorCallback(error, fieldName);
                                        }
                                    } else if ($.isFunction(callback)) {
                                        callback();
                                    }
                                }
                                this._setValidatingStatus(false, fieldValidationKey);
                                Diag.logTracePoint("VSS.WorkItemTracking.WorkItem.beginValidate.end");
                            });
                    }
                }, VSS.handleError);
            }
        }
    }

    public getFieldUpdates(): IFieldDataDictionary {
        const fields: IFieldDataDictionary = {};
        let value: any;
        let fieldIdStr: string;
        let fieldDef: FieldDefinition;
        let hasFieldUpdate: boolean;

        const updates = this.fieldUpdates;
        const fieldMap = this.workItemType.fieldMap;
        const fieldMapById = this.workItemType.fieldMapById;

        for (fieldIdStr in updates) {
            if (updates.hasOwnProperty(fieldIdStr)) {
                fieldDef = fieldMapById[fieldIdStr] || fieldMap[fieldIdStr];

                if (fieldDef && fieldDef.checkFlag(FieldFlags.Computed)) {
                    continue;
                }

                value = updates[fieldIdStr].value;
                if (typeof value === "undefined") {
                    value = null;
                }

                fields[fieldIdStr] = value;
                hasFieldUpdate = true;
            }
        }

        if (hasFieldUpdate) {
            return fields;
        } else {
            return null;
        }
    }

    public getTemplateFieldValues(): IFieldDataDictionary {
        const result: IFieldDataDictionary = {};
        const initialValues: IFieldUpdateDictionary = this.initialValues || <IFieldUpdateDictionary>{};

        $.each(this.manuallySetFields, (key, value) => {
            const fieldId = +key;
            const field = this.getField(fieldId);
            let add: boolean;

            const fieldIdStr = fieldId + "";

            if (fieldId === WITConstants.CoreField.AreaId || fieldId === WITConstants.CoreField.IterationId) {
                return;
            }

            const currentValue = field.getValue();
            if (currentValue instanceof ServerDefaultValue) {
                return;
            }

            if (initialValues.hasOwnProperty(fieldIdStr)) {
                add = !Field.compareValues(initialValues[fieldIdStr].value, value);
            } else {
                add = !Field.compareValues(field.getValue(true), value);
            }

            if (add) {
                result[field.fieldDefinition.referenceName] = currentValue;
            }
        });

        return result;
    }

    public getLinkUpdates(update?: IWorkItemUpdate): ILinkUpdates {
        let deletedLinks: ILinkInfo[] = [];
        let updatedLinks: ILinkInfo[] = [];
        let addedLinks: ILinkInfo[] = [];

        for (const link of this.allLinks) {
            if (link.isRemoved()) {
                continue;
            }

            if (link.deleted) {
                deletedLinks.push(link.linkData);
                if (update) {
                    update.deletedLinks.push(link);
                }
            } else if (link.isNew()) {
                addedLinks.push(link.linkData);
                if (update) {
                    update.addedLinks.push(link);
                }
            } else if (link.updated) {
                updatedLinks.push(link.linkData);
                if (update) {
                    update.updatedLinks.push(link);
                }
            }
        }

        let links: ILinkUpdates = null;
        if (deletedLinks.length > 0) {
            links = links || {};
            links.deletedLinks = deletedLinks;
        }

        if (updatedLinks.length > 0) {
            links = links || {};
            links.updatedLinks = updatedLinks;
        }

        if (addedLinks.length > 0) {
            links = links || {};
            links.addedLinks = addedLinks;
        }

        return links;
    }

    public _restoreLinkUpdates(changedLinks: ILinkUpdates) {
        // Restore added and removed links.
        if (changedLinks) {
            if (changedLinks.addedLinks) {
                const addedLinks = changedLinks.addedLinks;

                for (const linkData of addedLinks) {
                    const newLink = Link.createFromLinkData(this, linkData);
                    this.addLink(newLink);
                }
            }

            if (changedLinks.deletedLinks) {
                const deletedLinks = changedLinks.deletedLinks;
                for (const linkData of deletedLinks) {
                    const newLink = this.findLink(Link.createFromLinkData(this, linkData));

                    // If a matching link was found, delete it.
                    if (newLink) {
                        this.removeLinks([newLink]);
                    }
                }
            }
        }
    }

    public getUpdateData(): IWorkItemUpdate {
        let hasUpdateData = false;

        const update: IWorkItemUpdate = {
            uniqueId: this.getUniqueId(),
            id: this.id,
            tempId: this.tempId,
            rev: this.revision,
            projectId: this.project.guid,
            addedLinks: [],
            deletedLinks: [],
            updatedLinks: []
        };

        const payload: IWorkItemUpdatePackage = {
            id: this.id,
            rev: this.revision,
            projectId: this.project.guid,
            isDirty: this._fieldsDirty()
        };

        if (this.isNew()) {
            payload.tempId = this.tempId;
        }

        const fields = this.getFieldUpdates();
        if (fields) {
            payload.fields = fields;

            // setting team project field explicitly as getFieldUpdates excludes the team project field as it's computed field
            if (this.hasTeamProjectChanged()) {
                payload.fields[WITConstants.CoreFieldRefNames.TeamProject] = this.project.name;
            }
            hasUpdateData = true;
        }

        const links = this.getLinkUpdates(update);
        if (links) {
            payload.links = links;
            hasUpdateData = true;
        }

        if (hasUpdateData) {
            update.payload = payload;
        }

        return update;
    }

    public setRevisions(revisions: any) {
        this._revisions = revisions;
        this._revisionsPopulated = true;
    }

    public getRevisionsArePopulated(): boolean {
        return this._revisionsPopulated;
    }

    public _takeUpdateResult(updateResult: IWorkItemUpdateResult, update: IWorkItemUpdate, extensions?: IWorkItemTypeExtension[]) {
        PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMTRACKING_TAKEUPDATERESULT, true);
        const updatedFieldIds: number[] = [];
        const prevId = this.id;
        try {

            this._loadTime = updateResult.loadTime;

            this.ruleEngine = null;// reset rule engine so that it should pick extension rules
            this.extensions = extensions;
            this._originalExtensions = this.extensions;
            this._defineExtensionFields();

            // We should perform field operations if revision or watermark changes.
            const hasNewRevision = (updateResult.rev !== this.revision);
            const hasNewWatermark = (updateResult.fields && this._fieldData
                && updateResult.fields[WITConstants.CoreField.Watermark] !== this._fieldData[WITConstants.CoreField.Watermark]);

            if (hasNewRevision || hasNewWatermark) {
                this._setFieldValueById(WITConstants.CoreField.Id, updateResult.id);
                this.id = updateResult.id;

                // When the workitem ID is updated (i.e. when it is saved) make sure this is added to the cache
                if (prevId === 0) {
                    this.updateCachedIdOnSave();
                }

                this._setFieldValueById(WITConstants.CoreField.Rev, updateResult.rev);
                this.revision = updateResult.rev;

                let fieldIdStr: string;
                const fieldsFromUpdateResult = updateResult.fields;

                // first we run over fields from update result and add those into our updatedFieldIDs
                // updatedFieldIds is our grouping of fields we know have changed from this save result, either by some other save operation that happened concurrently
                // or this save result which has some rules that run on the server like serverDefaultRules
                if (fieldsFromUpdateResult) {
                    for (fieldIdStr in fieldsFromUpdateResult) {
                        if (fieldsFromUpdateResult.hasOwnProperty(fieldIdStr)) {

                            this._setFieldValueById(+fieldIdStr, fieldsFromUpdateResult[fieldIdStr]);
                            updatedFieldIds.push(+fieldIdStr);
                        }
                    }
                }

                // then we add also the fields that we changed, of which the update result may include some of these? 
                if (dontNotifyAllFieldsOnSave()) {
                    const fieldsChangedByUpdate = update.payload.fields;
                    if (fieldsChangedByUpdate) {
                        for (fieldIdStr in fieldsChangedByUpdate) {
                            // don't want to re-add fields
                            if (fieldsChangedByUpdate.hasOwnProperty(fieldIdStr) && (fieldsFromUpdateResult ? !fieldsFromUpdateResult.hasOwnProperty(fieldIdStr) : true)) {

                                updatedFieldIds.push(+fieldIdStr);
                            }
                        }
                    }
                }

                const fieldUpdates = this.fieldUpdates;
                const fieldData = this._fieldData;
                let newRevision: IFieldDataDictionary;
                const changedByIdStr = "" + WITConstants.CoreField.ChangedBy;
                const historyIdStr = "" + WITConstants.CoreField.History;

                // Checking to see whether a new work item saved
                if (updateResult.rev === 1) {
                    // In new work item case, there shouldn't be any revision around
                    for (fieldIdStr in fieldUpdates) {
                        if (fieldUpdates.hasOwnProperty(fieldIdStr)) {
                            // [liangzhu] WARNING: line below would cause inconsistency between locally saved revisions and server returned revisions.
                            //            if a field did not exist and only introduced in the save, it will be 'undefined' instead of 'null' (If get from MVC)
                            //            any consumer of revisions object must distinguish the sutble difference between 'undefined'(same as null) and '!hasOwnProperty' (look at revision+1)
                            //            I'm not touching the line just to be safe rather introduce regression, but if we do refactor this is candidate to consider.
                            fieldData[fieldIdStr] = fieldUpdates[fieldIdStr].value;
                        }
                    }

                    if (fieldData[historyIdStr]) {
                        this._addDiscussionForRevision(fieldData[historyIdStr], fieldData);
                    }
                } else if (hasNewRevision) {
                    // Creating the new revision object
                    newRevision = {};

                    if (fieldData.hasOwnProperty(changedByIdStr)) {
                        newRevision[changedByIdStr] = fieldData[changedByIdStr];
                    }

                    for (fieldIdStr in fieldUpdates) {
                        if (fieldUpdates.hasOwnProperty(fieldIdStr)) {
                            // Updating the revision
                            newRevision[fieldIdStr] = fieldData[fieldIdStr];
                            // Updating the field data
                            fieldData[fieldIdStr] = fieldUpdates[fieldIdStr].value;
                        }
                    }

                    /*
                    Relevant Bugs (mseng): 79911, 72720, 86139
                    We are creating a "newRevision" to keep track of historical changes, by storing the old data before the save.

                    For Example:
                    We were at Rev 4 before saving and are now at Rev 5 after saving.
                      -  "newRevision" will contain Rev 4 data
                      -  "fieldData" will contain Rev 5 data
                      -  "fieldUpdates" will contain Rev 6 data (currently empty because we just saved)

                    Note: This all makes sense, but the issue arises from the fact that the work item is considered dirty because field updates
                    will have an empty string or null set as the history later because the history text box is cleared. This has been fixed in the
                    comparison by ignoring empty string or null in the history field. See commit linked to work item 72720 on mseng.
                    */

                    if (fieldData.hasOwnProperty(historyIdStr)) {
                        if (!newRevision.hasOwnProperty(historyIdStr)) {
                            /*
                            This is the case where the user updates something but not the history
                            The message needs to be moved to the "newRevision" since it is not associated with this change
                            This fixes the issue of having the wrong changedby associated with the history (in discussion tab)

                            Note on how the history is displayed:
                            The first history will be generated from whats in field data. Then the rest is generated from the array of revisions
                            from newest to oldest.
                            */
                            newRevision[historyIdStr] = fieldData[historyIdStr];
                            delete fieldData[historyIdStr];
                        }
                    }

                    if (this._revisionsPopulated) {
                        this._revisions.push(newRevision);
                    }

                    if (fieldData[historyIdStr]) {
                        this._addDiscussionForRevision(fieldData[historyIdStr], fieldData);
                    }
                } else {
                    // For revisionless updates, we update the field data only.
                    for (fieldIdStr in fieldUpdates) {
                        if (fieldUpdates.hasOwnProperty(fieldIdStr)) {
                            fieldData[fieldIdStr] = fieldUpdates[fieldIdStr].value;
                        }
                    }
                }

                this.fieldUpdates = {};
            }
        }
        finally {
            PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMTRACKING_TAKEUPDATERESULT, false);
        }

        let linkUpdateResult: { changedFields: number[], changedWorkItemLinks: any[] };
        PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMTRACKING_EVALUATELINKUPDATES, true);
        try {

            // then, we take a look to see if any links have changed from the update result and update (this code here just looks at links added/removed, it returns an array of fields related to links that have changed
            linkUpdateResult = this._takeLinkUpdateResult(updateResult, update);

            // then we reset history (not sure why TODO: look into this)
            this.resetHistory();

            // then we run the rules on the work item, handing it the two sets of fields we know have changed (this function evaluate here should really be consolidated into taking one paramater, but because this is experimental code right
            // now I am leaving as two separate ones. But we are just handing it the fields we know have changed
            this.evaluate(linkUpdateResult.changedFields, updatedFieldIds);

            // finally this last step resets manual field changes (not sure what this does either)
            this.resetManualFieldChanges();
        }
        finally {
            PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMTRACKING_EVALUATELINKUPDATES, false);
        }

        // Reset the original workitem type on saving successfully
        PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMTRACKING_RESETAFTERSAVE, true);
        try {

            const typeChanged = this.hasWorkItemTypeChanged();
            const projectChanged = this.hasTeamProjectChanged();
            this._originalWorkItemType = this.workItemType;

            this.fireWorkItemSaved(<IWorkItemChangedArgs>({ changedWorkItemLinks: linkUpdateResult.changedWorkItemLinks, firstSave: prevId !== this.id, typeChanged: typeChanged, projectChanged: projectChanged }));
        }
        finally {
            PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMTRACKING_RESETAFTERSAVE, false);
        }
    }

    private _takeLinkUpdateResult(updateResult: IWorkItemUpdateResult, update: IWorkItemUpdate): { changedFields: number[]; changedWorkItemLinks: any[] } {
        const allLinks = this.allLinks;
        const changedFieldMap: IDictionaryStringTo<boolean> = {};
        const changedWorkItemLinks: any[] = [];

        const fixLinkTargetAndType: (linkUpdateResult: ILinkUpdateResult) => { targetId: number; linkType: number; remoteHostId: string } = (linkUpdateResult: ILinkUpdateResult) => {
            if (linkUpdateResult.SourceID === this.id) {
                return {
                    targetId: linkUpdateResult.TargetID,
                    linkType: linkUpdateResult.LinkType,
                    remoteHostId: linkUpdateResult.RemoteHostId
                };
            } else {
                return {
                    targetId: linkUpdateResult.SourceID,
                    linkType: this.store.findLinkTypeEnd(linkUpdateResult.LinkType).oppositeEnd.id,
                    remoteHostId: linkUpdateResult.RemoteHostId
                };
            }
        };

        const findWorkItemLink = (targetId: number, linkTypeId: number, remoteHostId: string) => {
            let foundLink: WorkItemLink = null;

            $.each(allLinks, (j: number, link: Link) => {

                if ((link instanceof WorkItemLink) && !link.isRemoved()) {
                    const wlink = <WorkItemLink>link;
                    if (wlink.getTargetId() === targetId && (!link.remoteHostId || link.remoteHostId === remoteHostId)) {
                        if (wlink.getLinkType() === linkTypeId) {
                            foundLink = wlink;
                            return false;
                        }
                    }
                }
            });

            return foundLink;
        };

        // set removed date for all non work itemlinks
        $.each(update.deletedLinks, (i: number, link: Link) => {
            if (!(link instanceof WorkItemLink)) {
                changedFieldMap["" + link.getFieldId()] = true;
                link.linkData.RemovedDate = <Date>this._getFieldValueById(WITConstants.DalFields.LastChangedDateId);
            }
        });

        $.each(updateResult.deletedLinks, (i: number, linkUpdateResult: ILinkUpdateResult) => {
            // check if its a work item link
            if (!linkUpdateResult.ExtID) {
                const fixedLinkTargetAndType = fixLinkTargetAndType(linkUpdateResult);
                const linkToDelete = findWorkItemLink(fixedLinkTargetAndType.targetId, fixedLinkTargetAndType.linkType, fixedLinkTargetAndType.remoteHostId);

                if (linkToDelete) {
                    changedFieldMap["" + linkToDelete.getFieldId()] = true;
                    linkToDelete.linkData["Revised Date"] = linkUpdateResult.ChangedDate;
                    linkToDelete.linkData["Revised By"] = linkUpdateResult.ChangedBy;

                    // Keeping track of removed work item links
                    changedWorkItemLinks.push({ command: "remove", sourceId: this.id, targetId: linkToDelete.getTargetId(), linkData: linkToDelete.linkData });
                }
            }
        });

        const addedNonWorkItemLinks: IDictionaryStringTo<Link> = {};

        $.each(update.addedLinks, (i: number, link: Link) => {
            if (!(link instanceof WorkItemLink)) {
                addedNonWorkItemLinks[link.linkData.FilePath] = link;
            }
        });

        $.each(updateResult.addedLinks, (i: number, linkUpdateResult: ILinkUpdateResult) => {
            let link: Link;
            if (linkUpdateResult.ExtID) {
                link = addedNonWorkItemLinks[linkUpdateResult.FilePath];
                if (link) {
                    changedFieldMap["" + link.getFieldId()] = true;

                    link.linkData.ExtID = linkUpdateResult.ExtID;
                    link.linkData.AddedDate = <Date>this._getFieldValueById(WITConstants.DalFields.LastChangedDateId);
                }
            } else {
                const fixedLinkTargetAndType = fixLinkTargetAndType(linkUpdateResult);
                let linkToBeAdded = findWorkItemLink(fixedLinkTargetAndType.targetId, fixedLinkTargetAndType.linkType, fixedLinkTargetAndType.remoteHostId);

                if (!linkToBeAdded) {
                    linkToBeAdded = WorkItemLink.create(this, fixedLinkTargetAndType.linkType, fixedLinkTargetAndType.targetId, null);
                    allLinks.push(linkToBeAdded);
                }

                changedFieldMap["" + linkToBeAdded.getFieldId()] = true;
                linkToBeAdded.linkData["Changed Date"] = linkUpdateResult.ChangedDate;
                linkToBeAdded.linkData["Changed By"] = linkUpdateResult.ChangedBy;

                // Keeping track of added work item links
                changedWorkItemLinks.push({ command: "add", sourceId: this.id, targetId: linkToBeAdded.getTargetId(), linkData: linkToBeAdded.linkData });
            }
        });

        this.resetLinks();

        const changedFieldIds: number[] = [];
        for (const fieldId in changedFieldMap) {
            if (changedFieldMap.hasOwnProperty(fieldId)) {
                changedFieldIds.push(+fieldId);
            }
        }

        return { changedFields: changedFieldIds, changedWorkItemLinks: changedWorkItemLinks };
    }

    private _getRuleEngine(): RuleEngine {
        if (!this.ruleEngine) {
            const fieldRules: IFieldRule[] = [];

            $.each(this.workItemType.fields, (i: number, fieldDef: FieldDefinition) => {
                if (fieldDef.rules) {
                    fieldRules.push({
                        fieldId: fieldDef.id,
                        rules: fieldDef.rules
                    });
                }
            });

            if (this.extensions) {
                $.each(this.extensions, (i: number, extension: IWorkItemTypeExtension) => {
                    if (extension.fieldRules) {
                        $.each(extension.fieldRules, (fieldId: number, rules: FieldRuleType[]) => {
                            fieldRules.push({
                                fieldId: fieldId,
                                rules: rules
                            });
                        });
                    }
                });
            }

            this.ruleEngine = new RuleEngine(this, fieldRules);
        }

        return this.ruleEngine;
    }

    private _evaluateSilent() {
        const eventsEnabled = this._eventsEnabled;
        this._eventsEnabled = false;

        try {
            this.evaluate();
        }
        finally {
            this._eventsEnabled = eventsEnabled;
        }
    }

    /**
     * This code takes the fieldIds that have changed, and builds an fieldIdMap of fields that need to have their rules run. If a field has been changed, either by local save or save that comes back from the sever, we need to run the
     * rules on it, because there could be UI rules like readonly that needs to be evaluated to properly update the control.
     * WorkItem.Evaluate takes two sets of field ids, alreadyChangedFields and updatedFieldIds. As far as I can tell, these are really just the same thing, fields that have changed that we need to notify has changed
     * so with feature flag on we just concat them below as you can see.
     * 
     * @param alreadyChangedFields
     * @param updatedFieldIds
     */
    public evaluate(alreadyChangedFields?: number[], updatedFieldIds?: number[]) {
        const fieldIdsToEval: number[] = [];
        const fieldIdMap: IDictionaryStringTo<boolean> = {};

        $.each(this.workItemType.getTriggerList(), (i: number, fieldId: number) => {
            const fieldIdStr = fieldId + "";
            if (!fieldIdMap.hasOwnProperty(fieldIdStr)) {
                fieldIdsToEval.push(fieldId);
                fieldIdMap[fieldIdStr] = true;
            }
        });

        if (updatedFieldIds) {
            $.each(updatedFieldIds, (i: number, fieldId: number) => {
                const fieldIdStr = fieldId + "";
                if (!fieldIdMap.hasOwnProperty(fieldIdStr)) {
                    fieldIdsToEval.push(fieldId);
                    fieldIdMap[fieldId] = true;
                }
            });

            const historyIdStr = WITConstants.DalFields.HistoryId + "";
            if (!fieldIdMap.hasOwnProperty(historyIdStr)) {
                // we need to trigger the history change handlers (particularly for the History tab)
                fieldIdsToEval.push(WITConstants.DalFields.HistoryId);
                fieldIdMap[historyIdStr] = true;
            }
        } else {
            $.each(this.fields, (i: number, field: Field) => {
                const fieldId = field.fieldDefinition.id;
                const fieldIdStr = fieldId + "";
                if (!fieldIdMap.hasOwnProperty(fieldIdStr)) {
                    fieldIdsToEval.push(fieldId);
                    fieldIdMap[fieldIdStr] = true;
                }
            });
        }

        // evaluateFields here actually takes the fieldIdsToEval, which is all fields we need to run rules on, as well as set of alreadyChangedFields, which we know we need to notify the control even if rules don't change them 
        // because the value themselves has changed (there can be multiple controls for the same fieldID on the form)
        this.evaluateFields(fieldIdsToEval, dontNotifyAllFieldsOnSave() ? Utils_Array.union((alreadyChangedFields || []), updatedFieldIds) : alreadyChangedFields);
    }

    public evaluateField(fieldId: number, valueLocked?: boolean, prevValue?: any): number[] {
        return this._getRuleEngine().evaluateField(fieldId, valueLocked, prevValue);
    }

    /**
     * This function is really the one responsible for notifying about which fields have really changed. So what it does is build a changedFieldMap by first marking the fields that we know have changed as changed
     * then by running the rules on the fields we need to eval. The evaluateFields from the rule engine returns all fields that have been changed by rules, which we then add to our changedFieldsMap. Then we notify those fields
     * that they have changed
     * @param fieldIdsToEval
     * @param alreadyChangedFields
     */
    public evaluateFields(fieldIdsToEval: number[], alreadyChangedFields?: number[]) {
        const changedFieldsMap: IDictionaryStringTo<boolean> = {};

        if (alreadyChangedFields) {
            $.each(alreadyChangedFields, (i: number, fref: string) => {
                changedFieldsMap[fref + ""] = true;
            });
        }

        const changedFieldsByRules = this._getRuleEngine().evaluateFields(fieldIdsToEval);

        if (changedFieldsByRules) {
            $.each(changedFieldsByRules, (i: number, fref: number) => {
                changedFieldsMap[fref + ""] = true;
            });
        }

        this.fireFieldChange(TFS_Core_Utils.keys(changedFieldsMap));
    }

    public resetLinks(removeDeletedNewlinks?: boolean) {
        let link: Link;
        this._links = null;

        if (removeDeletedNewlinks) {
            const allLinks = this.allLinks;

            for (let i = 0, l = allLinks.length; i < l; i++) {
                link = allLinks[i];

                // if a new link is deleted then delete it from our list too
                if (link.deleted && link.isNew()) {
                    allLinks.splice(i--, 1);
                    l--;
                }
            }
        }
    }

    public getLinks(): Link[] {
        let links: Link[];

        if (!this._links) {
            this._links = links = [];
            const allLinks = this.allLinks;

            for (const link of allLinks) {
                if (!link.deleted && !link.isRemoved()) {
                    links.push(link);
                }
            }
        }

        return this._links;
    }

    /**
     * Finds a link matching the link provided
     * @param link Link to find
     * @return The link if it was found or undefined when not found
     */
    public findLink(link: Link): Link {
        Diag.Debug.assertParamIsObject(link, "link");

        const allLinks = this.allLinks;

        for (const currLink of allLinks) {
            if (currLink.equals(link)) {
                return currLink;
            }
        }

        return undefined;
    }

    public addLink(link: Link) {
        this.addLinks([link]);
    }

    /**
     * Adds specified links to work item and fires change event only once
     * @param links Links to add
     */
    public addLinks(links: Link[]) {
        if (this.isReadOnly()) {
            return;
        }

        const fieldIdMap: IDictionaryNumberTo<number> = {};

        for (const currLink of links) {
            let linkAlreadyExistsAsDeleted: boolean = false;
            $.each(this.allLinks, (j: number, link: Link) => {
                // If there is a duplicate link which was removed without saving the workitem,
                // then instead of adding a new link, we just mark the existing one as not deleted
                if (!link.isRemoved() && link.deleted && currLink.isDuplicate(link)) {
                    if (!Utils_String.equals(link.getComment(), currLink.getComment(), false)) {
                        link.setComment(currLink.getComment());
                    }

                    linkAlreadyExistsAsDeleted = true;
                    link.deleted = false;
                    return false;
                }
            });

            const fieldId = currLink.getFieldId();
            if (!linkAlreadyExistsAsDeleted) {
                fieldIdMap[fieldId] = (fieldIdMap[fieldId] || 0) + 1;
                this.allLinks.push(currLink);
            } else {
                fieldIdMap[fieldId] = 0;
            }
        }

        if (links.length) {
            this.resetLinks();

            const fieldIds: number[] = [];

            let linkCountFieldId: number;
            for (const fieldIdStr in fieldIdMap) {
                if (fieldIdMap.hasOwnProperty(fieldIdStr)) {
                    const fieldId = +fieldIdStr;
                    fieldIds.push(fieldId);
                    linkCountFieldId = Link.getCountFieldId(fieldId);
                    this.evaluateField(linkCountFieldId, true, this.getFieldValue(linkCountFieldId) - fieldIdMap[fieldId]);
                }
            }

            this.evaluateFields(fieldIds, fieldIds);
        }
    }

    /**
     * Removes specified links from work item and fires change event only once
     * @param links Links to remove
     */
    public removeLinks(links: Link[]) {
        if (this.isReadOnly()) {
            return;
        }

        let removedCount = 0;
        const fieldIdMap: IDictionaryNumberTo<number> = {};

        let fieldId: number;
        for (const link of links) {
            // Skipping locked links
            if (!link.getIsLocked()) {
                fieldId = link.getFieldId();
                link.remove({ preventEvent: true });
                fieldIdMap[link.getFieldId()] = (fieldIdMap[fieldId] || 0) + 1;
                removedCount++;
            }
        }

        if (removedCount) {
            this.resetLinks(true);

            const fieldIds: number[] = [];

            let linkCountFieldId: number;
            for (const fieldIdStr in fieldIdMap) {
                if (fieldIdMap.hasOwnProperty(fieldIdStr)) {
                    fieldId = +fieldIdStr;
                    fieldIds.push(+fieldIdStr);
                    linkCountFieldId = Link.getCountFieldId(fieldId);
                    this.evaluateField(linkCountFieldId, true, this.getFieldValue(linkCountFieldId) + fieldIdMap[fieldId]);
                }
            }
            this.evaluateFields(fieldIds, fieldIds);
        }
    }

    public resetHistory() {
        Events_Services.getService().fire(Actions.RESET_HISTORY, this, null);
    }

    public getLoadTime(): Date {
        return this._loadTime;
    }

    /**
     * Gets the most recent date/time when a link was added/removed externally
     */
    public getLinkUpdatedExternallyDate(): Date {
        return this._linkUpdatedExternallyDate;
    }

    /**
     * Handles the case where a link was added/removed in the links collection via a link to this work item being
     * added/removed (another work item which is also loaded has added a link which references this work item which
     * causes this work item's links collection to be updated).
     */
    public linksUpdatedExternally() {
        this._linkUpdatedExternallyDate = new Date();
        this.resetHistory();
    }

    private _addDiscussionForRevision(historyText: string, revision: IFieldDataDictionary) {
        // Update the comment count in the field data on saving a comment successfully
        const commentCountIdStr = "" + WITConstants.CoreField.CommentCount;
        this._fieldData[commentCountIdStr] = this._getCommentCount();
        Events_Services.getService().fire(Actions.DISCUSSION_ADDED, this, { historyText: historyText, revision: revision });
    }

    private _resetDiscussion() {
        Events_Services.getService().fire(Actions.RESET_DISCUSSION, this, null);
    }

    /**
     * Reset the given workitem extension and rules
     * @param extensionId Id of the extension to reset
     * @param successCallback
     * @param errorCallback
     */
    public beginResetExtension(extensionId: string, successCallback?: (updatedExtension: IWorkItemTypeExtension) => void, errorCallback?: IErrorCallback) {
        this.store.beginGetWorkItemTypeExtension(extensionId,
            (updatedExtension: IWorkItemTypeExtension) => {
                for (let i = 0, l = this.extensions.length; i < l; i++) {
                    if (Utils_String.equals(this.extensions[i].id, updatedExtension.id)) {
                        this.extensions[i] = updatedExtension;
                        this.ruleEngine = null; // Reset the ruleEngine so that the rules get updated
                        break;
                    }
                }
                this.evaluate(); // For title rename scenario - column/lane WEF field was updated before new extensions in place and will have errors in validation
                if ($.isFunction(successCallback)) {
                    successCallback(updatedExtension);
                }
            },
            errorCallback);
    }

    /**
     * Resets the work item to a non-dirty state, firing events to indicate that
     * fields have changed and the work item has been reset.
     */
    public reset() {

        this.resetContributionErrorStatuses();
        this.resetChanges(false);
        this.relatedData = {};

        this._isReset = true;
        this.fireFieldChange([WITConstants.DalFields.RelatedLinks, WITConstants.DalFields.BISURI, WITConstants.DalFields.LinkedFiles, WITConstants.DalFields.AttachedFiles, WITConstants.DalFields.Tags]);

        // Firing reset event to notify subscribers
        this.fireWorkItemReset();
    }

    /**
     * Resets the field and link changes on a work item to a non-dirty state.  Optionally fires field changed
     * events when fields are changed.
     * @param silent if 'true' will not fire any events to clients.
     */
    public resetChanges(silent: boolean) {
        let link: Link;

        // Resetting links by removing newly added links
        this._links = null;
        const allLinks = this.allLinks;

        for (let i = 0, l = allLinks.length; i < l; i++) {
            link = allLinks[i];
            // If link is new, removing it
            if (link.isNew()) {
                allLinks.splice(i--, 1);
                l--;
            } else {
                link.deleted = false;

                if (link.linkData.CommentChanged) {
                    link.linkData.Comment = link.comment;
                    link.linkData.CommentChanged = false;
                }

                if (link.linkData.LockChanged) {
                    link.linkData.Lock = link.isLocked;
                    link.linkData.LockChanged = false;
                }

                link.setState();
            }
        }

        this.fieldUpdates = {};

        if (silent) {
            this._evaluateSilent();
        } else {
            this.evaluate();
        }

        this.resetManualFieldChanges();
        this._resetWorkItemTypeChanges();
    }

    public updateWorkItemPayload(workItemPayload: IWorkItemData, callback: IResultCallback, errorCallback?: IErrorCallback): void {
        const successCallback = () => {
            // Load the work item data and reset the fields.
            this._load(workItemPayload, true);
            this.fireWorkItemRefresh();

            if ($.isFunction(callback)) {
                callback.call(this, this);
            }
        };

        const teamProject = workItemPayload.fields[WITConstants.CoreField.TeamProject];
        const workItemTypeName = workItemPayload.fields[WITConstants.CoreField.WorkItemType];
        // Evaluate if there was a change in the workitemtype and/or project
        // If yes, rebind the workitem form as per new fields
        // Otherwise, continue with loading the updatePayload into the workItem object
        this._evaluateWorkItemTypeChange(teamProject, workItemTypeName, successCallback, errorCallback);
    }

    public beginRefresh(callback: IResultCallback, errorCallback?: IErrorCallback) {
        if (this.isNew()) {
            // Reset if the work item is a new work item.
            try {
                this.reset();
                if ($.isFunction(callback)) {
                    callback.call(this, this);
                }
            } catch (error) {
                handleError(error, errorCallback, this);
            }
        } else {
            this._isReset = true;
            this.store.beginGetWorkItemData([this.id], (workItemPayload: IWorkItemData) => {
                this.updateWorkItemPayload(workItemPayload, callback, errorCallback);
            }, errorCallback);
        }
    }

    private _resetWorkItemTypeChanges() {
        if (this.hasWorkItemTypeChanged()) {

            // Telemetry Info
            const typeInfo: { [key: string]: any } = {
                "SourceType": this._originalWorkItemType.name,
                "DestinationType": this.workItemType.name,
            };
            if (this.workItemType.project !== this._originalWorkItemType.project) {
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                    CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                    CIConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_WIT_MOVE_REVERT, typeInfo));
            } else {
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                    CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                    CIConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_WIT_TYPE_CHANGE_REVERT, typeInfo));
            }

            this.changeWorkItemType(this._originalWorkItemType, this._originalExtensions);
            this._originalWorkItemType = this.workItemType;
            this._originalExtensions = this.extensions;
        }
    }

    private _evaluateWorkItemTypeChange(teamProject: string,
        workItemTypeName: string,
        successCallback: () => void,
        errorCallback?: IErrorCallback) {

        if (!Utils_String.equals(teamProject, this._originalWorkItemType.project.name, true)
            || !Utils_String.equals(workItemTypeName, this._originalWorkItemType.name, true)) {
            // If the team project or work item type name are different from the original
            // Retrieve the new project and the workItemType and then rebind the form
            this.store.beginGetProject(
                teamProject,
                (project: Project) => {
                    project.beginGetWorkItemType(
                        workItemTypeName,
                        (workItemType: WorkItemType) => {
                            this.changeWorkItemType(workItemType);
                            this._originalWorkItemType = workItemType;
                            successCallback();
                        },
                        errorCallback);
                },
                errorCallback);
        } else if (!Utils_String.equals(teamProject, this.workItemType.project.name, true)
            || !Utils_String.equals(workItemTypeName, this.workItemType.name, true)) {
            // the workitemtype has been changed on the client, but not saved.
            // reset the workitemtype to original.
            this._resetWorkItemTypeChanges();
            successCallback();
        } else {
            successCallback();
        }
    }

    private _copyField(workItem: WorkItem, fd: FieldDefinition, type?: WorkItemType) {
        // Checking to see whether the field is cloneable or not
        // Skipping also the title if the source work item is used as a template
        if (fd.isCloneable()) {

            // Trying to get the field within the current work item type
            const f = this.getField(fd.id);

            // If the field exists...
            if (f) {
                // getting its value and checking it's set or not
                const val = f.getValue();
                if (!Field.isEmpty(val)) {

                    // Ignoring paths out of the target project
                    if (fd.id === WITConstants.CoreField.AreaId || fd.id === WITConstants.CoreField.IterationId) {
                        if (typeof (val) !== "number" || this.project.id !== type.project.id) {
                            return;
                        }
                    }

                    // Setting the field value of the newly created work item
                    workItem.setFieldValue(fd.id, val);
                }
            }
        }
    }

    /**
     * Creates a new work item using the fields and links of this work item
     * @param type (Optional)  The work item type to be used for newly created work item. If no type is specified, the type of the current work item is used.
     * @param copyLinks (Optional, default = true) Specifies whether to copy the links or not.
     * @param copyHistory (Optional, default = true) Specifies whether to add "Copied from ..." string to the history or not.
     * @param copyTags (Optional, default = true) Specifies whether to copy the tags or not.
     * @param excludedFields (Optional) List of field ids which are not going to be copied.
     * @param createLinkToSource
     */
    public copy(type?: WorkItemType, copyLinks?: boolean, copyHistory?: boolean, copyTags?: boolean, excludedFields?: string[], createLinkToSource?: boolean): WorkItem {
        let i: number;
        let len: number;
        let fd: FieldDefinition;
        const newLinks: Link[] = [];
        let workItem: WorkItem;
        const excludedHash: IDictionaryStringTo<boolean> = {};

        // Ensuring parameters
        type = (type instanceof WorkItemType) ? type : this.workItemType;
        copyLinks = typeof (copyLinks) !== "boolean" ? true : copyLinks;
        copyHistory = typeof (copyHistory) !== "boolean" ? true : copyHistory;
        copyTags = typeof (copyTags) !== "boolean" ? true : copyTags;
        createLinkToSource = typeof (createLinkToSource) !== "boolean" ? true : createLinkToSource;

        // Populating excluded hash to make check easier
        $.each(excludedFields || [], function (ind, id) {
            excludedHash[id] = true;
        });

        // Creating the work item
        workItem = type.create();

        Events_Services.getService().fire(Actions.WORKITEM_COPIED, workItem);

        // Copying fields from trigger list
        for (const fieldId of type.triggerList) {
            const fieldIdStr = fieldId.toString();

            if (!excludedHash.hasOwnProperty(fieldIdStr)) {
                // Getting field definition
                fd = type.fieldMapById[fieldIdStr];

                this._copyField(workItem, fd, type);
                excludedHash[fieldIdStr] = true;
            }
        }

        // Copying the rest of the fields
        for (const fd of type.fields) {
            if (!excludedHash.hasOwnProperty(fd.id.toString())) {
                this._copyField(workItem, fd, type);
            }
        }

        if (copyHistory) {
            let historyText: string;
            if (!this.isNew()) {
                const linkStr = `<a href='x-mvwit:workitem/${this.id}'>${this.workItemType.name} ${this.id}</a>`;
                historyText = Utils_String.format(
                    copyLinks ? Resources.CreateCopyCopiedWithAllLinksFrom : Resources.CreateCopyCopiedFrom,
                    linkStr);
            } else {
                historyText = Resources.CreateCopyCopiedFromNewWorkItem;
            }

            // Adding history text
            workItem.setFieldValue(WITConstants.CoreField.History, historyText);
        }

        if (copyLinks) {
            // Copying links
            const links = this.getLinks();
            for (const link of links) {

                // Ignoring attachments
                if (link instanceof Attachment) {
                    continue;
                }

                // Creating the clone of the link
                const clone = link.clone(workItem);

                // Making this check because clone might return null
                if (clone) {
                    newLinks.push(clone);
                }
            }
        }

        // Creating a link to the original if the original is a saved item
        if (!this.isNew() && createLinkToSource) {
            // Spec currently calls for a related link. However, related links are directionless,
            // so its difficult to makeout without looking at created date, which item was the copied
            // item, and which item was the source
            newLinks.push(WorkItemLink.create(workItem, this.store.findLinkTypeEnd("System.LinkTypes.Related-Forward"), this.id, ""));
        }

        if (newLinks.length > 0) {
            workItem.addLinks(newLinks);
        }

        workItem.evaluate([WITConstants.DalFields.RelatedLinks, WITConstants.DalFields.AttachedFiles, WITConstants.DalFields.BISURI, WITConstants.DalFields.LinkedFiles]);

        return workItem;
    }

    public getTagNames(): string[] {
        return this._splitTagNames(this.getFieldValue(WITConstants.DalFields.Tags));
    }

    private _splitTagNames(tagsText: string): string[] {
        if (tagsText) {
            return $.trim(tagsText).split(/;\s*/);
        } else {
            return [];
        }
    }

    /**
     * Populate this work item with the payload data.
     * @param data
     * @param resetFields True to call reset on all fields before updating data.
     */
    public _load(data: IWorkItemData, resetFields: boolean) {  // should really be private
        let links: ILinkInfo[];
        let allLinks: Link[];

        data = data || <IWorkItemData>{};

        this._isReadOnly = data.isReadOnly || false;

        this._loadTime = data.loadTime || new Date();

        this._fieldData = data.fields || {};

        // Trim leading/trailing whitespace for longTextFields
        for (const id in this._fieldData) {
            if (this._fieldData.hasOwnProperty(id)) {
                const def = this.workItemType.getFieldDefinition(id);
                if (def) {
                    if (Field.isLongTextField(def.type)) {
                        const fldData = this._fieldData[id];
                        if (fldData) {
                            this._fieldData[id] = fldData.trim();
                        }
                    } else if (def.isIdentity) {
                        // if it's an identity field, we want to ensure the value
                        // is in the WorkItemIdentityHelper cache so that any calls
                        // to retrieve it do not need a round trip to the graph API.
                        const fldData = this._fieldData[id];
                        if (fldData) {
                            setResolvedByDescriptorIfWorkItemIdentityRef(fldData);
                        }
                    }
                }
            }
        }

        this._revisions = data.revisions || [];
        this.fieldUpdates = {};

        $.each(this._fieldData, (fieldRef: string) => {
            this._defineField(fieldRef);
        });

        if (resetFields) {
            $.each(this.fields, (i: number, field: Field) => {
                field._reset();
            });

            this.resetContributionErrorStatuses();
        }

        // Populating all the links here (including attachments, external links,
        // related links and work item links. Deleted links also exist
        //      files:              attachments, external links and hyperlinks (deleted files are included as well)
        //      relations:          work item links
        //      relationRevisions:  deleted work item links

        links = [];
        if (data.files) {
            Utils_Array.addRange(links, data.files);
        }

        if (data.relations) {
            Utils_Array.addRange(links, data.relations);
        }

        if (data.relationRevisions) {
            Utils_Array.addRange(links, data.relationRevisions);
        }

        this.allLinks = allLinks = [];
        this._links = null;
        allLinks.push(...links.map((link) => Link.createFromLinkData(this, link)));
        this.relatedData = {};

        this.referencedPersons = data.referencedPersons || {};
        this.project.nodesCacheManager.addReferencedNodes(data.referencedNodes);

        this.id = this._getFieldValueById(WITConstants.CoreField.Id) || 0;

        if (this.id === 0) {
            if (data.tempId) {
                this.tempId = data.tempId;
                WorkItem.reserveTempId(this.tempId);
            } else {
                this.tempId = WorkItem.getTempId();
            }
        }

        this.revision = this._getFieldValueById(WITConstants.CoreField.Rev) || 0;

        if (this.isNew()) {
            // If no data is provided, we are assuming this work item to be new
            const projectId = this.project.id;
            this._setFieldValueById(WITConstants.CoreField.AreaId, projectId, true);
            this._setFieldValueById(WITConstants.CoreField.IterationId, projectId, true);
            this._setFieldValueById(WITConstants.CoreField.WorkItemType, this.workItemType.name, true);

            // By default 'new' work items will have an empty revision collection which will be updated on 'Save'
            this._revisionsPopulated = true;
        } else {
            // If there are no revisions in the retrieved data then this work item was requested without revisions.
            this._revisionsPopulated =
                (data.revisions != undefined && data.revisions != null && data.revisions.length > 0) ||
                (data.relationRevisions != undefined && data.relationRevisions != null && data.relationRevisions.length > 0);
        }

        this.resetHistory();
        this._resetDiscussion();

        this.evaluate([WITConstants.DalFields.RelatedLinks, WITConstants.DalFields.AttachedFiles, WITConstants.DalFields.BISURI, WITConstants.DalFields.LinkedFiles]);

        if (this.isNew()) {
            // This is used to identify which fields are explicitly changed.
            // For a newly created work item, there is nothing in fieldData.
            // This causes every change to be added to fieldUpdates even though
            // field value is not changed actually.
            this.initialValues = <IFieldUpdateDictionary>$.extend({}, this.fieldUpdates);
        }

        this.resetManualFieldChanges();
    }

    /**
     * Check any field changed explicitly or not
     * @param onlyUserChanges
     */
    private _fieldsDirty(onlyUserChanges?: boolean): boolean {
        let fieldId: string;
        let updates: IFieldUpdateDictionary;

        if (onlyUserChanges) {
            if (this.manuallySetFields) {
                for (fieldId in this.manuallySetFields) {
                    if (this.manuallySetFields.hasOwnProperty(fieldId)) {
                        return true;
                    }
                }
            }
        } else if (this.isNew()) {
            return true;
        } else {
            updates = this.fieldUpdates;
            for (fieldId in updates) {
                if (updates.hasOwnProperty(fieldId)) {
                    if (!updates[fieldId].setByRule) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    private _setSavingStatus(saving: boolean, fieldChanges?: IWorkItemChangedArgs) {
        if (this._saving !== saving) {
            this._saving = saving;
            if (saving) {
                this.fireWorkItemSaving();
            } else {
                this.fireWorkItemSaveComplete(fieldChanges);
            }
        }
    }

    private _setValidatingStatus(validating: boolean, fieldValidationKey?: FieldValidationKey) {
        let fireEvent = false;
        if (fieldValidationKey) {
            if (this._fieldValidationMap[fieldValidationKey.toString()] !== validating) {
                this._fieldValidationMap[fieldValidationKey.toString()] = validating;
                fireEvent = true;
            }
        } else {
            for (const key in this._fieldValidationMap) {
                if (this._fieldValidationMap[key] !== validating) {
                    this._fieldValidationMap[key] = validating;
                    fireEvent = true;
                }
            }
        }

        if (!fireEvent) {
            return;
        }

        if (validating) {
            this.fireWorkItemValidating();
        } else {
            this.fireWorkItemValidationComplete();
        }
    }

    private _getLinkCount(type: any, original: boolean): number {
        let count = 0;
        const links = this.getLinks();

        $.each(links, function (i: number, link: Link) {
            if (original && link.isNew()) {
                return;
            }

            if (type) {
                if (link instanceof type) {
                    count++;
                }
            } else {
                count++;
            }
        });

        return count;
    }

    private _getCommentCount(original?: boolean): number {
        let commentCount = this._fieldData[WITConstants.CoreField.CommentCount] || 0;
        if (!original && this.fieldUpdates.hasOwnProperty(WITConstants.CoreField.History)) {
            commentCount += 1;
        }

        return commentCount;
    }

    public hasWorkItemTypeChanged(): boolean {
        return this._originalWorkItemType !== this.workItemType;
    }

    public hasTeamProjectChanged(): boolean {
        return this._originalWorkItemType.project !== this.project;
    }

}

export class Field {
    public static SqlIntMaxValue = 2147483648;

    public static isEmpty(value: any): boolean {
        return value === null || typeof value === "undefined" || (typeof value === "string" && $.trim(value).length === 0);
    }

    public static compareValues(value1: any, value2: any, caseInsensitive?: boolean, identityComparisonNeeded?: boolean): boolean {
        if (value1 instanceof ServerDefaultValue) {
            if ((value2 instanceof ServerDefaultValue) && value1.type === value2.type) {
                return Field.compareValues(value1.value, value2.value, caseInsensitive);
            } else {
                return false;
            }
        } else if (value2 instanceof ServerDefaultValue) {
            return false;
        }

        value1 = convertPotentialIdentityRefFromFieldValue(value1, false);
        value2 = convertPotentialIdentityRefFromFieldValue(value2, false);

        if (value1 === null || typeof value1 === "undefined") {
            value1 = "";
        }

        if (value2 === null || typeof value2 === "undefined") {
            value2 = "";
        }

        value1 = "" + value1;
        value2 = "" + value2;

        let match = false;
        if (caseInsensitive) {
            match = Utils_String.localeIgnoreCaseComparer(value1, value2) === 0;
        } else {
            match = Utils_String.localeComparer(value1, value2) === 0;
        }

        if (!match && identityComparisonNeeded) {
            /// This means if the identity strings don't match exactly we will investigate the combo string unique components and compare them
            /// We only need to do this when comparing field value to a stored identity value in the rule (like a when or copy rule)

            const idValue1 = IdentityHelper.parseUniquefiedIdentityName(value1);
            const idValue2 = IdentityHelper.parseUniquefiedIdentityName(value2);

            // Only if we have a unique name are these both identity values. If either is a non-identity value
            // then let the existing match result stand.
            if (idValue1 && idValue2 && idValue1.uniqueName && idValue2.uniqueName) {
                match = Utils_String.localeIgnoreCaseComparer(idValue1.uniqueName, idValue2.uniqueName) === 0;
            }
        }

        return match;
    }

    public static isMatch(pattern: string, value: string): boolean {
        if (!pattern) {
            return true;
        }

        pattern = pattern.replace(/[.*+?|()\[\]\^\${}\\]/g, "\\$&");
        pattern = pattern.replace(/n/gi, "\\d").replace(/a/gi, "[a-zA-Z]").replace(/x/gi, "[a-zA-Z0-9]"); // order here is important
        pattern = "^" + pattern + "$";

        return new RegExp(pattern, "i").test(value);
    }

    public static hashset(array: string[], caseInsensitive?: boolean): { [key: string]: string; } {
        const result: { [key: string]: string; } = {};

        if (caseInsensitive) {
            if ((<any>array).__hashSetCaseInsensitive) {
                return (<any>array).__hashSetCaseInsensitive;
            }

            for (const value of array) {
                result[value.toLocaleUpperCase()] = value;
            }

            (<any>array).__hashSetCaseInsensitive = result;
        } else {
            if ((<any>array).__hashSet) {
                return (<any>array).__hashSet;
            }

            for (const value of array) {
                result[value] = value;
            }

            (<any>array).__hashSet = result;
        }

        return result;
    }

    public static contains(array: string[], value: string, caseInsensitive?: boolean): boolean {
        if (!caseInsensitive) {
            return $.inArray(value, array) >= 0;
        } else {
            const hashtable = Field.hashset(array, true);
            return hashtable.hasOwnProperty(value.toLocaleUpperCase());
        }
    }

    public static normalize(array: string[], value: string): string {

        if (value) {
            const hashtable = Field.hashset(array, true);

            return hashtable[value.toLocaleUpperCase()] || value;
        }

        return value;
    }

    public static intersect(a: string[], b: string[], caseInsensitive?: boolean): string[] {
        let hashtable: IDictionaryStringTo<string>;
        let result: string[];

        if (!b) {
            return a;
        }

        if (b.length === 0) {
            return [];
        }

        if (a.length < b.length) {
            hashtable = Field.hashset(a, caseInsensitive);
        } else {
            hashtable = Field.hashset(b, caseInsensitive);
            b = a;
        }

        result = [];
        Utils_Array.copySortFlag(result, b);

        if (caseInsensitive) {
            for (const value of b) {
                if (hashtable.hasOwnProperty(value.toLocaleUpperCase())) {
                    result[result.length] = value;
                }
            }
        } else {
            for (const value of b) {
                if (hashtable.hasOwnProperty(value)) {
                    result[result.length] = value;
                }
            }
        }

        return result;
    }

    public static union(a: string[], b: string[], caseInsensitive?: boolean): string[] {
        const comparer = caseInsensitive ? Utils_String.localeIgnoreCaseComparer : Utils_String.localeComparer;

        if (!b || b.length === 0) {
            return a;
        }

        if (!a || a.length === 0) {
            return b;
        }

        Utils_Array.sortIfNotSorted(a, comparer);
        Utils_Array.sortIfNotSorted(b, comparer);

        const result: string[] = [];
        Utils_Array.flagSorted(result, comparer);

        let iA = 0;
        const lA = a.length;
        let iB = 0;
        const lB = b.length;
        let valueA: string;
        let valueB: string;
        let compareResult: number;

        while (iA < lA && iB < lB) {
            valueA = a[iA]; valueB = b[iB];
            compareResult = comparer(valueA, valueB);

            if (compareResult === 0) {
                result[result.length] = valueA;
                iA++; iB++;
            } else if (compareResult > 0) {
                result[result.length] = valueB;
                iB++;
            } else {
                result[result.length] = valueA;
                iA++;
            }
        }

        // copy remaining
        while (iA < lA) {
            result[result.length] = a[iA];
            iA++;
        }

        while (iB < lB) {
            result[result.length] = b[iB];
            iB++;
        }

        return result;
    }

    public static subtract(a: string[], b: string[], caseInsensitive?: boolean): string[] {
        let hashtable: IDictionaryStringTo<string>;
        let result: string[];

        if (!b || b.length === 0) {
            return a;
        }

        result = [];
        Utils_Array.copySortFlag(result, a);

        hashtable = Field.hashset(b, caseInsensitive);

        if (caseInsensitive) {
            for (const value of a) {
                if (!hashtable.hasOwnProperty(value.toLocaleUpperCase())) {
                    result[result.length] = value;
                }
            }
        } else {
            for (const value of a) {
                if (!hashtable.hasOwnProperty(value)) {
                    result[result.length] = value;
                }
            }
        }

        return result;
    }

    /**
     * Search for the given value in the expanded items list or in the global lists
     * @param store The workitem store to use for globals search
     * @param value The value to search for
     * @param expandedItems The list of expended items to search in
     * @param globals The list of global lists
     * @param caseInsensitive Perform case insensitive comparison if true
     */
    public static inList(store: WorkItemStore, value: string, expandedItems: string[], globals: string[], caseInsensitive?: boolean): boolean {
        Diag.Debug.assertParamIsObject(store, "store");
        Diag.Debug.assertParamIsBool(caseInsensitive, "caseInsensitive");

        let list: string[];

        if (expandedItems && Field.contains(expandedItems, value, caseInsensitive)) {
            return true;
        }

        if (globals) {
            for (const setId of globals) {
                list = store.getConstantSet(setId);

                if (!list) {
                    Diag.Debug.fail(Utils_String.format("Constant set {0} is not ready. Operation cannot continue.", setId));
                }

                if (Field.contains(list, value, caseInsensitive)) {
                    return true;
                }
            }
        }

        return false;
    }

    public static unionLists(store: WorkItemStore, expandedItems: string[], globals: string[]): string[] {
        let result: string[];
        let list: string[];

        if (globals) {

            if (expandedItems) {
                result = expandedItems.slice(0);
                Utils_Array.copySortFlag(result, expandedItems);
            } else {
                result = [];
                Utils_Array.flagSorted(result, Utils_String.localeIgnoreCaseComparer);
            }

            for (const setId of globals) {
                list = store.getConstantSet(setId);

                if (!list) {
                    Diag.Debug.fail(Utils_String.format("Constant set {0} is not ready. Operation cannot continue.", setId));
                }

                result = Field.union(result, list, true);
            }

            return result;
        } else {
            return expandedItems;
        }
    }

    public static isLongTextField(fieldType: WITConstants.FieldType): boolean {
        switch (fieldType) {
            case WITConstants.FieldType.PlainText:
            case WITConstants.FieldType.Html:
            case WITConstants.FieldType.History:
                return true;
            default:
                return false;
        }
    }

    public static isNumericField(fieldType: WITConstants.FieldType): boolean {
        switch (fieldType) {
            case WITConstants.FieldType.Integer:
            case WITConstants.FieldType.Double:
                return true;
            default:
                return false;
        }
    }

    public static isStringField(fieldType: WITConstants.FieldType): boolean {
        switch (fieldType) {
            case WITConstants.FieldType.PlainText:
            case WITConstants.FieldType.Html:
            case WITConstants.FieldType.History:
            case WITConstants.FieldType.String:
                return true;
            default:
                return false;
        }
    }

    public static convertValueToDisplayString(value: ServerDefaultValue): string {
        if (value !== null &&
            typeof value !== "undefined" &&
            value instanceof ServerDefaultValue) {
            value = value.value;
        }

        return Utils_Core.convertValueToDisplayString(value);
    }

    public static isValidStringFieldValue(value: string, isLongText: boolean): boolean {
        // Check for control chars (except \t\n\r), if the value is not long text
        if (!isLongText && Utils_String.containsControlChars(value)) {
            return false;
        }

        // Check for high and low surrogate chars.
        return !Utils_String.containsMismatchedSurrogateChars(value);
    }

    /**
     * Normalize a work item string value to replace invalid chars with space
     * @param value String value
     * @param isLongText If isLongText, no need to replace control chars
     */
    public static normalizeStringValue(value: string, isLongText?: boolean): string {
        Diag.Debug.assertParamIsString(value, "value");

        if (!isLongText) {
            value = value.replace(replacementControlChars, " ");
        }

        return value.replace(replacementSurrogateChars, " ");
    }

    /**
     * Normalize a html string value remove invalid tags and attributes.
     * @param value Htmltext
     * @param additionalValidAttributes attributes to keep from normalizing
     * @param additionalInvalidStyles styles to remove from normalizing
     */
    public static normalizeHtmlValue(value: string, additionalValidAttributes?: string[], additionalInvalidStyles?: string[]): string {
        Diag.Debug.assertParamIsString(value, "value");

        return Utils_Html.HtmlNormalizer.normalizeStripAttributes(value, ["class"], additionalValidAttributes, additionalInvalidStyles);
    }

    public static convertValueToInternal(store: WorkItemStore, value: any, fieldType: WITConstants.FieldType): IValueStatus {
        let status = 0;
        let convertedValue: any;
        let year: number;
        let match: RegExpExecArray;

        if (value === null || typeof value === "undefined") {
            convertedValue = null;
        } else if (typeof value === "string" && value.length === 0) {
            convertedValue = null;
        } else if (value instanceof ServerDefaultValue) {
            convertedValue = value;
        } else {
            try {
                switch (fieldType) {
                    case WITConstants.FieldType.Boolean:
                        if (typeof value === "boolean") {
                            convertedValue = value ? 1 : 0;
                        } else if (typeof value === "number") {
                            convertedValue = (value !== 0.0) ? 1 : 0;
                        } else if (typeof value === "string") {
                            if (/^\d+$/.test(value)) {
                                convertedValue = (Utils_Number.parseLocale(value) !== 0.0) ? 1 : 0;
                            } else {
                                convertedValue = TFS_Core_Utils.BoolUtils.parse(value) ? 1 : 0;
                            }
                        } else {
                            throw new Error("Invalid Boolean field value.");
                        }
                        break;
                    case WITConstants.FieldType.Integer:
                        if (typeof value === "number") {
                            convertedValue = Math.round(value);
                        } else if (typeof value === "boolean") {
                            convertedValue = value ? 0 : 1;
                        } else if (typeof value === "string") {
                            if (/^[\-+]?\d+$/.test(value)) {
                                convertedValue = Utils_Number.parseLocale(value);
                            }
                        }

                        // Checking if a number is valid and finite number and less 2^31 -1 and greater than -2^31 which is sql max limit for int
                        if ((typeof convertedValue === "undefined")
                            || isNaN(convertedValue)
                            || !isFinite(convertedValue)
                            || (convertedValue > Field.SqlIntMaxValue - 1)
                            || (convertedValue < -Field.SqlIntMaxValue)) {
                            throw new Error(`Invalid Integer field value,  ${value}`);
                        }

                        break;

                    case WITConstants.FieldType.Double:
                        if (typeof value === "number") {
                            convertedValue = value;
                        } else if (typeof value === "boolean") {
                            convertedValue = value ? 0.0 : 1.0;
                        } else if (typeof value === "string") {
                            convertedValue = Utils_Number.parseLocale(value);
                        }

                        if ((typeof convertedValue === "undefined") || isNaN(convertedValue) || !isFinite(convertedValue)) {
                            throw new Error(`Invalid Double field value,  ${value}`);
                        }

                        break;
                    case WITConstants.FieldType.DateTime:
                        if (value instanceof Date) {
                            convertedValue = value;
                        } else if (typeof value === "string") {
                            convertedValue = Utils_Date.parseDateString(value);
                        } else {
                            convertedValue = null;
                        }

                        if (convertedValue === null || isNaN(convertedValue)) {
                            throw new Error("Invalid DateTime field value.");
                        }

                        year = convertedValue.getFullYear();

                        if (year < 1753 || year > 9999) {
                            status = FieldStatusFlags.InvalidDate;
                        }

                        break;
                    case WITConstants.FieldType.Guid:
                        if (typeof value === "string") {
                            match = guidRegex.exec(value);
                            if (!match) {
                                throw new Error("Invalid GUID field value.");
                            }

                            convertedValue = match[1] + "-" + match[2] + "-" + match[3] + "-" + match[4] + "-" + match[5];
                        } else {
                            throw new Error("Invalid GUID field value.");
                        }
                        break;
                    default:
                        if (typeof value === "string") {
                            convertedValue = value;
                        } else if (typeof value === "number") {
                            convertedValue = Utils_Number.localeFormat(value, "N");
                        } else if (typeof value === "boolean") {
                            convertedValue = value ? "True" : "False";
                        } else if (value instanceof Date) {
                            convertedValue = Utils_Date.localeFormat(value, "F");
                        } else {
                            throw new Error("Invalid String field type.");
                        }

                        if (typeof convertedValue === "undefined") {
                            convertedValue = null;
                        }

                        if (convertedValue !== null) {
                            if (fieldType == WITConstants.FieldType.PlainText || fieldType == WITConstants.FieldType.Html) {
                                convertedValue = $.trim(convertedValue);
                            }

                            if (convertedValue.length === 0) {
                                convertedValue = null;
                            }
                        }

                        if (convertedValue !== null) {
                            if (fieldType === WITConstants.FieldType.String) {
                                if (convertedValue.length > WorkItem.MAX_TITLE_LENGTH) {
                                    status = FieldStatusFlags.InvalidTooLong;
                                }
                            }

                            if (!Field.isValidStringFieldValue(convertedValue, Field.isLongTextField(fieldType))) {
                                status = FieldStatusFlags.InvalidCharacters;
                            }
                        }
                        break;
                }
            } catch (e) {
                return {
                    value: value,
                    error: e,
                    status: FieldStatusFlags.InvalidType
                };
            }
        }

        return {
            value: convertedValue,
            status: status
        };
    }

    public static convertValueToExternal(store: WorkItemStore, value: any, fieldType: WITConstants.FieldType): any {
        if (typeof value === "undefined") {
            value = null;
        }

        if (value === null && Field.isStringField(fieldType)) {
            value = "";
        } else if (fieldType === WITConstants.FieldType.Boolean) {
            value = value ? true : false;
        }

        return value;
    }

    public static getFieldErrorText(fieldName: string, status: FieldStatus, value?: any, error?: string): string {

        switch (status) {
            case FieldStatus.InvalidEmpty:
                return Utils_String.format(Resources.FieldStatusInvalidEmptyError, fieldName);
            case FieldStatus.InvalidNotEmpty:
                return Utils_String.format(Resources.FieldStatusInvalidNotEmptyError, fieldName);
            case FieldStatus.InvalidFormat:
                return Utils_String.format(Resources.FieldStatusInvalidFormatError, fieldName);
            case FieldStatus.InvalidListValue:
                return Utils_String.format(Resources.FieldStatusInvalidListValueError, fieldName, value);
            case FieldStatus.InvalidOldValue:
                return Utils_String.format(Resources.FieldStatusInvalidOldValueError, fieldName);
            case FieldStatus.InvalidNotOldValue:
                return Utils_String.format(Resources.FieldStatusInvalidNotOldValueError, fieldName);
            case FieldStatus.InvalidEmptyOrOldValue:
                return Utils_String.format(Resources.FieldStatusInvalidEmptyOrOldValueError, fieldName);
            case FieldStatus.InvalidNotEmptyOrOldValue:
                return Utils_String.format(Resources.FieldStatusInvalidNotEmptyOrOldValueError, fieldName);
            case FieldStatus.InvalidValueInOtherField:
                return Utils_String.format(Resources.FieldStatusInvalidValueInOtherFieldError, fieldName);
            case FieldStatus.InvalidValueNotInOtherField:
                return Utils_String.format(Resources.FieldStatusInvalidValueNotInOtherFieldError, fieldName);
            case FieldStatus.InvalidDate:
                return Utils_String.format(Resources.FieldStatusInvalidDateErrorError, fieldName);
            case FieldStatus.InvalidTooLong:
                return Utils_String.format(Resources.FieldStatusInvalidTooLongError, fieldName);
            case FieldStatus.InvalidType:
                return Utils_String.format(Resources.FieldStatusInvalidTypeError, fieldName);
            case FieldStatus.InvalidComputedField:
                return Utils_String.format(Resources.FieldStatusInvalidComputedFieldError, fieldName);
            case FieldStatus.InvalidPath:
                return Utils_String.format(Resources.FieldStatusInvalidPathError, fieldName);
            case FieldStatus.InvalidCharacters:
                return Utils_String.format(Resources.FieldStatusInvalidCharactersError, fieldName);
            case FieldStatus.InvalidIdentity:
                return error || Utils_String.format(Resources.FieldStatusInvalidListValueError, fieldName, value);
            default:
                return Utils_String.format(Resources.FieldStatusInvalidUnknownError, fieldName);
        }
    }

    public static getFieldStatus(statusFlag: FieldStatusFlags): FieldStatus {

        if ((statusFlag & FieldStatusFlags.InvalidMask) !== FieldStatusFlags.None) {
            for (let i = 1, l = fieldStatusMap.length; i < l; i++) {
                if ((statusFlag & fieldStatusMap[i]) !== FieldStatusFlags.None) {
                    return i;
                }
            }

            return FieldStatus.InvalidUnknown;
        } else {
            return FieldStatus.Valid;
        }
    }

    private _error: string;
    public status: FieldStatusFlags;
    public allowedValues: string[];
    public lists: IItemGlobalValueList;
    public patterns: string[];
    public filterByScope: WorkItemIdentityScope;

    public workItem: WorkItem;
    public fieldDefinition: FieldDefinition;
    public customValidators: any[];

    constructor(workItem: WorkItem, fieldDefinition: FieldDefinition) {
        this.workItem = workItem;
        this.fieldDefinition = fieldDefinition;
    }

    /**
     * Delete any updates that have been made to the field.
     */
    public resetUpdate() {
        delete this.workItem.fieldUpdates[this.fieldDefinition.id + ""];
    }

    public getValue(original?: boolean, omitSetByRule?: boolean): any {
        return Field.convertValueToExternal(this.workItem.store,
            this._getValue(original, omitSetByRule, /*asIdentityRef*/ false),
            this.fieldDefinition.type);
    }

    public getIdentityValue(original?: boolean, omitSetByRule?: boolean): IdentityRef {
        Diag.Debug.assert(this.fieldDefinition.isIdentity, "expected to be called only on identity fields");
        // not wrapping in convertValueToExternal since _getValue returns the data correctly
        return this._getValue(original, omitSetByRule, /*asIdentityRef*/ true);
    }

    public getFriendlyValue(original?: boolean, omitSetByRule?: boolean): any {
        const value = this.getValue(original, omitSetByRule);
        if (this.fieldDefinition.isIdentity && value) {
            return IdentityHelper.parseUniquefiedIdentityName(value).displayName;
        }
        return value;
    }

    public getDisplayText(original?: boolean, omitSetByRule?: boolean): string {
        return Field.convertValueToDisplayString(this.getValue(original, omitSetByRule));
    }

    /**
     *
     * @param value The new value to set for the field.
     * @param preventFire Flag to indicate if a field change event should be fired if the field is updated.
     * @param fireIdentityEagerValidation Flag to indicate if a server validation call should be fired if the field is updated.
     * @param setByRule If set to true mark setByRule=true on the field update
     * @param forceEvaluate If set to true the set value is re-evaluated with the rule engine even if it did not change
     */
    public setValue(value: any, preventFire?: boolean, fireIdentityEagerValidation?: boolean, setByRule?: boolean);
    public setValue(value: any, options: IFieldSetValueOptions);
    public setValue(value: any, preventFire: IFieldSetValueOptions | boolean = false, fireIdentityEagerValidation: boolean = false, setByRule: boolean = false) {
        const defaultOptions = {
            preventFire: false,
            fireIdentityEagerValidation: false,
            setByRule: false,
            forceEvaluate: false
        };

        // if we get a work item identity ref, convert to the combo string
        // since write operations only support combo string
        if (isWorkItemIdentityRef(value)) {
            value = value.distinctDisplayName;
        }

        let options: IFieldSetValueOptions;
        if (typeof preventFire !== "object") {
            options = $.extend({}, defaultOptions, {
                preventFire: preventFire,
                fireIdentityEagerValidation: fireIdentityEagerValidation,
                setByRule: setByRule
            });
        } else {
            options = $.extend({}, defaultOptions, preventFire);
        }

        const oldValue = this.workItem._getFieldValueById(this.fieldDefinition.id);
        const newValue = Field.convertValueToInternal(this.workItem.store,
            this._tryNormalizeValue(value),
            this.fieldDefinition.type);

        // first we set the value on the field
        this._setValue(newValue.value, options.setByRule);

        // if the field value has changed, or we force evaluate
        if (!Field.compareValues(oldValue, newValue.value) || options.forceEvaluate) {

            // then with the field changed, we run the rule engine (evaluateField just calls ruleEngine.evaluateField)
            // we get back the fields that were changed by the rules
            const changedFields = this.workItem.evaluateField(this.fieldDefinition.id, true, oldValue);

            this.status |= newValue.status;

            // if the field is identity field and no client side validation error occurred, then start eager validation from server
            if (options.fireIdentityEagerValidation) {
                this.validateIdentityFieldValue();
            }

            if (!options.preventFire) {
                // then we tell the work item which fields have changed
                this.workItem.fireFieldChange(changedFields);
            }
        }
    }

    /**
     * Runs the rules on the current field.
     * This hits the server unless the field statuses are already marked invalid by the client-side rule engine.
     */
    public validateIdentityFieldValue(): void {
        const validatedValue = this.getValue();
        const validationKey = new FieldValidationKey(this.fieldDefinition.id, validatedValue, this.filterByScope);
        if (isIdentityPickerSupportedForField(this.fieldDefinition) && this.isValid() && !(validatedValue instanceof ServerDefaultValue)) {
            // we dont want to run ruleengine on the field if its value is set by a serverdefaultvalue rule, as the rule engine API doesnt understand ServerDefault Rule
            this.workItem.beginValidate(this.fieldDefinition.id, validationKey,
                () => {
                    // if the request comes back, but the current value or scope is changed for the field compared with those when request sent,
                    // we just ignore the result
                    // the response for the perticular scope and value will handle, since every value change or scope change will trigger eager validation
                    if (new FieldValidationKey(this.fieldDefinition.id, this.getValue(), this.filterByScope).equals(validationKey)) {
                        this._error = "";
                    }
                }, (error, referenceName?: string) => {
                    let validatedField: Field = this;
                    if (referenceName) {
                        validatedField = this.workItem.getField(referenceName);
                    }

                    // If when we get the validation failure the field is already
                    // invalid then just let it be
                    if (validatedField.isValid() &&
                        new FieldValidationKey(this.fieldDefinition.id, this.getValue(), this.filterByScope).equals(validationKey)) {
                        validatedField._error = error.message;
                        validatedField.status = FieldStatusFlags.InvalidIdentityField;
                        this.workItem.fireFieldChange([validatedField.fieldDefinition.id]);
                    }
                });
        }
    }

    public isDirty(): boolean {
        const fieldId = this.fieldDefinition.id;
        let isDirty = this.workItem.fieldUpdates.hasOwnProperty(fieldId + "");

        if (!isDirty) {
            switch (fieldId) {
                case WITConstants.CoreField.IterationPath:
                    isDirty = this.workItem.fieldUpdates.hasOwnProperty(WITConstants.CoreField.IterationId + "");
                    break;
                case WITConstants.CoreField.AreaPath:
                    isDirty = this.workItem.fieldUpdates.hasOwnProperty(WITConstants.CoreField.AreaId + "");
                    break;
            }
        }

        return isDirty;
    }

    /**
     * Determines if the field was updated by a rule.
     * @return True if the field was updated by a rule and false otherwise.
     */
    public isUserChange(): boolean {
        const update = this.workItem.fieldUpdates[this.fieldDefinition.id + ""];

        if (update) {
            if (update.setByRule) {
                if ((this.status & FieldStatusFlags.SetByComputedRule) !== FieldStatusFlags.None) {
                    return true;
                } else {
                    return false;
                }
            }

            return true;
        }

        return false;
    }

    public isValid(): boolean {
        return (this.status & FieldStatusFlags.InvalidMask) === FieldStatusFlags.None;
    }

    /** isValid except required does not show as error */
    public isValidValueOrEmpty() {
        return (this.status & FieldStatusFlags.InvalidMask & ~FieldStatusFlags.InvalidEmpty) === FieldStatusFlags.None;
    }

    public isHistoricalRevision(): boolean {
        return this.workItem.isReadOnly();
    }

    public isEditable(): boolean {
        if (this.isHistoricalRevision() || !this.fieldDefinition.isEditable()) {
            return false;   // unconditionally readonly
        }

        let fieldId = this.fieldDefinition.id;

        switch (fieldId) {
            case WITConstants.CoreField.Rev:
            case WITConstants.CoreField.WorkItemType:
            case WITConstants.CoreField.CreatedBy:
            case WITConstants.CoreField.IsDeleted:
                return false;

            // Return the editability of the corresponding ID field
            case WITConstants.CoreField.AreaPath:
                fieldId = WITConstants.CoreField.AreaId;
                break;
            case WITConstants.CoreField.IterationPath:
                fieldId = WITConstants.CoreField.IterationId;
                break;

            default:
                return (this.status & FieldStatusFlags.ReadOnly) === FieldStatusFlags.None;
        }

        return this.workItem.getField(fieldId).isEditable();
    }

    public isReadOnly(): boolean {
        return !this.isEditable();
    }

    public isRequired(): boolean {
        let fieldId = this.fieldDefinition.id;
        switch (fieldId) {
            case WITConstants.CoreField.IterationPath:
                fieldId = WITConstants.CoreField.IterationId;
                break;
            case WITConstants.CoreField.AreaPath:
                fieldId = WITConstants.CoreField.AreaId;
                break;
            default:
                return (this.status & FieldStatusFlags.Required) !== FieldStatusFlags.None;
        }

        return this.workItem.getField(fieldId).isRequired();
    }

    public getErrorText(): string {
        return Field.getFieldErrorText(this.fieldDefinition.name, this.getStatus(), this.getDisplayText(), this._error);
    }

    public getStatus(): FieldStatus {
        return Field.getFieldStatus(this.status);
    }

    public validate(validator: any) {
        this.customValidators = this.customValidators || [];
        this.customValidators.push(validator);
    }

    public hasList(): boolean {
        return (this.status & FieldStatusFlags.HasValues) !== FieldStatusFlags.None;
    }

    public isLimitedToAllowedValues(): boolean {
        return (this.status & FieldStatusFlags.LimitedToValues) !== FieldStatusFlags.None;
    }

    public getAllowedValues(): string[] {
        let result = this.allowedValues;

        if (!result) {
            if (this.hasList()) {
                const lists = this.lists;
                const store = this.workItem.store;

                if (lists.allowedValues && lists.allowedValues.length > 0) {
                    result = Field.unionLists(store, lists.allowedValues[0].items, lists.allowedValues[0].globals);
                    for (const allowedValues of lists.allowedValues) {
                        result = Field.intersect(result, Field.unionLists(store, allowedValues.items, allowedValues.globals), true);
                    }
                }

                if (lists.suggestedValues && lists.suggestedValues.length > 0) {
                    let allSuggested: string[] = [];
                    for (const suggestedValues of lists.suggestedValues) {
                        allSuggested = Field.union(allSuggested, Field.unionLists(store, suggestedValues.items, suggestedValues.globals), true);
                    }

                    if (result) {
                        result = Field.intersect(result, allSuggested);
                    } else {
                        result = allSuggested;
                    }
                }

                if (lists.allowExistingValue) {
                    const originalValue = this._getValue(true);

                    if (!Field.isEmpty(originalValue)) {
                        if (result) {
                            result = Field.union(result, [Field.convertValueToDisplayString(originalValue)], true);
                        } else {
                            result = [Field.convertValueToDisplayString(originalValue)];
                        }
                    }
                }

                if (result && lists.prohibitedValues && lists.prohibitedValues.length > 0) {
                    for (const prohibitedValues of lists.prohibitedValues) {
                        result = Field.subtract(result, Field.unionLists(store, prohibitedValues.items, prohibitedValues.globals), true);
                    }
                }
            }

            result = result || [];

            if (Field.isNumericField(this.fieldDefinition.type)) {
                Utils_Array.sortIfNotSorted(result, Utils_Number.defaultComparer);
            } else {
                Utils_Array.sortIfNotSorted(result, Utils_String.localeIgnoreCaseComparer);
            }

            this.allowedValues = result;
        }

        return result;
    }

    public isChangedInRevision(revision: number): any {
        let id = this.fieldDefinition.id;
        switch (id) {
            case WITConstants.CoreField.AreaPath:
            case WITConstants.CoreField.NodeName:
            case WITConstants.DalFields.AreaLevel1:
            case WITConstants.DalFields.AreaLevel2:
            case WITConstants.DalFields.AreaLevel3:
            case WITConstants.DalFields.AreaLevel4:
            case WITConstants.DalFields.AreaLevel5:
            case WITConstants.DalFields.AreaLevel6:
            case WITConstants.DalFields.AreaLevel7:
                id = WITConstants.CoreField.AreaId;
                break;

            case WITConstants.CoreField.IterationPath:
            case WITConstants.DalFields.IterationLevel1:
            case WITConstants.DalFields.IterationLevel2:
            case WITConstants.DalFields.IterationLevel3:
            case WITConstants.DalFields.IterationLevel4:
            case WITConstants.DalFields.IterationLevel5:
            case WITConstants.DalFields.IterationLevel6:
            case WITConstants.DalFields.IterationLevel7:
                id = WITConstants.CoreField.IterationId;
                break;

            case WITConstants.CoreField.AuthorizedAs:
                id = WITConstants.DalFields.PersonID;
                break;

            case WITConstants.CoreField.IsDeleted:
                if (revision === 0) {
                    // Deleted field should not be considered as changed for the first revision
                    return false;
                }
                break;

            case WITConstants.CoreField.AttachedFileCount:
            case WITConstants.CoreField.HyperLinkCount:
            case WITConstants.CoreField.ExternalLinkCount:
            case WITConstants.CoreField.RelatedLinkCount:
                // TODO: do not know, check
                return null;
        }

        if (revision === 0) {
            return this.workItem.getFieldValueByRevision(id, revision) !== null;
        } else if (this.workItem.getRevisions()[revision - 1]) {
            const revisions = this.workItem.getRevisions();
            const fieldIdString = id + "";

            if (revisions[revision - 1].hasOwnProperty(fieldIdString)) {

                if (id !== WITConstants.CoreField.TeamProject) {
                    return true;
                }

                // Team project is sent down on every revision so we must compare it between the revisions
                const value = revisions[revision - 1][fieldIdString];
                const newValue = revision < revisions.length ?
                    revisions[revision][fieldIdString] :
                    this.workItem.getFieldValue(WITConstants.CoreField.TeamProject, true);    // Latest revision, get the original value of the field

                return newValue != undefined && value !== newValue;
            }
        }

        return false;
    }

    public _reset() {
        this.status = FieldStatusFlags.None;
        this.allowedValues = null;
        this.lists = null;
    }

    public _getValue(original?: boolean, omitSetByRule?: boolean, asIdentityRef?: boolean) {
        return this.workItem._getFieldValueById(this.fieldDefinition.id, original, omitSetByRule, asIdentityRef);
    }

    public _setValue(value: any, setByRule?: boolean) {
        this.workItem._setFieldValueById(this.fieldDefinition.id, value, setByRule);
    }

    private _tryNormalizeValue(value: string): string {
        if (value && typeof value === "string" && this.hasList()) {
            const list = this.getAllowedValues();
            value = Field.normalize(list, value);
        }

        return value;
    }
}

VSS.initClassPrototype(Field, {
    workItem: null,
    fieldDefinition: null,
    status: FieldStatusFlags.None,
    _allowedValues: null,
    _lists: null,
    customValidators: null
});

const fieldStatusMap = [FieldStatusFlags.None, FieldStatusFlags.InvalidEmpty, FieldStatusFlags.InvalidNotEmpty,
FieldStatusFlags.InvalidFormat, FieldStatusFlags.InvalidListValue, FieldStatusFlags.InvalidOldValue,
FieldStatusFlags.InvalidNotOldValue, FieldStatusFlags.InvalidEmptyOrOldValue, FieldStatusFlags.InvalidNotEmptyOrOldValue,
FieldStatusFlags.InvalidValueInOtherField, FieldStatusFlags.InvalidValueNotInOtherField,
FieldStatusFlags.InvalidDate, FieldStatusFlags.InvalidTooLong, FieldStatusFlags.InvalidType,
FieldStatusFlags.InvalidComputedField, FieldStatusFlags.InvalidPath, FieldStatusFlags.InvalidCharacters, FieldStatusFlags.InvalidIdentityField];

export class Link {

    public static createFromLinkData(workItem: WorkItem, linkData: ILinkInfo) {
        linkData = linkData || <ILinkInfo>{};

        if (!linkData.FldID) { // From Files table
            linkData.FldID = WITConstants.DalFields.RelatedLinks;
        }

        const fieldId = linkData.FldID;

        switch (fieldId) {
            case WITConstants.DalFields.AttachedFiles:
                return new Attachment(workItem, linkData);
            case WITConstants.DalFields.LinkedFiles:
                return new Hyperlink(workItem, linkData);
            case WITConstants.DalFields.BISURI:
                return new ExternalLink(workItem, linkData);
            case WITConstants.DalFields.RelatedLinks:
                return new WorkItemLink(workItem, linkData);
            default:
                return new Link(workItem, linkData);
        }
    }

    public workItem: WorkItem;
    public linkData: ILinkInfo;
    public updated: boolean;
    public deleted: boolean;
    public baseLinkType: string;
    public comment: string;
    public isLocked: boolean;
    public remoteHostId: string;
    public remoteProjectId: string;
    public remoteStatus: RemoteLinkStatus;
    public remoteStatusMessage: string;
    public remoteHostUrl: string;
    public remoteHostName: string;

    constructor(workItem: WorkItem, linkData: ILinkInfo) {
        this.workItem = workItem;
        this.linkData = linkData;

        this.updated = false;
        this.deleted = false;
        this.baseLinkType = "Link";
        this.comment = this.linkData.Comment;
        this.isLocked = this.linkData.Lock;
        this.remoteHostId = this.linkData.RemoteHostId;
        this.remoteProjectId = this.linkData.RemoteProjectId;
        this.remoteStatus = this.linkData.RemoteStatus;
        this.remoteHostUrl = this.linkData.RemoteHostUrl;
        this.remoteHostName = this.linkData.RemoteHostName;
        this.remoteStatusMessage = this.linkData.RemoteStatusMessage;
    }

    /**
    * Sets Link updated state
    *
    * @param flushing: Set to true if to flush the Link object with associated LinkData and reset all changed flags to false
    */
    public setState(flushing?: boolean): void {

        if (flushing) {
            this.comment = this.getComment();
            this.isLocked = this.getIsLocked();

            this.updated = false;
            this.linkData.CommentChanged = false;
            this.linkData.LockChanged = false;
        } else {
            this.updated = this.linkData.CommentChanged || this.linkData.LockChanged;
        }
    }

    public _fireChanged() {
        this.workItem.fireFieldChange([this.getFieldId()]);
    }

    public isNew(): boolean {
        return Utils_Date.equals(WorkItemStore.FutureDate, this.getAddedDate());
    }

    public isRemoved(): boolean {
        return !Utils_Date.equals(WorkItemStore.FutureDate, this.getRemovedDate());
    }

    public getComment(): string {
        return this.linkData.Comment;
    }

    public setComment(comment: string, preventChangeEvent?: boolean) {
        this.linkData.Comment = comment;
        this.linkData.CommentChanged = true;
        this.setState();

        if (!preventChangeEvent) {
            this._fireChanged();
        }
    }

    public remove(options?: { preventEvent?: boolean; }) {
        const preventEvent = options && options.preventEvent === true;
        this.deleted = true;

        if (!preventEvent) {
            this.workItem.resetLinks(true);
            this._fireChanged();
        }
    }

    public clone(target: WorkItem): Link {
        return null;
    }

    public getFieldId(): number {
        return this.linkData.FldID;
    }

    public getIsLocked(): boolean {
        return this.linkData.Lock || false;
    }

    public setIsLocked(value: boolean) {
        this.linkData.Lock = value;
        this.linkData.LockChanged = true;

        this.setState();
        this._fireChanged();
    }

    public getAddedDate(): Date {
        return this.linkData.AddedDate;
    }

    public getRemovedDate(): Date {
        return this.linkData.RemovedDate;
    }

    public setRemovedDate(removedDate: Date) {
        this.linkData.RemovedDate = removedDate;
    }

    /**
     * Compares this link to the link provided.
     * @param link Link to compare against this link.
     * @return True if they are equal and false otherwise.
     */
    public equals(link: Link): boolean {
        if (link && this.baseLinkType === link.baseLinkType) {
            // Compare the link data of the links.
            for (const prop in this) {
                // If the property begins with "get" and is a function, compare the values.
                if (prop.substr(0, 3) === "get" && $.isFunction(this[prop])) {
                    const localValue = (this[prop] as any).call(this);
                    const compareValue = (link as any)[prop].call(link);

                    // Compare the fields using a case sensitive comparison
                    if (!Field.compareValues(localValue, compareValue, false)) {
                        return false;
                    }
                }
            }
        } else {
            return false;
        }

        return true;
    }

    public isDuplicate(link: Link): boolean {
        return this.equals(link);
    }

    public getArtifactLinkType(): string {
        /// <returns type="string" />

        return "";
    }

    public getAttributes(): any {
        if (this._isResourceLinkType(this.linkData.FldID)) {
            const attributes: IDictionaryStringTo<number | Date | string> = {
                [WITConstants.WorkItemLinkConstants.ATTRIBUTES_AUTHORIZEDDATE]: this.linkData.AddedDate,
                [WITConstants.WorkItemLinkConstants.ATTRIBUTES_ID]: this.linkData.ExtID,
                [WITConstants.WorkItemLinkConstants.ATTRIBUTES_RESOURCECREATEDDATE]: this.linkData.CreationDate,
                [WITConstants.WorkItemLinkConstants.ATTRIBUTES_RESOURCEMODIFIEDDATE]: this.linkData.LastWriteDate,
                [WITConstants.WorkItemLinkConstants.ATTRIBUTES_REVISEDDATE]: this.linkData.RemovedDate,
            };

            if (this.linkData.Length > 0) {
                attributes[WITConstants.WorkItemLinkConstants.ATTRIBUTES_RESOURCESIZE] = this.linkData.Length;
            }

            if (this.linkData.Comment) {
                attributes[WITConstants.WorkItemLinkConstants.ATTRIBUTES_COMMENT] = this.linkData.Comment;
            }

            if (this.linkData.OriginalName) {
                attributes[WITConstants.WorkItemLinkConstants.ATTRIBUTES_NAME] = this.linkData.OriginalName;
            }

            return attributes;
        } else if (this.linkData.FldID === WITConstants.DalFields.RelatedLinks) {
            return {
                isLocked: this.linkData.Lock,
                isDeleted: this.deleted,
                isNew: this.isNew(),
            };
        }
        return null;
    }

    public getLinkUrl(): string {
        if (this._isResourceLinkType(this.linkData.FldID)) {
            return this.linkData.FilePath;
        } else if (this.remoteHostId) {
            return getRemoteWorkItemRestUrl(this.remoteHostUrl, this.remoteProjectId, this.linkData.ID);
        } else {
            return WorkItem.getResourceUrl(this.workItem.store.getTfsContext(), this.linkData.ID);
        }
    }

    public getRelationLinkType(): string {
        switch (this.linkData.FldID) {
            case WITConstants.DalFields.BISURI:
                return WITConstants.WorkItemLinkConstants.ARTIFACTLINKTYPE;
            case WITConstants.DalFields.AttachedFiles:
                return WITConstants.WorkItemLinkConstants.ATTACHEDLINKTYPE;
            case WITConstants.DalFields.LinkedFiles:
                return WITConstants.WorkItemLinkConstants.HYPERLINKLINKTYPE;
            default:
                return (this instanceof WorkItemLink) ? this.getLinkTypeEnd().immutableName : "";
        }
    }

    private _isResourceLinkType(linkFieldID: number): boolean {
        switch (linkFieldID) {
            case WITConstants.DalFields.BISURI:
            case WITConstants.DalFields.AttachedFiles:
            case WITConstants.DalFields.LinkedFiles:
                return true;
            default:
                return false;
        }
    }

    public static getCountFieldId(linkFieldId: number): number {
        let countFieldId;
        switch (linkFieldId) {
            case WITConstants.DalFields.AttachedFiles:
                countFieldId = WITConstants.CoreField.AttachedFileCount;
                break;
            case WITConstants.DalFields.RelatedLinks:
                countFieldId = WITConstants.CoreField.RelatedLinkCount;
                break;
            case WITConstants.DalFields.LinkedFiles:
                countFieldId = WITConstants.CoreField.HyperLinkCount;
                break;
            case WITConstants.DalFields.BISURI:
                countFieldId = WITConstants.CoreField.ExternalLinkCount;
                break;
        }
        return countFieldId;
    }
}

export class ExternalLink extends Link {

    public static create(workItem: WorkItem, registeredLinkType: string, artifactUri: string, comment?: string, externalLinkContext?: IExternalLinkedArtifact): ExternalLink {
        return new ExternalLink(workItem, {
            OriginalName: registeredLinkType,
            FilePath: artifactUri,
            Comment: comment || "",
            FldID: WITConstants.DalFields.BISURI,
            AddedDate: WorkItemStore.FutureDate,
            RemovedDate: WorkItemStore.FutureDate,
            externalLinkContext: externalLinkContext
        });
    }

    constructor(workItem: WorkItem, linkData: ILinkInfo) {
        super(workItem, linkData);
        this.baseLinkType = "ExternalLink";
    }

    public getArtifactLinkType(): string {
        return this.linkData.OriginalName;
    }

    public getLinkedArtifactUri(): string {
        return this.linkData.FilePath;
    }

    public clone(target: WorkItem): ExternalLink {
        return ExternalLink.create(target, this.getArtifactLinkType(), this.getLinkedArtifactUri(), this.getComment());
    }

    public isDuplicate(link: Link): boolean {
        if (link instanceof ExternalLink) {
            const externalLink = <ExternalLink>link;

            return this.getFieldId() === externalLink.getFieldId() &&
                Utils_String.equals(this.getLinkedArtifactUri(), externalLink.getLinkedArtifactUri(), true) &&
                Utils_String.equals(this.getArtifactLinkType(), externalLink.getArtifactLinkType(), true);
        }
        return false;
    }
}

export class Hyperlink extends Link {

    public static create(workItem: WorkItem, location: string, comment: string): Hyperlink {
        return new Hyperlink(workItem, {
            OriginalName: "",
            FilePath: location,
            Comment: comment || "",
            FldID: WITConstants.DalFields.LinkedFiles,
            AddedDate: WorkItemStore.FutureDate,
            RemovedDate: WorkItemStore.FutureDate
        });
    }

    public baseLinkType: string;

    constructor(workItem: WorkItem, linkData: ILinkInfo) {
        super(workItem, linkData);

        this.baseLinkType = "HyperLink";
    }

    public getArtifactLinkType(): string {
        return "Workitem Hyperlink";
    }

    public getLocation(): string {
        return this.linkData.FilePath;
    }

    public clone(target: WorkItem): Hyperlink {
        return Hyperlink.create(target, this.getLocation(), this.getComment());
    }

    public isDuplicate(link: Link): boolean {
        if (link instanceof Hyperlink) {
            const hyperlink = <Hyperlink>link;

            return this.getFieldId() === hyperlink.getFieldId() &&
                Utils_String.equals(this.getLocation(), hyperlink.getLocation(), true);
        }
        return false;
    }
}

export class WorkItemLink extends Link {

    public static create(workItem: WorkItem, linkTypeName: string, targetId: number, comment: string, addedBySystem?: boolean, remoteLinkContext?: RemoteLinkContext): WorkItemLink;
    public static create(workItem: WorkItem, linkTypeId: number, targetId: number, comment: string, addedBySystem?: boolean, remoteLinkContext?: RemoteLinkContext): WorkItemLink;
    public static create(workItem: WorkItem, linkTypeEnd: IWorkItemLinkTypeEnd, targetId: number, comment: string, addedBySystem?: boolean, remoteLinkContext?: RemoteLinkContext): WorkItemLink;
    public static create(workItem: WorkItem, linkTypeEnd: IWorkItemLinkTypeEnd, targetId: number, comment: string, addedBySystem?: boolean, remoteLinkContext?: RemoteLinkContext): WorkItemLink;
    public static create(workItem: WorkItem, linkTypeEndOrId: any, targetId: number, comment: string, addedBySystem?: boolean, remoteLinkContext?: RemoteLinkContext): WorkItemLink {
        let linkTypeId: number;

        if (typeof linkTypeEndOrId === "object") {
            linkTypeId = (<IWorkItemLinkTypeEnd>linkTypeEndOrId).id;
        } else {
            const linkTypeEnd = workItem.store.findLinkTypeEnd(linkTypeEndOrId);

            linkTypeId = linkTypeEnd.id;
        }

        return new WorkItemLink(workItem, {
            ID: targetId,
            LinkType: linkTypeId,
            Comment: comment || "",
            FldID: WITConstants.DalFields.RelatedLinks,
            "Changed Date": WorkItemStore.FutureDate,
            "Revised Date": WorkItemStore.FutureDate,
            isAddedBySystem: addedBySystem,
            RemoteHostUrl: remoteLinkContext && remoteLinkContext.remoteHostUrl,
            RemoteProjectId: remoteLinkContext && remoteLinkContext.remoteProjectId,
            RemoteHostId: remoteLinkContext && remoteLinkContext.remoteHostId,
            RemoteHostName: remoteLinkContext && remoteLinkContext.remoteHostName
        });
    }

    public linkTypeEnd: IWorkItemLinkTypeEnd;

    constructor(workItem: WorkItem, linkData: ILinkInfo) {
        super(workItem, linkData);

        this.baseLinkType = "WorkItemLink";
    }

    public getSourceId(): number {
        return this.workItem.id;
    }

    public getTargetId(): number {
        return this.linkData.ID;
    }

    public getAddedDate(): Date {
        return <Date>this.linkData["Changed Date"];
    }

    public getAddedBy(): number {
        return <number>this.linkData["Changed By"];
    }

    public getRemovedDate(): Date {
        return <Date>this.linkData["Revised Date"];
    }

    public setRemovedDate(removedDate: Date) {
        this.linkData["Revised Date"] = removedDate;
    }

    public getRemovedBy(): number {
        return <number>this.linkData["Revised By"] || -1;
    }

    public getLinkType(): number {
        return this.linkData.LinkType;
    }

    public getLinkTypeEnd(): IWorkItemLinkTypeEnd {
        if (!this.linkTypeEnd) {
            this.linkTypeEnd = this.workItem.store.findLinkTypeEnd(this.getLinkType());
        }

        return this.linkTypeEnd;
    }

    public clone(target: WorkItem): WorkItemLink {
        const linkTypeEnd = this.getLinkTypeEnd(),
            linkType = linkTypeEnd.linkType;

        if (linkType &&
            linkType.isActive &&
            linkType.topology !== "Unknown" &&
            !(linkType.isOneToMany && linkTypeEnd.isForwardLink)) {
            const remoteLinkContext: RemoteLinkContext = {
                remoteHostId: this.remoteHostId,
                remoteHostName: this.remoteHostName,
                remoteHostUrl: this.remoteHostUrl,
                remoteProjectId: this.remoteProjectId
            };
            return WorkItemLink.create(target, linkTypeEnd, this.getTargetId(), this.getComment(), false, remoteLinkContext);
        }
    }

    public isDuplicate(link: Link): boolean {
        if (link instanceof WorkItemLink) {
            const workItemLink = <WorkItemLink>link;

            return this.getFieldId() === workItemLink.getFieldId() &&
                this.getLinkType() === workItemLink.getLinkType() &&
                this.getTargetId() === workItemLink.getTargetId() &&
                this.getSourceId() === workItemLink.getSourceId() &&
                this.remoteHostId === workItemLink.remoteHostId &&
                this.remoteProjectId === workItemLink.remoteProjectId;
        }
        return false;
    }
}

export class Attachment extends Link {

    private isPlaceholder: boolean;

    public getPlaceholderStatus(): boolean {
        return this.isPlaceholder;
    }

    public static create(workItem: WorkItem, fileName: string, fileGuid: string, comment: string, fileLength: number, fileCreationDate?: Date, fileLastWriteDate?: Date, isPlaceholder?: boolean): Attachment {
        Diag.Debug.assertParamIsNumber(fileLength, "fileLength");
        let attachment: Attachment;

        if (isPlaceholder) {
            attachment = new Attachment(workItem, {
                OriginalName: fileName,
                Comment: "",
                ExtID: 0,
                FldID: WITConstants.DalFields.AttachedFiles,
                Length: fileLength,
                CreationDate: new Date(),
                LastWriteDate: new Date(),
                AddedDate: WorkItemStore.FutureDate,
                RemovedDate: WorkItemStore.FutureDate
            });

            attachment.isPlaceholder = true;
        } else {
            attachment = new Attachment(workItem, {
                OriginalName: fileName,
                FilePath: fileGuid,
                Comment: comment || "",
                ExtID: 0,
                FldID: WITConstants.DalFields.AttachedFiles,
                Length: fileLength,
                CreationDate: fileCreationDate || new Date(), // TODO: could these be optional?
                LastWriteDate: fileLastWriteDate || new Date(),
                AddedDate: WorkItemStore.FutureDate,
                RemovedDate: WorkItemStore.FutureDate
            });

            attachment.isPlaceholder = false;
        }

        return attachment;
    }

    public resolvePlaceholder(fileGuid: string, fileCreationDate?: Date, fileLastWriteDate?: Date) {

        this.isPlaceholder = false;
        this.linkData.FilePath = fileGuid;
        if (fileCreationDate != null) {
            this.linkData.CreationDate = fileCreationDate;
        }
        if (fileLastWriteDate != null) {
            this.linkData.LastWriteDate = fileLastWriteDate;
        }
        this._fireChanged();
    }

    public uploaded: boolean;

    constructor(workItem: WorkItem, linkData: ILinkInfo) {
        super(workItem, linkData);

        this.baseLinkType = "Attachment";
        this.uploaded = true;
    }

    public getName(): string {
        /// <returns type="string" />
        return this.linkData.OriginalName;
    }

    public setName(value: string) {
        this.linkData.OriginalName = value;

        this._fireChanged();
    }

    public getLength(): number {
        return this.linkData.Length;
    }

    public setLength(value: number) {
        this.linkData.Length = value;

        this._fireChanged();
    }

    public getFilePath(): string {
        return this.linkData.FilePath;
    }

    public setFilePath(value: string) {
        this.linkData.FilePath = value;

        this._fireChanged();
    }

    public getUri(download?: boolean): string {
        const httpClient = this.workItem.project.store.tfsConnection.getHttpClient<WITWebApi.WorkItemTrackingHttpClient>(WITWebApi.WorkItemTrackingHttpClient);
        const projectId = this.workItem.project.guid;
        const fileName = this.getName();

        return httpClient.getAttachmentUrl(projectId, this.getFilePath(), fileName, download);
    }

    public open() {
        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
            url: this.getUri(false),
            target: "_blank"
        });
    }

    public save() {
        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
            url: this.getUri(true),
            target: "_blank"
        });
    }

    private _uploadComplete(fileName: string, filePath: string, length: number) {
        this.uploaded = true;

        this.linkData.OriginalName = fileName;
        this.linkData.FilePath = filePath;
        this.linkData.Length = length;

        this._fireChanged();
    }

    public isDuplicate(link: Link): boolean {
        // there is no way to compare 2 file attachments
        return false;
    }
}

export enum RuleValueFrom {
    Value = 0x01,
    CurrentValue = 0x02,
    OriginalValue = 0x04,
    OtherFieldCurrentValue = 0x08,
    OtherFieldOriginalValue = 0x10,
    CurrentUser = 0x20,
    Clock = 0x40,
}

class RuleEvaluator {

    private static compareLists(listA: IItemGlobalValue[], listB: IItemGlobalValue[]): boolean {
        let l: number;
        let i: number;

        if (listA !== listB) {
            if (!listA || !listB) {
                return false;
            }

            l = listA.length;

            if (l !== listB.length) {
                return false;
            }

            for (i = 0; i < l; i++) {
                if (listA[i].items !== listB[i].items) {
                    return false;
                }

                if (listA[i].globals !== listB[i].globals) {
                    return false;
                }
            }
        }

        return true;
    }

    private static compareFieldLists(oldlists: IItemGlobalValueList, newLists: IItemGlobalValueList): boolean {
        if (oldlists !== newLists) {
            if (!oldlists || !newLists) {
                return false;
            }

            if (oldlists.allowExistingValue !== newLists.allowExistingValue) {
                return false;
            }

            if (!RuleEvaluator.compareLists(oldlists.allowedValues, newLists.allowedValues)) {
                return false;
            }

            if (!RuleEvaluator.compareLists(oldlists.suggestedValues, newLists.suggestedValues)) {
                return false;
            }

            if (!RuleEvaluator.compareLists(oldlists.prohibitedValues, newLists.prohibitedValues)) {
                return false;
            }
        }

        return true;
    }

    private workItem: WorkItem;
    private fieldId: number;
    private field: Field;
    private value: any;
    private originalValue: any;
    private executionPhase: RuleEvaluatorExecutionPhase = RuleEvaluatorExecutionPhase.DefaultRules;
    private userChange: boolean = false;
    private valueLocked: boolean = false;
    private setByRule: boolean = false;
    private valueChanged: boolean = false; // whether rules have determined if this value should be updated (we are not comparing new value to old value though)
    private originalFieldStatus: FieldStatusFlags; // The original status of the field
    private setByDefaultRule: boolean = false;
    private setByComputedRule: boolean = false;
    public triggerFields: number[];
    private triggerFieldMap: { [key: string]: boolean; };
    private allowedValues: IItemGlobalValue[];
    private suggestedValues: IItemGlobalValue[];
    private patterns: IItemGlobalValue[];
    private prohibitedValues: IItemGlobalValue[];
    private readOnly: boolean = false;
    private empty: boolean = false;
    private required: boolean = false;
    private frozen: boolean = false;
    private cannotLoseValue: boolean = false;
    private otherField: boolean = false;
    private otherFieldCheck: string;
    private allowExistingValue: boolean = false;
    private validUser: boolean = false;
    private serverDefault: boolean = false;
    private isIdentityField: boolean = false;
    private evalState: IDictionaryStringTo<IEvalStateValue>;

    private filterByScope: WorkItemIdentityScope;
    private whenCount = 0;

    constructor(fieldId: number, workItem: WorkItem, field: Field, value: any, originalValue: any, valueLocked: boolean, evalState: IDictionaryStringTo<IEvalStateValue>) {
        this.fieldId = fieldId;
        this.workItem = workItem;
        this.field = field;
        this.value = value;
        this.originalValue = originalValue;
        this.valueLocked = valueLocked;
        this.userChange = valueLocked;
        this.evalState = evalState;
        this.isIdentityField = field.fieldDefinition.isIdentity;
    }

    private setExecutionPhase(phase: RuleEvaluatorExecutionPhase) {
        this.executionPhase = phase;
    }

    public evaluate(rules: FieldRuleType[]) {

        // add try catch so that work item form does not break. See incident 79525999 for more details
        try {
            if (rules) {
                this.setExecutionPhase(RuleEvaluatorExecutionPhase.CopyRules);
                this.Block(rules);

                this.setExecutionPhase(RuleEvaluatorExecutionPhase.DefaultRules);
                this.Block(rules);

                this.setExecutionPhase(RuleEvaluatorExecutionPhase.OtherRules);
                this.Block(rules);
            }

            this.validate();
        } catch (e) {
            const errorMessage: string = `Error occured in Rule Engine Evaluate. Name: ${e.Name} Message: ${e.message} Rules.length: ${rules.length} Rules.Information: ${rules.toString()} Stack: ${e.stack}`;
            Diag.Debug.fail(errorMessage);
            publishErrorToTelemetry(new Error(errorMessage));
        }
    }

    private Block(rules: FieldRuleType[]) {
        let i = 0;
        const l = rules.length;
        while (i < l) {
            const ruleName = <RuleName>rules[i++];
            const ruleArguments = <RuleParameters>rules[i++] || [];
            this[ruleName].apply(this, ruleArguments);
        }
    }

    private When(inverse: boolean, fieldId: number, value: any, valueFrom: RuleValueFrom, block: FieldRuleType[]) {
        value = this._getValueFrom(valueFrom, value);
        const isIdentityField = this._isIdentityField(fieldId);
        const smartIdentityComparisonNeeded = valueFrom == RuleValueFrom.Value && isIdentityField;

        if (this._areValuesEqual(fieldId, this._getFieldValue(fieldId, false), value, true, smartIdentityComparisonNeeded) ? !inverse : inverse) {
            this.whenCount++;
            this.Block(block);
            this.whenCount--;
        }
    }

    private WhenWas(inverse: boolean, fieldId: number, value: any, valueFrom: RuleValueFrom, block: FieldRuleType[]) {
        value = this._getValueFrom(valueFrom, value);
        const isIdentityField = this._isIdentityField(fieldId);
        const smartIdentityComparisonNeeded = valueFrom == RuleValueFrom.Value && isIdentityField;

        if (this._areValuesEqual(fieldId, this._getFieldValue(fieldId, true), value, true, smartIdentityComparisonNeeded) ? !inverse : inverse) {
            this.whenCount++;
            this.Block(block);
            this.whenCount--;
        }
    }

    private WhenChanged(inverse: boolean, fieldId: number, block: FieldRuleType[]) {
        if (this._areValuesEqual(fieldId, this._getFieldValue(fieldId, false), this._getFieldValue(fieldId, true), true) ? inverse : !inverse) {
            this.whenCount++;
            this.Block(block);
            this.whenCount--;
        }
    }

    private WhenBecameNonEmpty(inverse: boolean, fieldId: number, block: FieldRuleType[]) {
        if ((this._areValuesEqual(fieldId, this._getFieldValue(fieldId, true), null, true) && !this._areValuesEqual(fieldId, this._getFieldValue(fieldId, false), null, true)) ? !inverse : inverse) {
            this.whenCount++;
            this.Block(block);
            this.whenCount--;
        }
    }

    private WhenRemainedNonEmpty(inverse: boolean, fieldId: number, block: FieldRuleType[]) {
        if ((this._areValuesEqual(fieldId, this._getFieldValue(fieldId, true), null, true) || this._areValuesEqual(fieldId, this._getFieldValue(fieldId, false), null, true)) ? inverse : !inverse) {
            this.whenCount++;
            this.Block(block);
            this.whenCount--;
        }
    }

    private OtherField(fieldId: number, check: string, originalValue?: boolean) {
        if (this.executionPhase === RuleEvaluatorExecutionPhase.OtherRules) {
            this.otherField = this._getFieldValue(fieldId, originalValue);
            this.otherFieldCheck = check;

            if (check === "same-as") {
                if (!this.userChange && originalValue) {
                    // Make True works for original values
                    this.value = this.otherField;
                    this.setByRule = true;
                    this.valueChanged = true;
                }
            }
        }
    }

    private Map(fieldId: number, inverse: boolean, cases: any, defaultCase: any) {
        if (this.executionPhase === RuleEvaluatorExecutionPhase.CopyRules) {
            const fieldValue = this._getFieldValue(fieldId, false);

            let values: any;

            if (!inverse) {
                if (!this.userChange) {
                    if (cases != null) {
                        $.each(cases, (i, mapCase) => {
                            if (this._areValuesEqual(fieldId, fieldValue, mapCase["case"], true)) {
                                values = mapCase;
                                return false;
                            }
                        });
                    }

                    if (!values) {
                        values = defaultCase;
                    }

                    if (values) {
                        let valid: boolean = false;

                        if (values.values) {
                            $.each(values.values, (i, v) => {
                                if (this._areValuesEqual(fieldId, v, this.value, true)) {
                                    valid = true;
                                    return false;
                                }
                            });
                        }

                        if (!valid) {
                            if (!values["default"]) {
                                this.value = values.values && values.values[0];
                                this.valueLocked = true;
                                this.setByRule = true;
                                this.valueChanged = true;
                            } else if (Utils_Array.contains(values.values, this.originalValue)) {
                                this.value = this.originalValue;
                                this.valueLocked = true;
                                this.setByRule = true;
                                this.valueChanged = true;
                            } else if (!this._areValuesEqual(fieldId, values["default"], this.value, true)) {
                                this.value = values["default"];
                                this.valueLocked = true;
                                this.setByRule = true;
                                this.valueChanged = true;
                            }
                        }
                    }
                }

                if (!this.allowedValues) {
                    this.allowedValues = [];
                }

                let allowedValues: string[] = [];

                if (cases != null) {
                    $.each(this._getAllowedValues(fieldId), (i, caseValue) => {
                        let values: any;

                        $.each(cases, (i, mapCase) => {
                            if (this._areValuesEqual(fieldId, caseValue, mapCase["case"], true)) {
                                values = mapCase;
                                return false;
                            }
                        });

                        if (values) {
                            allowedValues = Field.union(allowedValues, values.values, true);
                        }
                    });
                }

                if (defaultCase) {
                    allowedValues = Field.union(allowedValues, defaultCase.values, true);
                }

                this.allowedValues.push({ items: allowedValues });
            } else {
                // handle inverse map case

                // check source field's prev value in this iteration
                const evalState = this.evalState[fieldId + ""];

                const prevValue = (evalState && (evalState.prevValue !== undefined)) ?
                    evalState.prevValue : this._getFieldValue(fieldId, false);

                if (!this._areValuesEqual(fieldId, this._getFieldValue(fieldId, false), prevValue, true) && !this.userChange) {
                    let targetValue: any;
                    if (cases != null) {
                        $.each(cases, (i, mapCase) => {
                            if (mapCase.values) {
                                $.each(mapCase.values, (i, mapValue) => {
                                    if (this._areValuesEqual(fieldId, fieldValue, mapValue, true)) {
                                        targetValue = mapCase["case"];
                                        return false;// break loop
                                    }
                                });
                            }

                            if (targetValue) {
                                return false; // break loop
                            }
                        });
                    }

                    if (targetValue !== undefined && !this._areValuesEqual(fieldId, targetValue, this.value, true)) {
                        this.value = targetValue;
                        this.valueLocked = true;
                        this.setByRule = true;
                        this.valueChanged = true;
                    }
                }
            }
        }
    }

    private AllowExistingValue() {
        if (this.executionPhase === RuleEvaluatorExecutionPhase.OtherRules) {
            this.allowExistingValue = true;
        }
    }

    private ReadOnly() {
        if (this.executionPhase === RuleEvaluatorExecutionPhase.OtherRules) {
            this.readOnly = true;

            if (!this.userChange) {
                // Make True
                this.value = this.originalValue;
                this.setByRule = true;
                this.valueChanged = true;
            }
        }
    }

    private Empty() {
        if (this.executionPhase === RuleEvaluatorExecutionPhase.OtherRules) {
            this.empty = true;

            if (!this.userChange) {
                // Make True
                this.value = undefined;
                this.setByRule = true;
                this.valueChanged = true;
            }
        }
    }

    private Required() {
        if (this.executionPhase === RuleEvaluatorExecutionPhase.OtherRules) {
            this.required = true;
        }
    }

    private Frozen() {
        if (this.executionPhase === RuleEvaluatorExecutionPhase.OtherRules) {
            this.frozen = true;

            if (!this.userChange && this.originalValue) {
                // Make True
                this.value = this.originalValue;
                this.setByRule = true;
                this.valueChanged = true;
            }
        }
    }

    private CannotLoseValue() {
        if (this.executionPhase === RuleEvaluatorExecutionPhase.OtherRules) {
            this.cannotLoseValue = true;
        }
    }

    private ValidUser() {
        if (this.executionPhase === RuleEvaluatorExecutionPhase.OtherRules) {
            this.validUser = true;
        }
    }

    private Copy(from: RuleValueFrom, value: any) {
        if (this.executionPhase === RuleEvaluatorExecutionPhase.CopyRules) {
            if (!this.valueLocked) {
                this.value = this._getValueFrom(from, value);
                this.valueLocked = true;
                this.setByRule = true;
                this.valueChanged = true;
            }
        }
    }

    private Default(from: RuleValueFrom, value: any) {
        if (this.executionPhase === RuleEvaluatorExecutionPhase.DefaultRules) {
            if (!this.valueLocked) {
                if (Field.isEmpty(this.value)) {
                    this.value = this._getValueFrom(from, value);
                    this.valueLocked = true;
                    this.setByRule = true;
                    this.setByDefaultRule = true;
                    this.valueChanged = true;
                }
            }
        }
    }

    private AllowedValues(items: string[], globals: string[]) {
        if (this.executionPhase === RuleEvaluatorExecutionPhase.OtherRules) {
            if (!this.allowedValues) {
                this.allowedValues = [];
            }

            if (items) {
                Utils_Array.flagSorted(items, Utils_String.localeIgnoreCaseComparer);
            }

            this.allowedValues.push({ items: items, globals: globals });
        }
    }

    private SuggestedValues(items: string[], globals: string[]) {
        if (this.executionPhase === RuleEvaluatorExecutionPhase.OtherRules) {
            if (!this.suggestedValues) {
                this.suggestedValues = [];
            }

            if (items) {
                Utils_Array.flagSorted(items, Utils_String.localeIgnoreCaseComparer);
            }

            this.suggestedValues.push({ items: items, globals: globals });
        }
    }

    private ProhibitedValues(items: string[], globals: string[]) {
        if (this.executionPhase === RuleEvaluatorExecutionPhase.OtherRules) {
            if (!this.prohibitedValues) {
                this.prohibitedValues = [];
            }

            if (items) {
                Utils_Array.flagSorted(items, Utils_String.localeIgnoreCaseComparer);
            }

            this.prohibitedValues.push({ items: items, globals: globals });
        }
    }

    private Match(items: string[], globals: string[]) {
        if (this.executionPhase === RuleEvaluatorExecutionPhase.OtherRules) {

            if (!this.patterns) {
                this.patterns = [];
            }

            if (items) {
                Utils_Array.flagSorted(items, Utils_String.localeIgnoreCaseComparer);
            }

            this.patterns.push({ items: items, globals: globals });
        }
    }

    private ServerDefault(type: ServerDefaultValueType) {
        if (this.executionPhase === RuleEvaluatorExecutionPhase.CopyRules) {
            // Server default rule does not respect value lock.
            this.value = new ServerDefaultValue(type, this.originalValue);
            this.serverDefault = true;

            this.valueLocked = true;
            this.setByRule = true;
            this.setByDefaultRule = true;
            this.valueChanged = true;
        }
    }

    private Computed(fieldId: number) {
        if (this.executionPhase === RuleEvaluatorExecutionPhase.DefaultRules) {
            if (!this.valueLocked) {
                const computation = this.workItem.computeFieldValue(this.field, fieldId);

                if (computation && computation.success) {
                    this.value = computation.value;
                    this.valueLocked = true;
                    this.setByRule = true;
                    this.setByComputedRule = true;
                    this.valueChanged = true;
                }
            }
        }
    }

    private Trigger(fields: number[]) {
        if (this.executionPhase === RuleEvaluatorExecutionPhase.OtherRules) {
            if (fields) {
                if (!this.triggerFields) {
                    this.triggerFieldMap = {};
                    this.triggerFields = [];
                }

                $.each(fields, (i: number, fieldId: number) => {
                    const fieldIdStr = fieldId + "";
                    if (!this.triggerFieldMap.hasOwnProperty(fieldIdStr)) {
                        this.triggerFieldMap[fieldIdStr] = true;
                        this.triggerFields.push(fieldId);
                    }
                });
            }
        }
    }

    /**
     * Store scoped data for the identity picker
     * @param constants strings to be used as identities
     * @param entityIds users and groups in scope
     * @param displayNames
     */
    private ScopedIdentity(constants: string[], entityIds?: string[], ancestorEntityIds?: string[], displayNames?: string[], excludeGroups?: boolean) {
        if (this.executionPhase === RuleEvaluatorExecutionPhase.OtherRules) {
            // Store value if not stored or current StoredIdentity rule is within a when clause. Last to write wins.
            if (this.whenCount > 0 || !this.filterByScope) {
                this.filterByScope = new WorkItemIdentityScope(ancestorEntityIds, entityIds, constants, displayNames, excludeGroups);
            }
        }
    }

    /**
     * Stores the results in field.status and other members of field. field is the instance passed in through the constructor
     */
    private validate() {
        let value: any;
        const field: Field = this.field;
        this.originalFieldStatus = field.status;

        field.status = FieldStatusFlags.None;

        const store = field.workItem.store;
        const translatedOriginalValue: IValueStatus = Field.convertValueToInternal(store, this.originalValue, field.fieldDefinition.type);
        const translatedValue: IValueStatus = Field.convertValueToInternal(store, this.value, field.fieldDefinition.type);
        value = translatedValue.value;
        field.status |= translatedValue.status;
        if (this.setByRule) {
            field._setValue(value, this.setByRule);
            field.status |= FieldStatusFlags.SetByRule;
        }

        if (this.setByDefaultRule) {
            field.status |= FieldStatusFlags.SetByDefaultRule;
        }

        if (this.setByComputedRule) {
            field.status |= FieldStatusFlags.SetByComputedRule;
        }

        if (this.readOnly || this.serverDefault || this.empty) {
            field.status |= FieldStatusFlags.ReadOnly;
        }

        if (this.cannotLoseValue) {
            if (!Field.isEmpty(this.originalValue)) {
                this.required = true;
            }
        }

        if (this.required) {
            field.status |= FieldStatusFlags.Required;
        }

        const lists = <IItemGlobalValueList>{};
        lists.allowedValues = this.allowedValues;

        if (this.allowedValues && this.allowedValues.length > 0) {
            field.status |= FieldStatusFlags.HasValues;
            field.status |= FieldStatusFlags.LimitedToValues;
        }

        lists.suggestedValues = this.suggestedValues;
        if (this.suggestedValues && this.suggestedValues.length > 0) {
            field.status |= FieldStatusFlags.HasValues;
            field.status &= ~FieldStatusFlags.LimitedToValues;
        }

        lists.prohibitedValues = this.prohibitedValues;
        lists.allowExistingValue = this.allowExistingValue;

        if (!RuleEvaluator.compareFieldLists(field.lists, lists)) {
            field.lists = lists;
            field.allowedValues = null;
        }

        if (this.allowExistingValue) {
            field.status |= FieldStatusFlags.AllowsOldValue;
        }

        let patterns: string[];
        if (this.patterns && this.patterns.length > 0) {
            patterns = Field.unionLists(store, this.patterns[0].items, this.patterns[0].globals);
            for (const pattern of this.patterns) {
                patterns = Field.intersect(patterns, Field.unionLists(store, pattern.items, pattern.globals), true);
            }
        }

        // ScopedIdentities
        if (field.fieldDefinition.isIdentity) {
            field.filterByScope = this.filterByScope;
        }

        field.patterns = patterns;
        if (patterns) {
            field.status |= FieldStatusFlags.HasFormats;
        }

        if (Field.isEmpty(value)) {
            if (!this.empty) {
                if (field.isRequired()) {
                    field.status |= FieldStatusFlags.Required;
                    field.status |= FieldStatusFlags.InvalidEmpty;
                    return;
                }

                if (typeof this.otherFieldCheck !== "undefined") {
                    if (Field.isEmpty(this.otherField)) {
                        if (this.otherFieldCheck === "not-same-as") {
                            field.status |= FieldStatusFlags.Required;
                            field.status |= FieldStatusFlags.InvalidValueNotInOtherField;
                            return;
                        }
                    } else if (this.otherFieldCheck === "same-as") {
                        field.status |= FieldStatusFlags.Required;
                        field.status |= FieldStatusFlags.InvalidValueInOtherField;
                        return;
                    }
                }
            }

            this.checkIfFieldRequiresControlUpdate();
            return;
        }

        if (this.empty) {
            // field is marked as empty but value is not empty
            field.status &= ~FieldStatusFlags.ReadOnly;
            field.status |= FieldStatusFlags.InvalidNotEmpty;
            this.checkIfFieldRequiresControlUpdate();
            return;
        }

        if (this.readOnly && !this.serverDefault && !this.setByDefaultRule && !this._areValuesEqual(field.fieldDefinition.id, value, translatedOriginalValue.value)) {
            // field._status &= ~FieldStatusFlags.ReadOnly;
            field.status |= FieldStatusFlags.InvalidNotOldValue;
            this.checkIfFieldRequiresControlUpdate();
            return;
        }

        if (typeof this.otherFieldCheck !== "undefined") {
            if (this._areValuesEqual(field.fieldDefinition.id, value, this.otherField)) {
                if (this.otherFieldCheck === "not-same-as") {
                    field.status |= FieldStatusFlags.InvalidValueInOtherField;
                    this.checkIfFieldRequiresControlUpdate();
                    return;
                }
            } else if (this.otherFieldCheck === "same-as") {
                field.status |= FieldStatusFlags.InvalidValueNotInOtherField;
                this.checkIfFieldRequiresControlUpdate();
                return;
            }
        }

        if (this.frozen) {
            if (!Field.isEmpty(translatedOriginalValue.value)) {
                if (!this._areValuesEqual(field.fieldDefinition.id, value, translatedOriginalValue.value)) {
                    field.status |= FieldStatusFlags.InvalidNotEmptyOrOldValue;
                    this.checkIfFieldRequiresControlUpdate();
                    return;
                }
            }
        }

        // Project change explicitly sets values for area and iteration path and they should not be set as part of rules while project change is still in progress since the values for these
        // fields might still belong to the old project and they wont exist in the nodes cache for the new project.
        if (field.fieldDefinition.type === WITConstants.FieldType.TreePath && !this.workItem.isChangeProjectInProgress()) {
            const node = this.workItem.project.nodesCacheManager.getReferencedNode({ path: value, nodeType: field.fieldDefinition.id === WITConstants.CoreField.AreaPath ? 1 : 2 });

            if (!node) {
                // If the user edits the area/iteration before the nodes finishes loading the editted value may be valid
                // The only way to know this is with the full nodes cache. Immediately the user will get a invalid field error.
                // This ensures that once the nodes are loaded the error message will be removed if the node in fact exists.
                if (!this.workItem.project.nodesCacheManager.isNodesCacheAvailable()) {
                    this.workItem.project.nodesCacheManager.beginGetNodes().then(() => {
                        field.setValue(value, { forceEvaluate: true });
                    });
                } else {
                    field.status |= FieldStatusFlags.InvalidPath;
                }
                this.checkIfFieldRequiresControlUpdate();
                return;
            }
        }

        if (!(this.serverDefault || (value instanceof ServerDefaultValue))) {
            // text value is checked against patterns and lists
            // if value is server default bypass these checks

            const textValue = (value === undefined || value === null) ? "" : ("" + value);

            if (field.patterns) {
                let hasMatch = false;
                for (const pattern of field.patterns) {
                    if (Field.isMatch(pattern, textValue)) {
                        hasMatch = true;
                        break;
                    }
                }

                if (!hasMatch) {
                    field.status |= FieldStatusFlags.InvalidFormat;
                    this.checkIfFieldRequiresControlUpdate();
                    return;
                }
            }

            if (lists.prohibitedValues) {
                for (const prohibitedValue of lists.prohibitedValues) {
                    // It doesn't make sense require prohibited values to be specified with the exact case.
                    if (Field.inList(store, textValue, prohibitedValue.items, prohibitedValue.globals, true)) {
                        field.status |= FieldStatusFlags.InvalidListValue;
                        this.checkIfFieldRequiresControlUpdate();
                        return;
                    }
                }
            }

            if (this.allowExistingValue && !Field.isEmpty(translatedOriginalValue.value)) {
                if (this._areValuesEqual(field.fieldDefinition.id, value, translatedOriginalValue.value)) {
                    this.checkIfFieldRequiresControlUpdate();
                    return;
                }
            }

            if (lists.allowedValues) {
                for (const allowedValue of lists.allowedValues) {
                    // Perform case insensitive search for the allowed values to make sure it matches exactly to the one in the lists.
                    if (!Field.inList(store, textValue, allowedValue.items, allowedValue.globals, true)) {
                        field.status |= FieldStatusFlags.InvalidListValue;
                        this.checkIfFieldRequiresControlUpdate();
                        return;
                    }
                }
            }
        }

        this.checkIfFieldRequiresControlUpdate();
    }

    private checkIfFieldRequiresControlUpdate() {
        if (((this.field.status !== this.originalFieldStatus) || this.valueChanged) && dontNotifyAllFieldsOnSave()) {
            this.evalState[this.fieldId].requiresControlUpdate = true;
        }
    }

    private _isIdentityField(fieldId: number) {
        const field = this.workItem.getField(fieldId);
        return field && field.fieldDefinition.isIdentity;
    }

    private _getFieldValue(fieldId: number, originalValue?: boolean): any {
        if (fieldId === this.fieldId) {
            if (originalValue) {
                return this.originalValue;
            } else {
                return this.value;
            }
        } else {
            return this.workItem._getFieldValueById(fieldId, originalValue);
        }
    }

    private _getValueFrom(from: RuleValueFrom, value: any): any {
        switch (from) {
            case RuleValueFrom.Clock:
                return new Date();
            case RuleValueFrom.CurrentUser:
                return this.workItem.store.getCurrentUserName();
            case RuleValueFrom.OtherFieldOriginalValue:
                return this._getFieldValue(<number>value, true);
            case RuleValueFrom.OtherFieldCurrentValue:
                return this._getFieldValue(<number>value, false);
            case RuleValueFrom.Value:
                return value;
            case RuleValueFrom.CurrentValue:
                return this.value;
            case RuleValueFrom.OriginalValue:
                return this.originalValue;
            default:
                return value;
        }
    }

    private _areValuesEqual(fieldId: number, value1: any, value2: any, caseInsensitive?: boolean, identityComparisonNeeded?: boolean): boolean {
        // Try convert boolean field data to 0 or 1.
        // We need this for proper comparison as rule values are stored as "true" or "false", not 1 or 0.
        if (this.workItem.fieldMapById[fieldId] && this.workItem.fieldMapById[fieldId].fieldDefinition.type == WITConstants.FieldType.Boolean) {
            value1 = this._translateToBoolData(value1);
            value2 = this._translateToBoolData(value2);
        }

        return Field.compareValues(value1, value2, caseInsensitive, identityComparisonNeeded);
    }

    private _translateToBoolData(value: any): any {
        return (value && (value == 1 || String(value).toLowerCase() === "true")) ? 1 : 0;
    }

    private _getAllowedValues(fieldId: number): string[] {
        return this.workItem.getField(fieldId).getAllowedValues();
    }
}

export class RuleEngine {

    private fieldRules: { [fieldId: string]: FieldRuleType[]; };
    private workItem: WorkItem;

    constructor(workItem: WorkItem, fieldRules: IFieldRule[]) {
        this.workItem = workItem;
        this.fieldRules = {};

        if (fieldRules) {
            // Merge all rules
            for (const fr of fieldRules) {
                const fieldIdStr = fr.fieldId + "";
                let oldRule = this.fieldRules[fieldIdStr];

                if (!oldRule) {
                    this.fieldRules[fieldIdStr] = oldRule = [];
                }

                oldRule.push("Block");
                oldRule.push([fr.rules]);
            }
        }
    }

    /**
     * Evaluate fields runs over a set of fieldIDs and runs the rules on that field id. look below at _evaluateFieldRule to see more about how this works
     * @param fieldIds
     */
    public evaluateFields(fieldIds: number[]): number[] {
        const evalState: IDictionaryStringTo<IEvalStateValue> = {};

        if (fieldIds) {
            for (const fieldId of fieldIds) {
                this._evaluateFieldRule(fieldId, evalState, false);
            }
        }

        return this._evalStateToChangedFields(evalState);
    }

    public evaluateField(fieldId: number, valueLocked?: boolean, prevValue?: any): number[] {
        const evalState: IDictionaryStringTo<IEvalStateValue> = {};

        this._evaluateFieldRule(fieldId, evalState, valueLocked, prevValue);

        return this._evalStateToChangedFields(evalState);
    }

    /**
     *  the important thing to notifce about this part is if you look below in _evaluateFieldRule, we create an evalState for every single field that we evaluated rules on, even if did not change.
     *  For work item save scenarios, this can be many more fields that even need to be notified, and it can be very unperformant to notify them all. So we only want to notify fields that have been changed by the
     *  save operation via rules or because those fields have actually changed.
     *  if you look at workItem.evaluate, which is what we call on save, in addition to running rules on the fields that have actually changed, we also run rules on a workItemTypes triggerList. What is the triggerList? Well if you look at
     *  WorkItemType definition in typescript, it gets triggerList from AdditionalWorkItemTypePropertiesFactory.cs, where triggerList is actually EVERY SINGLE FIELD THAT HAS A RULE ON IT!!!!

     * So, I'm pretty sure that this is yet another improvement that could be made. If we know which fields have actually changed, then we know which rules we need to run rules on. We don't need to run all rules every time.
     * But I'm not making that change right now because I'm not sure what that means, maybe more changes. But I think we should improve that part
     * @param evalState
     */
    private _evalStateToChangedFields(evalState: IDictionaryStringTo<IEvalStateValue>): number[] {

        const changedFields: number[] = [];

        for (const fid in evalState) {
            if (evalState.hasOwnProperty(fid)) {

                if (dontNotifyAllFieldsOnSave()) {
                    if (evalState[fid].requiresControlUpdate) {
                        changedFields.push(+fid);
                    }
                } else {
                    changedFields.push(+fid);
                }
            }
        }

        return changedFields;
    }

    /**
     * This function evaluates all the rules for a certain field id, Each time we run the rules on a field, we create an evalState for that fieldId. The eval state contains a 'state', which is a boolean true false if the
     * field has been evaluated or not, a prevValue, and another boolean flag called requiresControlUpdate. We mark this flag as true if a fieldId has been changed by rules, or if the field itself has been changed, which happens on a
     * scenario where someone is just editing their work item in the form
     * @param fieldId
     * @param evalState
     * @param valueLocked
     * @param prevValue
     */
    private _evaluateFieldRule(fieldId: number, evalState: IDictionaryStringTo<IEvalStateValue>, valueLocked?: boolean, prevValue?: any) {
        const field = this.workItem.getField(fieldId);

        if (field) {
            const fieldIdStr = fieldId + "";

            const fieldValue = field._getValue();

            let fieldPreviouslyChangedByRule = false;

            // something to notice here is that the rule engine has depths of recursion where changing one field can cause trigger rule to change another field which causes trigger rule to change another field
            // what we really are doing here is building up a list of fields we know have changed so we can notify the controls of their updated state, so we want to make sure if a control is updated we update it even if rules 
            // are run again on that field id. for more info go here: https://vsowiki.com/index.php?title=Work_Item_Tracking_Rules
            if (evalState[fieldIdStr] && evalState[fieldIdStr].requiresControlUpdate) {
                fieldPreviouslyChangedByRule = true;
            }

            evalState[fieldIdStr] =
                {
                    state: true,
                    prevValue: (prevValue === undefined) ? fieldValue : prevValue,
                    requiresControlUpdate: false || fieldPreviouslyChangedByRule
                };

            const fieldRuleEvaluator = new RuleEvaluator(fieldId, this.workItem, field, fieldValue, field._getValue(true), valueLocked || false, evalState);
            fieldRuleEvaluator.evaluate(this.fieldRules[fieldIdStr]);

            let evaluateTriggerFields: boolean;

            if (valueLocked) {
                // when value is locked field value is changed
                evaluateTriggerFields = true;
            } else {
                // only trigger fields if the field value has changed
                evaluateTriggerFields = !Field.compareValues(fieldValue, field._getValue());
            }

            // if the value has changed we need to notify this control of update (there can be multiple controls that have the same field id)
            if (evaluateTriggerFields) {
                evalState[fieldIdStr].requiresControlUpdate = true;
            }

            if (evaluateTriggerFields && fieldRuleEvaluator.triggerFields) {
                $.each(fieldRuleEvaluator.triggerFields, (i: number, triggerFieldId: number) => {
                    const fieldEvalState = evalState[triggerFieldId + ""];

                    if (!fieldEvalState || !fieldEvalState.state) {
                        this._evaluateFieldRule(triggerFieldId, evalState, false);
                    }
                });
            }

            evalState[fieldIdStr].state = false;
        }
    }
}

export class ServerDefaultValue {

    public type: ServerDefaultValueType = ServerDefaultValueType.None;
    public value: any;

    constructor(type: ServerDefaultValueType, originalValue: any) {
        this.type = type;
        this.value = originalValue;
    }

    public toString(): string {
        return "" + this.value;
    }

    public valueOf(): any {
        return this.value;
    }
}

/**
 * make up a key to fieldvalidationMap which is meant to prevent duplicate server requests
 */
export class FieldValidationKey {
    public fieldId: number;
    public fieldValue: any;
    public scope: WorkItemIdentityScope;

    constructor(fieldId: number, fieldValue: any, scope: WorkItemIdentityScope) {
        this.fieldId = fieldId;
        this.fieldValue = fieldValue;
        this.scope = scope;
    }

    public toString(): string {
        return JSON.stringify({
            fieldId: this.fieldId,
            fieldValue: this.fieldValue,
            scope: {
                filterByScope: FilterByScope.GetHashCode(this.scope),
                nonIdentities: this.scope && this.scope.nonIdentities,
                excludeGroups: this.scope && this.scope.excludeGroups
            }
        });
    }

    public equals(key: FieldValidationKey): boolean {
        return key.toString() === this.toString();
    }
}

export class WorkItemIdentityScope extends FilterByScope {
    public nonIdentities: string[];
    public displayNames: string[];
    public excludeGroups: boolean;
    constructor(filterByAncestorEntityIds?: string[], filterByEntityIds?: string[], nonIdentities?: string[], displayNames?: string[], excludeGroups?: boolean) {
        super(filterByAncestorEntityIds, filterByEntityIds);
        this.nonIdentities = nonIdentities || [];
        this.displayNames = displayNames || [];
        this.excludeGroups = excludeGroups || false;
    }

    public static equals(filterByScope1: WorkItemIdentityScope, filterByScope2: WorkItemIdentityScope): boolean {
        if (filterByScope1 == null && filterByScope2 == null) {
            return true;
        }
        if (FilterByScope.GetHashCode(filterByScope1) !== FilterByScope.GetHashCode(filterByScope2)) {
            return false;
        }
        // FilterByScope GetHashCode only counts ancestorEntityIds and EntityIds
        // we cannot determine even if FilterByScope GetHashCode are the same
        const filterByScope1NonIdLength = filterByScope1.nonIdentities == null ? 0 : filterByScope1.nonIdentities.length;
        const filterByScope2NonIdLength = filterByScope2.nonIdentities == null ? 0 : filterByScope2.nonIdentities.length;
        if (filterByScope1NonIdLength != filterByScope2NonIdLength) {
            return false;
        }

        const filterByScope1NonIdentitiesStr = filterByScope1.nonIdentities == null ? "" : filterByScope1.nonIdentities.sort().join(",");
        const filterByScope2NonIdentitiesStr = filterByScope2.nonIdentities == null ? "" : filterByScope2.nonIdentities.sort().join(",");

        return Utils_String.equals(filterByScope1NonIdentitiesStr, filterByScope2NonIdentitiesStr, true);
    }
}

const WorkItemDataTelemetryFeature = "WITData";

/**
 * Responsibility is to fetch work item data from data sources utilizing client-side caching.
 */
export class WorkItemDataManager {
    /** Use cached resolved promise for performance reasons */
    private static _resolvedPromise = Promise.resolve(null);

    private readonly _tfsContext: TFS_Host_TfsContext.TfsContext;

    private readonly _cacheStampManager: WorkItemMetadataCacheStampManager;
    private readonly _cacheProvider: ICacheProvider | undefined;
    private readonly _cacheInformationManager: WorkItemMetadataCacheInformationManager;

    private readonly _dataSources: IWorkItemDataSource[];
    private _telemetryCaptured: boolean = false;

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext, cacheStampManager: WorkItemMetadataCacheStampManager) {
        this._tfsContext = tfsContext;
        this._cacheStampManager = cacheStampManager;

        var useIndexedDbCaching = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessWorkItemTrackingIndexedDBCaching);

        if (useIndexedDbCaching) {
            this._cacheProvider = constructCacheProvider();
            this._cacheInformationManager = new WorkItemMetadataCacheInformationManager();
        }

        this._dataSources = getDataSources(tfsContext, cacheStampManager, this._cacheInformationManager);
    }

    public beginGetWorkItemData(ids: number[], isDeleted?: boolean, includeInRecentActivity?: boolean, includeHistory?: boolean): Promise<IWorkItemData[]> {
        // Data for an actual work item should never be cached, just call the data sources
        return this._getDataFromSource<IWorkItemData[]>(
            ds => ds.beginGetWorkItemData(this._tfsContext.navigation.projectId, ids, isDeleted, includeInRecentActivity, includeHistory)
        );
    }

    public beginGetLinkTypes(): Promise<ILinkTypes> {
        return this._getDataWithCache<ILinkTypes>(
            this._tfsContext.navigation.collection.instanceId,
            WITConstants.WITCommonConstants.LinkTypes,
            "_",
            (dataSource) => dataSource.beginGetLinkTypes()
        );
    }

    public beginGetFieldProjectData(projectIdOrName: string): Promise<IFieldProjectData> {
        return this._getDataWithCache<IFieldProjectData>(
            projectIdOrName,
            WITConstants.WITCommonConstants.TeamProjects,
            projectIdOrName,
            (dataSource) => dataSource.beginGetFieldProjectData(projectIdOrName)
        );
    }

    public beginGetFields(): Promise<IFieldEntry[]> {
        return this._getDataWithCache<IFieldEntry[]>(
            this._tfsContext.navigation.collection.instanceId,
            WITConstants.WITCommonConstants.Fields,
            "_",
            (dataSource) => dataSource.beginGetFields()
        );
    }

    public beginGetWorkItemTypeData(projectId: string, typeNames: string[]): IPromise<IWorkItemTypeData[]> {
        this._captureTelemetry();

        if (typeNames.length === 1) {
            return this._getDataWithCache(
                projectId,
                WITConstants.WITCommonConstants.WorkItemTypes,
                typeNames[0],
                (dataSource) => dataSource.beginGetWorkItemTypeData(projectId, typeNames)
            );
        }

        // If multiple work item types are requested, always request from the data source, but store in cache
        return this._getDataFromSource(ds => ds.beginGetWorkItemTypeData(projectId, typeNames))
            .then(workItemTypes => {
                return this._cacheStampManager.getMetadataCacheStamp(WITConstants.WITCommonConstants.WorkItemTypes)
                    .then(stamp => Promise
                        .all(workItemTypes.map(workItemType => this._cacheData(projectId, WITConstants.WITCommonConstants.WorkItemTypes, this._transformKey(workItemType.name), stamp, [workItemType])))
                        .then(() => workItemTypes));
            });
    }

    // do not invoke this in ctor because it requires a perf scenario to be active
    private _captureTelemetry(): void {
        if (!this._telemetryCaptured) {
            const useIndexedDbCache = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessWorkItemTrackingIndexedDBCaching);
            const useDataProviders = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessWorkItemTrackingWorkItemFormDataProviders);
            PerfScenarioManager.addData({
                [`${CIConstants.PerformanceEvents.WORKITEMTRACKING_CACHING}.USE_DATA_PROVIDERS`]: useDataProviders,
                [`${CIConstants.PerformanceEvents.WORKITEMTRACKING_CACHING}.CACHING_ENABLED`]: useIndexedDbCache
            });
            this._telemetryCaptured = true;
        }
    }

    private _getDataWithCache<T>(
        scopeId: string,
        type: string,
        key: string,
        getData: (dataSource: IWorkItemDataSource) => null | Promise<T>
    ): Promise<T> {
        key = this._transformKey(key);

        // First, get current cache stamp
        return (this._cacheStampManager.getMetadataCacheStamp(type) as Promise<string>)
            .then(stamp => {
                if (!stamp) {

                    // This should not happen, nevertheless, try to continue without caching
                    traceMessage(
                        CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                        "GetMetadataCachestamp",
                        CIConstants.WITCustomerIntelligenceFeature.WIT_CACHE_PROVIDER_INIT,
                        `Could not get cache stamp for '${type}'`
                    );
                }

                return this._tryGetDataFromCache<T>(scopeId, type, key, stamp)
                    .catch(reason => {
                        // We do not want to fail when we cannot write to the cache. Report error and continue
                        traceMessage(
                            CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                            "TryGetDataFromCache",
                            CIConstants.WITCustomerIntelligenceFeature.WIT_CACHE_PROVIDER_INIT,
                            reason
                        );

                        return null;
                    })
                    .then(data => {
                        if (!data) {
                            // Try get data from data sources
                            return this._getDataFromSource<T>(getData).then(dataFromSource => ({
                                resolvedFromCache: false,
                                data: dataFromSource
                            }));
                        }

                        return {
                            resolvedFromCache: true,
                            data
                        };
                    })
                    .then(({ resolvedFromCache, data }) => {
                        if (data && !resolvedFromCache) {
                            // We retrieved data, update the cache, and ensure we wait until we hand the data back
                            return this._cacheData(scopeId, type, key, stamp, data)
                                .catch(reason => {
                                    // Do not fail when caching fails
                                    publishErrorToTelemetry(new Error(reason));
                                })
                                .then(() => data);
                        }

                        return data;
                    });
            });
    }

    private _tryGetDataFromCache<T>(scopeId: string, type: string, key: string, stamp: string): Promise<T> {
        if (!this._cacheProvider || !stamp) {
            return WorkItemDataManager._resolvedPromise;
        }

        return this._cacheProvider.read<T>(scopeId, type)
            .then(cacheData => {
                if (!cacheData || !cacheData.data[key]) {
                    // Nothing was cached for the given type, or the required key was not cached
                    this._recordTelemetry(scopeId, type, key, stamp, "CacheMiss");

                    return null;
                }

                if (cacheData.cachestamp !== stamp) {
                    // Cached data is stale, cannot use it, clear from cache
                    this._recordTelemetry(scopeId, type, key, stamp, "ClearedCachedStaleData");

                    return this._cacheProvider
                        .delete(scopeId, type)
                        .then(() => null);
                }

                this._recordTelemetry(scopeId, type, key, stamp, "CacheHit", null);

                return cacheData.data[key];
            });
    }

    private _cacheData<T>(scopeId: string, type: string, key: string, stamp: string, data: T): Promise<void> {
        if (!this._cacheProvider || !stamp) {
            // If caching is disabled or no stamp is provided, do not try to cache
            return WorkItemDataManager._resolvedPromise;
        }

        let cachedKeys: string[] = null;

        return this._cacheProvider.update<T>(
            scopeId,
            type,
            cacheData => {
                if (!cacheData || cacheData.cachestamp !== stamp) {
                    // Either no data had been cached, or the cache stamp doesn't match, create new entry
                    cacheData = {
                        cachedAt: Date.now(),
                        cachestamp: stamp,
                        data: {
                            [key]: data
                        }
                    };
                } else {
                    cacheData = {
                        ...cacheData,
                        data: {
                            ...cacheData.data,
                            [key]: data
                        }
                    };
                }

                // Save keys for cookie use
                cachedKeys = Object.keys(cacheData.data);

                return cacheData;
            })
            .then(() => {
                if (cachedKeys && this._cacheInformationManager) {
                    // Update cookie with new cache stamp
                    this._cacheInformationManager.persist(scopeId, type, cachedKeys, stamp);
                }
            });
    }

    private async _getDataFromSource<T>(getData: (dataSource: IWorkItemDataSource) => Promise<T>, dataSourceIndex: number = 0): Promise<T> {
        const continueWithNextDataSource = () => {
            // Try the next data source, if there is one
            if (dataSourceIndex + 1 < this._dataSources.length) {
                return this._getDataFromSource(getData, dataSourceIndex + 1);
            }

            return null;
        };

        const dataFromSource = getData(this._dataSources[dataSourceIndex]);
        if (!dataFromSource) {
            return continueWithNextDataSource();
        } else {
            const data = await dataFromSource;
            if (!data) {
                return continueWithNextDataSource();
            }

            return data;
        }
    }

    private _transformKey(key: string): string {
        return key.toLowerCase();
    }

    private _recordTelemetry(scopeId: string, type: string, key: string, stamp: string, message: string, cachedData?: any) {
        const useIndexedDbCache = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessWorkItemTrackingIndexedDBCaching);
        const useDataProviders = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessWorkItemTrackingWorkItemFormDataProviders);

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING, WorkItemDataTelemetryFeature, {
            scopeId,
            type,
            key,
            stamp,
            message,
            useIndexedDbCache,
            useDataProviders,
            cachedData
        }));
    }
}

registerLinkForms();

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.WorkItemTracking", exports);
