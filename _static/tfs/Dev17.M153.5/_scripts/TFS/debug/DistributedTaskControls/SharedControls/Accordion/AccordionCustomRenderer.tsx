import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { ICollapsibleProps, ICollapsibleState, Collapsible } from "DistributedTaskControls/SharedControls/Collapsible/Collapsible";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { InputControlUtils } from "DistributedTaskControls/SharedControls/InputControls/Utilities";

import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import { DirectionalHint } from "OfficeFabric/ContextualMenu";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/Collapsible/Collapsible";

export interface IAccordionCustomRendererProps extends ICollapsibleProps {
    showErrorDelegate?: () => boolean;
    showWarningDelegate?: () => boolean;
    warningTooltipContent?: string;
    errorTooltipContent?: string;
}

export interface IAccordionCustomRendererInstanceProps extends Base.IProps {
    onHeaderClick?: (view: string, isExpanded: boolean) => void;
    expanded?: boolean;
}

export class AccordionCustomRenderer extends Base.Component<IAccordionCustomRendererProps, ICollapsibleState> {

    constructor(props: IAccordionCustomRendererProps) {
        super(props);
        this._titleId = props.titleId ? props.titleId : InputControlUtils.getId("AccordionCustomRenderer");
        this.state = {
            expanded: !!(props.expanded !== undefined ? props.expanded : props.initiallyExpanded)
        };
    }

    public componentWillReceiveProps(newProps: IAccordionCustomRendererProps): void {
        if (newProps.expanded !== undefined) {
            this.setState({
                expanded: !!newProps.expanded
            });
        }
    }

    public render(): JSX.Element {
        const isExpanded: boolean = this.isExpanded();

        return (
            <Collapsible
                onHeaderClick={this.showContent}
                {...this.props /* override props fields only if override behaviour is handled, like onRenderHeader */}
                onRenderHeader={this._getHeaderElement}
                titleId={this._titleId}
                expanded={isExpanded} />
        );
    }

    /**
    * use controlled component using props.expanded, rather controlling using this function.
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

    private _getHeaderElement = (props: IAccordionCustomRendererProps, defaultRender?: (props?: IAccordionCustomRendererProps) => JSX.Element | null): JSX.Element => {
        const showError: boolean = this.props.showErrorDelegate ? this.props.showErrorDelegate() : false;
        const showWarning: boolean = this.props.showWarningDelegate ? this.props.showWarningDelegate() : false;
        const isExpanded: boolean = this.isExpanded();
        return this._getDtcAccordionHeader(props, isExpanded, showError, defaultRender, showWarning);
    }

    private _getDtcAccordionHeader(
        props: IAccordionCustomRendererProps,
        isExpanded: boolean,
        showError: boolean,
        defaultRender?: (props?: IAccordionCustomRendererProps) => JSX.Element | null,
        showWarning?: boolean): JSX.Element {

        if (!isExpanded && showError) {
            return this._getAccordianCustomHeaderComponent(isExpanded, props, css("collapsible-error", "bowtie-status-error-outline"), props.errorTooltipContent);
        }
        else if (!isExpanded && showWarning) {
            return this._getAccordianCustomHeaderComponent(isExpanded, props, "bowtie-status-warning", props.warningTooltipContent);
        }
        else {
            return this.props.onRenderHeader
                ? this.props.onRenderHeader(props)
                : defaultRender ? defaultRender(props) : null;
        }
    }

    private _getAccordianCustomHeaderComponent(
        isExpanded: boolean,
        props: IAccordionCustomRendererProps,
        iconClass: string,
        tooltipContent?: string): JSX.Element {
        const chevronIconClass: string = Utils_String.format("chevron bowtie-icon bowtie-chevron-{0}-light", isExpanded ? "up" : "down");
        const { label, addSectionHeaderLine } = props;

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
                data-first-focus-element={true}>

                {this._getAccordianHeader(label, iconClass, tooltipContent)}

                <div
                    className={chevronIconClass}
                    aria-label={isExpanded ? Resources.ExpandText : Resources.CollapseText}>
                </div>
                {
                    addSectionHeaderLine &&
                    <div className="collapsible-section-line">
                        <hr />
                    </div>
                }

            </div>);
    }

    private _getAccordianHeader(label: string, iconClass: string, tooltipContent?: string, ): JSX.Element {
        const tooltip: string = tooltipContent ? tooltipContent : label;
        const headerIconClass: string = css("collapsible-section-icon bowtie-icon", iconClass);

        return (
            <div className="collapsible-section-label" >
                {
                    tooltipContent
                        ? <TooltipHost
                            content={tooltip}
                            directionalHint={DirectionalHint.rightCenter}>
                            <span
                                data-is-focusable={true}
                                aria-label={tooltip}
                                className={headerIconClass}
                                tabIndex={0} />
                        </TooltipHost>
                        : <span className={headerIconClass} />
                }

                {label}
            </div>);
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

    private _titleId: string;
}
