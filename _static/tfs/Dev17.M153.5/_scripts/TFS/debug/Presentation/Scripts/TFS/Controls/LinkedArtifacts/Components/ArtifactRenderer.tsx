/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { autobind, getNextElement, getPreviousElement, css } from "OfficeFabric/Utilities";
import * as Diag from "VSS/Diag";
import * as Events_Action from "VSS/Events/Action";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as TFS_OM_Identities from "Presentation/Scripts/TFS/TFS.OM.Identities";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { HubsService } from "VSS/Navigation/HubsService";
import { getLocalService } from "VSS/Service";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IArtifactData } from "VSS/Artifacts/Services";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import * as Tooltip from "VSSUI/Tooltip";

import { ActionsCreator } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Flux/ActionsCreator";
import { IDisplayOptions } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Interfaces";
import {
    IInternalLinkedArtifactDisplayData, IInternalLinkedArtifactPrimaryData,
    IColumn, InternalKnownColumns, IHostArtifact, IEvent
} from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import {
    ILinkedArtifactAdditionalData, ILinkedArtifactId, ArtifactIconType, IArtifactIcon,
    IArtifactIconDescriptor, IArtifactStyledText
} from "TFS/WorkItemTracking/ExtensionContracts";
import { ErrorUtils, ComponentUtils } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Components/ComponentUtils";
import { KeyCode } from "VSS/Utils/UI";

import * as PresentationResource from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

export namespace ArtifactIcon {
    export interface IArtifactIconProps {
        icon: IArtifactIcon;
    }

    export const Component: React.StatelessComponent<IArtifactIconProps> = (props: IArtifactIconProps): JSX.Element => {
        const artifactIcon = props.icon;

        if (artifactIcon && artifactIcon.descriptor) {
            switch (artifactIcon.type) {
                case ArtifactIconType.colorBar: {
                    return (
                        <Tooltip.TooltipHost content={artifactIcon.title}>
                            <span className="la-color-bar" style={{ backgroundColor: artifactIcon.descriptor as string }}></span>
                        </Tooltip.TooltipHost>
                    );
                }
                case ArtifactIconType.colorCircle: {
                    return (
                        <Tooltip.TooltipHost content={artifactIcon.title}>
                            <span className="la-color-circle" style={{ backgroundColor: artifactIcon.descriptor as string, borderColor: artifactIcon.descriptor as string }}></span>
                        </Tooltip.TooltipHost>
                    );
                }
                case ArtifactIconType.icon: {
                    let iconContent: JSX.Element = null;
                    if (typeof artifactIcon.descriptor === "string") {
                        iconContent = <span className={`bowtie-icon ${artifactIcon.descriptor as string}`}></span>;
                    }
                    else {
                        const iconDescriptor = artifactIcon.descriptor as IArtifactIconDescriptor;
                        if (iconDescriptor) {
                            iconContent = <span className={`bowtie-icon ${iconDescriptor.icon}`} style={{ color: iconDescriptor.color }}></span>;
                        }
                    }
                    return <Tooltip.TooltipHost content={artifactIcon.title}>{iconContent}</Tooltip.TooltipHost>;
                }
                default: Diag.Debug.fail("Unsupported artifact state icon type");
            }
        }

        // Without icon and descriptor just return empty element
        return <span></span>;
    };

    /**
     * This component is used when an artifact is rendered in the legacy VSSF grid control. Since it's not REACT
     * based, we cannot use React components for performance reasons.
     */
    export const GridComponent = (props: IArtifactIconProps): HTMLElement => {
        const artifactIcon = props.icon;

        const element = document.createElement("span");

        if (artifactIcon && artifactIcon.descriptor) {

            switch (artifactIcon.type) {
                case ArtifactIconType.colorBar: {
                    element.className = "la-color-bar";
                    element.style.backgroundColor = artifactIcon.descriptor as string;
                    break;
                }

                case ArtifactIconType.colorCircle: {
                    element.className = "la-color-circle";
                    element.style.backgroundColor = artifactIcon.descriptor as string;
                    element.style.borderColor = artifactIcon.descriptor as string;
                    break;
                }
                case ArtifactIconType.icon: {
                    if (typeof artifactIcon.descriptor === "string") {
                        element.className = `bowtie-icon ${artifactIcon.descriptor as string}`;
                    } else {
                        const iconDescriptor = artifactIcon.descriptor as IArtifactIconDescriptor;
                        if (iconDescriptor) {
                            element.className = `bowtie-icon ${iconDescriptor.icon}`;
                            element.style.color = iconDescriptor.color;
                        }
                    }
                    break;
                }

                default: Diag.Debug.fail("Unsupported artifact state icon type");
            }
        }

        return element;
    };
}

export namespace ArtifactStyledText {
    export interface IArtifactStyledTextProps {
        styledText: IArtifactStyledText;
    }

    export const Component: React.StatelessComponent<IArtifactStyledTextProps> = (props: IArtifactStyledTextProps): JSX.Element => {
        const artifactStyledText = props.styledText;

        if (artifactStyledText && artifactStyledText.text) {
            const defaultTextClassName = "la-text";
            const textClassName = artifactStyledText.className ? `${defaultTextClassName} ${artifactStyledText.className}` : defaultTextClassName;
            return <span className={textClassName} style={{ backgroundColor: artifactStyledText.className }}>{artifactStyledText.text}</span>;
        }

        return <span></span>;
    };

    /**
     * This component is used when an artifact is rendered in the legacy VSSF grid control. Since it's not REACT
     * based, we cannot use React components for performance reasons.
     */
    export const GridComponent = (props: IArtifactStyledTextProps): HTMLElement => {
        const artifactStyledText = props.styledText;

        const element = document.createElement("span");
        element.className = "la-text" + (artifactStyledText.className ? " " + artifactStyledText.className : "");
        element.innerText = artifactStyledText.text;

        return element;
    };
}

export interface IGroupRowProps {
    groupName: string;
    count: number;
}

export interface ISubGroupRowProps {
    subGroupName: string;
}

export namespace ArtifactGroup {
    export const Component: React.StatelessComponent<IGroupRowProps> = (props: IGroupRowProps): JSX.Element => {
        let text = props.groupName;
        if (props.count > 1) {
            text = `${text}\u00A0(${props.count})`;
        }

        return <div className="la-group-title">{text}</div>;
    };

    export const GridComponent = (props: IGroupRowProps): Element => {
        const wrapper = document.createElement("span");
        wrapper.className = "la-group-title";

        let text = props.groupName;
        if (props.count > 1) {
            text = `${text}\u00A0(${props.count})`;
        }

        $(wrapper).text(text);

        return wrapper;
    };
}

export namespace ArtifactSubGroup {
    export const GridComponent = (props: ISubGroupRowProps): Element => {
        const wrapper = document.createElement("span");
        const icon = document.createElement("span");
        icon.className = "bowtie-icon bowtie-azure-api-management";
        const text = document.createElement("span");
        text.className = "la-group-sub-title";
        $(text).text(props.subGroupName);
        wrapper.appendChild(icon);
        wrapper.appendChild(text);
        return wrapper;
    };
}

export interface IPrimaryArtifactProps {
    primaryData: IInternalLinkedArtifactPrimaryData;
    hostArtifact?: IArtifactData;
    className?: string;
}

export namespace PrimaryArtifact {
    const BUTTON_MIDDLE_MOUSE = 1;
    const WHICH_MIDDLE_MOUSE = 2;


    export function openArtifact(primaryData: IInternalLinkedArtifactPrimaryData, hostArtifact: IHostArtifact, e: IEvent) {
        const modifierKeyPressed = e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.which === WHICH_MIDDLE_MOUSE || e.button === BUTTON_MIDDLE_MOUSE;

        // If modifier key is pressed, let the browser handle the link
        if (modifierKeyPressed) {
            return;
        }

        let performDefault = true;
        if (primaryData.callback) {
            // NOTE: At this moment callback returns 'true' to prevent default
            // If you change the meaning to be 'false' to prevent default
            // Then make sure to update all data providers to return the correct value and test all link types
            if (primaryData.callback(primaryData.miscData, hostArtifact, e)) {
                // Callback has handled the action, prevent default
                performDefault = false;
                e.preventDefault();
            }
        }

        // We don't want to have links navigate the current tab
        if (performDefault) {
            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                url: primaryData.href,
                target: "_blank"
            });
            e.preventDefault();
        }
    }

    function getIdentity(primaryData: IInternalLinkedArtifactPrimaryData): IdentityRef {
        if (!primaryData || !primaryData.user) {
            return null;
        }

        return {
            id: primaryData.user.id,
            displayName: primaryData.user.displayName,
            uniqueName: primaryData.user.uniqueName,
            _links: { "avatar": { "href": getIdentityImageUrl(primaryData) } }
        } as IdentityRef;
    }

    function getIdentityImageUrl(primaryData: IInternalLinkedArtifactPrimaryData): string {
        const user = primaryData && primaryData.user;

        if (user && user.imageUrl) {
            return user.imageUrl;
        } else if (user && user.email) {
            return TfsContext.getDefault().getIdentityImageUrl(
                null,
                { email: primaryData.user.email, defaultGravatar: "mm" });
        } else {
            return TFS_OM_Identities.IdentityHelper.getIdentityImageUrl(
                user as IdentityRef,
                TFS_OM_Identities.IdentityImageMode.ShowGenericImage,
                TFS_OM_Identities.IdentityImageSize.Small);
        }
    }

    function getTitleAndText(displayId: string | ILinkedArtifactId): { title: string, text: string } {
        let text: string;
        let title: string;

        if (typeof displayId === "string") {
            text = title = displayId;
        } else if ((displayId as ILinkedArtifactId).text) {
            text = displayId.text;
            title = displayId.title;
        }

        return {
            text: text,
            title: title
        };
    }

    export const Component: React.StatelessComponent<IPrimaryArtifactProps> = (props: IPrimaryArtifactProps): JSX.Element => {
        const getIdentityImage = (): JSX.Element => {
            const identity = getIdentity(props.primaryData);
            if (!identity) {
                return null;
            }

            const imageUrl = identity._links.avatar.href;
            let image: JSX.Element = null;

            const identityText: string = TFS_OM_Identities.IdentityHelper.getUniquefiedIdentityName(identity);
            if (imageUrl) {
                image = <img alt={identityText} src={imageUrl} />;
            }

            return (
                <Tooltip.TooltipHost content={identityText}>
                    <div className="la-user-icon">
                        {image}
                    </div>
                </Tooltip.TooltipHost>
            );
        };

        let id: JSX.Element = null;
        if (props.primaryData.displayId && props.primaryData.href && props.primaryData.href !== "#") {
            const t = getTitleAndText(props.primaryData.displayId);

            id = (
                <div className="la-primary-data-id">
                    {t.text}&nbsp;
                </div>
            );
        }

        let primaryDataTitle: JSX.Element = null;

        // If no URL / not a valid URL, create a 'span', not an 'a'
        if (props.primaryData.href && props.primaryData.href !== "#") {
            primaryDataTitle = (
                <a href={props.primaryData.href} onClick={openArtifact.bind(null, props.primaryData, props.hostArtifact)}>
                    {props.primaryData.title}
                </a>
            );
        } else {
            primaryDataTitle = <span>{props.primaryData.title}</span>;
        }

        const additionalPrefixIcon = props.primaryData && props.primaryData.additionalPrefixIcon;
        return (
            <div className="la-primary-data">
                { additionalPrefixIcon &&
                    <div className="la-primary-icon">
                        <ArtifactIcon.Component icon={additionalPrefixIcon} />
                    </div>
                }
                <div className="la-primary-icon">
                    <ArtifactIcon.Component icon={props.primaryData.typeIcon} />
                </div>
                {getIdentityImage()}
                {id}
                <Tooltip.TooltipHost content={props.primaryData.title} overflowMode={Tooltip.TooltipOverflowMode.Parent}>
                    {primaryDataTitle}
                </Tooltip.TooltipHost>
            </div>
        );
    };

    /**
     * This component is used when an artifact is rendered in the legacy VSSF grid control. Since it's not REACT
     * based, we cannot use React components for performance reasons.
     */
    export function GridComponent(props: IPrimaryArtifactProps): Element {
        const wrapper = document.createElement("div");
        wrapper.className = css("la-primary-data", props.className);

        // Additional Icon
        if (props.primaryData && props.primaryData.additionalPrefixIcon) {
            const additionalIconWrapper = document.createElement("div");
            additionalIconWrapper.className = "la-primary-icon";
            additionalIconWrapper.appendChild(ArtifactIcon.GridComponent({
                icon: props.primaryData.additionalPrefixIcon
            }));
            wrapper.appendChild(additionalIconWrapper);
        }

        // Icon
        const iconWrapper = document.createElement("div");
        iconWrapper.className = "la-primary-icon";
        iconWrapper.appendChild(ArtifactIcon.GridComponent({
            icon: props.primaryData.typeIcon
        }));
        wrapper.appendChild(iconWrapper);

        // Identity
        const identity = getIdentity(props.primaryData);
        if (identity) {
            const imageUrl = identity._links.avatar.href;
            if (imageUrl) {
                const image = document.createElement("img");
                const uniqueName = TFS_OM_Identities.IdentityHelper.getUniquefiedIdentityName(identity);
                image.src = imageUrl;
                image.alt = uniqueName;

                const imageWrapper = document.createElement("div");
                imageWrapper.className = "la-user-icon";
                imageWrapper.appendChild(image);
                wrapper.appendChild(imageWrapper);

                // Add tooltip for user avatar
                RichContentTooltip.add(uniqueName, imageWrapper);

            }
        }

        // ID
        if (props.primaryData.displayId && props.primaryData.href !== "#") {
            const t = getTitleAndText(props.primaryData.displayId);

            const idWrapper = document.createElement("div");
            idWrapper.className = "la-primary-data-id";
            $(idWrapper).text(t.text);
            wrapper.appendChild(idWrapper);

            wrapper.appendChild(document.createTextNode("\u00a0"));
        }

        let action = null;
        if (props.primaryData.href && props.primaryData.href !== "#") {
            // Action/Title
            action = document.createElement("a");
            action.href = props.primaryData.href;
            action.onclick = openArtifact.bind(null, props.primaryData, props.hostArtifact);
            // Should not use tab to navigate within a grid
            action.tabIndex = -1;
        } else {
            action = document.createElement("span");
        }

        $(action).text(props.primaryData.title);
        wrapper.appendChild(action);

        return wrapper;
    }
}

export interface IAdditionalProps {
    data: ILinkedArtifactAdditionalData;
}

export namespace AdditionalArtifact {
    export const Component: React.StatelessComponent<IAdditionalProps> = (props: IAdditionalProps): JSX.Element => {
        let icon: JSX.Element;
        if (props.data.icon) {
            icon = <ArtifactIcon.Component icon={props.data.icon} />;
        }

        let styledText: JSX.Element = null;
        if (props.data.styledText) {
            styledText = <ArtifactStyledText.Component styledText={props.data.styledText} />;
        }

        const overflowMode = Utils_String.equals(props.data.title, props.data.styledText.text) ? Tooltip.TooltipOverflowMode.Parent : undefined;

        const content = <div className="la-additional-data-item">
            {icon}
            {styledText}
        </div>;

        if (props.data.title) {
            return <Tooltip.TooltipHost content={props.data.title} overflowMode={overflowMode}>
                {content}
            </Tooltip.TooltipHost>;
        }

        return content;
    };

    /**
     * This component is used when an artifact is rendered in the legacy VSSF grid control. Since it's not REACT
     * based, we cannot use React components for performance reasons.
     */
    export const GridComponent = (props: IAdditionalProps): HTMLElement => {
        const wrapper = document.createElement("div");
        wrapper.className = "la-additional-data-item";

        // Icon
        const icon = ArtifactIcon.GridComponent({
            icon: props.data.icon
        });
        wrapper.appendChild(icon);

        const styledTextComponent = ArtifactStyledText.GridComponent({
            styledText: props.data.styledText
        });

        wrapper.appendChild(styledTextComponent);

        // Since the Grid is legacy based, use the legacy popup instead of Tooltip.TooltipHost
        if (props.data.title && props.data.title !== props.data.styledText.text) {
            RichContentTooltip.add(props.data.title, wrapper);
        }

        return wrapper;
    };
}

export interface IArtifactDeleteButtonProps {
    onDelete: React.EventHandler<React.MouseEvent<HTMLElement>>;
}

export namespace ArtifactDeleteButton {
    export const Component: React.StatelessComponent<IArtifactDeleteButtonProps> = (props: IArtifactDeleteButtonProps): JSX.Element => {
        return (
            <button className="la-item-delete" onClick={props.onDelete} aria-label={PresentationResource.LinkedArtifacts_RemoveLink}>
                <Tooltip.TooltipHost content={PresentationResource.LinkedArtifacts_RemoveLink}>
                    <span className="bowtie-icon bowtie-edit-delete" />
                </Tooltip.TooltipHost>
            </button>
        );
    };
}

export interface IArtifactComponentProps {
    hostArtifact?: IArtifactData;

    actionsCreator: ActionsCreator;
    displayOptions: IDisplayOptions;

    linkedArtifact: IInternalLinkedArtifactDisplayData;
    columns: IColumn[];
}

export interface IArtifactComponentState {
    hasFocus: boolean;
}

export class ArtifactComponent extends React.Component<IArtifactComponentProps, IArtifactComponentState> {
    /** Reference to rendered item HTML element */
    private _itemElement: HTMLElement;

    private _previousElement: HTMLElement;

    /** Scheduled focus change when tabing */
    private _scheduledFocusChange: Utils_Core.DelayedFunction;

    constructor(props: IArtifactComponentProps) {
        super(props);

        this.state = {
            hasFocus: false
        };
    }

    public focus(): void {
        this._itemElement.focus();
    }

    public render(): JSX.Element {
        const displayedColumns = [InternalKnownColumns.LastUpdate.refName, InternalKnownColumns.State.refName];
        let additionalData = displayedColumns
            .map(columnRefName => {
                if (this.props.linkedArtifact.additionalData &&
                    this.props.linkedArtifact.additionalData[columnRefName] &&
                    this.props.columns.some(col => col.refName === columnRefName)) {
                    return this._renderAdditional(columnRefName, this.props.linkedArtifact.additionalData[columnRefName]);
                }
            }).filter(d => !!d);

        additionalData = this._intersperse(additionalData);

        // Inline delete button
        let deleteButton: JSX.Element;
        if (!this.props.displayOptions.readOnly) {
            deleteButton = <ArtifactDeleteButton.Component onDelete={this._onDelete} />;
        }

        let action: JSX.Element;
        if (this.props.linkedArtifact.action && !this.props.displayOptions.readOnly) {
            action = <ArtifactActionComponent linkedArtifact={this.props.linkedArtifact} hostArtifact={this.props.hostArtifact} />;
        }

        // If the item is focused, add an explicit class here. We cannot rely on :focus here since we need to support keyboard
        // accessibility.
        let itemClasses = "la-item";
        if (this.state.hasFocus) {
            itemClasses += " la-item-focus";
        }

        const hiddenColumns: IColumn[] = this.props.columns.filter((column => !Utils_Array.contains(displayedColumns, column.refName, Utils_String.ignoreCaseComparer)));
        return (
            <div className={itemClasses} onFocus={this._onFocus} onBlur={this._onBlur} onKeyDown={this._onKeyDown} ref={this._resolveItemRef}>
                <div className="la-item-wrapper">
                    {/*
                        Add this back once the fabric tooltip allows adding classes to the tooltip elements
                        <Tooltip.TooltipHost className="pre-wrap-tooltip" content={ComponentUtils.getTooltip(this.props.linkedArtifact, hiddenColumns)}>
                    */}
                    <div className="la-artifact-data">
                        <PrimaryArtifact.Component primaryData={this.props.linkedArtifact.primaryData} hostArtifact={this.props.hostArtifact} />

                        <div className="la-additional-data">
                            {additionalData}
                        </div>
                        {action}
                    </div>
                </div>
                {deleteButton}
            </div>
        );
    }

    public componentWillUnmount(): void {
        if (this.state.hasFocus) {
            // This component is unmounting. If it had focus, get the previous focusable element, allow this component to unmount, and then focus the next element.
            this._previousElement = getPreviousElement(document.body, this._itemElement);
            if (this._previousElement) {
                Utils_Core.delay(this, 0, () => {
                    const nextFocusableElement = getNextElement(document.body, this._previousElement);
                    if (nextFocusableElement) {
                        nextFocusableElement.focus();
                    }
                });
            }
        }
    }

    protected _renderAdditional(refName: string, data: ILinkedArtifactAdditionalData): JSX.Element {
        return <AdditionalArtifact.Component key={refName} data={data} />;
    }

    @autobind
    protected _onDelete(evt: React.MouseEvent<HTMLElement>): void {
        this.props.actionsCreator.removeLinkedArtifact(this.props.linkedArtifact);
        evt.preventDefault();
    }

    @autobind
    private _onFocus() {
        // Workaround for focus issues when using keyboard to navigate an artifact list view.
        // Without a delay, when tab-ing from the main link to the delete button, an unfocus event is fired before
        // the focus event for the delete button is fired. This causes the element to disappear before focus switches
        // to it. With this delay we avoid this.
        this.setState({
            hasFocus: true
        });

        if (this._scheduledFocusChange) {
            this._scheduledFocusChange.cancel();
            this._scheduledFocusChange = null;
        }
    }

    @autobind
    private _onBlur(): void {
        this._scheduledFocusChange = Utils_Core.delay(this, 0, () => {
            if (this._itemElement) {
                this.setState({ hasFocus: false });
            }
        });
    }

    @autobind
    private _onKeyDown(evt: React.KeyboardEvent<HTMLElement>): void {
        switch (evt.keyCode) {
            case KeyCode.DELETE:
                this.props.actionsCreator.removeLinkedArtifact(this.props.linkedArtifact);
                evt.preventDefault();
                break;
        }
    }

    @autobind
    private _resolveItemRef(element: HTMLElement) {
        this._itemElement = element;
    }

    protected _intersperse(source: JSX.Element[]): JSX.Element[] {
        if (source.length === 0) {
            return [];
        }

        let count = 0;
        return source.slice(1).reduce((xs, x, i) => xs.concat([<span key={count++}>, &nbsp; </span>, x]), [source[0]]);
    }
}

export class ArtifactErrorComponent extends ArtifactComponent {
    public render(): JSX.Element {
        const artifact = this.props.linkedArtifact;

        const typeDisplayName = artifact.linkTypeDisplayName || artifact.linkType || artifact.type;

        const primaryData = ErrorUtils.getErrorPrimaryData(artifact);

        const primaryDataElement = <PrimaryArtifact.Component primaryData={primaryData} hostArtifact={this.props.hostArtifact} />;

        let additionalDataElement: JSX.Element[] = null;

        // If no URL / not a valid URL, the artifact name is the error message, don't add another error message.
        if (primaryData.href && primaryData.href !== "#") {
            additionalDataElement = [this._renderAdditional("System.Links.ErrorColumn", {
                styledText: { text: Utils_String.localeFormat(PresentationResource.LinkedArtifacts_ItemError) },
                title: Utils_String.localeFormat(PresentationResource.LinkedArtifacts_ItemError)
            })];
        }

        // Inline delete button
        let deleteButton: JSX.Element;
        if (!this.props.displayOptions.readOnly) {
            deleteButton = <ArtifactDeleteButton.Component onDelete={this._onDelete.bind(this)} />;
        }

        return (
            <div className="la-item">
                <div className="la-item-wrapper">
                    <div className="la-artifact-data">
                        {primaryDataElement}

                        <div className="la-additional-data">
                            {additionalDataElement}
                        </div>
                    </div>
                </div>
                {deleteButton}
            </div>
        );
    }
}

interface IArtifactActionComponentProps {
    linkedArtifact: IInternalLinkedArtifactDisplayData;
    hostArtifact?: IHostArtifact;
}

const ArtifactActionComponent: React.StatelessComponent<IArtifactActionComponentProps> = (props: IArtifactActionComponentProps): JSX.Element => {
    const onClick = (e: React.MouseEvent<HTMLElement>) => {
        if (props.linkedArtifact.action.callback) {
            props.linkedArtifact.action.callback(props.linkedArtifact.miscData, props.hostArtifact);
        }
    };

    const action = props.linkedArtifact.action;
    return (
        <div className="la-action">
            <Tooltip.TooltipHost content={action.title} overflowMode={Tooltip.TooltipOverflowMode.Parent}>
                <a href={action.href} onClick={onClick}>{action.styledText.text}</a>
            </Tooltip.TooltipHost>
        </div>
    );
};
