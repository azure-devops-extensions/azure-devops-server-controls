import Q = require("q");

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { Contribution } from "VSS/Contributions/Contracts";
import { ExtensionService, WebPageDataService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";

export function getContributionsForTarget(tfsContext: TfsContext, target: string): IPromise<Contribution[]> {
    return getService(ExtensionService).getContributionsForTarget(target);
}

export function getContributionsForTargets(tfsContext: TfsContext, targetIds: string[]): IPromise<Contribution[]> {
    return getService(ExtensionService).getContributionsForTargets(targetIds);
}

export function contributionExists(contributionId: string): boolean {
    return (typeof getService(WebPageDataService).getPageDataSource(contributionId)) !== "undefined";
}