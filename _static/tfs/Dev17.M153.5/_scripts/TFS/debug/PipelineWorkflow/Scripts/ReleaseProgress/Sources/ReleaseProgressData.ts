import { IWebPageData, WebPageDataHelper } from "PipelineWorkflow/Scripts/Shared/Sources/WebPageData";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import * as Contribution_Services from "VSS/Contributions/Services";
import * as Serialization from "VSS/Serialization";
import * as Service from "VSS/Service";

export interface IReleaseProgressData extends IWebPageData {
    release: RMContracts.Release;
    releaseForceUpdateDurationInSec: number;
}

let ReleaseProgressDataTypeInfo = {
    WebPageData: {
        fields: null as any
    }
};

ReleaseProgressDataTypeInfo.WebPageData.fields = {
    release: {
        typeInfo: RMContracts.TypeInfo.Release
    }
};

export class ReleaseProgressDataHelper extends WebPageDataHelper {

    public static instance(): ReleaseProgressDataHelper {
        return super.getInstance(ReleaseProgressDataHelper);
    }

    public static dispose(): void {
        super.getInstance(ReleaseProgressDataHelper)._data = null;
        super.dispose();
    }

    protected initializeData(dataProviderId: string): void {
        this._data = Service.getService(Contribution_Services.WebPageDataService).getPageData<IReleaseProgressData>(
            dataProviderId,
            ReleaseProgressDataTypeInfo.WebPageData);
    }

    protected getData(): IWebPageData {
        return this._data;
    }

    public getRelease(): RMContracts.Release {
        return this._data
            ? Serialization.ContractSerializer.deserialize(this._data.release, RMContracts.TypeInfo.Release)
            : null;
    }

    public updateRelease(release: RMContracts.Release): void {
        if (this._data && this._data.release && release.id === this._data.release.id) {
            this._data.release = release;
        }
    }

    public getReleaseForceUpdateDurationInSec(): number {
        return this._data ? this._data.releaseForceUpdateDurationInSec : 0;
    }
    
    private _data: IReleaseProgressData;
}
