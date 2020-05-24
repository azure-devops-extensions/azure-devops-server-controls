import { ActionsHub } from "VersionControl/Scenarios/Explorer/ActionsHub";
import { TelemetryWriter } from "VersionControl/Scenarios/Explorer/Sources/TelemetryWriter";
import { VersionControlChangeType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";

/**
 * Writes telemetry events based on the Explorer actions invoked in Flux.
 */
export class TelemetrySpy {
    private currentTab: string;
    private isPageViewed: boolean;
    private isTabViewed: IDictionaryStringTo<boolean> = {};

    constructor(
        private telemetryWriter: TelemetryWriter,
        actionsHub: ActionsHub) {
        this.registerActionsHubHandlers(actionsHub);
        this.registerCommandHandlers(actionsHub);
        this.registerErrorHandlers(actionsHub);
    }

    private registerActionsHubHandlers(actionsHub: ActionsHub): void {
        actionsHub.currentRepositoryChanged.addListener(this.telemetryWriter.initialScenario.notifyInitialized);

        actionsHub.itemChanged.addListener(payload =>
            this.isPageViewed && payload.hasChangedVersion
            ? this.publishVersionChanged(payload.tab, payload.uiSource)
            : this.publishItemChanged(payload.tab, payload.uiSource));

        actionsHub.editingFileDiscarded.addListener(payload =>
            payload.navigateVersionSpec
            ? this.publishVersionChanged(payload.coercedTab, payload.uiSource)
            : this.publishItemChanged(payload.coercedTab, payload.uiSource));

        actionsHub.tabChanged.addListener(payload =>
            this.publishTabChanged(payload.tab, "explorer-tabs"));

        actionsHub.pathEditingStarted.addListener(payload =>
            this.publish("pathEditingStarted"));

        actionsHub.itemRetrieved.addListener(payload => {
            this.updateTab(payload.coercedTab);

            this.telemetryWriter.initialScenario.notifyItemRetrieved();

            if (payload.notFoundError) {
                this.publishNotFoundError({ isMitigated: true });
            }
        });

        actionsHub.folderLatestChangesRetrieved.addListener(this.telemetryWriter.initialScenario.notifyFolderLatestChangesRetrieved);

        actionsHub.commitDetailsRetrieved.addListener(this.telemetryWriter.initialScenario.notifyCommitDetailsRetrieved);
        actionsHub.fileContentLoaded.addListener(this.telemetryWriter.initialScenario.notifyContentRendered);
    }

    private registerCommandHandlers(actionsHub: ActionsHub): void {
        actionsHub.newFileAsked.addListener(payload =>
            this.publish("newFileAsked", {
                uiSource: payload.uiSource
            }));

        actionsHub.editFileStarted.addListener(payload =>
            this.publish("editFileStarted", {
                uiSource: payload.uiSource,
            }));

        actionsHub.editingFileDiscarded.addListener(payload =>
            this.publish("editingFileDiscarded", {
                uiSource: payload.uiSource,
            }));

        actionsHub.commitPrompted.addListener(payload =>
            this.publish("commitPrompted", {
                changeType: VersionControlChangeType[payload.changeType],
                uiSource: payload.uiSource,
            }));

        actionsHub.commitSaved.addListener(payload => {
            this.updateTab(payload.coercedTab);

            this.publish("commitSaved", {
                changeType: VersionControlChangeType[payload.changeType],
                newBranch: payload.newBranchVersionSpec && payload.newBranchVersionSpec.toDisplayText(),
                hasLinkedWorkitems: payload.hasLinkedWorkitems,
                isCommentDefault: payload.isCommentDefault,
                isFolder: payload.isFolder,
            });
        });

        actionsHub.commitDialogDismissed.addListener(payload =>
            this.publish("commitDialogDismissed", {
                changeType: VersionControlChangeType[payload.changeType],
            }));

        actionsHub.goToPreviousDiffRequested.addListener(payload =>
            this.publish("goToPreviousDiffRequested"));

        actionsHub.goToNextDiffRequested.addListener(payload =>
            this.publish("goToNextDiffRequested"));

        actionsHub.diffInlineToggled.addListener(payload =>
            this.publish("diffInlineToggled"));

        actionsHub.fullScreenChanged.addListener(isFullScreen =>
            this.publish("fullScreenChanged", {
                isFullScreen,
            }));
    }

    private registerErrorHandlers(actionsHub: ActionsHub): void {
        actionsHub.itemRetrievalFailed.addListener(payload => {
            this.telemetryWriter.initialScenario.notifyContentRendered();

            if (payload.notFoundError) {
                this.publishNotFoundError({});
            } else if (payload.resumableError) {
                this.publishNotFoundError({ isResumable: true });
            }
        });

        actionsHub.commitFailed.addListener(error =>
            this.publish("commitFailed"));

        actionsHub.pathSearchFailed.addListener(error =>
            this.publish("pathSearchFailed"));

        actionsHub.historyItemsLoadErrorRaised.addListener(error =>
            this.publish("historyItemsLoadErrorRaised"));
    }

    private publishTabChanged(tab: string, uiSource: string): void {
        this.updateTab(tab);

        this.publish("tabChanged", {
            isTabFirstView: !this.isTabViewed[this.currentTab],
            uiSource,
        });

        this.isTabViewed[this.currentTab] = true;
    }

    private publishItemChanged(tab: string, uiSource: string): void {
        this.updateTab(tab);

        this.publish("itemChanged", {
            isPageFirstView: !this.isPageViewed,
            uiSource,
        });

        this.isPageViewed = true;
        this.isTabViewed[this.currentTab] = true;
    }

    private publishVersionChanged(tab: string, uiSource: string): void {
        this.updateTab(tab);
        this.publish("versionChanged", { uiSource });
    }

    private updateTab(tab: string): void {
        if (tab) {
            this.currentTab = tab;
        }
    }

    private publishNotFoundError(extraProperties: IDictionaryStringTo<any>): void {
        this.telemetryWriter.publish("notFoundError", extraProperties);
    }

    private publish(feature: string, extraProperties: IDictionaryStringTo<any> = {}) {
        this.telemetryWriter.publish(feature, {
            tab: this.currentTab,
            ...extraProperties,
        });
    }
}
