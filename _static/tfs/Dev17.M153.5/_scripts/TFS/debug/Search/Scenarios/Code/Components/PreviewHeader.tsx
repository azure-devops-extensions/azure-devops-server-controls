import * as React from "react";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { FileNameHitKey } from "Search/Scenarios/Code/Constants";
import { css } from "OfficeFabric/Utilities";
import { isVCType, constructLinkToContent } from "Search/Scenarios/Code/Utils";
import { CodeResult } from "Search/Scenarios/WebApi/Code.Contracts";

export interface FileNameHeaderProps {
    item: CodeResult;

    onInvoked?(link: string, evt: React.MouseEvent<HTMLElement>): void;
}

export const FileNameHeader: React.StatelessComponent<FileNameHeaderProps> = (props: FileNameHeaderProps) => {
    const { matches, fileName, vcType } = props.item;
    const hitInFileName = !!matches[FileNameHitKey] && matches[FileNameHitKey].length > 0;
    const className = css({ "fileName-highlight": hitInFileName });
    const renderLink = isVCType(vcType);
    const link = constructLinkToContent(props.item);
    const ariaLabel = Resources.FilePreviewHeaderAriaLabel.replace("{0}", fileName);

    // Rendering <a /> instead of <Link />, since Link internally renders a button
    // which, in highlight scenarios looks odd making its entire background yellow covering a lot of whitespace.
    return (
        <div className="fileName-header">
            {
                renderLink
                    ? <a href={link} aria-label={ariaLabel} className={className} onClick={
                        (evt: React.MouseEvent<HTMLElement>) => props.onInvoked(link, evt)
                    }>{fileName}</a>
                    : <span className={className}>{fileName}</span>
            }
        </div>);
};
