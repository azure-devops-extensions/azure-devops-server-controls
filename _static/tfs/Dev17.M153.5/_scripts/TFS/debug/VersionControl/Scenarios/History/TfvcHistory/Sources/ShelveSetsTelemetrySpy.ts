import { TfvcShelveSetsActionsHub } from "VersionControl/Scenarios/History/TfvcHistory/Actions/TfvcShelveSetsActionsHub";
import { TTIScenario } from "VersionControl/Scenarios/History/TTIScenario"

export class ShelveSetsTelemetrySpy {
    private readonly initialScenario: TTIScenario;

    constructor(actionsHub: TfvcShelveSetsActionsHub) {
        this.initialScenario = new TTIScenario("ShelvesetsListPagePerformance");
    }

    public notifyContentRendered(splitTimingName: string): void {
        this.initialScenario.notifyContentRendered(splitTimingName);
    }
}
