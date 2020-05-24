//*********************************************************************************************
// TFS.WorkItemTracking.Extensions.ts
//   Classes/interfaces in this file are responsible for loading contributions from
//   the ExtensionService.
//*********************************************************************************************

import Q = require("q");
import Contributions_Contracts = require("VSS/Contributions/Contracts");
import Contributions_Controls = require("VSS/Contributions/Controls");
import Contributions_Services = require("VSS/Contributions/Services");
import Service = require("VSS/Service");
import Context = require("VSS/Context");
import Utils_String = require("VSS/Utils/String");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");

export module Contributions {
    export var WORK_WEB = "ms.vss-work-web.";

    // Contribution ids
    export var WORKITEM_FORM_CONTRIBUTION = "work-item-form";
    export var WORKITEM_FORM_CONTRIBUTION_SERVICE = WORK_WEB + WORKITEM_FORM_CONTRIBUTION;

    // Contribution types
    export var WORKITEM_FORM_SERVICE_CONTRIBUTION_TYPE = WORK_WEB + "work-item-notifications";
}

export interface IContribution {
    host: Contributions_Controls.IExtensionHost;
    objectId: string;
    contribution: Contributions_Contracts.Contribution;
    uri: string;
}

export interface IContributionWithSource<T> extends IContribution {
    source?: T;
}

export class ContributionService {
    private static _contributionSourceTimeout: number = 5000;

    public static getServiceContributions<T>(contributionIds: string[]): IPromise<IContributionWithSource<T>[]> {
        return ContributionService._getServiceContributions<T>(contributionIds);
    }

    public static getContribution<T>(contributionId: string): IPromise<Contributions_Contracts.Contribution> {
        return Service.getService(Contributions_Services.ExtensionService).getContribution(contributionId);
    }

    public static getControlContributionInstance<T>(contributionHost: Contributions_Controls.IExtensionHost, contributionObjectId: string): IPromise<IContributionWithSource<T>> {
            return contributionHost.getRegisteredInstance<T>(contributionObjectId, Context.getDefaultWebContext()).then((value: T) => {
                return {
                    host: contributionHost,
                    objectId: contributionObjectId,
                    contribution: null,
                    uri: null,
                    source: value
                };
            }, (reason) => {
                throw new Error(Utils_String.format(WorkItemTrackingResources.CannotGetRegisteredInstance, contributionObjectId));
            });
    }

    private static _getServiceContributions<T>(contributionIds: string[]): IPromise<IContributionWithSource<T>[]> {
        var contributionsPromise: IPromise<IContributionWithSource<T>[]>;
        if (contributionIds && contributionIds.length) {
            contributionsPromise = Service.getService(Contributions_Services.ExtensionService).getContributionsForTargets(contributionIds).then((contributions) => {
                var deferred = Q.defer<IContributionWithSource<T>[]>();
                var promises: IPromise<IContributionWithSource<T>>[] = [];

                contributions.forEach((contribution) => {
                    if (Utils_String.ignoreCaseComparer(contribution.type, Contributions.WORKITEM_FORM_SERVICE_CONTRIBUTION_TYPE) === 0) {
                        var promise = ContributionService._getServiceContributionWithSource<T>(contribution);
                        if (promise) {
                            promises.push(promise);
                        }
                    }
                });

                // Resolve the deferred once all sources are fetched.
                Q.allSettled(promises).then((resolutions) => {
                    var contributionsWithSources: IContributionWithSource<T>[] = [];
                    resolutions.forEach((resolution) => {
                        if (resolution.value) {
                            contributionsWithSources.push(resolution.value);
                        }
                    });
                    deferred.resolve(contributionsWithSources);
                }, deferred.reject);

                return deferred.promise;
            });
        }
        else {
            contributionsPromise = Q.resolve([]);
        }

        return contributionsPromise;
    }

    private static _getServiceContributionWithSource<T>(contribution: Contributions_Contracts.Contribution): IPromise<IContributionWithSource<T>> {
        return ContributionService._getContributionWithSource(contribution, (contribution, contributionObjectId, uri) => {
            return Contributions_Controls.getBackgroundHost(contribution).then((contributionHost) => {
                return contributionHost.getRegisteredInstance<T>(contributionObjectId, Context.getDefaultWebContext()).then((value: T) => {
                    return {
                        host: contributionHost,
                        objectId: contributionObjectId,
                        contribution: contribution,
                        uri: uri,
                        source: value
                    };
                }, (reason) => {
                    throw new Error(Utils_String.format(WorkItemTrackingResources.CannotGetRegisteredInstance, contributionObjectId));
                });
            });
        });
    }

    private static _getContributionWithSource<T>(contribution: Contributions_Contracts.Contribution, onGetContributionSource: (contribution: Contributions_Contracts.Contribution, contributionObjectId: string, uri: string) => IPromise<IContributionWithSource<T>>): IPromise<IContributionWithSource<T>> {
        var contributionId = contribution.id || "";
        if (contributionId && contribution.properties["uri"]) {
            var getTemplateUriPromise = Contributions_Services.ExtensionHelper.resolveUriTemplateProperty(contribution, Context.getDefaultWebContext());
            return Q.timeout(<Q.Promise<IContributionWithSource<T>>>getTemplateUriPromise.then((uri) => {
                return onGetContributionSource(contribution, contributionId, uri);
            }), ContributionService._contributionSourceTimeout, Utils_String.format(WorkItemTrackingResources.ContributionTimedOut, contributionId));
        }
        else {
            throw new Error(Utils_String.format(WorkItemTrackingResources.MissingUri, contributionId));
        }
    }
}
