import "VSS/LoaderPlugins/Css!Controls/Links/ExternalConnectionLinkForm";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { TextField } from "OfficeFabric/TextField";
import { BaseComponent, IBaseProps } from "OfficeFabric/Utilities";
import { IExternalLinkedArtifact } from "TFS/WorkItemTracking/ExtensionContracts";
import { LinkForm } from "WorkItemTracking/Scripts/LinkForm";
import { ExternalConnectionLinkValidator } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.LinkValidator";

interface IExternalConnectionLinkInputProps extends IBaseProps {
    performUrlValidation: (value: string) => Promise<string>;
    label: string;
    watermark: string;
}

export class ExternalConnectionLinkInput extends BaseComponent<IExternalConnectionLinkInputProps> {
    constructor(props: IExternalConnectionLinkInputProps) {
        super(props);
    }

    public render(): JSX.Element {
        return (
            <div className="external-connection-link-container bowtie-fabric">
                <TextField
                    inputClassName="external-connection-link-url-input"
                    label={this.props.label}
                    placeholder={this.props.watermark}
                    onGetErrorMessage={this.props.performUrlValidation}
                    ariaLabel={this.props.label}
                    spellCheck={false}
                    required={true}
                    errorMessage={""}
                    validateOnLoad={false}
                    value={""}
                />
            </div>
        );
    }
}

/**
 * Base class for external connection link type (GitHub, etc)
 */
export abstract class ExternalConnectionLinkForm<T extends IExternalLinkedArtifact> extends LinkForm {
    private _$urlPickerContainer: JQuery;
    protected abstract _performUrlValidation: (url: string) => Promise<string>;

    /**
     * Artifact link type information
     */
    protected abstract _toolName: string;
    protected abstract _artifactTypeName: string;
    protected abstract _label: string;
    protected abstract _watermark: string;
    private _linkTypeName: string;

    /**
     * Resolve Url to a JSON object to be serialized in artifact link
     */
    protected abstract async resolveUrl(urlInput: string): Promise<T[]>;

    /**
     * Checks if the given url is valid
     * @param url
     */
    protected abstract isValidExternalConnectionUrl(url: string): boolean;

    constructor(options) {
        super(options);
        this._linkTypeName = options!.linkTypeName;
        this._validator = new ExternalConnectionLinkValidator(options);
        this._updateDialogState(false);
    }

    public initialize() {
        super.initialize();

        this._$urlPickerContainer = $("<div/>").appendTo(this._element);
        this._renderUrlInput();

        // Adding comment field
        this._createComment();
        this._updateDialogState(false);
    }

    public getLinkTypeName(): string {
        return this._linkTypeName;
    }

    public abstract getLinkResult();

    public unload() {
        super.unload();
        ReactDOM.unmountComponentAtNode(this._$urlPickerContainer[0]);
    }

    private _renderUrlInput() {
        const urlProps: IExternalConnectionLinkInputProps = {
            performUrlValidation: this._performUrlValidation,
            label: this._label,
            watermark: this._watermark
        };
        ReactDOM.render(
            React.createElement<IExternalConnectionLinkInputProps>(
                ExternalConnectionLinkInput,
                urlProps),
            this._$urlPickerContainer[0]);
    }

    protected _updateDialogState(isValidationSuccess: boolean) {
        this.fireLinkFormValidationEvent(isValidationSuccess);
    }

    protected _onValidationSucceeded(): string {
        this._updateDialogState(true);
        return "";
    }

    protected _onValidationFailed(message: string): string {
        this._updateDialogState(false);
        return message;
    }
}
