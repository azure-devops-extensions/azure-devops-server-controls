// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

export class DayConstants {
    public static getDayNameMap(dayIndex: number): string {
        if (!this._dayNames) {
            this._dayNames = {};
            this._dayNames[0] = Resources.Monday;
            this._dayNames[1] = Resources.Tuesday;
            this._dayNames[2] = Resources.Wednesday;
            this._dayNames[3] = Resources.Thursday;
            this._dayNames[4] = Resources.Friday;
            this._dayNames[5] = Resources.Saturday;
            this._dayNames[6] = Resources.Sunday;
        }
        return this._dayNames[dayIndex];
    }
    private static _dayNames: IDictionaryNumberTo<string> = null;
}