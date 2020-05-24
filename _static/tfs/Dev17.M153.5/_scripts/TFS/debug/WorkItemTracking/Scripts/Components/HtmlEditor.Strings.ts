import { RoosterCommmandBarButtonKeys as ButtonKeys, InsertLinkStringKeys } from "RoosterReact/rooster-react-amd";
import { format } from "VSS/Utils/String";
import * as RoosterJsResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking.RoosterJs";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

export const CustomButtonKeys = {
    AtMention: "atMention",
    HashMention: "hashMention",
    PRMention: "prMention"
};

export const All = RoosterJsResources;

// RoosterJsResources can be used directly when we no longer async load this module
export const SearchForEmoji = RoosterJsResources.SearchForEmoji;

export const CommandBarLocaleStrings = {
    // built-in buttons
    [ButtonKeys.Header]: RoosterJsResources.Toolbar_Header,
    [ButtonKeys.Bold]: RoosterJsResources.Toolbar_Bold,
    [ButtonKeys.Italic]: RoosterJsResources.Toolbar_Italic,
    [ButtonKeys.Underline]: RoosterJsResources.Toolbar_Underline,
    [ButtonKeys.BulletedList]: RoosterJsResources.Toolbar_BulletedList,
    [ButtonKeys.NumberedList]: RoosterJsResources.Toolbar_NumberedList,
    [ButtonKeys.Link]: RoosterJsResources.Toolbar_Link,
    [ButtonKeys.Highlight]: RoosterJsResources.Toolbar_Highlight,
    [ButtonKeys.ClearFormat]: RoosterJsResources.Toolbar_ClearFormat,
    [ButtonKeys.Emoji]: RoosterJsResources.Toolbar_Emoji,
    [ButtonKeys.InsertImage]: RoosterJsResources.Toolbar_InsertImage,
    [ButtonKeys.Indent]: RoosterJsResources.Toolbar_Indent,
    [ButtonKeys.Outdent]: RoosterJsResources.Toolbar_Outdent,
    [ButtonKeys.Strikethrough]: RoosterJsResources.Toolbar_Strikethrough,
    [ButtonKeys.FontColor]: RoosterJsResources.Toolbar_FontColor,
    [ButtonKeys.Unlink]: RoosterJsResources.Toolbar_Unlink,
    [ButtonKeys.Code]: RoosterJsResources.Toolbar_Code,

    // insert link dialog
    [InsertLinkStringKeys.CancelButton]: WITResources.Cancel,
    [InsertLinkStringKeys.InsertButton]: WITResources.OK,
    [InsertLinkStringKeys.LinkFieldLabel]: RoosterJsResources.InsertLink_FieldLabel,
    [InsertLinkStringKeys.Title]: RoosterJsResources.Toolbar_Link,

    // headers
    header1: format(RoosterJsResources.Toolbar_HeaderN, 1),
    header2: format(RoosterJsResources.Toolbar_HeaderN, 2),
    header3: format(RoosterJsResources.Toolbar_HeaderN, 3),

    // colors
    black: RoosterJsResources.Color_Black,
    blue: RoosterJsResources.Color_Blue,
    cyan: RoosterJsResources.Color_Cyan,
    darkBlue: RoosterJsResources.Color_DarkBlue,
    darkGray: RoosterJsResources.Color_DarkGray,
    darkGreen: RoosterJsResources.Color_DarkGreen,
    darkOrange: RoosterJsResources.Color_DarkOrange,
    darkPurple: RoosterJsResources.Color_DarkPurple,
    darkRed: RoosterJsResources.Color_DarkRed,
    darkYellow: RoosterJsResources.Color_DarkYellow,
    darkerBlue: RoosterJsResources.Color_DarkerBlue,
    darkerGray: RoosterJsResources.Color_DarkerGray,
    darkerGreen: RoosterJsResources.Color_DarkerGreen,
    darkerOrange: RoosterJsResources.Color_DarkerOrange,
    darkerPurple: RoosterJsResources.Color_DarkerPurple,
    darkerRed: RoosterJsResources.Color_DarkerRed,
    darkerYellow: RoosterJsResources.Color_DarkerYellow,
    gray: RoosterJsResources.Color_Gray,
    green: RoosterJsResources.Color_Green,
    lightBlue: RoosterJsResources.Color_LightBlue,
    lightCyan: RoosterJsResources.Color_LightCyan,
    lightGray: RoosterJsResources.Color_LightGray,
    lightGreen: RoosterJsResources.Color_LightGreen,
    lightMagenta: RoosterJsResources.Color_LightMagenta,
    lightOrange: RoosterJsResources.Color_LightOrange,
    lightPurple: RoosterJsResources.Color_LightPurple,
    lightRed: RoosterJsResources.Color_LightRed,
    lightYellow: RoosterJsResources.Color_LightYellow,
    magenta: RoosterJsResources.Color_Magenta,
    orange: RoosterJsResources.Color_Orange,
    purple: RoosterJsResources.Color_Purple,
    red: RoosterJsResources.Color_Red,
    white: RoosterJsResources.Color_White,
    yellow: RoosterJsResources.Color_Yellow
};
