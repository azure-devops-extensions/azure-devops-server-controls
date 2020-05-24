import { IWorkItemDataSource } from "WorkItemTracking/Scripts/OM/DataSources/Interfaces";
import { WorkItemDataProviderSource } from "WorkItemTracking/Scripts/OM/DataSources/DataProviderDataSource";
import { QueryDataProviderSource } from "WorkItemTracking/Scripts/OM/DataSources/QueryDataProviderDataSource";
import { WorkItemMvcClient } from "WorkItemTracking/Scripts/OM/DataSources/MvcDataSource";
import { WorkItemMetadataCacheStampManager } from "WorkItemTracking/Scripts/WorkItemMetadataCacheStampManager";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { LegacyWorkItemOnlyDataProviderDataSource } from "WorkItemTracking/Scripts/OM/DataSources/LegacyWorkItemOnlyDataProviderDataSource";
import { WorkItemMetadataCacheInformationManager } from "WorkItemTracking/Scripts/OM/WorkItemMetadataCacheInformationManager";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as VSS_Service from "VSS/Service";
import * as VSSPreview_Experiments from "VSSPreview/Experiments/Services";

export { IWorkItemDataSource };

export function getDataSources(tfsContext: TfsContext, cacheStampManager: WorkItemMetadataCacheStampManager, cacheInformationManager: WorkItemMetadataCacheInformationManager): IWorkItemDataSource[] {
    const dataSources: IWorkItemDataSource[] = [];

    // LWL is the Lightweight loader which we use to indicate if a page is on new/old web platform. Because new web platform is enabled by default, but there are still some old pages like TCM test runner pages that are on the old web platform framework, we need to do a check here
    // to determine if we're on a old web platform page. If we are, we need to ONLY use MVC to prevent serialization bugs.
    if ((window as any).LWL) {
        // Otherwise we can use these other data provdiers

        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessWorkItemTrackingWorkItemFormDataProviders)) {
            // Favor data provider, add in first position
            dataSources.push(new WorkItemDataProviderSource(cacheInformationManager));
        } else {
            dataSources.push(new LegacyWorkItemOnlyDataProviderDataSource());
        }

        // put queries data provider before mvc since queries hub will populate
        // teamprojects call in it's data provider.
        dataSources.push(new QueryDataProviderSource());
    }

    dataSources.push(new WorkItemMvcClient(tfsContext, cacheStampManager));

    return dataSources;
}
