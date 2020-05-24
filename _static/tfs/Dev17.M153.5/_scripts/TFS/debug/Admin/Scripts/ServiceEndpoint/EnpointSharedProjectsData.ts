import Contracts = require("TFS/DistributedTask/Contracts");
export class EnpointSharedProjectsData {
    public allProjects: Contracts.ProjectReference[];
    public sharedProjects: Contracts.ProjectReference[];
}
