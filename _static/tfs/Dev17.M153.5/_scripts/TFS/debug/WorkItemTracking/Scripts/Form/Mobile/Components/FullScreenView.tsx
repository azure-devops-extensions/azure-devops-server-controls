import "VSS/LoaderPlugins/Css!WorkItemTracking/Form/Mobile/Components/FullScreenView";

import React = require("react");
import * as Diag from "VSS/Diag";
import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

export interface IFullScreenViewComponentProps {
    /** Border color for the header */
    borderColor: string;

    /** Optional title to show in the header */
    title?: string;

    /** Callback when fullscreen view is shown.  */
    onShow?: (closeFullscreen: Function, $container: JQuery) => JQuery | JSX.Element;

    /** Callback when the full screen view should be closed */
    onClose?: () => void;
}

export class FullScreenView extends React.Component<IFullScreenViewComponentProps, {}> {
    private _resolveRoot = (element: HTMLElement) => { this._rootElement = element; };
    private _rootElement: HTMLElement;

    private _resolveContent = (element: HTMLElement) => { this._contentElement = element; };
    private _contentElement: HTMLElement;

    private _content: null | JSX.Element;
    
    public componentDidMount() {
        if (this.props.onShow) {
            const $contentContainer = $(this._contentElement);
            let content = this.props.onShow(this._onClose, $contentContainer);

            if (content && React.isValidElement(content)) {
                // Content is React
                this._content = content as JSX.Element;
                this.forceUpdate();
            }
        }
    }

    public render(): JSX.Element {        
        return <div className="fullscreen-container">
            <div className="fullscreen-root" ref={this._resolveRoot}>
                <div className="fullscreen-header" style={{ borderLeftColor: this.props.borderColor }}>
                    <button className="bowtie-icon bowtie-chevron-left-light"
                        aria-label={WorkItemTrackingResources.MobileGoBackAriaLabel}
                        onClick={this._onClose} />
                    <h1 className="fullscreen-title">
                        {this.props.title}
                    </h1>
                </div>
                <div className="fullscreen-content" ref={this._resolveContent}>
                    {this._content}
                </div>
            </div>
        </div>;
    }

    private _onClose = () => {
        if (this.props.onClose) {
            this.props.onClose();
        }
        else {
            window.history.back();
        }
    }
}