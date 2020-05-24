import { Action } from "VSS/Flux/Action";
import { ContributionSource } from "Build/Scripts/CI/Sources/Contribution";

import { WebPageDataService } from "VSS/Contributions/Services";
import { handleError } from "VSS/VSS";

export type DataParser<T> = (providerData: IDictionaryStringTo<any>) => T;

export interface IContributionActionCreatorProps<T> {
    actionHub: ContributionActionHub<T>;
    dataParser: DataParser<T>;
    service?: WebPageDataService;
}

export class ContributionActionCreator<T> {
    private _actionHub: ContributionActionHub<T>;
    private _dataParser: DataParser<T>;
    private _source: ContributionSource;

    constructor(options: IContributionActionCreatorProps<T>) {
        this._actionHub = options.actionHub || new ContributionActionHub<T>();
        this._dataParser = options.dataParser;
        this._source = new ContributionSource({
            service: options.service
        });
    }

    public fetchContributionData(contributionId: string, routes?: IDictionaryStringTo<String>, refresh: boolean = false, postActionCallback?: () => any): void {
        this._source.getPageData(contributionId, routes, refresh).then(data => {
            if (!!data) {
                const payload = this._dataParser(data);
                this._actionHub.contributionDataAvailable.invoke(payload);
                if (!!postActionCallback) {
                    postActionCallback();
                }
            }
        }, handleError);
    }
}

export class ContributionActionHub<T> {
    private _contributionDataAvailable: Action<T>;

    constructor() {
        this._contributionDataAvailable = new Action<T>();
    }

    public get contributionDataAvailable(): Action<T> {
        return this._contributionDataAvailable;
    }
}
