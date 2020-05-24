import { getService } from "VSS/Service";
import { IPromise } from "q";
import { BuildClientService } from "Build.Common/Scripts/ClientServices";
import { GetBuildsResult, GetDefinitionsResult, IBuildFilter, IBuildFilterBase, GetDefinitionsOptions } from "Build.Common/Scripts/ClientContracts";

import * as BuildContracts from "TFS/Build/Contracts";
import { CIDataProviderKeys } from "Build/Scripts/Generated/TFS.Build.Plugins";

export interface IBuildSourceOptions {
    service?: BuildClientService;
}

export class BuildSource {
    private _service: BuildClientService;

    constructor(options?: IBuildSourceOptions) {
        this._service = (options && options.service) || getService(BuildClientService);
    }

    public getTopBuildsforDefinition(definitionId: number): IPromise<GetBuildsResult> {
        let filter: IBuildFilter = {
            definitions: definitionId.toString(),
            $top: 25
        };
        return this._service.getBuilds(filter);
    }

    public getBuilds(filter: IBuildFilter): IPromise<GetBuildsResult> {
        return this._service.getBuilds(filter);
    }

    public getCompletedBuilds(filter: IBuildFilterBase): IPromise<GetBuildsResult> {
        return this._service.getCompletedBuilds(filter);
    }

    public getRunningBuilds(filter: IBuildFilterBase): IPromise<GetBuildsResult> {
        return this._service.getRunningBuilds(filter);
    }

    public getQueuedBuilds(filter: IBuildFilterBase): IPromise<GetBuildsResult> {
        return this._service.getQueuedBuilds(filter);
    }

    public getAllBuilds(filter: IBuildFilterBase): IPromise<GetBuildsResult> {
        return this._service.getAllBuilds(filter);
    }

    public deleteBuild(buildId: number): IPromise<any> {
        return this._service.deleteBuild(buildId);
    }

    public deleteDefinition(definitionId: number): IPromise<any> {
        return this._service.deleteDefinition(definitionId);
    }

    public retainBuild(buildId: number, retainState: boolean): IPromise<BuildContracts.Build> {
        return this._service.updateBuildRetainFlag(buildId, retainState);
    }
}
