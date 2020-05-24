import { IContributionHostBehaviorCallbacks } from "VSS/Contributions/Controls";
import { publishEvent, TelemetryEventData } from "VSS/Telemetry/Services";
import { WITCustomerIntelligenceArea, WITCustomerIntelligenceFeature } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { getService } from "VSS/Service";
import { ExtensionService, ContributionQueryOptions } from "VSS/Contributions/Services";
import { ILayoutPage, ILayoutControl, ILayoutGroup } from "WorkItemTracking/Scripts/Form/Layout";

interface IContributionEvent {
    type: "control" | "page" | "group";
    id: string;
    time: number;
    status: "pending" | "slow" | "success" | "failure";
}

type ContributionEventLookup = {
    event: IContributionEvent & {type: "control"}
    formObject: ILayoutControl;
} | {
    event: IContributionEvent & {type: "group"}
    formObject: ILayoutGroup;
} | {
    event: IContributionEvent & {type: "page"}
    formObject: ILayoutPage;
};
export class ContributionLoadedCallbacks {
    private readonly startTime = new Date().getTime();
    private readonly formContributions: IContributionEvent[] = [];
    private readonly contributionLookup: {[id: string]: ContributionEventLookup} = {};

    constructor(private readonly page: ILayoutPage) {
        const pushEvent = (eventLookup: ContributionEventLookup) => {
            this.formContributions.push(eventLookup.event);
            const id = eventLookup.formObject.id;
            this.contributionLookup[id] = eventLookup;
        };
        if (page.contribution) {
            pushEvent({
                event: {
                    type: "page",
                    id: page.contribution.contributionId,
                    time: -1,
                    status: "pending",
                },
                formObject: page
            });
            return;
        }
        for (const section of page.sections) {
            for (const group of section.groups) {
                if (group.contribution) {
                    pushEvent({
                        event: {
                            type: "group",
                            id: group.contribution.contributionId,
                            time: -1,
                            status: "pending",
                        },
                        formObject: group,
                    });
                    continue;
                }
                for (const control of group.controls) {
                    if (control.contribution) {
                        pushEvent({
                            event: {
                                type: "control",
                                id: control.contribution.contributionId,
                                time: -1,
                                status: "pending",
                            },
                            formObject: control,
                        });
                    }
                }
            }
        }
    }
    public getCallBacks(object: ILayoutPage | ILayoutGroup | ILayoutControl): IContributionHostBehaviorCallbacks {
        const {event} = this.contributionLookup[object.id];
        const logEvent = async (status: "slow" | "success" | "failure") => {
            event.status = status;
            event.time = new Date().getTime() - this.startTime;
            if (this.formContributions.filter(({status: s}) => s === "pending").length === 0) {
                const toolbarContributions = await this.getToolbarContributions();
                const { formContributions } = this;
                publishEvent(new TelemetryEventData(
                    WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                    WITCustomerIntelligenceFeature.WI_FORM_CONTRIBUTION,
                    {
                        toolbarContributions,
                        formContributions,
                    },
                ));
            }
        };
        return {
            failure: (message) => logEvent("failure"),
            success: () => logEvent("success"),
            slow: () => logEvent("slow"),
        };
    }
    private async getToolbarContributions() {
        const contributions = await getService(ExtensionService).queryContributions(
            ["ms.vss-work-web.work-item-context-menu", "ms.vss-work-web.work-item-toolbar-menu"], ContributionQueryOptions.IncludeDirectTargets,
        );
        return contributions.map(c => ({
            id: c.id,
            type: c.type
        }));
    }
}
