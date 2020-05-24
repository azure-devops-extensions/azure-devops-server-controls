import { WebContext } from "VSS/Common/Contracts/Platform";
import { getData } from "VSS/Contributions/LocalPageData";

export namespace UserClaims {
    /**
     * User is not authenticated.
     */
    export const Anonymous = "anonymous";

    /**
     * User carrying this claim is not a member of the current project but a member of the current account.
     */
    export const Public = "public";

    /**
     * User carrying this claim is a member of the current project.
     */
    export const Member = "member";
}

export interface IUserClaimsService {

    /**
     * Checks whether current user has the specified claim or not.
     * 
     * @param {string} claim User claim to check.
     * @returns {boolean}
     */
    hasClaim: (claim: string) => boolean;
}

class UserClaimsService implements IUserClaimsService {

    private claims: { [claim: string]: boolean };

    public hasClaim(claim: string): boolean {

        if (!this.claims) {
            // Get claims from the shared data
            this.claims = getData<{ [claim: string]: boolean }>("ms.vss-web.user-claims-data") || this.getDefaultClaims();
        }

        claim = (claim || "").toLowerCase();
        return this.claims[claim] === true;
    }

    private getDefaultClaims(): { [claim: string]: boolean } {

        const defaultClaims: { [claim: string]: boolean } = {};
        defaultClaims[UserClaims.Member] = true;
        
        return defaultClaims;
    }
}

const claimsService: IUserClaimsService = new UserClaimsService();

export function getService(): IUserClaimsService {
    return claimsService;
}