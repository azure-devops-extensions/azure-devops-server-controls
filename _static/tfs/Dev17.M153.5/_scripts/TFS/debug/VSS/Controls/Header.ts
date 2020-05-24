/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS/Controls/Header' />

import Contract_Platform = require("VSS/Common/Contracts/Platform");
import Contributions_Contracts = require("VSS/Contributions/Contracts");
import Contributions_Controls = require("VSS/Contributions/Controls");
import Contributions_Services = require("VSS/Contributions/Services");
import Controls = require("VSS/Controls");
import Events_Services = require("VSS/Events/Services");
import { HubsService, HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import Q = require("q");
import Service = require("VSS/Service");
import VSS = require("VSS/VSS");

const LEFT_SELECTOR = ".left-section";
const CENTER_SELECTOR = ".center-section";
const RIGHT_SELECTOR = ".right-section";
const JUSTIFIED_SELECTOR = ".justified-section";

export interface ContributableHeaderOptions extends Controls.EnhancementOptions {
    contributionId?: string;
    elementContributionType?: string;
    context?: any;
}

export class ContributableHeader<TOptions extends ContributableHeaderOptions> extends Controls.Control<TOptions> {

    initializeOptions(options?: ContributableHeaderOptions) {
        super.initializeOptions(<TOptions>options);
    }

    protected renderContributions(): void {
        // Get contributed header elements
        Service.getService(Contributions_Services.ExtensionService)
            .getContributionsForTarget(this._options.contributionId, this._options.elementContributionType)
            .then((contributions) => {
                contributions = this.filterContributions(contributions);
                const groupedElements = this.groupContributionsByAlignment(contributions);
                const promises = [
                    this.renderContributedSection(groupedElements["left"], LEFT_SELECTOR),
                    this.renderContributedSection(groupedElements["center"], CENTER_SELECTOR),
                    this.renderContributedSection(groupedElements["right"], RIGHT_SELECTOR),
                    this.renderContributedSection(groupedElements["justified"], JUSTIFIED_SELECTOR),
                ];
                return Q.all(promises);
            }, VSS.handleError)
            .then((v) => {
                // all contributions rendered
                if (this._element.attr("aria-busy")) {
                    this._element.attr("aria-busy", "false");
                }
            });
    }

    protected filterContributions(contributions: Contributions_Contracts.Contribution[]): Contributions_Contracts.Contribution[] {
        return contributions;
    }

    protected groupContributionsByAlignment(contributions: Contributions_Contracts.Contribution[]): IDictionaryStringTo<Contributions_Contracts.Contribution[]> {
        let groupedElements: IDictionaryStringTo<Contributions_Contracts.Contribution[]> = {};
        // Group contributed elements by position
        for (let c of contributions) {
            let align = c.properties.align || "center";
            let elements = groupedElements[align];
            if (!elements) {
                elements = [];
                groupedElements[align] = elements;
            }

            // Add contributed element to the group
            elements.push(c);
        }

        return groupedElements;
    }

    private renderContributedSection(contributions: Contributions_Contracts.Contribution[], selector: string) {
        let $container = this.getElement().find(` > .header-table > tbody > tr > ${selector}`);
        if (contributions && contributions.length > 0) {
            // Sort contributions first by the order specified
            contributions.sort((c1, c2) => {
                let order1 = typeof c1.properties.order === "number" ? <number>c1.properties.order : Number.MAX_VALUE;
                let order2 = typeof c2.properties.order === "number" ? <number>c2.properties.order : Number.MAX_VALUE;
                return order1 - order2;
            });


            // Perform DOM rearrangement when container is hidden
            $container.hide();

            let promises: IPromise<any>[] = [];
            for (let c of contributions) {
                // See this contribution is already rendered on the server or not
                let $hostContainer = $container.find(`#${c.id.replace(/\./g, "-")}`);
                if ($hostContainer.length > 0) {
                    // Ensure ordering
                    $hostContainer.appendTo($container);
                    // Create a contributed control using existing markup
                    promises.push(Contributions_Controls.createContributedControl($hostContainer, c, { headerContext: this._options.context, ownsContainer: true }));
                }
                else {
                    // Make sure order is kept in DOM
                    let $placeholder = $("<div />").addClass("temp-placeholder").appendTo($container);
                    // Create a contributed control for this contribution
                    promises.push(Contributions_Controls.createContributedControl($placeholder, c, { headerContext: this._options.context }));
                }
            }

            $container.show();

            return Q.allSettled(promises).then((results) => {
                results.forEach(r => {
                    if (r.state === "rejected") {
                        console.error(r.reason);
                    }
                });

                // Get rid of temp placeholder
                $container.children(".temp-placeholder").children().unwrap();
            });
        }
        else {
            $container.hide();
        }
    }
}

export interface HeaderModel {
    brandIcon: string;
    brandName: string;
    context: any;
    contributionId: string;
    elementContributionType: string;
    supportsContribution: boolean;
    userDisplayName: string;
}

/**
 * @exemptedapi
 */
export class Header<TModel extends HeaderModel> extends ContributableHeader<TModel> {

    public initialize() {
        super.initialize();
        let element = this.getElement();
        if (this._options.supportsContribution) {
            // Contributions supported, render them
            this.renderContributions();
        }
        else {
            // Contributions not supported, populate header using the specified header model (left and right section only)
            this.renderLeftSection(element.find(LEFT_SELECTOR));
            this.renderRightSection(element.find(RIGHT_SELECTOR));
        }

        Events_Services.getService().attachEvent(HubEventNames.PreXHRNavigate, (sender: any, args: IHubEventArgs) => {
            const hubsService = Service.getLocalService(HubsService);
            let hubs = hubsService.getHubsByGroupId(hubsService.getSelectedHubGroupId(), false, false, true);
            this.getElement().toggleClass("no-hubs", hubs.length <= 1);
        });
    }

    protected renderLeftSection(container: JQuery): void {
        if (this._options.brandIcon) {
            $("<span />").addClass(`bowtie-icon vsts-brand-icon bowtie-${this._options.brandIcon}`).appendTo(container);
        }

        if (this._options.brandName) {
            $("<span />").addClass("brand-name").text(this._options.brandName).appendTo(container);
        }
    }

    protected renderRightSection(container: JQuery): void {
        if (this._options.userDisplayName) {
            $("<span />").addClass("user-name").text(this._options.userDisplayName).appendTo(container);
        }
    }
}

Controls.Enhancement.registerEnhancement(Header, ".webplatform-header");
