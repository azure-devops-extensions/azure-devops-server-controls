import { autobind } from "OfficeFabric/Utilities";
import { RemoteStore } from "VSS/Flux/Store";

import { IOrganizationInfo } from "MyExperiences/Scenarios/Shared/Models";

export class IOrganizationInfoState {
    organizationInfo: IOrganizationInfo;
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
        };
    }

    @autobind
    public onOrganizationInfoLoaded(organizationInfo: IOrganizationInfo): void {
        this._state.organizationInfo = organizationInfo;
        this._loading = false;

        this.emitChanged();
    }

    public get state(): IOrganizationInfoState {
        return this._state;
    }
}
