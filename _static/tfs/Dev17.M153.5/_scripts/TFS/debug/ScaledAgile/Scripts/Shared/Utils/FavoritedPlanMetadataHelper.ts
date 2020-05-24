import { IdentityRef } from "VSS/WebApi/Contracts";
import { PlanMetadata, PlanUserPermissions } from "TFS/Work/Contracts";
import { ArtifactProperties } from "Favorites/Contracts";

export class FavoritedPlanMetadataHelper {
    /**
     * What: Takes metadata dictionary and returns it as a PlanMetadata object. Ensure we always have properties
     * Why: The API allows to save property undefined or with bad input
     */
    public static convertToPlanMetadata(metadata: ArtifactProperties): PlanMetadata {
        return $.extend({
            createdByIdentity: { id: "", displayName: "" } as IdentityRef,
            description: "",
            modifiedDate: null,
            userPermissions: PlanUserPermissions.None,
        } as PlanMetadata, metadata ) as PlanMetadata;
    }
}