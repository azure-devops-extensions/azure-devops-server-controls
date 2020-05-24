import { RemoteStore } from "VSS/Flux/Store";

export interface IOrganizationInfo {
    organizationName: string;
    organizationUrl: string;
}

export enum OrgSearchUrlLoadState {
    OrgSearchUrlLoadSucceed,
    OrgSearchUrlLoadFailed,
    OrgSearchUrlLoadNone
}

export interface IOrganizationInfoState {
    organizationInfo: IOrganizationInfo;
    orgSearchUrlLoadState: OrgSearchUrlLoadState;
}

export class OrganizationInfoStore extends RemoteStore {
    private _state: IOrganizationInfoState;

    constructor() {
        super();
        this._state = {
            organizationInfo: {
                organizationName: undefined,
                organizationUrl: undefined
            },
            orgSearchUrlLoadState: OrgSearchUrlLoadState.OrgSearchUrlLoadNone,
        };
    }

    public onOrganizationInfoLoaded = (organizationInfo: IOrganizationInfo): void => {
        this._state.organizationInfo = organizationInfo;
        this._state.orgSearchUrlLoadState = OrgSearchUrlLoadState.OrgSearchUrlLoadSucceed;
        this._loading = false;

        this.emitChanged();
    }

    public onOrganizationInfoLoadFailed = (organizationInfo: IOrganizationInfo): void => {
        this._state.organizationInfo = organizationInfo;
        this._state.orgSearchUrlLoadState = OrgSearchUrlLoadState.OrgSearchUrlLoadFailed;
        this.emitChanged();
    }


    public onResetOrganizationInfoLoadStatus = (): void => {
        this._state.orgSearchUrlLoadState = OrgSearchUrlLoadState.OrgSearchUrlLoadNone;
        this.emitChanged();
    }

    public get state(): IOrganizationInfoState {
        return this._state;
    }
}
