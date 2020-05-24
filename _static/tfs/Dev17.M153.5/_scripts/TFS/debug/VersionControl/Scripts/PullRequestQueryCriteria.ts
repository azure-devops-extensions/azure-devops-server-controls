import VCContracts = require("TFS/VersionControl/Contracts");

/**
 * Class used to update the criteria used to fetch pull requests.
 */
class PullRequestQueryCriteria {
    public status: VCContracts.PullRequestStatus;
    public authorId: string;
    public reviewerId: string;

    public top: number;
    public skip: number;
}

export = PullRequestQueryCriteria;
