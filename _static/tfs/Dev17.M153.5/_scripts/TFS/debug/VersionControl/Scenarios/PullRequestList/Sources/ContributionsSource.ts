import VSS_Service = require("VSS/Service");
import Contribution_Services = require("VSS/Contributions/Services");

export interface IContributionsSource {
    getContributionsForTarget(targetId: string, contributionType: string): IPromise<Contribution[]>;
}

export class ContributionsSource implements IContributionsSource {

    public getContributionsForTarget(targetId: string, contributionType: string): IPromise<Contribution[]> {
        const contributionService = VSS_Service.getService(Contribution_Services.ExtensionService);
        return contributionService.getContributionsForTarget(targetId, contributionType);
    }
}