import * as Performance from "VSS/Performance";
import { publishEvent, TelemetryEventData } from "VSS/Telemetry/Services";

import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { GitItemFromJsonIsland } from "VersionControl/Scripts/GitItemFromJsonIsland";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";

/**
 * Writes telemetry events for the Code Explorer page.
 */
export class TelemetryWriter {
    public readonly initialScenario: TTIScenario;

    constructor(
        private repositoryContext: RepositoryContext,
        private publishEventFunction: (eventData: TelemetryEventData, immediate?: boolean) => void = publishEvent,
    ) {
        this.initialScenario = new TTIScenario(repositoryContext.getRepositoryType());
    }

    public publish = (feature: string, extraProperties: IDictionaryStringTo<any> = {}): void => {
        this.publishEventFunction(createExplorerEventData(feature, this.repositoryContext, extraProperties));
    }
}

export namespace Constants {
    export const viewName = "ExplorerView";
}

/**
 * Creates a telemetry event with default data for Code Explorer.
 */
export function createExplorerEventData(
    feature: string,
    repositoryContext: RepositoryContext,
    extraProperties: IDictionaryStringTo<any> = {},
): TelemetryEventData {
    const { project } = repositoryContext.getTfsContext().contextData;
    return new TelemetryEventData(
        CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
        `${Constants.viewName}.${feature}`,
        {
            repositoryType: RepositoryType[repositoryContext.getRepositoryType()],
            repositoryId: repositoryContext.getRepositoryId(),
            projectId: project ? project.id : "(collection-level)",
            ...extraProperties,
        });
}

const isTTIScenario = true;

export class TTIScenario {
    private performanceScenario = Performance.getScenarioManager().startScenarioFromNavigation(
        CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
        "NewExplorerViewPerformance",
        isTTIScenario);

    private isRecordedLatestChanges = false;

    constructor(private repositoryType: RepositoryType) {
        this.performanceScenario.addSplitTiming("startedInitialization");

        if (repositoryType === RepositoryType.Git) {
            this.performanceScenario.addData({
                numberOfSeededGitItems: GitItemFromJsonIsland.seededItemCount,
            });
        }
    }

    public notifyInitialized = (): void => {
        if (this.performanceScenario.isActive()) {
            this.performanceScenario.addSplitTiming("initialized");
        }
    }

    public notifyItemRetrieved = (): void => {
        if (this.performanceScenario.isActive()) {
            this.performanceScenario.addSplitTiming("itemRetrieved");
        }
    }

    public notifyFolderLatestChangesRetrieved = (): void => {
        if (!this.isRecordedLatestChanges) {
            this.performanceScenario.addSplitTiming("folderLatestChangesRetrieved");
        }
    }

    public notifyCommitDetailsRetrieved = (): void => {
        if (!this.isRecordedLatestChanges) {
            this.performanceScenario.addSplitTiming("commitDetailsRetrieved");

            this.isRecordedLatestChanges = true;
        }
    }

    public notifyTreeRendered = (itemsCount: number): void => {
        if (this.performanceScenario.isActive() && itemsCount > 0) {
            this.performanceScenario.addSplitTiming("treeRendered");
        }
    }

    public notifyContentRendered = (): void => {
        if (this.performanceScenario.isActive()) {
            this.performanceScenario.addSplitTiming("contentRendered");

            this.performanceScenario.end();
        }
    }
}
