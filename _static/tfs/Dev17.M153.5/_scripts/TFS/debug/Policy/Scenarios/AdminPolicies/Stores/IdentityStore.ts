// libs
import { Store } from "VSS/Flux/Store";
import { autobind } from "OfficeFabric/Utilities";
import { EmptyGuidString } from "VSS/Utils/String"

// contracts
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GitPullRequestStatus } from "TFS/VersionControl/Contracts";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { IEntity } from "VSS/Identities/Picker/RestClient";

// scenario
import { Actions } from "Policy/Scenarios/AdminPolicies/Actions/ActionsHub";
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

//constants
import { ServiceHelpers } from "VSS/Identities/Picker/Services"

export class IdentityStore extends Store {
    private readonly _tfsContext: TfsContext;

    constructor(tfsContext: TfsContext, pageData: any) {
        super();

        this._tfsContext = tfsContext;

        if (pageData.identities) {
            // Cache pre-loaded identities from data island
            pageData.identities.forEach((identity: IdentityRef) => this.cacheIdentity({ entry: identity }));
        }

        if (pageData.pullRequestStatuses) {
            pageData.pullRequestStatuses.forEach((status: GitPullRequestStatus) => {
                if (status && status.createdBy && !this.getIdentity(status.createdBy.id)) {
                    this.cacheIdentity({entry: status.createdBy});
                }
            });
        }

        this.cacheIdentity({
            entry: {
                id: EmptyGuidString,
                displayName: Resources.Unknown,
            } as IdentityRef,
        });

        this.unknownIdentity = this.getIdentity(EmptyGuidString);
    }

    private static isIEntity(entry: (IdentityRef | IEntity)): entry is IEntity {
        return (entry as IEntity).entityId != null;
    }

    @autobind
    public cacheIdentity(payload: Actions.CacheIdentityPayload): void {
        if (!payload.entry) {
            return;
        }

        let identity: IdentityRef;

        if (IdentityStore.isIEntity(payload.entry)) {
            const entity = payload.entry;

            let originIsAad = (entity.originDirectory.trim().toLowerCase() === ServiceHelpers.AzureActiveDirectory);
            let hasLocalId = (entity.active) && (entity.localId != null) && (entity.localId != "");
            let isAad = originIsAad && !hasLocalId;
            let isGroup = entity.entityType.trim().toLowerCase() === ServiceHelpers.GroupEntity;

            identity = {
                id: isAad ? entity.originId : entity.localId,
                isAadIdentity: isAad,
                isContainer: isGroup,
                displayName: entity.displayName,
                imageUrl: entity.image,
            } as IdentityRef;
        }
        else {
            identity = { ...payload.entry };
        }
        this._cacheIdentity(identity);
    }

    private _cacheIdentity(identity: IdentityRef): void {
        const id = identity.id.toLowerCase();

        if (!identity.imageUrl) {
            identity.imageUrl = this._tfsContext.getHostUrl() + this._tfsContext.getIdentityImageUrl(id)
        }

        this._mapping[id] = identity;

        this.emitChanged();
    }

    @autobind
    public getIdentity(id: string): IdentityRef {
        const cachedIdentity = this._mapping[id.toLowerCase()];

        return cachedIdentity || null;
    }

    @autobind
    public beginMaterializingAadGroup(payload: Actions.BeginMaterializingAadGroupPayload): void {
        if (!this.isAadGroupPendingMaterialization(payload.identity)) {
            this._pendingAadGroups.push(payload.identity);
        }
    }

    @autobind
    public completeMaterialization(payload: Actions.CompleteMaterializationPayload): void {
        this._removePendingMaterialization(payload.identity);
        this._aadIdToTfId[payload.identity.originId] = payload.tfid;

        this._cacheIdentity({
            id: payload.tfid,
            isAadIdentity: false,  //it now has a TFID, so as far as the cache is concerned, it is not AAD
            isContainer: true,
            displayName: payload.identity.displayName,
            imageUrl: payload.identity.image
        } as IdentityRef);

        this.emitChanged();
    }

    private _removePendingMaterialization(identity: IEntity): void {
        let index: number = this._pendingAadGroups.findIndex((testId: IEntity) => {
            return testId.originId === identity.originId;
        });

        if (index >= 0) {
            this._pendingAadGroups.splice(index, 1);
        }
    }

    public isAadGroupPendingMaterialization(identity: IEntity): boolean {
        return this._pendingAadGroups.findIndex((testId: IEntity) => {
            return testId.originId === identity.originId;
        }) >= 0;
    }

    //returns null if tfid is not know (not attempted, pending or failed)
    public getTfidForAadGroup(identity: IEntity): string {
        //look for the easy case first
        if (identity.localId) {
            return identity.localId;
        }

        if (this._aadIdToTfId.hasOwnProperty(identity.originId)) {
            return this._aadIdToTfId[identity.originId];
        }

        return null;
    }

    public hasAadGroupMaterializationFailed(identity: IEntity): boolean {
        return this._faildAadGroups.findIndex((testId: IEntity) => {
            return testId.originId === identity.originId;
        }) >= 0;
    }

    @autobind
    public failedMaterialization(payload: Actions.FailedMaterializationPayload): void {
        this._removePendingMaterialization(payload.identity);

        if (!this.hasAadGroupMaterializationFailed(payload.identity)) {
            this._faildAadGroups.push(payload.identity);
        }

        this.emitChanged();
    }


    private readonly _mapping: { [id: string]: IdentityRef } = {};

    private _pendingAadGroups: IEntity[] = [];
    private _aadIdToTfId: IDictionaryStringTo<string> = {};
    private _faildAadGroups: IEntity[] = [];

    public readonly unknownIdentity: IdentityRef;
}
