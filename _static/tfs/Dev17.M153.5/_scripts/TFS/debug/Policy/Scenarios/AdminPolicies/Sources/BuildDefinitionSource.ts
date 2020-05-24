// libs
import * as Service from "VSS/Service";
import * as Q from "q";
import { WebPageDataService } from "VSS/Contributions/Services";
// contracts
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { Build } from "Policy/Scripts/PolicyTypes";

export interface BuildDefinitionsResult {
    definitions: Build.IBuildDefinitionSummary[];
    continuationToken: string;
}

export interface IBuildDefinitionSource {
    getBuildDefinitionsAsync(params: { top?: number; continuationToken?: string; }): IPromise<BuildDefinitionsResult>;
}

export class BuildDefinitionSource implements IBuildDefinitionSource {
    private readonly _tfsContext: TfsContext;
    private readonly _repositoryId: string;

    constructor(tfsContext: TfsContext, repositoryId: string) {
        this._tfsContext = tfsContext;
        this._repositoryId = repositoryId;
    }

    public getBuildDefinitionsAsync(params: { top?: number; continuationToken?: string; }): IPromise<BuildDefinitionsResult> {

        const requestParams = {
            repositoryId: this._repositoryId,
            ...params,
        };

        const pageDataService = Service.getService(WebPageDataService);
        const dataProviderId = "ms.vss-code-web.admin-policies-build-definitions-data-provider";

        return pageDataService.getDataAsync<BuildDefinitionsResult>(dataProviderId, null, requestParams);
    }
}
