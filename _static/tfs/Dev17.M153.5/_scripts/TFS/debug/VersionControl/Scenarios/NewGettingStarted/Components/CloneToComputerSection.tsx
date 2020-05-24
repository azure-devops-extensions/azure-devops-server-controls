import { DefaultButton } from "OfficeFabric/Button";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { KeyCodes } from "OfficeFabric/Utilities";
import * as React from "react";
import * as Utils_String from "VSS/Utils/String";
import { PivotedTextBoxWithCopy, IPivotedTextBoxPair } from "VSSPreview/Flux/Components/PivotedTextBoxWithCopy";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { SupportedIde } from "TFS/VersionControl/Contracts";
import {
    InlineGitCredentialsSection,
    InlineGitCredentialsProps,
} from "VersionControl/Scenarios/NewGettingStarted/Components/GitCredentials/InlineGitCredentialsSection";
import { ProtipAndPluginsTextSection } from "VersionControl/Scenarios/NewGettingStarted/Components/ProtipAndPluginTextSection";
import { getMenuIcon } from "VersionControl/Scenarios/Shared/DropdownButton";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/CloneToComputerSection";

export interface CloneInIdeDropdownButtonProps {
    buttonText: string;
    disabled: boolean;
    supportedIdes: SupportedIde[];
    selectedIde: SupportedIde;
    onClick(ide: SupportedIde): void;
    doNotLayer?: boolean;
}

export interface CloneToComputerProps {
    inClonePopup: boolean;
    isWindowsPlatform: boolean;
    tfsContext: TfsContext;
    isHosted: boolean;
    isUserAnonymous: boolean;
    isUserPublic: boolean;
    isSshSelected: boolean;
    showOnlyCommandLine: boolean;
    toggleButtonSelectedKey: string;
    onToggleButtonClicked(newSelectedText: string): void;
    cloneUrlPairs: IPivotedTextBoxPair[];
    supportedIdes: SupportedIde[];
    selectedIde: SupportedIde;
    onOpenInIdeClick(ide: SupportedIde): void;
    onDownloadGitForWindowsClick(): void;
    onShowSshKeyManagementClick(): void;
    inlineGitCredentialsProps: InlineGitCredentialsProps;
}

export const CloneToComputerSection = (props: CloneToComputerProps): JSX.Element => {
    const isLoading: boolean = !props.selectedIde;
    const cloneInText = isLoading ? VCResources.LoadingText : Utils_String.format(VCResources.CloneInAction, props.selectedIde.name);
    const showGenerateGitCredentialsSection = props.isHosted && !props.isSshSelected && !props.isUserAnonymous && !props.isUserPublic;
    const showOrText = !props.inClonePopup && !props.isUserAnonymous && !props.isUserPublic;
    let containerDivId = "clone-section";
    if (props.inClonePopup) {
        containerDivId += "-in-popup";
    }

    return (
        <div id={containerDivId} className="clone-to-computer-section">
            {
                props.inClonePopup && !props.showOnlyCommandLine &&
                <div className="subtitle-text"> {VCResources.ClonePopup_CommandLineTitle} </div>
            }
            <div className="multiple-toggle-credentials-keys">
                <PivotedTextBoxWithCopy
                    pairs={props.cloneUrlPairs}
                    tooltipBeforeCopied={VCResources.EmptyRepo_HttpSshCopyButtonTooltipBeforeCopied}
                    tooltipAfterCopied={VCResources.EmptyRepo_HttpSshCopyButtonTooltipAfterCopied}
                    selectedKey={props.toggleButtonSelectedKey}
                    showContentInline={props.inClonePopup ? false : true}
                    onToggle={props.onToggleButtonClicked}
                    multiLine={false} />
                {
                    showGenerateGitCredentialsSection &&
                    <InlineGitCredentialsSection {...props.inlineGitCredentialsProps} />
                }
                {
                    props.isSshSelected &&
                    <div className="manage-ssh-keys-section">
                        <span className="bowtie-icon bowtie-security-access" />
                        <a onClick={props.onShowSshKeyManagementClick}
                            href={props.tfsContext.contextData.collection.uri + "_details/security/keys"}
                            target="_blank"
                            rel="noopener noreferrer">
                            {VCResources.ManageSshKeys}
                        </a>
                        <span className="bowtie-icon bowtie-separator" />
                        <a className="git-getting-started-underlined-link"
                            target="_blank"
                            rel="noopener noreferrer"
                            href={VCResources.LearMoreAboutSshLinkHref}>
                            {VCResources.LearnMoreAboutSshLinkText}
                        </a>
                        <span className="bowtie-icon bowtie-navigate-external" />
                    </div>
                }
            </div>
            {
                showOrText &&
                <div className="or-text-container">
                    <span className="or-upper-case-text">
                        {VCResources.OrText.toLocaleUpperCase()}
                    </span>
                </div>
            }
            {!props.showOnlyCommandLine &&
                <div className="clone-in-ide-container">
                    {
                        props.inClonePopup &&
                        <div className="subtitle-text"> {VCResources.ClonePopup_IdeTitle} </div>
                    }
                    <div className="clone-in-ide-section">
                        <CloneInIdeDropdownButton
                            buttonText={cloneInText}
                            disabled={isLoading}
                            onClick={(ide) => props.onOpenInIdeClick(ide)}
                            supportedIdes={props.supportedIdes}
                            selectedIde={props.selectedIde}
                            doNotLayer={props.inClonePopup}
                        />
                    </div>
                    {
                        props.inClonePopup &&
                        <div className="horizontal-bar" />
                    }
                    <ProtipAndPluginsTextSection
                        isWindowsPlatform={props.isWindowsPlatform}
                        onDownloadGitForWindowsClick={props.onDownloadGitForWindowsClick}
                    />
                </div>
            }
        </div >
    );
}

const CloneInIdeDropdownButton = (props: CloneInIdeDropdownButtonProps): JSX.Element => {
    let items: IContextualMenuItem[] = [];
    if (props.supportedIdes) {
        items = props.supportedIdes.map(ide => {
            return {
                key: ide.name,
                name: ide.name,
                ariaLabel: ide.name,
                onClick: () => props.onClick(ide)
            } as IContextualMenuItem;
        });
    }

    return (
        <DefaultButton
            split={true}
            menuTriggerKeyCode={KeyCodes.down}
            disabled={props.disabled}
            menuProps={{
                items,
                directionalHint: DirectionalHint.bottomRightEdge,
                directionalHintFixed: true,
                doNotLayer: props.doNotLayer,
            }}
            onClick={() => props.onClick(props.selectedIde)}
            iconProps={getMenuIcon("bowtie-clone-to-desktop")}
            splitButtonAriaLabel={VCResources.CloneInYourFavoriteIDE}
        >
            {props.buttonText}
        </DefaultButton>
    );
}
