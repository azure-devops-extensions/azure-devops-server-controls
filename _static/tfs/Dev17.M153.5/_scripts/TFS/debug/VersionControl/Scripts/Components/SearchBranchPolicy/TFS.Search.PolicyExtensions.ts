export module SearchPolicyTypeIds {
    export let SearchBranchPolicy = "0517f88d-4ec5-4343-9d26-9930ebd53069";
}

export class GitPolicyRepositoryScope {
    public repositoryId: any;

    constructor(repositoryId: any) {
        this.repositoryId = repositoryId;
    }
}

export class SearchGitRepoSettingsForPolicy {
    public scope: GitPolicyRepositoryScope[];
    public searchBranches: string[];

    constructor(scope: GitPolicyRepositoryScope[], searchBranches: string[]) {
        this.scope = scope;
        this.searchBranches = searchBranches;
    }
}
