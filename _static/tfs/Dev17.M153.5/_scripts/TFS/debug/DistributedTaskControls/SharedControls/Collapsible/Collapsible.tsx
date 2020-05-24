import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Component as InfoButton, IProps as InfoButtonProps } from "DistributedTaskControls/Components/InfoButton";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { IAccordionState, IAccordionProps } from "DistributedTaskControls/SharedControls/Accordion/Accordion";
import { InputControlUtils } from "DistributedTaskControls/SharedControls/InputControls/Utilities";

import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { css, IRenderFunction } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";
import { KeyCode, Positioning } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/Collapsible/Collapsible";

export interface ICollapsibleProps extends IAccordionProps {
    customLabel?: JSX.Element;
    helpLink?: string;
    descriptionInfoText?: string;
    scrollBehavior?: Positioning.VerticalScrollBehavior;
    headerContainerCssClass?: string;
    headerLabelCssClass?: string;
    headerChevronCssClass?: string;
}

export interface ICollapsibleState extends IAccordionState {
}

// 
// most of the code copied from Tfs/Service/WebAccess/VersionControl/Scenarios/NewGettingStarted/Components/Accordion.tsx
// this component supports header line, different description when collapsed, also
// supports the render entire header.
export class Collapsible extends Base.Component<ICollapsibleProps, ICollapsibleState> {
    private _titleId: string;
    private _contentId: string;

    constructor(props: ICollapsibleProps) {
        super(props);
        this._titleId = props.titleId ? props.titleId : InputControlUtils.getId("Collapsible");
        this._contentId = InputControlUtils.getId("CollapsibleContent");
        this.state = {
            expanded: !!(props.expanded !== undefined ? props.expanded : props.initiallyExpanded)
        };
    }

    public componentWillReceiveProps(newProps: ICollapsibleProps): void {
        if (newProps.expanded !== undefined) {
            this.setState({
                expanded: !!newProps.expanded
            });
        }
    }

    public componentDidUpdate(prevProps: ICollapsibleProps, prevState: ICollapsibleState): void {
        // Get visible content into scroll view
        if (this._contentContainer) {
            if (this.props.expanded) {
                if (!prevProps || prevProps.expanded !== this.props.expanded) {
                    DtcUtils.scrollElementToView(this._contentContainer, this.props.scrollBehavior);
                }
            }
            else if (this.state && this.state.expanded) {
                if (!prevState || prevState.expanded !== this.state.expanded) {
                    DtcUtils.scrollElementToView(this._contentContainer, this.props.scrollBehavior);
                }
            }
        }
    }

    public render(): JSX.Element {
        const collapsibleDescriptionId: string = `collapsible-description-${DtcUtils.getUniqueInstanceId()}`;
        const headerContent: JSX.Element = this._getHeaderContent();
        const descriptionContent: JSX.Element = this._getDescriptionContent();
        const { cssClass, headingLevel, addSeparator, children } = this.props;
        const isExpanded: boolean = this.isExpanded();
        const description: string | JSX.Element = this._getDescription();

        return (
            <div className={css("dtc-collapsible", cssClass)}
                ref={this._resolveRef("_contentContainer")}>
                <div
                    className={css(this.props.headerContainerCssClass, "title-container", isExpanded ? "dtc-collapsible-expanded" : "dtc-collapsible-collapsed")}
                    role="heading"
                    aria-expanded={isExpanded}
                    aria-level={headingLevel}
                    aria-describedby={collapsibleDescriptionId}>

                    <div className="hidden" id={collapsibleDescriptionId}>{description}</div>
                    {headerContent}
                    {descriptionContent}

                </div>
                <div id={this._contentId}>
                    {
                        isExpanded &&
                        <div
                            className="content-container">
                            {children}
                        </div>
                    }
                </div>
                {
                    addSeparator && <Separator />
                }
            </div >
        );
    }

    public isExpanded(): boolean {
        let isExpanded: boolean = false;

        // if props expanded [controlled] is available, then return it.
        // else return state value if it is available, or fall back to props original value.
        if (this.props.expanded === undefined) {
            isExpanded = this.state ? this.state.expanded : this.props.initiallyExpanded;
        }
        else {
            isExpanded = this.props.expanded;
        }

        return !!isExpanded;
    }

    /**
    * use controlled component using props.expanded, rather controlling using this function.
    * adding for compat reasons, will be revoked soon.
    * @deprecated
    */
    public showContent = (show: boolean): void => {
        // set only if props does not have expanded property,
        // otherwise we will violate rule of controlled/uncontrolled component
        if (this.props.expanded === undefined) {
            this.setState({
                expanded: show
            });
        }
    }

    private _getHeaderContent(): JSX.Element {
        if (this.props.onRenderHeader) {
            return this.props.onRenderHeader(this.props, this._getDefaultSectionHeaderLabel);
        } else {
            return this._getDefaultSectionHeaderLabel(this.props);
        }
    }

    private _getDescriptionContent(): JSX.Element {
        let description: string | JSX.Element = this._getDescription();
        let descriptionInfoButton: JSX.Element = this._getDescriptionInfoButton();
        let helpLinkComponent: JSX.Element = this._getDescriptionHelpLinkContent();

        if (typeof description === "string" && helpLinkComponent) {
            // add a space at the end of the description, if link component available to show
            description = Utils_String.localeFormat("{0} ", description);
        }

        let element: JSX.Element = null;
        if (description) {
            element = (
                <div className="description-container">
                    {description}
                    {helpLinkComponent}
                    {descriptionInfoButton}
                </div>
            );
        }

        return element;
    }

    private _getDescriptionInfoButton(): JSX.Element {
        let element: JSX.Element = null;
        if (!!this.props.descriptionInfoText) {
            element = (
                <InfoButton
                    calloutContent={InputControlUtils.getCalloutContentProps(this.props.descriptionInfoText)}
                    cssClass="description-info-button"
                    isIconFocusable={true}
                    iconAriaLabel={Resources.InfoIconAriaLabel} />
            );
        }

        return element;
    }

    private _getDescriptionHelpLinkContent(): JSX.Element {
        let element: JSX.Element = null;
        if (this.props.helpLink) {
            element = (
                <SafeLink className="description-help-link" target="_blank" href={this.props.helpLink}>
                    {Resources.CollapsibleDescriptionLearnMore}
                </SafeLink>
            );
        }

        return element;
    }

    private _getDescription(): string | JSX.Element {
        const isCollapsed: boolean = !this.isExpanded();

        // default is description if available, on collapse, take descriptionOnCollapse if available
        let description: string | JSX.Element = this.props.description ? this.props.description : Utils_String.empty;
        if (isCollapsed && this.props.descriptionOnCollapse) {
            description = this.props.descriptionOnCollapse;
        }

        return description;
    }

    private _toggle = (): void => {
        const toggledState: boolean = !this.isExpanded();

        if (this.props.expanded === undefined) {
            this.setState({
                expanded: toggledState
            });
        }

        if (this.props.onHeaderClick) {
            this.props.onHeaderClick(toggledState);
        }
    }

    private _handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (event.keyCode === KeyCode.SPACE || event.keyCode === KeyCode.ENTER) {
            this._toggle();
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private _getDefaultSectionHeaderLabel = (props: ICollapsibleProps): JSX.Element => {
        const { label, addSectionHeaderLine } = props;
        const isExpanded: boolean = this.isExpanded();
        const chevronIconClass: string = Utils_String.format("chevron bowtie-icon bowtie-chevron-{0}-light", isExpanded ? "up" : "down");
        const bowtieHeader: JSX.Element = this._getBowtieHeader(props);
        const ariaLabel: string = isExpanded ? Resources.ExpandText : Resources.CollapseText;

        return (
            <div
                tabIndex={0}
                className="collapsible-section-header"
                role="button"
                onClick={this._toggle}
                onKeyDown={this._handleKeyPress}
                id={this._titleId}
                aria-label={label}
                aria-expanded={isExpanded}
                aria-controls={this._contentId}
                data-first-focus-element={true}>

                <div className={css(this.props.headerLabelCssClass, "collapsible-section-label")}>
                    {bowtieHeader}
                    {this.props.customLabel ? this.props.customLabel :
                     <TooltipHost content={label} overflowMode={TooltipOverflowMode.Parent}>
                        {label}
                     </TooltipHost>
                    }
                   
                </div>

                <div
                    className={css(this.props.headerChevronCssClass, chevronIconClass)}
                    aria-label={ariaLabel} />
                {
                    addSectionHeaderLine &&
                    <div className="collapsible-section-line">
                        <hr />
                    </div>
                }
            </div>
        );
    }

    private _getBowtieHeader(props: ICollapsibleProps): JSX.Element {
        const bowtieHeaderIconClass: string = props.bowtieIconName
            ? css("collapsible-section-icon", "bowtie-icon", props.bowtieIconName)
            : Utils_String.empty;
        return (
            props.bowtieIconName &&
            <i className={bowtieHeaderIconClass} />
        );
    }

    private _contentContainer: HTMLDivElement;
}

const Separator = (): JSX.Element =>
    <div className="empty-separator" />;