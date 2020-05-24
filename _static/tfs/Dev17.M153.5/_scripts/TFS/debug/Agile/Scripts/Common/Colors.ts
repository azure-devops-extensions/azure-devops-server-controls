import Resources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import { AccessibilityColor } from "Presentation/Scripts/TFS/TFS.UI.Controls.ColorPicker";

export class Colors {
    public static BLACK = "#000000";
    public static WHITE = "#ffffff";

    // Used for tag and card title styling
    public static ORANGE = "#fbbc3d";
    public static DARK_GREEN = "#00564b";
    public static BLUE = "#245cac";
    public static DARK_PURPLE = "#602f70";
    public static DARK_RED = "#7a0002";
    public static GREY = "#525252";
    public static YELLOW = "#fbfd52";
    public static GREEN = "#7ace64";
    public static TEAL = "#2cbdd9";
    public static PURPLE = "#ff00ff";
    public static RED = "#ec001d";
    public static DEFAULT = "#d9e6f1";

    // Used for card coloring
    public static LIGHT_GREY = "#b0b0b0";
    public static LIGHT_PURPLE = "#ccabde";
    public static LIGHT_BLUE = "#b1c8f7";
    public static LIGHT_TEAL = "#80f8ff";
    public static LIGHT_GREEN = "#66d589";
    public static LIGHT_ORANGE = "#ffba69";
    public static LIGHT_YELLOW = "#ffe660";
    public static BEIGE = "#d6ce95";
    public static LIGHT_RED = "#de5e5e";
    public static GREY_LIGHTER_20 = "#cacaca";
    public static GREY_LIGHTER_40 = "#d7d7d7";
    public static GREY_LIGHTER_60 = "#e7e7e7";
    public static PURPLE_LIGHTER_20 = "#d7bde5";
    public static PURPLE_LIGHTER_40 = "#e0cdeb";
    public static PURPLE_LIGHTER_60 = "#ebddf2";
    public static PURPLE_LIGHTER_80 = "#f5eef8";
    public static BLUE_LIGHTER_20 = "#c5d6fd";
    public static BLUE_LIGHTER_40 = "#d7e3fd";
    public static BLUE_LIGHTER_60 = "#e2ebfe";
    public static BLUE_LIGHTER_80 = "#edf2fe";
    public static TEAL_LIGHTER_20 = "#c2f8ff";
    public static TEAL_LIGHTER_40 = "#dafaff";
    public static TEAL_LIGHTER_60 = "#dffdff";
    public static TEAL_LIGHTER_80 = "#eaffff";
    public static GREEN_LIGHTER_20 = "#aed7a8";
    public static GREEN_LIGHTER_40 = "#cae5b8";
    public static GREEN_LIGHTER_60 = "#dceec6";
    public static GREEN_LIGHTER_80 = "#efffdc";
    public static ORANGE_LIGHTER_20 = "#ffd0a0";
    public static ORANGE_LIGHTER_40 = "#ffe0c1";
    public static ORANGE_LIGHTER_60 = "#ffebd7";
    public static ORANGE_LIGHTER_80 = "#fff2e5";
    public static YELLOW_LIGHTER_20 = "#ffeea2";
    public static YELLOW_LIGHTER_40 = "#fff4c2";
    public static YELLOW_LIGHTER_60 = "#fff8d7";
    public static YELLOW_LIGHTER_80 = "#fffae5";
    public static BEIGE_LIGHTER_20 = "#d9d6c0";
    public static BEIGE_LIGHTER_40 = "#e2decc";
    public static BEIGE_LIGHTER_60 = "#e4e2d6";
    public static BEIGE_LIGHTER_80 = "#f1ede2";
    public static RED_LIGHTER_20 = "#e0a3a3";
    public static RED_LIGHTER_40 = "#f4baba";
    public static RED_LIGHTER_60 = "#f7cbcb";
    public static RED_LIGHTER_80 = "#ffdfe0";

    public static getAccessibilityColors(): IDictionaryStringTo<AccessibilityColor> {
        let accessibilityColors: IDictionaryStringTo<AccessibilityColor> = {};
        accessibilityColors[Colors.ORANGE] = new AccessibilityColor(Colors.ORANGE, Resources.CardStyling_ColorPicker_Orange);
        accessibilityColors[Colors.DARK_GREEN] = new AccessibilityColor(Colors.DARK_GREEN, Resources.CardStyling_ColorPicker_DarkGreen);
        accessibilityColors[Colors.BLUE] = new AccessibilityColor(Colors.BLUE, Resources.CardStyling_ColorPicker_Blue);
        accessibilityColors[Colors.DARK_PURPLE] = new AccessibilityColor(Colors.DARK_PURPLE, Resources.CardStyling_ColorPicker_DarkPurple);
        accessibilityColors[Colors.DARK_RED] = new AccessibilityColor(Colors.DARK_RED, Resources.CardStyling_ColorPicker_DarkRed);
        accessibilityColors[Colors.BLACK] = new AccessibilityColor(Colors.BLACK, Resources.CardStyling_ColorPicker_Black);
        accessibilityColors[Colors.GREY] = new AccessibilityColor(Colors.GREY, Resources.CardStyling_ColorPicker_Grey);
        accessibilityColors[Colors.YELLOW] = new AccessibilityColor(Colors.YELLOW, Resources.CardStyling_ColorPicker_Yellow);
        accessibilityColors[Colors.GREEN] = new AccessibilityColor(Colors.GREEN, Resources.CardStyling_ColorPicker_Green);
        accessibilityColors[Colors.TEAL] = new AccessibilityColor(Colors.TEAL, Resources.CardStyling_ColorPicker_Teal);
        accessibilityColors[Colors.PURPLE] = new AccessibilityColor(Colors.PURPLE, Resources.CardStyling_ColorPicker_Purple);
        accessibilityColors[Colors.RED] = new AccessibilityColor(Colors.RED, Resources.CardStyling_ColorPicker_Red);
        accessibilityColors[Colors.DEFAULT] = new AccessibilityColor(Colors.DEFAULT, Resources.CardStyling_ColorPicker_Default);

        accessibilityColors[Colors.LIGHT_GREY] = new AccessibilityColor(Colors.LIGHT_GREY, Resources.CardStyling_ColorPicker_Grey);
        accessibilityColors[Colors.GREY_LIGHTER_20] = new AccessibilityColor(Colors.GREY_LIGHTER_20, Resources.CardStyling_ColorPicker_GreyLighter20);
        accessibilityColors[Colors.GREY_LIGHTER_40] = new AccessibilityColor(Colors.GREY_LIGHTER_40, Resources.CardStyling_ColorPicker_GreyLighter40);
        accessibilityColors[Colors.GREY_LIGHTER_60] = new AccessibilityColor(Colors.GREY_LIGHTER_60, Resources.CardStyling_ColorPicker_GreyLighter60);
        accessibilityColors[Colors.WHITE] = new AccessibilityColor(Colors.WHITE, Resources.CardStyling_ColorPicker_NoColor);

        accessibilityColors[Colors.LIGHT_PURPLE] = new AccessibilityColor(Colors.LIGHT_PURPLE, Resources.CardStyling_ColorPicker_Purple);
        accessibilityColors[Colors.PURPLE_LIGHTER_20] = new AccessibilityColor(Colors.PURPLE_LIGHTER_20, Resources.CardStyling_ColorPicker_PurpleLighter20);
        accessibilityColors[Colors.PURPLE_LIGHTER_40] = new AccessibilityColor(Colors.PURPLE_LIGHTER_40, Resources.CardStyling_ColorPicker_PurpleLighter40);
        accessibilityColors[Colors.PURPLE_LIGHTER_60] = new AccessibilityColor(Colors.PURPLE_LIGHTER_60, Resources.CardStyling_ColorPicker_PurpleLighter60);
        accessibilityColors[Colors.PURPLE_LIGHTER_80] = new AccessibilityColor(Colors.PURPLE_LIGHTER_80, Resources.CardStyling_ColorPicker_PurpleLighter80);

        accessibilityColors[Colors.LIGHT_BLUE] = new AccessibilityColor(Colors.LIGHT_BLUE, Resources.CardStyling_ColorPicker_Blue);
        accessibilityColors[Colors.BLUE_LIGHTER_20] = new AccessibilityColor(Colors.BLUE_LIGHTER_20, Resources.CardStyling_ColorPicker_BlueLighter20);
        accessibilityColors[Colors.BLUE_LIGHTER_40] = new AccessibilityColor(Colors.BLUE_LIGHTER_40, Resources.CardStyling_ColorPicker_BlueLighter40);
        accessibilityColors[Colors.BLUE_LIGHTER_60] = new AccessibilityColor(Colors.BLUE_LIGHTER_60, Resources.CardStyling_ColorPicker_BlueLighter60);
        accessibilityColors[Colors.BLUE_LIGHTER_80] = new AccessibilityColor(Colors.BLUE_LIGHTER_80, Resources.CardStyling_ColorPicker_BlueLighter80);

        accessibilityColors[Colors.LIGHT_TEAL] = new AccessibilityColor(Colors.LIGHT_TEAL, Resources.CardStyling_ColorPicker_Teal);
        accessibilityColors[Colors.TEAL_LIGHTER_20] = new AccessibilityColor(Colors.TEAL_LIGHTER_20, Resources.CardStyling_ColorPicker_TealLighter20);
        accessibilityColors[Colors.TEAL_LIGHTER_40] = new AccessibilityColor(Colors.TEAL_LIGHTER_40, Resources.CardStyling_ColorPicker_TealLighter40);
        accessibilityColors[Colors.TEAL_LIGHTER_60] = new AccessibilityColor(Colors.TEAL_LIGHTER_60, Resources.CardStyling_ColorPicker_TealLighter60);
        accessibilityColors[Colors.TEAL_LIGHTER_80] = new AccessibilityColor(Colors.TEAL_LIGHTER_80, Resources.CardStyling_ColorPicker_TealLighter80);

        accessibilityColors[Colors.LIGHT_GREEN] = new AccessibilityColor(Colors.LIGHT_GREEN, Resources.CardStyling_ColorPicker_Green);
        accessibilityColors[Colors.GREEN_LIGHTER_20] = new AccessibilityColor(Colors.GREEN_LIGHTER_20, Resources.CardStyling_ColorPicker_GreenLighter20);
        accessibilityColors[Colors.GREEN_LIGHTER_40] = new AccessibilityColor(Colors.GREEN_LIGHTER_40, Resources.CardStyling_ColorPicker_GreenLighter40);
        accessibilityColors[Colors.GREEN_LIGHTER_60] = new AccessibilityColor(Colors.GREEN_LIGHTER_60, Resources.CardStyling_ColorPicker_GreenLighter60);
        accessibilityColors[Colors.GREEN_LIGHTER_80] = new AccessibilityColor(Colors.GREEN_LIGHTER_80, Resources.CardStyling_ColorPicker_GreenLighter80);

        accessibilityColors[Colors.LIGHT_ORANGE] = new AccessibilityColor(Colors.LIGHT_ORANGE, Resources.CardStyling_ColorPicker_Orange);
        accessibilityColors[Colors.ORANGE_LIGHTER_20] = new AccessibilityColor(Colors.ORANGE_LIGHTER_20, Resources.CardStyling_ColorPicker_OrangeLighter20);
        accessibilityColors[Colors.ORANGE_LIGHTER_40] = new AccessibilityColor(Colors.ORANGE_LIGHTER_40, Resources.CardStyling_ColorPicker_OrangeLighter40);
        accessibilityColors[Colors.ORANGE_LIGHTER_60] = new AccessibilityColor(Colors.ORANGE_LIGHTER_60, Resources.CardStyling_ColorPicker_OrangeLighter60);
        accessibilityColors[Colors.ORANGE_LIGHTER_80] = new AccessibilityColor(Colors.ORANGE_LIGHTER_80, Resources.CardStyling_ColorPicker_OrangeLighter80);

        accessibilityColors[Colors.LIGHT_YELLOW] = new AccessibilityColor(Colors.LIGHT_YELLOW, Resources.CardStyling_ColorPicker_Yellow);
        accessibilityColors[Colors.YELLOW_LIGHTER_20] = new AccessibilityColor(Colors.YELLOW_LIGHTER_20, Resources.CardStyling_ColorPicker_YellowLighter20);
        accessibilityColors[Colors.YELLOW_LIGHTER_40] = new AccessibilityColor(Colors.YELLOW_LIGHTER_40, Resources.CardStyling_ColorPicker_YellowLighter40);
        accessibilityColors[Colors.YELLOW_LIGHTER_60] = new AccessibilityColor(Colors.YELLOW_LIGHTER_60, Resources.CardStyling_ColorPicker_YellowLighter60);
        accessibilityColors[Colors.YELLOW_LIGHTER_80] = new AccessibilityColor(Colors.YELLOW_LIGHTER_80, Resources.CardStyling_ColorPicker_YellowLighter80);

        accessibilityColors[Colors.BEIGE] = new AccessibilityColor(Colors.BEIGE, Resources.CardStyling_ColorPicker_Beige);
        accessibilityColors[Colors.BEIGE_LIGHTER_20] = new AccessibilityColor(Colors.BEIGE_LIGHTER_20, Resources.CardStyling_ColorPicker_BeigeLighter20);
        accessibilityColors[Colors.BEIGE_LIGHTER_40] = new AccessibilityColor(Colors.BEIGE_LIGHTER_40, Resources.CardStyling_ColorPicker_BeigeLighter40);
        accessibilityColors[Colors.BEIGE_LIGHTER_60] = new AccessibilityColor(Colors.BEIGE_LIGHTER_60, Resources.CardStyling_ColorPicker_BeigeLighter60);
        accessibilityColors[Colors.BEIGE_LIGHTER_80] = new AccessibilityColor(Colors.BEIGE_LIGHTER_80, Resources.CardStyling_ColorPicker_BeigeLighter80);

        accessibilityColors[Colors.LIGHT_RED] = new AccessibilityColor(Colors.LIGHT_RED, Resources.CardStyling_ColorPicker_Red);
        accessibilityColors[Colors.RED_LIGHTER_20] = new AccessibilityColor(Colors.RED_LIGHTER_20, Resources.CardStyling_ColorPicker_RedLighter20);
        accessibilityColors[Colors.RED_LIGHTER_40] = new AccessibilityColor(Colors.RED_LIGHTER_40, Resources.CardStyling_ColorPicker_RedLighter40);
        accessibilityColors[Colors.RED_LIGHTER_60] = new AccessibilityColor(Colors.RED_LIGHTER_60, Resources.CardStyling_ColorPicker_RedLighter60);
        accessibilityColors[Colors.RED_LIGHTER_80] = new AccessibilityColor(Colors.RED_LIGHTER_80, Resources.CardStyling_ColorPicker_RedLighter80);

        return accessibilityColors;
    }
}