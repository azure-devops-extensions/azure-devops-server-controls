import { ComponentWrapper } from "Agile/Scripts/Common/Components/ComponentRegistration";
import { css } from "OfficeFabric/Utilities";
import * as React from "react";
import { ExtensionService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";
import { contains } from "VSS/Utils/Array";
import { IVssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { IVssContributedPivotBarItem, IVssPivotBarItemProvider } from "VSSUI/PivotBar";
import { PivotBarActionProvider } from "Agile/Scripts/Common/PivotBarActionProvider";

/**
 * Synchronous pivot item provider for the VSS pivot bar. Relies on registered components and does not introduce any
 * promises or other async calls for rendering pivot items.
 *
 * Note: ensure pivot contributions are already included on the page.
 */
export class PivotItemProvider<TContext> implements IVssPivotBarItemProvider {
    private _expectedContributionTypes: string[];

    constructor(
        private targetContributionId: string,
        private contributionContext: (c: Contribution) => TContext,
        private options: {
            /**
             * IVssHubViewState for the pivot. If this is provided, register a URL for the pivot. If
             * this is provided, also set the routeValueKey option.
             */
            hubViewState?: IVssHubViewState,
            /**
             * Name of the route value parameter to fill with the pivot's itemKey. Only useful when
             * hubViewState is set.
             */
            routeValueKey?: string,
            /**
             * Array of contribution types to look for. Default is ["ms.vss-web.tab"]
             */
            expectedContributionTypes?: string[],
            /**
             * If provided, pass this context object to the contributed actions for the pivot
             * instead of the actionContext provided by the contributed pivot.
             */
            actionContext?: object | (() => object)
        }) {

        this._expectedContributionTypes = options.expectedContributionTypes || ["ms.vss-web.tab"];
    }

    public loadItems(itemsUpdated: (items: IVssContributedPivotBarItem[]) => void): void {
        const contributions = getService(ExtensionService).getLoadedContributionsForTarget(this.targetContributionId) || [];

        contributions.sort((a, b) => (a && a.properties && a.properties["order"] || 999999) - (b && b.properties && b.properties["order"] || 999999));

        itemsUpdated(contributions.filter(c => contains(this._expectedContributionTypes, c.type)).map(c => this._mapContribution(c)));
    }

    private _mapContribution(contribution: Contribution): IVssContributedPivotBarItem {

        let viewActionProviders: PivotBarActionProvider<any>[];
        if (contribution.properties["viewActions"]) {
            viewActionProviders = [new PivotBarActionProvider([contribution.properties["viewActions"]], this.options.actionContext)];
        }

        return {
            id: contribution.id,
            text: contribution.properties["name"],
            itemKey: contribution.properties["itemKey"],
            order: contribution.properties["order"],
            viewActionProviders,
            render: (className) => {
                const contentClassName = contribution.properties["contentClassName"];
                const key = contribution.properties["content"]["initialize"];

                const componentProps = {
                    key,
                    pivotContext: this.contributionContext(contribution),
                    actionContext: this.options.actionContext
                } as any;

                return React.createElement(
                    "div",
                    {
                        className: css("vss-PivotBarItem", "content-host", contentClassName)
                    },
                    React.createElement(
                        ComponentWrapper,
                        {
                            modules: contribution.properties["content"]["require"],
                            componentKey: key,
                            componentProps
                        })
                );
            }
        };
    }
}