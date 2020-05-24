import "VSS/LoaderPlugins/Css!Queries/Components/QuerySaveDialog";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { format, equals } from "VSS/Utils/String";
import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { TextField } from "OfficeFabric/TextField";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { QueryItem, QuerySaveDialogMode } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { QueryUtilities } from "WorkItemTracking/Scripts/Queries/QueryUtilities";
import { IQueriesHubContext } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import { QueryFolderPicker } from "WorkItemTracking/Scripts/Queries/Components/QueryFolderPicker";
import { BaseComponent, IBaseProps } from "OfficeFabric/Utilities";
import { KeyCode } from "VSS/Utils/UI";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { migrateCharts } from "WorkItemTracking/Scripts/Queries/MigrateCharts";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { QueryType } from "TFS/WorkItemTracking/Contracts";
import { normalizePath } from "VSS/Utils/File";

export interface IQuerySaveDialogProps extends IBaseProps {
    onSuccess: (queryItem: QueryItem) => void;
    onCancel?: () => void;
    defaultFolder: string;
    queryItem?: QueryItem;
    mode: QuerySaveDialogMode;
    queriesHubContext: IQueriesHubContext;
}

export interface IQuerySaveDialogState {
    folderPath: string;
    name: string;
    isValid: boolean;
    nameValidationMessage: string;
    serverValidationMessage: string;
}

export interface QueryNameValidationResult {
    isNameValid: boolean;
    message: string;
}

export class QuerySaveDialog extends BaseComponent<IQuerySaveDialogProps, IQuerySaveDialogState> {
    private _isValidPath: boolean = true;
    private _isValidName: boolean = true;
    private _textFieldToFocus: TextField = null;
    private _maxQueryNameLength: number = 255;
    private _debouncedQueryNameValidation: (queryName: string) => void;
    private _tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

    constructor(props: IQuerySaveDialogProps) {
        super(props);

        const { mode } = props;

        let folderPath = this.props.defaultFolder;
        if (!folderPath && this.props.queriesHubContext) {
            // If default folder doesn't exist, we will initially set it to the first available folder which usually be the My Queries.
            const myQueriesFolder = this.props.queriesHubContext.stores.queryHierarchyItemStore.getMyQueriesFolderItem();
            folderPath = myQueriesFolder && myQueriesFolder.path || undefined;
        }

        const name = this.props.queryItem && this.props.queryItem.name || "";

        this._isValidName = !!name;
        this._isValidPath = !!folderPath;

        const isValid: boolean = (mode === QuerySaveDialogMode.NewQuery || mode === QuerySaveDialogMode.NewFolder) && this._isValidName && this._isValidPath;

        this.state = {
            folderPath,
            name,
            isValid,
            nameValidationMessage: undefined,
            serverValidationMessage: undefined
        };

        this._debouncedQueryNameValidation = this._async.debounce(this._performQueryNameValidation, QueryUtilities.DefaultDebounceWait);
    }

    public render(): JSX.Element {
        return <Dialog
            hidden={false}
            dialogContentProps={{
                type: DialogType.close,
                title: this._getTitleFromMode(this.props.mode)
            }}
            modalProps={{
                className: "new-query-saveas-dialog bowtie-fabric",
                containerClassName: "new-query-saveas-dialog-container",
                firstFocusableSelector: "query-name-fixed-container",
                onLayerDidMount: () => {
                    if (this._textFieldToFocus) {
                        this._textFieldToFocus.focus();
                        this._textFieldToFocus.select();
                    }
                }
            }}
            onDismiss={this.props.onCancel}
        >
            {
                this.state.serverValidationMessage &&
                <MessageBar messageBarType={MessageBarType.error}>{this.state.serverValidationMessage}</MessageBar>
            }

            <TextField
                className="query-name-fixed-container textfield-error-spacer"
                onKeyDown={this._onKeyDown}
                ref={this._onRef}
                label={Resources.NameLabel}
                placeholder={Resources.NameLabel_Watermark}
                value={this.state.name}
                onChanged={this._setName}
                required={true}
                errorMessage={this.state.nameValidationMessage}
                width={"400px"}
            />

            <QueryFolderPicker path={this.state.folderPath}
                queriesHubContext={this.props.queriesHubContext}
                onPathChanged={this._onPathChanged} />

            <DialogFooter>
                <PrimaryButton
                    disabled={!this.state.isValid}
                    onClick={this._save}>
                    {Resources.OK}
                </PrimaryButton>
                <DefaultButton
                    disabled={false}
                    onClick={this._onCancel}>
                    {Resources.Cancel}
                </DefaultButton>
            </DialogFooter>
        </Dialog>;
    }

    private _onPathChanged = (path: string, isValid: boolean) => {
        this._isValidPath = isValid;
        this._updateState(null, path, null, null);

        if (this._isValidPath && this.state.name) {
            this._debouncedQueryNameValidation(this.state.name);
        }
    }

    private _onCancel = () => {
        if (this.props.onCancel) {
            this.props.onCancel();
        }
    }

    private _performQueryNameValidation = (queryName: string): void => {
        queryName = queryName && queryName.trim();

        if (!queryName) {
            this._isValidName = false;
            this._updateState(null, null, Resources.QuerySaveDialog_ErrorMessage_NameRequired, null);
        } else if (!new RegExp(/^[^\/\\<>*?\"|:]*$/).test(queryName)) {
            this._isValidName = false;
            this._updateState(null, null, Resources.QuerySaveDialog_ErrorMessage_NameInvalid, null);
        } else if (queryName.length > this._maxQueryNameLength) {
            this._isValidName = false;
            this._updateState(null, null, format(Resources.QueryFolderPicker_ErrorMessage_NameExceededLimit, this._maxQueryNameLength, queryName.length), null);
        } else if (this._isValidPath) {
            const queryPath = `${this.state.folderPath}/${queryName}`;
            // Validate if the path exist. This needs to go to the server if the query item not populated in local store.
            this.props.queriesHubContext.actionsCreator.ensureQueryItem(queryPath).then(
                () => {
                    const existingItem = this.props.queriesHubContext.stores.queryHierarchyItemStore.getItem(queryPath);
                    if (!equals(this.props.queryItem && this.props.queryItem.id, existingItem.id, true /* case insensitive */)
                        || equals(existingItem.name, queryName, false /* case sensitive */)) {
                        this._isValidName = false;
                        this._updateState(null, null, Resources.QuerySaveDialog_ErrorMessage_NameAlreadyExists, null);
                    }
                }, (error) => {
                    this._isValidName = true;
                    this._updateState(null, null, "", null);
                });
        }
    }

    private _updateState(name: string, folder: string, nameError: string, serverError: string) {
        const hasValidInput = serverError ? false : this._isValidName && this._isValidPath;
        const nameInput = name || name === "" ? name : this.state.name;
        const folderInput = folder || folder === "" ? folder : this.state.folderPath;
        const nameErrorMessage = nameError || nameError === "" ? nameError : this.state.serverValidationMessage;
        const serverErrorMessage = serverError || serverError === "" ? serverError : this.state.serverValidationMessage;

        // For inputs, we should set it as undefined if no value is set
        this.setState({
            name: nameInput || "",
            folderPath: folderInput || undefined,
            isValid: hasValidInput,
            nameValidationMessage: nameErrorMessage,
            serverValidationMessage: hasValidInput ? "" : serverErrorMessage // Clears the error message when input becomes valid
        });
    }

    private _onRef = (instance: TextField | HTMLTextAreaElement | HTMLInputElement): void => {
        this._textFieldToFocus = instance as TextField;
    }

    private _onKeyDown = (e: React.KeyboardEvent<HTMLElement>): void => {
        if (e.keyCode === KeyCode.ENTER) {
            if (this.state.isValid) {
                this._save();

                event.preventDefault();
                event.stopPropagation();
            }
        }
    }

    private _save = (): void => {
        const name = this.state.name.trim();
        const folderPath = normalizePath(this.state.folderPath).trim();
        const originalQueryItem = this.props.queryItem;

        switch (this.props.mode) {
            case QuerySaveDialogMode.NewFolder:
            case QuerySaveDialogMode.NewQuery:
            case QuerySaveDialogMode.SaveAs:
                const isNewFolder = this._getIsNewFolderFromMode(this.props.mode);
                const updatedQueryItem = {
                    name: name,
                    wiql: originalQueryItem ? originalQueryItem.wiql : undefined,
                    isFolder: originalQueryItem ? originalQueryItem.isFolder : isNewFolder,
                    id: undefined, // If id is Guid empty then it is create else it is update query
                    path: `${folderPath}/${name}`
                } as QueryItem;

                this.props.queriesHubContext.actionsCreator.createQuery(updatedQueryItem, folderPath).then((queryItem) => {
                    if (originalQueryItem && this.props.mode === QuerySaveDialogMode.SaveAs && queryItem.queryType === QueryType.Flat) {
                        migrateCharts(originalQueryItem.id, queryItem.id, this._tfsContext.navigation.projectId, this._tfsContext.currentIdentity.id, false);
                    }
                    this.props.onSuccess(queryItem);
                }, (error: Error) => {
                    this._updateState(null, null, null, error.message);
                });
                break;
            case QuerySaveDialogMode.RenameFolder:
            case QuerySaveDialogMode.RenameQuery:
                const defaultFolderPath = normalizePath(this.props.defaultFolder).trim();

                // If the user changed path, then it is a move operation.
                // Else it is an update operation
                if (defaultFolderPath !== folderPath) {
                    this.props.queriesHubContext.actionsCreator.moveQuery(originalQueryItem, null, folderPath, name)
                        .then((queryItem) => {
                            this.props.onSuccess(queryItem);
                        }, (error: Error) => {
                            this._updateState(null, null, null, error.message);
                        });
                } else {
                    const renamedQueryItem = {
                        ...originalQueryItem,
                        name: name,
                        path: `${defaultFolderPath}/${name}`
                    };
                    this.props.queriesHubContext.actionsCreator.updateQuery(renamedQueryItem).then((queryItem) => {
                        this.props.onSuccess(queryItem);
                    }, (error: Error) => {
                        this._updateState(null, null, null, error.message);
                    });
                }
                break;
            default:
                break;
        }
    }

    private _setName = (newName: string): void => {
        newName = newName || "";
        this._updateState(newName, null, null, null);
        this._debouncedQueryNameValidation(newName);
    }

    private _getTitleFromMode(mode: QuerySaveDialogMode): string {
        switch (mode) {
            case QuerySaveDialogMode.NewFolder:
                return Resources.NewFolder;
            case QuerySaveDialogMode.NewQuery:
                return Resources.NewQuery;
            case QuerySaveDialogMode.RenameQuery:
                return Resources.RenameQueryTitle;
            case QuerySaveDialogMode.RenameFolder:
                return Resources.RenameQueryFolderTitle;
            case QuerySaveDialogMode.SaveAs:
                return Resources.SaveQueryAsDialogTitle;
        }

        return "";
    }

    private _getIsNewFolderFromMode(mode: QuerySaveDialogMode): boolean {
        switch (mode) {
            case QuerySaveDialogMode.NewFolder:
                return true;
        }

        return false;
    }
}

export function showDialog(
    context: IQueriesHubContext,
    dialogMode: QuerySaveDialogMode,
    queryItem: QueryItem,
    parentPath: string,
    onSuccess?: (savedItem: QueryItem) => void) {

    const containerElement = document.createElement("div");

    ReactDOM.render(<QuerySaveDialog
        defaultFolder={parentPath}
        queryItem={queryItem}
        onSuccess={(savedQueryItem?: QueryItem) => {
            ReactDOM.unmountComponentAtNode(containerElement);
            if (onSuccess) {
                onSuccess(savedQueryItem);
            }
        }}
        onCancel={() => { ReactDOM.unmountComponentAtNode(containerElement); }}
        mode={dialogMode}
        queriesHubContext={context} />, containerElement);
}
