/// <reference types="jquery" />
/// <amd-dependency path='VSS/LoaderPlugins/Css!MyWork' />

import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Controls = require("VSS/Controls");
import Dashboards_UIContracts = require("Dashboards/Scripts/Contracts");
import MyWorkTelemetry = require("MyWork/Scripts/TFS.MyWork.Telemetry");
import Resources = require("MyWork/Scripts/Resources/TFS.Resources.MyWork");
import SDK = require("VSS/SDK/Shim");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import UICommonControls = require("Presentation/Scripts/TFS/TFS.Host.UI.Controls");

var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

export interface INewsResult {
    Link: string;
    Items: INewsItem[];
}

export interface INewsItem {
    Title: string;
    Summary: string;
    Url: string;
}

export class NewsView extends UICommonControls.GridListControl {
    static DEFAULT_MAX_NEWS_COUNT = 3;
    static THROTTLE_MIN_TIME = 100;
    //css classes source: TFS.Host.UI.AccountHomeView.ts
    static VIEWALL_LINK_TITLE_CSS = "view-all-news";
    static NEW_WIDGET_ICONCONTAINER_CSS = "icon-container";
    static NEW_WIDGET_NEWSITEM_CSS = "grid-cell-item-title";
    static NEW_WIDGET_CONTAINER_CSS = "account-home-view-news-panel";
    static NEW_WIDGET_ULCONTAINER_CSS = "grid-list";
    static NEW_WIDGET_ACTIONLINK_CSS = "actionlink";
    static NEW_WIDGET_LOADING_CSS = "big-status-progress";
    static NEW_WIDGET_NON_DASHBOARD_MODE = "non-dashboard-mode";

    constructor(options?) {
        super(options);
    }

    initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: NewsView.NEW_WIDGET_CONTAINER_CSS
        }, options));
    }

    initialize(): void {
        super.initialize();
        this.render();
    }

    render(): void {
        this.getElement().addClass(NewsView.NEW_WIDGET_NON_DASHBOARD_MODE);

        var startLoadTime = Date.now();
        super.render();
        this.addGridControlTitle(Resources.NewsWidgetTitle);

        var statusIndicator = <StatusIndicator.StatusIndicator>(<any>(Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, this._element, {
            center: true,
            imageClass: NewsView.NEW_WIDGET_LOADING_CSS,
            message: Resources.LoadingMessage,
            throttleMinTime: NewsView.THROTTLE_MIN_TIME
        })));

        statusIndicator.start();
        NewsControl.beginGetNews(NewsView.DEFAULT_MAX_NEWS_COUNT, (result: INewsResult) => {
            if (statusIndicator != null) {
                statusIndicator.dispose();
                statusIndicator = null;
            }
            this._renderControl(result);
            var endLoadTime = Date.now();
            var loadTime = `${endLoadTime - startLoadTime}`;
            MyWorkTelemetry.MyWorkTelemetry.publishTelemetry(MyWorkTelemetry.TelemetryConstants.WIDGET_INITIALIZATION, { "loadTimeMsec": loadTime });
        },
        (error: Error) => {
            this._logWidgetLoadFailure(error.message);
            statusIndicator.dispose();
            statusIndicator = null;
        });
    }

    private _renderControl(result: INewsResult) {
        $.each(result.Items, (i, item: INewsItem) => {
            this._renderItem(i, item);
        });

        this._addViewAllLink(Resources.NewsWidgetViewAllTitle, NewsView.VIEWALL_LINK_TITLE_CSS, Resources.NewsWidgetViewAllLink);
    }

    private _renderItem(newsPosition: number, item: INewsItem): void {
        var icon = "", iconTitle = "", hoverIcon = "", hoverIconTitle = "";
        var gridListItem = new UICommonControls.GridListItem(icon, iconTitle, item.Title, item.Url, item.Summary, hoverIcon, hoverIconTitle, item.Title);
        var newsItem = this.addListItem(gridListItem);
        newsItem.find(`.${NewsView.NEW_WIDGET_ICONCONTAINER_CSS}`).remove();
        newsItem.find(`.${NewsView.NEW_WIDGET_NEWSITEM_CSS} a`).attr("target", "_blank").click(() => {
            MyWorkTelemetry.MyWorkTelemetry.publishTelemetry(MyWorkTelemetry.TelemetryConstants.NEWS_WIDGET_CLICK_NEWS_LINK, { "NewsItemPosition": (newsPosition + 1).toString() });
        });
    }

    private _addViewAllLink(actionTitle: string, actionClass: string, linkUrl: string): JQuery {
        var ulContainer = this._element.find(`ul.${NewsView.NEW_WIDGET_ULCONTAINER_CSS}`);
        var actionLink = $("<a>").addClass(NewsView.NEW_WIDGET_ACTIONLINK_CSS).addClass(actionClass)
            .attr("target", "_blank").attr("href", linkUrl).text(actionTitle)
            .click(() => {
                MyWorkTelemetry.MyWorkTelemetry.publishTelemetry(MyWorkTelemetry.TelemetryConstants.NEWS_WIDGET_CLICK_VIEW_ALL_LINK, {});
            })
            .appendTo(ulContainer);
        return ulContainer;
    }

    private _logWidgetLoadFailure(error: string) {
        MyWorkTelemetry.MyWorkTelemetry.publishTelemetry(MyWorkTelemetry.TelemetryConstants.WIDGET_LOAD_ERROR, { "error": error });
    }
}

export class NewsControl {
    static beginGetNews(maxCount: number, callback: (result: INewsResult) => void, errorCallback?: IErrorCallback) {
        var url = tfsContext.getActionUrl("GetNews", "common", { area: "api" });
        Ajax.getMSJSON(
            url,
            { maxCount: maxCount },
            result => callback(result),
            errorCallback);
    }
}

SDK.VSS.register("Microsoft.VisualStudioOnline.MyWork.NewsViewWidget", () => NewsView);
SDK.registerContent("Microsoft.VisualStudioOnline.MyWork.NewsViewWidget.Initialize", (context) => {
    return Controls.create(NewsView, context.$container, context.options);
});
