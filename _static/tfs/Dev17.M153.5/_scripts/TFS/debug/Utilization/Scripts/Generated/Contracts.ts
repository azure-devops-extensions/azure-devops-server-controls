/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   tfs\client\utilization\clientgeneratorconfigs\genclient.json
 */

"use strict";

/**
 * Encapsulates the aggregated usage info about a request, or set of similar requests, within a short time period.
 */
export interface CommandUsage {
    /**
     * The name of the application of the request(s).
     */
    application: string;
    /**
     * The AuthenticationMechanism that was used to issue the request(s).
     */
    authenticationMechanism: string;
    /**
     * The name of the command of the request(s).
     */
    command: string;
    /**
     * The number of requests represented by the other parameters in this CommandUsage.
     */
    count: number;
    /**
     * Pipeline Project/Build Definition.
     */
    definition: string;
    /**
     * The total delay in milliseconds of the request(s).
     */
    delay: number;
    /**
     * More detailed status information of the request(s).  If normal, a blank string. If delayed, in the format "Delayed/{Short/Long}." If blocked, in the format "Blocked/{Short/Long/Concurrent}."
     */
    detailedStatus: string;
    /**
     * Obsolete.
     */
    endTime: Date;
    /**
     * Pipeline Instance.
     */
    instance: string;
    /**
     * The IP address that issued the request(s).
     */
    ipAddress: string;
    /**
     * The Service of the request(s).
     */
    service: string;
    /**
     * The start of the time bin in which this request (or these requests) were issued.
     */
    startTime: Date;
    /**
     * The UtilizationStatus of the request(s).
     */
    status: UtilizationStatus;
    /**
     * The amount of Team Services Throughput Units (TSTUs) used by the request(s).
     */
    usage: number;
    /**
     * Name of the user who issued the request(s).
     */
    user: string;
    /**
     * The user agent of the request(s).
     */
    userAgent: string;
    /**
     * ID of the user who issued the request(s).
     */
    vSID: string;
}

/**
 * Represents the Type of a request.
 */
export enum EntityType {
    /**
     * Usage Summary.
     */
    User = 0,
    /**
     * Pipeline summary.
     */
    Pipeline = 1
}

/**
 * Encapsulates the query criteria for a usage summary query.
 */
export interface UsageSummaryQueryCriteria {
    /**
     * List of the columns of interest. All other columns are aggregated.
     */
    columns: UtilizationColumn[];
    /**
     * A simple search string which queries the project/definition.
     */
    definitionSearchString: string;
    /**
     * The upper bound of the query time window. Defaults to now (UTC).
     */
    endTime: Date;
    /**
     * The EntityType of request in {User, Pipeline}.
     */
    entity: EntityType;
    /**
     * A single string that can serve as a simple string search query. "A B" will search for "A" and "B" in each of the columns {UserAgent, IPAddress, Application, Command}.
     */
    keywords: string;
    /**
     * The maximum number of records to return. This parameter is subject to a server-side limit.
     */
    recordLimit: number;
    /**
     * Comma-delimited list of services to query, e.g. "tfs,ReleaseManagement". If empty, default to "tfs".
     */
    services: string;
    /**
     * The lower bound of the query time window. Defaults to one hour ago (UTC).
     */
    startTime: Date;
    /**
     * The UtilizationStatus of interest in {All, Normal, Delayed, Blocked}.
     */
    status: UtilizationStatus;
    /**
     * The size of the time buckets that data will be grouped into.
     */
    timeBucket: any;
    /**
     * Filter the query by this minimum floor of TSTUs.
     */
    tSTUFloor: number;
    /**
     * The ID of the user to query usage summary for.  If blank, then query all users in the account, subject to permissions.
     */
    userId: string;
}

/**
 * An enumeration over the possible columns available for reporting information in the usage summary.
 */
export enum UtilizationColumn {
    /**
     * Not used.
     */
    Unknown = 0,
    /**
     * User.
     */
    User = 1,
    /**
     * User agent.
     */
    UserAgent = 2,
    /**
     * IP address.
     */
    IpAddress = 3,
    /**
     * Authentication mechanism.
     */
    AuthenticationMechanism = 4,
    /**
     * Time bin.
     */
    StartTime = 5,
    /**
     * Application.
     */
    Application = 6,
    /**
     * Command.
     */
    Command = 7,
    /**
     * Status.
     */
    Status = 8,
    /**
     * Count.
     */
    Count = 9,
    /**
     * Usage in Team Services Througput Units (TSTUs).
     */
    Usage = 10,
    /**
     * Delay in milliseconds.
     */
    Delay = 11,
    /**
     * Service.
     */
    Service = 12,
    /**
     * Pipeline Project/Build Definition.
     */
    Definition = 13,
    /**
     * Pipeline Instance.
     */
    Instance = 14
}

/**
 * Represents the status of a request.
 */
export enum UtilizationStatus {
    /**
     * Either Normal, Delayed, or Blocked status.
     */
    All = 0,
    /**
     * Normal status (not Delayed or Blocked).
     */
    Normal = 1,
    /**
     * Delayed status; the request has been delayed by Azure DevOps Services' throttling policy.
     */
    Delayed = 2,
    /**
     * Blocked status; the request has been blocked by Azure DevOps Services' throttling policy.
     */
    Blocked = 3
}

export var TypeInfo = {
    CommandUsage: <any>{
    },
    EntityType: {
        enumValues: {
            "user": 0,
            "pipeline": 1
        }
    },
    UsageSummaryQueryCriteria: <any>{
    },
    UtilizationColumn: {
        enumValues: {
            "unknown": 0,
            "user": 1,
            "userAgent": 2,
            "ipAddress": 3,
            "authenticationMechanism": 4,
            "startTime": 5,
            "application": 6,
            "command": 7,
            "status": 8,
            "count": 9,
            "usage": 10,
            "delay": 11,
            "service": 12,
            "definition": 13,
            "instance": 14
        }
    },
    UtilizationStatus: {
        enumValues: {
            "all": 0,
            "normal": 1,
            "delayed": 2,
            "blocked": 3
        }
    },
};

TypeInfo.CommandUsage.fields = {
    endTime: {
        isDate: true,
    },
    startTime: {
        isDate: true,
    },
    status: {
        enumType: TypeInfo.UtilizationStatus
    }
};

TypeInfo.UsageSummaryQueryCriteria.fields = {
    columns: {
        isArray: true,
        enumType: TypeInfo.UtilizationColumn
    },
    endTime: {
        isDate: true,
    },
    entity: {
        enumType: TypeInfo.EntityType
    },
    startTime: {
        isDate: true,
    },
    status: {
        enumType: TypeInfo.UtilizationStatus
    }
};
