import WidgetResources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");


export class NamedColorPalette {
    localizedName: string;
    proposedColor: string;
    doneColor: string;
    otherColors: string[];
}

/** Defines color palettes for CFD Chart.
  * These palettes involve three parts.
  *  1 - Localized Name is required to provide user facing name in dropdown. We need to round-trip between loc name and invariant name.
  *  2 - Invariant name is used for persisting settings.
  *  3 - Colors are the content of the palette.
*/
export class ChartColorPalettes {
    private palettes: IDictionaryStringTo<NamedColorPalette>;

    /* array of invariant names. Position of invariant and localized names are identical for relating.*/
    private invariantNames: string[];
    /* array of localized names. Position of invariant and localized names are identical for relating.*/
    private localizedNames: string[];

    private static instance: ChartColorPalettes = null;
    public static getInstance(): ChartColorPalettes {
        if (this.instance == null) {
            this.instance = new ChartColorPalettes();
            this.instance.addDefaultPalettes();
        }
        return this.instance;
    }

    constructor() {
        this.palettes = <IDictionaryStringTo<NamedColorPalette>>{};
        this.invariantNames = [];
        this.localizedNames = [];
    }

    /** Applies the default set of palettes. An implementation secret of getInstance()*/
    private addDefaultPalettes() {
        this.addPalette("Blue", {
            localizedName: WidgetResources.ChartPaletteName_Blue,
            proposedColor: "#E8E8E8",
            doneColor: "#00643A",
            otherColors: ["#3F9BD8", "#D6EDED", "#1B478B", "#7FBCE5", "#007ACC", "#E4F3F3", "#0D60AB", "#C9E7E7"]
        });

        this.addPalette("Green", {
            localizedName: WidgetResources.ChartPaletteName_Green,
            proposedColor: "#E8E8E8",
            doneColor: "#292E6B",
            otherColors: ["#9CC3B2", "#339947", "#207752", "#BFD8CD", "#7CAF9A", "#8DC54B", "#56987D", "#60AF49"]
        });

        this.addPalette("Orange", {
            localizedName: WidgetResources.ChartPaletteName_Orange,
            proposedColor: "#E8E8E8",
            doneColor: "#7F1725",
            otherColors: ["#F9B978", "#FCFD8B", "#E87025", "#FBD144", "#F7A24B", "#FBBC3D", "#F58B1F", "#FBE74B"]
        });

        this.addPalette("Purple", {
            localizedName: WidgetResources.ChartPaletteName_Purple,
            proposedColor: "#E8E8E8",
            doneColor: "#292E6B",
            otherColors: ["#C7ABD0", "#DAD4F7", "#71338D", "#E0CAE7", "#AE88B9", "#C0B6E9", "#9260A1", "#AA9CDF"]
        });

        this.addPalette("Red", {
            localizedName: WidgetResources.ChartPaletteName_Red,
            proposedColor: "#E8E8E8",
            doneColor: "#292E6B",
            otherColors: ["#F06673", "#F9CCE8", "#B20B1E", "#F599A2", "#EB3345", "#FBDDEF", "#E60017", "#F599D1"]
        });
    }

    /** adds a palette using the invariant name, localized name and list of palette colors.
     *   Note: InvariantNames are persisted into settings - these names cannot ever be changed, without disrupting existing saved widgets.
     *   Localized names are for presentation, and can be changed at will.
    */
    public addPalette(invariantName: string, palette: NamedColorPalette): void {
        this.palettes[invariantName] = palette;
        this.invariantNames.push(invariantName);
        this.localizedNames.push(palette.localizedName);
    }

    /** Return the colors for the requested palette, using the invariant name.
     * Falls back to first element if no match can be found.
     */
    public getPalette(invariantName: string): NamedColorPalette {
        var namedPalette: NamedColorPalette;

        if (this.invariantNames.indexOf(invariantName) < 0) {
            namedPalette = this.palettes[this.invariantNames[0]];
        }
        else {
            namedPalette = this.palettes[invariantName];
        }

        return namedPalette;
    }

    /** Returns the colors for the requested palette, using the invariant name.
     * Note: This conversion only reliable in the context of localized names obtained during a user session.
     * Localized names should never be retained or persisted.
     */
    public getInvariantNameFromLocalizedName(localizedName: string): string {
        var invariantName: string;

        var position = this.localizedNames.indexOf(localizedName);
        if (position < 0) {
            invariantName = this.invariantNames[0];
        }
        else {
            invariantName = this.invariantNames[position];
        }

        return invariantName;
    }

    /** returns the list of invariant names of the available palettes. */
    public getPaletteNames(): string[] {
        return this.invariantNames;
    }

    /** returns the invariant names for the available palettes. Do not persist these. */
    public getLocalizedPaletteNames(): NamedColorPalette[] {
        return $.map(this.palettes, (palette: NamedColorPalette) => {
            return palette.localizedName;
        });
    }
}