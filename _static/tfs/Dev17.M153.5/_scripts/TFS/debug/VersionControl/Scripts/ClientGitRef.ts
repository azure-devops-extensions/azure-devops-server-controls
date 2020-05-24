import VCContracts = require("TFS/VersionControl/Contracts");

export interface ClientGitRef extends VCContracts.GitRef {
    friendlyName: string;
    isBranch: boolean;
    isTag: boolean;
}