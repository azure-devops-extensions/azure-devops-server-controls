/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   packaging\client\maven\webapi\clientgeneratorconfigs\genclient.json
 */

"use strict";

import VSS_Common_Contracts = require("VSS/WebApi/Contracts");

export enum MavenBatchOperationType {
    /**
     * Promote package versions to a release view. If constructing a MavenPackagesBatchRequest object with this type, use BatchPromoteData for its Data property. Not supported in the Recycle Bin.
     */
    Promote = 0,
    /**
     * Delete package versions. Not supported in the Recycle Bin.
     */
    Delete = 1,
    /**
     * Permanently delete package versions. Only supported in the Recycle Bin.
     */
    PermanentDelete = 2,
    /**
     * Restore unpublished package versions to the feed. Only supported in the Recycle Bin.
     */
    RestoreToFeed = 3
}

export interface MavenDistributionManagement {
    repository: MavenRepository;
    snapshotRepository: MavenSnapshotRepository;
}

/**
 * Identifies a particular Maven package version
 */
export interface MavenMinimalPackageDetails {
    /**
     * Package artifact ID
     */
    artifact: string;
    /**
     * Package group ID
     */
    group: string;
    /**
     * Package version
     */
    version: string;
}

export interface MavenPackage {
    artifactId: string;
    artifactIndex: VSS_Common_Contracts.ReferenceLink;
    artifactMetadata: VSS_Common_Contracts.ReferenceLink;
    deletedDate: Date;
    files: any;
    groupId: string;
    pom: MavenPomMetadata;
    requestedFile: VSS_Common_Contracts.ReferenceLink;
    snapshotMetadata: VSS_Common_Contracts.ReferenceLink;
    version: string;
    versions: any;
    versionsIndex: VSS_Common_Contracts.ReferenceLink;
}

/**
 * A batch of operations to apply to package versions.
 */
export interface MavenPackagesBatchRequest {
    /**
     * Data required to perform the operation. This is optional based on type of operation. Use BatchPromoteData if performing a promote operation.
     */
    data: any;
    /**
     * Type of operation that needs to be performed on packages.
     */
    operation: MavenBatchOperationType;
    /**
     * The packages onto which the operation will be performed.
     */
    packages: MavenMinimalPackageDetails[];
}

/**
 * Deletion state of a maven package.
 */
export interface MavenPackageVersionDeletionState {
    /**
     * Artifact Id of the package.
     */
    artifactId: string;
    /**
     * UTC date the package was deleted.
     */
    deletedDate: Date;
    /**
     * Group Id of the package.
     */
    groupId: string;
    /**
     * Version of the package.
     */
    version: string;
}

export interface MavenPomBuild {
    plugins: Plugin[];
}

export interface MavenPomCi {
    notifiers: MavenPomCiNotifier[];
    system: string;
    url: string;
}

export interface MavenPomCiNotifier {
    configuration: string[];
    sendOnError: string;
    sendOnFailure: string;
    sendOnSuccess: string;
    sendOnWarning: string;
    type: string;
}

export interface MavenPomDependency extends MavenPomGav {
    optional: boolean;
    scope: string;
    type: string;
}

export interface MavenPomDependencyManagement {
    dependencies: MavenPomDependency[];
}

export interface MavenPomGav {
    artifactId: string;
    groupId: string;
    version: string;
}

export interface MavenPomIssueManagement {
    system: string;
    url: string;
}

export interface MavenPomLicense extends MavenPomOrganization {
    distribution: string;
}

export interface MavenPomMailingList {
    archive: string;
    name: string;
    otherArchives: string[];
    post: string;
    subscribe: string;
    unsubscribe: string;
}

export interface MavenPomMetadata extends MavenPomGav {
    build: MavenPomBuild;
    ciManagement: MavenPomCi;
    contributors: MavenPomPerson[];
    dependencies: MavenPomDependency[];
    dependencyManagement: MavenPomDependencyManagement;
    description: string;
    developers: MavenPomPerson[];
    distributionManagement: MavenDistributionManagement;
    inceptionYear: string;
    issueManagement: MavenPomIssueManagement;
    licenses: MavenPomLicense[];
    mailingLists: MavenPomMailingList[];
    modelVersion: string;
    modules: string[];
    name: string;
    organization: MavenPomOrganization;
    packaging: string;
    parent: MavenPomParent;
    prerequisites: { [key: string] : string; };
    properties: { [key: string] : string; };
    scm: MavenPomScm;
    url: string;
}

export interface MavenPomOrganization {
    name: string;
    url: string;
}

export interface MavenPomParent extends MavenPomGav {
    relativePath: string;
}

export interface MavenPomPerson {
    email: string;
    id: string;
    name: string;
    organization: string;
    organizationUrl: string;
    roles: string[];
    timezone: string;
    url: string;
}

export interface MavenPomScm {
    connection: string;
    developerConnection: string;
    tag: string;
    url: string;
}

export interface MavenRecycleBinPackageVersionDetails {
    /**
     * Setting to false will undo earlier deletion and restore the package to feed.
     */
    deleted: boolean;
}

export interface MavenRepository {
    uniqueVersion: boolean;
}

export interface MavenSnapshotRepository extends MavenRepository {
}

/**
 * Package version metadata for a Maven package
 */
export interface Package {
    /**
     * Related REST links.
     */
    _links: any;
    /**
     * If and when the package was deleted.
     */
    deletedDate: Date;
    /**
     * Package Id.
     */
    id: string;
    /**
     * The display name of the package.
     */
    name: string;
    /**
     * If and when the package was permanently deleted.
     */
    permanentlyDeletedDate: Date;
    /**
     * The version of the package.
     */
    version: string;
}

export interface Plugin extends MavenPomGav {
    configuration: PluginConfiguration;
}

export interface PluginConfiguration {
    goalPrefix: string;
}

export var TypeInfo = {
    MavenBatchOperationType: {
        enumValues: {
            "promote": 0,
            "delete": 1,
            "permanentDelete": 2,
            "restoreToFeed": 3
        }
    },
    MavenPackage: <any>{
    },
    MavenPackagesBatchRequest: <any>{
    },
    MavenPackageVersionDeletionState: <any>{
    },
    Package: <any>{
    },
};

TypeInfo.MavenPackage.fields = {
    deletedDate: {
        isDate: true,
    }
};

TypeInfo.MavenPackagesBatchRequest.fields = {
    operation: {
        enumType: TypeInfo.MavenBatchOperationType
    }
};

TypeInfo.MavenPackageVersionDeletionState.fields = {
    deletedDate: {
        isDate: true,
    }
};

TypeInfo.Package.fields = {
    deletedDate: {
        isDate: true,
    },
    permanentlyDeletedDate: {
        isDate: true,
    }
};
