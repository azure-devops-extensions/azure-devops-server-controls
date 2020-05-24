import { PullRequestListTelemetry } from "VersionControl/Scenarios/PullRequestList/PullRequestListTelemetry";
import { MyExperiencesTelemetry } from "MyExperiences/Scripts/Telemetry";

export class MyPullRequestListTelemetry extends PullRequestListTelemetry {
    public logNavigation(featureName: string, cidata: IDictionaryStringTo<any> = {}) {
       MyExperiencesTelemetry.LogNavigation();
    }

    public logActivity(featureName: string, cidata: IDictionaryStringTo<any> = {}) {
        cidata["myPullRequestList"] = true;
        super.logActivity(featureName, cidata);
    }

    public onLinkNavigation() {
        MyExperiencesTelemetry.LogNavigation();
    }
}