import {Control} from "VSS/Controls";
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import Events_Action = require("VSS/Events/Action");
import { RichContentTooltip } from "VSS/Controls/PopupContent";

import TFS_Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");
import {DashboardsTelemetry} from "Dashboards/Scripts/Telemetry";
import { DashboardPageExtension, RefreshTimerEvents } from "Dashboards/Scripts/Common";
import { PageVisibility } from "Dashboards/Scripts/Common.PageVisibility";

import { Events } from "TFS/Dashboards/Events";

export class RefreshTimerConstants {
    public static pageReloadIntervalInMs = 1 * 60 * 60 * 1000; // 1 hours
}

export class DashboardRefreshTimer extends Control<any>{
    /* Time in minutes for the refresh */
    public _refreshTimeout: number = 0;

    /* Handle for updating the 'Last Updated.. ' text label */
    private updateTimerHandle: number;

    /* Time stamp on when the timer started */
    private startDateTime: Date = null;
    /* Time stamp that refresh should happen */
    public _refreshDateTime: Date;

    /* The interval to update the text label */
    private timerLabel: JQuery;

    /* Whether the refresh counter would get trigger or not */
    private refreshCountdownEnable: boolean = true; 

    /* Used by the refresh logic to perform full page load to workaround current memory leaks */
    private controlLoadDate: Date;

    /**
    * Class used for the timer
    */
    public static refreshTimerClass: string = "dashboard-refresh-timer";
    public static refreshTimerTextDivId: string = "dashboard-refresh-timer-text";
    public static refreshTimerVisibleClass: string = "dashboard-timer-visible-class";
    public static refreshTimerHiddenClass: string = "dashboard-timer-hidden-class";
    
    // Default refreshTimer
    public static defaultRefreshMinutes: number = 5;

    public constructor(options) {
        super(options);
    }


    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            tagName: "button"
        }, options));
    }

    public initialize() {
        super.initialize();
        this.controlLoadDate = new Date();

        this.render();
    }

    public reload() {
        this.performRefresh();
        DashboardsTelemetry.onClickingAutoRefresh(DashboardPageExtension.getActiveDashboard());
    }

    public render() {
        var timerContainer = this.getElement()
            .attr("type", "button")
            .addClass(DashboardRefreshTimer.refreshTimerClass)
            .addClass(DashboardRefreshTimer.refreshTimerHiddenClass)
            .on("click", (e) => {
                this.reload();
                e.preventDefault();
            });

        Utils_UI.accessible(timerContainer);

        let tooltip: RichContentTooltip = RichContentTooltip.add("", timerContainer, { showOnFocus: true });
        timerContainer.hover(() => {
            tooltip.setTextContent(this.getRemainingTimeTooltipString());
        });

        var refreshIcon = $("<span>")
            .addClass("bowtie-navigate-refresh")
            .addClass("dashboard-refresh-icon");
        timerContainer.append(refreshIcon);

        // create the update label
        this.timerLabel = $("<div>")
            .attr("id", DashboardRefreshTimer.refreshTimerTextDivId)
            .text(TFS_Dashboards_Resources.Dashboard_Timer_Initialized)
            .appendTo(timerContainer);
    }

    private performRefresh(): void {
        this._stop();
        this.timerLabel.text(TFS_Dashboards_Resources.Dashboard_Timer_Updating);

        // RefreshTimerEvents.OnRefresh should be retired with Events.OnViewChange which is shared
        // in WebPlatform whereas OnRefresh is only usable by projects that take dependencies on WebAccess/Dashboards.
        Events_Action.getService().performAction(RefreshTimerEvents.OnRefresh);
        Events_Action.getService().performAction(Events.OnViewChange);
    }

    private tick() {
        var now = new Date();

        // Temporary workaround for memory leaks associated with dashboards being left open for extended periods of time with auto refresh on. The following
        // story is tracking the work to resolve this: https://mseng.visualstudio.com/DefaultCollection/VSOnline/_workitems/edit/684506
        if (this._getTimeDifferenceInMs(this.controlLoadDate, now) >= RefreshTimerConstants.pageReloadIntervalInMs) {
            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_RELOAD);
        }

        this.timerLabel.text(this._getTimeLabelText());
        var secondsToRefresh = this._getTimeDifferenceInSecond(now, this._refreshDateTime);
        if (secondsToRefresh <= 0 && this.refreshCountdownEnable && PageVisibility.isPageVisible()) {
            this.performRefresh();
        } else {
            this.updateTimerHandle = setTimeout(() => { this.tick(); }, 1000);
        }
    }

    private _getTimeDifferenceInMs(startTime: Date, endTime: Date): number {
        return Math.floor((endTime.getTime() - startTime.getTime()));
    }

    public _getTimeDifferenceInSecond(startTime: Date, endTime: Date): number {
        if (startTime && endTime) {
            return Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        } else {
            return null;
        }
    }

    /**
     * return the string which contains the remaining time in the current refresh circle
     */
    public getRemainingTimeTooltipString(): string {
        if (this._refreshTimeout == 0)
            return null;

        var remainingMinute = Math.floor(this._getTimeDifferenceInSecond(new Date(), this._refreshDateTime) / 60);
        if (remainingMinute >= 0) {
            if (remainingMinute < 1) {
                return TFS_Dashboards_Resources.AutoRefreshLessThanOneMinuteTooltip;
            } else if (remainingMinute == 1) {
                return TFS_Dashboards_Resources.AutoRefreshOneMinuteTooltip;
            } else {
                return Utils_String.format(TFS_Dashboards_Resources.AutoRefreshMinutesTooltip, remainingMinute);
            }
        } else {
            // While network is being retry we only want to show the text of updating.
            return TFS_Dashboards_Resources.Dashboard_Timer_Updating;
        }
    }
     
    /**
    * Set the refresh time for the RefreshTimout, and start it right away
    * @refreshTime: the time in minute for the timer to expire
    */
    public setAndStartRefreshTimer(refreshTime: number) {
        if (refreshTime <= 0) {
            this._stop();
            this._hideRefreshTimer();
        } else {
            this._refreshTimeout = refreshTime;
            this._reset();
            this._showRefreshTimer();
        }
    }

    public _showRefreshTimer() {
        var timer = document.getElementsByClassName(DashboardRefreshTimer.refreshTimerClass);
        $(timer).removeClass(DashboardRefreshTimer.refreshTimerHiddenClass);
        $(timer).addClass(DashboardRefreshTimer.refreshTimerVisibleClass);
    }

    public _hideRefreshTimer() {
        var timer = document.getElementsByClassName(DashboardRefreshTimer.refreshTimerClass);
        $(timer).removeClass(DashboardRefreshTimer.refreshTimerVisibleClass);
        $(timer).addClass(DashboardRefreshTimer.refreshTimerHiddenClass);
    }

    /* Reset the refresh countdown timer */
    public resetRefreshCountdown(): void {
        if (this._refreshTimeout) {
            this._refreshDateTime = new Date(new Date().getTime() + (this._refreshTimeout * 60 * 1000));
            this._startRefreshCountdown();
        }
    }

    public _getTimeLabelText(): string {
        var secondsPassed = this._getTimeDifferenceInSecond(this.startDateTime, new Date());
        if (secondsPassed != undefined) {
            var minutePassed = Math.floor(secondsPassed / 60);
            if (minutePassed == 0) {
                return TFS_Dashboards_Resources.Dashboard_Timer_Initialized;
            } else if (minutePassed == 1) {
                return TFS_Dashboards_Resources.Dashboard_Timer_Updated_one_minute;
            } else if (minutePassed >= 60) {
                // Stop updating the text if we get passed 1 hour
                return TFS_Dashboards_Resources.Dashboard_Timer_Updated_hours;
            } else if (minutePassed > 1) {
                return Utils_String.format(TFS_Dashboards_Resources.Dashboard_Timer_Updated_minutes, minutePassed);
            }
        } else {
            return Utils_String.empty;
        }
    }

    public _stop() {
        if (this.updateTimerHandle != null) {
            clearTimeout(this.updateTimerHandle);
            this.updateTimerHandle = null;
        }
    }

    /**
     * Reset the timer and the timer label
     */
    public _reset() {
        this._stop();
        this.refreshCountdownEnable = true;
        this.startDateTime = new Date();
        // Set the time we are going to refresh the page
        this._refreshDateTime = new Date(this.startDateTime.getTime() + this._refreshTimeout * 60 * 1000);
        this.tick();
    }

    /**
     * Enable the timer to trigger callback on timeout
     */
    public _startRefreshCountdown() {
        this._stop();
        this.refreshCountdownEnable = true;
        this.tick();
    }

    /**
     * Stop timer to trigger the callback, label would still get updated
     */
    public stopRefreshCountdown() {
        this.refreshCountdownEnable = false;
    }
}