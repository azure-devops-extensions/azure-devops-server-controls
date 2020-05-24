// tslint:disable:no-stateless-class
import * as TFS_Agile from "Agile/Scripts/Common/Agile";
import { NavigationUtils } from "Agile/Scripts/Common/NavigationUtils";
import { IBacklogPageContext, ProductBacklogConstants } from "Agile/Scripts/ProductBacklog/ProductBacklogContracts";
import { BacklogConfigurationService } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import * as TFS_Core_Utils from "Presentation/Scripts/TFS/TFS.Core.Utils";
import * as Diag from "VSS/Diag";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as Utils_String from "VSS/Utils/String";

/** Helpers to parse & set the product backlog URL, handling back-compat translation for our old style of URLS:
 * - Old: hub=FROMPLURAL [&filter=TOPLURAL]
 * - New: level=ENTRYPLURAL [&showParents=true|false]
 */
export class ProductBacklogUrlHelpers {
    /**
     * Parses backlog URL hash parameters, handling back-compat translation and returning an equivalent context.
     * @param state The URL hash parameters; will be retrieved from current URL state if not given.
     * @returns An IBacklogPageContext; properties will be null if not determinable from the provided URL state.
     */
    public static getUrlContext(state?: any): IBacklogPageContext {
        if (!state) {
            state = Navigation_Services.getHistoryService().getCurrentState();
        }

        // Determine backlog level (back-compat: aka hub).
        let level: string = null;
        if (state.level != null) {
            level = state.level;
        } else if (state.hub != null) {
            Diag.logTracePoint("ProductBacklogUrlHelpers.getUrlContext.hub", state.hub);
            level = state.hub;
        }

        // Determine showParents (back-compat: true if upward filter).
        let showParents: boolean = null;
        if (state.showParents != null) {
            try {
                showParents = TFS_Core_Utils.BoolUtils.parse(state.showParents);
            } catch (error) {
                // Invalid showParents that cannot be returned as boolean, so treat as if unspecified.
                Diag.logVerbose(`Unable to parse specified showParents string value as boolean - '${state.showParents}'. Treating as unspecified (null).`);
            }
        } else if (state.filter != null) {
            // This branch deals with legacy URLs pre S82
            Diag.logTracePoint("ProductBacklogUrlHelpers.getUrlContext.filter", state.filter);

            // Show Parents should be on if the filter is roll-up ('from' is below 'to').
            const fromBacklog = BacklogConfigurationService.getBacklogConfiguration().getBacklogByDisplayName(level);
            const toBacklog = BacklogConfigurationService.getBacklogConfiguration().getBacklogByDisplayName(state.filter);
            if (fromBacklog && toBacklog) {
                showParents = (fromBacklog.rank < toBacklog.rank); // Backlogs are in descending order.
            }
        }

        return {
            action: state.action,
            level: level,
            showParents: showParents
        };
    }

    /** Ensures that the current URL matches the provided context. */
    public static ensureUrlContext(backlogContext: TFS_Agile.BacklogContext) {
        if (!this._isUrlValid(backlogContext)) {
            this._rewriteUrl(backlogContext);
        }
        NavigationUtils.rememberMruHub();
    }

    /** Checks whether the current URL matches the specified backlog context. */
    private static _isUrlValid(backlogContext: TFS_Agile.BacklogContext): boolean {
        const state = Navigation_Services.getHistoryService().getCurrentState();

        // Action must be provided.
        const actionIsValid = (state.action === ProductBacklogConstants.BACKLOG_ACTION);

        // Level must be provided.
        const levelIsValid = state.level && Utils_String.localeIgnoreCaseComparer(state.level, backlogContext.level.name) === 0;

        // ShowParents must be provided if on a non-root backlog, and vice versa.
        let showParentsIsValid = true;
        if (BacklogConfigurationService.getBacklogConfiguration().isRootLevelBacklog(backlogContext.level.id)) {
            showParentsIsValid = (state.showParents == null);
        } else {
            showParentsIsValid = state.showParents && state.showParents === (backlogContext.includeParents || "").toString();
        }

        return actionIsValid && levelIsValid && showParentsIsValid;
    }

    /** Rewrites the URL to match the specified backlog context, maintaining unrecognized URL parameters (such as fullScreen).
     * WARNING: Due to MsEng bug #252931 ("...replaceHistoryPoint() with identical state breaks the next navigation cycle")
     * this should not be called unless the URL actually needs to be fixed.
     */
    private static _rewriteUrl(backlogContext: TFS_Agile.BacklogContext) {
        const historySvc = Navigation_Services.getHistoryService();
        // Clone & mutate the existing state, in order to maintain unrecognized params (for future-proofing).
        // Pre-add level & showParents to generate a 'clean' URL (append unrecognized params at the end).
        const state = $.extend({ level: null, showParents: null }, historySvc.getCurrentState());

        // Remove the old-style params if they exist.
        if (state.hub !== undefined) {
            delete state.hub;
        }
        if (state.filter !== undefined) {
            delete state.filter;
        }

        // Ensure the new-style params are present & valid.
        state.level = backlogContext.level.name;
        if (BacklogConfigurationService.getBacklogConfiguration().isRootLevelBacklog(backlogContext.level.id)) {
            if (state.showParents !== undefined) {
                delete state.showParents;
            }
        } else {
            // NOTE: it's important to pre-convert to string here, to work around MsEng bug #252934.
            // ("...replaceHistoryPoint() incorrectly serializes state objects with boolean parameters")
            state.showParents = backlogContext.includeParents.toString();
        }

        historySvc.replaceHistoryPoint(ProductBacklogConstants.BACKLOG_ACTION, state, null, /* suppressNavigate */ true);
    }
}