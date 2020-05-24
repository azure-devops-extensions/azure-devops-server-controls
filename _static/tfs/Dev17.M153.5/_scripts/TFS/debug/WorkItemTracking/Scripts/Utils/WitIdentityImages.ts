import Locations = require("VSS/Locations");

/** Common WIT icons, for pseudo-identity concepts such as 'Unassigned'. */
export class WitIdentityImages {
    /** An icon representing the 'unassigned' pseudo-identity . */
    public static UnassignedImageUrl = Locations.urlHelper.getVersionedContentUrl("notassigned-user.svg");

    /** An icon representing 'all users' in the context of filtering by identities. */
    public static AllUsersImageUrl = Locations.urlHelper.getVersionedContentUrl("Team.svg");
}