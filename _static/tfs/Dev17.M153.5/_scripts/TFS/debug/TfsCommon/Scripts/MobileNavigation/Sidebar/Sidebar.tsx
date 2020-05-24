import "VSS/LoaderPlugins/Css!TfsCommon/MobileNavigation/Sidebar/Sidebar";

import * as React from "react";

import * as Resources from "TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon";
import * as Scroll from "TfsCommon/Scripts/Mobile/Scroll";

import { Area, Feature } from "TfsCommon/Scripts/CustomerIntelligenceConstants";
import { Layer } from "OfficeFabric/Layer";
import { Overlay } from "OfficeFabric/Overlay";
import { Popup } from "OfficeFabric/Popup";
import { BaseComponent, css, autobind } from "OfficeFabric/Utilities";
import { ISidebarProps } from "TfsCommon/Scripts/MobileNavigation/Sidebar/Sidebar.props";
import * as Telemetry from "VSS/Telemetry/Services";

/** Duration of enter/exit animations for sidebar */
const animationDurationMs = 170;

export interface ISidebarState {
    isAnimatingOpen: boolean;
    isAnimatingClose: boolean;
}

export class Sidebar extends BaseComponent<ISidebarProps, ISidebarState> {
    private _homeElement: HTMLAnchorElement;

    constructor(props: ISidebarProps, context?: any) {
        super(props, context);

        this.state = {
            isAnimatingOpen: false,
            isAnimatingClose: false
        };
    }

    public componentDidMount() {
        this._updateInternalState(this.props);
    }

    public componentWillReceiveProps(props: ISidebarProps) {
        this._updateInternalState(props);
    }

    private _updateInternalState(props: ISidebarProps) {
        if (props.isOpen && !this.props.isOpen) {
            this._open();
        }

        if (!props.isOpen && this.props.isOpen) {
            // Close
            this._dismiss();
        }
    }

    public render() {
        const { isOpen, children, headerLabel, brandHref, headerHref } = this.props;
        const { isAnimatingOpen, isAnimatingClose } = this.state;

        const showSidebar = isOpen || isAnimatingClose;

        return showSidebar &&
            <Layer>
                <Popup
                    role="dialog"
                    onDismiss={this._onDismiss}>
                    <div className="sidebar-container">
                        <Overlay
                            isDarkThemed={true}
                            className={css("sidebar-overlay", {
                                "ms-fadeIn200": isAnimatingOpen,
                                "ms-fadeOut200": isAnimatingClose
                            })}
                            onClick={this._onDismiss}
                        />

                        <div className={css("sidebar", {
                            "ms-slideRightIn40": isAnimatingOpen,
                            "ms-slideLeftOut40": isAnimatingClose
                        })}>
                            {/* Header */}
                            <div className="sidebar-header">
                                <a className="sidebar-home" onMouseDown={this._onBrandIconClick} href={brandHref} aria-label={Resources.MobileNavigation_GoHomeLabel} ref={this._resolveHome}>
                                    <i className="bowtie-icon bowtie-brand-vsts" />
                                </a>
                                <a className="sidebar-title" onMouseDown={this._onHeaderClick} href={headerHref} aria-label={Resources.MobileNavigation_GoHomeLabel}>
                                    {headerLabel}
                                </a>
                            </div>

                            {/* Content */}
                            <div className="sidebar-content">
                                {children}
                            </div>
                        </div>
                    </div>
                </Popup>
            </Layer>;
    }

    @autobind
    private _onBrandIconClick() {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(Area.MobileNavigation, Feature.AccountIconClick, {}), true);
    }

    @autobind
    private _onHeaderClick() {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(Area.MobileNavigation, Feature.AccountNameClick, {}), true);
    }

    @autobind
    private _onDismiss() {
        this._dismiss();
    }

    private _open() {
        this.setState({
            isAnimatingOpen: true
        } as ISidebarState);

        this._async.setTimeout(
            () => {
                this.setState(
                    {
                        isAnimatingOpen: false
                    } as ISidebarState,
                    () => {
                        // Set focus on home button
                        this._homeElement.focus();
                    });
            },
            animationDurationMs);

        Scroll.disableBodyScroll();
    }

    private _dismiss() {

        if (!this.state.isAnimatingClose) {
            this.setState({
                isAnimatingClose: true
            });
        }

        this._async.setTimeout(
            () => {
                if (this.props.isOpen && this.props.onDismiss) {
                    this.props.onDismiss();
                }

                this.setState({
                    isAnimatingClose: false
                });
            },
            animationDurationMs);

        Scroll.enableBodyScroll();
    }

    @autobind
    private _resolveHome(element: HTMLAnchorElement) {
        this._homeElement = element;
    }
}
