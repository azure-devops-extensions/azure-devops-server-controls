import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";

export interface IHubMessagesError {
    /* The error */
    error: Error;

    /* Whether the message is closable or not */
    closable: boolean;
}

export interface IHubMessagesExceptionInfo {
    /* The exception info */
    exceptionInfo: ExceptionInfo;

    /* Whether the message is closable or not */
    closable: boolean;
}