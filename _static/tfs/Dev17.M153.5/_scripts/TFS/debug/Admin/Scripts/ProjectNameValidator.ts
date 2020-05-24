import * as Utils_String from "VSS/Utils/String";

// also implemented for the new web platform in Tfs/Web/extensions/tfs/vss-admin-web/util/ProjectNameValidator.ts
// closely related to code in Tfs/Client/Core/CssUtils.cs

export namespace ProjectNameValidator {
    // Reserved project names from CssUtil.IsValidProjectName
    const _invalidProjectNames = [
        "server",
        "bin",
        "App_code",
        "App_Browsers",
        "App_Data",
        "App_GlobalResources",
        "App_LocalResources",
        "App_Themes",
        "App_WebReferences",
        "web.config",
        "SignalR",
    ];

    const _invalidCssNodeNames = [
        "prn",
        "com1", "com2", "com3", "com4", "com5", "com6", "com7", "com8", "com9", "com10",
        "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7", "lpt8", "lpt9",
        "nul",
        "con",
        "aux", ".", "..",
    ];

    const _invalidProjectCharacters = [
        "@", "~", ";", "{", "}", "\'",
        "+", "=", ",", "<", ">", "|",
        "/", "\\", "?", ":", "&", "$",
        "*", "\"", "#", "[", "]", "&",
        "%"];

    const _maxProjectLength = 64;

    export function validate(projectName: string): boolean {
        let index = 0;
        let isValid = true;

        // Account names must be 1 or more characters and cant start with
        // . or _
        // These are requirements from CssUtil.IsValidProjectName()
        if (projectName === null ||
            projectName.length === 0 ||
            projectName.length > _maxProjectLength ||
            projectName.substring(0, 1) === "_" ||
            projectName.substring(0, 1) === "." ||
            projectName.charAt(projectName.length - 1) === ".") {
            isValid = false;
        }

        if (isValid) {
            // Check for invalid characters within the project name.
            for (index = 0; index < _invalidProjectCharacters.length; index++) {
                if (projectName.indexOf(_invalidProjectCharacters[index]) !== -1) {
                    isValid = false;
                    break;
                }
            }
        }

        const invalidNames = [..._invalidCssNodeNames, ..._invalidProjectNames];

        if (isValid) {
            // Check for invalid css node names.
            for (index = 0; index < invalidNames.length; index++) {
                if (Utils_String.ignoreCaseComparer(projectName, invalidNames[index]) === 0) {
                    isValid = false;
                    break;
                }
            }
        }

        return isValid;
    }
}
