/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   aex\client\memberentitlementmanagement\webapi\public\clientgeneratorconfigs\genclient.json
 */

"use strict";

import VSS_Accounts_Contracts = require("VSS/Accounts/Contracts");
import VSS_Commerce_Contracts = require("VSS/Commerce/Contracts");
import VSS_Graph_Contracts = require("VSS/Graph/Contracts");
import VSS_Licensing_Contracts = require("VSS/Licensing/Contracts");
import VSS_LicensingRule_Contracts = require("VSS/LicensingRule/Contracts");
import VSS_Operations_Contracts = require("VSS/Operations/Contracts");

export interface AccessLevel {
    /**
     * Type of Account License (e.g. Express, Stakeholder etc.)
     */
    accountLicenseType: VSS_Licensing_Contracts.AccountLicenseType;
    /**
     * Assignment Source of the License (e.g. Group, Unknown etc.
     */
    assignmentSource: VSS_Licensing_Contracts.AssignmentSource;
    /**
     * Display name of the License
     */
    licenseDisplayName: string;
    /**
     * Licensing Source (e.g. Account. MSDN etc.)
     */
    licensingSource: VSS_Licensing_Contracts.LicensingSource;
    /**
     * Type of MSDN License (e.g. Visual Studio Professional, Visual Studio Enterprise etc.)
     */
    msdnLicenseType: VSS_Licensing_Contracts.MsdnLicenseType;
    /**
     * User status in the account
     */
    status: VSS_Accounts_Contracts.AccountUserStatus;
    /**
     * Status message.
     */
    statusMessage: string;
}

export interface BaseOperationResult {
    /**
     * List of error codes paired with their corresponding error messages
     */
    errors: { key: number; value: string }[];
    /**
     * Success status of the operation
     */
    isSuccess: boolean;
}

export interface Extension {
    /**
     * Assignment source for this extension. I.e. explicitly assigned or from a group rule.
     */
    assignmentSource: VSS_Licensing_Contracts.AssignmentSource;
    /**
     * Gallery Id of the Extension.
     */
    id: string;
    /**
     * Friendly name of this extension.
     */
    name: string;
    /**
     * Source of this extension assignment. Ex: msdn, account, none, etc.
     */
    source: VSS_Licensing_Contracts.LicensingSource;
}

export interface ExtensionSummaryData extends SummaryData {
    /**
     * Count of Extension Licenses assigned to users through msdn.
     */
    assignedThroughSubscription: number;
    /**
     * Gallery Id of the Extension
     */
    extensionId: string;
    /**
     * Friendly name of this extension
     */
    extensionName: string;
    /**
     * Whether its a Trial Version.
     */
    isTrialVersion: boolean;
    /**
     * Minimum License Required for the Extension.
     */
    minimumLicenseRequired: VSS_Commerce_Contracts.MinimumRequiredServiceLevel;
    /**
     * Days remaining for the Trial to expire.
     */
    remainingTrialDays: number;
    /**
     * Date on which the Trial expires.
     */
    trialExpiryDate: Date;
}

export interface Group {
    /**
     * Display Name of the Group
     */
    displayName: string;
    /**
     * Group Type
     */
    groupType: GroupType;
}

export interface GroupEntitlement {
    /**
     * Extension Rules.
     */
    extensionRules: Extension[];
    /**
     * Member reference.
     */
    group: VSS_Graph_Contracts.GraphGroup;
    /**
     * The unique identifier which matches the Id of the GraphMember.
     */
    id: string;
    /**
     * [Readonly] The last time the group licensing rule was executed (regardless of whether any changes were made).
     */
    lastExecuted: Date;
    /**
     * License Rule.
     */
    licenseRule: AccessLevel;
    /**
     * Group members. Only used when creating a new group.
     */
    members: UserEntitlement[];
    /**
     * Relation between a project and the member's effective permissions in that project.
     */
    projectEntitlements: ProjectEntitlement[];
    /**
     * The status of the group rule.
     */
    status: VSS_LicensingRule_Contracts.GroupLicensingRuleStatus;
}

export interface GroupEntitlementOperationReference extends VSS_Operations_Contracts.OperationReference {
    /**
     * Operation completed with success or failure.
     */
    completed: boolean;
    /**
     * True if all operations were successful.
     */
    haveResultsSucceeded: boolean;
    /**
     * List of results for each operation.
     */
    results: GroupOperationResult[];
}

export interface GroupOperationResult extends BaseOperationResult {
    /**
     * Identifier of the Group being acted upon
     */
    groupId: string;
    /**
     * Result of the Groupentitlement after the operation
     */
    result: GroupEntitlement;
}

export interface GroupOption {
    /**
     * Access Level
     */
    accessLevel: AccessLevel;
    /**
     * Group
     */
    group: Group;
}

/**
 * Used when adding users to a project. Each GroupType maps to a well-known group. The lowest GroupType should always be ProjectStakeholder
 */
export enum GroupType {
    ProjectStakeholder = 0,
    ProjectReader = 1,
    ProjectContributor = 2,
    ProjectAdministrator = 3,
    Custom = 4
}

export interface LicenseSummaryData extends SummaryData {
    /**
     * Type of Account License.
     */
    accountLicenseType: VSS_Licensing_Contracts.AccountLicenseType;
    /**
     * Count of Disabled Licenses.
     */
    disabled: number;
    /**
     * Designates if this license quantity can be changed through purchase
     */
    isPurchasable: boolean;
    /**
     * Name of the License.
     */
    licenseName: string;
    /**
     * Type of MSDN License.
     */
    msdnLicenseType: VSS_Licensing_Contracts.MsdnLicenseType;
    /**
     * Specifies the date when billing will charge for paid licenses
     */
    nextBillingDate: Date;
    /**
     * Source of the License.
     */
    source: VSS_Licensing_Contracts.LicensingSource;
    /**
     * Total license count after next billing cycle
     */
    totalAfterNextBillingDate: number;
}

/**
 * Deprecated: Use UserEntitlement instead
 */
export interface MemberEntitlement extends UserEntitlement {
    /**
     * Member reference
     */
    member: VSS_Graph_Contracts.GraphMember;
}

export interface MemberEntitlementOperationReference extends VSS_Operations_Contracts.OperationReference {
    /**
     * Operation completed with success or failure
     */
    completed: boolean;
    /**
     * True if all operations were successful
     */
    haveResultsSucceeded: boolean;
    /**
     * List of results for each operation
     */
    results: OperationResult[];
}

export interface MemberEntitlementsPatchResponse extends MemberEntitlementsResponseBase {
    /**
     * List of results for each operation
     */
    operationResults: OperationResult[];
}

export interface MemberEntitlementsPostResponse extends MemberEntitlementsResponseBase {
    /**
     * Operation result
     */
    operationResult: OperationResult;
}

export interface MemberEntitlementsResponseBase {
    /**
     * True if all operations were successful.
     */
    isSuccess: boolean;
    /**
     * Result of the member entitlement after the operations. have been applied
     */
    memberEntitlement: MemberEntitlement;
}

export interface OperationResult {
    /**
     * List of error codes paired with their corresponding error messages.
     */
    errors: { key: number; value: string }[];
    /**
     * Success status of the operation.
     */
    isSuccess: boolean;
    /**
     * Identifier of the Member being acted upon.
     */
    memberId: string;
    /**
     * Result of the MemberEntitlement after the operation.
     */
    result: MemberEntitlement;
}

export interface PagedGraphMemberList extends PagedList<UserEntitlement> {
    members: UserEntitlement[];
}

export interface PagedList<T> {
    continuationToken: string;
    items: T[];
    totalCount: number;
}

export interface ProjectEntitlement {
    /**
     * Assignment Source (e.g. Group or Unknown).
     */
    assignmentSource: VSS_Licensing_Contracts.AssignmentSource;
    /**
     * Project Group (e.g. Contributor, Reader etc.)
     */
    group: Group;
    /**
     * Whether the user is inheriting permissions to a project through a VSTS or AAD group membership.
     */
    isProjectPermissionInherited: boolean;
    /**
     * Project Ref
     */
    projectRef: ProjectRef;
    /**
     * Team Ref.
     */
    teamRefs: TeamRef[];
}

export interface ProjectRef {
    /**
     * Project ID.
     */
    id: string;
    /**
     * Project Name.
     */
    name: string;
}

export interface SummaryData {
    /**
     * Count of Licenses already assigned.
     */
    assigned: number;
    /**
     * Available Count.
     */
    available: number;
    /**
     * Quantity
     */
    includedQuantity: number;
    /**
     * Total Count.
     */
    total: number;
}

export enum SummaryPropertyName {
    AccessLevels = 1,
    Licenses = 2,
    Extensions = 4,
    Projects = 8,
    Groups = 16,
    All = 31
}

export interface TeamRef {
    /**
     * Team ID
     */
    id: string;
    /**
     * Team Name
     */
    name: string;
}

export interface UserEntitlement {
    /**
     * User's access level denoted by a license.
     */
    accessLevel: AccessLevel;
    /**
     * User's extensions.
     */
    extensions: Extension[];
    /**
     * [Readonly] GroupEntitlements that this user belongs to.
     */
    groupAssignments: GroupEntitlement[];
    /**
     * The unique identifier which matches the Id of the Identity associated with the GraphMember.
     */
    id: string;
    /**
     * [Readonly] Date the user last accessed the collection.
     */
    lastAccessedDate: Date;
    /**
     * Relation between a project and the user's effective permissions in that project.
     */
    projectEntitlements: ProjectEntitlement[];
    /**
     * User reference.
     */
    user: VSS_Graph_Contracts.GraphUser;
}

export interface UserEntitlementOperationReference extends VSS_Operations_Contracts.OperationReference {
    /**
     * Operation completed with success or failure.
     */
    completed: boolean;
    /**
     * True if all operations were successful.
     */
    haveResultsSucceeded: boolean;
    /**
     * List of results for each operation.
     */
    results: UserEntitlementOperationResult[];
}

export interface UserEntitlementOperationResult {
    /**
     * List of error codes paired with their corresponding error messages.
     */
    errors: { key: number; value: string }[];
    /**
     * Success status of the operation.
     */
    isSuccess: boolean;
    /**
     * Result of the MemberEntitlement after the operation.
     */
    result: UserEntitlement;
    /**
     * Identifier of the Member being acted upon.
     */
    userId: string;
}

export enum UserEntitlementProperty {
    License = 1,
    Extensions = 2,
    Projects = 4,
    GroupRules = 8,
    All = 15
}

export interface UserEntitlementsPatchResponse extends UserEntitlementsResponseBase {
    /**
     * List of results for each operation.
     */
    operationResults: UserEntitlementOperationResult[];
}

export interface UserEntitlementsPostResponse extends UserEntitlementsResponseBase {
    /**
     * Operation result.
     */
    operationResult: UserEntitlementOperationResult;
}

export interface UserEntitlementsResponseBase {
    /**
     * True if all operations were successful.
     */
    isSuccess: boolean;
    /**
     * Result of the user entitlement after the operations have been applied.
     */
    userEntitlement: UserEntitlement;
}

export interface UsersSummary {
    /**
     * Available Access Levels.
     */
    availableAccessLevels: AccessLevel[];
    /**
     * Summary of Extensions in the account.
     */
    extensions: ExtensionSummaryData[];
    /**
     * Group Options.
     */
    groupOptions: GroupOption[];
    /**
     * Summary of Licenses in the Account.
     */
    licenses: LicenseSummaryData[];
    /**
     * Summary of Projects in the Account.
     */
    projectRefs: ProjectRef[];
}

export var TypeInfo = {
    AccessLevel: <any>{
    },
    Extension: <any>{
    },
    ExtensionSummaryData: <any>{
    },
    Group: <any>{
    },
    GroupEntitlement: <any>{
    },
    GroupEntitlementOperationReference: <any>{
    },
    GroupOperationResult: <any>{
    },
    GroupOption: <any>{
    },
    GroupType: {
        enumValues: {
            "projectStakeholder": 0,
            "projectReader": 1,
            "projectContributor": 2,
            "projectAdministrator": 3,
            "custom": 4
        }
    },
    LicenseSummaryData: <any>{
    },
    MemberEntitlement: <any>{
    },
    MemberEntitlementOperationReference: <any>{
    },
    MemberEntitlementsPatchResponse: <any>{
    },
    MemberEntitlementsPostResponse: <any>{
    },
    MemberEntitlementsResponseBase: <any>{
    },
    OperationResult: <any>{
    },
    PagedGraphMemberList: <any>{
    },
    ProjectEntitlement: <any>{
    },
    SummaryPropertyName: {
        enumValues: {
            "accessLevels": 1,
            "licenses": 2,
            "extensions": 4,
            "projects": 8,
            "groups": 16,
            "all": 31
        }
    },
    UserEntitlement: <any>{
    },
    UserEntitlementOperationReference: <any>{
    },
    UserEntitlementOperationResult: <any>{
    },
    UserEntitlementProperty: {
        enumValues: {
            "license": 1,
            "extensions": 2,
            "projects": 4,
            "groupRules": 8,
            "all": 15
        }
    },
    UserEntitlementsPatchResponse: <any>{
    },
    UserEntitlementsPostResponse: <any>{
    },
    UserEntitlementsResponseBase: <any>{
    },
    UsersSummary: <any>{
    },
};

TypeInfo.AccessLevel.fields = {
    accountLicenseType: {
        enumType: VSS_Licensing_Contracts.TypeInfo.AccountLicenseType
    },
    assignmentSource: {
        enumType: VSS_Licensing_Contracts.TypeInfo.AssignmentSource
    },
    licensingSource: {
        enumType: VSS_Licensing_Contracts.TypeInfo.LicensingSource
    },
    msdnLicenseType: {
        enumType: VSS_Licensing_Contracts.TypeInfo.MsdnLicenseType
    },
    status: {
        enumType: VSS_Accounts_Contracts.TypeInfo.AccountUserStatus
    }
};

TypeInfo.Extension.fields = {
    assignmentSource: {
        enumType: VSS_Licensing_Contracts.TypeInfo.AssignmentSource
    },
    source: {
        enumType: VSS_Licensing_Contracts.TypeInfo.LicensingSource
    }
};

TypeInfo.ExtensionSummaryData.fields = {
    minimumLicenseRequired: {
        enumType: VSS_Commerce_Contracts.TypeInfo.MinimumRequiredServiceLevel
    },
    trialExpiryDate: {
        isDate: true,
    }
};

TypeInfo.Group.fields = {
    groupType: {
        enumType: TypeInfo.GroupType
    }
};

TypeInfo.GroupEntitlement.fields = {
    extensionRules: {
        isArray: true,
        typeInfo: TypeInfo.Extension
    },
    lastExecuted: {
        isDate: true,
    },
    licenseRule: {
        typeInfo: TypeInfo.AccessLevel
    },
    members: {
        isArray: true,
        typeInfo: TypeInfo.UserEntitlement
    },
    projectEntitlements: {
        isArray: true,
        typeInfo: TypeInfo.ProjectEntitlement
    },
    status: {
        enumType: VSS_LicensingRule_Contracts.TypeInfo.GroupLicensingRuleStatus
    }
};

TypeInfo.GroupEntitlementOperationReference.fields = {
    results: {
        isArray: true,
        typeInfo: TypeInfo.GroupOperationResult
    },
    status: {
        enumType: VSS_Operations_Contracts.TypeInfo.OperationStatus
    }
};

TypeInfo.GroupOperationResult.fields = {
    result: {
        typeInfo: TypeInfo.GroupEntitlement
    }
};

TypeInfo.GroupOption.fields = {
    accessLevel: {
        typeInfo: TypeInfo.AccessLevel
    },
    group: {
        typeInfo: TypeInfo.Group
    }
};

TypeInfo.LicenseSummaryData.fields = {
    accountLicenseType: {
        enumType: VSS_Licensing_Contracts.TypeInfo.AccountLicenseType
    },
    msdnLicenseType: {
        enumType: VSS_Licensing_Contracts.TypeInfo.MsdnLicenseType
    },
    nextBillingDate: {
        isDate: true,
    },
    source: {
        enumType: VSS_Licensing_Contracts.TypeInfo.LicensingSource
    }
};

TypeInfo.MemberEntitlement.fields = {
    accessLevel: {
        typeInfo: TypeInfo.AccessLevel
    },
    extensions: {
        isArray: true,
        typeInfo: TypeInfo.Extension
    },
    groupAssignments: {
        isArray: true,
        typeInfo: TypeInfo.GroupEntitlement
    },
    lastAccessedDate: {
        isDate: true,
    },
    projectEntitlements: {
        isArray: true,
        typeInfo: TypeInfo.ProjectEntitlement
    },
    user: {
        typeInfo: VSS_Graph_Contracts.TypeInfo.GraphUser
    }
};

TypeInfo.MemberEntitlementOperationReference.fields = {
    results: {
        isArray: true,
        typeInfo: TypeInfo.OperationResult
    },
    status: {
        enumType: VSS_Operations_Contracts.TypeInfo.OperationStatus
    }
};

TypeInfo.MemberEntitlementsPatchResponse.fields = {
    memberEntitlement: {
        typeInfo: TypeInfo.MemberEntitlement
    },
    operationResults: {
        isArray: true,
        typeInfo: TypeInfo.OperationResult
    }
};

TypeInfo.MemberEntitlementsPostResponse.fields = {
    memberEntitlement: {
        typeInfo: TypeInfo.MemberEntitlement
    },
    operationResult: {
        typeInfo: TypeInfo.OperationResult
    }
};

TypeInfo.MemberEntitlementsResponseBase.fields = {
    memberEntitlement: {
        typeInfo: TypeInfo.MemberEntitlement
    }
};

TypeInfo.OperationResult.fields = {
    result: {
        typeInfo: TypeInfo.MemberEntitlement
    }
};

TypeInfo.PagedGraphMemberList.fields = {
    members: {
        isArray: true,
        typeInfo: TypeInfo.UserEntitlement
    }
};

TypeInfo.ProjectEntitlement.fields = {
    assignmentSource: {
        enumType: VSS_Licensing_Contracts.TypeInfo.AssignmentSource
    },
    group: {
        typeInfo: TypeInfo.Group
    }
};

TypeInfo.UserEntitlement.fields = {
    accessLevel: {
        typeInfo: TypeInfo.AccessLevel
    },
    extensions: {
        isArray: true,
        typeInfo: TypeInfo.Extension
    },
    groupAssignments: {
        isArray: true,
        typeInfo: TypeInfo.GroupEntitlement
    },
    lastAccessedDate: {
        isDate: true,
    },
    projectEntitlements: {
        isArray: true,
        typeInfo: TypeInfo.ProjectEntitlement
    },
    user: {
        typeInfo: VSS_Graph_Contracts.TypeInfo.GraphUser
    }
};

TypeInfo.UserEntitlementOperationReference.fields = {
    results: {
        isArray: true,
        typeInfo: TypeInfo.UserEntitlementOperationResult
    },
    status: {
        enumType: VSS_Operations_Contracts.TypeInfo.OperationStatus
    }
};

TypeInfo.UserEntitlementOperationResult.fields = {
    result: {
        typeInfo: TypeInfo.UserEntitlement
    }
};

TypeInfo.UserEntitlementsPatchResponse.fields = {
    operationResults: {
        isArray: true,
        typeInfo: TypeInfo.UserEntitlementOperationResult
    },
    userEntitlement: {
        typeInfo: TypeInfo.UserEntitlement
    }
};

TypeInfo.UserEntitlementsPostResponse.fields = {
    operationResult: {
        typeInfo: TypeInfo.UserEntitlementOperationResult
    },
    userEntitlement: {
        typeInfo: TypeInfo.UserEntitlement
    }
};

TypeInfo.UserEntitlementsResponseBase.fields = {
    userEntitlement: {
        typeInfo: TypeInfo.UserEntitlement
    }
};

TypeInfo.UsersSummary.fields = {
    availableAccessLevels: {
        isArray: true,
        typeInfo: TypeInfo.AccessLevel
    },
    extensions: {
        isArray: true,
        typeInfo: TypeInfo.ExtensionSummaryData
    },
    groupOptions: {
        isArray: true,
        typeInfo: TypeInfo.GroupOption
    },
    licenses: {
        isArray: true,
        typeInfo: TypeInfo.LicenseSummaryData
    }
};
