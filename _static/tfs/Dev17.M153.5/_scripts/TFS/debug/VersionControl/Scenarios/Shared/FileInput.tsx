/// <reference types="react" />
import * as React from "react";
import * as ArrayUtils from "VSS/Utils/Array";
import * as StringUtils from "VSS/Utils/String";
import { BaseControl } from "VSS/Controls";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { FileInputControl, FileInputControlOptions, FileInputControlUpdateEventData, FileInputControlLimitEventData, FileInputControlResult } from "VSS/Controls/FileInput";
import { format } from "VSS/Utils/String";
import VCSourceEditing = require("VersionControl/Scripts/Controls/SourceEditing");
import { getFileName, combinePaths } from "VersionControl/Scripts/VersionControlPath";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import Telemetry = require("VSS/Telemetry/Services");

export interface FileInputProps {
    initialDrop: DataTransfer;
    onUploadedFileStateChaged(fileList: FileInputControlResult[]): void;
    filesToBeUploaded: FileInputControlResult[];
    isGit: boolean;
    editingPath: string;
    rootPath: string;
    fileAlreadyExists(fileName: string): boolean;
}

export class FileInput extends React.Component<FileInputProps, {}>
{
    private innerControl: FileInputControl;

    constructor(props: FileInputProps) {
        super(props);

        this._decorateInputFiles();
    }

    public componentDidMount(): void {
        this.innerControl = this.createControl();
    }

    public componentWillReceiveProps(nextProps: FileInputProps) {
        this.props.onUploadedFileStateChaged(nextProps.filesToBeUploaded);
        this._decorateInputFiles();
    }

    public componentWillUnmount(): void {
        if (this.innerControl) {
            this.innerControl.dispose();
            this.innerControl = null;
        }
    }

    public render(): JSX.Element {
        return <div
            ref="holder"
        />;
    }

    private createControl(): FileInputControl {

        const isGit = this.props.isGit;
        const isTfvc = !isGit;

        const options: FileInputControlOptions = {
            initialDrop: this.props.initialDrop,
            maximumTotalFileSize: VCSourceEditing.Constants.MAX_EDIT_FROM_WEB_CONTENT_SIZE,
            detectEncoding: isTfvc,
            fileNamesCaseSensitive: isGit,
            updateHandler: (updateEvent: FileInputControlUpdateEventData) => {
                this.props.onUploadedFileStateChaged(updateEvent.files);
                this._decorateInputFiles();
            },
            limitMessageFormatter: (errorText: string, limitEvent: FileInputControlLimitEventData) => {
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                    CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                    CustomerIntelligenceConstants.SOURCEEDITING_UPLOAD_LIMIT,
                    $.extend({}, limitEvent, { isGit, isTfvc })));

                return errorText + (isGit ? VCResources.WebEditLimitWorkaroundGit : VCResources.WebEditLimitWorkaroundTfvc);
            }
        };

        return BaseControl.enhance(FileInputControl, this.refs["holder"] as HTMLElement, options) as FileInputControl;
    }

    private _decorateInputFiles() {
        if (this.innerControl) {
            const rows = this.innerControl.getRows();

            if (rows.length > 0) {
                for (let i = 0, l = rows.length; i < l; i++) {
                    const row = rows[i];
                    if (this.props.fileAlreadyExists(row.result.name)) {
                        row.$fileNameElement.text(format(VCResources.AddFileDialogReplaceFileFormat, row.result.name));
                    }
                    else {
                        row.$fileNameElement.text(format(VCResources.AddFileDialogNewFileFormat, row.result.name));
                    }
                }
            }
        }
    }
}