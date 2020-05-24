import * as React from "react";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { InputControlUtils } from "DistributedTaskControls/SharedControls/InputControls/Utilities";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";

import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import { css, IRenderFunction } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/Accordion/Accordion";

// 
// copied from Tfs/Service/WebAccess/VersionControl/Scenarios/NewGettingStarted/Components/Accordion.tsx
// and changes to support header line and different description on collapse

export interface IAccordionState extends Base.IState {
    expanded: boolean;
}

export interface IAccordionProps extends Base.IProps {
    label: string;
    headingLevel: number;
    description?: string | JSX.Element;
    /**
   * initially expanded state. Mutually exclusive to "expanded".
   * Use this if you want an uncontrolled component,
   * state is controlled externally by setting the state.
   * This is implemented in Collapsible component.
   */
    initiallyExpanded?: boolean;
    /**
   * expanded state. Mutually exclusive to "initiallyExpanded".
   * Use this if you control the expanded state at a higher
   * level and plan to pass in the correct value based on events and re-rendering.
   * Setting onHeaderClick event will give more control on this property used from higher level.
   * This is implemented in Collapsible component.
   */
    expanded?: boolean;
    addSeparator?: boolean;
    addSectionHeaderLine?: boolean;
    descriptionOnCollapse?: string | JSX.Element;
    bowtieIconName?: string;
    titleId?: string;
    /**
     * Optional custom renderer for the header
     */
    onRenderHeader?: IRenderFunction<IAccordionProps>;
    onHeaderClick?: (isExpanded: boolean) => void;
    onRenderHeaderEnd?: IRenderFunction<IAccordionProps>;
}

/*
* use Collapsible instead
* TODO: Should remove this once references are removed.
* Bug: 1086865
* @deprecated
*/
export class Accordion extends Base.Component<IAccordionProps, IAccordionState> {
    private _titleId: string;
    private _contentId: string;

    constructor(props) {
        super(props);
        this._titleId = InputControlUtils.getId("Accordion");
        this._contentId = InputControlUtils.getId("AccordionContent");
        this.state = {
            expanded: props.initiallyExpanded || false
        };
    }

    public componentDidUpdate(prevProps: IAccordionProps, prevState: IAccordionState): void {
        // Get visible content into scroll view  
        if (this.state && this.state.expanded) {
            if (!prevState || prevState.expanded !== this.state.expanded && this._contentContainer) {
                DtcUtils.scrollElementToView(this._contentContainer);
            }
        }
    }

    public render(): JSX.Element {
        let chevronIconClass: string = Utils_String.format("chevron bowtie-icon bowtie-chevron-{0}-light", this.state.expanded ? "up" : "down");
        let headerContent: JSX.Element = this._getHeaderContent();
        let headerContentEnd: JSX.Element = this._getHeaderContentEnd();
        let accordionDescriptionId = "accrodion-description" + DtcUtils.getUniqueInstanceId();

        return (
            <div className={css("dtc-accordion", this.props.cssClass)}
                ref={(element) => { this._contentContainer = element; }}>
                <div
                    className="title-container"
                    role="heading"
                    aria-level={this.props.headingLevel}
                    aria-describedby={accordionDescriptionId}>
                    <div className="hidden" id={accordionDescriptionId}>{this.state.expanded ? this.props.description : this.props.descriptionOnCollapse}</div>

                    <div
                        tabIndex={0}
                        className="accordion-section-header"
                        role="button"
                        onClick={this._toggle}
                        onKeyDown={this._handleKeyPress}
                        id={this._titleId}
                        aria-label={this.props.label}
                        aria-controls={this._contentId}
                        aria-expanded={this.state.expanded}
                        data-first-focus-element={true}>

                        {headerContent}

                        <div
                            className={chevronIconClass}
                            aria-label={this.state.expanded ? Resources.ExpandText : Resources.CollapseText} />
                        {
                            this.props.addSectionHeaderLine &&
                            <div className="accordion-section-line">
                                <hr />
                            </div>
                        }
                    </div>

                    {headerContentEnd}

                    {(this.state.expanded && this.props.description) ? <div className="description-container">{this.props.description}</div> : null}
                    {(!this.state.expanded && this.props.descriptionOnCollapse) ? <div className="description-container">{this.props.descriptionOnCollapse}</div> : null}
                    {(!this.state.expanded && !this.props.descriptionOnCollapse && this.props.description) ? <div className="description-container">{this.props.description}</div> : null}
                </div>

                <div id={this._contentId}>
                    {
                        this.state.expanded &&
                        <div
                            className="content-container"
                            aria-labelledby={this._titleId}>
                            {this.props.children}
                        </div>
                    }
                </div>
                {
                    this.props.addSeparator && <Separator />
                }
            </div >
        );
    }

    public isExpanded(): boolean {
        if (this.state) {
            return !!this.state.expanded;
        }
        return !!this.props.initiallyExpanded;
    }

    private _getHeaderContent(): JSX.Element {
        if (this.props.onRenderHeader) {
            return this.props.onRenderHeader(this.props, this._getDefaultSectionHeaderLabel);
        } else {
            return this._getDefaultSectionHeaderLabel(this.props);
        }
    }

    private _getHeaderContentEnd(): JSX.Element {
        if (this.props.onRenderHeaderEnd) {
            let renderElement = this.props.onRenderHeaderEnd(this.props);
            return (
                <div className="accordion-section-header-end">
                    {renderElement}
                </div>
            );
        } else {
            return (<div />);
        }
    }

    private _toggle = (): void => {
        let toggledState: boolean = !this.state.expanded;
        this.setState({
            expanded: toggledState
        });
        if (this.props.onHeaderClick) {
            this.props.onHeaderClick(toggledState);
        }
    }

    public showContent = (show: boolean): void => {
        this.setState({ expanded: show });
    }

    private _handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (event.keyCode === KeyCode.SPACE || event.keyCode === KeyCode.ENTER) {
            this._toggle();
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private _getDefaultSectionHeaderLabel = (props: IAccordionProps): JSX.Element => {
        return (
            <div className="accordion-section-label">
                {this._getBowtieHeader(props)}
                <TooltipHost content={props.label} overflowMode={TooltipOverflowMode.Parent}>
                    {props.label}
                </TooltipHost>
            </div>);
    }

    private _getBowtieHeader(props: IAccordionProps): JSX.Element {
        let bowtieHeaderIconClass: string = props.bowtieIconName ? Utils_String.format("accordion-section-icon bowtie-icon {0}", props.bowtieIconName) : Utils_String.empty;
        return (
            props.bowtieIconName &&
            <i className={bowtieHeaderIconClass} />
        );
    }

    private _contentContainer: HTMLDivElement;
}

const Separator = (): JSX.Element =>
    <div className="empty-separator" />;