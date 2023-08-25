export function wait(time: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}

export function isString(object: unknown): object is string {
    return typeof object === "string";
}