import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/BacklogsHub/BacklogPivot/Components/ProductBacklogWrapper";
import { IBacklogGridItem } from "Agile/Scripts/Backlog/Events";
import { BacklogContext, ReorderManager } from "Agile/Scripts/Common/Agile";
import { BacklogWrapperBase, IBacklogWrapperBaseProps } from "Agile/Scripts/Common/Components/BacklogPivot/BacklogWrapperBase";
import { NewBacklogLevelsMessage } from "Agile/Scripts/Common/Components/NewBacklogLevelsMessage";
import { ProductBacklog } from "Agile/Scripts/ProductBacklog/ProductBacklog";
import { IBacklogPayload, ProductBacklogOptions } from "Agile/Scripts/ProductBacklog/ProductBacklogContracts";
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { css } from "OfficeFabric/Utilities";
import { IMessage } from "Presentation/Scripts/TFS/Components/Messages";

export * from "Agile/Scripts/Common/Components/BacklogPivot/BacklogWrapperBase";

export interface IProductBacklogWrapperProps extends IBacklogWrapperBaseProps {
    /** The payload used to render the backlog */
    backlogPayload: IBacklogPayload;

    /** Is the backlog grid visible. If this is false, the backlog will still be initialized, but hidden */
    visible: boolean;

    /** Is forecasting on? */
    forecastingOn: boolean;

    /** Event helper */
    eventHelper: ScopedEventHelper;

    /** Add a message to the message bar */
    addMessage: (message: IMessage) => void;

    /** Remove a message from the message bar */
    removeMessage: (id: string) => void;

    /** This is a signature (hash) of backlog levels that are detected as being newly added.
     * We use this to show the "A new backlog level has been configured for this project..." banner
     */
    newBacklogLevelsSignature: string;
}

export class ProductBacklogWrapper extends BacklogWrapperBase<IProductBacklogWrapperProps> {
    private _container: HTMLDivElement;
    protected _backlog: ProductBacklog;

    public render(): JSX.Element {
        return (
            <div className={css("productbacklog-wrapper", { "backlog-hidden": !this.props.visible })} ref={this._resolveContainerRef} >
                <div className="grid-status-message" />
                <div className="forecasting-input-container" />
            </div>
        );
    }

    public componentDidMount() {
        this._renderProductBacklog();
    }

    public componentDidUpdate(prevProps: IProductBacklogWrapperProps): void {
        if (
            this.props.backlogPayload !== prevProps.backlogPayload ||
            this.props.backlogContext !== prevProps.backlogContext ||
            !this._backlog
        ) {
            this._renderProductBacklog();
        }
    }

    public componentWillUnmount(): void {
        const { backlogFilterContext } = this.props;

        if (this._backlog) {
            this._backlog.dispose();
        }

        if (backlogFilterContext.value && backlogFilterContext.value.filterManager) {
            backlogFilterContext.value.filterManager.dispose();
        }

        BacklogContext.resetInstance();
    }

    public reparentFromMappingPane(workItemIds: number[], newParentId: number): void {
        if (this._backlog) {
            this._backlog.reparentFromMappingPane(workItemIds, newParentId);
        }
    }

    public toggleForecasting(value: boolean): void {
        if (this._backlog) {
            if (value) {
                this._backlog.toggleShowForecast(ProductBacklog.FILTER_CONSTANT_ON);
            } else {
                this._backlog.toggleShowForecast(ProductBacklog.FILTER_CONSTANT_OFF);
            }
        }
    }

    public getProductBacklog(): ProductBacklog {
        return this._backlog;
    }

    public getProductBacklogContainer(): HTMLElement {
        return this._container;
    }

    public getSelectedWorkItems(): IBacklogGridItem[] {
        if (this._backlog) {
            return this._backlog.getSelectedBacklogGridItems();
        }
        return [];
    }

    private _renderProductBacklog() {
        const {
            backlogContext,
            backlogPayload
        } = this.props;

        if (this._backlog) {
            this._backlog.dispose();
        }

        if (!backlogPayload) {
            return;
        }

        const backlogOptions: ProductBacklogOptions = {
            $backlogElement: $(this._container),
            eventHelper: this.props.eventHelper,
            isNewHub: true,
            gridOptions: backlogPayload.queryResults as any,
            reorderManager: new ReorderManager(backlogPayload.backlogContext.team.id),
            deferInitialization: true,
            addMessage: this.props.addMessage,
            removeMessage: this.props.removeMessage,
            onColumnsChanged: this.props.onColumnOptionsChanged
        };

        BacklogContext.getInstance().setBacklogContextData(backlogContext);

        const productBacklog = new ProductBacklog(backlogOptions);
        this._backlog = productBacklog;

        productBacklog.refreshProductBacklog(backlogPayload);

        if (this.props.forecastingOn) {
            productBacklog.toggleShowForecast(ProductBacklog.FILTER_CONSTANT_ON);
        } else {
            productBacklog.toggleShowForecast(ProductBacklog.FILTER_CONSTANT_OFF);
        }

        if (this.props.newBacklogLevelsSignature) {
            this.props.addMessage({
                message: null,
                children: (<NewBacklogLevelsMessage />),
                messageType: MessageBarType.info,
                id: this.props.newBacklogLevelsSignature,
                closeable: true,
                persistDismissal: true
            });
        }

        this._setupFilterContext();
        
        // do an initial resize of the grid to trigger the layout now the filter context is setup.
        this.resize();
    }

    private _resolveContainerRef = (element: HTMLDivElement): void => {
        this._container = element;
    }
}
