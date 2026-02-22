export const error = (status: number, message: string) => {
    const err = new Error(message);
    (err as any).status = status;
    (err as any).body = { message };
    throw err;
};
