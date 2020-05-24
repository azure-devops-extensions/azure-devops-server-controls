import * as React from "react";
import * as ReactDOM from "react-dom";

import { autobind, BaseComponent, IBaseProps } from "OfficeFabric/Utilities";
import { Fabric } from "OfficeFabric/Fabric";
import { Dialog, IDialogProps, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";

import * as Resources from "Dashboards/Scripts/Resources/TFS.Resources.Dashboards";

import "VSS/LoaderPlugins/Css!Dashboards/Components/Directory/DeleteDashboardDialog";
import { registerLWPComponent } from "VSS/LWP";
import * as DashboardsRestClient from "TFS/Dashboards/RestClient";
import * as CoreContracts from "TFS/Core/Contracts";
import { DashboardDialogMessageBar } from "Dashboards/Components/Shared/DialogComponents";

export function show(props?: IDeleteDashboardDialogProps): void {
    containerNode = document.createElement("div");
    document.body.appendChild(containerNode);
    ReactDOM.render(<DeleteDashboardDialog {...props} />, containerNode);
}

export function close(): void {
    if (containerNode) {
        ReactDOM.unmountComponentAtNode(containerNode);
        containerNode.parentElement.removeChild(containerNode);
        containerNode = null;
    }
}

export interface IDeleteDashboardDialogProps extends IBaseProps {
    /**
     * Called when the delete button is clicked.
     * The dialog is closed afterward unless this function returns a promise.
     * If the callback returns a resolved promise, the dialog will close.
     * If the returned promise is rejected, the dialog will remain open and will
     * render an error banner displaying the rejected reason.
     */
    onDeleteConfirmed?: () => PromiseLike<void> | void;

    /**
     * Called when the dialog closes.
     */
    onClose?: () => void;
}

interface IDeleteDashboardDialogState {
    errorMessage: string | undefined;
}

var containerNode: HTMLElement = null;

class DeleteDashboardDialog extends BaseComponent<IDeleteDashboardDialogProps, IDeleteDashboardDialogState> {
    public constructor(props: IDeleteDashboardDialogProps) {
        super(props);
        this.state = {
            errorMessage: undefined
        };
    }

    public render(): JSX.Element {
        const dialogProps: IDialogProps = {
            hidden: false,
            dialogContentProps: {
                type: DialogType.close,
                showCloseButton: true
            },
            modalProps: {
                className: "delete-dashboard-dialog",
                containerClassName: "delete-dashboard-dialog-container",
                isBlocking: true
            },
            title: Resources.DeleteDashboardDialogTitle,
            onDismiss: () => this.onClose(),
        };

        return (
            <Fabric>
                <Dialog {...dialogProps}>
                    {this.renderMessageBar()}
                    {this.renderDeleteConfirmationMessage()}
                    <DialogFooter>
                        {this.renderDeleteButton()}
                        {this.renderCancelButton()}
                    </DialogFooter>
                </Dialog>
            </Fabric>
        );
    }

    private onClose = (): void => {
        close();
        if (typeof this.props.onClose === "function") {
            this.props.onClose();
        }
    }

    private renderMessageBar(): JSX.Element {
        return <DashboardDialogMessageBar
            message={this.state.errorMessage}
            onDismiss={() => {
                this.setState({ errorMessage: undefined });
            }} />
    }

    private renderDeleteButton(): JSX.Element{
        return <PrimaryButton
                onClick={this.onDeleteDashboard}>
            {Resources.DeleteDashboardDialogDeleteButtonText}
        </PrimaryButton>;
    }

    private renderCancelButton(): JSX.Element {
        return <DefaultButton
            onClick={() => this.onClose()}>
            {Resources.DeleteDashboardDialogCancelButtonText}
        </DefaultButton>;
    }

    private renderDeleteConfirmationMessage(): JSX.Element {
        return <div>{Resources.DeleteDashboardDialogConfirmationMessage}</div>
    }

    @autobind
    private onDeleteDashboard(): void {
        const value = this.props.onDeleteConfirmed();
        if (value && typeof value.then === "function") {
            value.then(
                this.onClose,
                (reason) => this.setState({ errorMessage: reason.message || reason })
            );
        } else {
            this.onClose();
        }
    }
}

interface IDeleteDashboardDialogShimProps {
    dashboardId: string;
    teamId: string;
    projectId: string;

    /**
     * Called when the dashboard is deleted.
     */
    onDelete: () => void;

    /**
     * Called when the dialog closes.
     */
    onClose: () => void;
}

/** Allows rendering the old web platform delete dashboard dialog in the new web platform */
class DeleteDashboardDialogShim extends React.Component<IDeleteDashboardDialogShimProps> {
    public static readonly componentType = "DeleteDashboardDialog";

    private deleteDashboardDialogProps: IDeleteDashboardDialogProps;

    private static getTeamContext(teamId: string, projectId: string): CoreContracts.TeamContext {
        return {
            project: projectId,
            projectId,
            team: teamId,
            teamId
        };
    }

    constructor(props: IDeleteDashboardDialogShimProps) {
        super(props);

        const { dashboardId, teamId, projectId } = this.props;
        this.deleteDashboardDialogProps = {
            onClose: props.onClose,
            onDeleteConfirmed: () => this.deleteDashboard(dashboardId, teamId, projectId)
        };
    }

    public componentDidMount() {
        show(this.deleteDashboardDialogProps);
    }

    public render(): null {
        return null;
    }

    private deleteDashboard(dashboardId: string, teamId: string, projectId: string): PromiseLike<void> {
        const teamContext = DeleteDashboardDialogShim.getTeamContext(teamId, projectId);
        return DashboardsRestClient.getClient()
            .deleteDashboard(teamContext, dashboardId)
            .then(this.props.onDelete);
    }
}

registerLWPComponent(DeleteDashboardDialogShim.componentType, DeleteDashboardDialogShim);
