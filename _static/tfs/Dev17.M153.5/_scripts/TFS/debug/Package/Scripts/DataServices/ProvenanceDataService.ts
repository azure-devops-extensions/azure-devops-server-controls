import * as Service from "VSS/Service";

import { PackageVersionProvenance } from "Package/Scripts/WebApi/VSS.Feed.Contracts";
import { FeedHttpClient } from "Package/Scripts/WebApi/VSS.Feed.WebApi";

export class ProvenanceDataService extends Service.VssService {
    public async getPackageVersionProvenance(
        feedId: string,
        packageId: string,
        versionId: string
    ): Promise<PackageVersionProvenance> {
        const feedHttpClient = Service.getClient(FeedHttpClient);
        return feedHttpClient.getPackageVersionProvenance(feedId, packageId, versionId);
    }
}
