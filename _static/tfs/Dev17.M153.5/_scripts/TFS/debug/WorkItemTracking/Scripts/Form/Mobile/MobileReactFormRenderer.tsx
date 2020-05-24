import "VSS/LoaderPlugins/Css!MobileForm";

import * as React from "react";
import * as Q from "q";

import * as Diag from "VSS/Diag";
import * as Events_Services from "VSS/Events/Services";
import { FullScreenEvents } from "WorkItemTracking/Scripts/Utils/Events";
import * as FormLayout from "WorkItemTracking/Scripts/Form/Layout";
import { WorkItem, IWorkItemChangedArgs } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";

import { ReactFormRenderer, IReactFormRendererProps } from "WorkItemTracking/Scripts/Form/React/ReactFormRenderer";
import { FormContextItems, IOpenFullScreen } from "WorkItemTracking/Scripts/Form/Mobile/Interfaces";

import { ViewSwitcher, View, FixedView } from "WorkItemTracking/Scripts/Form/Mobile/Components/ViewSwitcher";
import { FullScreenView, IFullScreenViewComponentProps } from "WorkItemTracking/Scripts/Form/Mobile/Components/FullScreenView";
import { TabComponent } from "WorkItemTracking/Scripts/Form/React/Components/TabComponent";
import { Header } from "WorkItemTracking/Scripts/Form/Mobile/Components/HeaderComponent";
import { ResponsiveFormHeader } from "WorkItemTracking/Scripts/Form/Mobile/Components/ResponsiveHeaderComponent";
import { TabbedComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/TabbedComponent";
import { BlockingOverlayComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/BlockingOverlayComponent";
import { isContribution } from "WorkItemTracking/Scripts/Form/Contributions";
import { MobileWorkItemControlAdapterComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/MobileWorkItemControlAdapterComponent";
import { ContributedWorkItemControlComponent } from "WorkItemTracking/Scripts/Form/React/Components/ContributedWorkItemControlComponent";
import { FormLayoutType } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { WorkItemDiscussionPreviewComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/DiscussionComponent/WorkItemDiscussionPreviewComponent";

import { Fabric } from "OfficeFabric/components/Fabric/Fabric";

const eventSvc = Events_Services.getService();

// Work-around to use the TabComponent in tsx
let WorkItemTabs = TabComponent as new () => TabComponent<FormLayout.ILayoutPage>;

interface IBetaBannerState {
    isVisible: boolean;
}

export interface IMobileReactFormRendererState {
    isSaving: boolean;

    fullScreenProps?: IFullScreenViewComponentProps;
}

const ViewKeys = {
    Form: "form",
    Fullscreen: "fullscreen"
};

/** Mobile react based work item form renderer */
export class MobileReactFormRenderer extends ReactFormRenderer<IMobileReactFormRendererState> {
    private _viewSwitcher: ViewSwitcher;
    private _resolveViewSwitcher = (ref: ViewSwitcher) => this._viewSwitcher = ref;

    private _fullScreenView: FullScreenView;
    private _resolveFullScreenView = (ref: FullScreenView) => this._fullScreenView = ref;

    constructor(props: IReactFormRendererProps, context?: any) {
        super(props, context);

        this.state = this._getState(this.props);
    }

    /**
     *  @override
     */
    protected _getFormLayoutType(): FormLayoutType {
        return FormLayoutType.Mobile;
    }

    private _getState(props: IReactFormRendererProps) {
        return {
            isSaving: props.workItem && props.workItem.isSaving() || false
        };
    };

    public componentDidMount() {
        eventSvc.attachEvent(FullScreenEvents.EXIT_FULL_SCREEN, this._onExitFullScreen);
    }

    public componentWillUnmount() {
        eventSvc.detachEvent(FullScreenEvents.EXIT_FULL_SCREEN, this._onExitFullScreen);

        if (this.props.workItem) {
            this.props.workItem.detachWorkItemChanged(this._workItemChanged);
        }
    }

    private _onExitFullScreen = () => {
        if (this._viewSwitcher) {
            this._viewSwitcher.switchView(ViewKeys.Form);

            eventSvc.fire(FullScreenEvents.FULL_SCREEN_EXITED);
        }
    };

    public shouldComponentUpdate?(nextProps: IReactFormRendererProps, nextState: IMobileReactFormRendererState, nextContext: any): boolean {
        // Re-render if 
        // - props change, or
        // - context changes, or
        // - value of isSaving changes
        return nextProps !== this.props
            || nextContext !== this.context
            || (this.state !== nextState);
    }

    public componentWillReceiveProps(nextProps: IReactFormRendererProps) {
        super.componentWillReceiveProps(nextProps);

        if (nextProps.workItem) {
            if (this.props.workItem !== nextProps.workItem && this.props.workItem) {
                this.props.workItem.detachWorkItemChanged(this._workItemChanged);
            }

            nextProps.workItem.attachWorkItemChanged(this._workItemChanged);
            this.setState(this._getState(nextProps));
        }
    }

    public render(): JSX.Element {
        const visiblePages = this.props.layoutInformation.layout.pages.filter(page => page.visible);

        let overlay: JSX.Element;
        if (this.state.isSaving) {
            overlay = <BlockingOverlayComponent />;
        }

        return <div className="mobile-form bowtie-fabric" role="main">
            <Fabric>
                { /* Responsive header is rendered as 'fixed', it has be outside of any element that we apply a 'transform' to */}
                <ResponsiveFormHeader />

                {overlay}

                <ViewSwitcher
                    defaultView={ViewKeys.Form}
                    supportTransitions={true}
                    transitionDurationInMs={300}
                    supportNavigation={true}
                    ref={this._resolveViewSwitcher}>

                    {/* Main form view */}
                    <FixedView
                        className="form"
                        key={ViewKeys.Form}
                        keepScrollPosition={true}>
                        <div className="mobile-form form-grid witform-layout work-item-form-main">
                            <Header layout={this.props.layoutInformation} />
                            <WorkItemDiscussionPreviewComponent />
                            <TabbedComponent tabs={visiblePages} setActiveTab={this._showTab} />
                            <div className="form-body">
                                <WorkItemTabs tabs={visiblePages} renderTab={this._renderTab} ref={this._resolveTabs} />
                            </div>
                        </div>
                    </FixedView>

                    {/* Fullscreen overlay view */}
                    <View
                        className="fs"
                        key={ViewKeys.Fullscreen}>
                        <FullScreenView
                            {...this.state.fullScreenProps}
                            ref={this._resolveFullScreenView} />
                    </View>
                </ViewSwitcher>
            </Fabric>
        </div>;
    }

    /** @override: we need to provide additional information */
    protected _updateContext(props: IReactFormRendererProps) {
        let context = ReactFormRenderer._getFormContext(props, FormLayoutType.Mobile);
        context.items[FormContextItems.FullScreenInvoke] = this._openFullscreen;
        this._contextProvider.setFormContext(context);
    }

    /** Override: we want to construct previewable controls for mobile */
    protected _renderControl = (pageId: string, control: FormLayout.ILayoutControl): JSX.Element => {
        if (isContribution(control)) {
            return <ContributedWorkItemControlComponent control={control} key={this._getControlKey(control)} />
        }

        return <MobileWorkItemControlAdapterComponent
            key={this._getControlKey(control)}
            control={control}
            pageId={pageId}
            openFullscreen={this._openFullscreen} />;
    }

    /**
     * Handle for controls to open the fullscreen view
     */
    private _openFullscreen: IOpenFullScreen = (
        title: string,
        onShow?: (close: () => void, $container: JQuery) => JSX.Element,
        onClose?: () => void,
    ) => {
        this.setState(
            {
                fullScreenProps: {
                    borderColor: this.props.workItemTypeColor,
                    title: title,
                    onShow: onShow,
                    onClose: () => {
                        this._viewSwitcher.switchToPreviousView();

                        if (onClose) {
                            onClose();
                        }
                    },
                } as IFullScreenViewComponentProps,
            } as any,
            () => {
                // Once the state is updated, switch to the fullscreen view
                this._viewSwitcher.switchView(ViewKeys.Fullscreen);
            },
        );
    };

    private _workItemChanged = (sender: WorkItem, args: IWorkItemChangedArgs) => {
        Diag.Debug.assert(sender === this.props.workItem);

        switch (args.change) {
            case WorkItemChangeType.Saving:
                this.setState({
                    isSaving: true,
                });
                break;

            case WorkItemChangeType.Saved:
            case WorkItemChangeType.SaveCompleted:
                this.setState({
                    isSaving: false
                });
                break;
        }
    }
}