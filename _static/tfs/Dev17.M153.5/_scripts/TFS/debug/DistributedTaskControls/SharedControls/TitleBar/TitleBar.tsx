/// <reference types="react" />

import * as React from "react";

import * as BaseComponent from "DistributedTaskControls/Common/Components/Base";
import * as BaseStore from "DistributedTaskControls/Common/Stores/Base";
import { FolderBreadcrumb } from "DistributedTaskControls/Components/FolderBreadcrumb";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/TitleBar/TitleBar";
import * as Utils_String from "VSS/Utils/String";
import { BrowserCheckUtils } from "VSS/Utils/UI";

import { TextField } from "OfficeFabric/TextField";
import * as styles from "OfficeFabric/components/TextField/TextField.scss";

import { DirectionalHint } from "OfficeFabric/ContextualMenu";
import { IconButton } from "OfficeFabric/Button";
import { TooltipHost } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";

export interface ITitleBarProps extends BaseComponent.IProps {
    store: BaseStore.StoreBase;
    editable: boolean;
    nameInvalidMessage: (name: string) => string;
    disabled?: boolean;
    displayBreadcrumb?: boolean;
    getBreadcrumbLink?: (path: string) => string;
    rootFolderName?: string;
    maxBreadcrumbDisplayedItems?: number;
    defaultName?: string;
    iconName?: string;
    ariaLabel?: string;
    breadCrumbOverrideClass?: string;
    onChanged?: (name: string) => void;
    onGetErrorMessage?: (name: string) => string;
}

export interface ITitleStoreState extends BaseStore.IStoreState {
    name: string;
    titleTextBoxWidth: number;
    isTitleFocused: boolean;
    folderPath?: string;
}

export class Title extends BaseComponent.Component<ITitleBarProps, ITitleStoreState> {

    constructor(props: ITitleBarProps) {
        super(props);
        const titleStoreState: ITitleStoreState = this.props.store ? this.props.store.getState() as ITitleStoreState : null;
        if (titleStoreState) {
            this.state = { name: titleStoreState.name } as ITitleStoreState;
        }
    }

    public componentWillMount(): void {
        this.props.store.addChangedListener(this._onChange);
        window.addEventListener("resize", this._windowResizeHandler);
    }

    public componentWillUnmount(): void {
        this.props.store.removeChangedListener(this._onChange);
        window.removeEventListener("resize", this._windowResizeHandler);
    }

    public componentWillReceiveProps(nextProps: ITitleBarProps): void {
        if (this.props.store !== nextProps.store) {
            this.props.store.removeChangedListener(this._onChange);
            nextProps.store.addChangedListener(this._onChange);
        }
    }

    public componentDidMount(): void {
        this.setState({
            titleTextBoxWidth: this._getTitleTextBoxWidth()
        } as ITitleStoreState);
    }

    public render(): JSX.Element {
        let iconClassName: string = this.props.iconName ? Utils_String.format("bowtie-icon {0} name-icon", this.props.iconName) : Utils_String.empty;
        return (
            this.props.editable ? this._getEditableTitle(iconClassName) : this._getNonEditableTitle(iconClassName)
        );
    }

    private _getNonEditableTitle(iconClassName: string): JSX.Element {
        return (
            <div className="name-container">
                <span className={iconClassName} />
                {this.props.displayBreadcrumb && this._getFolderBreadcrumbElement()}
                <span className="name">{this.state.name || this.props.defaultName}</span>
            </div>
        );
    }

    private _getFolderBreadcrumbElement(): JSX.Element {
        let breadCrumbOverrideClass: string = !!this.props.breadCrumbOverrideClass ? this.props.breadCrumbOverrideClass : Utils_String.empty;

        return (
            <div className="dtc-folder-bread-crumb">
                <FolderBreadcrumb
                    cssClass={css("dtc-bread-crumb-root", breadCrumbOverrideClass)}
                    folderPath={this.state.folderPath}
                    getBreadcrumbLink={this.props.getBreadcrumbLink}
                    maxDisplayedItems={this.props.maxBreadcrumbDisplayedItems}
                    rootFolderName={this.props.rootFolderName} />
            </div>
        );
    }

    private _getEditableTitle(iconClassName: string): JSX.Element {
        iconClassName = !this._isNameInValid() ? iconClassName : "bowtie-icon bowtie-status-error-outline error-definition-name";

        // @TODO: Don't use state for instance variables.
        (this.state as ITitleStoreState).titleTextBoxWidth = this._getTitleTextBoxWidth();

        const titleTextBoxContainerClasses = css({
            "editable-title-textbox": true,
            "editable-title-textbox-focused": this.state.isTitleFocused
        });

        const titleTextBoxClasses = css({
            "editable-title-input": true,
            "validTitle": (!this._isNameInValid()),
            "invalidTitle": (this._isNameInValid()),
            "emptyTitle": (this.state.name ? false : true)
        });

        const sizingElementContainerClasses = css("definition-title-sizing-element-container", styles.root, styles.rootIsMultiline);
        const hiddenSizingElementClasses = css("definition-title-sizing-element", "editable-title-input", "validTitle", styles.field);

        const EDITABLE_ICON_OVERLAY_MARGIN = 10;
        const EDITABLE_ICON_BUTTON_WIDTH = 50;

        return (
            <div className="editable-name-container" ref={this._resolveRef("_editableNameContainer")}>
                <div className="editable-title-icon">
                    {this._getTitleIconElement(iconClassName, this.props.nameInvalidMessage(this.state.name))}
                </div>

                {this.props.displayBreadcrumb && this._getFolderBreadcrumbElement()}

                <div className="editable-title-container" style={{ width: this.state.titleTextBoxWidth + EDITABLE_ICON_BUTTON_WIDTH }}>
                    <div className={titleTextBoxContainerClasses} style={{ width: this.state.titleTextBoxWidth }}>
                        <div className={sizingElementContainerClasses}>
                            <div className={styles.fieldGroup}>
                                <div className={hiddenSizingElementClasses} ref={(elem) => this._sizingElement = elem}></div>
                            </div>
                        </div>
                        <TooltipHost content={this.state.name || this.props.defaultName} directionalHint={DirectionalHint.bottomCenter}>
                            <TextField
                                id={"editable-title-textbox-id"}
                                disabled={this.props.disabled}
                                inputClassName={titleTextBoxClasses}
                                ariaLabel={this.props.ariaLabel}
                                value={this.state.name}
                                onChanged={this.props.onChanged}
                                onGetErrorMessage={this.props.onGetErrorMessage}
                                onFocus={this._onTitleTextBoxFocus}
                                onBlur={this._onTitleTextBoxBlur}
                                onMouseUp={this._onTitleTextBoxMouseUp}
                                ref={(input) => { this._editableTitleTextBox = input; }}
                                style={{ width: this.state.titleTextBoxWidth }}
                                placeholder={Resources.EditDefinitionNamePlaceHolder}
                                className="editable-title-input-container"
                                borderless={true}
                            />
                        </TooltipHost>
                    </div>
                    {
                        !this.props.disabled &&
                        <div className="editable-icon-container" style={{ left: this.state.titleTextBoxWidth }}>
                            <TooltipHost content={Resources.EditDefinitionNameTitle}>
                                <IconButton
                                    iconProps={{ iconName: "Edit" }}
                                    ariaDescription={Resources.EditDefinitionNameTitle}
                                    className="rd-edit-icon-button"
                                    onClick={this._onEditButtonClick}
                                />
                            </TooltipHost>
                        </div>
                    }
                    {
                        !this.props.disabled &&
                        <div className="editable-icon-overlay" style={{ left: this.state.titleTextBoxWidth }}>
                        </div>
                    }
                </div>
            </div>
        );
    }

    private _getTitleIconElement(iconClassName: string, nameIconTitle: string): JSX.Element {
        if (nameIconTitle) {
            return (
                <TooltipHost content={nameIconTitle}>
                    <i className={iconClassName} />
                </TooltipHost>
            );
        }
        else {
            return (
                <i className={iconClassName} />
            );
        }
    }

    private _onChange = () => {
        let titleStoreState: ITitleStoreState = this.props.store.getState() as ITitleStoreState;

        this.setState({
            name: titleStoreState.name,
            folderPath: titleStoreState.folderPath,
            titleTextBoxWidth: this._getTitleTextBoxWidth(),
            isTitleFocused: this.state.isTitleFocused
        });
    }

    private _isNameInValid(): boolean {
        let definitionName = (this.state.name ? this.state.name.trim() : Utils_String.empty);
        return !!this.props.nameInvalidMessage(definitionName);
    }

    private _getTitleTextBoxWidth = () => {

        const EDITABLE_TITLE_DEFAULT_WIDTH = 150;
        const EDITABLE_TITLE_MAX_WIDTH = 610;
        const EDITABLE_TITLE_MARGIN = 20;
        const EDITABLE_TITLE_CONTAINER_MAX_WIDTH_FACT = 0.65;

        if (!this._editableTitleTextBox) {
            return EDITABLE_TITLE_DEFAULT_WIDTH;
        }

        let titleName = this.state.name;
        this._sizingElement.textContent = titleName;
        let textWidth = this._sizingElement.clientWidth + EDITABLE_TITLE_MARGIN;
        let editableContainerWidth = this._editableNameContainer.clientWidth;
        let editableContainerMaxWidth = editableContainerWidth * EDITABLE_TITLE_CONTAINER_MAX_WIDTH_FACT;

        if (textWidth > EDITABLE_TITLE_MAX_WIDTH) {
            textWidth = EDITABLE_TITLE_MAX_WIDTH;
        }
        if (textWidth > editableContainerMaxWidth) {
            textWidth = editableContainerMaxWidth;
        }
        if (!titleName) {
            textWidth = EDITABLE_TITLE_DEFAULT_WIDTH;
        }
        return textWidth;
    }

    private _onEditButtonClick = () => {
        this._selectTitleTextBoxAllText();
        this._isTitleBoxDirty = true;
    }

    private _selectTitleTextBoxAllText = () => {
        this._editableTitleTextBox.select();
    }

    private _onTitleTextBoxFocus = (event) => {
        this.setState({
            name: (this.props.store.getState() as ITitleStoreState).name,
            titleTextBoxWidth: this._getTitleTextBoxWidth(),
            isTitleFocused: true
        });
        this._selectTitleTextBoxAllText();
    }

    private _onTitleTextBoxBlur = () => {
        this.setState({
            name: (this.props.store.getState() as ITitleStoreState).name,
            titleTextBoxWidth: this._getTitleTextBoxWidth(),
            isTitleFocused: false
        });
        this._isTitleBoxDirty = false;
    }

    private _onTitleTextBoxMouseUp = () => {
        if (BrowserCheckUtils.isEdge()) {
            if (this.state.isTitleFocused && !this._isTitleBoxDirty) {
                this._onEditButtonClick();
            }
        }
    }

    private _windowResizeHandler = () => {
        if (this._editableTitleTextBox && this._sizingElement) {
            this._onTitleTextBoxBlur();
        }
    }

    private _editableTitleTextBox: TextField;
    private _sizingElement: HTMLDivElement;
    private _editableNameContainer: HTMLDivElement;
    private _isTitleBoxDirty: boolean = false;
}
