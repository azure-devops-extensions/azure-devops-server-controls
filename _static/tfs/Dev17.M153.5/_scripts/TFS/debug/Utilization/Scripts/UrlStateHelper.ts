
import Navigation_Services = require("VSS/Navigation/Services");
import Utils_Array = require("VSS/Utils/Array");
import Culture = require("VSS/Utils/Culture");
import Utils_Date = require("VSS/Utils/Date");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Resources = require("Utilization/Scripts/Resources/TFS.Resources.Utilization");
import { UtilizationStatus, UtilizationColumn, CommandUsage, UsageSummaryQueryCriteria, EntityType } from "Utilization/Scripts/Generated/Contracts";

// A structure that holds all the information about the current query parameters and page state. Two queries are equivalent if they
// are memberwise-equal in this interface.
export interface IUrlState {
    tab: string;
    queryDate: string;
    timeBin: string;
    identity: string;
    keywords: string;
    status: string;
    tstus: number;
    columns: string;
    services: string[];
    definition: string;
}

export interface IUrlStateValidation {
    valid: boolean;
}

// Available pivot tabs, currently {all usage, top users, top user agents, top commands}
export const PivotTabKey = {
    browse: "browse",
    pipelines: "pipelines",
    users: "users",
    userAgents: "useragents",
    commands: "commands",
    topBuildPipelines: "topbuildpipelines",
    topReleasePipelines: "topreleasepipelines"
}

export const PivotTabKeys = [PivotTabKey.browse, PivotTabKey.pipelines, PivotTabKey.users, PivotTabKey.userAgents, PivotTabKey.commands, PivotTabKey.topBuildPipelines, PivotTabKey.topReleasePipelines];

export const PipelineQueryableService = {
    build: "Build",
    release: "Release"
};

export const PipelineQueryableServices = [PipelineQueryableService.build, PipelineQueryableService.release];

// QueryDates are the available options in the timerange picker. The last option is custom, which is handled specially.
export const QueryDateKeys = ["lasthour", "last4hours", "last24hours", "last7days", "last28days", "custom"];
export const QueryDateNames: { [key: string]: string } = {};
QueryDateNames["lasthour"] = Resources.QueryDate_LastHour;
QueryDateNames["last4hours"] = Resources.QueryDate_Last4Hours;
QueryDateNames["last24hours"] = Resources.QueryDate_Last24Hours;
QueryDateNames["last7days"] = Resources.QueryDate_Last7Days;
QueryDateNames["last28days"] = Resources.QueryDate_Last28Days;
QueryDateNames["custom"] = Resources.QueryDate_Custom;

// Available TimeBin options.
export const TimeBinKeys = ["00:05:00", "01:00:00"];
export const TimeBinNames: { [key: string]: string } = {};
TimeBinNames["00:05:00"] = Resources.TimeBin_300;
TimeBinNames["01:00:00"] = Resources.TimeBin_3600;

// Available status options.
export const StatusKeys = ["all", "normal", "delayed", "blocked"];
export const StatusNames: { [key: string]: string } = {};
StatusNames["all"] = Resources.Status_All;
StatusNames["normal"] = Resources.Status_Normal;
StatusNames["delayed"] = Resources.Status_Delayed;
StatusNames["blocked"] = Resources.Status_Blocked;

// Available columns. Count, Usage, and Delay are always visible and cannot be deselected.
export const Columns: UtilizationColumn[] = [UtilizationColumn.User, UtilizationColumn.UserAgent, UtilizationColumn.IpAddress,
UtilizationColumn.StartTime, UtilizationColumn.Service, UtilizationColumn.Application, UtilizationColumn.Command, UtilizationColumn.Status,
UtilizationColumn.Count, UtilizationColumn.Usage, UtilizationColumn.Delay, UtilizationColumn.Definition, UtilizationColumn.Instance];

export const ColumnsForPipelines: UtilizationColumn[] = [UtilizationColumn.StartTime, UtilizationColumn.Definition, UtilizationColumn.Instance, UtilizationColumn.Service, UtilizationColumn.Application, UtilizationColumn.Command, UtilizationColumn.Status,
UtilizationColumn.Count, UtilizationColumn.Usage, UtilizationColumn.Delay];

export const ColumnsForUser: UtilizationColumn[] = [UtilizationColumn.User, UtilizationColumn.UserAgent, UtilizationColumn.IpAddress,
UtilizationColumn.StartTime, UtilizationColumn.Service, UtilizationColumn.Application, UtilizationColumn.Command, UtilizationColumn.Status,
UtilizationColumn.Count, UtilizationColumn.Usage, UtilizationColumn.Delay];


export const ColumnKeys: { [key: number]: string } = {};
ColumnKeys[UtilizationColumn.User] = "user";
ColumnKeys[UtilizationColumn.UserAgent] = "userAgent";
ColumnKeys[UtilizationColumn.IpAddress] = "ipAddress";
ColumnKeys[UtilizationColumn.StartTime] = "startTime";
ColumnKeys[UtilizationColumn.Service] = "service";
ColumnKeys[UtilizationColumn.Application] = "application";
ColumnKeys[UtilizationColumn.Command] = "command";
ColumnKeys[UtilizationColumn.Status] = "status";
ColumnKeys[UtilizationColumn.Count] = "count";
ColumnKeys[UtilizationColumn.Usage] = "usage";
ColumnKeys[UtilizationColumn.Delay] = "delay";
ColumnKeys[UtilizationColumn.Definition] = "definition";
ColumnKeys[UtilizationColumn.Instance] = "instance";

export const AlwaysVisibleColumns: UtilizationColumn[] = [UtilizationColumn.Count, UtilizationColumn.Usage, UtilizationColumn.Delay];
export const ColumnNames: { [key: string]: string } = {};
ColumnNames[UtilizationColumn.User] = Resources.Column_User;
ColumnNames[UtilizationColumn.UserAgent] = Resources.Column_UserAgent;
ColumnNames[UtilizationColumn.IpAddress] = Resources.Column_IPAddress;
ColumnNames[UtilizationColumn.StartTime] = Resources.Column_TimeRange;
ColumnNames[UtilizationColumn.Service] = Resources.Column_Service;
ColumnNames[UtilizationColumn.Application] = Resources.Column_Application;
ColumnNames[UtilizationColumn.Command] = Resources.Column_Command;
ColumnNames[UtilizationColumn.Status] = Resources.Column_Status;
ColumnNames[UtilizationColumn.Count] = Resources.Column_Count;
ColumnNames[UtilizationColumn.Usage] = Resources.Column_UsageTSTUs;
ColumnNames[UtilizationColumn.Delay] = Resources.Column_Delay;
ColumnNames[UtilizationColumn.Definition] = Resources.Column_Definition;
ColumnNames[UtilizationColumn.Instance] = Resources.Column_Instance;

export function getRecordLimitForUI(): number {
    return 250;
}

export function getRecordLimitForExport(): number {
    return 10000;
}

export function setUsingNormalizedColumns() {
    // Overwrite these two column names to be Referrer/Operation instead of Application/Command. This happens if FF "Utilization.UsageSummary.NormalizedColumns" is set
    ColumnNames[UtilizationColumn.Application] = Resources.Column_Webpage;
}

export function getAvailableColumns(userIsPCA: boolean, queryableServices: string[]): string[] {
    let availableColumns: string[] = [];
    if (userIsPCA) {
        availableColumns.push("user");
    }
    availableColumns.push("userAgent", "ipAddress", "startTime");
    if (queryableServices.length > 1) {
        availableColumns.push("service");
    }
    availableColumns.push("application", "command", "status");
    return availableColumns;
}

export function getDefaultColumns(userIsPCA: boolean, queryableServices: string[]): string[] {
    let defaultColumns: string[] = getAvailableColumns(userIsPCA, queryableServices);
    const index: number = defaultColumns.indexOf("ipAddress");
    if (index > -1) {
        defaultColumns.splice(index, 1); // In M134 IPAddress became a non-default column
    }
    return defaultColumns;
}

export function updateOldColumnPrefsToNewFormat(columnPrefs: string[]): string[] {
    // The old columnPrefs format was like "user,userAgent,ipAddress,startTime" and that meant to hide the application, command, and status.
    // The old columnPrefs didn't know about service.
    let newColumnPrefs: string[] = columnPrefs;
    if (columnPrefs.length > 0) {
        if (columnPrefs[0].substr(0, 1) !== "-" && columnPrefs[0].substr(0, 1) !== "+") {
            // This is the old format. Fix it.
            newColumnPrefs = ["-user", "-userAgent", "-ipAddress", "-startTime", "-application", "-command", "-status"];
            for (let i = 0; i < columnPrefs.length; i++) {
                let index: number = newColumnPrefs.indexOf("-" + columnPrefs[i]);
                if (index > -1) {
                    newColumnPrefs.splice(index, 1);
                }

            }
        }
    }
    return newColumnPrefs;
}

export function isTopPipelinesTab(tab: string): boolean {
    return tab === PivotTabKey.topBuildPipelines || tab === PivotTabKey.topReleasePipelines;
}

export function formColumnPrefs(visibleColumns: string[], userIsPCA: boolean, queryableServices: string[]): string[] {

    const availableColumns: string[] = getAvailableColumns(userIsPCA, queryableServices);
    const defaultColumns: string[] = getDefaultColumns(userIsPCA, queryableServices);
    let columnPrefs: string[] = [];
    for (let i = 0; i < availableColumns.length; i++) {
        const isDefaultColumn: boolean = defaultColumns.indexOf(availableColumns[i]) > -1;
        const isVisibleColumn: boolean = visibleColumns.indexOf(availableColumns[i]) > -1;
        if (isDefaultColumn !== isVisibleColumn) {
            columnPrefs.push((isVisibleColumn ? "+" : "-") + availableColumns[i]);
        }
    }
    return columnPrefs;
}

export function getDefaultQueryableServicesForUser(): string[] {
    return ["TFS"];
}

export function memberwiseEquals(urlState1: IUrlState, urlState2: IUrlState): boolean {
    return urlState1.queryDate === urlState2.queryDate &&
        urlState1.timeBin === urlState2.timeBin &&
        urlState1.identity === urlState2.identity &&
        urlState1.keywords === urlState2.keywords &&
        urlState1.status === urlState2.status &&
        urlState1.tstus === urlState2.tstus &&
        urlState1.columns === urlState2.columns &&
        urlState1.services.toString() === urlState2.services.toString() &&
        urlState1.definition === urlState2.definition
}

export function clone(source: IUrlState): IUrlState {
    return {
        tab: source.tab,
        queryDate: source.queryDate,
        timeBin: source.timeBin,
        identity: source.identity,
        keywords: source.keywords,
        status: source.status,
        tstus: source.tstus,
        columns: source.columns,
        services: source.services,
        definition: source.definition
    };
}

export function getDefaultState(userIsPCA: boolean, queryableServices: string[]): IUrlState {
    return {
        tab: PivotTabKeys[0],
        queryDate: QueryDateKeys[0],
        timeBin: TimeBinKeys[0],
        identity: TFS_Host_TfsContext.TfsContext.getDefault().currentIdentity.id,
        keywords: "",
        status: StatusKeys[0],
        tstus: 0,
        columns: getDefaultColumns(userIsPCA, queryableServices).join(","),
        services: queryableServices,
        definition: "",
    };
}

// Get the current IUrlState of the page from the URL.  If the URL is missing options, then default parameters are provided here.
export function readCurrentState(userIsPCA: boolean, columnPrefs: string[], userQueryableServices: string[], pipelineQueryableServices: string[], validation?: IUrlStateValidation): IUrlState {
    const queryParams = Navigation_Services.getHistoryService().getCurrentState();
    const defaultState = getDefaultState(userIsPCA, userQueryableServices);
    let valid = true;

    let tab = queryParams["tab"];
    if (!arrayContainsCaseInsensitive(PivotTabKeys, tab) || (!userIsPCA && tab === "users")) {
        tab = defaultState.tab;
        valid = false;
    }

    let queryableServices = getQueryableServicesFromPivotTab(tab, userQueryableServices);

    let queryDate = queryParams["queryDate"];
    if (queryDate === "custom" || !arrayContainsCaseInsensitive(QueryDateKeys, queryDate) && !queryDateIsValidCustomTimeRange(queryDate)) { // the literal string "custom" is not a valid parameter even though it is a member of QueryDateKeys.
        queryDate = defaultState.queryDate;
        valid = false;
    }

    let timeBin = queryParams["timeBin"];
    if (!arrayContainsCaseInsensitive(TimeBinKeys, timeBin)) {
        timeBin = defaultState.timeBin;
        valid = false;
    }

    let identity = queryParams["identity"];
    if (identity === undefined) {
        identity = defaultState.identity;
        valid = false;
    }

    let keywords = queryParams["keywords"];
    if (keywords === undefined) {
        keywords = defaultState.keywords;
        valid = false;
    }

    let status = queryParams["status"];
    if (!arrayContainsCaseInsensitive(StatusKeys, status)) {
        status = defaultState.status;
        valid = false;
    }

    let tstus: number = Utils_Number.parseInvariant(String(queryParams["tstus"]));
    if (isNaN(tstus)) {
        tstus = defaultState.tstus;
        valid = false;
    }

    let columns = queryParams["columns"];
    if (columns === undefined) {
        columns = getColumnsFromPivotTab(tab, userIsPCA, columnPrefs, queryableServices).join(","); // not necessarily the same as defaultState.columns
        valid = false;
    }

    let services = queryParams["services"];

    if (services) {
        services = mapUrlQueryParamServiceToQueryableServices(services.split(","), queryableServices);
    }

    if (!services) {
        // If no services are provided in url, then query all available services
        services = queryableServices;
        valid = false;
    }

    let definition = queryParams["definition"];
    if (definition === undefined) {
        definition = defaultState.definition;
        valid = false;
    }

    let urlState: IUrlState = {
        tab: tab,
        queryDate: queryDate,
        timeBin: timeBin,
        identity: identity,
        keywords: keywords,
        status: status,
        tstus: tstus,
        columns: columns,
        services: services,
        definition: definition
    };

    // retroactively set keywords to empty string if the columns don't support keywords.
    if (!shouldKeywordsBeEnabled(urlState) && !!urlState.keywords) {
        urlState.keywords = "";
        valid = false;
    }

    if (validation) {
        validation.valid = valid;
    }

    return urlState;
}

// Query Params for services contain various capitalization issues, so creating a map to avoid mismatches and select the proper dropdown service
export function mapUrlQueryParamServiceToQueryableServices(services: string[], queryableServices: string[]): string[] {
    let matchedServicesList = [];
    let queryableServicesMap = {};
    for (let i = 0; i < queryableServices.length; i++) {
        queryableServicesMap[queryableServices[i].toLowerCase()] = queryableServices[i];
    }

    for (let i = 0; i < services.length; i++) {
        let match = queryableServicesMap[services[i].toLowerCase()];

        // If a service in the URL does not match, then do not select it from the drop down
        if (match) {
            matchedServicesList[i] = match;
        }
    }

    return matchedServicesList;

}

export function getQueryableServicesFromPivotTab(tab: string, userQueryableServices: string[]): string[] {
    if (isPipelineTab(tab)) {
        return PipelineQueryableServices;
    } else {
        return userQueryableServices;
    }
}

export function getColumnsFromPivotTab(tab: string, userIsPCA: boolean, columnPrefs: string[], queryableServices: string[]): string[] {
    let columns: string[] = [];
    switch (tab) {
        case PivotTabKey.users:
            columns = ["user"];
            break;

        case PivotTabKey.userAgents:
            columns = ["userAgent"];
            break;

        case PivotTabKey.commands:
            if (queryableServices.length > 1) {
                columns.push("service");
            }
            columns.push("command");
            break;

        case PivotTabKey.pipelines:
            columns.push("startTime", "definition", "instance", "service", "application", "command", "status");
            break;
        case PivotTabKey.topBuildPipelines:
        case PivotTabKey.topReleasePipelines:
            columns.push("startTime", "definition", "application", "command", "status");
            break;
        case PivotTabKey.browse:
        default:
            const availableColumns: string[] = getAvailableColumns(userIsPCA, queryableServices);
            const defaultColumns: string[] = getDefaultColumns(userIsPCA, queryableServices);
            for (let i = 0; i < availableColumns.length; i++) {
                const isDefaultColumn: boolean = defaultColumns.indexOf(availableColumns[i]) > -1;
                const preferHide: boolean = columnPrefs.indexOf("-" + availableColumns[i]) > -1;
                const preferShow: boolean = columnPrefs.indexOf("+" + availableColumns[i]) > -1;
                if ((isDefaultColumn && !preferHide) || (!isDefaultColumn && preferShow)) {
                    columns.push(availableColumns[i]);
                }
            }
            break;
    }
    return columns;
}

export function changeUrlStateFromPivotTab(urlState: IUrlState, newTab: string, userIsPCA: boolean, columnPrefs: string[], queryableServices: string[]) {
    urlState.tab = newTab;
    urlState.columns = getColumnsFromPivotTab(urlState.tab, userIsPCA, columnPrefs, queryableServices).join(",");

    switch (urlState.tab) {
        case PivotTabKey.users:
        case PivotTabKey.userAgents:
        case PivotTabKey.commands:
            urlState.keywords = "";
            urlState.status = "all";
            urlState.tstus = 0;
            urlState.services = queryableServices;
            urlState.identity = userIsPCA ? "" : TFS_Host_TfsContext.TfsContext.getDefault().currentIdentity.id;
            break;
        case PivotTabKey.pipelines:
            urlState.keywords = "";
            urlState.status = "all";
            urlState.tstus = 0;
            urlState.services = PipelineQueryableServices
            break;
        case PivotTabKey.topBuildPipelines:
            urlState.keywords = "";
            urlState.status = "all";
            urlState.tstus = 0;
            urlState.services = [PipelineQueryableService.build];
            break;
        case PivotTabKey.topReleasePipelines:
            urlState.keywords = "";
            urlState.status = "all";
            urlState.tstus = 0;
            urlState.services = [PipelineQueryableService.release];
            break;

        case PivotTabKey.browse:
        default:
            urlState.services = queryableServices;
            urlState.identity = userIsPCA ? "" : TFS_Host_TfsContext.TfsContext.getDefault().currentIdentity.id;
            // keep the same filters whatever they were, but restore columns to your user preferences (above)
            break;
    }
}

/**
 * Example: utcString = "2016-07-05T04:00:00" with client timezone EDT.
 * parseDateString returns 04:00 EDT, which isn't physically meaningful.
 * shiftToLocal returns 00:00 EDT, which is correct again.
 */
export function convertUTCStringToLocalDate(utcString: string): Date {
    if (utcString.charAt(utcString.length - 1) === "Z") {
        return Utils_Date.parseDateString(utcString, null, true); // if the string is in ISO format, parseDateString does the right thing
    }
    const intermediateDate = Utils_Date.parseDateString(utcString, null, true);
    return intermediateDate ? Utils_Date.shiftToLocal(intermediateDate) : null;
}

export function getStartAndEndTimesInClientTimeZone(queryDate: string) {
    let startTime: Date;
    let endTime: Date;

    switch (queryDate) {
        case "lasthour":
            endTime = new Date(); // Trust the client's (local computer)'s clock to return NOW in local time.
            startTime = Utils_Date.addHours(endTime, -1);
            break;

        case "last4hours":
            endTime = new Date();
            startTime = Utils_Date.addHours(endTime, -4);
            break;

        case "last24hours":
            endTime = new Date();
            startTime = Utils_Date.addHours(endTime, -24);
            break;

        case "last7days":
            endTime = new Date();
            startTime = Utils_Date.addDays(endTime, -7);
            break;

        case "last28days":
            endTime = new Date();
            startTime = Utils_Date.addDays(endTime, -28);
            break;

        default:
            return getCustomStartAndEndTimesInClientTimeZone(queryDate);
    }

    return {
        startTime: stripSecondsFromDate(startTime),
        endTime: stripSecondsFromDate(endTime)
    };
}

export function shouldColumnOptionsBeEnabled(urlState: IUrlState): boolean {
    return urlState.tab === PivotTabKey.browse || urlState.tab == PivotTabKey.pipelines;
}

export function getColumnsForTab(pivotTab): UtilizationColumn[] {
    return isPipelineTab(pivotTab) ? ColumnsForPipelines: ColumnsForUser;
}

export function shouldKeywordsBeEnabled(urlState: IUrlState): boolean {
    const cols: UtilizationColumn[] = urlState.columns.toLowerCase().split(',').map(x => getUtilizationColumnFromString(x));
    return cols.indexOf(UtilizationColumn.UserAgent) > -1 ||
        cols.indexOf(UtilizationColumn.IpAddress) > -1 ||
        cols.indexOf(UtilizationColumn.Application) > -1 ||
        cols.indexOf(UtilizationColumn.Command) > -1 ||
        cols.indexOf(UtilizationColumn.Instance) > -1;

}

export function shouldIdentityFieldBePresent(urlState: IUrlState): boolean {
    return !isPipelineTab(urlState.tab);
}

export function shouldDefinitionFieldBePresent(urlState: IUrlState): boolean {
    return isPipelineTab(urlState.tab);
}


export function isPipelineTab(tabKey: string): boolean {
    const pipelineTabs = [PivotTabKey.pipelines, PivotTabKey.topBuildPipelines, PivotTabKey.topReleasePipelines];

    return pipelineTabs.some((arrayValue) => { return tabKey == arrayValue; })
}


export function getStatusEnumFromString(key: string): UtilizationStatus {
    switch (key) {
        case "normal":
            return UtilizationStatus.Normal;

        case "delayed":
            return UtilizationStatus.Delayed;

        case "blocked":
            return UtilizationStatus.Blocked;

        case "all":
        default:
            return UtilizationStatus.All;
    }
}

export function getUtilizationColumnFromString(key: string): UtilizationColumn {
    switch (key.toLowerCase()) {
        case "user":
            return UtilizationColumn.User;

        case "useragent":
            return UtilizationColumn.UserAgent;

        case "ipaddress":
            return UtilizationColumn.IpAddress;

        case "starttime":
            return UtilizationColumn.StartTime;

        case "service":
            return UtilizationColumn.Service;

        case "application":
            return UtilizationColumn.Application;

        case "command":
            return UtilizationColumn.Command;

        case "status":
            return UtilizationColumn.Status;

        case "count":
            return UtilizationColumn.Count;

        case "usage":
            return UtilizationColumn.Usage;

        case "delay":
            return UtilizationColumn.Delay;

        case "definition":
            return UtilizationColumn.Definition;

        case "instance":
            return UtilizationColumn.Instance;

        default:
            return UtilizationColumn.Unknown;
    }
}

export function getStringifiedEntry(item: CommandUsage, queryCriteria: UsageSummaryQueryCriteria, column: UtilizationColumn) {
    if (column === UtilizationColumn.StartTime) {
        const startTime = Utils_Date.convertClientTimeToUserTimeZone(item.startTime);
        const endTime = Utils_Date.addHours(startTime, _getDurationInSeconds(queryCriteria.timeBucket) / 3600.0); // Note: don't use getDurationInHours because it's not precise enough.
        const dateTimeFormat: Culture.IDateTimeFormatSettings = Culture.getDateTimeFormat();
        return Utils_Date.format(startTime, dateTimeFormat.ShortDatePattern) + " " + Utils_Date.format(startTime, dateTimeFormat.ShortTimePattern) + " - " +
            Utils_Date.format(endTime, Culture.getDateTimeFormat().ShortTimePattern);
    }
    else if (column === UtilizationColumn.Status) {
        if (item.detailedStatus) {
            const [status, reason] = item.detailedStatus.split('/');
            let stringifyStatus: string, stringifyReason: string;
            if (status.toLowerCase() === "blocked") {
                stringifyStatus = Resources.Status_Blocked;
            }
            else if (status.toLowerCase() === "delayed") {
                stringifyStatus = Resources.Status_Delayed;
            }
            if (reason) {
                switch (reason.toLowerCase()) {
                    case "concurrent":
                        stringifyReason = Resources.Status_Concurrent;
                        break;
                    case "concurrenttimeout":
                        stringifyReason = Resources.Status_ConcurrentTimeout;
                        break;
                    case "long":
                        stringifyReason = Resources.Status_Long;
                        break;
                    case "short":
                        stringifyReason = Resources.Status_Short;
                        break;
                }
            }
            if (stringifyStatus) {
                return stringifyStatus + (stringifyReason ? ` (${stringifyReason})` : '');
            }
        }
        return Resources.Status_Normal;
    }
    else if (column === UtilizationColumn.Usage) {
        return Utils_Number.localeFormat(item.usage, "n3");
    }
    else if (column === UtilizationColumn.Delay) {
        return Utils_Number.localeFormat(0.001 * item.delay, "n3"); // convert to seconds
    }
    else {
        return item[ColumnKeys[column]];
    }
}

export function getQueryCriteria(urlState: IUrlState, recordLimit: number): UsageSummaryQueryCriteria {
    const startAndEndTimes = getStartAndEndTimesInClientTimeZone(urlState.queryDate); // this needs to be in client time zone that it gets converted properly to UTC when passed through to the service
    let columns: UtilizationColumn[] = [];
    if (urlState.columns != "") {
        columns = urlState.columns.split(',').map(x => getUtilizationColumnFromString(x));
    }

    const queryCriteria = <UsageSummaryQueryCriteria>{
        userId: urlState.identity,
        startTime: startAndEndTimes.startTime,
        endTime: startAndEndTimes.endTime,
        timeBucket: urlState.timeBin,
        keywords: urlState.keywords,
        status: getStatusEnumFromString(urlState.status),
        tSTUFloor: urlState.tstus,
        columns: columns,
        services: urlState.services.join(","),
        recordLimit: recordLimit,
        definitionSearchString : urlState.definition,
        entity:isPipelineTab(urlState.tab) ? EntityType.Pipeline : EntityType.User
    };

    return queryCriteria;
}

export function escapeForCsv(entry: string, col: UtilizationColumn): string {
    if (col === UtilizationColumn.Count || col === UtilizationColumn.Usage || col === UtilizationColumn.Delay) {
        if (String(entry).indexOf(",") > -1) {
            return "\"" + entry + "\"";
        }
        else {
            return entry;
        }
    }
    else {
        return "\"" + entry.replace(/"/g, "\"\"") + "\"";
    }
}

function stripSecondsFromDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), 0);
}

function arrayContainsCaseInsensitive(array: string[], item: string): boolean {
    return Utils_Array.contains(array, item, (x, y) => Utils_String.localeIgnoreCaseComparer(x, y));
}

function queryDateIsValidCustomTimeRange(queryDate: string): boolean {
    const startAndEndTimes = getCustomStartAndEndTimesInClientTimeZone(queryDate);
    if (startAndEndTimes.startTime != null && startAndEndTimes.endTime != null) {
        return true;
    }
    return false;
}

function getCustomStartAndEndTimesInClientTimeZone(queryDate: string) {
    let startTime: Date;
    let endTime: Date;

    if (queryDate) {
        const times: string[] = queryDate.split(',');
        if (times.length > 1) {
            startTime = convertUTCStringToLocalDate(times[0]);
            endTime = convertUTCStringToLocalDate(times[1]);
        }
        else {
            // This is how the date was provided in V1 of the usage page when you were emailed via ThrottlingNotificationservice, and the intention was that this specified the middle of a 1-hour window.
            // Maintain backcompat by handling this format even though nothing else should format it this way.
            endTime = (times.length > 0) ? Utils_Date.addHours(convertUTCStringToLocalDate(times[0]), 0.5) : new Date();
            startTime = Utils_Date.addHours(endTime, -1);
        }
    }

    return {
        startTime: startTime,
        endTime: endTime
    };
}

// --- TimeSpan parsing functions.
// Code copied from Tfs/Service/WebAccess/TestManagement/Scripts/TestReporting/Common/Common.Utils.ts.

interface IDuration {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
}

function _getDurationInSeconds(timespanString: string): number {
    var durationObject = _getDurationObject(timespanString);
    return durationObject.days * 24 * 60 * 60 +
        durationObject.hours * 60 * 60 +
        durationObject.minutes * 60 +
        durationObject.seconds;
}

// Time span is serialized in the following format: dd.hh:min:s.ms
function _getDurationObject(duration: string): IDuration {
    // Check if we have days in the duration.
    var durationParts = duration.split(".");

    let days = 0;
    if (durationParts[0] && durationParts[1] && durationParts[1].indexOf(":") > 0) {
        // This means we have days in the duration. The duration is something like 2.03:04:50 or 1.04:50:47.6700
        days = parseInt(durationParts[0]);
        duration = durationParts[1];
    }

    duration = duration.replace(".", ":");
    durationParts = duration.split(":");

    var milliSeconds = 0;
    if (durationParts[3]) {
        const seconds = parseFloat("." + durationParts[3]);
        milliSeconds = Math.round(seconds * 1000);
    }

    var durationObj = {
        days: days,
        hours: (durationParts[0]) ? parseInt(durationParts[0]) : 0,
        minutes: (durationParts[1]) ? parseInt(durationParts[1]) : 0,
        seconds: (durationParts[2]) ? parseInt(durationParts[2]) : 0,
        milliseconds: milliSeconds
    }

    return durationObj;
}


