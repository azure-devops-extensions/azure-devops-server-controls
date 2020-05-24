import Navigation_Services = require("VSS/Navigation/Services");
import Utils_UI = require("VSS/Utils/UI");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import VCPullRequestsControls = require("VersionControl/Scripts/Controls/PullRequest");
import domElem = Utils_UI.domElem;

export module Url {
    export function getPullRequestSinglePageUrl(repositoryContext: GitRepositoryContext, action: string, params?: any) {
        let baseUrl: string;

        baseUrl = VersionControlUrls.getGitActionUrl(repositoryContext.getTfsContext(), repositoryContext.getRepository().name, VCPullRequestsControls.PullRequestsRouteConstants.PULLREQUESTS, null, false);

        return baseUrl + Navigation_Services.getHistoryService().getFragmentActionLink(action, params);
    }

    export function getPullRequestIdFromWindowHref() {
        let href: string = window.location.href.toLowerCase();

        let hashIndex: number = href.indexOf('#');
        if (hashIndex > 0) {
            href = href.substr(0, hashIndex);
        }

        let id = pullRequestIdFromRoute(href, VCPullRequestsControls.PullRequestsRouteConstants.PULLREQUEST);

        if (id) {
            return id;
        }

        id = pullRequestIdFromRoute(href, VCPullRequestsControls.PullRequestsRouteConstants.PULLREQUESTREVIEW);
        return id;
    }

    function pullRequestIdFromRoute(href: string, routeName: string) {
        let prRouteIndex: number = href.lastIndexOf(routeName + '/');
        if (prRouteIndex > 0) {

            let prIdString = href.substr(prRouteIndex + routeName.length + 1);
            if (prIdString) {

                let prId = parseInt(prIdString, 10);
                if (prId) {
                    return prId;
                }
            }
        }

        return null;
    }

    export function createPullRequestFileLink(changeEntry: VCLegacyContracts.Change, linkText: string, initialState: any): JQuery {
        let $fileLink: JQuery;
        // deletes don't actually get a link
        if (changeEntry.changeType !== VCLegacyContracts.VersionControlChangeType.Delete) {
            let action: string = null;
            let data: any = {};
            let currentData: any = Navigation_Services.getHistoryService().getCurrentState();

            // if generating a link on the new PR page, use action instead of view state
            if (currentData.action) {
                action = "files";
                data = currentData;
            }
            else {
                data.view = VCPullRequestsControls.PullRequestDetailsViews.COMPARE;
            }

            data.path = changeEntry.item.serverItem;

            $fileLink = $("<a />")
                .addClass('file-name-link')
                .attr("href", Navigation_Services.getHistoryService().getFragmentActionLink(action, data))
                .text(linkText);
        }
        else {
            $fileLink = $(domElem("span")).text(linkText);
        }

        return $fileLink;
    }
}
