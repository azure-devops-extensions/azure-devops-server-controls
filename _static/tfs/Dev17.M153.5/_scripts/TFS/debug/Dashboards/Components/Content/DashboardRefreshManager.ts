import Utils_String = require("VSS/Utils/String");
import Events_Action = require("VSS/Events/Action");

import TFS_Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");
import { DashboardPageExtension, RefreshTimerEvents } from "Dashboards/Scripts/Common";
import { PageVisibility } from "Dashboards/Scripts/Common.PageVisibility";
import { Events } from "TFS/Dashboards/Events";

export class DashboardRefreshManager {
    /* Time in minutes for the refresh */
    public refreshTimeout: number = 0;

    /* Time stamp on when the timer started */
    private startDateTime: Date = null;

    /* Handle for updating the 'Last Updated.. ' text */
    private updateTimerHandle: number;

    /* Time stamp that refresh should happen */
    public refreshDateTime: Date;

    /* Whether the refresh counter would get trigger or not */
    private refreshCountdownEnable: boolean = true;

    private constructor() { }
    private static instance: DashboardRefreshManager;

    public static getInstance(): DashboardRefreshManager {
        if (!DashboardRefreshManager.instance) {
            DashboardRefreshManager.instance = new DashboardRefreshManager();
        }

        return DashboardRefreshManager.instance;
    }

    public getTimeLabelText(): string {
        var secondsPassed = this.getTimeDifferenceInSecond(this.startDateTime, new Date());
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

    /**
    * Set the refresh time for the RefreshTimout, and start it right away. If the refresh time is invalid, stop the timer. 
    * @refreshTime: the time in minute for the timer to expire
    */
    public setAndStartRefreshTimer(refreshTime: number) {
        this.refreshTimeout = refreshTime;
        if (this.refreshTimeout) {
            this.resetRefreshCountdown();
        }
        else {
            this.stop();
        }     
    }

    /**
     * Reset the refresh countdown timer
     */
    public resetRefreshCountdown(): void {
        if (this.refreshTimeout) {
            this.stop();
            this.startDateTime = new Date(); 
            this.refreshDateTime = new Date(this.startDateTime.getTime() + (this.refreshTimeout * 60 * 1000));
            this.refreshCountdownEnable = true;
            this.tick();
        }
    }

    /**
     * Stop timer to trigger the callback, label would still get updated
     */
    public stopRefreshCountdown() {
        this.refreshCountdownEnable = false;
    }

    private tick() {
        var now = new Date();
        var secondsToRefresh = this.getTimeDifferenceInSecond(now, this.refreshDateTime);
        if (secondsToRefresh <= 0 && this.refreshCountdownEnable && PageVisibility.isPageVisible()) {
            this.stop();
            Events_Action.getService().performAction(RefreshTimerEvents.OnRefresh);
            Events_Action.getService().performAction(Events.OnViewChange);
        } else {
            this.updateTimerHandle = setTimeout(() => { this.tick(); }, 1000);
        }
    }

    private getTimeDifferenceInSecond(startTime: Date, endTime: Date): number {
        if (startTime && endTime) {
            return Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        } else {
            return null;
        }
    }

    private stop() {
        if (this.updateTimerHandle != null) {
            clearTimeout(this.updateTimerHandle);
            this.updateTimerHandle = null;
        }
    }
}