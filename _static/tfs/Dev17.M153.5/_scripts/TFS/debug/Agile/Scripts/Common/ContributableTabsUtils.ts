/// <reference types="jquery" />

import "VSS/LoaderPlugins/Css!Agile";

import Q = require("q");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Diag = require("VSS/Diag");
import Events_Services = require("VSS/Events/Services");
import Service = require("VSS/Service");
import Utils_Url = require("VSS/Utils/Url");
import Navigation = require("VSS/Controls/Navigation");
import Controls = require("VSS/Controls");
import TFS_Agile = require("Agile/Scripts/Common/Agile");
import TFS_Agile_Controls = require("Agile/Scripts/Common/Controls");
import Contributions_Services = require("VSS/Contributions/Services");
import Contributions_Controls = require("VSS/Contributions/Controls");

var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

/** Pivot view context for iteration backlog */
export interface IIterationContributedTabContext {
    iterationId: string;
}

/** Pivot view context for backlog */
export interface IBacklogContributedTabContext {
    level: string;
    workItemTypes: string[];
}


/**
 * Helper to update the contributed tab urls to enable full post back
 */
export class PivotViewHelper {
    /**
     * Enhances Pivot view on iteration backlog page and provides function to generate link for full post back
     * @param tabViewClass Class name for tab view
     * @param iterationPath Iteration Path
     * @param selectedPivot Selected pivot 
     */
    public static enhanceIterationPivotView(tabViewClass: string, iterationPath: string, selectedPivot: string, contributionContext: IIterationContributedTabContext): Navigation.PivotView {
        var $pivotView = $("." + tabViewClass);
        Diag.Debug.assert($pivotView.length === 1, "There should be at least one pivot view.");
        return <Navigation.PivotView>Controls.Enhancement.enhance(Navigation.PivotView, $pivotView, {
            generateContributionLink: (contributionId: string) => {
                var link = tfsContext.getActionUrl("iterationcontributions", "backlogs", { parameters: iterationPath });
                link = Utils_Url.replaceUrlParam(link, "contributionId", contributionId);
                link = Utils_Url.replaceUrlParam(link, "_a", "contribution");
                link = Utils_Url.replaceUrlParam(link, "spv", selectedPivot);
                return link;
            },
            getContributionContext: () => { return contributionContext; }
        });
    }

    private static _backlogOptions = {
        "level": "",
        "showParents": ""
    };

    /**
     * Enhances Pivot view on backlog page and provides function to generate link for full post back
     * @param tabViewClass Class name for tab view
     * @param selectedLevel Selected product backlog level
     * @param showParents Show parents setting
     * @param selectedPivot Selected Pivot 
     */
    public static enhanceBacklogPivotView(tabViewClass: string, selectedLevel: string, showParents: string, selectedPivot: string, contributionContext: IBacklogContributedTabContext): Navigation.PivotView {
        selectedLevel = selectedLevel || "";
        showParents = showParents || "";
        PivotViewHelper._backlogOptions.level = selectedLevel;
        PivotViewHelper._backlogOptions.showParents = showParents;

        //Returns a link given contributionId, level and parents
        var getLink = (contributionId, level, parents) => {
            if (!level) {
                return null;
            }
            var link = tfsContext.getActionUrl("backlogscontributions", "backlogs", { parameters: [] });
            link = Utils_Url.replaceUrlParam(link, "contributionId", contributionId);
            link = Utils_Url.replaceUrlParam(link, "_a", "contribution");
            if (parents) {
                link = Utils_Url.replaceUrlParam(link, "showParents", "" + parents);
            }
            link = Utils_Url.replaceUrlParam(link, "level", level);
            link = Utils_Url.replaceUrlParam(link, "spv", selectedPivot);
            return link;
        };

        //Creates a pivot view and enhances it
        var $pivotView = $("." + tabViewClass);
        Diag.Debug.assert($pivotView.length === 1, "There should be atleast one pivot view.");
        var pivotView = <Navigation.PivotView>Controls.Enhancement.enhance(Navigation.PivotView, $pivotView, {
            generateContributionLink: (contributionId: string) => {
                var level = PivotViewHelper._backlogOptions.level;
                var parents = PivotViewHelper._backlogOptions.showParents;
                return getLink(contributionId, level, parents);
            },
            getEnabledState: (contributionId: string) => {
                var level = PivotViewHelper._backlogOptions.level;
                return !!level;
            },
            getContributionContext: () => { return contributionContext; }
        });

        var contextData = {
            level: selectedLevel,
            showParents: showParents === "true"
        };

        var backlogPageActionUrl = TFS_Agile.LinkHelpers.getAsyncBacklogLink(TFS_Agile_Controls.BacklogViewControlModel.backlogPageAction, contextData);
        var boardPageActionUrl = TFS_Agile.LinkHelpers.generateBacklogLink(TFS_Agile_Controls.BacklogViewControlModel.boardPageAction);

        pivotView.setViewLink(TFS_Agile_Controls.BacklogViewControlModel.backlogPageAction, backlogPageActionUrl);

        pivotView.setViewLink(TFS_Agile_Controls.BacklogViewControlModel.boardPageAction, boardPageActionUrl);

        //Listens for backlog view change, and then updates the views with new links
        Events_Services.getService().attachEvent(TFS_Agile_Controls.ContributableTabConstants.EVENT_BACKLOG_VIEW_CHANGE, (sender, data: { level: string, showParents: string, workItemTypeNames: string[] }) => {
            //Set these values so incase if someone else call refreshContributedItems(force) on Pivot view, our links are generated correctly
            PivotViewHelper._backlogOptions.level = data.level;
            PivotViewHelper._backlogOptions.showParents = data.showParents;
            pivotView.setContributionContext({
                level: data.level,
                workItemTypeNames: data.workItemTypeNames
            });
            pivotView.refreshContributedItems().then(() => {
                pivotView.getItems().forEach((item) => {
                    if (item.contributed) {
                        var link = getLink(item.id, data.level, data.showParents);
                        if (link) {
                            pivotView.setViewLink(item.id, link);
                            pivotView.setViewEnabled(item.id, true);
                        }
                        else {
                            pivotView.setViewLink(item.id, "");
                            pivotView.setViewEnabled(item.id, false);
                        }
                    }
                });
                pivotView.updateItems();
            });
        });

        return pivotView;
    }

}

/** Helper to setup neccessary infrastructure to initialize and render contributable tabs */
export class ContributableTabHelper {

    /**
     * Displays contributable tabs for display
     * @param tabViewClass Tab view class name (Parent class that contains all the tab headings)
     * @param hubPivotContentClass Hub pivot content class name (Container for the extensions host)
     * @param contributableContainerClassName Container for pivot content
     * @param pageTitleClass Page title class name
     * @param contributionId Contribution id
     * @param selectedPivot Selected Pivot
     * @param contributionContext Context data to pass to the contributed tab
     */
    public static displayContributedTab(tabViewClass: string, hubPivotContentClass: string, contributableContainerClassName: string,
        pageTitleClass: string, contributionId: string, selectedPivot: number, contributionContext: any): void {
        var $pivotView = $("." + tabViewClass);
        Diag.Debug.assert($pivotView.length === 1, "There should be atleast one pivot view.");
        var pivotView = <Navigation.PivotView>Controls.Enhancement.enhance(Navigation.PivotView, $pivotView);
        pivotView.refreshContributedItems().then(() => {
            //Select the pivot view
            pivotView.setSelectedView(pivotView.getView(contributionId));
            var $hubPivotElement = $("." + hubPivotContentClass);

            //Create container for the tab
            var $contributedContent = $("." + contributableContainerClassName);
            if (!$contributedContent || $contributedContent.length === 0) {
                $contributedContent = $("<div />").addClass(contributableContainerClassName);
                $contributedContent.appendTo($hubPivotElement);
            }
            else {
                $contributedContent.empty();
            }

            //set the foregroundInstance property to true so the extension develoeprs can condition on it and avoid loading unnecessary data on backgroundInstance
            contributionContext = $.extend(true, {}, contributionContext, {
                "foregroundInstance": true
            });

            //Create extension host and pass contribution context
            Contributions_Controls.createExtensionHost($contributedContent, contributionId, contributionContext).then((host) => {

                //Once the host is available get the contribution instance and update the page title
                Service.getService(Contributions_Services.ExtensionService).getContribution(contributionId).then((contribution) => {
                    host.getRegisteredInstance<IContributedTab>(contribution.properties["registeredObjectId"] || contribution.id).then((instance) => {
                        var pageTitle = (instance.pageTitle || instance.name) || contribution.properties["name"];
                        var pageTitlePromise;
                        if (typeof pageTitle === "function") {
                            pageTitlePromise = pageTitle(contributionContext);
                        } else {
                            pageTitlePromise = Q.resolve(pageTitle);
                        }
                        pageTitlePromise.then((title) => {
                            this._setPageTitle(pageTitleClass, title, title);
                        });
                    });
                });
            });

            $contributedContent.show();

            pivotView._bind("changed", (args) => {
                // when user switches between two contributed pivot
                // we need to reload the page to render the contents to the pivot                
                // there is no interface to unload the previouly rendered content and create new host.
                // as this is old platform we do not want to invest much in here for a cleaner fix
                if (pivotView.getSelectedView().link) {
                    document.location.href = pivotView.getSelectedView().link;
                }
                document.location.reload(/*forceReload*/ true);
            });

            //Raise the event so any listeners (e.g. SprintViewControl and BacklogViewControl) can react to contributed tab being displayed.
            Events_Services.getService().fire(TFS_Agile_Controls.ContributableTabConstants.EVENT_AGILE_CONTRIBUTED_TAB_SELECTED,
                <TFS_Agile_Controls.IContributedTabDisplayedEventArgs>{ contributionId: contributionId, selectedPivot: selectedPivot });

        });
    }

    /** Sets page title */
    private static _setPageTitle(pageTitleClass: string, pageTitle: string, pageTooltip: string) {
        Diag.Debug.assertParamIsString(pageTitle, "pageTitle");
        Diag.Debug.assertParamIsString(pageTooltip, "pageTooltip");

        var $titleDiv = $("." + pageTitleClass);

        $titleDiv.text(pageTitle);
        $titleDiv.attr("title", pageTooltip);

        document.title = pageTitle;
    }

}
