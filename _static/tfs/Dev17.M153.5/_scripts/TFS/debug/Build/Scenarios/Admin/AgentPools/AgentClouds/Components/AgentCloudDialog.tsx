import * as React from "react";
import { autobind, IBaseProps } from "OfficeFabric/Utilities";
import { Fabric } from "OfficeFabric/Fabric";
import { Dialog, IDialogProps, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { TextField } from "OfficeFabric/TextField";
import { Checkbox } from "OfficeFabric/Checkbox";
import { TaskAgentCloud } from "TFS/DistributedTask/Contracts";
import * as Utils_String from "VSS/Utils/String";
import * as Resources from "Build/Scripts/Resources/TFS.Resources.Build";
import { AgentCloudActionCreator, AgentCloudActionHub } from "../Actions/AgentCloud";
import * as AgentCloudDialogStore from "../Stores/AgentCloudDialog";

export interface IAgentCloudDialogProps extends IBaseProps {
	type: string;
	dismissDialog?(): void;
	hidden: boolean;
	agentCloudActionCreator: AgentCloudActionCreator;
	agentCloudActionHub: AgentCloudActionHub;
}

export interface AgentCloudDialogState {
	name: string;
	getAgentDefinitionEndpoint: string;
	acquireAgentEndpoint: string;
	getAgentRequestStatusEndpoint: string;
	releaseAgentEndpoint: string;
	endpointUrl: string;
	errorMessage: string;
	isCustom: boolean;
	errorState: boolean;
	username: string;
	password: string;
}

export class AgentCloudDialog extends React.Component<IAgentCloudDialogProps, AgentCloudDialogState> {
	private _agentCloudDialogStore: AgentCloudDialogStore.Store = null;
	private _agentCloudActionCreator: AgentCloudActionCreator = null;
	private _agentCloudActionHub: AgentCloudActionHub = null;

	public constructor(props: IAgentCloudDialogProps) {
		super(props);

		this._agentCloudActionCreator = this.props.agentCloudActionCreator;
		this._agentCloudActionHub = this.props.agentCloudActionHub;

		this._agentCloudDialogStore = new AgentCloudDialogStore.Store({
			actionHub: this._agentCloudActionHub
		});

		this.state = {
			isCustom: false,
			errorState: false
		} as AgentCloudDialogState;
	}

	public componentDidMount(): void {
		this._agentCloudDialogStore.addChangedListener(this.agentCloudDialogStoreListener);
	}

	public componentWillUnmount(): void {
		this._agentCloudDialogStore.removeChangedListener(this.agentCloudDialogStoreListener);
	}

	@autobind
	private agentCloudDialogStoreListener() {
		if (this._agentCloudDialogStore.getAgentCloud()) {
			this.closeDialog();
		} else if (this._agentCloudDialogStore.getErrorMessage()) {
			this.setState({
				errorMessage: this._agentCloudDialogStore.getErrorMessage()
			});
		} else {
			this.setState({
				errorMessage: Resources.UnkonwnError
			});
		}
	}

	public render(): JSX.Element {
		const dialogProps: IDialogProps = {
			hidden: this.props.hidden,
			dialogContentProps: {
				type: DialogType.close
			},
			modalProps: {
				className: "new-agentcloud-dialog",
				containerClassName: "new-agentcloud-dialog-container",
				isBlocking: true
			},
			title: Resources.CreateAgentCloudTitle,
			forceFocusInsideTrap: true,
			onDismiss: () => {
				this.closeDialog();
			},
			firstFocusableSelector: "dashboard-dialog-name-field"
		};

		return (
			<Fabric>
				<Dialog {...dialogProps}>
					{this.renderMessageBar()}
					{this.renderNameField()}
					{this.renderURLField()}
					{this.renderPopulateUrlsCheckBox()}
					{this.state.isCustom && this.renderPoolProviderEndpoints()}
					{this.renderUsername()}
					{this.renderPassword()}
					<DialogFooter>
						{this.renderSaveButton()}
						{this.renderCancelButton()}
					</DialogFooter>
				</Dialog>
			</Fabric>
		);
	}

	private renderMessageBar(): JSX.Element {
		return this.state.errorMessage ? (
			<MessageBar
				onDismiss={() => {
					this.setState({ errorMessage: null });
				}}
				isMultiline={true}
				messageBarType={MessageBarType.error}
			>
				{this.state.errorMessage}
			</MessageBar>
		) : null;
	}

	private renderNameField(): JSX.Element {
		return (
			<TextField
				multiline={false}
				resizable={false}
				validateOnLoad={false}
				required={true}
				onChanged={this.nameChanged}
				label={Resources.NameLabel}
			/>
		);
	}

	private renderURLField(): JSX.Element {
		return (
			<TextField
				multiline={false}
				resizable={false}
				validateOnLoad={false}
				required={!this.state.isCustom}
				onGetErrorMessage={this.onGetErrorMessage}
				onChanged={this.urlChanged}
				value={this.state.endpointUrl}
				label={Resources.PoolproviderURLLabel}
			/>
		);
	}

	private renderPopulateUrlsCheckBox(): JSX.Element {
		return (
			<Checkbox
				checked={this.state.isCustom}
				label={Resources.CustomEndpointsLabel}
				onChange={(ev?: React.FormEvent<HTMLInputElement>, isCustom?: boolean) => {
					this.setState({
						isCustom: isCustom
					});
				}}
			/>
		);
	}
	getAgentDefinitionEndpoint: string;
	acquireAgentEndpoint: string;
	getAgentRequestStatusEndpoint: string;
	releaseAgentEndpoint: string;

	private renderPoolProviderEndpoints(): JSX.Element {
		return (
			<div>
				<TextField
					multiline={false}
					resizable={false}
					validateOnLoad={false}
					required={this.state.isCustom}
					disabled={!this.state.isCustom}
					value={this.state.acquireAgentEndpoint}
					onGetErrorMessage={this.onGetErrorMessage}
					label={Resources.AcquireEndpointLabel}
					onChanged={newValue => {
						newValue = newValue.trim();
						this.setState({ acquireAgentEndpoint: newValue });
					}}
				/>
				<TextField
					multiline={false}
					resizable={false}
					validateOnLoad={false}
					required={this.state.isCustom}
					disabled={!this.state.isCustom}
					value={this.state.releaseAgentEndpoint}
					onGetErrorMessage={this.onGetErrorMessage}
					label={Resources.ReleaseEndpointLabel}
					onChanged={newValue => {
						newValue = newValue.trim();
						this.setState({ releaseAgentEndpoint: newValue });
					}}
				/>
				<TextField
					multiline={false}
					resizable={false}
					validateOnLoad={false}
					required={this.state.isCustom}
					disabled={!this.state.isCustom}
					value={this.state.getAgentDefinitionEndpoint}
					onGetErrorMessage={this.onGetErrorMessage}
					label={Resources.AgentDefinitionEndpointLabel}
					onChanged={newValue => {
						newValue = newValue.trim();
						this.setState({ getAgentDefinitionEndpoint: newValue });
					}}
				/>
				<TextField
					multiline={false}
					resizable={false}
					validateOnLoad={false}
					required={this.state.isCustom}
					disabled={!this.state.isCustom}
					value={this.state.getAgentRequestStatusEndpoint}
					onGetErrorMessage={this.onGetErrorMessage}
					label={Resources.AgentRequestStatusEndpointLabel}
					onChanged={newValue => {
						newValue = newValue.trim();
						this.setState({ getAgentRequestStatusEndpoint: newValue });
					}}
				/>
			</div>
		);
	}

	private renderUsername(): JSX.Element {
		return (
			<TextField
				multiline={false}
				resizable={false}
				validateOnLoad={false}
				onChanged={newValue => {
					newValue = newValue.trim();
					this.setState({ username: newValue });
				}}
				label={Resources.UsernameLabel}
			/>
		);
	}

	private renderPassword(): JSX.Element {
		return (
			<TextField
				multiline={false}
				resizable={false}
				validateOnLoad={false}
				onChanged={newValue => {
					newValue = newValue.trim();
					this.setState({ password: newValue });
				}}
				label={Resources.PasswordLabel}
				type="password"
			/>
		);
	}

	private renderSaveButton(): JSX.Element {
		return (
			<PrimaryButton
				onClick={this._saveAgentCloud}
				text={Resources.SaveBtnLabel}
				disabled={
					!this.state.name ||
					!this.isValidUrl(this.state.acquireAgentEndpoint) ||
					!this.isValidUrl(this.state.releaseAgentEndpoint) ||
					!this.isValidUrl(this.state.getAgentDefinitionEndpoint) ||
					!this.isValidUrl(this.state.getAgentRequestStatusEndpoint) ||
					this.state.errorState
				}
			/>
		);
	}

	private renderCancelButton(): JSX.Element {
		return <DefaultButton onClick={this.closeDialog} text={Resources.Cancel} />;
	}

	@autobind
	private onGetErrorMessage(input: string): string {
		if (input.trim().length > 0 && !this.isValidUrl(input.trim())) {
			return Resources.NotValidURLError;
		} else {
			return Utils_String.empty;
		}
	}

	@autobind
	private getAgentCloud(): TaskAgentCloud {
		return {
			name: this.state.name,
			acquireAgentEndpoint: this.state.acquireAgentEndpoint,
			releaseAgentEndpoint: this.state.releaseAgentEndpoint,
			getAgentDefinitionEndpoint: this.state.getAgentDefinitionEndpoint,
			getAgentRequestStatusEndpoint: this.state.getAgentRequestStatusEndpoint,
			type: this.props.type
		} as TaskAgentCloud;
	}

	@autobind
	private _saveAgentCloud() {
		this._agentCloudActionCreator.addAgentCloud(this.getAgentCloud());
	}

	private isValidUrl(input: string): boolean {
		const pattern = new RegExp(
			"^(https?:\\/\\/)" + // protocol
			"((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
			"((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
			"(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
			"(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
				"(\\#[-a-z\\d_]*)?$",
			"i"
		);
		return pattern.test(input);
	}

	private urlChanged = value => {
		if (!this.state.isCustom) {
			this.setState({
				endpointUrl: value.trim()
			});

			var url = value.trim();
			if (this.isValidUrl(url)) {
				url = url.replace(/\/$/, "");
				this.setState({
					acquireAgentEndpoint: url + "/acquire",
					releaseAgentEndpoint: url + "/release",
					getAgentDefinitionEndpoint: url + "/agentdefinitions",
					getAgentRequestStatusEndpoint: url + "/agentrequests"
				});
			} else {
				this.setState({
					acquireAgentEndpoint: "",
					releaseAgentEndpoint: "",
					getAgentDefinitionEndpoint: "",
					getAgentRequestStatusEndpoint: ""
				});
			}
		}
	};

	private nameChanged = value => {
		this.setState({
			name: value.trim()
		});
	};

	private resetState() {
		this.setState({
			name: "",
			getAgentDefinitionEndpoint: "",
			acquireAgentEndpoint: "",
			getAgentRequestStatusEndpoint: "",
			releaseAgentEndpoint: "",
			endpointUrl: "",
			errorMessage: "",
			isCustom: false,
			errorState: false,
			username: "",
			password: ""
		});
	}

	@autobind
	private closeDialog() {
		this.props.dismissDialog();
		this.resetState();
	}
}
