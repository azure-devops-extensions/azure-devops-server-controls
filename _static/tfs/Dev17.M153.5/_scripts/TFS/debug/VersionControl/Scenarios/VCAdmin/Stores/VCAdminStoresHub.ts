/// Copyright (c) Microsoft Corporation. All rights reserved.

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { VCAdminActionsHub } from "VersionControl/Scenarios/VCAdmin/Actions/VCAdminActionsHub";
import { PolicyStore } from "VersionControl/Scenarios/VCAdmin/Stores/PolicyStore";
import { RepoOptionsStore } from "VersionControl/Scenarios/VCAdmin/Stores/RepoOptionsStore";
import { VCAdminPermissionsStore } from "VersionControl/Scenarios/VCAdmin/Stores/VCAdminPermissionsStore";

export class VCAdminStoresHub {
    public repoOptionsStore: RepoOptionsStore;
    public caseEnforcementStore: PolicyStore;
    public blobSizeStore: PolicyStore;
    public secretsScanningStore: PolicyStore;
    public pathLengthStore: PolicyStore;
    public reservedNamesStore: PolicyStore;
    public permissionsStore: VCAdminPermissionsStore;

    constructor(actionsHub: VCAdminActionsHub) {
        this.repoOptionsStore = new RepoOptionsStore();
        actionsHub.repoOptionsLoaded.addListener( (payload) => { this.repoOptionsStore.onLoad(payload); });
        actionsHub.repoOptionsLoadFailed.addListener( (error) => { this.repoOptionsStore.onLoadFailed(error); });
        actionsHub.repoOptionUpdateFailed.addListener( (updateError) => { this.repoOptionsStore.onUpdateFailed(updateError); });

        this.caseEnforcementStore = new PolicyStore();
        actionsHub.caseEnforcementLoaded.addListener( (payload) => { this.caseEnforcementStore.onLoad(payload); });
        actionsHub.caseEnforcementLoadFailed.addListener( (error) => { this.caseEnforcementStore.onLoadFailed(error); });
        actionsHub.caseEnforcementUpdateFailed.addListener( (error) => {this.caseEnforcementStore.onLoadFailed(error); });

        this.blobSizeStore = new PolicyStore();
        actionsHub.blobSizeLoaded.addListener( (payload) => { this.blobSizeStore.onLoad(payload); });
        actionsHub.blobSizeLoadFailed.addListener( (error) => {this.blobSizeStore.onLoadFailed(error); });
        actionsHub.blobSizeUpdateFailed.addListener( (error) => {this.blobSizeStore.onLoadFailed(error); });

        this.secretsScanningStore = new PolicyStore();
        actionsHub.secretsScanningLoaded.addListener( (payload) => { this.secretsScanningStore.onLoad(payload) });
        actionsHub.secretsScanningLoadFailed.addListener( (error) => { this.secretsScanningStore.onLoadFailed(error) });
        actionsHub.secretsScanningUpdateFailed.addListener( (error) => {this.secretsScanningStore.onLoadFailed(error) });

        this.pathLengthStore = new PolicyStore();
        actionsHub.pathLengthLoaded.addListener( (payload) => { this.pathLengthStore.onLoad(payload); });
        actionsHub.pathLengthLoadFailed.addListener( (error) => { this.pathLengthStore.onLoadFailed(error); });
        actionsHub.pathLengthUpdateFailed.addListener( (error) => {this.pathLengthStore.onLoadFailed(error); });

        this.reservedNamesStore = new PolicyStore();
        actionsHub.reservedNamesLoaded.addListener( (payload) => { this.reservedNamesStore.onLoad(payload); });
        actionsHub.reservedNamesLoadFailed.addListener( (error) => { this.reservedNamesStore.onLoadFailed(error); });
        actionsHub.reservedNamesUpdateFailed.addListener( (error) => {this.reservedNamesStore.onLoadFailed(error); });

        this.permissionsStore = new VCAdminPermissionsStore();
        actionsHub.permissionsUpdated.addListener( (payload) => { this.permissionsStore.onPermissionsUpdated(payload); });
    }
}
