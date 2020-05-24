import Telemetry = require("VSS/Telemetry/Services");
import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");

export namespace DiscussionTelemetryUtils {
    export function nextDiscussionPageLoading(totalCount: number, totalNumberPaged: number, additionalProps?: { [key: string]: any }) {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING_MOBILE,
            CIConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_WIT_MOBILEDISCUSSIONMESSAGESLOADED,
            {
                "totalCount": totalCount,
                "totalNumberPaged": totalNumberPaged,
                "URL": location.href,
                ...additionalProps
            }));
    }

    export function fullScreenOpened(numIdentitiesInFirstPage: number, additionalProps?: { [key: string]: any }) { //does this cover "clicks on the discussion control?"
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING_MOBILE,
            CIConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_WIT_MOBILEDISCUSSIONOPENED,
            {
                "numIdentitiesInFirstPage": numIdentitiesInFirstPage,
                "URL": location.href,
                ...additionalProps
            }));
    }

    export function previewClicked(totalCount: number, previewState: string, additionalProps?: { [key: string]: any }) { //does this cover "clicks on the discussion control?"
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING_MOBILE,
            CIConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_WIT_MOBILEDISCUSSIONPREVIEWCLICKED, {
                "totalCount": totalCount,
                "previewState": previewState,
                "URL": location.href,
                ...additionalProps
            }));
    }

    export function commentSubmitted(additionalProps?: { [key: string]: any }) {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING_MOBILE,
            CIConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_WIT_MOBILEDISCUSSIONCOMMENTSUBMITTED,
            {
                "URL": location.href,
                "innerWidth": window.innerWidth,
                "innerHeight": window.innerHeight,
                ...additionalProps
            }));
    }

    export function discussionViewLeftUnsaved(additionalProps?: { [key: string]: any }) {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING_MOBILE,
            CIConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_WIT_MOBILEDISCUSSIONUNSAVEDPREVIEW,
            {
                "URL": location.href,
                ...additionalProps
            }));
    }
}