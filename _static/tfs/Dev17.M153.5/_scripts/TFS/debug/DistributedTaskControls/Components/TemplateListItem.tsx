/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { InputControlUtils } from "DistributedTaskControls/SharedControls/InputControls/Utilities";

import { IconButton, PrimaryButton } from "OfficeFabric/Button";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { Image, ImageFit } from "OfficeFabric/Image";
import { css } from "OfficeFabric/Utilities";

import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/TemplateListItem";

export interface ITemplateListItem<T> {
    id: string;
    name: string;
    description: string;
    data: T;
    canDelete?: boolean;
    iconUrl?: string;
    iconClassName?: string;
    allowLinks?: boolean;
}

export interface ITemplateListItemProps<T> extends ComponentBase.IProps {
    templateItem: ITemplateListItem<T>;
    onApplyTemplate: (data: T) => void;
    onSelect?: (taskId: string) => void;
    isSelected?: boolean;
    onDeleteTemplate?: (templateId: string, templateName: string) => void;
}

const ImageIcon = ({ iconUrl }) => (<Image className="dtc-template-icon" src={iconUrl} imageFit={ImageFit.contain} alt={Utils_String.empty} />);
const BowtieIcon = ({ iconClassName }) => (<i className={`bowtie-icon dtc-template-icon dtc-template-bowtie-icon ${iconClassName}`} />);

const TemplateIcon = ({ iconUrl }) => (
    (iconUrl) ?
        (<ImageIcon iconUrl={iconUrl} />) :
        (<BowtieIcon iconClassName="bowtie-build" />));

export class TemplateListItem<T> extends ComponentBase.Component<ITemplateListItemProps<T>, ComponentBase.IStateless> {

    constructor(props: ITemplateListItemProps<T>) {
        super(props);
        this._templateNameId = InputControlUtils.getId("Template");
    }

    public render(): JSX.Element {
        const templateItem = this.props.templateItem;

        // tslint:disable-next-line:react-no-dangerous-html
        const description = templateItem.allowLinks ? <div className="info-description" dangerouslySetInnerHTML={{__html: templateItem.description}} />
            : <div className="info-description">{templateItem.description}</div>;

        return (
            <div className={css("dtc-template-item", { "is-selected": this.props.isSelected })}
                data-is-focusable={true}
                aria-labelledby={this._templateNameId}
                onFocus={this._onSelect}
                onBlur={this._onClickOut}
                onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => { this._handleKeyDown(event); }}>
                <FocusZone direction={FocusZoneDirection.horizontal}>
                    {
                        templateItem.iconClassName ?
                            <BowtieIcon iconClassName={templateItem.iconClassName} /> :
                            <TemplateIcon iconUrl={templateItem.iconUrl} />
                    }

                    <div className="dtc-template-info">
                        <div className="info-name" id={this._templateNameId}>{templateItem.name}</div>
                        {description}
                    </div>
                    <div className="dtc-template-float-right">
                        <PrimaryButton
                            className="dtc-template-item-buttons"
                            onClick={this._onApplyTemplate}
                            ariaLabel={Resources.ApplyTemplateButtonText}
                            ariaDescription={Utils_String.localeFormat(Resources.ApplyTemplateDescription, templateItem.name)}>
                            {Resources.ApplyTemplateButtonText}
                        </PrimaryButton>
                        {
                            templateItem.canDelete &&
                            (<IconButton
                                className="dtc-template-item-icon-buttons"
                                iconProps={{ iconName: "Delete" }}
                                ariaLabel={Resources.DeleteText}
                                onClick={this._onDeleteTemplate}
                                onKeyDown={this._handleDeleteKeyDown}>
                            </IconButton>)
                        }
                    </div>
                </FocusZone>
            </div>
        );
    }

    private _onDeleteTemplate = () => {
        if (this.props.onDeleteTemplate && this.props.templateItem) {
            this.props.onDeleteTemplate(this.props.templateItem.id, this.props.templateItem.name);
        }
    }

    private _handleDeleteKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE) {
            this._onDeleteTemplate();
            e.preventDefault();
            e.stopPropagation();
        }
    }

    private _onApplyTemplate = () => {
        this.props.onApplyTemplate(this.props.templateItem.data);
    }

    private _onSelect = () => {
        this.props.onSelect(this.props.templateItem.id);
    }

    private _onClickOut = () => {
        if (this.props.onSelect) {
            // On focus out, don't select any template id. This will set selectedTemplateId state as empty.
            this.props.onSelect(Utils_String.empty);
        }
    }

    private _handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.keyCode === KeyCode.ENTER) {
            Utils_Core.delay(this, 1, () => {
                this.props.onApplyTemplate(this.props.templateItem.data);
            });
        }
    }

    private _templateNameId: string;
}
