/// <reference types="react" />
/// <reference types="react-dom" />
import * as React from "react";
import * as ReactDOM from "react-dom";

import { getContributionsForTarget } from "Build/Scripts/Contributions";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { BuildView2 } from "Build/Scripts/Views";
import { PageLoadScenarios } from "Build/Scripts/Performance";

import { Fabric } from "OfficeFabric/components/Fabric/Fabric";

import * as PivotTabs from "Presentation/Scripts/TFS/Components/PivotTabs";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as Controls from "VSS/Controls";
import * as Events_Action from "VSS/Events/Action";
import { getDefaultWebContext } from "VSS/Context";
import { getService } from "VSS/Service";
import { urlHelper } from "VSS/Locations";
import * as VSS from "VSS/VSS";
import { getHistoryService } from "VSS/Navigation/Services";

import "VSS/LoaderPlugins/Css!Build/Views.Xaml";

class XamlView extends BuildView2 {
    private _tabContributions: IDictionaryStringTo<Contribution> = {};
    private _pivotContainer: JQuery;
    private _titleArea: JQuery;
    private _contentArea: JQuery;

    protected getPageLoadScenarioName(): string {
        return PageLoadScenarios.Xaml;
    }

    initialize(): void {
        super.initialize();

        document.title = BuildResources.XamlDefinitionsPageTitle;

        let hubContent = $(".hub-content");

        let splitter = hubContent.children()[0];

        // shoehorn in the pivot container
        this._pivotContainer = $("<div class='build-pivot-content-container build-definitions-view build-definitions-view-content'><div class='hub-pivot'></div></div>");
        this._pivotContainer.prependTo(hubContent);
        let hubPivot = this._pivotContainer.find(".hub-pivot");

        this._titleArea = $("<div class='hub-title'><div class='build-titleArea'><div class='title-heading'><h1 class='ms-font-l'>" + BuildResources.XamlDefinitions + "</h1></div></div></div>");
        this._titleArea.prependTo(hubContent);

        this._contentArea = $("<div class='xaml-content pivot'></div>");
        this._contentArea.appendTo(hubContent);
        this._contentArea.append(splitter);

        getContributionsForTarget(this._options.tfsContext, "ms.vss-build-web.build-xaml-hub").then((contributions: Contribution[]) => {
            contributions = contributions.filter((contribution) => contribution.type === "ms.vss-web.tab")
                .sort((a, b) => a.properties.order - b.properties.order);

            let items = contributions.map((contribution) => {
                return {
                    tabKey: contribution.properties.action,
                    title: contribution.properties.name
                };
            });

            contributions.forEach((contribution) => {
                this._tabContributions[contribution.properties.action] = contribution;
            });

            ReactDOM.render(<Fabric><PivotTabs.PivotTabs items={items} selectedKey="xaml" getLink={(key: string) => this._getLink(key)} /></Fabric>, hubPivot[0]);
        }, (err: any) => {
            VSS.handleError(err);
        });
    }

    public onNavigate(state: any): void {
        // when viewing a build, hide the title area and nav bar to look more like the Definitions experience
        if (this._pivotContainer && this._titleArea && this._contentArea) {
            if (state.buildId) {
                this._pivotContainer.hide();
                this._titleArea.hide();
                this._contentArea.removeClass("pivot");
            }
            else {
                this._pivotContainer.show();
                this._titleArea.show();
                this._contentArea.addClass("pivot");
            }
        }

        super.onNavigate(state);
    }

    protected xamlOnly(): boolean {
        return true;
    }

    private _getLink = (key: string): string => {
        let contribution = this._tabContributions[key];

        let historyService = getHistoryService();
        let action = contribution.properties["action"] || "contribution";
        let nextState = historyService.getCurrentState();

        let uri = historyService.getFragmentActionLink(action, nextState);

        if (contribution.properties.target) {
            uri = urlHelper.getMvcUrl({
                webContext: getDefaultWebContext(),
                controller: contribution.properties.target.controller,
                action: contribution.properties.target.action,
                queryParams: {
                    "_a": contribution.properties.action
                }
            });
        }

        return uri;
    }
}

VSS.classExtend(XamlView, TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(XamlView, ".buildvnext-view");
