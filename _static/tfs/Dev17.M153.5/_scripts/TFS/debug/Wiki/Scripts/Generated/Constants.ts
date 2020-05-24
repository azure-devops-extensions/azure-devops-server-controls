
//----------------------------------------------------------
// Generated file, DO NOT EDIT.
// To regenerate this file, run "GenerateConstants.cmd" .

// Generated data for the following assemblies:
// Microsoft.TeamFoundation.Wiki.Server
//----------------------------------------------------------


export module PathConstants {
    // " and \ are manually escaped since the constants generation does not support escaping.
    // Manually convert GitIllegalSpecialChars to regex form, since typscript replace expects regex.
    export var ResourceNameInvalidCharacters = ["/", "\\"];
    export var PageNameReservedCharacters = ["#"];
    export var GitIllegalSpecialChars = [/\:/g, /\?/g, /\*/g, /\</g, /\>/g, /\-/g, /\|/g, /\"/g];
    export var GitIllegalSpecialCharEcapes = ["%3A", "%3F", "%2A", "%3C", "%3E", "%2D", "%7C", "%22"];
    export var AttachmentNameReservedCharacters = ["#"];
    export var ReservedFolders = ["/.attachments"];
    export var AllowedAttachmentFileTypes = [".CS", ".CSV", ".DOC", ".DOCX", ".GIF", ".GZ", ".HTM", ".HTML", ".ICO", ".JPEG", ".JPG", ".JSON", ".LYR", ".MD", ".MOV", ".MP4", ".MPP", ".MSG", ".PDF", ".PNG", ".PPT", ".PPTX", ".PS1", ".RAR", ".RDP", ".SQL", ".TXT", ".VSD", ".VSDX", ".XLS", ".XLSX", ".XML", ".ZIP"];
    export var MaximumPagePathLength = 235;
}

export module SpecialCharEncodings {
    export var Ampersand = "%26";
    export var Caret = "%5E";
    export var Colon = "%3A";
    export var Greaterthan = "%3E";
    export var Hash = "%23";
    export var Hyphen = "%2D";
    export var Lessthan = "%3C";
    export var Percent = "%25";
    export var Pipe = "%7C";
    export var Question = "%3F";
    export var Quote = "%22";
    export var Slash = "%2F";
    export var SingleQuote = "%27";
    export var Space = "%20";
    export var Star = "%2A";
    export var Tilde = "%7E";
}

export module SpecialChars {
    export var Ampersand = "&";
    export var Caret = "^";
    export var Colon = ":";
    export var Greaterthan = ">";
    export var Hash = "#";
    export var Hyphen = "-";
    export var Lessthan = "<";
    export var Percent = "%";
    export var Pipe = "|";
    export var Question = "?";
    export var Quote = "\"";
    export var Slash = "/";
    export var Space = " ";
    export var Star = "*";
    export var Tilde = "~";
}

export module UrlConstants {
    export var WikiHubRoot = "_wiki";
    export var WikisSubArea = "wikis";
    export var PagePathParam = "pagePath";
    export var IsSubPageParam = "isSubPage";
    export var WikiIdentifierParam = "wikiIdentifier";
    export var WikiVersionParam = "wikiVersion";
    export var ActionParam = "action";
    export var LatestPagePathParam = "latestPagePath";
    export var AnchorParam = "anchor";
    export var IsPrintParam = "isPrint";
    export var VersionParam = "version";
    export var ViewParam = "view";
    export var TemplateParam = "template";
    export var TrackingData = "tracking_data";
}

export module DraftVersionsConstants {
    export var DraftVersionsSettingsServiceKey = "wikiDraftVersions.";
}
