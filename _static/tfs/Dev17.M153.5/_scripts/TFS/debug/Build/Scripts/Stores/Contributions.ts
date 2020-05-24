import {QueryResult} from "Build/Scripts/QueryResult";

import * as TFS_React from "Presentation/Scripts/TFS/TFS.React";

import {Action} from "VSS/Flux/Action";

import Contribution_Services = require("VSS/Contributions/Services");
import Utils_String = require("VSS/Utils/String");
import VSS_Service = require("VSS/Service");

export interface ContributionsRetrievedPayload {
    targetId: string;
    contributions: Contribution[];
}
export var contributionsRetrieved = new Action<ContributionsRetrievedPayload>();

class ContributionActionCreator {
    public getContributionsForTarget(targetId: string): void {
        let contributionService = VSS_Service.getService(Contribution_Services.ExtensionService);
        contributionService.getContributionsForTarget(targetId).then((contributions: Contribution[]) => {
            contributionsRetrieved.invoke({
                targetId: targetId,
                contributions: contributions
            });
        }, (err: any) => {
            contributionsRetrieved.invoke({
                targetId: targetId,
                contributions: []
            });
        });
    }
}

export class ContributionStore extends TFS_React.Store {
    private _contributionsByTargetId: IDictionaryStringTo<QueryResult<Contribution[]>> = {};

    constructor() {
        super("CONTRIBUTIONS_STORE_CHANGED");

        contributionsRetrieved.addListener((payload: ContributionsRetrievedPayload) => {
            this._contributionsByTargetId[payload.targetId] = {
                pending: false,
                result: payload.contributions
            };

            this.emitChanged();
        });
    }

    public getContributionsForTarget(targetId: string, contributionType?: string): QueryResult<Contribution[]> {
        let pendingResult = this._contributionsByTargetId[targetId];
        if (!pendingResult) {
            pendingResult = {
                pending: true,
                result: []
            };

            this._contributionsByTargetId[targetId] = pendingResult;

            let actionCreator = new ContributionActionCreator();
            actionCreator.getContributionsForTarget(targetId);
        }

        if (!pendingResult.pending && contributionType) {
            pendingResult = {
                pending: false,
                result: pendingResult.result.filter((contribution) => {
                    return Utils_String.equals(contributionType, contribution.type);
                })
            };
        }

        return pendingResult;
    }
}

var _contributionStore: ContributionStore = null;

export function getContributionStore(): ContributionStore {
    if (!_contributionStore) {
        _contributionStore = new ContributionStore();
    }
    return _contributionStore;
}