import { TTIScenario } from "VersionControl/Scenarios/History/TTIScenario"

export class ChangeSetsTelemetrySpy {
    private readonly initialScenario: TTIScenario;

    constructor() {
        this.initialScenario = new TTIScenario("ChangesetsListPagePerformance");
    }

    public abortScenario() {
        this.initialScenario.abortScenario();
    }

    public notifyContentRendered(splitTimingName: string): void {
        this.initialScenario.notifyContentRendered(splitTimingName);
    }
}
