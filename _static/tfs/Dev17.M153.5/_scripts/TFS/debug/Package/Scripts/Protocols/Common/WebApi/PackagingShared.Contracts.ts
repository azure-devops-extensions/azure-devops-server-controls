/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   packaging\client\shared\webapi\clientgeneratorconfigs\genclient.json
 */

"use strict";

/**
 * Data required for promoting multiple package versions. Pass this while performing {protocol}BatchOperationTypes.Promote batch operation.
 */
export interface BatchPromoteData {
    /**
     * Id or Name of the view, packages need to be promoted to.
     */
    viewId: string;
}

/**
 * Minimal package details required to identify a package within a protocol.
 */
export interface MinimalPackageDetails {
    /**
     * Package name.
     */
    id: string;
    /**
     * Package version.
     */
    version: string;
}

/**
 * Type of an upstream source, such as Public or Internal.
 */
export enum PackagingSourceType {
    /**
     * Publicly available source.
     */
    Public = 1,
    /**
     * Azure DevOps upstream source.
     */
    Internal = 2
}

/**
 * Upstream source definition, including its Identity, package type, and other associated information.
 */
export interface UpstreamSourceInfo {
    /**
     * Identity of the upstream source.
     */
    id: string;
    /**
     * Locator for connecting to the upstream source.
     */
    location: string;
    /**
     * Display name.
     */
    name: string;
    /**
     * Source type, such as Public or Internal.
     */
    sourceType: PackagingSourceType;
}

export var TypeInfo = {
    PackagingSourceType: {
        enumValues: {
            "public": 1,
            "internal": 2
        }
    },
    UpstreamSourceInfo: <any>{
    },
};

TypeInfo.UpstreamSourceInfo.fields = {
    sourceType: {
        enumType: TypeInfo.PackagingSourceType
    }
};
