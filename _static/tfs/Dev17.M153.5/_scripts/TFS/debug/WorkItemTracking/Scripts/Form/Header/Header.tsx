import "VSS/LoaderPlugins/Css!WorkItemTracking/Form/Header/Header";

import * as React from "react";
import { autobind, css, BaseComponent, IBaseProps } from "OfficeFabric/Utilities";
import { ResponsiveViewport, IResponsiveViewport } from "VSSUI/ResponsiveViewport";
import { getService } from "VSS/Events/Services";
import { contains } from "VSS/Utils/Array";
import { WorkItemFormBreakpoints, Large } from "WorkItemTracking/Scripts/Form/Breakpoints";
import { ILayoutPage, ILayoutSection, ILayoutGroup, ILayoutControl } from "WorkItemTracking/Scripts/Form/Layout";
import { IWorkItemControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { FormEvents } from "WorkItemTracking/Scripts/Form/Events";

export interface IResponsiveHeaderProps extends IBaseProps {
    /** Id of the form view, used to attach to the correct resize events */
    formViewId: string;

    /** Header page to render */
    headerPage: ILayoutPage;

    /** Existing work item form header tabs */
    tabs: JQuery;

    /** Existing work item form freshness indicator instances */
    freshnessIndicator: {
        full: JQuery;
        minimal: JQuery;
    };

    /** Delegate to create a work item form control in the given container */
    createFormControl: (container: JQuery, options: IWorkItemControlOptions) => void;
}

export interface IResponsiveHeaderState {
    fullFreshnessIndicatorWidth: number;
}

export class ResponsiveHeader extends BaseComponent<IResponsiveHeaderProps, IResponsiveHeaderState> {
    private viewport: IResponsiveViewport;

    constructor(props: IResponsiveHeaderProps) {
        super(props);

        const ResizeThrottleTimeoutInMs = 50;
        this.asyncResize = this._async.throttle(this.asyncResize, ResizeThrottleTimeoutInMs);

        this.state = {
            fullFreshnessIndicatorWidth: 0
        };
    }

    render() {
        const { freshnessIndicator, tabs, headerPage, createFormControl } = this.props;
        const { fullFreshnessIndicatorWidth } = this.state;

        return <ResponsiveViewport className="work-item-responsive-viewport" breakPoints={WorkItemFormBreakpoints} componentRef={this.resolveViewport} onRenderContent={activeBreakpoints => {
            // The freshness indicator has to be stay at a fixed position, but influence different elements (i.e., they should not overlap)
            // the indicator. Unfortunately, the only way to accomplish this is to measure it, and then only when one of the "Large" breakpoint is active
            // restrict the size of the left part of the header.
            const largeBreakpointActive = contains(activeBreakpoints, Large);

            return <div className="work-item-responsive-header">
                <div className="work-item-responsive-header-left" style={{
                    maxWidth: largeBreakpointActive && `calc(100% - ${fullFreshnessIndicatorWidth}px)` || ""
                }}>
                    <HeaderPage page={headerPage} createFormControl={createFormControl} />

                    <JQueryWrapper className="work-item-responsive-freshness minimal" element={freshnessIndicator.minimal} />
                    <JQueryWrapper className="work-item-responsive-freshness full" element={freshnessIndicator.full} />
                </div>
                <div className="work-item-responsive-header-right" style={{
                    minWidth: largeBreakpointActive && `${fullFreshnessIndicatorWidth}px`
                }}>
                    <JQueryWrapper className="work-item-responsive-header-tabs" element={tabs} />
                </div>
            </div>;
        }} />;
    }

    /**
     * Update measurements
     */
    measure() {
        this.asyncResize();
    }

    componentDidMount() {
        super.componentDidMount();

        // The viewport by itself attaches to the "window.resize" event, which covers resizing the actual window. To support VSSF splitters and dialogs
        // we also need to attach to the jQuery version of this event.
        $(window).on("resize", this.asyncResize);

        const { formViewId } = this.props;
        getService().attachEvent(FormEvents.LayoutResizedEvent(formViewId), this.asyncResize);
    }

    componentWillUnmount() {
        super.componentWillUnmount();

        $(window).off("resize", this.asyncResize);

        const { formViewId } = this.props;
        getService().detachEvent(FormEvents.LayoutResizedEvent(formViewId), this.asyncResize);
    }

    private _measureFreshnessIndicator() {
        const { freshnessIndicator } = this.props;
        const width = freshnessIndicator && freshnessIndicator.full && freshnessIndicator.full.outerWidth();

        if (width > 0) {
            this.setState({
                fullFreshnessIndicatorWidth: width
            });
        }
    }

    private asyncResize() {
        this.viewport.measure();

        this._measureFreshnessIndicator();
    }

    @autobind
    private resolveViewport(viewport: IResponsiveViewport) {
        this.viewport = viewport;
    }
}

interface IHeaderPageProps {
    className?: string;

    page: ILayoutPage;

    createFormControl: (container: JQuery, options: IWorkItemControlOptions) => void;
}

class HeaderPage extends React.PureComponent<IHeaderPageProps, {}> {
    render() {
        const { page, createFormControl, className } = this.props;

        return <div className={css("work-item-header-page", className)}>
            {
                page && page.sections
                    .filter(section => section.calculatedVisible)
                    .map(section => <HeaderSection key={section.id} section={section} createFormControl={createFormControl} />)
            }
        </div>;
    }
}

interface IHeaderSectionProps {
    className?: string;

    section: ILayoutSection;

    createFormControl: (container: JQuery, options: IWorkItemControlOptions) => void;
}

class HeaderSection extends React.PureComponent<IHeaderSectionProps, {}> {
    render() {
        const { section, className, createFormControl } = this.props;

        return <div className={css("work-item-header-section", className)}>
            {
                section && section.groups
                    .filter(group => group.calculatedVisible)
                    .map(group => <HeaderGroup key={group.id} group={group} createFormControl={createFormControl} />)
            }
        </div>;
    }
}

interface IHeaderGroupProps {
    group: ILayoutGroup;

    createFormControl: (container: JQuery, options: IWorkItemControlOptions) => void;
}

class HeaderGroup extends React.PureComponent<IHeaderGroupProps, {}> {
    render() {
        const { group } = this.props;

        return <div className="work-item-header-group">
            {group && group.controls.map(control => this.renderControl(control))}
        </div>;
    }

    private renderControl(control: ILayoutControl): JSX.Element {
        const { createFormControl } = this.props;

        return <HeaderControl key={control.id} createFormControl={createFormControl} control={control} />;
    }
}

interface IHeaderControlProps {
    control: ILayoutControl;

    createFormControl: (container: JQuery, options: IWorkItemControlOptions) => void;
}

class HeaderControl extends React.PureComponent<IHeaderControlProps, {}> {
    private controlContainer: HTMLDivElement;

    componentDidMount() {
        if (this.controlContainer) {
            const { createFormControl, control } = this.props;

            createFormControl($(this.controlContainer), control.controlOptions);
        }
    }

    render() {
        return <div className="work-item-header-control-container" ref={this.resolveContainer} />;
    }

    @autobind
    private resolveContainer(container: HTMLDivElement) {
        this.controlContainer = container;
    }
}

interface IJQueryWrapperProps {
    className?: string;

    element: JQuery;
}

class JQueryWrapper extends React.Component<IJQueryWrapperProps, {}> {
    private element: HTMLElement;

    render() {
        const { className } = this.props;

        return <div className={className} ref={this.resolveRoot} />;
    }

    componentDidMount() {
        const { element } = this.props;

        if (this.element && element) {
            this.element.appendChild(element[0]);
        }
    }

    @autobind
    private resolveRoot(element: HTMLElement) {
        this.element = element;
    }
}
