import * as VSSStore from "VSS/Flux/Store";
import { TfsContext, IRouteData } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GitRepository } from "TFS/VersionControl/Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { TfvcRepositoryContext } from "VersionControl/Scripts/TfvcRepositoryContext";
import { BuildConstants, RMConstants } from "ProjectOverview/Scripts/Constants";
import { CodeMetrics, BuildMetrics, MetricState, ReleaseMetrics } from "ProjectOverview/Scripts/Stores/MetricsStore";
import { WitAvailabilityStatus, ReleaseAvailabilityStatus } from "ProjectOverview/Scripts/ActionsHub";
import { UpsellTypes } from "ProjectOverview/Scripts/Generated/Contracts";
import { ReadmeState, ReadmeFileState, ReadmeEditState } from "ProjectOverview/Scripts/Stores/ReadmeStore";
import { ReadmeFile, ReadmeEditorState } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeInterfaces";

export function getRepositoryContext(isTfvcRepository: boolean, gitRepository?: GitRepository): RepositoryContext {
    if (isTfvcRepository) {
        return TfvcRepositoryContext.create();
    }

    return GitRepositoryContext.create(gitRepository);
}

export function getTfvcRepositoryName(tfsContext: TfsContext): string {
    return "$/" + tfsContext.contextData.project.name;
}

export function toNewReadmeEditorState(readmeState: ReadmeState): ReadmeEditorState {
    const readmeFileState = readmeState.readmeFileState || {} as ReadmeFileState;
    const readmeEditState = readmeState.readmeEditState || {} as ReadmeEditState;

    return {
        readmeFile: toNewReadmeFile(readmeState),
        isEditing: readmeFileState.isEditing,
        isNewFile: readmeEditState.isNewFile,
        editedContent: readmeEditState.editingContent,
        isLoseChangesDialogVisible: readmeEditState.isLoseChangesDialogVisible,
        currentReadmeEditModeTab: readmeEditState.currentReadmeEditModeTab,
        isDiffInline: readmeEditState.isDiffInline,
        newReadmeDefaultContent: readmeEditState.defaultContent,
    }
}

export function toNewReadmeFile(readmeState: ReadmeState): ReadmeFile {
    const readmeFileState = readmeState.readmeFileState || {} as ReadmeFileState;

    return {
        repositoryContext: readmeState.currentRepositoryContext,
        content: readmeState.content,
        itemModel: readmeFileState.itemModel,
        isItemModelComplete: readmeFileState.isItemModelComplete,
        renderer: readmeFileState.renderer,
    };
}

/*
* Takes care of listening and disposing to store changed events
*/
export class StoreListener {
    private _disposeStoreListeners: Function[] = [];

    /**
     * Add change listener for given store
     * @param store - VSS Store for which change listener is to be added
     * @param handle - handler for store change
     */
    public addChangedListener<TPayload>(store: VSSStore.Store, handle: (payload: TPayload) => void): void {
        store.addChangedListener(handle);
        this._disposeStoreListeners.push(() => store.removeChangedListener(handle));
    }

    /**
     * Add same handler for change listener for multiple stores
     * @param stores - List of VSS Store for which change listener is to be added
     * @param handle - handler for store change
     */
    public addChangedListenerForMultipleStores<TPayload>(stores: VSSStore.Store[], handle: (payload: TPayload) => void): void {
        stores.forEach(store => {
            store.addChangedListener(handle);
            this._disposeStoreListeners.push(() => store.removeChangedListener(handle));
        });
    }

    public disposeAllListeners(): void {
        if (this._disposeStoreListeners) {
            this._disposeStoreListeners.map(dispose => dispose());
            this._disposeStoreListeners = undefined;
        }
    }
}

export class UrlHelper {
    public static getNewBuildDefinitionUrl(): string {
        let routeData = {
            _a: "new",
            source: "projecthome"
        };

        return TfsContext.getDefault().getActionUrl() + BuildConstants.NewBuildDefinitionUrl;
    }

    public static getWorkTabUrl(): string {
        return TfsContext.getDefault().getActionUrl("board", "backlogs");
    }

    public static getNewReleaseDefinitionUrl(): string {
        return TfsContext.getDefault().getActionUrl() + RMConstants.NewRDEditorFromHomePage;
    }
}

export class UpsellHelper {

    public static getCandidateUpsells(dismissedUpsells: IDictionaryNumberTo<boolean>): UpsellTypes[] {
        const candidateUpsells: UpsellTypes[] = [];

        if (!dismissedUpsells[UpsellTypes.All]) {
            if (!dismissedUpsells[UpsellTypes.Build]) {
                candidateUpsells.push(UpsellTypes.Build);
            }
            if (!dismissedUpsells[UpsellTypes.Code]) {
                candidateUpsells.push(UpsellTypes.Code);
            }
            if (!dismissedUpsells[UpsellTypes.Release]) {
                candidateUpsells.push(UpsellTypes.Release);
            }
            if (!dismissedUpsells[UpsellTypes.Work]) {
                candidateUpsells.push(UpsellTypes.Work);
            }
        }

        return candidateUpsells;
    }

    public static getUpsellToShow = (
        candidateUpsells: UpsellTypes[],
        permissibleUpsells: UpsellTypes[],
        metricsState: MetricState,
        hasBuildConfigured: boolean,
        hasCode: boolean): UpsellTypes => {

        let candidateUpsellToShow: UpsellTypes = null;

        if (UpsellHelper._isCandidateUpsell(candidateUpsells, UpsellTypes.Build) && !hasBuildConfigured) {
            candidateUpsellToShow = UpsellTypes.Build;
        }
        else if (UpsellHelper._isCandidateUpsell(candidateUpsells, UpsellTypes.Code)
            && !hasCode
            && UpsellHelper.getBuildsCount(metricsState.buildMetrics) >= 1) {
            candidateUpsellToShow = UpsellTypes.Code;
        }
        else if (UpsellHelper._isCandidateUpsell(candidateUpsells, UpsellTypes.Release)
            && metricsState.releaseMetrics.releaseAvailability === ReleaseAvailabilityStatus.DefinitionsAbsent
            && UpsellHelper.getBuildsCount(metricsState.buildMetrics) >= 3) {
            candidateUpsellToShow = UpsellTypes.Release;
        }
        else if (UpsellHelper._isCandidateUpsell(candidateUpsells, UpsellTypes.Work)
            && (metricsState.workMetrics.witAvailable === WitAvailabilityStatus.NoneCreated)
            && (UpsellHelper.getCommitsCount(metricsState.codeMetrics) >= 5
            || UpsellHelper.getBuildsCount(metricsState.buildMetrics) >= 3
            || UpsellHelper.getReleasesCount(metricsState.releaseMetrics) >= 1)) {
            candidateUpsellToShow = UpsellTypes.Work;
        }

        if (UpsellHelper._isUpsellPermissible(candidateUpsellToShow, permissibleUpsells)) {
            return candidateUpsellToShow;
        }

        return null;
    }

    // public for tests
    public static getBuildsCount = (buildMetrics: BuildMetrics): number => {
        if (buildMetrics && buildMetrics.buildMetrics) {
            return buildMetrics.buildMetrics.buildsPassed + buildMetrics.buildMetrics.buildsNotPassed;
        }
        else {
            return 0;
        }
    }

    // public for tests
    public static getReleasesCount = (releaseMetrics: ReleaseMetrics): number => {
        if (releaseMetrics && releaseMetrics.deploymentMetrics) {
            return (releaseMetrics.deploymentMetrics.deploymentsPassed + releaseMetrics.deploymentMetrics.deploymentsNotPassed);
        }
        else {
            return 0;
        }
    }

    // public for tests
    public static getCommitsCount = (codeMetrics: CodeMetrics): number => {
        const gitMetric = codeMetrics && codeMetrics.gitMetrics ? codeMetrics.gitMetrics.commitsPushedCount : 0;
        const tfvcMetric = codeMetrics && codeMetrics.tfvcMetrics ? codeMetrics.tfvcMetrics.changesets : 0;
        
        return gitMetric + tfvcMetric;
    }

    private static _isCandidateUpsell = (candidateUpsells: UpsellTypes[], currentUpsell: UpsellTypes): boolean => {
        return candidateUpsells.indexOf(currentUpsell) > -1;
    }

    private static _isUpsellPermissible(candidateUpsell: UpsellTypes, permissibleUpsells: UpsellTypes[]): boolean {
        return candidateUpsell != null && permissibleUpsells.indexOf(candidateUpsell) > -1;
    }
}