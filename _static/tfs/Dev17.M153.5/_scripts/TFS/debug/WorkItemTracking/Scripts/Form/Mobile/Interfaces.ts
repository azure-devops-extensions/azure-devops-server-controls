export const FormContextItems = {
    FullScreenInvoke: "FullscreenInvoke"
}

export interface IOpenFullScreen {
    (title: string, onOpen?: (closeFullscreen: () => void, $container: JQuery) => JSX.Element, onClose?: () => void): void;
}