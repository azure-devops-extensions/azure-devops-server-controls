import { TTIScenario } from "VersionControl/Scenarios/History/TTIScenario"
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

export class TagsPageTelemetrySpy {
    private readonly initialScenario: TTIScenario;

    constructor() {
        this.initialScenario = new TTIScenario("TagsPagePerfromance");
    }

    public abortScenario(): void {
        this.initialScenario.abortScenario();
    }

    public notifyContentRendered(splitTimingName: string): void {
        this.initialScenario.notifyContentRendered(splitTimingName);
    }
}
