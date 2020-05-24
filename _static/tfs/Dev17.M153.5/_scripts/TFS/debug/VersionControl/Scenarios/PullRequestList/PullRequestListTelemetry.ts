import * as VSS_Telemetry from "VSS/Telemetry/Services";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

export class PullRequestListTelemetry {
    public logNavigation(featureName: string, cidata: IDictionaryStringTo<any> = {}) {
        this.logActivity(featureName, cidata);
    }

    public logActivity(featureName: string, cidata: IDictionaryStringTo<any> = {}) {
        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA, 
            featureName, cidata), true);
    }

    public onLinkNavigation(featureName: string, cidata: IDictionaryStringTo<any> = {}) {
        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA, 
            featureName, cidata));
    }

    public logListQuery(featureName: string, cidata: IDictionaryStringTo<any> = {}) {
        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA, 
            featureName, cidata));
    }

    public logError(featureName: string, error: Error) {
        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            featureName, {
                errorMessage: error.message,
                errorStack: error.stack,
            }), true);
    }
}