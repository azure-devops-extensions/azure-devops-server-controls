/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import Controls = require("VSS/Controls");
import Notifications = require("VSS/Controls/Notifications");
import Panels = require("VSS/Controls/Panels");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import {HubsService} from "VSS/Navigation/HubsService";
import * as  Service from "VSS/Service";
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import IdentityImage = require("Presentation/Scripts/TFS/TFS.IdentityImage");
import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import VCContracts = require("TFS/VersionControl/Contracts");
import { PushesHubRoutes } from "VersionControl/Scenarios/History/HistoryPushesRoutes";
import { AvatarUtils } from "VersionControl/Scenarios/Shared/AvatarUtils";
import {CodeHubContributionIds} from "VersionControl/Scripts/CodeHubContributionIds";
import {Filter, summaryFilterEquals} from "VersionControl/Scripts/Controls/ChangeListSummaryControlFilter";
import VCChangeListSummaryFilesControl = require("VersionControl/Scripts/Controls/ChangeListSummaryFilesControl");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");
import * as CommitIdHelper from "VersionControl/Scripts/CommitIdHelper";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");

import domElem = Utils_UI.domElem;
import TfsContext = TFS_Host_TfsContext.TfsContext;

export class PushSummaryControl extends Controls.BaseControl {

    private _repositoryContext: GitRepositoryContext;
    private _push: VCContracts.GitPush;
    private _refUpdate: VCContracts.GitRefUpdate;
    private _changeListFilesControl: VCChangeListSummaryFilesControl.FilesSummaryControl;
    private _currentFilter: Filter;
    private _commitCommentFetcher: VCOM.GitCommitCommentFetcher;

    private _$headerSection: JQuery;
    private _$refUpdatesSection: JQuery;
    private _$newOrDeletedRefSection: JQuery;

    constructor(options?) {
        super($.extend({
            coreCssClass: "vc-change-summary vc-push-summary"
        }, options));
    }

    public initialize() {
        super.initialize();
        this._commitCommentFetcher = new VCOM.GitCommitCommentFetcher();
    }

    public _dispose() {
        super._dispose();
        if (this._changeListFilesControl) {
            this._changeListFilesControl._dispose();
        }
    }

    public setModel(
        repositoryContext: GitRepositoryContext,
        push: VCContracts.GitPush,
        refUpdate: VCContracts.GitRefUpdate,
        changeModel: VCLegacyContracts.ChangeList,
        filter: Filter) {

            let sameModel: boolean,
                sameFilter: boolean,
                showSections: boolean;

            if (this._repositoryContext === repositoryContext &&
                this._push && this._push.pushId === push.pushId &&
                this._refUpdate && this._refUpdate.name === refUpdate.name &&
                this._changeListFilesControl && changeModel && changeModel.changes &&
                this._changeListFilesControl.getTotalFileCount() === changeModel.changes.length) {

                    sameModel = true;
            }

            sameFilter = summaryFilterEquals(filter, this._currentFilter);

            if (sameModel && sameFilter) {
                // No changes - nothing to update
                return;
            }

            this._currentFilter = filter;

            if (!sameModel) {

                this._element.empty();

                this._repositoryContext = repositoryContext;
                this._push = push;
                this._refUpdate = refUpdate;

                this._$headerSection = $(domElem("div", "vc-change-summary-header")).appendTo(this._element);
                this._populateHeader(this._$headerSection, push, refUpdate);

                if (push.refUpdates.length > 1) {
                    this._$refUpdatesSection = $(domElem("div", "vc-change-summary-refUpdates")).appendTo(this._element);
                    this._populateRefUpdatesSection(this._$refUpdatesSection, push, refUpdate);
                }

                if (filter) {
                    this._$headerSection.toggle(false);
                    if (this._$refUpdatesSection) {
                        this._$refUpdatesSection.toggle(false);
                    }
                }

                if (changeModel) {
                    this._changeListFilesControl = <VCChangeListSummaryFilesControl.FilesSummaryControl>Controls.BaseControl.createIn(VCChangeListSummaryFilesControl.FilesSummaryControl, this._element, {
                        customerIntelligenceData: this._options.customerIntelligenceData ? this._options.customerIntelligenceData.clone() : null,
                        tfsContext: this._options.tfsContext
                    });

                    let oldVersionString = new VCSpecs.GitCommitVersionSpec(refUpdate.oldObjectId).toVersionString();
                    let newVersionString = new VCSpecs.GitCommitVersionSpec(refUpdate.newObjectId).toVersionString();

                    this._changeListFilesControl.setModel(repositoryContext, changeModel, oldVersionString, newVersionString, filter);
                }
                else {
                    if (CommitIdHelper.isEmptyObjectId(refUpdate.newObjectId)) {
                        this._$newOrDeletedRefSection = $(domElem("div", "vc-change-summary-deletedBranchInfo")).appendTo(this._element);
                        this._populateDeletedRefInfo(this._$newOrDeletedRefSection, push, refUpdate);
                    }
                    else if (CommitIdHelper.isEmptyObjectId(refUpdate.oldObjectId)) {
                        this._$newOrDeletedRefSection = $(domElem("div", "vc-change-summary-newBranchInfo")).appendTo(this._element);
                        this._populateNewRefInfo(this._$newOrDeletedRefSection, push, refUpdate);
                    }
                }
            }
            else {
                if (this._$headerSection) {
                    this._$headerSection.toggle(filter ? false : true);
                }
                if (this._$refUpdatesSection) {
                    this._$refUpdatesSection.toggle(filter ? false : true);
                }
                if (this._changeListFilesControl) {
                    this._changeListFilesControl.setFilter(filter);
                }
                Utils_UI.Positioning.scrollIntoViewVertical(this._element, Utils_UI.Positioning.VerticalScrollBehavior.Top);
            }
    }

    private _populateHeader($header: JQuery, push: VCContracts.GitPush, refUpdate: VCContracts.GitRefUpdate): void {
        const avatarUrl = AvatarUtils.getAvatarUrl(push.pushedBy);
        IdentityImage.identityImageElementFromAvatarUrl(avatarUrl, "small", push.pushedBy.displayName)
            .appendTo($(domElem("div", "picture-container")).appendTo($header));

        const $headerDetails = $(domElem("div", "change-details")).appendTo($header);

        const $topLine = $(domElem("div", "push-info-top-line"))
            .appendTo($headerDetails);

        const $title = $(domElem("span", "status-title"))
            .appendTo($topLine);

        const oldLinkHref = VersionControlUrls.getCommitUrl(this._repositoryContext, refUpdate.oldObjectId, true);
        const oldLinkId = "oldcommit" + Controls.getId();
        const oldLinkHtml = $(domElem("div")).append(
            $(domElem("a"))
                .text(CommitIdHelper.getShortCommitId(refUpdate.oldObjectId) || "")
                .attr("href", oldLinkHref)
                .attr("id", oldLinkId)
            ).html();

        const newLinkHref = VersionControlUrls.getCommitUrl(this._repositoryContext, refUpdate.newObjectId, true);
        const newLinkId = "newcommit" + Controls.getId();
        const newLinkHtml = $(domElem("div")).append(
            $(domElem("a"))
                .text(CommitIdHelper.getShortCommitId(refUpdate.newObjectId) || "")
                .attr("href", newLinkHref)
                .attr("id", newLinkId)
            ).html();

        const refNameHtml = $(domElem("div")).text(refUpdate.name).html();

        if (CommitIdHelper.isEmptyObjectId(refUpdate.oldObjectId)) {
            $title.html(Utils_String.format(VCResources.RefCreatedFormat, refNameHtml, newLinkHtml));

            const $newCommitLinkElement = $title.find("#" + newLinkId);
            if ($newCommitLinkElement.length > 0) {
                RichContentTooltip.add(VCResources.ViewCommitDetailsTooltip, $newCommitLinkElement);
                $newCommitLinkElement.click(Service.getLocalService(HubsService).getHubNavigateHandler(CodeHubContributionIds.historyHub, newLinkHref));
            }
        }
        else if (CommitIdHelper.isEmptyObjectId(refUpdate.newObjectId)) {
            $title.html(Utils_String.format(VCResources.RefDeletedFormat, refNameHtml, oldLinkHtml));

            const $oldCommitLinkElement = $title.find("#" + oldLinkId);
            if ($oldCommitLinkElement.length > 0) {
                RichContentTooltip.add(VCResources.ViewCommitDetailsTooltip, $oldCommitLinkElement);
                $oldCommitLinkElement.click(Service.getLocalService(HubsService).getHubNavigateHandler(CodeHubContributionIds.historyHub, oldLinkHref));
            }
        }
        else {
            $title.html(Utils_String.format(VCResources.RefUpdateFromToFormat, refNameHtml, oldLinkHtml, newLinkHtml));

            const $oldCommitLinkElement = $title.find("#" + oldLinkId);
            if ($oldCommitLinkElement.length > 0) {
                RichContentTooltip.add(VCResources.ViewCommitDetailsTooltip, $oldCommitLinkElement);
                $oldCommitLinkElement.click(Service.getLocalService(HubsService).getHubNavigateHandler(CodeHubContributionIds.historyHub, oldLinkHref));
            }

            const $newCommitLinkElement = $title.find("#" + newLinkId);
            if ($newCommitLinkElement.length > 0) {
                RichContentTooltip.add(VCResources.ViewCommitDetailsTooltip, $newCommitLinkElement);
                $newCommitLinkElement.click(Service.getLocalService(HubsService).getHubNavigateHandler(CodeHubContributionIds.historyHub, newLinkHref));
            }
        }

        let $bottomLine = $(domElem("div", "push-info-bottom-line"))
            .appendTo($headerDetails);

        $(domElem("span", "status-pusher"))
            .text(Utils_String.format(VCResources.PushedByFormat, push.pushedBy.displayName))
            .appendTo($bottomLine);

        $(domElem("span", "status-date-info"))
            .text(Utils_Date.localeFormat(push.date, "G"))
            .appendTo($bottomLine);
    }

    private _populateRefUpdatesSection($container: JQuery, push: VCContracts.GitPush, refUpdate: VCContracts.GitRefUpdate) {

        let panel = <Panels.CollapsiblePanel>Controls.BaseControl.createIn(Panels.CollapsiblePanel, $container, {
            cssClass: "collapsible-section",
            collapsed: false
        });
        panel.appendHeaderText(Utils_String.format(VCResources.RefUpdatesSectionHeaderFormat, push.refUpdates.length));

        let commitIds: string[] = [];

        let refUpdates = push.refUpdates;
        refUpdates.sort((refUpdate1, refUpdate2) => {
            return Utils_String.localeIgnoreCaseComparer(refUpdate1.name, refUpdate2.name);
        });

        let $list = $(domElem("ul", "ref-actions"));
        $.each(refUpdates, (i: number, ru: VCContracts.GitRefUpdate) => {
            let $listItem = $(domElem("li")).appendTo($list),
                $item: JQuery;

            if (ru.name === refUpdate.name) {
                $item = $(domElem("span", "selected-ref-update"));
            }
            else {
                const linkHref = VersionControlUrls.getPushUrl(this._repositoryContext, push.pushId, ru.name);
                $item = $(domElem("a"))
                    .attr("href", linkHref)
                    .click(Service.getLocalService(HubsService).getHubNavigateHandler(PushesHubRoutes.pushViewHubId, linkHref));
            }

            $(domElem("span"))
                .text(VCOM.GitRefUpdateNameUtility.getRefUpdateDescription(ru))
                .appendTo($item);

            if (!CommitIdHelper.isEmptyObjectId(ru.newObjectId) && !this.isRefTag(ru.name)) {
                commitIds.push(ru.newObjectId);
                $(domElem("span", "ref-update-comment"))
                    .data("commitId", ru.newObjectId)
                    .appendTo($item);
            }
            
            $item.appendTo($listItem);
        });

        this._commitCommentFetcher.beginFetchingCommitComments(this._repositoryContext, commitIds, (commentsByCommitId: { [commitId: string]: string; }) => {
            $.each(this._element.find(".ref-update-comment"), (i: number, refUpdateComment: HTMLElement) => {
                let $refUpdateComment = $(refUpdateComment),
                    commitId = $refUpdateComment.data("commitId"),
                    comment = commentsByCommitId[commitId];

                if (comment) {
                    $refUpdateComment.text(": " + comment);
                }
            });
        });

        panel.appendContent($list);
    }

    private _populateNewRefInfo($container: JQuery, push: VCContracts.GitPush, refUpdate: VCContracts.GitRefUpdate) {

        let pushInformation = <Notifications.InformationAreaControl>Controls.BaseControl.createIn(Notifications.InformationAreaControl, $container, {
            caption: VCOM.GitRefUpdateNameUtility.getRefUpdateDescription(refUpdate),
            collapsed: false
        });

        let $header = $(domElem("div")).text(VCResources.PushNewRefActionsHeader);
        let $content = $(domElem("ul"));

        let versionString = new VCSpecs.GitCommitVersionSpec(refUpdate.newObjectId).toVersionString();

        const linkHref = VersionControlUrls.getExplorerUrl(this._repositoryContext, null, VCControlsCommon.VersionControlActionIds.Contents, { version: versionString });
        $(domElem("a"))
            .attr("href", linkHref)
            .click(Service.getLocalService(HubsService).getHubNavigateHandler(CodeHubContributionIds.gitFilesHub, linkHref))
            .text(VCResources.PushNewRefExplore)
            .appendTo($(domElem("li")).appendTo($content));

        $(domElem("a"))
            .attr("href", VersionControlUrls.getZippedContentUrl(this._repositoryContext, "/", versionString))
            .text(VCResources.PushNewRefDownload)
            .appendTo($(domElem("li")).appendTo($content));

        pushInformation.appendDetailHeaderContent($header);
        pushInformation.appendDetailContent($content);
    }

    private _populateDeletedRefInfo($container: JQuery, push: VCContracts.GitPush, refUpdate: VCContracts.GitRefUpdate) {
        
        let pushInformation = <Notifications.InformationAreaControl>Controls.BaseControl.createIn(Notifications.InformationAreaControl, $container, {
            caption: VCOM.GitRefUpdateNameUtility.getRefUpdateDescription(refUpdate),
            collapsed: false
        });

        let $header = $(domElem("div")).text(VCResources.PushDeletedRefActionsHeader);
        let $content = $(domElem("ul"));

        let versionString = new VCSpecs.GitCommitVersionSpec(refUpdate.oldObjectId).toVersionString();

        const linkHref = VersionControlUrls.getExplorerUrl(this._repositoryContext, null, VCControlsCommon.VersionControlActionIds.Contents, { version: versionString });
        $(domElem("a"))
            .attr("href", linkHref)
            .click(Service.getLocalService(HubsService).getHubNavigateHandler(CodeHubContributionIds.gitFilesHub, linkHref))
            .text(VCResources.PushDeletedRefExplore)
            .appendTo($(domElem("li")).appendTo($content));

        $(domElem("a"))
            .attr("href", VersionControlUrls.getZippedContentUrl(this._repositoryContext, "/", versionString))
            .text(VCResources.PushDeletedRefDownload)
            .appendTo($(domElem("li")).appendTo($content));

        pushInformation.appendDetailHeaderContent($header);
        pushInformation.appendDetailContent($content);
    }

    public refreshChangedFiles() {
        this._changeListFilesControl.refreshChangedFiles();
    }

    private isRefTag = (refName: string): boolean => {
        return (Utils_String.startsWith(refName, "refs/tags/"));
    }
}

VSS.classExtend(PushSummaryControl, TfsContext.ControlExtensions);