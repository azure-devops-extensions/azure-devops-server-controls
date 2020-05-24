import { GitRepository } from "TFS/VersionControl/Contracts";

/**
 * Contract to bind page content and page content version
 */
export interface VersionedPageContent {
    content: string,
    version: string,
}

export interface GitRepositoryData {
    cloneUrl: string;
    repository: GitRepository;
    sshEnabled: boolean;
    sshUrl: string;
}
