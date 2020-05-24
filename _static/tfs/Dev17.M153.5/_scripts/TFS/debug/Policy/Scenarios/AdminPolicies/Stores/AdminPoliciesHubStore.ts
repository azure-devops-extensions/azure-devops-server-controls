// libs
import { Store } from "VSS/Flux/Store";
// contracts
import { PolicyType } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";


export class AdminPoliciesHubStore extends Store {

    public readonly projectName: string;

    public readonly repositoryName: string;
    public readonly repositoryId: string;

    public readonly refName: string;
    public readonly friendlyBranchName: string;

    public readonly invalidScope: boolean;
    public readonly scope: string;

    // Link to the edit security page for this branch / repo
    public readonly securityPageUrl: string;

    // Scope JSON object for newly created policies
    public readonly settingsScopeObject: SettingsScopeObject;

    public isWildcardRef: boolean;

    public readonly policyTypes: ExtendedPolicyType[];

    public readonly readonlyMode: boolean;

    constructor(tfsContext: TfsContext, pageData: any) {
        super();

        if (!pageData) {
            this.invalidScope = true;
            return;
        }

        this.invalidScope = !!pageData.invalidScope;

        this.readonlyMode = !!pageData.readonlyMode;

        this.scope = pageData.scope;

        this.settingsScopeObject = pageData.settingsScopeObject || {};

        this.projectName = tfsContext.contextData.project.name;

        this.repositoryName = pageData.repositoryName;
        this.repositoryId = pageData.repositoryId;

        this.refName = pageData.refName;

        if (this.refName === "refs/heads" && this.settingsScopeObject.matchKind === "Prefix") {
            this.friendlyBranchName = "*";
            this.isWildcardRef = true;
        }
        else if (this.refName) {
            // map 'refs/heads/relases/*' to 'releases/*', etc

            const prefixRegex = /^refs\/(head|tag)s\//i;

            this.friendlyBranchName = (pageData.refName as string)
                .replace(prefixRegex, "");

            if (this.settingsScopeObject.matchKind === "Prefix") {
                this.friendlyBranchName += "/*";
                this.isWildcardRef = true;
            }
            else {
                this.isWildcardRef = false;
            }
        }

        this.securityPageUrl = this.computeSecurityPageUrl(tfsContext, pageData);

        this.policyTypes = pageData.policyTypes;
    }

    // Compute URL for the "Security" link
    private computeSecurityPageUrl(tfsContext: TfsContext, pageData: any): string {
        if (!pageData) {
            return null;
        }

        let result: string = tfsContext.getActionUrl("_versioncontrol", "admin", {})
            + `?_a=security&repositoryId=${this.repositoryId}`;

        if (!this.isWildcardRef) {
            // For now we don't link to security page when brach name is a wildcard (e.g., "releases/*"). If the user is editing a
            // wildcard scope, clicking the "Security page" link will just take them to security page for the repo.

            const encodedFriendlyBranchName = encodeURIComponent(this.friendlyBranchName)
                .replace(/%2F/gi, "/")
                .replace(/%42/gi, "*");

            result += `&branchName=${encodedFriendlyBranchName}`;
        }

        return result;
    }
}

export interface ExtendedPolicyType extends PolicyType {
    scopeType?: ("refUpdate" | "repository");
}

export interface SettingsScopeObject {
    refName?: string;
    matchKind?: ("Exact" | "Prefix");
    repositoryId?: string;
}
