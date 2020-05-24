///<summary>Chart Coloring provides Color models and defines Palettes for use in charting.</summary >
/// <reference types="jquery" />

import * as VSS from "VSS/VSS";
import * as Service from "VSS/Service";
import * as Utils_Core from "VSS/Utils/Core";
import * as Diag from "VSS/Diag";
import * as ServerConstants from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as DataServices from "Charting/Scripts/TFS.Charting.DataServices";
import * as Chart_Contracts from "Charts/Contracts";
import { ColorSetBase, DefaultFeatureColorProvider, DefaultColorDictionary } from  "Charts/Internal/DefaultColorDictionary";

// Note: General charting awareness is forbidden here.
// The dependencies below are only for knowledge of feature scopes to enable semantic coloring.
// Until we come up with a coherent UX model for color handling(to factor against), don't muck with this code.
import * as Charting from "Charting/Scripts/TFS.Charting";
import * as Resources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { ColorUtilities } from "Charts/ColorUtilities";

export class TestResultFeatureColorProvider extends DefaultFeatureColorProvider {
    public getFeatureColor(key: string, isSubdued?: boolean): Chart_Contracts.ColorPair {
        let backgroundColor: string;

        //TCM specific color mappings to provide the semantic coloring for test execution outcome.
        switch(key)
        {
            case Resources.ChartDimensionValue_Passed:// Green
                backgroundColor = (isSubdued) ? "#8DC54B" : "#339947";
                break;

            case Resources.ChartDimensionValue_Failed: // Red
                backgroundColor = (isSubdued) ? "#F58B1F" : "#E31E26";
                break;

            case Resources.ChartDimensionValue_Blocked: // Gray
                backgroundColor = (isSubdued) ? "#747475" : "#525151";
                break;

            case Resources.ChartDimensionValue_NotApplicable: // Yellow
                backgroundColor = (isSubdued) ? "#FAEF67" : "#FFCC05";
                break;

            case Resources.ChartDimensionValue_NotRun: // Blue
                backgroundColor = (isSubdued) ? "#3673B8" : "#292E6B";
                break;
        }

        if (backgroundColor != null) {
            return {
                background: backgroundColor,
                foreground: ColorUtilities.selectForegroundColor(backgroundColor)
            };
        } else {
            return super.getFeatureColor(key, isSubdued);
        }
    }
}

/** Selects the appropriate color provider, given the feature */
export function getFeatureColorProvider(scope: string): Chart_Contracts.FeatureColorProvider {
    if (scope === Charting.ChartProviders.testReports || scope === Charting.ChartProviders.testRunSummary) {
        return new TestResultFeatureColorProvider();
    } else {
        return new DefaultFeatureColorProvider();
    }
}

/** Manages Colors of Charts */
export namespace ColorDictionary {
    /** Creates a new color manager from a chart configuration */
    export function fromColorEntries(
        featureColorProvider: Chart_Contracts.FeatureColorProvider,
        userColors?: DataServices.IColorEntry[],
        contractVersion?: number): Chart_Contracts.ColorDictionary {

        var instance: Chart_Contracts.ColorDictionary;

        //Legacy Palette versions:
        // Null version is used from WIT Charts Page
        // Version 1 is an un-migrated Chart Id, which is only viewable on dashboard
        // Version 2 is used by a pinned chart from feature page, which is viewable on Dashboard
        if (!contractVersion || contractVersion == 1 || contractVersion == 2) {
            instance = new DefaultColorDictionary(userColors, featureColorProvider);
        }

        // Modern Palette version: This is used for all newly configured Charts
        else if (contractVersion == 3) {
            instance = new DefaultColorDictionary(userColors);
        } else {
            throw "ColorDictionary only supports version levels 1-3";
        }

        return instance;
    }
}

/** Model of pending edits prepared under the current Configuration. */
export class ColorEditingModel {

    private _featureColorProvider: Chart_Contracts.FeatureColorProvider;
    private _currentDimension: string;
    private _colorDictionaries: { [dimension: string]: Chart_Contracts.ColorDictionary };

    constructor(dimension: string, initialColorDictionary: Chart_Contracts.ColorDictionary, featureColorProvider: Chart_Contracts.FeatureColorProvider ) {
        this._currentDimension = dimension;
        this._colorDictionaries = {};
        this._colorDictionaries[this._currentDimension] = initialColorDictionary;
        this._featureColorProvider = featureColorProvider;
    }

    /** Changes the pending color dictionary to the specified dimension. Edits on previous dimension are still available while model exists. */
    public changeColoringDimension(dimension: string): Chart_Contracts.ColorDictionary {

        this._currentDimension = dimension;
        if (!this._colorDictionaries[this._currentDimension]) {
            this._colorDictionaries[this._currentDimension] = new DefaultColorDictionary(/* user colors */null, this._featureColorProvider);
        }

        return this._colorDictionaries[this._currentDimension];
    }

    /** Returns a color manager associated with the current chart dimension. */
    public getCurrentColorDictionary(): Chart_Contracts.ColorDictionary {
        return this._colorDictionaries[this._currentDimension];
    }

    public getCurrentDimension(): string {
        return this._currentDimension;
    }
}

/** Abstraction for a chart which supports use of a color picker. */
export interface IColorPickableChart {
    getColorDictionary(): Chart_Contracts.ColorDictionary;
    repaintOnColorChange(): void;
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Charting.Color", exports);
