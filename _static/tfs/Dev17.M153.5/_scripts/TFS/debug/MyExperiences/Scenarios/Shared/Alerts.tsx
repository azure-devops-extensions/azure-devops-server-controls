import * as React from "react";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";
import * as StringUtils from "VSS/Utils/String";


/**
 * Creates alert message element with a prompt appended to the provided message
 * asking the user to refresh the page.
 * @param message to show in the alert.
 * @returns the message element.
 */
export function createReloadPromptAlertMessage(message: string): JSX.Element {
    let promptParts = MyExperiencesResources.Projects_ErrorRefreshPromptFormat.split("{0}");
    let tootipText = `${message} ${promptParts[0]}${MyExperiencesResources.Projects_ErrorRefreshLinkText}${promptParts[1]}`;
    let messageElement = (<span title={tootipText}>
            {message + " "}
            {promptParts[0]}
            <a href="." onClick={ () => window.location.reload(true) }>
                {MyExperiencesResources.Projects_ErrorRefreshLinkText}
            </a>
            {promptParts[1]}
        </span>);

    return messageElement;
}