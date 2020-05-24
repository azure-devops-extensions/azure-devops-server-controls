export default function getConnectionSpeed(): { type: string; speed: number; } {
    let type: string;
    let speed: number;

    try {
        const untypedNavigator = <any>navigator;
        const connection = untypedNavigator.connection || untypedNavigator.mozConnection || untypedNavigator.webkitConnection;

        if (connection) {
            if (connection.type) {
                type = connection.type;
            }

            if (connection.speed) {
                speed = connection.speed;
            }
        }
    } catch (exception) {
        // Ignore errors
    }

    return {
        type,
        speed
    };
}