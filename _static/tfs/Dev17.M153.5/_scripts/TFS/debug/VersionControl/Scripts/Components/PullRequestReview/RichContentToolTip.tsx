import * as React from "react";
import * as ReactDOM from "react-dom";

// legacy stuff for control rendering
import * as Controls from "VSS/Controls";
import * as PopupContent from "VSS/Controls/PopupContent";

export interface IRichContentToolTipProps extends React.Props<void> {
    id: string; // the id of this tool tip - use data-tip-id=[id] on elements that should be bound to this tooltip

    /**
     * Should the tooltop open / close when hovering over the associated element.
     */
    openCloseOnHover?: boolean;

    /*
    * ToolTip attachment takes long time so when number of tool tips is big attachment can be delayed to until user make action.
    * Set delayToolTipAttachment to true, and set attachToolTip to true when attachment should happen.
    */
    delayToolTipAttachment?: boolean;
    attachToolTip?: boolean;
}

/**
 * Render the rich content tooltip control.
 */
export class RichContentToolTip extends React.Component<IRichContentToolTipProps, {}> {
    private _renderElement: HTMLElement;
    private _enhancements: PopupContent.RichContentTooltip[];

    constructor(props: IRichContentToolTipProps) {
        super(props);

        this._enhancements = [];
    }

    public render(): JSX.Element {
        // render an empty HTML element for jquery to attach to
        // and an element that holds our children for later attachment to the tooltip
        return (
            <div className="rich-content-tooltip-container">
                <div className="rich-content-children"
                    style={{ display: "none" }}
                    ref={(d) => this._renderElement = d}>
                    {this.props.children}
                </div>
            </div>);
    }

    public componentWillUnmount(): void {
        // clear out all the tooltips we created
        if (this._enhancements) {
            this._enhancements.forEach(enhancement => {
                enhancement.dispose();
                enhancement = null;
            });
            this._enhancements = [];
        }
    }

    public componentDidMount(): void {
        if(!this.props.delayToolTipAttachment){
            this._createToolTips();
        }
    }

    public componentDidUpdate(): void {
        if (this.props.delayToolTipAttachment && this.props.attachToolTip) {
            this._createToolTips();
        }
        for (let i = 0; i < this._enhancements.length; i++) {
            this._enhancements[i].resetContent();
        }
    }

    /**
     * Create the rich content tooltip control and bind it to the page.
     */
    private _createToolTips() {
        if (this._enhancements.length > 0) {
            return; // we already ran the tooltip enhancement
        }

        const content = () => { return $(this._renderElement); };
        const targets = this.getTipTargets();

        for (let i = 0; i < targets.length; i++) {
            // enhance each HTML element we found with the tooltip content
            const enhancement = Controls.Enhancement.enhance(PopupContent.RichContentTooltip, targets[i], {
                cssClass: "delegate-rich-content-tooltip",
                html: content,
                openCloseOnHover: this.props.openCloseOnHover || false,
            }) as PopupContent.RichContentTooltip;

            // save the ref for later
            this._enhancements.push(enhancement);
        }
    }

    // get a list of elements our tooltip is targeting
    private getTipTargets(): NodeListOf<Element> {
        return document.querySelectorAll("[data-tip-id='" + this.props.id + "']");
    }
}
