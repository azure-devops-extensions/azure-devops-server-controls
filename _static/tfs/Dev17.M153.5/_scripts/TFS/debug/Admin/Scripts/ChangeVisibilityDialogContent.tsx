import "VSS/LoaderPlugins/Css!Admin/Scripts/ChangeVisibilityDialogContent";

import * as React from "react";
import * as ReactDOM from "react-dom";

import { IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
import { Fabric } from "OfficeFabric/Fabric";
import { Link } from "OfficeFabric/Link";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import { LocationService } from "VSS/Navigation/Location";
import * as VSSResourcesPlatform from "VSS/Resources/VSS.Resources.Platform";
import { getLocalService } from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";
import { DirectionalHint, TooltipHost } from "VSSUI/Tooltip";

import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";
import { RadioInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/RadioInputComponent";
import { FormattedMessage, IFormattedMessageLink } from "Presentation/Scripts/TFS/Components/FormattedMessage";
import { ProjectVisibilityConstants } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

export interface ChangeVisibilityDialogContentProps {
    initialVisibility: string;
    showOrgVisibilityOption: boolean;
    showPublicVisibilityOption: boolean;
    setChangeButtonEnabled(enabled: boolean): void;
    isPublicVisibilityOptionEnabled: boolean;
    isOrgVisibilityOptionEnabled: boolean;
    onOptionChange(updatedVisibility: string): void;
}

export interface ChangeVisibilityDialogContentState {
    currentlySelectedVisibility: string;
}

/**
 * Renders the change visibility dialog content in the provided element.
 * 
 * Ported to new web platform at Tfs\Web\extensions\tfs\vss-admin-web\views\Admin\ProjectOverview\ChangeVisibilityDialog.tsx
 */
export function createChangeVisibilityDialogContentIn(element: HTMLElement, props: ChangeVisibilityDialogContentProps): void {
    ReactDOM.render(
        <Fabric>
            <ChangeVisibilityDialogContent {...props} />
        </Fabric>,
        element);
}

export class ChangeVisibilityDialogContent extends React.Component<ChangeVisibilityDialogContentProps, ChangeVisibilityDialogContentState>  {
    constructor(props: ChangeVisibilityDialogContentProps) {
        super(props);
        this.state = {
            currentlySelectedVisibility: this._getInitialVisibility(),
        };
    }

    public render(): JSX.Element {
        const isVisibilityOptionChanged = this.state.currentlySelectedVisibility !== this.props.initialVisibility;
        this.props.setChangeButtonEnabled(isVisibilityOptionChanged);

        return (
            <div className={"change-visibility-dialog-content"}>
                <div className={"select-visibility-title"}>{AdminResources.ChangeProjectVisibilityDialog_SelectProjectVisibilityTitle}</div>
                <RadioInputComponent
                    noCustomFabricOverrides={true}
                    options={this._getVisibilityOptions()}
                    onValueChanged={this._onOptionChange}
                />
                {this._getVisibilityOptionContent(this.state.currentlySelectedVisibility)}
            </div>
        );
    }

    private _getInitialVisibility(): string {
        if (this._isVisibilityOptionDisabled(this.props.initialVisibility)) {
            this.props.onOptionChange(ProjectVisibilityConstants.TeamMembers);
            return ProjectVisibilityConstants.TeamMembers;
        }

        return this.props.initialVisibility;
    }

    private _onOptionChange = (newOption: IChoiceGroupOption): void => {
        const visibility = newOption.key;
        this.props.onOptionChange(visibility);
        this.setState({
            currentlySelectedVisibility: visibility,
        });
    }

    private _getVisibilityOptions(): IChoiceGroupOption[] {
        // Build the list of visibility options based on availability
        const visibilityOptions: IChoiceGroupOption[] = [];
        const availableVisibilityOptions: string[] = [];
        if (this.props.showPublicVisibilityOption) {
            availableVisibilityOptions.push(ProjectVisibilityConstants.Everyone);
        }

        if (this.props.showOrgVisibilityOption) {
            availableVisibilityOptions.push(ProjectVisibilityConstants.EveryoneInTenant);
        }

        availableVisibilityOptions.push(ProjectVisibilityConstants.TeamMembers);
        availableVisibilityOptions.forEach((visibility) => {
            visibilityOptions.push(this._getVisibilityOptionObject(
                visibility,
                this._getVisibilityTitle(visibility),
                this._isVisibilityOptionDisabled(visibility),
                this._getIconClass(visibility))
            );
        });

        return visibilityOptions;
    }

    private _isVisibilityOptionDisabled(visibility: string): boolean {
        switch (visibility) {
            case ProjectVisibilityConstants.EveryoneInTenant:
                return !this.props.isOrgVisibilityOptionEnabled;
            case ProjectVisibilityConstants.Everyone:
                return !this.props.isPublicVisibilityOptionEnabled;
            default:
                return false;
        };
    }

    private _getVisibilityTitle(visibility: string): string {
        switch (visibility) {
            case ProjectVisibilityConstants.TeamMembers:
                return AdminResources.ChangeProjectVisibilityDialog_PrivateVisibilityTitle;
            case ProjectVisibilityConstants.EveryoneInTenant:
                return AdminResources.ChangeProjectVisibilityDialog_OrganizationVisibilityTitle;
            case ProjectVisibilityConstants.Everyone:
                return AdminResources.ChangeProjectVisibilityDialog_PublicVisibilityTitle;
            default:
                throw new Error(Utils_String.format(AdminResources.ChangeProjectVisibilityDialog_VisibilityValueInvalid, visibility));
        };
    }

    private _getIconClass(visibility: string): string {
        switch (visibility) {
            case ProjectVisibilityConstants.TeamMembers:
                return "Lock";
            case ProjectVisibilityConstants.EveryoneInTenant:
                return "CityNext";
            case ProjectVisibilityConstants.Everyone:
                return "Globe";
            default:
                throw new Error(Utils_String.format(AdminResources.ChangeProjectVisibilityDialog_VisibilityValueInvalid, visibility));
        };
    }

    private _getVisibilityOptionObject(key: string, text: string, disabled: boolean, iconName: string): IChoiceGroupOption {
        const imageSize: number = 64;
        return {
            key: key,
            text: text,
            disabled: disabled,
            iconProps: {
                className: "visibility-icon",
                iconName: iconName,
            },
            onRenderField: this._renderChoiceBox,
            checked: key === this.state.currentlySelectedVisibility,
            imageSize: {
                width: imageSize,
                height: imageSize,
            },
        };
    }

    private _renderChoiceBox = (props: IChoiceGroupOption, render: (props: IChoiceGroupOption) => JSX.Element): JSX.Element => {
        return (
            props.disabled
                ? <TooltipHost
                    content={AdminResources.ChangeProjectVisibilityDialog_DisabledOptionTooltip}
                    directionalHint={DirectionalHint.bottomLeftEdge}>
                    {render(props)}
                </TooltipHost>
                : render(props)
        );
    }

    private _getVisibilityOptionContent(visibility: string): JSX.Element {
        switch (visibility) {
            case ProjectVisibilityConstants.TeamMembers:
                return <PrivateVisibilityOptionContent />;
            case ProjectVisibilityConstants.EveryoneInTenant:
                return <OrganizationVisibilityOptionContent />;
            case ProjectVisibilityConstants.Everyone:
                return <PublicVisibilityOptionContent />;
            default:
                throw new Error(Utils_String.format(AdminResources.ChangeProjectVisibilityDialog_VisibilityValueInvalid, visibility));
        };
    }
}

interface VisibilityOptionContentProps {
    description: string | JSX.Element;
    showCodeOfConductStatement: boolean;
    messageBarText?: string;
    messageBarType?: MessageBarType;
    bulletPoints?: string[];
    learnMoreLink?: string;
    learnMoreLinkText?: string;
}

const VisibilityOptionContent = (props: VisibilityOptionContentProps): JSX.Element => {
    let links: IFormattedMessageLink[];
    if (props.showCodeOfConductStatement) {
        links = [
            {
                text: VSSResourcesPlatform.BrandWithProductName,
            },
            {
                text: AdminResources.ChangeProjectVisibilityDialog_CodeOfConductText,
                href: AdminResources.ChangeProjectVisibilityDialog_VstsCodeOfConductLink,
                target: "_blank",
                rel: "noopener noreferrer",
                action: (event: React.MouseEvent<HTMLAnchorElement>) => {
                    event.stopPropagation();
                    event.preventDefault();
                    const newWindow = window.open(AdminResources.ChangeProjectVisibilityDialog_VstsCodeOfConductLink, "_blank");
                    if (newWindow && newWindow.opener) {
                        newWindow.opener = null;
                    }
                },
            },
        ];
    }

    return (
        <div className={"visibility-option-content"}>
            {
                props.messageBarText &&
                <MessageBar className={"message-bar"} messageBarType={props.messageBarType == null ? MessageBarType.warning : props.messageBarType}>
                    {props.messageBarText}
                </MessageBar>
            }
            <div className={"description"}>{props.description}</div>
            {
                props.bulletPoints &&
                <ul className="bullet-points">
                    {props.bulletPoints.map((bulletPoint: string, index: number): JSX.Element => (<li key={index}>{bulletPoint}</li>))}
                </ul>
            }
            {
                props.learnMoreLink &&
                <Link className={"learn-more-link"} href={props.learnMoreLink} target={"_blank"} rel={"noopener noreferrer"}>
                    {props.learnMoreLinkText || AdminResources.LearnMore}
                </Link>
            }
            {
                props.showCodeOfConductStatement &&
                <div className={"code-of-conduct"}>
                    <FormattedMessage
                        message={AdminResources.ChangeProjectVisibilityDialog_CodeOfConductStatement}
                        links={links} />
                </div>
            }
        </div>
    );
}

const PublicVisibilityOptionContent = (): JSX.Element => {
    const bulletPoints: string[] = [
        AdminResources.ChangeProjectVisibilityDialog_PublicVisibilityBulletPoint1,
        AdminResources.ChangeProjectVisibilityDialog_PublicVisibilityBulletPoint2,
        AdminResources.ChangeProjectVisibilityDialog_PublicVisibilityBulletPoint3,
        AdminResources.ChangeProjectVisibilityDialog_PublicVisibilityBulletPoint4,
        AdminResources.ChangeProjectVisibilityDialog_PublicVisibilityBulletPoint5,
    ];

    return (
        <VisibilityOptionContent
            messageBarText={AdminResources.ChangeProjectVisibilityDialog_PublicVisibilityWarning}
            messageBarType={MessageBarType.severeWarning}
            description={AdminResources.ChangeProjectVisibilityDialog_PublicVisibilityDescription}
            bulletPoints={bulletPoints}
            showCodeOfConductStatement={true}
            learnMoreLink={AdminResources.ChangeProjectVisibilityDialog_PublicVisibilityLearnMoreLink}
            learnMoreLinkText={AdminResources.ChangeProjectVisibilityDialog_PublicVisibilityLearnMoreLinkText}
        />
    );
}

const OrganizationVisibilityOptionContent = (): JSX.Element => {
    const locationService = getLocalService(LocationService);
    const organizationUsersLink: IFormattedMessageLink[] = [
        {
            text: AdminResources.ChangeProjectVisibilityDialog_OrganizationUsersText,
            href: locationService.routeUrl("ms.vss-admin-web.organization-admin-security-route", { _a: "members" }),
            target: "_blank",
            rel: "noopener noreferrer",
        },
    ];

    const description = <FormattedMessage
        message={AdminResources.ChangeProjectVisibilityDialog_OrganizationVisibilityDescription}
        links={organizationUsersLink}
    />;

    return (
        <VisibilityOptionContent
            messageBarText={AdminResources.ChangeProjectVisibilityDialog_OrganizationVisibilityWarning}
            description={description}
            showCodeOfConductStatement={false}
            learnMoreLink={AdminResources.ChangeProjectVisibilityDialog_OrganizationVisibilityLearnMoreLink}
        />
    );
}

const PrivateVisibilityOptionContent = (): JSX.Element => {
    return (
        <VisibilityOptionContent
            messageBarText={AdminResources.ChangeProjectVisibilityDialog_PrivateVisibilityDescription}
            messageBarType={MessageBarType.info}
            description={Utils_String.empty}
            showCodeOfConductStatement={false}
        />
    );
}
