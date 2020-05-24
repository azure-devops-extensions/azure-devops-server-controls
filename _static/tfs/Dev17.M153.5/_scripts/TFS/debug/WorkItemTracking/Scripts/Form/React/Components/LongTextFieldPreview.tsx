import * as React from "react";
import Utils_Html = require("VSS/Utils/Html");
import Utils_String = require("VSS/Utils/String");
import { WorkItemRichTextHelper } from "WorkItemTracking/Scripts/Utils/WorkItemRichTextHelper";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IWorkItemControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { IWorkItemControlPreview } from "WorkItemTracking/Scripts/ControlRegistration";
import { FieldType } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { getControlClasses } from "WorkItemTracking/Scripts/Form/ControlUtils";
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");

interface FrameProps {
    srcdoc: string;
    headContents: string;
    onclick?: Function;
    backgroundColor?: string;
}

class FrameComponent extends React.Component<FrameProps, {}> {
    private _element: HTMLIFrameElement;
    private _resolveElement = (element: HTMLIFrameElement) => this._element = element;

    public render(): JSX.Element {
        return <iframe className="longtext-container" scrolling="no" frameBorder="no" tabIndex={0} ref={this._resolveElement} />
    }

    public componentDidMount() {
        this._renderContent();
    }

    public componentDidUpdate() {
        this._renderOnReady();
    }

    private _renderOnReady() {
        let doc = this._element.contentWindow.document;
        if (doc.readyState === "complete") {
            this._renderContent();
        } else {
            $(this._element.contentWindow).ready(() => {
                $(this._element.contentWindow).off();
                this._renderContent();
            });
        }
    }

    private _renderContent() {
        let doc = this._element.contentWindow.document;

        doc.head.innerHTML = this.props.headContents;
        doc.body.innerHTML = this.props.srcdoc;
        doc.body.style.overflow = "hidden";  // IFrame contents should not be scrollable

        if (this.props.backgroundColor) {
            doc.body.style.color = this.props.backgroundColor;
        }

        $(doc.body).css("max-width", "100%");

        if (this.props.onclick) {
            $(doc.body).click(this.props.onclick);
        }
    }
}

export const LongTextFieldPreview: IWorkItemControlPreview = {
    canPreview: (workItemType: WITOM.WorkItemType, fieldRefName: string) => true,
    getPreview: (workItemType: WITOM.WorkItemType, workItem: WITOM.WorkItem, options: IWorkItemControlOptions): JSX.Element => {

        let context = workItemType.store.getTfsContext();
        const additionalStyle = `body { padding: 0 !important; }`;
        let headContents = WorkItemRichTextHelper.getPageHtml(context, true, additionalStyle);
        let field: WITOM.Field;

        let srcdoc: string = null;
        if (workItem) {
            field = workItem.getField(options.fieldName);
            srcdoc = workItem.getFieldValue(options.fieldName);
        }

        var hostedComponent: JSX.Element;
        var overlay: JSX.Element = null;

        if (Utils_Html.Utils.isEmpty(srcdoc)) {

            let watermarkText = "";

            if (field &&
                !field.isReadOnly() &&
                !Utils_String.equals(options.readOnly, "true", true)) {

                watermarkText = options.emptyText || WorkItemTrackingResources.EnterDetails;
            }

            let classValue = "longtext-container watermark-text";

            if (field) {

                classValue = getControlClasses(classValue, field, options);
            }

            hostedComponent = <div className={classValue}>{watermarkText}</div>;
        }
        else {
            if (field) {

                if (field.fieldDefinition.type === FieldType.PlainText) {
                    let classValue = getControlClasses("longtext-container", field, options);
                    hostedComponent = <div className={classValue}><pre>{field.getValue()}</pre></div>;
                }
                else {
                    hostedComponent = <FrameComponent srcdoc={srcdoc} headContents={headContents} backgroundColor={!field || field.isReadOnly() ? "#767676" : null} />;
                }

                if (field.isValid()) {
                    overlay = <div className="overlay" />;
                }
            }
        }

        return <div className="longtext-preview-container">
            {hostedComponent}
            <div className="chevron icon bowtie-icon bowtie-chevron-right" />
            {overlay}
        </div>;
    }
};
