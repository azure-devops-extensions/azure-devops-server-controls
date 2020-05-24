import * as React from "react";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { Link } from "OfficeFabric/Link";
import { TooltipHost } from "VSSUI/Tooltip";
import { getId } from 'OfficeFabric/Utilities';
import * as UserClaimsService from "VSS/User/Services";

import * as Locations from "VSS/Locations";
import { CommonState } from "Wiki/Scenarios/Shared/Stores/CommonStore";
import { VersionControlConstants } from "Wiki/Scripts/CommonConstants";
import { bowtieIcon } from "Wiki/Scripts/Helpers";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import { isCodeHubEnabled } from "Wiki/Scripts/WikiFeatures";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Shared/Components/ZeroDataComponent";

export enum WikiState {
    NotCreated,
    Creating,
    Complete
}

export interface ZeroDataProps {
    onCreateWiki?: () => void;
    onPublishWiki?: () => void;
}

export interface ZeroDataState {
    wikiCreationState: WikiState;
}

export class ZeroDataComponent extends React.Component<ZeroDataProps, ZeroDataState> {
    private _publishCodeAsWikiHelpTooltipId: string;

    constructor(props: ZeroDataProps, context?: any) {
        super(props, context);

        this.state = { wikiCreationState: WikiState.NotCreated };
        this._publishCodeAsWikiHelpTooltipId = getId("publish-code-as-wiki-tooltip");
    }

    public render(): JSX.Element {
        return (
            <div className="zero-data">
                <div>
                    <img src={Locations.urlHelper.getVersionedContentUrl("Wiki/zero-data-wiki.svg")} alt="" />
                </div>
                <div className="primary ms-font-xxl">
                    <span>{WikiResources.ZeroDataPrimaryText}</span>
                </div>
                <div className="secondary ms-font-m">
                    <span>{WikiResources.ZeroDataSecondaryText}</span>
                </div>
                <div className="create-wiki-buttons-container">
                    {this.props.onCreateWiki && this.state.wikiCreationState !== WikiState.Complete && 
                        <PrimaryButton
                            className={"create-wiki-action"}
                            autoFocus={true}
                            disabled={this.state.wikiCreationState !== WikiState.NotCreated}
                            onClick={() => {
                                if (this.props.onCreateWiki) {
                                    this.props.onCreateWiki();
                                }
                            }}>
                            {this._getCTAText()}
                        </PrimaryButton>
                    }
                    {this.props.onPublishWiki && isCodeHubEnabled() &&
                        <div>
                            <DefaultButton
                                className={"publish-code-repository"}
                                onClick={this.props.onPublishWiki}>
                                {WikiResources.PublishCodeAsWiki}
                            </DefaultButton>
                            <TooltipHost
                                id={this._publishCodeAsWikiHelpTooltipId}
                                content={WikiResources.PublishCodeRepositoryHelpText}
                                directionalHint={DirectionalHint.bottomCenter}>
                                <Link className="help-icon-container"
                                    aria-describedby={this._publishCodeAsWikiHelpTooltipId}
                                    aria-label={WikiResources.HelpIconAriaLabel}
                                    href={WikiResources.LearnMoreLink_ProductDocumentationBlog}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <span className="bowtie-icon bowtie-status-help-outline" />
                                </Link>
                            </TooltipHost>
                        </div>
                    }
                </div>
            </div>
        );
    }

    private _getCTAText(): string {
        if (this.state.wikiCreationState === WikiState.NotCreated) {
            return WikiResources.CreateWikiCTAText;
        } else {
            return WikiResources.CreatingWikiCTAText;
        }
    }
}

const NoWikiPermissionsInternal = (onSecurityDialogOpened: () => void): JSX.Element => {
    return (<div className="zero-data">
        <div>
            <img src={Locations.urlHelper.getVersionedContentUrl("Wiki/zero-data-wiki.svg")} alt="" role="presentation" />
        </div>
        <div className="primary ms-font-xxl">
            <span>{WikiResources.NoPermissionsPrimaryText}</span>
        </div>
        <div className="secondary ms-font-m">
            <span>{WikiResources.NoPermissionsSecondaryText}</span>
        </div>
        {
            onSecurityDialogOpened &&
            <PrimaryButton
                className={"wiki-security-button"}
                onClick={() => onSecurityDialogOpened()}
                iconProps={bowtieIcon("bowtie-security")}>
                {WikiResources.WikiSecurityCommand}
            </PrimaryButton>
        }
        <Link
            className="help-icon-anchor"
            href={WikiResources.NoPermissionsLearnMoreLink}
            target="_blank"
            rel="noopener noreferrer"
        >
            {WikiResources.NoPermissionsLearnMore}
        </Link>
    </div>);
}

export interface PermissionsComponentProps {
    commonState: CommonState;
    onSecurityDialogOpened?: () => void,
}

export interface NoWikiPermissionsProps {
    onSecurityDialogOpened ?: () => void; // if provided, SecurityDialog will be shown to Member users
}
export const NoWikiPermissions = (props: NoWikiPermissionsProps): JSX.Element => {
    let showManageSecurityCTA = false;
    if (props.onSecurityDialogOpened) {
        showManageSecurityCTA = UserClaimsService.getService().hasClaim(UserClaimsService.UserClaims.Member);
    }

    return NoWikiPermissionsInternal(showManageSecurityCTA ? props.onSecurityDialogOpened : undefined);
}