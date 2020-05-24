import * as React from "react";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as Utils_String from "VSS/Utils/String";
import { TextWithAnchors, IAnchor } from "VersionControl/Scenarios/NewGettingStarted/Components/TextWithAnchors";

export interface ProtipAndPluginTextProps {
    isWindowsPlatform: boolean;
    onDownloadGitForWindowsClick(): void;
}

export class ProtipAndPluginsTextSection extends React.Component<ProtipAndPluginTextProps, {}> {

    public render(): JSX.Element {

        const anchors: IAnchor[] = [];
        const gitForWindowsAnchor: IAnchor = {
            text: VCResources.GettingStarted_GitForWindowsDownloadText,
            onAnchorClick: this.props.onDownloadGitForWindowsClick,
            link: VCResources.GitToolsForWindowsLink
        }
        const intellijAnchor: IAnchor = {
            text: VCResources.GettingStarted_IntelliJText,
            link: VCResources.EmptyGitRepoGetStartedIntellJLink
        } 
        const eclipseAnchor: IAnchor = {
            text: VCResources.EclipseName,
            link: VCResources.EmptyGitRepoGetStartedNewEclipseLink
        } 
        const androidStudioAnchor: IAnchor = {
            text: VCResources.AndroidStudioName,
            link: VCResources.EmptyGitRepoGetStartedAndroidStudioLink
        }   
        let commandLineAnchor: IAnchor = {
            text: VCResources.WindowsName,
            link: VCResources.EmptyGitRepoGetStartedWindowsLink
        }

        if (!this.props.isWindowsPlatform) {
            commandLineAnchor = {
                text: VCResources.AppleName,
                link: VCResources.EmptyGitRepoGetStartedAppleLink
            }
        }

        anchors.push(gitForWindowsAnchor, intellijAnchor, eclipseAnchor, androidStudioAnchor, commandLineAnchor);

        return (
            <div className="protip-section">
                <span className="bowtie-icon bowtie-status-info-outline"/>
                <TextWithAnchors
                    templatizedText={VCResources.GettingStarted_ProTipText}
                    anchors={anchors}
                    className="protip-text"
                    />
            </div>
        );
    }
}

