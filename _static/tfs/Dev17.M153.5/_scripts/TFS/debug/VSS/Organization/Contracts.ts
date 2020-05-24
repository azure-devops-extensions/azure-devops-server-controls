/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   vssf\client\webapi\httpclients\clientgeneratorconfigs\organization.genclient.json
 */

"use strict";

export interface Collection {
    data: { [key: string] : any; };
    dateCreated: Date;
    /**
     * Identifier for a collection under an organization
     */
    id: string;
    lastUpdated: Date;
    /**
     * The unqiue name of collection under an organziation
     */
    name: string;
    owner: string;
    preferredRegion: string;
    /**
     * Extended properties
     */
    properties: any;
    status: CollectionStatus;
}

export enum CollectionSearchKind {
    Unknown = 0,
    ById = 1,
    ByName = 2,
    ByTenantId = 3
}

export enum CollectionStatus {
    Unknown = 0,
    Initial = 10,
    Enabled = 20,
    LogicallyDeleted = 30,
    MarkedForPhysicalDelete = 40
}

export interface Logo {
    /**
     * The image for the logo represented as a byte array
     */
    image: number[];
}

export interface Organization {
    collections: Collection[];
    creatorId: string;
    data: { [key: string] : any; };
    dateCreated: Date;
    /**
     * Identifier for an Organization
     */
    id: string;
    isActivated: boolean;
    lastUpdated: Date;
    name: string;
    preferredRegion: string;
    primaryCollection: Collection;
    /**
     * Extended properties
     */
    properties: any;
    status: OrganizationStatus;
    tenantId: string;
    type: OrganizationType;
}

export interface OrganizationMigrationBlob {
    blobAsJson: string;
    id: string;
}

export enum OrganizationSearchKind {
    Unknown = 0,
    ById = 1,
    ByName = 2,
    ByTenantId = 3
}

export enum OrganizationStatus {
    Unknown = 0,
    Initial = 10,
    Enabled = 20,
    MarkedForDelete = 30
}

export enum OrganizationType {
    Unknown = 0,
    Personal = 1,
    Work = 2
}

export interface Policy {
    effectiveValue: any;
    enforce: boolean;
    isValueUndefined: boolean;
    name: string;
    parentPolicy: Policy;
    value: any;
}

export interface PolicyInfo {
    description: string;
    moreInfoLink: string;
    name: string;
}

export interface Region {
    /**
     * The number of hosts that are readily available for host creation in this region on this service instance
     */
    availableHostsCount: number;
    /**
     * Display name for the region.
     */
    displayName: string;
    /**
     * Whether the region is default or not
     */
    isDefault: boolean;
    /**
     * Whether the region is internal or not
     */
    isInternal: boolean;
    /**
     * Name identifier for the region.
     */
    name: string;
    /**
     * Short name used in Microsoft Azure. Ex: southcentralus, westcentralus, southindia, etc.
     */
    nameInAzure: string;
    /**
     * The identifier of the service instance that supports host creations in this region
     */
    serviceInstanceId: string;
}

export var TypeInfo = {
    Collection: <any>{
    },
    CollectionSearchKind: {
        enumValues: {
            "unknown": 0,
            "byId": 1,
            "byName": 2,
            "byTenantId": 3
        }
    },
    CollectionStatus: {
        enumValues: {
            "unknown": 0,
            "initial": 10,
            "enabled": 20,
            "logicallyDeleted": 30,
            "markedForPhysicalDelete": 40
        }
    },
    Organization: <any>{
    },
    OrganizationSearchKind: {
        enumValues: {
            "unknown": 0,
            "byId": 1,
            "byName": 2,
            "byTenantId": 3
        }
    },
    OrganizationStatus: {
        enumValues: {
            "unknown": 0,
            "initial": 10,
            "enabled": 20,
            "markedForDelete": 30
        }
    },
    OrganizationType: {
        enumValues: {
            "unknown": 0,
            "personal": 1,
            "work": 2
        }
    },
};

TypeInfo.Collection.fields = {
    dateCreated: {
        isDate: true,
    },
    lastUpdated: {
        isDate: true,
    },
    status: {
        enumType: TypeInfo.CollectionStatus
    }
};

TypeInfo.Organization.fields = {
    collections: {
        isArray: true,
        typeInfo: TypeInfo.Collection
    },
    dateCreated: {
        isDate: true,
    },
    lastUpdated: {
        isDate: true,
    },
    primaryCollection: {
        typeInfo: TypeInfo.Collection
    },
    status: {
        enumType: TypeInfo.OrganizationStatus
    },
    type: {
        enumType: TypeInfo.OrganizationType
    }
};
