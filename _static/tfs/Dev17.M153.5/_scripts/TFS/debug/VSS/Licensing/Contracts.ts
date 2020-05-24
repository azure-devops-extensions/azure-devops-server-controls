/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   vssf\client\webapi\httpclients\clientgeneratorconfigs\genclient.json
 */

"use strict";

import VSS_Accounts_Contracts = require("VSS/Accounts/Contracts");
import VSS_Commerce_Contracts = require("VSS/Commerce/Contracts");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");

/**
 * Represents a license granted to a user in an account
 */
export interface AccountEntitlement {
    /**
     * Gets or sets the id of the account to which the license belongs
     */
    accountId: string;
    /**
     * Gets or sets the date the license was assigned
     */
    assignmentDate: Date;
    /**
     * Assignment Source
     */
    assignmentSource: AssignmentSource;
    /**
     * Gets or sets the creation date of the user in this account
     */
    dateCreated: Date;
    /**
     * Gets or sets the date of the user last sign-in to this account
     */
    lastAccessedDate: Date;
    license: License;
    /**
     * Licensing origin
     */
    origin: LicensingOrigin;
    /**
     * The computed rights of this user in the account.
     */
    rights: AccountRights;
    /**
     * The status of the user in the account
     */
    status: VSS_Accounts_Contracts.AccountUserStatus;
    /**
     * Identity information of the user to which the license belongs
     */
    user: VSS_Common_Contracts.IdentityRef;
    /**
     * Gets the id of the user to which the license belongs
     */
    userId: string;
}

/**
 * Model for updating an AccountEntitlement for a user, used for the Web API
 */
export interface AccountEntitlementUpdateModel {
    /**
     * Gets or sets the license for the entitlement
     */
    license: License;
}

export interface AccountLicenseExtensionUsage {
    extensionId: string;
    extensionName: string;
    includedQuantity: number;
    isTrial: boolean;
    minimumLicenseRequired: VSS_Commerce_Contracts.MinimumRequiredServiceLevel;
    msdnUsedCount: number;
    provisionedCount: number;
    remainingTrialDays: number;
    trialExpiryDate: Date;
    usedCount: number;
}

export enum AccountLicenseType {
    None = 0,
    EarlyAdopter = 1,
    Express = 2,
    Professional = 3,
    Advanced = 4,
    Stakeholder = 5
}

export interface AccountLicenseUsage {
    /**
     * Amount that is disabled (Usually from licenses that were provisioned, but became invalid due to loss of subscription in a new billing cycle)
     */
    disabledCount: number;
    license: AccountUserLicense;
    /**
     * Amount that will be purchased in the next billing cycle
     */
    pendingProvisionedCount: number;
    /**
     * Amount that has been purchased
     */
    provisionedCount: number;
    /**
     * Amount currently being used.
     */
    usedCount: number;
}

export interface AccountRights {
    level: VisualStudioOnlineServiceLevel;
    reason: string;
}

export interface AccountUserLicense {
    license: number;
    source: LicensingSource;
}

export enum AssignmentSource {
    None = 0,
    Unknown = 1,
    GroupRule = 2
}

export interface ClientRightsContainer {
    certificateBytes: number[];
    token: string;
}

/**
 * Model for assigning an extension to users, used for the Web API
 */
export interface ExtensionAssignment {
    /**
     * Gets or sets the extension ID to assign.
     */
    extensionGalleryId: string;
    /**
     * Set to true if this a auto assignment scenario.
     */
    isAutoAssignment: boolean;
    /**
     * Gets or sets the licensing source.
     */
    licensingSource: LicensingSource;
    /**
     * Gets or sets the user IDs to assign the extension to.
     */
    userIds: string[];
}

export interface ExtensionAssignmentDetails {
    assignmentStatus: ExtensionAssignmentStatus;
    sourceCollectionName: string;
}

export enum ExtensionAssignmentStatus {
    NotEligible = 0,
    NotAssigned = 1,
    AccountAssignment = 2,
    BundleAssignment = 3,
    ImplicitAssignment = 4,
    PendingValidation = 5,
    TrialAssignment = 6,
    RoamingAccountAssignment = 7
}

export enum ExtensionFilterOptions {
    None = 1,
    Bundle = 2,
    AccountAssignment = 4,
    ImplicitAssignment = 8,
    All = -1
}

export interface ExtensionLicenseData {
    createdDate: Date;
    extensionId: string;
    isFree: boolean;
    minimumRequiredAccessLevel: VisualStudioOnlineServiceLevel;
    updatedDate: Date;
}

export enum ExtensionOperation {
    Assign = 0,
    Unassign = 1
}

export interface ExtensionOperationResult {
    accountId: string;
    extensionId: string;
    message: string;
    operation: ExtensionOperation;
    result: OperationResult;
    userId: string;
}

export enum ExtensionRightsReasonCode {
    Normal = 0,
    FeatureFlagSet = 1,
    NullIdentity = 2,
    ServiceIdentity = 3,
    ErrorCallingService = 4
}

export interface ExtensionRightsResult {
    entitledExtensions: string[];
    hostId: string;
    reason: string;
    reasonCode: ExtensionRightsReasonCode;
    resultCode: ExtensionRightsResultCode;
}

export enum ExtensionRightsResultCode {
    Normal = 0,
    AllFree = 1,
    FreeExtensionsFree = 2
}

/**
 * Model for assigning an extension to users, used for the Web API
 */
export interface ExtensionSource {
    /**
     * Assignment Source
     */
    assignmentSource: AssignmentSource;
    /**
     * extension Identifier
     */
    extensionGalleryId: string;
    /**
     * The licensing source of the extension. Account, Msdn, ect.
     */
    licensingSource: LicensingSource;
}

/**
 * The base class for a specific license source and license
 */
export interface License {
    /**
     * Gets the source of the license
     */
    source: LicensingSource;
}

export enum LicensingOrigin {
    None = 0,
    OnDemandPrivateProject = 1,
    OnDemandPublicProject = 2,
    UserHubInvitation = 3,
    PrivateProjectInvitation = 4,
    PublicProjectInvitation = 5
}

export enum LicensingSource {
    None = 0,
    Account = 1,
    Msdn = 2,
    Profile = 3,
    Auto = 4,
    Trial = 5
}

export interface MsdnEntitlement {
    /**
     * Entilement id assigned to Entitlement in Benefits Database.
     */
    entitlementCode: string;
    /**
     * Entitlement Name e.g. Downloads, Chat.
     */
    entitlementName: string;
    /**
     * Type of Entitlement e.g. Downloads, Chat.
     */
    entitlementType: string;
    /**
     * Entitlement activation status
     */
    isActivated: boolean;
    /**
     * Entitlement availability
     */
    isEntitlementAvailable: boolean;
    /**
     * Write MSDN Channel into CRCT (Retail,MPN,VL,BizSpark,DreamSpark,MCT,FTE,Technet,WebsiteSpark,Other)
     */
    subscriptionChannel: string;
    /**
     * Subscription Expiration Date.
     */
    subscriptionExpirationDate: Date;
    /**
     * Subscription id which identifies the subscription itself. This is the Benefit Detail Guid from BMS.
     */
    subscriptionId: string;
    /**
     * Identifier of the subscription or benefit level.
     */
    subscriptionLevelCode: string;
    /**
     * Name of subscription level.
     */
    subscriptionLevelName: string;
    /**
     * Subscription Status Code (ACT, PND, INA ...).
     */
    subscriptionStatus: string;
}

export enum MsdnLicenseType {
    None = 0,
    Eligible = 1,
    Professional = 2,
    Platforms = 3,
    TestProfessional = 4,
    Premium = 5,
    Ultimate = 6,
    Enterprise = 7
}

export enum OperationResult {
    Success = 0,
    Warning = 1,
    Error = 2
}

export enum VisualStudioOnlineServiceLevel {
    /**
     * No service rights. The user cannot access the account
     */
    None = 0,
    /**
     * Default or minimum service level
     */
    Express = 1,
    /**
     * Premium service level - either by purchasing on the Azure portal or by purchasing the appropriate MSDN subscription
     */
    Advanced = 2,
    /**
     * Only available to a specific set of MSDN Subscribers
     */
    AdvancedPlus = 3,
    /**
     * Stakeholder service level
     */
    Stakeholder = 4
}

export var TypeInfo = {
    AccountEntitlement: <any>{
    },
    AccountEntitlementUpdateModel: <any>{
    },
    AccountLicenseExtensionUsage: <any>{
    },
    AccountLicenseType: {
        enumValues: {
            "none": 0,
            "earlyAdopter": 1,
            "express": 2,
            "professional": 3,
            "advanced": 4,
            "stakeholder": 5
        }
    },
    AccountLicenseUsage: <any>{
    },
    AccountRights: <any>{
    },
    AccountUserLicense: <any>{
    },
    AssignmentSource: {
        enumValues: {
            "none": 0,
            "unknown": 1,
            "groupRule": 2
        }
    },
    ExtensionAssignment: <any>{
    },
    ExtensionAssignmentDetails: <any>{
    },
    ExtensionAssignmentStatus: {
        enumValues: {
            "notEligible": 0,
            "notAssigned": 1,
            "accountAssignment": 2,
            "bundleAssignment": 3,
            "implicitAssignment": 4,
            "pendingValidation": 5,
            "trialAssignment": 6,
            "roamingAccountAssignment": 7
        }
    },
    ExtensionFilterOptions: {
        enumValues: {
            "none": 1,
            "bundle": 2,
            "accountAssignment": 4,
            "implicitAssignment": 8,
            "all": -1
        }
    },
    ExtensionLicenseData: <any>{
    },
    ExtensionOperation: {
        enumValues: {
            "assign": 0,
            "unassign": 1
        }
    },
    ExtensionOperationResult: <any>{
    },
    ExtensionRightsReasonCode: {
        enumValues: {
            "normal": 0,
            "featureFlagSet": 1,
            "nullIdentity": 2,
            "serviceIdentity": 3,
            "errorCallingService": 4
        }
    },
    ExtensionRightsResult: <any>{
    },
    ExtensionRightsResultCode: {
        enumValues: {
            "normal": 0,
            "allFree": 1,
            "freeExtensionsFree": 2
        }
    },
    ExtensionSource: <any>{
    },
    License: <any>{
    },
    LicensingOrigin: {
        enumValues: {
            "none": 0,
            "onDemandPrivateProject": 1,
            "onDemandPublicProject": 2,
            "userHubInvitation": 3,
            "privateProjectInvitation": 4,
            "publicProjectInvitation": 5
        }
    },
    LicensingSource: {
        enumValues: {
            "none": 0,
            "account": 1,
            "msdn": 2,
            "profile": 3,
            "auto": 4,
            "trial": 5
        }
    },
    MsdnEntitlement: <any>{
    },
    MsdnLicenseType: {
        enumValues: {
            "none": 0,
            "eligible": 1,
            "professional": 2,
            "platforms": 3,
            "testProfessional": 4,
            "premium": 5,
            "ultimate": 6,
            "enterprise": 7
        }
    },
    OperationResult: {
        enumValues: {
            "success": 0,
            "warning": 1,
            "error": 2
        }
    },
    VisualStudioOnlineServiceLevel: {
        enumValues: {
            "none": 0,
            "express": 1,
            "advanced": 2,
            "advancedPlus": 3,
            "stakeholder": 4
        }
    },
};

TypeInfo.AccountEntitlement.fields = {
    assignmentDate: {
        isDate: true,
    },
    assignmentSource: {
        enumType: TypeInfo.AssignmentSource
    },
    dateCreated: {
        isDate: true,
    },
    lastAccessedDate: {
        isDate: true,
    },
    license: {
        typeInfo: TypeInfo.License
    },
    origin: {
        enumType: TypeInfo.LicensingOrigin
    },
    rights: {
        typeInfo: TypeInfo.AccountRights
    },
    status: {
        enumType: VSS_Accounts_Contracts.TypeInfo.AccountUserStatus
    }
};

TypeInfo.AccountEntitlementUpdateModel.fields = {
    license: {
        typeInfo: TypeInfo.License
    }
};

TypeInfo.AccountLicenseExtensionUsage.fields = {
    minimumLicenseRequired: {
        enumType: VSS_Commerce_Contracts.TypeInfo.MinimumRequiredServiceLevel
    },
    trialExpiryDate: {
        isDate: true,
    }
};

TypeInfo.AccountLicenseUsage.fields = {
    license: {
        typeInfo: TypeInfo.AccountUserLicense
    }
};

TypeInfo.AccountRights.fields = {
    level: {
        enumType: TypeInfo.VisualStudioOnlineServiceLevel
    }
};

TypeInfo.AccountUserLicense.fields = {
    source: {
        enumType: TypeInfo.LicensingSource
    }
};

TypeInfo.ExtensionAssignment.fields = {
    licensingSource: {
        enumType: TypeInfo.LicensingSource
    }
};

TypeInfo.ExtensionAssignmentDetails.fields = {
    assignmentStatus: {
        enumType: TypeInfo.ExtensionAssignmentStatus
    }
};

TypeInfo.ExtensionLicenseData.fields = {
    createdDate: {
        isDate: true,
    },
    minimumRequiredAccessLevel: {
        enumType: TypeInfo.VisualStudioOnlineServiceLevel
    },
    updatedDate: {
        isDate: true,
    }
};

TypeInfo.ExtensionOperationResult.fields = {
    operation: {
        enumType: TypeInfo.ExtensionOperation
    },
    result: {
        enumType: TypeInfo.OperationResult
    }
};

TypeInfo.ExtensionRightsResult.fields = {
    reasonCode: {
        enumType: TypeInfo.ExtensionRightsReasonCode
    },
    resultCode: {
        enumType: TypeInfo.ExtensionRightsResultCode
    }
};

TypeInfo.ExtensionSource.fields = {
    assignmentSource: {
        enumType: TypeInfo.AssignmentSource
    },
    licensingSource: {
        enumType: TypeInfo.LicensingSource
    }
};

TypeInfo.License.fields = {
    source: {
        enumType: TypeInfo.LicensingSource
    }
};

TypeInfo.MsdnEntitlement.fields = {
    subscriptionExpirationDate: {
        isDate: true,
    }
};
