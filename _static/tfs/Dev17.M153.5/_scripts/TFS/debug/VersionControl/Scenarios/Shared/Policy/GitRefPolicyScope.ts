export class GitRefPolicyScope {
    public repositoryId: any;
    public refName: string;
    public matchKind: string;

    constructor(repositoryId: any, refName: string, matchKind: string) {
        this.repositoryId = repositoryId;
        this.refName = refName;
        this.matchKind = matchKind;
    }
}