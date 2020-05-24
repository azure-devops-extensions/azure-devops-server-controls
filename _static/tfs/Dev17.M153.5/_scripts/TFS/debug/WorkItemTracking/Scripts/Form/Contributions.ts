import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Contributions_Controls = require("VSS/Contributions/Controls");
import Events_Services = require("VSS/Events/Services");
import Extensions = require("WorkItemTracking/Scripts/Extensions/TFS.WorkItemTracking.Extensions");
import WorkItemViewContributionManager = require("WorkItemTracking/Scripts/Form/WorkItemViewContributionManager");
import VSS = require("VSS/VSS");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { ILayoutPage, ILayoutGroup, ILayoutControl } from "WorkItemTracking/Scripts/Form/Layout";
import { IContribution } from "WorkItemTracking/Scripts/Form/Models";
import { FormEvents } from "WorkItemTracking/Scripts/Form/Events";
import { domElem } from "VSS/Utils/UI";
import Telemetry = require("VSS/Telemetry/Services");
import { WITCustomerIntelligenceArea } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { MessageAreaControl, MessageAreaType } from "VSS/Controls/Notifications";
import { BaseControl } from "VSS/Controls";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { WitFormModeUtility } from "WorkItemTracking/Scripts/Utils/WitControlMode";
import * as Q from "q";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { getService } from "VSS/Service";
import { WorkItemFormUserLayoutSettingsService } from "WorkItemTracking/Scripts/Form/UserLayoutSettings";

// WIT Specific overrides for contribution loading to ensure our form extensions are given more time
const WIT_FORM_CONTRIBUTION_SLOW_LOAD_DURATION: number = 15000; // 15 seconds
const WIT_FORM_CONTRIBUTION_MAX_WAIT_FOR_HANDSHAKE_EVENT: number = 10000; // 10 seconds
var contributionCounter = 0;

/**
 * Creates a contribution with the specified id.  Also hooks up the handler for the control resized event.
 * @param contributionManager - Manager to add the contribution to once it has been created.
 * @param contributionId - Id of the contribution to create
 * @param container - Container to put the contribution in
 * @param handleResize - Whether or not the container should handle resize events from the hosted control
 * @param initialConfig - initial configuration options, if any, for the contribution.
 * @param behavior - options for the the host container, if any.
 */
function createContribution(contributionManager: WorkItemViewContributionManager,
    contributionId: string,
    container: JQuery,
    handleResize: boolean,
    initialConfig?: any,
    behavior?: Contributions_Controls.IContributionHostBehavior
): IPromise<void> {

    if (handleResize) {
        container.on(Contributions_Controls.ExternalContentHostEvents.EXTENSION_HOST_RESIZED, (e, args: Contributions_Controls.IExternalContentHostResizedEventArgs) => {
            if (args && args.height) {
                container.height(args.height);
            }

            Events_Services.getService().fire(FormEvents.ControlResizedEvent(), null);
        });
    }

    // Set our default slow and handshake timeouts to be higher than framework defaults
    // We do this to ensure even if slow that the controls will load since sometimes these
    // are critical to being able to work with the form
    behavior = behavior || {};
    behavior.slowWarningDurationMs = WIT_FORM_CONTRIBUTION_SLOW_LOAD_DURATION;
    behavior.maxHandshakeDurationMs = WIT_FORM_CONTRIBUTION_MAX_WAIT_FOR_HANDSHAKE_EVENT;

    return Contributions_Controls.createExtensionHost(container,
        contributionId,
        { ...initialConfig, instanceId: `work-item-form-contribution-${contributionCounter++}` },
        undefined, undefined, undefined, undefined, undefined, behavior).then(
        (contributionHost) => {
            if (contributionHost) {
                contributionManager.addPromise(Extensions.ContributionService.getControlContributionInstance(contributionHost, contributionId));
            }
        },
        (error) => {
            if (window.console && window.console.warn) {
                window.console.warn(error || WorkItemTrackingResources.ContributionNotFound);
            }
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                "WorkItem.ContributionNotFound",
                {
                    "id": contributionId
                }));

            <MessageAreaControl>BaseControl.createIn(MessageAreaControl, container, {
                message: {
                    header: error || WorkItemTrackingResources.ContributionNotFound,
                    type: MessageAreaType.Error,
                },
                closeable: false,
                showIcon: true,
                showDetailsLink: false
            });
        });
}

export function createPageContribution(
    contributionManager: WorkItemViewContributionManager,
    page: ILayoutPage,
    callbacks?: Contributions_Controls.IContributionHostBehaviorCallbacks,
): JQuery {

    const pageContributionContent = $(domElem("div", "page-extension-container"));

    if (page && page.contribution && page.contribution.contributionId) {
        createContribution(contributionManager, page.contribution.contributionId, pageContributionContent, false, undefined, {callbacks});
    }

    return pageContributionContent;
}

export function createGroupContribution(
    contributionManager: WorkItemViewContributionManager,
    group: ILayoutGroup,
    callbacks?: Contributions_Controls.IContributionHostBehaviorCallbacks,
): JQuery {

    const groupContributionContent = $(domElem("div", "group-extension-container"));

    if (group && group.contribution && group.contribution.contributionId) {
        // If the height value is specified in the weblayout xml, set that height instead of manifest height
        var height = group.height || group.contribution.height;
        if (height) {
            groupContributionContent.height(height);
        }

        createContribution(contributionManager,
            group.contribution.contributionId,
            groupContributionContent,
            true,
            undefined,
            { resizeOptions: Contributions_Controls.ResizeOptions.FixedWidth, callbacks });
    }

    return groupContributionContent;
}

export function createControlContribution(
    contributionManager: WorkItemViewContributionManager,
    control: ILayoutControl,
    callbacks?: Contributions_Controls.IContributionHostBehaviorCallbacks,
): JQuery {
    const controlContainer = $(domElem("div", "control-extension-container"));

    controlContainer.data("contribution", control.contribution);

    if (control && control.contribution && control.contribution.contributionId) {
        if (control.label) {
            const label = $(domElem("div", "workitemlabel label-control")).appendTo(controlContainer);
            label.append($(domElem("label", "workitemcontrol-label")).text(control.label));
        }

        const controlContributionContent = $(domElem("div", "control-extension-content")).appendTo(controlContainer);

        // If the height value is specified in the weblayout xml, set that height instead of manifest height
        const height = control.height || control.contribution.height;
        if (height) {
            controlContributionContent.height(height);
        }

        createContribution(contributionManager,
            control.contribution.contributionId,
            controlContributionContent,
            true,
            {
                witInputs: control.contribution.inputs,
                defaultHeight: controlContributionContent.height(),
                showFieldBorder: getService(WorkItemFormUserLayoutSettingsService).fieldChromeBorder
            },
            { resizeOptions: Contributions_Controls.ResizeOptions.FixedWidth, callbacks });
    }

    return controlContainer;
}

export function isContribution(contribution: IContribution) {
    return contribution && contribution.isContribution;
}
