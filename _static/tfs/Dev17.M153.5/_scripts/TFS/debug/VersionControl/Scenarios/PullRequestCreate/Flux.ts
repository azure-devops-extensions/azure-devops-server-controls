import { ActionsHub } from "VersionControl/Scenarios/PullRequestCreate/Actions/ActionsHub";
import { StoresHub } from "VersionControl/Scenarios/PullRequestCreate/Stores/StoresHub";
import { CreateSource } from "VersionControl/Scenarios/PullRequestCreate/Sources/CreateSource";
import { FeatureAvailabilitySource } from "VersionControl/Scenarios/Shared/Sources/FeatureAvailabilitySource";
import { PullRequestCreateActionCreator } from "VersionControl/Scenarios/PullRequestCreate/Actions/PullRequestCreateActionCreator";

export class Flux {
    public actionsHub: ActionsHub;
    public storesHub: StoresHub;
    public createActionCreator: PullRequestCreateActionCreator;
    public createSource: CreateSource;
    public featureAvailabilitySource: FeatureAvailabilitySource;

    public constructor() {
        this.actionsHub = new ActionsHub();
        this.storesHub = new StoresHub(this.actionsHub);
        this.createSource = new CreateSource();
        this.featureAvailabilitySource = new FeatureAvailabilitySource();
        this.createActionCreator = new PullRequestCreateActionCreator(this.actionsHub, this.storesHub, this.createSource, this.featureAvailabilitySource);
    }
}