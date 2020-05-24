
import Q = require("q");

import Contributions_Contracts = require("VSS/Contributions/Contracts");
import Contributions_Controls = require("VSS/Contributions/Controls");
import Contributions_Services = require("VSS/Contributions/Services");
import Service = require("VSS/Service");

import { format, base64Encode } from "VSS/Utils/String";
import { UrlParameterKey } from "TfsCommon/Scripts/CustomerIntelligenceConstants";

import Navigation_Common = require("TfsCommon/Scripts/Navigation/Common");

function resolveProvider(contribution: Contributions_Contracts.Contribution, allHubs: IContributedHub[], ownerContributionId: string, refreshDelegate?: Function): IPromise<IContributedHub> {
    return Contributions_Controls.getBackgroundInstance<IHubsProvider>(contribution, contribution.properties["registeredObjectId"] || contribution.id)
        .then((provider) => {
            if (!provider) {
                throw new Error(`Provider not found for the contribution ${contribution.id}`);
            }

            return Q(provider.getContainerHub({
                contributionId: ownerContributionId,
                refreshDelegate: refreshDelegate
            }));
        })
        .then((containerHub: IContributedHub) => {
            if (containerHub) {
                // If no order specified for the container, set the min order of the children
                if (typeof containerHub.order !== "number" && $.isArray(containerHub.children)) {
                    containerHub.order = Number.MAX_VALUE;
                    let children = <IContributedHub[]>containerHub.children;
                    for (var h of children) {
                        containerHub.order = Math.min(h.order, containerHub.order);
                    }
                }

                allHubs.push(containerHub);
            }

            return containerHub;
        }, (err: Error) => {
            if (window.console) {
                window.console.warn(err.message);
            }
            throw err;
        });
}

export function getHubsFromProviders(targetHubGroupId: string, ownerContributionId: string, refreshDelegate?: Function): IPromise<IContributedHub[]> {
    let contributedHubs: IContributedHub[] = [];

    // Get any hubs providers that target this hub group
    var contributionsPromise = Service.getService(Contributions_Services.ExtensionService).queryContributions(
        [targetHubGroupId],
        Contributions_Services.ContributionQueryOptions.IncludeAll | Contributions_Services.ContributionQueryOptions.LocalOnly,
        Navigation_Common.Constants.HubsProviderContributionType);

    return contributionsPromise.then((contributions) => {
        // Get hubs from hubs providers
        let contributedHubPromises: IPromise<IContributedHub>[] = [];
        for (var c of contributions) {
            if (Contributions_Services.ExtensionHelper.hasContent(c)) {
                // Resolve the hubs for this provider
                let promise = resolveProvider(c, contributedHubs, ownerContributionId, refreshDelegate);
                contributedHubPromises.push(promise);
            }
        }

        return Q.allSettled(contributedHubPromises).then(() => {
            return contributedHubs;
        });
    });
}

export function getUrlWithTrackingData(url: string, data: {
    [key: string]: any;
}): string {
    const result = url + format("{0}{1}={2}",
        (url.indexOf("?") >= 0) ? "&" : "?",
        UrlParameterKey.TrackingData,
        _encodeTelemetryData(data));
    return result;
}

function _encodeTelemetryData(data: any): string {
    const telemetryString = encodeURIComponent(base64Encode(JSON.stringify(data)));
    return telemetryString;
}