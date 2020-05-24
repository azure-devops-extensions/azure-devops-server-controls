import Diag = require("VSS/Diag");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Q = require("q");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import VSS_Service = require("VSS/Service");
import { WebPageDataService } from "VSS/Contributions/Services";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";

interface IWorkItemSettings {
    maxAttachmentSize: number;
}

/** This data provider is only used here for AT/DT mismatch and should be removed after S129 deployment */
const LAYOUT_USER_SETTINGS_DATA_PROVIDER_ID = "ms.vss-work-web.work-item-layout-user-settings-data-provider";
const WORK_ITEM_SETTINGS_DATA_PROVIDER_ID = "ms.vss-work-web.work-item-common-configuration-data-provider";

/** Default attachment size in bytes */
const DefaultMaxAttachmentSize = 4194304;

/**
 * Utility class for get if new/old work item form
 */
export class WitFormModeUtility {
    private static settings: IWorkItemSettings = {} as IWorkItemSettings;

    public static get maxAttachmentSize(): number {
        return WitFormModeUtility.settings.maxAttachmentSize;
    }

    public static isMobileForm: boolean;

    // Ensure the wit form mode is loaded. This will allow us to know if we are in new form mode or old
    public static ensureWitFormModeLoaded(): IPromise<void> {
        WitFormModeUtility.loadLayoutPropertiesFromPageData();

        if (WitFormModeUtility._shouldFetchData()) {
            Diag.timeStamp("WorkItemOM.isNewFormEnabledCallback", Diag.StampEvent.Enter);

            const webPageDataService = VSS_Service.getService(WebPageDataService);
            return webPageDataService.ensureDataProvidersResolved([
                {
                    id: LAYOUT_USER_SETTINGS_DATA_PROVIDER_ID,
                    properties: {
                        serviceInstanceType: ServiceInstanceTypes.TFS
                    }
                } as Contribution,
                {
                    id: WORK_ITEM_SETTINGS_DATA_PROVIDER_ID,
                    properties: {
                        serviceInstanceType: ServiceInstanceTypes.TFS
                    }
                } as Contribution
            ]).then(
                () => {
                    Diag.timeStamp("WorkItemOM.isNewFormEnabledCallback", Diag.StampEvent.Leave);

                    WitFormModeUtility.loadLayoutPropertiesFromPageData();
                },
                (error) => {
                    Diag.timeStamp("WorkItemOM.isNewFormEnabledCallback", Diag.StampEvent.Leave);
                });
        } else {
            return Q(null);
        }
    }

    private static _shouldFetchData(): boolean {
        return !WitFormModeUtility.maxAttachmentSize;
    }

    public static loadLayoutPropertiesFromPageData(): void {
        const webPageDataService = VSS_Service.getService(WebPageDataService);

        // For AT/DT mismatch scenarios we query both data providers, with workItemSettings taking precedence
        const layoutUserSettings: IWorkItemSettings = webPageDataService.getPageData(LAYOUT_USER_SETTINGS_DATA_PROVIDER_ID);
        const workItemSettings: IWorkItemSettings = webPageDataService.getPageData(WORK_ITEM_SETTINGS_DATA_PROVIDER_ID);

        WitFormModeUtility.settings = {
            ...workItemSettings,
            ...layoutUserSettings
        };
    }
}

export function isNewDiscussionMaximizable() {
    return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WorkItemTrackingNewFormDiscussionMaximizable);
}

export function isFollowWorkItemEnabled(tfsContext: TFS_Host_TfsContext.TfsContext): boolean {
    return (tfsContext.configuration && tfsContext.configuration.getMailSettings().enabled);
}

export function isVisualizeFollowsEnabled(tfsContext: TFS_Host_TfsContext.TfsContext): boolean {
    return (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WorkItemTrackingVisualizeFollows))
        && isFollowWorkItemEnabled(tfsContext);
}

export function isBulkUnfollowEnabled(tfsContext: TFS_Host_TfsContext.TfsContext): boolean {
    return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WorkItemTrackingBulkUnfollows)
        && isVisualizeFollowsEnabled(tfsContext);
}

export function useNewDragDrop(): boolean {
    return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.NewDragDropAttachments);
}

export function isNewHtmlEditorEnabled(): boolean {
    return (
        FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessWorkItemTrackingFormRoosterEnable, true) &&
        !WitFormModeUtility.isMobileForm
    );
}
