/// Copyright (c) Microsoft Corporation. All rights reserved.

import { VCAdminPermissionSet } from "VersionControl/Scenarios/VCAdmin/Stores/VCAdminPermissionsStore";
import * as VCTypes from "VersionControl/Scenarios/VCAdmin/VCAdminTypes";
import { Action } from "VSS/Flux/Action";

export class VCAdminActionsHub {
    // fetch repo options
    public readonly repoOptionsLoaded = new Action<VCTypes.RepositoryOption[]>();
    public readonly repoOptionsLoadFailed = new Action<Error>();

    // write repo options
    public readonly repoOptionsUpdated = new Action();
    public readonly repoOptionUpdateFailed = new Action<VCTypes.RepoOptionUpdateError>();

    // case enforcement
    public readonly caseEnforcementLoaded = new Action<VCTypes.PolicyLoadPayload>();
    public readonly caseEnforcementLoadFailed = new Action<Error>();
    public readonly caseEnforcementUpdated = new Action();
    public readonly caseEnforcementUpdateFailed = new Action<Error>();

    // blob size
    public readonly blobSizeLoaded = new Action<VCTypes.PolicyLoadPayload>();
    public readonly blobSizeLoadFailed = new Action<Error>();
    public readonly blobSizeUpdated = new Action();
    public readonly blobSizeUpdateFailed = new Action<Error>();

    // Secrets Scanning
    public readonly secretsScanningLoaded = new Action<VCTypes.PolicyLoadPayload>();
    public readonly secretsScanningLoadFailed = new Action<Error>();
    public readonly secretsScanningUpdated = new Action();
    public readonly secretsScanningUpdateFailed = new Action<Error>();

    // Path Length
    public readonly pathLengthLoaded = new Action<VCTypes.PolicyLoadPayload>();
    public readonly pathLengthLoadFailed = new Action<Error>();
    public readonly pathLengthUpdated = new Action();
    public readonly pathLengthUpdateFailed = new Action<Error>();

    // Reserved Names
    public readonly reservedNamesLoaded = new Action<VCTypes.PolicyLoadPayload>();
    public readonly reservedNamesLoadFailed = new Action<Error>();
    public readonly reservedNamesUpdated = new Action();
    public readonly reservedNamesUpdateFailed = new Action<Error>();

    public readonly permissionsUpdated = new Action<VCAdminPermissionSet>();
    public readonly permissionsUpdateFailed = new Action<Error>();
}
